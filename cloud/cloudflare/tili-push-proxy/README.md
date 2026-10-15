# Прокси push: `tili.su/v1/push` → `api.tili.su`

GitHub Pages не умеет POST на `/v1/push` (ответ 405). Worker на Cloudflare пересылает запросы на VPS.

## Проверка до деплоя

```bash
curl -sS https://api.tili.su/v1/push
# {"ok":true,"service":"tili-push",...}
```

## Деплой (один раз)

1. Домен **tili.su** в Cloudflare (DNS оранжевое облако).
2. В терминале:

```bash
cd cloud/cloudflare/tili-push-proxy
npx wrangler login
npx wrangler deploy
```

3. Проверка:

```bash
curl -sS https://tili.su/v1/push
```

Должен быть тот же JSON, что у `api.tili.su/v1/push`, не HTML GitHub «Page not found».

Маршрут задан в `wrangler.toml`: `tili.su/v1/push*`.
