#!/bin/bash
# GitHub Pages needs a public repo + gh-pages branch enabled in Settings.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="Tilkerman/great-idea"
BASE="/app/"
# В nested-копии .git отстаёт; берём версию из актуальной ветки main на GitHub.
if REMOTE_MAIN="$(git ls-remote "git@github.com:${REPO}.git" refs/heads/main | awk 'NR == 1 { print substr($1, 1, 7) }')" \
  && [[ -n "$REMOTE_MAIN" ]]; then
  export VITE_APP_BUILD="$REMOTE_MAIN"
fi

echo "→ Сборка (landing v=${VITE_APP_BUILD:-local})..."
npm run build:pages

echo "→ Деплой на gh-pages..."
touch dist/.nojekyll
npx --yes gh-pages -d dist -r "git@github.com:${REPO}.git" -m "Deploy TiLi Calendar $(date +%Y-%m-%d)"

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
  echo "✅ Готово: https://tili.su/"
else
  echo ""
  echo "⚠️  gh не авторизован — включи Pages вручную:"
  echo "   1. https://github.com/Tilkerman/great-idea/settings"
  echo "      → Danger zone → Change visibility → Public"
  echo "   2. https://github.com/Tilkerman/great-idea/settings/pages"
  echo "      → Deploy from branch → gh-pages → / (root) → Save"
  echo ""
  echo "   Ссылка: https://tilkerman.github.io/great-idea/"
fi
