#!/bin/bash
set -euo pipefail

# --- Context primer (all sessions — local + remote) ---
MEMORY_COUNT=0
if [ -f "${CLAUDE_PROJECT_DIR:-}/agent_memory.jsonl" ]; then
  MEMORY_COUNT=$(grep -c '^{' "${CLAUDE_PROJECT_DIR:-}/agent_memory.jsonl" 2>/dev/null || echo "0")
fi

echo "=== CHRAVEL SESSION CONTEXT ==="
echo "Critical path: Auth > Trips > Chat > Payments > AI Concierge > Calendar > Permissions > Notifications"
echo "Zero-tolerance: Trip Not Found regressions | Auth desync | RLS leaks | Demo mode contamination"
echo ""
echo "Quick reference: SYSTEM_MAP.md | CLAUDE.md | DEBUG_PATTERNS.md | LESSONS.md"
echo "Agent memory: agent_memory.jsonl (${MEMORY_COUNT} entries)"
echo "Before non-trivial work: read relevant memory entries (per CLAUDE.md Agent Learning Protocol)"
echo ""
echo "Build gate: npm run lint && npm run typecheck && npm run build"
echo "=== END CONTEXT ==="

# Only run npm install in remote Claude Code on the web sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "Installing npm dependencies..."
npm install

echo "Session startup complete."
