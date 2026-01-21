#!/bin/bash
# ralph-status.sh - Check current Ralph status

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "═══════════════════════════════════════════════════════════════════"
echo "                    RALPH STATUS"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

if [ ! -f "$SCRIPT_DIR/prd.json" ]; then
    echo "❌ No prd.json found - Ralph not initialized"
    echo ""
    echo "To start:"
    echo "  1. Run: claude"
    echo "  2. Say: Load the prd skill and create a PRD for [your feature]"
    echo "  3. Say: Load the ralph skill and convert tasks/prd-[name].md to prd.json"
    exit 1
fi

# Feature info
FEATURE=$(jq -r '.featureName // "Unknown"' "$SCRIPT_DIR/prd.json")
BRANCH=$(jq -r '.branchName // "Unknown"' "$SCRIPT_DIR/prd.json")

echo "📋 Feature: $FEATURE"
echo "🌿 Branch:  $BRANCH"
echo ""

# Story counts
TOTAL=$(jq '.userStories | length' "$SCRIPT_DIR/prd.json")
COMPLETE=$(jq '[.userStories[] | select(.passes == true)] | length' "$SCRIPT_DIR/prd.json")
REMAINING=$((TOTAL - COMPLETE))

echo "📊 Progress: $COMPLETE / $TOTAL stories complete"
echo ""

# Progress bar
if [ $TOTAL -gt 0 ]; then
    PERCENT=$((COMPLETE * 100 / TOTAL))
    BAR_WIDTH=40
    FILLED=$((PERCENT * BAR_WIDTH / 100))
    EMPTY=$((BAR_WIDTH - FILLED))

    printf "["
    printf "%${FILLED}s" | tr ' ' '█'
    printf "%${EMPTY}s" | tr ' ' '░'
    printf "] %d%%\n" $PERCENT
    echo ""
fi

# List stories
echo "📝 Stories:"
echo ""

jq -r '.userStories[] |
    if .passes == true then "  ✅ \(.id): \(.title)"
    else "  ⬜ \(.id): \(.title)"
    end' "$SCRIPT_DIR/prd.json"

echo ""

# Next story
NEXT=$(jq -r '[.userStories[] | select(.passes != true)][0] | "\(.id): \(.title)" // "None"' "$SCRIPT_DIR/prd.json")

if [ "$NEXT" = "None" ]; then
    echo "🎉 All stories complete!"
else
    echo "➡️  Next: $NEXT"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"

# Show recent progress entries
if [ -f "$SCRIPT_DIR/progress.txt" ]; then
    ENTRIES=$(grep -c "^## Iteration:" "$SCRIPT_DIR/progress.txt" 2>/dev/null || echo "0")
    echo "📜 Progress log: $ENTRIES iteration(s) recorded"
fi

# Show last activity
if [ -f "$SCRIPT_DIR/ralph.log" ]; then
    echo "📅 Last run: $(tail -1 "$SCRIPT_DIR/ralph.log" 2>/dev/null | cut -d']' -f1 | tr -d '[')"
fi

echo ""
