#!/bin/bash
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

echo "=== CHRAVEL MEMORY PRIMER ==="
echo ""

# 1. Agent memory summary (structured entries)
if [ -f "$PROJECT_DIR/agent_memory.jsonl" ]; then
  ENTRY_COUNT=$(grep -c '{' "$PROJECT_DIR/agent_memory.jsonl" 2>/dev/null || echo "0")
  echo "## Agent Memory ($ENTRY_COUNT entries)"
  MEMORY_FILE="$PROJECT_DIR/agent_memory.jsonl" python3 -c '
import json, os
with open(os.environ["MEMORY_FILE"]) as f:
    for i, line in enumerate(f, 1):
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
            cat = entry.get("category", "?").upper()
            title = entry.get("title", "?")
            applies = ", ".join(entry.get("applies_when", [])[:3])
            print(f"  {i}. [{cat}] {title}")
            print(f"     Applies: {applies}")
        except json.JSONDecodeError:
            pass
' 2>/dev/null || echo "  (failed to parse agent_memory.jsonl)"
  echo ""
fi

# 2. Debug pattern titles
if [ -f "$PROJECT_DIR/DEBUG_PATTERNS.md" ]; then
  echo "## Debug Patterns"
  grep -E '^## ' "$PROJECT_DIR/DEBUG_PATTERNS.md" | grep -v '^## General' | sed 's/^## /  - /' | head -15 || true
  echo ""
fi

# 3. Lesson titles
if [ -f "$PROJECT_DIR/LESSONS.md" ]; then
  echo "## Lessons"
  grep -E '^### ' "$PROJECT_DIR/LESSONS.md" | sed 's/^### /  - /' | head -15 || true
  echo ""
fi

# 4. Test gap count
if [ -f "$PROJECT_DIR/TEST_GAPS.md" ]; then
  GAP_COUNT=$(grep -cE '^## |^### ' "$PROJECT_DIR/TEST_GAPS.md" 2>/dev/null || echo "0")
  echo "## Test Gaps: $GAP_COUNT areas tracked in TEST_GAPS.md"
  echo ""
fi

# 5. Audit index pointer
if [ -f "$PROJECT_DIR/AUDIT_INDEX.md" ]; then
  echo "## Audit Docs: See AUDIT_INDEX.md for 8 audit files (5,050+ lines)"
fi

echo ""
echo "Full details: agent_memory.jsonl, DEBUG_PATTERNS.md, LESSONS.md, TEST_GAPS.md, AUDIT_INDEX.md"
echo "=== END PRIMER ==="
