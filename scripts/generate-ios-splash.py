#!/usr/bin/env python3
"""White iPhone launch images with the TiLi header logo centered."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / 'public' / 'logo-tili-header.png'
OUT = ROOT / 'public' / 'ios-splash'
BG = (255, 255, 255)

SIZES = [
    (640, 1136),
    (750, 1334),
    (828, 1792),
    (1125, 2436),
    (1170, 2532),
    (1179, 2556),
    (1206, 2622),
    (1284, 2778),
    (1290, 2796),
    (1320, 2868),
]


def paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def read_png(path: Path) -> tuple[int, int, list[list[tuple[int, int, int, int]]]]:
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'not a png: {path}')
    pos = 8
    width = height = bit_depth = color_type = 0
    idat = bytearray()
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b'IHDR':
            width, height, bit_depth, color_type = struct.unpack('>IIBB', chunk[:10])
        elif kind == b'IDAT':
            idat.extend(chunk)
        elif kind == b'IEND':
            break
    if bit_depth != 8:
        raise ValueError(f'unsupported bit depth {bit_depth}')
    raw = zlib.decompress(bytes(idat))
    if color_type == 6:
        bpp = 4
    elif color_type == 2:
        bpp = 3
    else:
        raise ValueError(f'unsupported color type {color_type}')
    stride = width * bpp
    rows: list[bytes] = []
    i = 0
    prev = bytes(stride)
    for _ in range(height):
        filter_type = raw[i]
        i += 1
        scan = bytearray(raw[i:i + stride])
        i += stride
        if filter_type == 1:
            for x in range(stride):
                left = scan[x - bpp] if x >= bpp else 0
                scan[x] = (scan[x] + left) & 255
        elif filter_type == 2:
            for x in range(stride):
                scan[x] = (scan[x] + prev[x]) & 255
        elif filter_type == 3:
            for x in range(stride):
                left = scan[x - bpp] if x >= bpp else 0
                up = prev[x]
                scan[x] = (scan[x] + ((left + up) // 2)) & 255
        elif filter_type == 4:
            for x in range(stride):
                left = scan[x - bpp] if x >= bpp else 0
                up = prev[x]
                up_left = prev[x - bpp] if x >= bpp else 0
                scan[x] = (scan[x] + paeth(left, up, up_left)) & 255
        elif filter_type != 0:
            raise ValueError(f'bad png filter {filter_type}')
        rows.append(bytes(scan))
        prev = bytes(scan)
    pixels: list[list[tuple[int, int, int, int]]] = []
    for scan in rows:
        row = []
        for x in range(width):
            o = x * bpp
            if bpp == 4:
                row.append((scan[o], scan[o + 1], scan[o + 2], scan[o + 3]))
            else:
                row.append((scan[o], scan[o + 1], scan[o + 2], 255))
        pixels.append(row)
    return width, height, pixels


def write_png(path: Path, width: int, height: int, rgb: bytearray) -> None:
    def chunk(tag: bytes, payload: bytes) -> bytes:
        return struct.pack('>I', len(payload)) + tag + payload + struct.pack('>I', zlib.crc32(tag + payload) & 0xFFFFFFFF)

    raw = bytearray()
    stride = width * 3
    for y in range(height):
        raw.append(0)
        start = y * stride
        raw.extend(rgb[start:start + stride])
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(raw), 4)) + chunk(b'IEND', b'')
    path.write_bytes(png)


def blit(canvas: bytearray, cw: int, ch: int, logo: list[list[tuple[int, int, int, int]]], lw: int, lh: int) -> None:
    max_w = int(cw * 0.42)
    scale = min(max_w / lw, 1.0)
    dw = max(1, int(lw * scale))
    dh = max(1, int(lh * scale))
    x0 = (cw - dw) // 2
    y0 = (ch - dh) // 2
    for y in range(dh):
        sy = min(lh - 1, int(y / scale))
        src = logo[sy]
        for x in range(dw):
            sx = min(lw - 1, int(x / scale))
            r, g, b, a = src[sx]
            if a == 0:
                continue
            dx = x0 + x
            dy = y0 + y
            if dx < 0 or dy < 0 or dx >= cw or dy >= ch:
                continue
            i = (dy * cw + dx) * 3
            if a == 255:
                canvas[i] = r
                canvas[i + 1] = g
                canvas[i + 2] = b
            else:
                t = a / 255
                canvas[i] = int(canvas[i] * (1 - t) + r * t)
                canvas[i + 1] = int(canvas[i + 1] * (1 - t) + g * t)
                canvas[i + 2] = int(canvas[i + 2] * (1 - t) + b * t)


def main() -> None:
    lw, lh, logo = read_png(LOGO)
    OUT.mkdir(parents=True, exist_ok=True)
    for width, height in SIZES:
        canvas = bytearray([BG[0], BG[1], BG[2]]) * (width * height)
        blit(canvas, width, height, logo, lw, lh)
        dest = OUT / f'{width}x{height}.png'
        write_png(dest, width, height, canvas)
        print(dest.name, dest.stat().st_size)


if __name__ == '__main__':
    main()
