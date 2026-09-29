# TiLi Calendar — сторонние сервисы

**Нормальная версия (PDF, таблицы, коды):** [TiLi-сервисы-и-коды.pdf](./TiLi-сервисы-и-коды.pdf) — открыть в Finder / Preview.

Краткий реестр: что подключено, за что отвечает, где лежат ключи. **Секреты (private keys, пароли от кабинетов) в этот файл не пишем** — только ссылки и имена переменных.

См. также: [pwa-analytics-setup.md](./pwa-analytics-setup.md), [pwa-launch-readiness.md](./pwa-launch-readiness.md), [privacy.html](../public/privacy.html).

---

## Сводка

| Сервис | Зачем | Данные пользователя |
|--------|--------|---------------------|
| GitHub Pages | Хостинг PWA | Статика приложения |
| PostHog EU | Анонимная статистика (opt-in) | События без текста задач |
| Yandex Cloud | Web Push | Подписки + расписание напоминаний |
| CountAPI | Счётчик кликов «Установить на Домой» | Только +1 к счётчику |
| Telegram Wallet | Донат (ссылка + адрес TON) | Ничего не уходит в TiLi |
| IndexedDB (браузер) | Задачи, Lumi, настройки | **Не** сторонний сервер |

Регистрация в приложении — **локальный mock**, отдельного auth-сервера нет.

---

## 1. GitHub + GitHub Pages

**Роль:** код в git, прод-сайт для пользователей.

| | |
|---|---|
| Прод URL | https://tilkerman.github.io/great-idea/ |
| Репозиторий | https://github.com/Tilkerman/great-idea |
| Ветки | `main` — исходники; `gh-pages` — собранный `dist` |
| Сборка | Из папки без `\` в пути (см. `.cursor/rules/project-location.mdc`): `npm run build`, `npx gh-pages -d dist` |
| Доступ | Аккаунт GitHub владельца репо (логин/2FA только у владельца) |

**Ключи в проекте:** нет (деploy через git/gh-pages с машины разработчика).

---

## 2. PostHog (EU)

**Роль:** product analytics после явного включения **Настройки → Данные → «Анонимная статистика»**.

| | |
|---|---|
| Кабинет | https://eu.posthog.com |
| Project ID | `287824` (Default project) |
| API ingest | `https://eu.i.posthog.com` (`/capture/`) |
| Ключ для PWA | **Project token** (`phc_…`, write-only, General → Project token) |
| **Не использовать** | Project **secret** API keys, HTML snippet / JS SDK wizard |

**Переменные сборки** (файл `.env.production`, не светить в публичных чатах):

```env
VITE_POSTHOG_KEY=phc_…
VITE_POSTHOG_HOST=https://eu.i.posthog.com
```

**Код:** `src/utils/productAnalytics.ts`.

**Пароль:** только вход в PostHog (email владельца аккаунта).

---

## 3. Yandex Cloud (push)

**Роль:** подписка устройства на push и отправка баннеров по расписанию. Тексты задач на сервер для маркетинга не собираются; в storage — технические данные подписок и слотов напоминаний.

| | |
|---|---|
| Кабинет | https://console.cloud.yandex.ru |
| HTTP API (в PWA) | `VITE_PUSH_API_URL` → Cloud Function, id в URL: `d4eps3rpvttu70fnqs21` |
| Object Storage | Бакет по умолчанию `tili-push-box`, файл `devices.json` |
| Endpoint S3 API | `https://storage.yandexcloud.net`, регион `ru-central1` |
| CORS функции | Origin `https://tilkerman.github.io` |
| Код | `cloud/yandex/tili-push/index.js` |

**Маршруты функции:** `subscribe`, `reminders`, `tick`, `health` (см. код).

**Переменные в PWA** (`.env.production`, публичная часть VAPID):

```env
VITE_VAPID_PUBLIC_KEY=…
VITE_PUSH_API_URL=https://functions.yandexcloud.net/d4eps3rpvttu70fnqs21
```

**Переменные только в Cloud Function** (секреты, **не в git**):

| Переменная | Назначение |
|------------|------------|
| `VAPID_PUBLIC` | Публичный VAPID (пара с клиентом) |
| `VAPID_PRIVATE` | Секрет подписи push |
| `VAPID_SUBJECT` | Контакт, по умолчанию `mailto:johnbassil@yandex.ru` |
| `S3_KEY` / `S3_SECRET` | Доступ к бакету |
| `S3_BUCKET` | Имя бакета (если не `tili-push-box`) |

**Код клиента:** `src/utils/webPush.ts`, service worker `src/sw.ts`.

**Пароли:** Яндекс ID + IAM/static keys в консоли Yandex Cloud.

---

## 3a. Yandex Cloud (голос → Groq)

**Роль:** разбор текста диктовки в дату, час, заголовок, категорию. Голос в текст — Safari на телефоне; Groq-ключ только в функции.

| | |
|---|---|
| HTTP API (в PWA) | `VITE_VOICE_PARSE_URL` → `https://functions.yandexcloud.net/d4e0ljde6hqc9emkrbq5` |
| Код | `cloud/yandex/tili-voice-parse/index.js` |
| CORS | Origin `https://tilkerman.github.io` |

**Переменные только в Cloud Function:** `GROQ_API_KEY`, `GROQ_MODEL` (`llama-3.1-8b-instant`).

**Клиент:** `src/utils/voiceTaskParse.ts`, удержание «+» — `BottomNav.tsx`.

---

## 4. CountAPI (опционально)

**Роль:** счётчик нажатий на подсказку установки PWA.

| | |
|---|---|
| API | https://api.countapi.xyz |
| Namespace / key | `tili-great-idea` / `install-button` |
| Проверка | GET https://api.countapi.xyz/get/tili-great-idea/install-button |
| Код | `src/utils/pwaInstall.ts` |
| Свой endpoint | `VITE_INSTALL_TRACKING_URL` в `.env.production` (если задан — вместо CountAPI) |

Пароля нет.

---

## 5. Telegram Wallet (донат)

**Роль:** UI «поддержать автора» — копирование адреса и открытие Telegram.

| | |
|---|---|
| Ссылка | https://t.me/wallet |
| Адрес USDT (TON) | `src/constants/support.ts` → `SUPPORT_TG_WALLET_ADDRESS` |
| UI | `src/components/settings/SettingsSupport.tsx` |

Это публичный адрес кошелька, не API TiLi.

---

## 6. Не часть PWA для пользователей

- **oS3 / acts.os3.pro** — продуктовая память и чеклист для разработки (MCP), не runtime приложения.
- **Dexie / IndexedDB** — локальное хранилище в браузере.

---

## Где искать «все коды»

| Что | Где |
|-----|-----|
| PostHog token, VAPID public, push URL | `.env.production` на машине сборки (workspace + nested copy для `npm run build`) |
| VAPID private, S3 keys | Yandex Cloud → Function → Environment variables |
| PostHog login | eu.posthog.com |
| Yandex billing / keys | console.cloud.yandex.ru |
| GitHub deploy | локально: rsync → build → `gh-pages` |

Шаблон без значений: [.env.example](../.env.example).

**Важно:** публичный репозиторий. Не коммитить `VAPID_PRIVATE`, `S3_SECRET` и по возможности не коммитить полный `.env.production` с production-токенами; client token PostHog (`phc_`) допустим в клиенте, но при утечке — rotate в PostHog General.

---

## iPhone: prod + статистика + push

1. Safari → https://tilkerman.github.io/great-idea/
2. Поделиться → **На экран «Домой»**
3. Открыть **иконку TiLi** с домашнего экрана
4. **Настройки** (нижняя панель) → **Данные** → **Анонимная статистика** (вкл.)
5. **Настройки → Уведомления** — вкл. в TiLi и разрешение iOS (для push)

PostHog: **Activity** → событие `app_open` после шага 4.

После каждого deploy подождать 1–2 минуты или переоткрыть приложение с «Домой», если видна старая версия.
