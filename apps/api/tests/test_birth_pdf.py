import math
import re
from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app import birth_pdf
from app.pdf import render_birth_specimen


DEMO_BIRTH = {
    "last_name": "ANDRIAMAHATOKY",
    "first_names": "Noël",
    "birth_date": "2004-07-09",
    "sex": "M",
    "district": "Antananarivo II",
    "municipality": "Commune fictive A",
    "place_of_birth": "Antananarivo II",
    "nationality": "Malagasy",
    "record_number": "NAI-DEMO-2026-0158",
    "father_name": "ANDRIAMAHATOKY Noelson",
    "mother_name": "RANDRIANJATOVO Josette",
    "address": "Lot VU 113A Bis, Avaratra",
    "declarant_name": "Déclarant fictif",
}


def test_birth_pdf_has_a4_layout_and_institutional_content():
    pdf = render_birth_specimen(DEMO_BIRTH)
    media_box = re.search(
        rb"/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]",
        pdf,
    )

    assert pdf.startswith(b"%PDF")
    assert media_box is not None
    assert math.isclose(float(media_box.group(1)), A4[0], abs_tol=0.01)
    assert math.isclose(float(media_box.group(2)), A4[1], abs_tol=0.01)
    assert b"/Type /Page" in pdf
    assert len(pdf) > 1000
    assert len(re.findall(rb"/Type\s*/Page\b", pdf)) == 1


def test_birth_page_callback_keeps_full_footer_watermark():
    output = BytesIO()
    specimen = canvas.Canvas(output, pagesize=A4)
    drawn_text: list[str] = []
    specimen.drawCentredString = lambda x, y, text: drawn_text.append(text)
    specimen.drawRightString = lambda x, y, text: drawn_text.append(text)

    birth_pdf._draw_birth_page(
        specimen,
        type("Document", (), {"page": 1})(),
        "Commune fictive A",
        "Helvetica",
        "Helvetica-Bold",
    )

    assert birth_pdf.BIRTH_WATERMARK in drawn_text


def test_birth_diagonal_watermark_marks_document_as_specimen():
    output = BytesIO()
    specimen = canvas.Canvas(output, pagesize=A4)
    drawn_text: list[str] = []
    specimen.drawCentredString = lambda x, y, text: drawn_text.append(text)

    birth_pdf._draw_birth_watermark(specimen)

    assert "SPÉCIMEN" in drawn_text
    assert "SANS VALEUR OFFICIELLE" in drawn_text


def test_long_municipality_name_is_fitted_inside_the_header():
    class CanvasSpy:
        font = ""
        size = 0.0
        text = ""

        def setFont(self, font, size):
            self.font = font
            self.size = size

        def drawCentredString(self, x, y, text):
            self.text = text

    specimen = CanvasSpy()
    max_width = 120 * 72 / 25.4
    birth_pdf._center_fit(
        specimen,
        "COMMUNE DE DÉMONSTRATION " * 12,
        700,
        max_width,
        "Helvetica-Bold",
        9,
    )

    assert specimen.text.endswith("…")
    assert math.isclose(specimen.size, 7.0)
    assert len(specimen.text) < len("COMMUNE DE DÉMONSTRATION " * 12)
    assert birth_pdf.pdfmetrics.stringWidth(
        specimen.text,
        specimen.font,
        specimen.size,
    ) <= max_width


def test_birth_pdf_repeats_watermark_on_long_documents(monkeypatch):
    original_draw_page = birth_pdf._draw_birth_page
    original_draw_watermark = birth_pdf._draw_birth_watermark
    rendered_pages: list[int] = []
    watermark_pages: list[int] = []

    def track_page(page_canvas, document, municipality, font_regular, font_bold):
        rendered_pages.append(document.page)
        original_draw_page(
            page_canvas,
            document,
            municipality,
            font_regular,
            font_bold,
        )

    def track_watermark(page_canvas):
        watermark_pages.append(page_canvas._pageNumber)
        original_draw_watermark(page_canvas)

    monkeypatch.setattr(birth_pdf, "_draw_birth_page", track_page)
    monkeypatch.setattr(birth_pdf, "_draw_birth_watermark", track_watermark)
    record = DEMO_BIRTH | {"place_of_birth": "Tanàna malagasy " * 1200}
    pdf = render_birth_specimen(record)

    page_count = len(re.findall(rb"/Type\s*/Page\b", pdf))
    assert page_count > 1
    assert rendered_pages == list(range(1, page_count + 1))
    assert len(watermark_pages) == page_count


def test_birth_pdf_keeps_long_accented_values_and_escapes_markup():
    record = DEMO_BIRTH | {
        "last_name": "ANDRIAMAHATOKY É",
        "first_names": "Noël & Fitiavana",
        "place_of_birth": "Antananarivo <Centre> — toerana fictive",
    }

    pdf = render_birth_specimen(record)

    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000
    assert _has_embedded_font_subset(pdf)


def _has_embedded_font_subset(pdf: bytes) -> bool:
    return b"/FontFile2" in pdf
