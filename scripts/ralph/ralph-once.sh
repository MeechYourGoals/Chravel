#!/bin/bash
# ralph-once.sh - Run a single Ralph iteration for debugging
# Useful for testing prompts or debugging issues

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "═══════════════════════════════════════════════════════════════════"
echo "RALPH - Single Iteration (Debug Mode)"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Project: $PROJECT_ROOT"
echo "Prompt:  $SCRIPT_DIR/prompt.md"
echo ""

# Check prerequisites
if ! command -v claude &> /dev/null; then
    echo "Error: Claude Code CLI not found"
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/prd.json" ]; then
    echo "Error: prd.json not found in $SCRIPT_DIR"
    exit 1
fi

cd "$PROJECT_ROOT"

echo "Running Claude Code with prompt..."
echo ""

claude --dangerously-skip-permissions --print < "$SCRIPT_DIR/prompt.md"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "Single iteration complete"
echo "═══════════════════════════════════════════════════════════════════"
