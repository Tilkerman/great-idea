# Голос + ИИ (TiLi)

## Поведение

- **Только TiLi:** на вкладке «Желания» (Lumi) «+» — новое желание, без голоса.
- **Короткое нажатие «+»** — новая задача.
- **Удержание «+» ~0,4 с** — микрофон, «Говорите…», отпустить → разбор → **карточка дела** (сохранение вручную).

## Согласие

**Настройки → Данные → «Голосовые заметки с ИИ»** или диалог при первом удержании.

## Два уровня разбора

| Что | Нужен Яндекс? | Что понимает |
|-----|----------------|--------------|
| **Микрофон (Safari)** | Нет | Превращает речь в текст |
| **Разбор на телефоне** | Нет | Простые фразы: «четверг / чт», «на 11», «позвонить маме» |
| **Разбор через Groq (LLM)** | Да, прокси в Yandex Cloud | Сложные фразы, «послезавтра вечером», «в пятницу после обеда» |

Яндекс **не** распознаёт голос — только **хранит маленькую функцию**, которая по уже готовому тексту спрашивает **Groq** и возвращает JSON (дата, час, заголовок, категория). Ключ Groq **не** кладётся в приложение и git.

---

## Пошагово: Groq + Yandex Cloud + сайт

### Шаг 0. Уже есть push в Yandex?

Если push уже работает (`VITE_PUSH_API_URL` в `.env.production`), **тот же** каталог в [console.cloud.yandex.ru](https://console.cloud.yandex.ru) — новый бакет не нужен. Нужна **вторая** Cloud Function.

### Шаг 1. Ключ Groq (бесплатный tier)

1. Зайди на [console.groq.com](https://console.groq.com), зарегистрируйся.
2. **API Keys → Create API Key**.
3. Скопируй ключ (показывается один раз). Это `GROQ_API_KEY` — только для сервера.

### Шаг 2. Архив с кодом функции

На Mac в терминале:

```bash
cd "/Users/macbookair/Работа/список/календарь/cloud/yandex/tili-voice-parse"
zip -r ~/Desktop/tili-voice-parse.zip index.js package.json
```

(Если правишь код в workspace с `\` в пути — сначала rsync в `список/календарь`, как для сборки.)

### Шаг 3. Cloud Function в Yandex Cloud

1. [console.cloud.yandex.ru](https://console.cloud.yandex.ru) → **Serverless → Cloud Functions**.
2. **Создать функцию** (имя, например `tili-voice-parse`).
3. **Редактор / Создать версию:**
   - Среда: **Node.js 18** или **20**.
   - Способ: **ZIP-архив** → загрузить `tili-voice-parse.zip`.
   - Точка входа: **`index.handler`**.
   - Таймаут: **30 с** (достаточно).
4. **Переменные окружения** (секреты, не в git):

   | Переменная | Значение |
   |------------|----------|
   | `GROQ_API_KEY` | ключ из шага 1 |
   | `GROQ_MODEL` | `llama-3.1-8b-instant` (можно не задавать — такое же по умолчанию) |

5. **Публичный доступ:** разрешить **неавторизованный** вызов HTTP (как у push-функции).
6. Сохранить версию. Скопировать **URL вызова**, вид  
   `https://functions.yandexcloud.net/XXXXXXXX`

CORS в коде уже настроен на origin `https://tilkerman.github.io`.

### Шаг 4. Проверка функции (опционально)

```bash
curl -s -X POST "https://functions.yandexcloud.net/XXXXXXXX" \
  -H "Content-Type: application/json" \
  -d '{"text":"в четверг в 11 позвонить маме","locale":"ru","timezone":"Europe/Moscow","todayISO":"2026-09-29","dayStart":7,"dayEnd":21}'
```

В ответе должно быть `"ok":true` и `"draft"` с `title`, `date`, `hour`, `category`.

### Шаг 5. Сборка PWA с URL

В `.env.production` (локально, **не коммитить ключ Groq** — только URL):

```env
VITE_VOICE_PARSE_URL=https://functions.yandexcloud.net/XXXXXXXX
```

Сборка и деплой — из копии **без `\` в пути** (см. правило project-location): rsync → `npm run build` → `npx gh-pages -d dist`.

### Шаг 6. На iPhone

1. Открыть **https://tilkerman.github.io/great-idea/** с «Домой» (PWA, HTTPS).
2. **Настройки → Данные** → включить **«Голосовые заметки с ИИ»**.
3. Удержать зелёный **+**, говорить, отпустить → проверить **дату и час** в форме → **Создать**.

Разрешение микрофона — при первой диктовке.

---

## Без Yandex / Groq

Диктовка и **простой** разбор (день недели, час, «позвонить …») работают **без** `VITE_VOICE_PARSE_URL`. Для сложных формулировок нужен шаг 3–5.

## Микрофон

На iPhone — **PWA с «Домой»** и **HTTPS**. LAN по HTTP микрофон/уведомления могут не работать.

## Код

- Клиент: `src/utils/voiceSpeech.ts`, `voiceLocalParse.ts`, `voiceTaskParse.ts`, `BottomNav.tsx`
- Прокси: `cloud/yandex/tili-voice-parse/index.js`
