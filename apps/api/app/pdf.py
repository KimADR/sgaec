"""Document de démonstration : le modèle ne reproduit pas les dispositifs de sécurité officiels."""
from datetime import date
from io import BytesIO
from pathlib import Path
import re
from zipfile import ZIP_DEFLATED, ZipFile

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

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
            split_at = max(1, int(len(word) * width / pdfmetrics.stringWidth(word, font, size)))
            lines.append(word[:split_at])
            word = word[split_at:]
        current = word
    if current or not lines:
        lines.append(current)
    return lines


def _draw_specimen_watermark(c, w: float, h: float, label: str) -> None:
    c.saveState()
    c.translate(w / 2, h / 2)
    c.rotate(32)
    c.setFillColor(colors.HexColor("#F2B9B9"))
    c.setFont(FONT_BOLD, 37)
    c.drawCentredString(0, 7, label)
    c.restoreState()


def _draw_specimen_header(c, w: float, h: float, title: str, subtitle: str, reference: str) -> None:
    c.setStrokeColor(colors.HexColor("#C9D8E8"))
    c.setLineWidth(1)
    c.rect(34, 36, w - 68, h - 72)
    c.setFillColor(colors.HexColor("#1263AA"))
    c.rect(34, h - 132, w - 68, 96, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont(FONT_BOLD, 17)
    c.drawCentredString(w / 2, h - 76, "SGAEC — DOCUMENT DE DÉMONSTRATION")
    c.setFont(FONT_REGULAR, 10)
    c.drawCentredString(w / 2, h - 99, subtitle)
    c.setFillColor(colors.HexColor("#0C2A4E"))
    c.setFont(FONT_BOLD, 16)
    c.drawCentredString(w / 2, h - 174, title)
    c.setFont(FONT_REGULAR, 9)
    c.drawCentredString(w / 2, h - 194, f"Référence de démonstration : {reference}")


def _draw_specimen_rows(c, rows: list[tuple[str, object]], w: float, h: float,
                        title: str, subtitle: str, reference: str) -> None:
    left = 72
    value_x = 226
    value_width = w - 72 - value_x
    y = h - 230
    for label, raw_value in rows:
        lines = _wrapped_lines(raw_value, value_width, FONT_BOLD, 10)
        row_height = max(34, 13 * len(lines) + 13)
        if y - row_height < 100:
            c.showPage()
            _draw_specimen_header(c, w, h, title, subtitle, reference)
            _draw_specimen_watermark(c, w, h, "SPÉCIMEN — SANS VALEUR OFFICIELLE")
            y = h - 230
        c.setFillColor(colors.HexColor("#64748B"))
        c.setFont(FONT_REGULAR, 9)
        c.drawString(left, y - 14, label)
        c.setFillColor(colors.HexColor("#0C2A4E"))
        c.setFont(FONT_BOLD, 10)
        for line_index, line in enumerate(lines):
            c.drawString(value_x, y - 14 - 13 * line_index, line)
        c.setStrokeColor(colors.HexColor("#E1E8EF"))
        c.line(left, y - row_height + 2, w - 72, y - row_height + 2)
        y -= row_height
    c.setFillColor(colors.HexColor("#B42318"))
    c.setFont(FONT_BOLD, 9)
    c.drawCentredString(w / 2, 75, "SPÉCIMEN — SANS VALEUR OFFICIELLE")
    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont(FONT_REGULAR, 8)
    c.drawCentredString(w / 2, 58, "Prototype SGAEC — aucune signature, certification ou valeur administrative")


def render_birth_specimen(record: dict) -> bytes:
    stream = BytesIO()
    c = canvas.Canvas(stream, pagesize=A4, pageCompression=1)
    w, h = A4
    navy = colors.HexColor("#0C2A4E")
    title = "EXTRAIT D'ACTE DE NAISSANCE"
    subtitle = f"Registre d'état civil — {format_locality(record)}"
    reference = record["record_number"]
    _draw_specimen_header(c, w, h, title, subtitle, reference)
    _draw_specimen_watermark(c, w, h, "SPÉCIMEN — SANS VALEUR OFFICIELLE")
    rows = [
        ("Nom", record["last_name"]),
        ("Prénom(s)", record["first_names"]),
        ("Sexe", "Masculin" if record["sex"] == "M" else "Féminin"),
        ("Date de naissance", format_french(record["birth_date"])),
        ("Lieu de naissance", record["place_of_birth"]),
        ("Nationalité", record["nationality"]),
        ("Arrondissement", record["district"]),
        ("Commune", record["municipality"]),
        ("Père", record.get("father_name") or "Non renseigné"),
        ("Mère", record.get("mother_name") or "Non renseigné"),
        ("Adresse déclarée", record.get("address") or "Non renseignée"),
        ("Déclarant", record.get("declarant_name") or "Non renseigné"),
    ]
    _draw_specimen_rows(c, rows, w, h, title, subtitle, reference)
    c.save()
    return stream.getvalue()


def render_cin_specimen(record: dict) -> bytes:
    stream = BytesIO()
    w, h = 105 * mm, 74 * mm
    c = canvas.Canvas(stream, pagesize=(w, h), pageCompression=1)
    c.setFillColor(colors.HexColor("#E6F4F1"))
    c.roundRect(0, 0, w, h, 8, fill=1, stroke=0)

    header_height = 18 * mm
    footer_height = 10 * mm
    c.setFillColor(colors.HexColor("#145F64"))
    c.rect(0, h - header_height, w, header_height, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FFCA76"))
    c.roundRect(6 * mm, h - 13 * mm, 9 * mm, 9 * mm, 2, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#154E55"))
    c.setFont(FONT_BOLD, 7)
    c.drawCentredString(10.5 * mm, h - 9.5 * mm, "SG")
    c.setFillColor(colors.white)
    c.setFont(FONT_BOLD, 8)
    c.drawString(18 * mm, h - 8 * mm, "SGAEC / CARTE D'EXERCICE")
    c.setFillColor(colors.HexColor("#D3EBE4"))
    c.setFont(FONT_REGULAR, 6)
    c.drawString(18 * mm, h - 13 * mm, "MAQUETTE ADMINISTRATIVE FICTIVE")
    c.setStrokeColor(colors.HexColor("#9ED5C6"))
    c.roundRect(w - 26 * mm, h - 12 * mm, 20 * mm, 6 * mm, 3 * mm, fill=0, stroke=1)
    c.setFillColor(colors.HexColor("#E3F7ED"))
    c.setFont(FONT_BOLD, 5)
    c.drawCentredString(w - 16 * mm, h - 9.8 * mm, "PROTOTYPE")

    left = 6 * mm
    body_top = h - header_height - 5 * mm
    c.setFillColor(colors.HexColor("#357975"))
    c.setFont(FONT_BOLD, 5.5)
    c.drawString(left, body_top, "IDENTIT? DE D?MONSTRATION")
    c.setFillColor(colors.HexColor("#163D45"))
    c.setFont(FONT_BOLD, 10)
    c.drawString(left, body_top - 5 * mm, record["last_name"][:28])
    c.setFont(FONT_REGULAR, 8)
    c.drawString(left, body_top - 9 * mm, record["first_names"][:32])

    details = [
        ("DATE DE NAISSANCE", format_french(record["birth_date"]), left, body_top - 15 * mm),
        ("LIEU DE NAISSANCE", record["birth_place"], w / 2 + 2 * mm, body_top - 15 * mm),
        ("DOMICILE D?CLAR?", record["address"], left, body_top - 25 * mm),
        ("R?F?RENCE DE DOSSIER", record["file_number"], w / 2 + 2 * mm, body_top - 25 * mm),
    ]
    for label, value, x, y in details:
        c.setFillColor(colors.HexColor("#39716E"))
        c.setFont(FONT_REGULAR, 5)
        c.drawString(x, y, label)
        c.setFillColor(colors.HexColor("#163D45"))
        c.setFont(FONT_BOLD, 6)
        c.drawString(x, y - 3 * mm, value[:30])

    c.setFillColor(colors.HexColor("#CF5143"))
    c.rect(0, 0, w, footer_height, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont(FONT_BOLD, 9)
    c.drawCentredString(w / 2, 3.2 * mm, "SP?CIMEN ? NON VALABLE")
    c.save()
    return stream.getvalue()

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
