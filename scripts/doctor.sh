#!/usr/bin/env bash
set -euo pipefail
# ───────────────────────────────────────────────────────
# Chravel Doctor — one-command repo health check
# Usage: npm run doctor   OR   bash scripts/doctor.sh
# ───────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
BOLD='\033[1m'

pass=0
fail=0
warn=0

step() {
  echo ""
  echo -e "${BOLD}▶ $1${NC}"
}

ok() {
  echo -e "  ${GREEN}✅ $1${NC}"
  pass=$((pass + 1))
}

warning() {
  echo -e "  ${YELLOW}⚠️  $1${NC}"
  warn=$((warn + 1))
}

fail() {
  echo -e "  ${RED}❌ $1${NC}"
  fail=$((fail + 1))
}

echo ""
echo -e "${BOLD}🩺 Chravel Doctor${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Node version ───────────────────────────────────
step "1/8  Node version check"
NODE_VERSION=$(node -v 2>/dev/null || echo "none")
if [[ "$NODE_VERSION" == "none" ]]; then
  fail "Node.js not found"
else
  MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
  if (( MAJOR >= 18 )); then
    ok "Node $NODE_VERSION (>= 18 required)"
  else
    fail "Node $NODE_VERSION — need >= 18"
  fi
fi

# ── 2. Dependencies installed ─────────────────────────
step "2/8  Dependencies"
if [ -d "node_modules" ] && [ -f "node_modules/.package-lock.json" ]; then
  ok "node_modules present"
else
  warning "node_modules missing — running npm install"
  npm install --silent 2>&1 | tail -3
  if [ -d "node_modules" ]; then
    ok "npm install succeeded"
  else
    fail "npm install failed"
  fi
fi

# ── 3. Environment validation ─────────────────────────
step "3/8  Environment variables"
if command -v npx &> /dev/null && [ -f "scripts/validate-env.ts" ]; then
  if npx tsx scripts/validate-env.ts 2>&1 | grep -q "All required environment variables"; then
    ok "Required env vars present"
  else
    warning "Some env vars missing (app uses hardcoded Supabase defaults for dev)"
  fi
else
  warning "Skipped — npx or validate-env.ts not available"
fi

# ── 4. TypeScript ─────────────────────────────────────
step "4/8  TypeScript type check"
if npx tsc --noEmit 2>&1; then
  ok "TypeScript passes"
else
  fail "TypeScript errors found"
fi

# ── 5. ESLint ─────────────────────────────────────────
step "5/8  ESLint"
LINT_OUTPUT=$(npx eslint . 2>&1 || true)
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -c " error " || true)
LINT_WARNINGS=$(echo "$LINT_OUTPUT" | grep -c " warning " || true)
if (( LINT_ERRORS > 0 )); then
  fail "ESLint: $LINT_ERRORS errors, $LINT_WARNINGS warnings"
else
  ok "ESLint: 0 errors ($LINT_WARNINGS warnings)"
fi

# ── 6. Unit tests ────────────────────────────────────
step "6/8  Unit tests (vitest)"
if npx vitest run --reporter=verbose 2>&1 | tail -5 | grep -q "passed"; then
  ok "Unit tests pass"
else
  fail "Unit tests failed"
fi

# ── 7. Build ──────────────────────────────────────────
step "7/8  Production build"
if npm run build 2>&1 | tail -3 | grep -q "built in"; then
  ok "Vite build succeeded"
else
  fail "Vite build failed"
fi

# ── 8. Build output check ─────────────────────────────
step "8/8  Build output sanity"
if [ -f "dist/index.html" ] && [ -d "dist/assets" ]; then
  INDEX_SIZE=$(wc -c < dist/index.html)
  JS_COUNT=$(find dist/assets/js -name "*.js" 2>/dev/null | wc -l)
  ok "dist/index.html ($INDEX_SIZE bytes), $JS_COUNT JS chunks"
else
  fail "dist/ missing or incomplete"
fi

# ── Summary ───────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BOLD}Summary:${NC} ${GREEN}$pass passed${NC}, ${YELLOW}$warn warnings${NC}, ${RED}$fail failed${NC}"

if (( fail > 0 )); then
  echo -e "${RED}Doctor found issues that must be fixed before shipping.${NC}"
  exit 1
else
  echo -e "${GREEN}All checks passed. Repo is healthy.${NC}"
  exit 0
fi
