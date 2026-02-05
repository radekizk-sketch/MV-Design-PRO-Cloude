#!/usr/bin/env bash
# =============================================================================
# MV-DESIGN PRO — Smoke Test (lokalne / Docker)
#
# Sprawdza czy backend, frontend i bazy danych są gotowe.
# Użycie:
#   ./scripts/smoke_local.sh              # domyślne porty (backend=18000, frontend=3000)
#   BACKEND_PORT=8000 ./scripts/smoke_local.sh  # niestandardowy port
# =============================================================================

set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-18000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_URL="http://localhost:${BACKEND_PORT}"
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local label="$1"
  local url="$2"
  local expected="$3"

  if response=$(curl -fsS --max-time 5 "$url" 2>/dev/null); then
    if echo "$response" | grep -q "$expected"; then
      echo -e "  ${GREEN}PASS${NC}  $label"
      PASS=$((PASS + 1))
    else
      echo -e "  ${RED}FAIL${NC}  $label  (unexpected response: $response)"
      FAIL=$((FAIL + 1))
    fi
  else
    echo -e "  ${RED}FAIL${NC}  $label  (connection refused or timeout)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=========================================="
echo " MV-DESIGN PRO — Smoke Test"
echo "=========================================="
echo ""

echo "--- Backend (${BACKEND_URL}) ---"
check "GET /health"     "${BACKEND_URL}/health"     '"status":"healthy"'
check "GET /ready"      "${BACKEND_URL}/ready"      '"status":"ready"'
check "GET /api/health" "${BACKEND_URL}/api/health" '"status":"ok"'
check "GET /docs"       "${BACKEND_URL}/docs"       'swagger'
check "GET /"           "${BACKEND_URL}/"           '"version"'

echo ""
echo "--- Backend API (${BACKEND_URL}/api) ---"
check "GET /api/projects"  "${BACKEND_URL}/api/projects"  '['
check "GET /api/catalog"   "${BACKEND_URL}/api/catalog"   '{'

echo ""
echo "--- Frontend (${FRONTEND_URL}) ---"
check "GET /" "${FRONTEND_URL}/" '<'

echo ""
echo "=========================================="
echo -e " Wynik: ${GREEN}${PASS} PASS${NC} / ${RED}${FAIL} FAIL${NC}"
echo "=========================================="

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Smoke test FAILED${NC}"
  exit 1
fi

echo -e "${GREEN}Smoke test PASSED${NC}"
exit 0
