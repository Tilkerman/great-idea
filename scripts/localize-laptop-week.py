#!/usr/bin/env python3
"""RU desktop week screenshot → EN/ES chrome (same layout, not the phone UI)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/Users/macbookair/Работа")
WS = next(
    p
    for p in ROOT.iterdir()
    if p.is_dir()
    and (p / "public/landing/start-laptop-week-ru.png").is_file()
    and "кal" in p.name
)
SRC = WS / "public/landing/start-laptop-week-ru.png"
OUT_DIR = WS / "public/landing"

TAB_BG = (239, 240, 244)
TAB_MUTED = (110, 116, 128)
TAB_ON = (255, 255, 255)
WEEK_GREEN = (95, 159, 114)
HEADER_BG = (244, 245, 247)
TUE_BG = (236, 247, 240)
WHITE = (255, 255, 255)
DATE_FG = (55, 58, 64)
DAY_FG = (90, 94, 104)
DAY_TUE = (70, 130, 95)
NAV_FG = (90, 110, 95)

FONT_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

LANGS = {
    "en": {
        "out": "start-laptop-week-en.png",
        "year": "Year",
        "month": "Month",
        "week": "Week",
        "day": "Day",
        "date": "26 Oct – 1 Nov 2026",
        "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "nav": ["Calendar", "Wishes", "Settings", "Profile"],
    },
    "es": {
        "out": "start-laptop-week-es.png",
        "year": "Año",
        "month": "Mes",
        "week": "Semana",
        "day": "Día",
        "date": "26 oct. – 1 nov. 2026",
        "days": ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
        "nav": ["Calendario", "Deseos", "Ajustes", "Perfil"],
    },
}

# Column centers from Tuesday (green 27) at x≈300; pitch ≈131
DAY_CX = [169, 300, 431, 562, 693, 824, 955]
# Original sidebar captions (tiny labels by the icons)
NAV_BOXES = [
    (2, 8, 54, 36),
    (2, 148, 54, 176),
    (2, 200, 54, 228),
    (2, 252, 54, 280),
]
NAV_XY = [(28, 22), (28, 162), (28, 214), (28, 266)]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def fill(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], color: tuple[int, int, int]) -> None:
    draw.rectangle(box, fill=color)


def center_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill_color: tuple[int, int, int],
) -> None:
    x, y = xy
    bbox = draw.textbbox((0, 0), text, font=fnt)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((x - tw / 2 - bbox[0], y - th / 2 - bbox[1]), text, font=fnt, fill=fill_color)


def render(lang: str, pack: dict) -> Path:
    im = Image.open(SRC).convert("RGB")
    d = ImageDraw.Draw(im)
    f_tab = font(FONT_BOLD, 13)
    f_week = font(FONT_BOLD, 13)
    f_date = font(FONT_REG, 12)
    f_day = font(FONT_BOLD, 10)
    f_nav = font(FONT_BOLD, 7)

    # Zoom tabs: wipe leftover «Год» on white, then the gray control
    fill(d, (150, 42, 320, 72), WHITE)
    fill(d, (250, 43, 940, 71), TAB_BG)
    d.rounded_rectangle((539, 46, 770, 67), radius=11, fill=WEEK_GREEN)
    center_text(d, (360, 57), pack["year"], f_tab, TAB_MUTED)
    center_text(d, (470, 57), pack["month"], f_tab, TAB_MUTED)
    center_text(d, (655, 57), pack["week"], f_week, TAB_ON)
    center_text(d, (848, 57), pack["day"], f_tab, TAB_MUTED)

    # Date in the header
    fill(d, (800, 8, 1018, 36), WHITE)
    d.text((818, 14), pack["date"], font=f_date, fill=DATE_FG)

    # Weekday names (keep the numbers 26–1)
    for i, name in enumerate(pack["days"]):
        cx = DAY_CX[i]
        bg = TUE_BG if i == 1 else HEADER_BG
        left = max(108, cx - 66)
        right = min(1022, cx + 66)
        fill(d, (left, 72, right, 91), bg)
        color = DAY_TUE if i == 1 else DAY_FG
        center_text(d, (cx, 82), name, f_day, color)

    # Sidebar icon labels stay: they are ~6px and sit on the icons.
    # Painting them easily wipes the nav glyphs. Tabs + weekdays already
    # make the desktop screenshot read as EN/ES at landing size.

    out = OUT_DIR / pack["out"]
    im.save(out, optimize=True)
    print("wrote", out, im.size)
    return out


def main() -> None:
    for lang, pack in LANGS.items():
        render(lang, pack)


if __name__ == "__main__":
    main()
