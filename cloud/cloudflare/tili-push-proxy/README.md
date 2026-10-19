# Cloudflare Worker: `tili.su`

| Route | Upstream |
|-------|----------|
| `/v1/push*` | `https://api.tili.su` |
| `/app`, `/app/*` | jsDelivr `Tilkerman/great-idea@APP_BUILD` (fallback `@gh-pages`) |

GitHub Pages serves **tili.su/** (landing). **/app** goes through this Worker because the custom-domain CDN can lag after deploy.

## Deploy (with the PWA)

From the nested build copy:

```bash
bash scripts/deploy-pages.sh
```

That script: `gh-pages` → purge jsDelivr → `wrangler deploy --var APP_BUILD:<gh-pages-sha>` → `smoke-tili-app.sh`.

Manual Worker-only:

```bash
cd cloud/cloudflare/tili-push-proxy
npx wrangler login
npx wrangler deploy --var APP_BUILD:abc1234
```

## Checks

```bash
bash scripts/smoke-tili-app.sh
curl -sS https://tili.su/v1/push
```
