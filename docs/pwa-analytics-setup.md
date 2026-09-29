# PWA: product analytics (PostHog)

## Что считается

Только если пользователь включил **Настройки → Данные → Анонимная статистика**.

| Событие | Когда |
|---------|--------|
| `app_open` | Раз за сессию, при включённой статистике |
| `onboarding_complete` | Завершён онбординг |
| `first_task_created` | Первое созданное пользователем дело |
| `task_created` / `task_completed` | Сохранение / завершение дела |
| `push_enabled` | Разрешены уведомления TiLi + система |
| `wish_created` / `wish_step_created` | Lumi |
| `signup_local` | Локальная регистрация (mock) |
| `support_author_click` | Копирование / переход в Wallet |
| `install_hint_click` | Кнопка установки на экран Домой |

UTM из URL (`utm_source`, `utm_campaign`, `utm_content`) сохраняются локально и приклеиваются к событиям.

**Не отправляется:** названия задач, описания, тексты желаний, email.

## Подключение PostHog

1. Завести проект на [PostHog EU](https://eu.posthog.com) (рекомендуется для UK/EU).
2. Скопировать **Project API Key**.
3. В `.env.production` (сборка из nested copy):

   ```
   VITE_POSTHOG_KEY=phc_...
   VITE_POSTHOG_HOST=https://eu.i.posthog.com
   ```

4. `npm run build` → deploy `gh-pages`.
5. В PostHog: Live events — включить статистику в app на тестовом телефоне, проверить `app_open`.

## Отчёты

- **Retention** — по событию `app_open`, интервалы 1 / 7 / 30 дней.
- **Воронка** — `onboarding_complete` → `first_task_created` → `push_enabled`.
- **UTM** — breakdown по свойствам `utm_source` / `utm_campaign`.

Лендинг и отдельный счётчик трафика — следующий этап (см. `pwa-launch-readiness.md`).
