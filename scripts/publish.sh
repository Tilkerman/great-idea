#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! gh auth status >/dev/null 2>&1; then
  echo "Сначала войди в GitHub:"
  gh auth login -h github.com -p https -w
fi

REPO_NAME="${1:-tili-calendar}"
OWNER="$(gh api user -q .login)"

echo "Создаю репозиторий ${OWNER}/${REPO_NAME}..."
if git remote get-url origin >/dev/null 2>&1; then
  git push -u origin main
else
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
fi

echo ""
echo "Включи GitHub Pages (если ещё не включены):"
echo "  Settings → Pages → Source: GitHub Actions"
echo ""
echo "Через 1–2 минуты после деплоя открой:"
echo "  https://${OWNER}.github.io/${REPO_NAME}/"
echo ""
echo "На iPhone: Safari → Поделиться → На экран «Домой» (PWA)"
