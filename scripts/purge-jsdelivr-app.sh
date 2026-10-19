#!/bin/bash
# jsDelivr caches gh-pages; stale index.html + removed Vite hashes → white screen in Safari.
set -euo pipefail

REPO_PATH="/gh/Tilkerman/great-idea@gh-pages"
PATHS=(
  "${REPO_PATH}/app/index.html"
  "${REPO_PATH}/app/sw.js"
)

for p in "${PATHS[@]}"; do
  echo "→ Purge jsDelivr ${p}"
  curl -fsS "https://purge.jsdelivr.net${p}" >/dev/null
done

echo "✅ jsDelivr purge finished (index + sw)"
