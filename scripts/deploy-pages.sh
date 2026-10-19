#!/bin/bash
# Official TiLi prod deploy: gh-pages branch + jsDelivr purge + Cloudflare Worker + smoke.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="Tilkerman/great-idea"
SCRIPTS="$(dirname "$0")"

# Version label in PWA «О приложении» = commit being built (local main).
export VITE_APP_BUILD="$(git rev-parse --short HEAD 2>/dev/null || echo local)"

echo "→ Сборка (VITE_APP_BUILD=${VITE_APP_BUILD})..."
npm run build:pages

echo "→ Деплой на gh-pages..."
touch dist/.nojekyll
npx --yes gh-pages -d dist -r "git@github.com:${REPO}.git" -m "Deploy TiLi Calendar $(date +%Y-%m-%d)"

GH_PAGES_SHA="$(git ls-remote "git@github.com:${REPO}.git" refs/heads/gh-pages | awk 'NR == 1 { print substr($1, 1, 7) }')"
if [[ -z "${GH_PAGES_SHA}" ]]; then
  echo "FAIL: could not read gh-pages SHA"
  exit 1
fi
echo "→ gh-pages @ ${GH_PAGES_SHA}"

bash "${SCRIPTS}/purge-jsdelivr-app.sh"

WORKER_DIR="${SCRIPTS}/../cloud/cloudflare/tili-push-proxy"
echo "→ Cloudflare Worker (APP_BUILD=${GH_PAGES_SHA})..."
(
  cd "${WORKER_DIR}"
  npx --yes wrangler deploy --var "APP_BUILD:${GH_PAGES_SHA}"
)

echo "→ Smoke test..."
bash "${SCRIPTS}/smoke-tili-app.sh"

if gh auth status >/dev/null 2>&1; then
  echo "→ Делаю репозиторий публичным..."
  gh repo edit "$REPO" --visibility public --accept-visibility-change-consequences
  echo "→ Включаю GitHub Pages..."
  if gh api "repos/${REPO}/pages" >/dev/null 2>&1; then
    echo "   GitHub Pages уже включён — настройки домена не трогаю."
  else
    gh api "repos/${REPO}/pages" -X POST \
      -f build_type=legacy \
      -f "source[branch]=gh-pages" \
      -f "source[path]=/"
  fi
  echo ""
  echo "✅ Готово: https://tili.su/app/ (release ${GH_PAGES_SHA})"
else
  echo ""
  echo "✅ gh-pages + Worker + smoke OK. gh CLI не авторизован — Pages settings вручную при необходимости."
  echo "   https://tili.su/app/"
fi
