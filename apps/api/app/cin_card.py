"""Maquette CIN de démonstration, sans valeur administrative.

Le fond provient d'une illustration SPECIMEN fournie pour le projet.
Il contient un filigrane rouge permanent. Aucun numéro d'identité,
photo, cachet ou signature n'est généré ni déduit automatiquement.

Coordonnées en pixels sur la maquette source (1672 x 941) pour permettre
un ajustement simple sans changer les données métier.
"""
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from .pdf import FONT_BOLD, format_french, pdfmetrics

BACKGROUND = Path(__file__).resolve().parent / "assets" / "cin_specimen_demo.jpg"
ART_WIDTH = 1672
ART_HEIGHT = 941
PAGE_WIDTH = 285 * mm
SCALE = PAGE_WIDTH / ART_WIDTH
PAGE_HEIGHT = ART_HEIGHT * SCALE
TEXT = colors.HexColor("#18263B")

# (clé métier, x initial, y ligne de base depuis le HAUT, largeur maxi, taille en pixels)
# Les zones ne recouvrent que les lignes de saisie, jamais les intitulés du document.
PLACEMENTS = [
    ("last_name",     286, 300, 540, 23),
    ("first_names",   486, 377, 343, 22),
    ("birth_date_fr",  692, 499, 145, 22),
    ("birth_place",   443, 568, 391, 22),
    ("address",      1182, 232, 410, 22),
    ("district",     1250, 299, 345, 21),
    ("profession",   1174, 345, 418, 21),
    ("father_name",  1156, 391, 436, 21),
    ("mother_name",  1202, 439, 392, 21),
]


def _fit_value(value: object, max_width_px: float, desired_size_px: int) -> tuple[str, float]:
    """Fait tenir chaque donnée sur une ligne, sans dépasser le champ."""
    text = "".join(character if character.isprintable() else " " for character in str(value or ""))
    text = " ".join(text.split())
    if not text:
        return "", float(desired_size_px)
    for size in range(desired_size_px, 13, -1):
        if pdfmetrics.stringWidth(text, FONT_BOLD, size) <= max_width_px:
            return text, float(size)
    size = 14.0
    ellipsis = "…"
    lo, hi = 0, len(text)
    while lo < hi:
        middle = (lo + hi + 1) // 2
        candidate = text[:middle].rstrip() + ellipsis
        if pdfmetrics.stringWidth(candidate, FONT_BOLD, size) <= max_width_px:
            lo = middle
        else:
            hi = middle - 1
    return text[:lo].rstrip() + ellipsis, size


def _draw_field(
    pdf: canvas.Canvas,
    value: object,
    x_px: float,
    baseline_y_px: float,
    max_width_px: float,
    font_size_px: int,
) -> None:
    fitted, size = _fit_value(value, max_width_px, font_size_px)
    if not fitted:
        return

    x = x_px * SCALE
    y = (ART_HEIGHT - baseline_y_px) * SCALE
    text_width = pdfmetrics.stringWidth(fitted, FONT_BOLD, size) * SCALE

    pdf.saveState()
    pdf.setFillAlpha(0.77)
    pdf.setFillColor(colors.white)
    pdf.roundRect(
        x - 4 * SCALE,
        y - 5 * SCALE,
        text_width + 9 * SCALE,
        (size + 9) * SCALE,
        4 * SCALE,
        stroke=0,
        fill=1,
    )
    pdf.restoreState()
    pdf.setFillColor(TEXT)
    pdf.setFont(FONT_BOLD, size * SCALE)
    pdf.drawString(x, y, fitted)


def render_cin_card_preview(record: dict) -> bytes:
    """Génère une page PDF paysage au format exact de la maquette."""
    if not BACKGROUND.is_file():
        raise FileNotFoundError(f"Fond de maquette CIN absent : {BACKGROUND}")
    stream = BytesIO()
    pdf = canvas.Canvas(
        stream,
        pagesize=(PAGE_WIDTH, PAGE_HEIGHT),
        pageCompression=1,
        invariant=1,
    )
    pdf.setTitle("SGAEC - Maquette CIN SPECIMEN, sans valeur officielle")
    pdf.setAuthor("SGAEC - démonstration")
    pdf.setSubject("Prévisualisation graphique de dossier CIN fictif, non officielle")
    pdf.drawImage(str(BACKGROUND), 0, 0, width=PAGE_WIDTH, height=PAGE_HEIGHT)

    data = dict(record)
    data["birth_date_fr"] = format_french(str(record["birth_date"]))
    for key, x, y, width, size in PLACEMENTS:
        _draw_field(pdf, data.get(key), x, y, width, size)

    pdf.showPage()
    pdf.save()
    return stream.getvalue()
