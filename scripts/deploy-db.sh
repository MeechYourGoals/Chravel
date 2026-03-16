#!/bin/bash
# ---------------------------------------------------------------------------
# Chravel Migration Deploy Wrapper
#
# Wraps `supabase db push` with pre-flight safety checks and post-deploy
# health verification. Prevents deploying broken or un-linted migrations.
#
# Usage:
#   ./scripts/deploy-db.sh              # dry run (lint + show pending)
#   ./scripts/deploy-db.sh --confirm    # apply migrations
#
# Prerequisites:
#   - Supabase CLI installed and linked (`supabase link`)
#   - SUPABASE_URL env var set (for post-deploy health check)
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "  Chravel Migration Deploy"
echo "$(printf '%0.s-' {1..60})"
echo ""

# Step 1: Pre-flight lint
echo "[1/4] Running migration lint..."
if ! npx tsx "$PROJECT_ROOT/scripts/lint-migrations.ts"; then
  echo ""
  echo "  Migration lint failed. Fix errors before deploying."
  exit 1
fi
echo "  Migration lint passed."

# Step 2: Env coverage check
echo ""
echo "[2/4] Checking edge function env coverage..."
if ! npx tsx "$PROJECT_ROOT/scripts/check-env-coverage.ts"; then
  echo "  Warning: env coverage check had issues (non-blocking)."
fi

# Step 3: Show what will be applied
echo ""
echo "[3/4] Pending migration changes:"
if command -v supabase &> /dev/null; then
  supabase db diff --linked 2>/dev/null || echo "  (Could not diff — ensure supabase is linked)"
else
  echo "  Supabase CLI not found. Install with: npm i -g supabase"
  echo "  Skipping diff."
fi

# Step 4: Apply or dry-run
echo ""
if [[ "${1:-}" == "--confirm" ]]; then
  echo "[4/4] Applying migrations..."
  if command -v supabase &> /dev/null; then
    supabase db push
    echo ""
    echo "  Migrations applied successfully."
    echo "  Timestamp: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

    # Post-deploy health check
    if [[ -n "${SUPABASE_URL:-}" ]]; then
      echo ""
      echo "  Running post-deploy health check..."
      HTTP_STATUS=$(curl -sf -o /dev/null -w '%{http_code}' "${SUPABASE_URL}/functions/v1/health" 2>/dev/null || echo "000")
      if [[ "$HTTP_STATUS" == "200" ]]; then
        echo "  Health check passed (HTTP 200)"
      else
        echo "  WARNING: Health check returned HTTP $HTTP_STATUS"
        echo "  Verify manually: curl ${SUPABASE_URL}/functions/v1/health"
      fi
    else
      echo "  Skipping health check (SUPABASE_URL not set)."
    fi
  else
    echo "  ERROR: Supabase CLI not installed."
    exit 1
  fi
else
  echo "[4/4] DRY RUN — no migrations applied."
  echo ""
  echo "  To apply migrations, run:"
  echo "    ./scripts/deploy-db.sh --confirm"
fi

echo ""
