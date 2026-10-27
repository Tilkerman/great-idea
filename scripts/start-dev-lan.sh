#!/usr/bin/env bash
# Запуск Vite для LAN/локалки вне Cursor (процесс не умрёт с агентом).
# Запускать из nested-копии: /Users/macbookair/Работа/список/календарь
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG="/tmp/tili-vite.log"
PORT=5175

if [[ -f "$ROOT/scripts/sync-landing-for-dev.py" ]]; then
  python3 "$ROOT/scripts/sync-landing-for-dev.py"
fi

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "${PIDS}" ]]; then
    echo "Порт $PORT занят (PID $PIDS). Останавливаю…"
    kill $PIDS 2>/dev/null || true
    sleep 0.5
  fi
fi

nohup npm run dev:lan >>"$LOG" 2>&1 &
echo "Vite запущен в фоне. Лог: $LOG"
sleep 1
if command -v curl >/dev/null 2>&1; then
  curl -s -o /dev/null -w "landing.html → HTTP %{http_code}\n" --max-time 5 "http://127.0.0.1:$PORT/landing.html" || true
fi
echo ""
echo "Открой в браузере:"
echo "  http://localhost:$PORT/landing.html"
echo "  http://127.0.0.1:$PORT/landing.html"
grep -E 'Network:' "$LOG" 2>/dev/null | tail -2 || true
