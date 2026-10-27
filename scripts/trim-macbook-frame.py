#!/usr/bin/env python3
"""Убирает белый фон вокруг MacBook в macbook-frame-bg.png."""
from __future__ import annotations

import struct
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("PIL required")

TOLERANCE = 242
ROOT = Path("/Users/macbookair/Работа")
WS = next(
    p / "public/landing/macbook-frame-bg.png"
    for p in ROOT.iterdir()
    if p.is_dir() and (p / "public/landing/macbook-frame-bg.png").is_file()
    and "кal" in p.name
)
PATHS = [
    WS,
    Path("/Users/macbookair/Работа/список/календарь/public/landing/macbook-frame-bg.png"),
]


def trim(path: Path) -> None:
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= TOLERANCE and g >= TOLERANCE and b >= TOLERANCE:
                px[x, y] = (r, g, b, 0)
    bbox = im.getbbox()
    if not bbox:
        raise SystemExit(f"empty after trim: {path}")
    out = im.crop(bbox)
    out.save(path, optimize=True)
    print(path, out.size[0], out.size[1])


def main() -> None:
    for p in PATHS:
        if p.is_file():
            trim(p)


if __name__ == "__main__":
    main()
