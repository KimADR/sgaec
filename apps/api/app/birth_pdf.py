"""Mise en page dédiée aux extraits de naissance fictifs de démonstration."""
from datetime import date
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas
from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Table, TableStyle

BIRTH_NAVY = colors.HexColor("#183653")
BIRTH_BLUE = colors.HexColor("#355C73")
BIRTH_GOLD = colors.HexColor("#9A7845")
BIRTH_MUTED = colors.HexColor("#5E6E7D")
BIRTH_LINE = colors.HexColor("#D8D0C2")
BIRTH_MARGIN = 19 * mm
BIRTH_TOP_MARGIN = 47 * mm
BIRTH_BOTTOM_MARGIN = 18 * mm
BIRTH_WATERMARK = "SPÉCIMEN — SANS VALEUR OFFICIELLE"
MONTHS_FR = (
    "",
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
)


def _birth_text(value: object) -> str:
    text = "".join(character if character.isprintable() else " " for character in str(value))
    return escape(text).replace("\n", "<br/>")


def _birth_date(value: object) -> str:
    parsed = date.fromisoformat(str(value)[:10])
    return f"{parsed.day:02d} {MONTHS_FR[parsed.month]} {parsed.year}"


def _birth_styles(
    font_regular: str,
    font_bold: str,
) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "BirthDocumentTitle",
            parent=base["Title"],
            fontName="Times-Italic",
            fontSize=18,
            leading=22,
            textColor=BIRTH_NAVY,
            alignment=TA_CENTER,
            spaceAfter=1.5 * mm,
        ),
        "subtitle": ParagraphStyle(
            "BirthDocumentSubtitle",
            parent=base["BodyText"],
            fontName=font_regular,
            fontSize=8,
            leading=11,
            textColor=BIRTH_MUTED,
            alignment=TA_CENTER,
            spaceAfter=4 * mm,
        ),
        "section": ParagraphStyle(
            "BirthDocumentSection",
            parent=base["Heading3"],
            fontName="Times-Bold",
            fontSize=9,
            leading=11,
            textColor=BIRTH_NAVY,
            spaceBefore=2 * mm,
            spaceAfter=0.8 * mm,
            keepWithNext=True,
        ),
        "label": ParagraphStyle(
            "BirthDocumentLabel",
            parent=base["BodyText"],
            fontName=font_regular,
            fontSize=8,
            leading=10,
            textColor=BIRTH_MUTED,
        ),
        "value": ParagraphStyle(
            "BirthDocumentValue",
            parent=base["BodyText"],
            fontName=font_bold,
            fontSize=9,
            leading=11,
            textColor=BIRTH_NAVY,
            splitLongWords=1,
        ),
        "notice": ParagraphStyle(
            "BirthDocumentNotice",
            parent=base["BodyText"],
            fontName=font_regular,
            fontSize=8,
            leading=11,
            textColor=BIRTH_MUTED,
            alignment=TA_LEFT,
        ),
        "register": ParagraphStyle(
            "BirthDocumentRegister",
            parent=base["BodyText"],
            fontName=font_bold,
            fontSize=8.5,
            leading=11,
            textColor=BIRTH_NAVY,
            alignment=TA_CENTER,
        ),
        "signature": ParagraphStyle(
            "BirthDocumentSignature",
            parent=base["BodyText"],
            fontName=font_regular,
            fontSize=7,
            leading=9,
            textColor=BIRTH_MUTED,
            alignment=TA_CENTER,
        ),
    }


def _center_fit(
    page_canvas: canvas.Canvas,
    value: str,
    y: float,
    max_width: float,
    font: str,
    size: float,
    min_size: float = 7,
) -> None:
    while size > min_size and pdfmetrics.stringWidth(value, font, size) > max_width:
        size = max(min_size, size - 0.25)
    if pdfmetrics.stringWidth(value, font, size) > max_width:
        while value and pdfmetrics.stringWidth(f"{value}…", font, size) > max_width:
            value = value[:-1]
        value = f"{value}…"
    page_canvas.setFont(font, size)
    page_canvas.drawCentredString(A4[0] / 2, y, value)


def _draw_birth_page(
    page_canvas: canvas.Canvas,
    document,
    municipality: str,
    font_regular: str,
    font_bold: str,
) -> None:
    width, height = A4
    page_canvas.saveState()
    page_canvas.setStrokeColor(BIRTH_GOLD)
    page_canvas.setLineWidth(0.75)
    page_canvas.rect(
        BIRTH_MARGIN - 4 * mm,
        8 * mm,
        width - 2 * BIRTH_MARGIN + 8 * mm,
        height - 16 * mm,
        fill=0,
        stroke=1,
    )
    page_canvas.setStrokeColor(BIRTH_LINE)
    page_canvas.setLineWidth(0.35)
    page_canvas.rect(
        BIRTH_MARGIN - 2.5 * mm,
        9.5 * mm,
        width - 2 * BIRTH_MARGIN + 5 * mm,
        height - 19 * mm,
        fill=0,
        stroke=1,
    )

    page_canvas.setFillColor(BIRTH_GOLD)
    page_canvas.setFont(font_bold, 6.5)
    page_canvas.drawString(BIRTH_MARGIN, height - 12 * mm, "S.G.A.E.C. · DOCUMENT FICTIF")
    page_canvas.drawRightString(
        width - BIRTH_MARGIN,
        height - 12 * mm,
        "ÉTAT CIVIL · NAISSANCE",
    )
    page_canvas.setFillColor(BIRTH_NAVY)
    page_canvas.setFont(font_bold, 9.5)
    page_canvas.drawCentredString(width / 2, height - 14 * mm, "REPOBLIKAN'I MADAGASIKARA")
    page_canvas.setFillColor(BIRTH_MUTED)
    page_canvas.setFont(font_regular, 7.5)
    page_canvas.drawCentredString(
        width / 2,
        height - 19 * mm,
        "Fitiavana – Tanindrazana – Fandrosoana",
    )

    page_canvas.setFillColor(BIRTH_NAVY)
    _center_fit(
        page_canvas,
        municipality.upper(),
        height - 28 * mm,
        width - 2 * BIRTH_MARGIN,
        font_bold,
        9,
    )
    page_canvas.setFillColor(BIRTH_MUTED)
    page_canvas.setFont(font_regular, 8)
    page_canvas.drawCentredString(width / 2, height - 33 * mm, "SERVICE DE L'ÉTAT CIVIL")

    page_canvas.setStrokeColor(BIRTH_GOLD)
    page_canvas.setLineWidth(1.1)
    page_canvas.line(
        BIRTH_MARGIN,
        height - 38 * mm,
        width - BIRTH_MARGIN,
        height - 38 * mm,
    )

    page_canvas.setStrokeColor(BIRTH_LINE)
    page_canvas.setLineWidth(0.5)
    page_canvas.line(BIRTH_MARGIN, 20 * mm, width - BIRTH_MARGIN, 20 * mm)
    page_canvas.setFillColor(colors.HexColor("#8F2B26"))
    page_canvas.setFont(font_bold, 8)
    page_canvas.drawCentredString(width / 2, 15 * mm, BIRTH_WATERMARK)
    page_canvas.setFillColor(BIRTH_MUTED)
    page_canvas.setFont(font_regular, 7)
    page_canvas.drawRightString(
        width - BIRTH_MARGIN,
        11 * mm,
        f"Document fictif · SGAEC · Page {document.page}",
    )
    page_canvas.restoreState()


def _draw_birth_watermark(page_canvas: canvas.Canvas) -> None:
    page_canvas.saveState()
    page_canvas.translate(A4[0] / 2, A4[1] / 2)
    page_canvas.rotate(32)
    page_canvas.setFillColor(colors.HexColor("#A32020"))
    page_canvas.setFillAlpha(0.09)
    page_canvas.setFont("Helvetica-Bold", 25)
    page_canvas.drawCentredString(0, 1 * mm, "SPÉCIMEN")
    page_canvas.setFillAlpha(0.2)
    page_canvas.setFont("Helvetica-Bold", 8)
    page_canvas.drawCentredString(0, -6 * mm, "SANS VALEUR OFFICIELLE")
    page_canvas.restoreState()


class _BirthWatermarkCanvas(canvas.Canvas):
    def showPage(self) -> None:
        _draw_birth_watermark(self)
        super().showPage()


def _birth_reference(record_number: object, width: float, styles: dict[str, ParagraphStyle]):
    reference = Table(
        [[
            Paragraph("REGISTRE D'ÉTAT CIVIL · NAISSANCES", styles["label"]),
            Paragraph(
                f"RÉFÉRENCE / LAHARANA N°<br/><b>{_birth_text(record_number)}</b>",
                styles["register"],
            ),
        ]],
        colWidths=[width * 0.48, width * 0.52],
    )
    reference.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FBF9F5")),
        ("BOX", (0, 0), (-1, -1), 0.65, BIRTH_GOLD),
        ("LINEBEFORE", (1, 0), (1, -1), 0.6, BIRTH_LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.2 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.2 * mm),
    ]))
    return reference


def _birth_section(
    story: list,
    title: str,
    rows: list[tuple[str, object]],
    width: float,
    styles: dict[str, ParagraphStyle],
) -> None:
    story.append(Paragraph(_birth_text(title), styles["section"]))
    data = [
        [
            Paragraph(_birth_text(label), styles["label"]),
            Paragraph(_birth_text(value), styles["value"]),
        ]
        for label, value in rows
    ]
    table = LongTable(
        data,
        colWidths=[48 * mm, width - 48 * mm],
        splitByRow=1,
        splitInRow=1,
        hAlign="LEFT",
    )
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 1.2 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.2 * mm),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, BIRTH_LINE),
    ]))
    story.append(table)


def render_birth_specimen(
    record: dict,
    font_regular: str,
    font_bold: str,
) -> bytes:
    """Render a birth extract with a birth-only A4 layout and repeated specimen marks."""
    stream = BytesIO()
    styles = _birth_styles(font_regular, font_bold)
    municipality = str(record.get("municipality") or "Commune non renseignée")
    doc = SimpleDocTemplate(
        stream,
        pagesize=A4,
        rightMargin=BIRTH_MARGIN,
        leftMargin=BIRTH_MARGIN,
        topMargin=BIRTH_TOP_MARGIN,
        bottomMargin=BIRTH_BOTTOM_MARGIN,
        title="Extrait d'acte de naissance — spécimen",
        author="SGAEC — démonstration",
    )

    story = [
        Paragraph("Kopian'ny Sora-pahaterahana", styles["title"]),
        Paragraph(
            "COPIE D'ACTE DE NAISSANCE · EXTRAIT DE DÉMONSTRATION",
            styles["subtitle"],
        ),
        _birth_reference(record["record_number"], doc.width, styles),
    ]
    _birth_section(
        story,
        "IDENTITÉ",
        [
            ("Anarana / Nom", record["last_name"]),
            ("Fanampin'anarana / Prénom(s)", record["first_names"]),
            ("Sexe", "Masculin" if record["sex"] == "M" else "Féminin"),
            ("Teraka tamin'ny / Né(e) le", _birth_date(record["birth_date"])),
            ("Tao / À", record["place_of_birth"]),
            ("Nationalité", record["nationality"]),
        ],
        doc.width,
        styles,
    )
    _birth_section(
        story,
        "ANCRAGE TERRITORIAL",
        [
            ("Arrondissement", record["district"]),
            ("Commune", municipality),
        ],
        doc.width,
        styles,
    )
    _birth_section(
        story,
        "FILIATION ET DÉCLARATION",
        [
            ("Ray / Père", record.get("father_name") or "Non renseigné"),
            ("Reny / Mère", record.get("mother_name") or "Non renseignée"),
            ("Adresse déclarée", record.get("address") or "Non renseignée"),
            ("Déclarant", record.get("declarant_name") or "Non renseigné"),
        ],
        doc.width,
        styles,
    )

    notice = Table(
        [[Paragraph(
            "<b>Copie de démonstration.</b> Générée à partir des informations "
            "fictives enregistrées dans SGAEC. Ce document n'est ni un acte "
            "authentique, ni une copie certifiée.",
            styles["notice"],
        )]],
        colWidths=[doc.width],
    )
    notice.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FBF9F5")),
        ("BOX", (0, 0), (-1, -1), 0.55, BIRTH_LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 2, BIRTH_GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
    ]))
    story.extend([
        Paragraph("MENTION ADMINISTRATIVE", styles["section"]),
        notice,
    ])

    signatures = Table(
        [[
            Paragraph(
                "Espace réservé<br/><br/>Officier d'état civil",
                styles["signature"],
            ),
            Paragraph(
                "Espace réservé<br/><br/>Déclarant",
                styles["signature"],
            ),
        ]],
        colWidths=[doc.width / 2, doc.width / 2],
    )
    signatures.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEABOVE", (0, 0), (-1, -1), 0.55, BIRTH_LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    story.extend([
        Paragraph("EMPLACEMENTS DE SIGNATURE — NON APPOSÉES SUR CE SPÉCIMEN", styles["section"]),
        signatures,
    ])

    def on_page(page_canvas: canvas.Canvas, page_document) -> None:
        _draw_birth_page(
            page_canvas,
            page_document,
            municipality,
            font_regular,
            font_bold,
        )

    doc.build(
        story,
        onFirstPage=on_page,
        onLaterPages=on_page,
        canvasmaker=_BirthWatermarkCanvas,
    )
    return stream.getvalue()
