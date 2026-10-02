# Скриншоты для landing

Папка **`en/`** — интерфейс приложения **на английском** (Calendar, Week, Month, Wishes…).

| Файл | Экран |
|------|--------|
| `en/tili-day.png` | Неделя с сеткой часов и делами (hero + блок «День») |
| `en/tili-week.png` | Неделя, цветные блоки |
| `en/tili-month.png` | Месяц |
| `en/lumi-wish.png` | Lumi, карточки по сферам |

На лендинге:

- **`?lang=en`** — только скрины из `en/`.
- **`?lang=ru`** и **`?lang=es`** — тот же набор `en/` (текст страницы переведён, UI на скринах — English).

Файлы в корне `screens/*.png` — копия для совместимости; в HTML используется `./screens/en/…`.

Снять заново (dev на :5173, locale EN):

```bash
node scripts/capture-landing-screens.mjs
```

После замены — `npm run build:pages` и деплой gh-pages.
