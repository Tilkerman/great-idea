#!/usr/bin/env python3
"""Копирует лендинг из workspace (папка с \\) в nested-копию для Vite dev:lan."""
from __future__ import annotations

import os
import shutil

ROOT = "/Users/macbookair/Работа"
NESTED = "/Users/macbookair/Работа/список/календарь"
MARKER = "meet__layout"


def find_workspace() -> str:
    for name in os.listdir(ROOT):
        path = os.path.join(ROOT, name)
        html = os.path.join(path, "public", "landing.html")
        if not os.path.isfile(html):
            continue
        with open(html, encoding="utf-8") as f:
            if MARKER in f.read():
                return path
    raise SystemExit(f"workspace with {MARKER} not found under {ROOT}")


def main() -> None:
    ws = find_workspace()
    files = [
        "public/landing.html",
        "public/landing.css",
        "public/landing-i18n.js",
        "public/landing-analytics.js",
    ]
    for rel in files:
        src = os.path.join(ws, rel)
        dst = os.path.join(NESTED, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)
        print("copied", rel)
    src_dir = os.path.join(ws, "public", "landing")
    dst_dir = os.path.join(NESTED, "public", "landing")
    shutil.copytree(src_dir, dst_dir, dirs_exist_ok=True)
    print("copied public/landing/")
    print("from", ws)
    print("to", NESTED)


if __name__ == "__main__":
    main()
