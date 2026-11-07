"""Tests unitaires indépendants de Docker et de PostgreSQL.

Lancer avec : PYTHONPATH=. pytest -q (depuis apps/api).
"""
from datetime import date
from io import BytesIO
import re
from zipfile import ZipFile

import pytest
from pydantic import ValidationError

from app.models import BirthCreate, CitizenCreate, CinCreate, UserCreate
from app.pdf import (
    format_locality,
    render_birth_specimen,
    render_cin_specimen,
    render_specimen_archive,
)


BIRTH = {
    "last_name": "RAKOTOMALALA",
    "first_names": "Aina",
    "birth_date": "2004-07-09",
    "sex": "F",
    "district": "Antananarivo II",
    "municipality": "Antananarivo",
    "place_of_birth": "Antananarivo",
}


def test_birth_accepts_valid_values():
    item = BirthCreate(**BIRTH)
    assert item.birth_date == date(2004, 7, 9)
    assert item.nationality == "Malagasy"


def test_future_birth_date_rejected():
    with pytest.raises(ValidationError):
        BirthCreate(**(BIRTH | {"birth_date": "2099-01-01"}))


def test_citizen_input_validates_identity_and_birth_date():
    citizen = CitizenCreate(
        last_name="RAKOTOMALALA",
        first_names="Aina",
        sex="F",
        birth_date="2004-07-09",
        birth_place="Commune fictive A",
    )
    assert citizen.birth_date == date(2004, 7, 9)
    assert citizen.nationality == "Malagasy"
    with pytest.raises(ValidationError):
        CitizenCreate(
            last_name="RAKOTOMALALA",
            first_names="Aina",
            sex="F",
            birth_date="2099-01-01",
            birth_place="Commune fictive A",
        )


def test_cin_photo_range_rejected():
    with pytest.raises(ValidationError):
        CinCreate(last_name="RAKOTOMALALA", first_names="Aina",
                  birth_date="2004-07-09", district="Antananarivo II",
                  birth_place="Antananarivo", address="Adresse fictive",
                  photos_count=99)


def test_pdf_contains_valid_signature():
    record = BirthCreate(**BIRTH).model_dump(mode="json")
    record["record_number"] = "NAI-DEMO-2026-0001"
    pdf = render_birth_specimen(record)
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000


def test_pdf_locality_uses_record_territory():
    record = BIRTH | {
        "district": "Arrondissement B fictif",
        "municipality": "Commune fictive B",
    }

    assert format_locality(record) == "Arrondissement B fictif, Commune fictive B"


def test_cin_pdf_is_a_nonofficial_dossier_sheet():
    record = {
        "file_number": "CIN-DEMO-2026-0001",
        "last_name": "RAKOTOMALALA",
        "first_names": "Aina",
        "birth_date": "2004-07-09",
        "birth_place": "Commune fictive A",
        "address": "Adresse de démonstration",
        "district": "Arrondissement fictif",
        "profession": "Sans emploi",
        "father_name": "",
        "mother_name": "",
        "has_birth_certificate": True,
        "has_residence_proof": False,
        "photos_count": 0,
        "status": "REGISTERED",
        "commune": {"name": "Commune fictive A"},
        "centre": {"name": "Centre fictif A"},
    }

    pdf = render_cin_specimen(record)

    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000
    media_box = re.search(rb"/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]", pdf)
    assert media_box is not None
    assert float(media_box.group(1)) == pytest.approx(105 * 72 / 25.4, abs=0.01)
    assert float(media_box.group(2)) == pytest.approx(74 * 72 / 25.4, abs=0.01)


def test_specimen_archive_contains_one_pdf_per_record_type():
    birth = BirthCreate(**BIRTH).model_dump(mode="json") | {
        "record_number": "NAI-DEMO-2026-0001",
        "address": "Adresse de démonstration",
        "declarant_name": "Déclarant fictif",
    }
    cin = {
        "file_number": "CIN-DEMO-2026-0001",
        "last_name": "RAKOTOMALALA",
        "first_names": "Aina",
        "birth_date": "2004-07-09",
        "birth_place": "Commune fictive A",
        "address": "Adresse de démonstration",
        "district": "Arrondissement fictif",
        "profession": "",
        "father_name": "",
        "mother_name": "",
        "has_birth_certificate": True,
        "has_residence_proof": False,
        "photos_count": 0,
        "status": "REGISTERED",
        "commune": {"name": "Commune fictive A"},
        "centre": {"name": "Centre fictif A"},
    }
    archive = render_specimen_archive({
        "commune": {"code": "COMMUNE_A", "name": "Commune fictive A"},
        "births": [birth],
        "cin": [cin],
    })

    with ZipFile(BytesIO(archive)) as bundle:
        pdf_names = [name for name in bundle.namelist() if name.endswith(".pdf")]
        assert pdf_names == [
            "naissances/NAI-DEMO-2026-0001.pdf",
            "cin/CIN-DEMO-2026-0001.pdf",
        ]
        assert all(bundle.read(name).startswith(b"%PDF") for name in pdf_names)
        assert b"fiches CIN ne sont pas des cartes" in bundle.read("LIRE-MOI-COMMUNE_A.txt")


def test_user_creation_requires_long_password_and_valid_username():
    user = UserCreate(
        username="agent.saisie",
        full_name="Agent de démonstration",
        password="a-strong-password-123",
        role_code="AGENT_SAISIE",
        centre_id="centre-test",
    )
    assert user.username == "agent.saisie"
    with pytest.raises(ValidationError):
        UserCreate(
            username="bad username",
            full_name="Agent de démonstration",
            password="short",
            role_code="AGENT_SAISIE",
            centre_id="centre-test",
        )
