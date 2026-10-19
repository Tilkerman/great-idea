#!/bin/bash
# jsDelivr caches gh-pages; after deploy stale index.html can point at removed hashed assets → white screen.
set -euo pipefail

REPO_PATH="/gh/Tilkerman/great-idea@gh-pages"
PATHS=(
  "${REPO_PATH}/app/index.html"
  "${REPO_PATH}/app/sw.js"
)

for p in "${PATHS[@]}"; do
  echo "→ Purge jsDelivr ${p}"
  curl -fsS "https://purge.jsdelivr.net${p}" >/dev/null || true
done

echo "✅ jsDelivr purge requested (index + sw)"
