# Landing TiLi / Lumi

**URL (prod):** https://tili.su/

## Файлы

| Файл | Назначение |
|------|------------|
| `public/landing.html` | Разметка по ТЗ |
| `public/landing.css` | Стиль #F7F8FA, акцент #5F9F72 |
| `public/landing-i18n.js` | RU / EN / ES, UTM, `?lang=` → приложение |
| `public/landing-analytics.js` | PostHog: landing_open, hero_cta_click, section views, pwa_open |
| `public/screens/*.png` | **Только реальные** скрины (см. README в папке) |

## Скриншоты

Не рисуем UI в CSS. Пока PNG нет — показывается placeholder `[ REAL SCREENSHOT … ]`.

Снять с локального dev:

```bash
node scripts/capture-landing-screens.mjs
```

## Аналитика

При `npm run build:pages` скрипт `scripts/inject-landing-env.js` подставляет `VITE_POSTHOG_KEY` из `.env.production` в `dist/landing-analytics.js`.

Яндекс Метрика (счётчик `113253680`) вставлена в `public/landing.html`.

События landing не содержат текстов задач/желаний.

## Язык приложения

Кнопки «Попробовать» ведут на `./?lang=ru|en|es` + сохранённые UTM.

## Деплой

rsync → `npm run build:pages` → `npx gh-pages -d dist` (из nested copy без `\`).
