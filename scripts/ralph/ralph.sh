#!/bin/bash
# Ralph - Autonomous AI Agent Loop for Claude Code
# Based on snarktank/ralph by Ryan Carson
# Adapted for Claude Code CLI

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAX_ITERATIONS=${1:-10}
ITERATION=0
LOG_FILE="$SCRIPT_DIR/ralph.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$timestamp] ✓${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[$timestamp] ✗${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[$timestamp] ⚠${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    if ! command -v claude &> /dev/null; then
        log_error "Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq not found. Install with: brew install jq (macOS) or apt install jq (Linux)"
        exit 1
    fi

    if [ ! -f "$SCRIPT_DIR/prd.json" ]; then
        log_error "prd.json not found in $SCRIPT_DIR"
        log "Create a PRD first: claude then 'Load the prd skill and create a PRD for [feature]'"
        exit 1
    fi
}

# Archive previous runs if branch changed
archive_if_needed() {
    local current_branch=$(jq -r '.branchName // empty' "$SCRIPT_DIR/prd.json" 2>/dev/null)
    local last_branch=""

    if [ -f "$SCRIPT_DIR/.last-branch" ]; then
        last_branch=$(cat "$SCRIPT_DIR/.last-branch")
    fi

    if [ -n "$last_branch" ] && [ "$last_branch" != "$current_branch" ]; then
        local archive_dir="$SCRIPT_DIR/archive/$(date '+%Y-%m-%d')-$last_branch"
        mkdir -p "$archive_dir"

        [ -f "$SCRIPT_DIR/prd.json.bak" ] && mv "$SCRIPT_DIR/prd.json.bak" "$archive_dir/prd.json"
        [ -f "$SCRIPT_DIR/progress.txt.bak" ] && mv "$SCRIPT_DIR/progress.txt.bak" "$archive_dir/progress.txt"
        [ -f "$SCRIPT_DIR/ralph.log.bak" ] && mv "$SCRIPT_DIR/ralph.log.bak" "$archive_dir/ralph.log"

        log "Archived previous run to $archive_dir"
    fi

    # Backup current files
    [ -f "$SCRIPT_DIR/prd.json" ] && cp "$SCRIPT_DIR/prd.json" "$SCRIPT_DIR/prd.json.bak"
    [ -f "$SCRIPT_DIR/progress.txt" ] && cp "$SCRIPT_DIR/progress.txt" "$SCRIPT_DIR/progress.txt.bak"
    [ -f "$SCRIPT_DIR/ralph.log" ] && cp "$SCRIPT_DIR/ralph.log" "$SCRIPT_DIR/ralph.log.bak"

    echo "$current_branch" > "$SCRIPT_DIR/.last-branch"
}

# Setup git branch
setup_branch() {
    cd "$PROJECT_ROOT"

    local branch_name=$(jq -r '.branchName // "feature/ralph"' "$SCRIPT_DIR/prd.json")
    local current_branch=$(git branch --show-current 2>/dev/null || echo "")

    if [ "$current_branch" != "$branch_name" ]; then
        if git show-ref --verify --quiet "refs/heads/$branch_name" 2>/dev/null; then
            log "Switching to existing branch: $branch_name"
            git checkout "$branch_name"
        else
            log "Creating new branch: $branch_name"
            git checkout -b "$branch_name"
        fi
    else
        log "Already on branch: $branch_name"
    fi
}

# Check if all stories are complete
all_stories_complete() {
    local incomplete=$(jq '[.userStories[] | select(.passes != true)] | length' "$SCRIPT_DIR/prd.json")
    [ "$incomplete" -eq 0 ]
}

# Get next incomplete story
get_next_story() {
    jq -r '[.userStories[] | select(.passes != true)][0].id // empty' "$SCRIPT_DIR/prd.json"
}

# Run a single Ralph iteration
run_iteration() {
    cd "$PROJECT_ROOT"

    log "═══════════════════════════════════════════════════════════════"
    log "ITERATION $((ITERATION + 1)) / $MAX_ITERATIONS"
    log "═══════════════════════════════════════════════════════════════"

    local next_story=$(get_next_story)
    if [ -z "$next_story" ]; then
        log_success "All stories complete!"
        return 1
    fi

    log "Working on story: $next_story"

    # Run Claude Code with the prompt
    local OUTPUT
    OUTPUT=$(claude --dangerously-skip-permissions --print < "$SCRIPT_DIR/prompt.md" 2>&1 | tee /dev/stderr) || true

    # Check for completion signal
    if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
        log_success "Claude signaled COMPLETE"
        return 1
    fi

    return 0
}

# Main loop
main() {
    log "╔═══════════════════════════════════════════════════════════════╗"
    log "║                    RALPH - Claude Code                        ║"
    log "║            Autonomous AI Agent Loop                           ║"
    log "╚═══════════════════════════════════════════════════════════════╝"
    log ""
    log "Project: $PROJECT_ROOT"
    log "Max iterations: $MAX_ITERATIONS"
    log ""

    check_prerequisites
    archive_if_needed
    setup_branch

    # Initialize progress.txt if it doesn't exist
    if [ ! -f "$SCRIPT_DIR/progress.txt" ]; then
        echo "# Ralph Progress Log" > "$SCRIPT_DIR/progress.txt"
        echo "# Learnings and context for future iterations" >> "$SCRIPT_DIR/progress.txt"
        echo "" >> "$SCRIPT_DIR/progress.txt"
    fi

    while [ $ITERATION -lt $MAX_ITERATIONS ]; do
        if all_stories_complete; then
            log_success "All stories marked as complete in prd.json"
            break
        fi

        if ! run_iteration; then
            break
        fi

        ITERATION=$((ITERATION + 1))

        # Brief pause between iterations
        sleep 2
    done

    log ""
    log "═══════════════════════════════════════════════════════════════"
    if all_stories_complete; then
        log_success "RALPH COMPLETE - All stories implemented"
    else
        log_warning "RALPH STOPPED - Max iterations reached or error"
        log "Run './scripts/ralph/ralph.sh' to continue"
    fi
    log "═══════════════════════════════════════════════════════════════"

    # Show summary
    local total=$(jq '.userStories | length' "$SCRIPT_DIR/prd.json")
    local complete=$(jq '[.userStories[] | select(.passes == true)] | length' "$SCRIPT_DIR/prd.json")
    log "Stories: $complete / $total complete"
}

main "$@"
