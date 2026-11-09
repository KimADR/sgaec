"""Tests unitaires indépendants de Docker et de PostgreSQL.

Lancer avec : PYTHONPATH=. pytest -q (depuis apps/api).
"""
from datetime import date, datetime, timezone
from io import BytesIO
import re
from zipfile import ZipFile

import pytest
from pydantic import ValidationError
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

from app.models import (
    BirthCreate,
    CitizenCreate,
    CinCreate,
    CinEvidenceUpdate,
    CinTransition,
    UserCreate,
    _today_in_antananarivo,
)
from app.pdf import (
    FONT_BOLD,
    FONT_REGULAR,
    PAGE_MARGIN,
    _wrapped_lines,
    format_locality,
    pdfmetrics,
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


def test_civil_today_uses_antananarivo_timezone_at_utc_day_boundary():
    utc_instant = datetime(2026, 11, 7, 23, 30, tzinfo=timezone.utc)

    assert _today_in_antananarivo(utc_instant) == date(2026, 11, 8)


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


def test_cin_workflow_and_evidence_models_validate_requests():
    transition = CinTransition(status="REJECTED", reason="Pièces incomplètes")
    assert transition.status == "REJECTED"
    assert CinEvidenceUpdate(
        has_birth_certificate=True,
        has_residence_proof=True,
        photos_count=2,
    ).photos_count == 2
    with pytest.raises(ValidationError):
        CinTransition(status="INVALID")
    with pytest.raises(ValidationError):
        CinEvidenceUpdate(
            has_birth_certificate=True,
            has_residence_proof=True,
            photos_count=9,
        )


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


def test_pdf_wrapping_preserves_a_long_name_with_diacritics():
    name = "É" * 120

    lines = _wrapped_lines(name, 100, FONT_BOLD, 10)

    assert len(lines) > 1
    assert "".join(lines) == name
    assert all(pdfmetrics.stringWidth(line, FONT_BOLD, 10) <= 100 for line in lines)


def test_pdf_wraps_maximum_length_locality_within_header_width():
    district = "Arrondissement fictif " * 6
    municipality = "Commune fictive " * 6
    locality = format_locality({
        "district": district[:140],
        "municipality": municipality[:140],
    })
    available_width = A4[0] - 2 * PAGE_MARGIN - 8 * mm

    lines = _wrapped_lines(locality, available_width, FONT_REGULAR, 8)

    assert len(lines) > 1
    assert all(pdfmetrics.stringWidth(line, FONT_REGULAR, 8) <= available_width for line in lines)


def test_pdf_paginates_very_long_field_content():
    record = BirthCreate(**BIRTH).model_dump(mode="json") | {
        "record_number": "NAI-DEMO-2026-0001",
        "place_of_birth": "Localité fictive " * 500,
    }

    pdf = render_birth_specimen(record)

    assert len(re.findall(rb"/Type\s*/Page\b", pdf)) > 1


def test_cin_pdf_is_a4_dossier_sheet_and_uses_record_data():
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
    assert float(media_box.group(1)) == pytest.approx(595.2756, abs=0.01)
    assert float(media_box.group(2)) == pytest.approx(841.8898, abs=0.01)
    changed_record = record | {"last_name": "NOM DE DÉMONSTRATION MODIFIÉ"}
    assert render_cin_specimen(changed_record) != pdf


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
