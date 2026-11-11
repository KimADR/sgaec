#!/usr/bin/env python3
"""Read-only HTTP smoke test for the local demo; it never creates data."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from http.cookiejar import CookieJar
import json
from pathlib import Path
import sys
from urllib.error import HTTPError, URLError
from urllib.request import HTTPCookieProcessor, Request, build_opener

ROOT = Path(__file__).resolve().parent.parent

DEMO_CIN_FIXTURES = {
    "LEGACY_ANTANANARIVO_DEMO": {
        f"CIN-DEMO-2026-{number:04d}": status
        for number, status in enumerate(
            ("REGISTERED", "IN_REVIEW", "VALIDATED", "ISSUED", "REJECTED", "REGISTERED"),
            start=1,
        )
    },
    "COMMUNE_DEMO_A": {
        "CIN-TEST-COMMUNE-A-0001": "REGISTERED",
        "CIN-TEST-COMMUNE-A-0002": "IN_REVIEW",
        "CIN-TEST-COMMUNE-A-0003": "ISSUED",
    },
    "COMMUNE_DEMO_B": {
        "CIN-TEST-COMMUNE-B-0001": "REGISTERED",
        "CIN-TEST-COMMUNE-B-0002": "VALIDATED",
        "CIN-TEST-COMMUNE-B-0003": "REJECTED",
    },
}


def load_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise RuntimeError(f"Configuration absente : {path}. Exécuter prepare_demo.py.")
    values = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key] = value
    return values


def call(opener, url: str, *, payload=None, headers=None, expected=200):
    header_values = dict(headers or {})
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    if body is not None:
        header_values.update({"Content-Type": "application/json", "X-SGAEC-Request": "1"})
    request = Request(
        url, data=body, headers=header_values,
        method="POST" if body is not None else "GET",
    )
    try:
        with opener.open(request, timeout=12) as response:
            data, status = response.read(), response.status
            content_type = response.headers.get("Content-Type", "")
    except HTTPError as error:
        data, status = error.read(), error.code
        content_type = error.headers.get("Content-Type", "")
    if status != expected:
        raise RuntimeError(
            f"HTTP {status}, attendu {expected} pour {request.method} {url}: {data[:200]!r}"
        )
    return json.loads(data) if "application/json" in content_type else (data, content_type)


def check(label, operation):
    result = operation()
    print(f"  OK  {label}")
    return result


def read_all_cin(opener, api: str, headers: dict[str, str]) -> list[dict]:
    records = []
    page = 1
    while True:
        result = call(opener, f"{api}/cin?page={page}&page_size=100", headers=headers)
        batch = result.get("items")
        if not isinstance(batch, list):
            raise RuntimeError("Réponse de la liste CIN invalide.")
        records.extend(batch)
        if len(batch) < 100:
            return records
        page += 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="http://localhost:3000")
    parser.add_argument("--env-file", type=Path, default=ROOT / ".env.demo.maire")
    args = parser.parse_args()
    env = load_env(args.env_file)
    base = args.base.rstrip("/")
    api = base + "/backend/api/v1"
    opener = build_opener(HTTPCookieProcessor(CookieJar()))
    no_auth = build_opener()
    username, password = env.get("BOOTSTRAP_ADMIN_USERNAME"), env.get("BOOTSTRAP_ADMIN_PASSWORD")
    if not username or not password:
        raise RuntimeError("Identifiants de démonstration absents de la configuration.")

    print("RECETTE SGAEC (requêtes en lecture seule, hors authentification)")
    check("Page de connexion", lambda: call(opener, base + "/connexion"))
    check("Protection sans session", lambda: call(no_auth, api + "/dashboard", expected=401))
    check("Authentification", lambda: call(opener, api + "/auth/login", payload={
        "username": username, "password": password,
    }))
    session = check("Session utilisateur", lambda: call(opener, api + "/auth/me"))
    communes = session.get("communes") or []
    if len(communes) < 2:
        raise RuntimeError("Au moins deux communes de démonstration sont requises.")
    check("Tableau de bord", lambda: call(opener, base + "/"))

    date_str = datetime.now(timezone(timedelta(hours=3))).strftime("%Y-%m-%d")
    all_cin_numbers = []
    found_fixtures = {}
    for commune in communes:
        headers = {"X-Commune-Id": commune["id"]}
        label = commune.get("code", commune["id"])
        check(f"{label}: tableau de bord", lambda: call(opener, api + "/dashboard", headers=headers))
        check(f"{label}: citoyens", lambda: call(opener, api + "/citizens?page=1&page_size=10", headers=headers))
        births = check(
            f"{label}: naissances",
            lambda: call(opener, api + "/births?page=1&page_size=10", headers=headers),
        )
        cin_cases = check(f"{label}: CIN", lambda: read_all_cin(opener, api, headers))
        if not cin_cases:
            raise RuntimeError(f"{label}: pas de dossiers CIN de démonstration. Réexécuter le seed.")
        numbers = [item.get("file_number") for item in cin_cases]
        if any(not isinstance(number, str) for number in numbers):
            raise RuntimeError(f"{label}: la liste contient un numéro de dossier CIN invalide.")
        if len(numbers) != len(set(numbers)):
            raise RuntimeError(f"{label}: numéros CIN en doublon dans la liste.")
        all_cin_numbers.extend(numbers)
        expected = DEMO_CIN_FIXTURES.get(label, {})
        for item in cin_cases:
            number = item["file_number"]
            if number in expected:
                found_fixtures[number] = item.get("status")
        cin_id = cin_cases[0].get("id")
        if not isinstance(cin_id, str) or not cin_id:
            raise RuntimeError(f"{label}: identifiant du dossier CIN invalide.")
        def cin_preview():
            pdf, content_type = call(opener, api + f"/cin/{cin_id}/specimen.pdf", headers=headers)
            if not content_type.startswith("application/pdf") or not pdf.startswith(b"%PDF"):
                raise RuntimeError("Fiche CIN PDF absente ou invalide")
        check(f"{label}: fiche CIN PDF", cin_preview)
        def cin_visual():
            pdf, content_type = call(opener, api + f"/cin/{cin_id}/maquette.pdf", headers=headers)
            if not content_type.startswith("application/pdf") or not pdf.startswith(b"%PDF"):
                raise RuntimeError("Maquette CIN PDF absente ou invalide")
        check(f"{label}: maquette CIN PDF", cin_visual)
        check(
            f"{label}: demandes",
            lambda: call(opener, api + "/requests?scope=all&page=1&page_size=10", headers=headers),
        )
        check(
            f"{label}: archives clôturées",
            lambda: call(opener, api + "/requests?scope=closed&page=1&page_size=10", headers=headers),
        )
        check(
            f"{label}: rapports",
            lambda: call(opener, api + f"/reports?start_date={date_str}&end_date={date_str}", headers=headers),
        )
        if births.get("items"):
            record_id = births["items"][0]["id"]

            def preview():
                pdf, content_type = call(
                    opener, api + f"/births/{record_id}/specimen.pdf", headers=headers,
                )
                if not content_type.startswith("application/pdf") or not pdf.startswith(b"%PDF"):
                    raise RuntimeError("Le téléchargement ne contient pas un PDF valide.")

            check(f"{label}: PDF spécimen", preview)

    codes = {commune.get("code") for commune in communes}
    if {"COMMUNE_DEMO_A", "COMMUNE_DEMO_B"}.issubset(codes):
        examples = (
            ("COMMUNE_DEMO_A", "CITOYEN-FICTIF-B"),
            ("COMMUNE_DEMO_B", "CITOYEN-FICTIF-A"),
        )
        for code, forbidden in examples:
            commune = next(item for item in communes if item.get("code") == code)

            def check_isolation():
                rows = call(
                    opener, api + "/births?page=1&page_size=100",
                    headers={"X-Commune-Id": commune["id"]},
                )
                names = [row.get("last_name") for row in rows.get("items", [])]
                if forbidden in names:
                    raise RuntimeError(f"Fuite territoriale: {code} voit {forbidden}.")

            check(f"Isolation {code}", check_isolation)
            def check_cin_isolation():
                rows = call(
                    opener, api + "/cin?page=1&page_size=100",
                    headers={"X-Commune-Id": commune["id"]},
                )
                names = [row.get("last_name", "") for row in rows.get("items", [])]
                own = "CIN-FICTIF-A" if code == "COMMUNE_DEMO_A" else "CIN-FICTIF-B"
                other = "CIN-FICTIF-B" if code == "COMMUNE_DEMO_A" else "CIN-FICTIF-A"
                if own not in names or other in names:
                    raise RuntimeError(f"Isolation CIN non démontrée pour {code}.")
            check(f"Isolation CIN {code}", check_cin_isolation)

    expected_fixtures = {
        number: status
        for fixtures in DEMO_CIN_FIXTURES.values()
        for number, status in fixtures.items()
    }
    if len(all_cin_numbers) != len(set(all_cin_numbers)):
        raise RuntimeError("Des numéros CIN apparaissent dans plusieurs communes.")
    if found_fixtures != expected_fixtures:
        missing = sorted(set(expected_fixtures) - set(found_fixtures))
        wrong_status = {
            number: (expected_fixtures[number], found_fixtures[number])
            for number in set(expected_fixtures) & set(found_fixtures)
            if expected_fixtures[number] != found_fixtures[number]
        }
        raise RuntimeError(
            f"Jeu CIN incomplet ou modifié. Absents: {missing}; statuts incorrects: {wrong_status}."
        )
    if len(found_fixtures) != 12 or len({status for status in found_fixtures.values()}) != 5:
        raise RuntimeError("Les 12 dossiers CIN et leurs cinq statuts attendus ne sont pas présents.")
    check("12 dossiers CIN sans doublons, cinq statuts", lambda: True)

    call(opener, api + "/auth/logout", payload={})
    check("Déconnexion", lambda: call(opener, api + "/auth/me", expected=401))
    print("RECETTE HTTP RÉUSSIE (ne remplace pas le test PostgreSQL RLS).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, URLError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"ÉCHEC DE RECETTE : {error}", file=sys.stderr)
        raise SystemExit(1)
