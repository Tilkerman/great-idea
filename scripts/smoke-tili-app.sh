#!/bin/bash
# Post-deploy smoke: cache-bust redirect + index/JS match on tili.su/app/
set -euo pipefail

APP_URL="${SMOKE_APP_URL:-https://tili.su/app/}"
ORIGIN="${SMOKE_ORIGIN:-https://tili.su}"

echo "→ Smoke ${APP_URL}"

first_code="$(curl -fsS -o /dev/null -w "%{http_code}" "${APP_URL}")"
if [[ "${first_code}" != "200" ]]; then
  echo "FAIL: expected 200 from ${APP_URL}, got ${first_code}"
  exit 1
fi

html="$(curl -fsS "${APP_URL}")"
js_path="$(echo "${html}" | grep -oE '/app/assets/index-[A-Za-z0-9_-]+\.js' | head -1 || true)"
if [[ -z "${js_path}" ]]; then
  echo "FAIL: index has no /app/assets/index-*.js"
  exit 1
fi

js_code="$(curl -fsS -o /dev/null -w "%{http_code}" "${ORIGIN}${js_path}")"
if [[ "${js_code}" != "200" ]]; then
  echo "FAIL: bundle ${js_path} → HTTP ${js_code}"
  exit 1
fi

css_path="$(echo "${html}" | grep -oE '/app/assets/index-[A-Za-z0-9_-]+\.css' | head -1 || true)"
if [[ -n "${css_path}" ]]; then
  css_code="$(curl -fsS -o /dev/null -w "%{http_code}" "${ORIGIN}${css_path}")"
  if [[ "${css_code}" != "200" ]]; then
    echo "FAIL: stylesheet ${css_path} → HTTP ${css_code}"
    exit 1
  fi
fi

manifest_code="$(curl -fsS -o /dev/null -w "%{http_code}" "${ORIGIN}/app/manifest.webmanifest")"
if [[ "${manifest_code}" != "200" ]]; then
  echo "FAIL: manifest.webmanifest → HTTP ${manifest_code}"
  exit 1
fi

if [[ -n "${css_path}" ]]; then
  if ! curl -fsS "${ORIGIN}${css_path}" | grep -q 'is-ios-standalone .bottom-nav.*position:fixed'; then
    echo "FAIL: stylesheet missing iOS fixed bottom-nav rule"
    exit 1
  fi
fi

echo "OK: ${js_path} (${js_code}), manifest ${manifest_code}"
