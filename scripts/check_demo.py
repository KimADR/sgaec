#!/usr/bin/env python3
"""Vérifications locales non sensibles avant le démarrage de la démonstration."""
from __future__ import annotations

import argparse
from pathlib import Path
import shutil
import sys
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = (
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_APP_PASSWORD",
    "POSTGRES_DB",
    "DATABASE_URL",
    "APP_DATABASE_URL",
    "INTERNAL_API_TOKEN",
    "JWT_SECRET",
    "BOOTSTRAP_ADMIN_USERNAME",
    "BOOTSTRAP_ADMIN_PASSWORD",
)


def read_settings(path: Path) -> dict[str, str]:
    settings: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            settings[key] = value.strip()
    return settings


def check_config(settings: dict[str, str]) -> list[str]:
    errors = []
    missing = [key for key in REQUIRED if not settings.get(key)]
    if missing:
        errors.append("Clés manquantes : " + ", ".join(missing))
    for key in REQUIRED:
        if "replace-with-" in settings.get(key, "").lower():
            errors.append(f"{key} utilise encore une valeur de modèle")
    for key, minimum in (
        ("JWT_SECRET", 32),
        ("INTERNAL_API_TOKEN", 20),
        ("BOOTSTRAP_ADMIN_PASSWORD", 16),
        ("POSTGRES_PASSWORD", 16),
        ("POSTGRES_APP_PASSWORD", 16),
    ):
        if len(settings.get(key, "")) < minimum:
            errors.append(f"{key} : au moins {minimum} caractères sont nécessaires")
    if settings.get("POSTGRES_PASSWORD") == settings.get("POSTGRES_APP_PASSWORD"):
        errors.append("Les comptes PostgreSQL doivent avoir des mots de passe distincts")

    for key, username in (
        ("DATABASE_URL", settings.get("POSTGRES_USER", "")),
        ("APP_DATABASE_URL", "sgaec_app"),
    ):
        try:
            parsed = urlparse(settings.get(key, ""))
            if parsed.scheme not in ("postgresql", "postgres") or parsed.hostname != "postgres":
                errors.append(f"{key} : URL PostgreSQL Docker non conforme")
            if parsed.username != username:
                errors.append(f"{key} : compte de connexion inattendu")
            password_name = "POSTGRES_PASSWORD" if key == "DATABASE_URL" else "POSTGRES_APP_PASSWORD"
            if parsed.password != settings.get(password_name, ""):
                errors.append(f"{key} : le mot de passe ne correspond pas à {password_name}")
            if parse_qs(parsed.query).get("schema") != ["sgaec"]:
                errors.append(f"{key} : paramètre schema=sgaec absent")
        except ValueError:
            errors.append(f"{key} : URL invalide")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=Path(".env.demo.maire"))
    parser.add_argument("--require-env", action="store_true", help="Échouer si le fichier de configuration est absent")
    args = parser.parse_args()
    failures = []
    print("SGAEC · Précontrôle de présentation")
    required_files = (
        "compose.demo.yaml",
        "apps/api/app/birth_pdf.py",
        "apps/web/components/PdfDocumentViewer.tsx",
        "apps/data/prisma/schema.prisma",
        "docs/acte-naissance-specimen-final.pdf",
    )
    for filename in required_files:
        if (ROOT / filename).is_file():
            print(f"  OK   {filename}")
        else:
            failures.append(f"Fichier requis absent : {filename}")

    env_file = args.env_file if args.env_file.is_absolute() else ROOT / args.env_file
    if env_file.exists():
        errors = check_config(read_settings(env_file))
        if errors:
            failures.extend(errors)
        else:
            print("  OK   Configuration locale avec secrets (valeurs non affichées)")
    else:
        message = f"{env_file.name} absent : exécuter python scripts/prepare_demo.py"
        if args.require_env:
            failures.append(message)
        else:
            print("  INFO " + message)

    if shutil.which("docker") is None:
        print("  INFO Docker non trouvé dans ce terminal : recette de conteneurs indisponible")
    else:
        print("  OK   Commande Docker disponible (vérifier Docker Desktop avant la démo)")
    for failure in failures:
        print("  ÉCHEC " + failure, file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
