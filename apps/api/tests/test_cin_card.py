import re

from app.cin_card import _fit_value, render_cin_card_preview
from app.pdf import FONT_BOLD, pdfmetrics


DEMO_RECORD = {
    "id": "00000000-0000-4000-8000-000000000001",
    "file_number": "CIN-DEMO-2026-0001",
    "last_name": "RAKOTOMALALA",
    "first_names": "Aina Fitiavana",
    "birth_date": "2004-07-09",
    "birth_place": "Commune fictive A",
    "address": "Adresse fictive, quartier de démonstration",
    "district": "Arrondissement fictif",
    "profession": "Sans emploi",
    "father_name": "Rabe Fictif",
    "mother_name": "Rasoa Fictive",
}


def test_cin_card_pdf_uses_landscape_background_and_demo_fields():
    pdf = render_cin_card_preview(DEMO_RECORD)

    assert pdf.startswith(b"%PDF")
    assert b"/Subtype /Image" in pdf
    media_box = re.search(rb"/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]", pdf)
    assert media_box is not None
    assert float(media_box.group(1)) > float(media_box.group(2))


def test_cin_card_long_accented_values_fit_without_changing_source():
    value = "Ràkoto Malagasy " * 20

    fitted, size = _fit_value(value, 165, 23)

    assert fitted.endswith("…")
    assert fitted != value
    assert value == "Ràkoto Malagasy " * 20
    assert pdfmetrics.stringWidth(fitted, FONT_BOLD, size) <= 165


def test_cin_card_removes_non_printing_characters_from_visual_text():
    fitted, _ = _fit_value("Aina\x00 Fitiavana", 200, 23)

    assert fitted == "Aina Fitiavana"


def test_cin_card_supports_accents_in_all_demo_fields():
    record = DEMO_RECORD | {
        "last_name": "RAKOTOMALALA É",
        "first_names": "Aina Fitiavana",
        "birth_place": "Antananarivo — cité fictive",
    }

    assert render_cin_card_preview(record).startswith(b"%PDF")
