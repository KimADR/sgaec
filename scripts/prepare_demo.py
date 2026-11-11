#!/usr/bin/env python3
"""Create a local demo configuration without overwriting existing credentials."""
from __future__ import annotations

from pathlib import Path
import os
import secrets
import sys

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--target",
        choices=(".env.demo.maire", ".env.demo"),
        default=".env.demo.maire",
        help="Nom du fichier local à créer sans écraser un fichier existant",
    )
    target = ROOT / parser.parse_args().target

    if target.exists():
        try:
            existing = target.read_text(encoding="utf-8-sig")
        except OSError as error:
            print(f"Impossible de lire {target.name} : {error}", file=sys.stderr)
            return 1
        required = ("BOOTSTRAP_ADMIN_PASSWORD=", "POSTGRES_APP_PASSWORD=", "APP_DATABASE_URL=")
        if "replace-with-" in existing or any(key not in existing for key in required):
            print(
                f"Configuration {target.name} ancienne ou incomplète. "
                "Elle n'a pas été modifiée; choisissez un nouveau fichier de configuration.",
                file=sys.stderr,
            )
            return 1
        print(f"{target.name} existe déjà; aucun secret n'a été remplacé.")
        return 0

    owner_password = secrets.token_hex(24)
    app_password = secrets.token_hex(24)
    settings = {
        "POSTGRES_USER": "sgaec_owner",
        "POSTGRES_PASSWORD": owner_password,
        "POSTGRES_APP_PASSWORD": app_password,
        "POSTGRES_DB": "sgaec_demo",
        "DATABASE_URL": f"postgresql://sgaec_owner:{owner_password}@postgres:5432/sgaec_demo?schema=sgaec",
        "APP_DATABASE_URL": f"postgresql://sgaec_app:{app_password}@postgres:5432/sgaec_demo?schema=sgaec",
        "INTERNAL_API_TOKEN": secrets.token_hex(32),
        "JWT_SECRET": secrets.token_hex(48),
        "BOOTSTRAP_ADMIN_USERNAME": "demo.admin",
        "BOOTSTRAP_ADMIN_PASSWORD": secrets.token_urlsafe(30),
        "WEB_ORIGIN": "http://localhost:3000",
        "AUTH_COOKIE_SECURE": "false",
    }
    try:
        with target.open("x", encoding="utf-8") as output:
            output.write("\n".join(f"{key}={value}" for key, value in settings.items()) + "\n")
        if os.name != "nt":
            target.chmod(0o600)
    except FileExistsError:
        print(f"{target.name} existe déjà; aucun secret n'a été remplacé.")
        return 1
    except OSError as error:
        print(f"Impossible de créer {target.name} : {error}", file=sys.stderr)
        return 1

    print("Configuration locale créée avec des secrets aléatoires.")
    print(f"Compte fictif: demo.admin. Le mot de passe reste dans {target.name}; ne le partagez pas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
