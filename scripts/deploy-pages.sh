#!/bin/bash
# GitHub Pages needs a public repo + gh-pages branch enabled in Settings.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="Tilkerman/great-idea"
BASE="/great-idea/"

echo "→ Сборка..."
BASE_PATH="$BASE" npm run build

echo "→ Деплой на gh-pages..."
touch dist/.nojekyll
npx --yes gh-pages -d dist -r "git@github.com:${REPO}.git" -m "Deploy TiLi Calendar $(date +%Y-%m-%d)"

if gh auth status >/dev/null 2>&1; then
  echo "→ Делаю репозиторий публичным..."
  gh repo edit "$REPO" --visibility public --accept-visibility-change-consequences
  echo "→ Включаю GitHub Pages..."
  gh api "repos/${REPO}/pages" -X POST \
    -f build_type=legacy \
    -f "source[branch]=gh-pages" \
    -f "source[path]=/" 2>/dev/null \
    || gh api "repos/${REPO}/pages" -X PUT \
    -f build_type=legacy \
    -f "source[branch]=gh-pages" \
    -f "source[path]=/"
  echo ""
  echo "✅ Готово: https://tilkerman.github.io/great-idea/"
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
