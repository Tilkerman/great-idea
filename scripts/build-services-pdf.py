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
        self.set_text_color(0, 102, 68)
        self.multi_cell(0, 10, text)
        self.ln(1)
        self.set_draw_color(0, 102, 68)
        self.set_line_width(0.4)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(3)

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
        line_h = 5

        def paint_header() -> None:
            self.set_font("U", "B", 9)
            self.set_fill_color(0, 102, 68)
            self.set_text_color(255, 255, 255)
            self.set_draw_color(0, 102, 68)
            x = self.l_margin
            y = self.get_y()
            for i, h in enumerate(headers):
                self.rect(x, y, col_widths[i], 8, style="F")
                self.set_xy(x + 1.2, y + 1.5)
                self.cell(col_widths[i] - 2, 5, h)
                x += col_widths[i]
            self.set_y(y + 8)

        paint_header()
        self.set_font("U", size=8.5)
        self.set_text_color(30, 30, 30)
        self.set_draw_color(210, 210, 210)
        fill = False
        for row in rows:
            self.set_font("U", size=8.5)
            wrapped: list[list[str]] = []
            for i, cell in enumerate(row):
                wrapped.append(self.multi_cell(col_widths[i] - 2.4, line_h, cell, dry_run=True, output="LINES"))
            n = max(len(c) for c in wrapped)
            row_h = n * line_h + 2.4
            if self.get_y() + row_h > self.h - 16:
                self.add_page()
                paint_header()
                self.set_font("U", size=8.5)
                self.set_text_color(30, 30, 30)
            self.set_fill_color(245, 248, 246) if fill else self.set_fill_color(255, 255, 255)
            x = self.l_margin
            y = self.get_y()
            for i, cell_lines in enumerate(wrapped):
                w = col_widths[i]
                self.rect(x, y, w, row_h, style="FD")
                for li, txt in enumerate(cell_lines):
                    self.set_xy(x + 1.2, y + 1.2 + li * line_h)
                    self.cell(w - 2.4, line_h, txt)
                x += w
            self.set_y(y + row_h)
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
    pdf.add_page(orientation="P")

    pdf.h1("TiLi — сервисы и доступы")
    pdf.set_font("U", size=12)
    pdf.set_text_color(60, 60, 60)
    pdf.multi_cell(0, 7, "Что за что отвечает и где лежит пароль. Самих паролей здесь нет.")
    pdf.ln(2)
    pdf.set_fill_color(255, 243, 205)
    pdf.set_font("U", size=10)
    pdf.set_text_color(120, 80, 0)
    pdf.multi_cell(
        0,
        6,
        "Публичные коды приложения (PostHog, VAPID) ниже можно скопировать. "
        "Пароли кабинетов, ключ Unisender и секреты Яндекса в этот файл не записаны: "
        "репозиторий на GitHub публичный.",
        fill=True,
    )
    pdf.ln(3)

    pdf.h2("Сколько серверов")
    pdf.p(
        "Своих серверов сейчас ноль. Сайт лежит у GitHub, не на арендованном компьютере. "
        "В кабинете Яндекса две маленькие программы: напоминания и голос. "
        "Аккаунт TiLi (почта, календарь и желания между телефоном и компьютером) ещё не создан. "
        "Его поставим на маленький сервер в Европе, не в Яндекс и не в Джино: "
        "Джино в Москве, из Англии и Вьетнама может открываться плохо. "
        "Сайт с GitHub никуда переносить не нужно."
    )

    pdf.add_page(orientation="L")
    pdf.h2("Общая таблица")
    pdf.table(
        ["Что", "Зачем", "Куда зайти", "Где пароль или код", "Сейчас"],
        [
            [
                "Сайт",
                "Страницы tili.su и приложение",
                "tili.su и tili.su/app/",
                "GitHub: логин Tilkerman. Пароль только у тебя, в проекте его нет.",
                "Работает",
            ],
            [
                "Домен",
                "Имя сайта tili.su",
                "reg.ru → Мои домены",
                "Пароль кабинета reg.ru только у тебя.",
                "Работает",
            ],
            [
                "Напоминания",
                "Баннеры на телефон",
                "console.cloud.yandex.ru",
                "Вход: Яндекс ID. Секреты внутри функции, не в git.",
                "Работает",
            ],
            [
                "Голос",
                "Фраза становится задачей",
                "Тот же кабинет Яндекса",
                "Ключ Groq только в переменных второй функции.",
                "Работает",
            ],
            [
                "Письма",
                "Письмо «подтверди почту»",
                "Кабинет Unisender, домен tili.su",
                "Ключ API в server/.env.local на Mac. В git не класть.",
                "Почта готова",
            ],
            [
                "Аккаунт TiLi",
                "Один вход с компьютера и телефона",
                "Потом api.tili.su",
                "Сервера ещё нет. Заказать Ubuntu в Нидерландах или Германии.",
                "Ещё нет",
            ],
            [
                "Статистика app",
                "Если человек сам включил",
                "eu.posthog.com",
                "Пароль PostHog у тебя. Код phc_ в .env.production.",
                "Работает",
            ],
            [
                "Статистика сайта",
                "Кто зашёл на tili.su",
                "metrika.yandex.ru",
                "Яндекс ID. Номер счётчика 113253680.",
                "Работает",
            ],
            [
                "Счётчик «На Домой»",
                "Сколько нажали установить",
                "api.countapi.xyz",
                "Пароля нет.",
                "Работает",
            ],
            [
                "Донат",
                "Поддержать автора",
                "t.me/wallet",
                "Это адрес кошелька, не пароль.",
                "Работает",
            ],
        ],
        [32, 52, 48, 95, 28],
    )

    pdf.add_page(orientation="P")
    pdf.h1("1. GitHub — сайт и код")
    pdf.p(
        "Это витрина. Люди открывают https://tili.su/ и приложение https://tili.su/app/. "
        "Переносить сайт на свой сервер не нужно."
    )
    pdf.box("Ссылка для телефона", "https://tili.su/app/")
    pdf.box("Запасная ссылка GitHub", "https://tilkerman.github.io/great-idea/")
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

    pdf.add_page(orientation="P")
    pdf.h1("3. Домен и почта")
    pdf.h2("reg.ru — имя tili.su")
    pdf.p("Здесь куплено имя сайта. Сюда же позже добавим одну строку api.tili.su, когда появится европейский сервер. Сейчас ничего не добавлять.")
    pdf.box("Кабинет", "https://www.reg.ru/user/account/")
    pdf.box("Пароль", "Только в твоём кабинете reg.ru. В проекте не записан.")

    pdf.h2("Unisender — письма")
    pdf.p(
        "Домен tili.su для писем уже проверен. Письмо из кабинета доходило (иногда в «Спам»). "
        "Приложение само письма ещё не шлёт: сервера аккаунта нет."
    )
    pdf.box("От кого", "hello@tili.su")
    pdf.box("Ключ API", "Файл server/.env.local на этом Mac, переменная UNISENDER_API_KEY. Не копировать в PDF и не коммитить.")
    pdf.box("Пароль кабинета", "Тот, которым ты входил в Unisender. В проекте его нет.")

    pdf.h2("Аккаунт TiLi — ещё нет")
    pdf.p(
        "Регистрация в приложении сейчас сохраняется только на том телефоне или компьютере, где её нажали. "
        "Общего входа в интернете нет. Когда закажешь Ubuntu в Нидерландах или Германии, "
        "сюда допишем цифровой адрес сервера. Пароль от сервера в чат и в этот PDF не кладём."
    )

    pdf.add_page(orientation="P")
    pdf.h1("4. Яндекс Облако — напоминания")
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

    pdf.h2("Голос — вторая программа в том же Яндексе")
    pdf.p("Отдельного сервера нет. Телефон узнаёт текст сам, Яндекс только разбирает фразу в дату и название.")
    pdf.box("URL функции", "https://functions.yandexcloud.net/d4e0ljde6hqc9emkrbq5")
    pdf.box("Ключ Groq", "Только в переменных этой функции: GROQ_API_KEY. В git и в PDF не писать.")

    pdf.h2("Яндекс Метрика — лендинг")
    pdf.p("Считает визиты на главную tili.su. Приложение /app/ этим счётчиком не пользуется.")
    pdf.box("Кабинет", "https://metrika.yandex.ru")
    pdf.box("Номер счётчика", "113253680")
    pdf.box("Пароль", "Тот же Яндекс ID.")

    pdf.add_page(orientation="P")
    pdf.h1("5. CountAPI — кнопка «На Домой»")
    pdf.p("Просто счётчик +1. Пароля нет.")
    pdf.box("Проверить число", "https://api.countapi.xyz/get/tili-great-idea/install-button")

    pdf.h2("6. Telegram — донат")
    pdf.box("Открыть кошелёк", "https://t.me/wallet")
    pdf.box("Адрес USDT (сеть TON)", WALLET)

    pdf.h2("7. Файл на компе (.env.production)")
    pdf.p("Перед сборкой сайта ключи лежат в файле .env.production в папке проекта:")
    pdf.box(
        "Все строки для копирования",
        "\n".join(f"{k}={v}" for k, v in ENV.items()),
    )

    pdf.add_page(orientation="P")
    pdf.h1("iPhone: что нажать")
    pdf.table(
        ["Шаг", "Действие"],
        [
            ["1", "Safari → открыть https://tili.su/app/"],
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
