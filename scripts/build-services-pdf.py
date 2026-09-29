#!/usr/bin/env python3
"""Сборка PDF «TiLi — сервисы и коды» (простой язык, таблицы)."""
from __future__ import annotations

import os
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
FONT = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
OUT = ROOT / "docs" / "TiLi-сервисы-и-коды.pdf"

# Из .env.production (сборка) — обновляй файл, потом перезапусти скрипт
ENV = {
    "VITE_VAPID_PUBLIC_KEY": "BO3ePfpwilVab9NAN1ZSSJO_4Pw5kHfThPbLb5IfgvXR5FUASS9TkkZEfYa-qWf-hajjmti3qjxwCsdNE_dNIo0",
    "VITE_PUSH_API_URL": "https://functions.yandexcloud.net/d4eps3rpvttu70fnqs21",
    "VITE_POSTHOG_KEY": "phc_sCSx8VTTWGkm9Vbwithw5hu2fWpNSHkS5XagjfdCmxL6",
    "VITE_POSTHOG_HOST": "https://eu.i.posthog.com",
}

WALLET = "UQCIwouZflLPjN5Rq_XAiFkoE0NOx6SrizGKc2-e5-tdwe21"


class Doc(FPDF):
    def __init__(self) -> None:
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=18)
        assert os.path.isfile(FONT), FONT
        self.add_font("U", "", FONT)
        self.add_font("U", "B", FONT)

    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("U", size=8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"TiLi Calendar — страница {self.page_no()}", align="C")

    def h1(self, text: str) -> None:
        self.set_font("U", "B", 20)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 10, text)
        self.ln(2)

    def h2(self, text: str) -> None:
        self.ln(3)
        self.set_font("U", "B", 14)
        self.set_text_color(0, 102, 68)
        self.multi_cell(0, 8, text)
        self.ln(1)

    def p(self, text: str) -> None:
        self.set_font("U", size=11)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(1)

    def box(self, label: str, value: str) -> None:
        self.set_font("U", "B", 10)
        self.set_text_color(80, 80, 80)
        self.cell(0, 6, label)
        self.ln(5)
        self.set_fill_color(245, 247, 250)
        self.set_font("U", size=9)
        self.set_text_color(20, 20, 20)
        self.multi_cell(0, 5, value, fill=True)
        self.ln(2)

    def table(self, headers: list[str], rows: list[list[str]], col_widths: list[float]) -> None:
        self.set_font("U", "B", 9)
        self.set_fill_color(0, 102, 68)
        self.set_text_color(255, 255, 255)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 8, h, border=1, fill=True)
        self.ln()
        self.set_font("U", size=9)
        self.set_text_color(30, 30, 30)
        fill = False
        for row in rows:
            self.set_fill_color(248, 248, 248) if fill else self.set_fill_color(255, 255, 255)
            h_max = 8
            lines: list[list[str]] = []
            for i, cell in enumerate(row):
                w = col_widths[i]
                chunk = self.multi_cell(w, 5, cell, split_only=True)
                lines.append(chunk)
            n = max(len(c) for c in lines)
            y0 = self.get_y()
            x0 = self.get_x()
            for line_idx in range(n):
                x = x0
                for i, cell_lines in enumerate(lines):
                    w = col_widths[i]
                    txt = cell_lines[line_idx] if line_idx < len(cell_lines) else ""
                    self.set_xy(x, y0 + line_idx * 5)
                    self.cell(w, 5, txt, border=1, fill=fill)
                    x += w
            self.set_y(y0 + n * 5)
            fill = not fill
        self.ln(3)


def load_env_from_file() -> None:
    env_path = ROOT / ".env.production"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip()
        if k.startswith("VITE_") and v:
            ENV[k] = v


def build() -> None:
    load_env_from_file()
    pdf = Doc()
    pdf.add_page()

    pdf.h1("TiLi Calendar")
    pdf.set_font("U", size=13)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(0, 7, "Все сайты, коды и пароли — простым языком")
    pdf.ln(2)
    pdf.set_fill_color(255, 243, 205)
    pdf.set_font("U", size=10)
    pdf.set_text_color(120, 80, 0)
    pdf.multi_cell(
        0,
        6,
        "ВНИМАНИЕ: в этом PDF есть рабочие ключи. Не выкладывай в интернет. Храни как записную книжку.",
        fill=True,
    )
    pdf.ln(4)

    pdf.h2("Главное за 10 секунд")
    pdf.p(
        "1) Приложение для людей живёт тут: https://tilkerman.github.io/great-idea/\n"
        "2) Задачи и желания — только в телефоне, не на нашем сервере.\n"
        "3) В интернет уходят только: push (Яндекс), статистика (PostHog, если сам включил), "
        "счётчик кнопки «На Домой»."
    )

    pdf.h2("Таблица: что за сервис")
    pdf.table(
        ["Сервис", "Зачем", "Куда зайти"],
        [
            ["GitHub Pages", "Сайт TiLi в интернете", "github.com/Tilkerman/great-idea"],
            ["PostHog EU", "Графики: кто открыл app", "eu.posthog.com"],
            ["Яндекс Облако", "Push-напоминания", "console.cloud.yandex.ru"],
            ["CountAPI", "Считает «Установить»", "api.countapi.xyz"],
            ["Telegram Wallet", "Донат автору", "t.me/wallet"],
        ],
        [32, 58, 90],
    )

    pdf.add_page()
    pdf.h1("1. GitHub — сайт и код")
    pdf.p("Это «дом» приложения в интернете. Без GitHub пользователи не открыли бы TiLi по ссылке.")
    pdf.box("Ссылка для телефона", "https://tilkerman.github.io/great-idea/")
    pdf.box("Репозиторий (код)", "https://github.com/Tilkerman/great-idea")
    pdf.box("Логин GitHub", "Tilkerman")
    pdf.box(
        "Пароль GitHub",
        "Тот пароль (и код с телефона 2FA), который ты вводишь на github.com. "
        "В проекте он НЕ записан — только ты его знаешь.",
    )

    pdf.h2("2. PostHog — статистика")
    pdf.p(
        "Работает только если в приложении: Настройки → Данные → включить «Анонимная статистика». "
        "Тексты задач не отправляются."
    )
    pdf.box("Кабинет", "https://eu.posthog.com")
    pdf.box("Номер проекта (Project ID)", "287824")
    pdf.box("Project token (код для приложения)", ENV["VITE_POSTHOG_KEY"])
    pdf.box("Адрес сервера событий", ENV["VITE_POSTHOG_HOST"])
    pdf.box(
        "Пароль PostHog",
        "Email и пароль, которыми регистрировался на eu.posthog.com. В коде не хранится.",
    )
    pdf.box(
        "Secret API keys в PostHog",
        "НЕ НУЖНЫ для TiLi. Не создавай и не вставляй в приложение.",
    )

    pdf.add_page()
    pdf.h1("3. Яндекс Облако — push")
    pdf.p(
        "Когда человек включает уведомления, телефон подписывается. Яндекс хранит подписку "
        "и шлёт баннер в нужное время."
    )
    pdf.box("Кабинет", "https://console.cloud.yandex.ru")
    pdf.box("URL функции (в приложении)", ENV["VITE_PUSH_API_URL"])
    pdf.box("ID функции в URL", "d4eps3rpvttu70fnqs21")
    pdf.box("Бакет (файл подписок)", "tili-push-box / devices.json")
    pdf.box("VAPID PUBLIC (в сборке сайта)", ENV["VITE_VAPID_PUBLIC_KEY"])

    pdf.h2("Секреты только в Яндекс (не в git)")
    pdf.table(
        ["Имя переменной", "Что это"],
        [
            ["VAPID_PRIVATE", "Секрет push — скопируй из настроек функции"],
            ["VAPID_PUBLIC", "Тот же public key, что выше"],
            ["VAPID_SUBJECT", "Обычно mailto:johnbassil@yandex.ru"],
            ["S3_KEY", "Ключ доступа к бакету — в консоли Яндекс"],
            ["S3_SECRET", "Секрет к бакету — в консоли Яндекс"],
            ["S3_BUCKET", "tili-push-box (если не меняли)"],
        ],
        [45, 135],
    )
    pdf.p(
        "Где смотреть: Яндекс Cloud → Serverless → Functions → твоя функция push → "
        "Переменные окружения. Пароль — вход в Яндекс ID."
    )

    pdf.add_page()
    pdf.h1("4. CountAPI — кнопка «На Домой»")
    pdf.p("Просто счётчик +1. Пароля нет.")
    pdf.box("Проверить число", "https://api.countapi.xyz/get/tili-great-idea/install-button")

    pdf.h2("5. Telegram — донат")
    pdf.box("Открыть кошелёк", "https://t.me/wallet")
    pdf.box("Адрес USDT (сеть TON)", WALLET)

    pdf.h2("6. Файл на компе (.env.production)")
    pdf.p("Перед сборкой сайта ключи лежат в файле .env.production в папке проекта:")
    pdf.box(
        "Все строки для копирования",
        "\n".join(f"{k}={v}" for k, v in ENV.items()),
    )

    pdf.add_page()
    pdf.h1("iPhone: что нажать")
    pdf.table(
        ["Шаг", "Действие"],
        [
            ["1", "Safari → открыть https://tilkerman.github.io/great-idea/"],
            ["2", "Кнопка «Поделиться» (квадрат со стрелкой)"],
            ["3", "«На экран Домой» → Добавить"],
            ["4", "Открыть TiLi с иконки на домашнем экране (не из Safari)"],
            ["5", "Внизу шестерёнка → Настройки"],
            ["6", "Пункт «Данные» → включить «Анонимная статистика»"],
            ["7", "«Уведомления» → включить (если нужны push) + разрешить в iOS"],
        ],
        [15, 165],
    )
    pdf.p("В PostHog: слева Activity — должно появиться событие app_open.")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    print(OUT)


if __name__ == "__main__":
    build()
