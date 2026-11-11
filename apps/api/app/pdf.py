"""Document de démonstration : le modèle ne reproduit pas les dispositifs de sécurité officiels."""
from datetime import date
from io import BytesIO
from pathlib import Path
import re
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    LongTable,
    Paragraph,
    Table,
    SimpleDocTemplate,
    TableStyle,
)
from .birth_pdf import render_birth_specimen as _render_birth_specimen

FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
font_pairs = [
    (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
     Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"), "DejaVu"),
    (Path(r"C:\Windows\Fonts\arial.ttf"),
     Path(r"C:\Windows\Fonts\arialbd.ttf"), "Arial"),
]
for regular_path, bold_path, font_name in font_pairs:
    if regular_path.exists() and bold_path.exists():
        pdfmetrics.registerFont(TTFont(font_name, str(regular_path)))
        pdfmetrics.registerFont(TTFont(f"{font_name}-Bold", str(bold_path)))
        FONT_REGULAR = font_name
        FONT_BOLD = f"{font_name}-Bold"
        break

FR_MONTHS = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
NAVY = colors.HexColor("#0C2A4E")
BLUE = colors.HexColor("#1263AA")
MUTED = colors.HexColor("#64748B")
LINE = colors.HexColor("#E1E8EF")
WATERMARK = "SPÉCIMEN — SANS VALEUR OFFICIELLE"
PAGE_MARGIN = 18 * mm
TOP_MARGIN = 43 * mm
BOTTOM_MARGIN = 23 * mm


def format_french(value: str) -> str:
    d = date.fromisoformat(value[:10])
    return f"{d.day:02d} {FR_MONTHS[d.month]} {d.year}"


def format_locality(record: dict) -> str:
    return f"{record['district']}, {record['municipality']}"


def _wrapped_lines(value: object, width: float, font: str, size: int) -> list[str]:
    text = ''.join(character if character.isprintable() else ' ' for character in str(value))
    lines: list[str] = []
    current = ''
    for word in text.split():
        candidate = f'{current} {word}'.strip()
        if pdfmetrics.stringWidth(candidate, font, size) <= width:
            current = candidate
            continue
        if current:
            lines.append(current)
            current = ''
        while pdfmetrics.stringWidth(word, font, size) > width:
            low, high = 1, len(word)
            while low < high:
                middle = (low + high + 1) // 2
                if pdfmetrics.stringWidth(word[:middle], font, size) <= width:
                    low = middle
                else:
                    high = middle - 1
            lines.append(word[:low])
            word = word[low:]
        current = word
    if current or not lines:
        lines.append(current)
    return lines


def _safe_paragraph(value: object) -> str:
    text = ''.join(character if character.isprintable() else ' ' for character in str(value))
    return escape(text).replace("\n", "<br/>")


def _draw_page(canvas_: canvas.Canvas, doc, subtitle: str, cin_notice: bool) -> None:
    page_width, page_height = A4
    canvas_.saveState()
    canvas_.setStrokeColor(colors.HexColor("#C9D8E8"))
    canvas_.setLineWidth(0.7)
    canvas_.rect(PAGE_MARGIN, PAGE_MARGIN, page_width - 2 * PAGE_MARGIN, page_height - 2 * PAGE_MARGIN)

    canvas_.setFillColor(BLUE)
    canvas_.rect(PAGE_MARGIN, page_height - 36 * mm, page_width - 2 * PAGE_MARGIN, 36 * mm, fill=1, stroke=0)
    canvas_.setFillColor(colors.white)
    canvas_.setFont(FONT_BOLD, 14)
    canvas_.drawCentredString(page_width / 2, page_height - 14 * mm, "SGAEC — DOCUMENT DE DÉMONSTRATION")
    subtitle_style = ParagraphStyle(
        "HeaderSubtitle",
        fontName=FONT_REGULAR,
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
    available_subtitle_width = page_width - 2 * PAGE_MARGIN - 8 * mm
    wrapped_subtitle = "\n".join(
        _wrapped_lines(subtitle, available_subtitle_width, FONT_REGULAR, 8)
    )
    subtitle_paragraph = Paragraph(_safe_paragraph(wrapped_subtitle), subtitle_style)
    _, subtitle_height = subtitle_paragraph.wrap(available_subtitle_width, 18 * mm)
    subtitle_paragraph.drawOn(
        canvas_,
        PAGE_MARGIN + 4 * mm,
        page_height - 19 * mm - min(subtitle_height, 15 * mm),
    )

    canvas_.translate(page_width / 2, page_height / 2)
    canvas_.rotate(32)
    canvas_.setFillColor(colors.HexColor("#E6A3A3"))
    canvas_.setFillAlpha(0.18)
    canvas_.setFont(FONT_BOLD, 27)
    canvas_.drawCentredString(0, 0, "SPÉCIMEN")
    canvas_.restoreState()

    canvas_.saveState()
    canvas_.setFillColor(colors.HexColor("#B42318"))
    canvas_.setFont(FONT_BOLD, 8)
    canvas_.drawCentredString(page_width / 2, 15 * mm, WATERMARK)
    if cin_notice:
        canvas_.setFont(FONT_REGULAR, 7)
        canvas_.drawCentredString(
            page_width / 2,
            11 * mm,
            "Fiche de suivi uniquement — ne constitue pas une pièce d'identité",
        )
    canvas_.setFillColor(MUTED)
    canvas_.setFont(FONT_REGULAR, 7)
    canvas_.drawRightString(page_width - PAGE_MARGIN, 7 * mm, f"Page {doc.page}")
    canvas_.restoreState()


def _document_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "SpecimenTitle",
            parent=base["Title"],
            fontName=FONT_BOLD,
            fontSize=15,
            leading=19,
            textColor=NAVY,
            alignment=TA_CENTER,
            spaceAfter=5 * mm,
        ),
        "intro": ParagraphStyle(
            "SpecimenIntro",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=9,
            leading=13,
            textColor=MUTED,
            alignment=TA_LEFT,
            spaceAfter=3 * mm,
        ),
        "reference": ParagraphStyle(
            "SpecimenReference",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=8,
            leading=12,
            textColor=NAVY,
            leftIndent=3 * mm,
            spaceBefore=1 * mm,
            spaceAfter=4 * mm,
        ),
        "section": ParagraphStyle(
            "SpecimenSection",
            parent=base["Heading3"],
            fontName=FONT_BOLD,
            fontSize=8,
            leading=11,
            textColor=BLUE,
            spaceBefore=3 * mm,
            spaceAfter=1 * mm,
            keepWithNext=True,
        ),
        "label": ParagraphStyle(
            "SpecimenLabel",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=8,
            leading=11,
            textColor=MUTED,
        ),
        "value": ParagraphStyle(
            "SpecimenValue",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=9,
            leading=13,
            textColor=NAVY,
            splitLongWords=1,
        ),
        "notice": ParagraphStyle(
            "SpecimenNotice",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=8,
            leading=12,
            textColor=colors.HexColor("#7A3E00"),
            backColor=colors.HexColor("#FFF7E6"),
            borderColor=colors.HexColor("#F2D28B"),
            borderWidth=0.5,
            borderPadding=7,
            spaceBefore=2 * mm,
            spaceAfter=4 * mm,
        ),
    }


def _draw_specimen_rows(
    story: list,
    sections: list[tuple[str, list[tuple[str, object]]]],
    available_width: float,
    styles: dict[str, ParagraphStyle],
) -> None:
    label_width = 42 * mm
    for section_title, rows in sections:
        story.append(Paragraph(_safe_paragraph(section_title), styles["section"]))
        data = [
            [
                Paragraph(_safe_paragraph(label), styles["label"]),
                Paragraph(_safe_paragraph(value), styles["value"]),
            ]
            for label, value in rows
        ]
        table = LongTable(
            data,
            colWidths=[label_width, available_width - label_width],
            repeatRows=0,
            splitByRow=1,
            splitInRow=1,
            hAlign="LEFT",
        )
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ("LINEBELOW", (0, 0), (-1, -1), 0.45, LINE),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ]))
        story.append(table)


def _render_specimen(
    title: str,
    subtitle: str,
    reference: str,
    sections: list[tuple[str, list[tuple[str, object]]]],
    cin_notice: bool = False,
) -> bytes:
    stream = BytesIO()
    doc = SimpleDocTemplate(
        stream,
        pagesize=A4,
        rightMargin=PAGE_MARGIN,
        leftMargin=PAGE_MARGIN,
        topMargin=TOP_MARGIN,
        bottomMargin=BOTTOM_MARGIN,
        title=title,
        author="SGAEC — démonstration",
    )
    styles = _document_styles()
    reference_paragraph = Paragraph(
        f"<b>RÉFÉRENCE DE DÉMONSTRATION</b><br/>{_safe_paragraph(reference)}",
        styles["reference"],
    )
    reference_card = Table([[reference_paragraph]], colWidths=[doc.width])
    reference_card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EFF6FC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D5E4F2")),
        ("LINEBEFORE", (0, 0), (0, -1), 2, BLUE),
        ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm),
    ]))
    story = [Paragraph(_safe_paragraph(title), styles["title"]), reference_card]
    if cin_notice:
        story.append(Paragraph(
            "Fiche de suivi uniquement. Elle ne constitue pas une carte nationale "
            "d'identité et ne peut pas servir de pièce d'identité.",
            styles["notice"],
        ))
    else:
        story.append(Paragraph(
            "Copie de démonstration — aucune signature, certification ou valeur administrative.",
            styles["intro"],
        ))
    _draw_specimen_rows(story, sections, doc.width, styles)
    def on_page(page_canvas: canvas.Canvas, page_doc) -> None:
        _draw_page(page_canvas, page_doc, subtitle, cin_notice)

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return stream.getvalue()


def render_birth_specimen(record: dict) -> bytes:
    return _render_birth_specimen(record, FONT_REGULAR, FONT_BOLD)


def render_cin_specimen(record: dict) -> bytes:
    commune = record.get("commune", {}).get("name", "Commune non renseignée")
    centre = record.get("centre", {}).get("name", "Centre non renseigné")
    subtitle = f"{commune} — {centre}"

    declared_documents = []
    if record.get("has_birth_certificate"):
        declared_documents.append("Copie d'acte de naissance")
    if record.get("has_residence_proof"):
        declared_documents.append("Justificatif de domicile")
    if record.get("photos_count", 0):
        declared_documents.append(f"{record['photos_count']} photographie(s) déclarée(s)")
    status_labels = {
        "REGISTERED": "Enregistré",
        "IN_REVIEW": "En cours d'instruction",
        "VALIDATED": "Validé",
        "ISSUED": "Dossier clôturé",
        "REJECTED": "Rejeté",
    }
    sections = [
        ("IDENTITÉ", [
            ("Nom", record["last_name"]),
            ("Prénom(s)", record["first_names"]),
            ("Date de naissance", format_french(record["birth_date"])),
            ("Lieu de naissance", record["birth_place"]),
        ]),
        ("DOMICILE ET FILIATION DÉCLARÉS", [
            ("Domicile déclaré", record["address"]),
            ("Arrondissement", record["district"]),
            ("Profession déclarée", record.get("profession") or "Non renseignée"),
            ("Père déclaré", record.get("father_name") or "Non renseigné"),
            ("Mère déclarée", record.get("mother_name") or "Non renseigné"),
        ]),
        ("SUIVI DU DOSSIER", [
            ("Statut enregistré", status_labels.get(record.get("status"), "Non renseigné")),
            ("Pièces mentionnées", ", ".join(declared_documents) or "Aucune pièce déclarée"),
        ]),
    ]
    return _render_specimen(
        "FICHE DE SUIVI D'UN DOSSIER CIN",
        subtitle,
        record["file_number"],
        sections,
        cin_notice=True,
    )


def render_specimen_archive(export_data: dict) -> bytes:
    stream = BytesIO()
    births = export_data["births"]
    cin_cases = export_data["cin"]
    commune_code = re.sub(r"[^A-Za-z0-9._-]+", "-", export_data["commune"]["code"]).strip("-")
    with ZipFile(stream, mode="w", compression=ZIP_DEFLATED) as archive:
        for record in births:
            name = re.sub(r"[^A-Za-z0-9._-]+", "-", record["record_number"]).strip("-")
            archive.writestr(f"naissances/{name or record['id']}.pdf", render_birth_specimen(record))
        for record in cin_cases:
            name = re.sub(r"[^A-Za-z0-9._-]+", "-", record["file_number"]).strip("-")
            archive.writestr(f"cin/{name or record['id']}.pdf", render_cin_specimen(record))
        readme = (
            "EXPORT SGAEC — DOCUMENTS DE DÉMONSTRATION\n"
            f"Commune : {export_data['commune']['name']} ({export_data['commune']['code']})\n"
            f"Actes de naissance exportés : {len(births)}\n"
            f"Dossiers CIN exportés sous forme de fiches de démonstration : {len(cin_cases)}\n\n"
            "Chaque PDF porte une mention SPECIMEN visible. Les fiches CIN ne sont pas des cartes "
            "d'identité et ne peuvent pas servir de pièce d'identité.\n"
        )
        archive.writestr(f"LIRE-MOI-{commune_code or 'COMMUNE'}.txt", readme.encode("utf-8"))
    return stream.getvalue()
