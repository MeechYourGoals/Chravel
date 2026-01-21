# Ralph Method Installation for Chravel

> **Ship Chravel features while you sleep** — Autonomous AI agent loop for Claude Code

## What is Ralph?

Ralph is an autonomous AI agent loop that runs Claude Code repeatedly until all PRD items are complete. Each iteration is a fresh instance with clean context. Memory persists via git history, `progress.txt`, and `prd.json`.

**Original Sources:**
- Tweet: https://x.com/ryancarson/status/2008548371712135632
- GitHub: https://github.com/snarktank/ralph
- Pattern Origin: [Geoffrey Huntley's Ralph](https://ghuntley.com/ralph/)

---

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- `jq` installed (`brew install jq` on macOS, `apt install jq` on Linux)
- Git repository (https://github.com/MeechYourGoals/chravel)
- Claude Max subscription (recommended for token usage)

---

## Installation (Already Complete!)

The Ralph method has been installed with the following structure:

```
scripts/ralph/
├── ralph.sh           # Main autonomous loop
├── ralph-once.sh      # Single iteration (debug)
├── ralph-status.sh    # Check progress
├── prompt.md          # Chravel-specific instructions
├── prd.json.example   # Template for task list
├── INSTALL.md         # This file
└── skills/            # PRD generation skills
    ├── prd/SKILL.md
    └── ralph/SKILL.md
```

---

## Usage Workflow

### Phase 1: Create PRD (Interactive with Claude)

```bash
cd ~/path/to/chravel
claude
```

In the Claude session:
```
Load the prd skill and create a PRD for [your feature]
```

**Example:**
```
Load the prd skill and create a PRD for fixing trip details modal layout on mobile
```

Answer Claude's questions. PRD saves to `tasks/prd-[feature].md`.

### Phase 2: Convert to Ralph Format

Still in Claude:
```
Load the ralph skill and convert tasks/prd-[feature].md to prd.json
```

Exit Claude (`exit` or Ctrl+C).

### Phase 3: Run Ralph Autonomously

```bash
./scripts/ralph/ralph.sh 10  # 10 iterations max
```

Ralph will:
1. Create feature branch
2. Pick first incomplete story
3. Implement it
4. Run quality checks (`npm run lint && npm run typecheck && npm run build`)
5. Commit if passing
6. Mark story complete in prd.json
7. Log learnings to progress.txt
8. Repeat until done

### Phase 4: Monitor Progress

```bash
# Check status anytime
./scripts/ralph/ralph-status.sh

# See which stories are done
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'

# Read iteration learnings
cat scripts/ralph/progress.txt
```

---

## Chravel-Specific Configuration

The `prompt.md` included is pre-configured for Chravel's:

- **Stack**: React 18, TypeScript, TanStack Query, Zustand, Supabase
- **Quality Gates**: `npm run lint && npm run typecheck && npm run build`
- **Patterns**: Demo vs Auth conditional paths, Google Maps null-checks
- **Architecture**: Never modify mock data, parallel implementation for auth

### Key Patterns Baked In

```typescript
// Demo vs Auth (NEVER modify mock files)
const trips = isDemo ? MOCK_TRIPS_DATA : await fetchRealTrips()

// Supabase queries
const { data, error } = await supabase.from('trips').select('*')
if (error) return

// Google Maps (always guard)
if (mapRef.current) mapRef.current.setZoom(12)

// Component structure
const Component = () => {
  // 1. Hooks first
  // 2. Queries next
  // 3. Handlers with guards
  // 4. Derived state
  // 5. Return JSX
}
```

---

## prd.json Format

```json
{
  "featureName": "Trip Details Modal Fix",
  "branchName": "feature/trip-details-modal-fix",
  "description": "Fix layout issues on mobile for trip details modal",
  "userStories": [
    {
      "id": "US-001",
      "title": "Fix header overflow on iPhone SE",
      "description": "Trip name truncates properly on small screens. Use text-ellipsis with max-width.",
      "acceptanceCriteria": [
        "Header fits on 320px width screens",
        "Long trip names show ellipsis",
        "No horizontal scroll on modal"
      ],
      "priority": 1,
      "passes": false
    }
  ]
}
```

### Story Sizing Guidelines

**Right-sized stories (~30 min each):**
- Fix a specific layout bug
- Add a single API endpoint
- Create one UI component
- Implement form validation

**Too big (split these):**
- "Fix all mobile issues"
- "Add authentication"
- "Build the events module"

---

## Debugging

```bash
# Run single iteration for testing
./scripts/ralph/ralph-once.sh

# Check what Ralph sees
cat scripts/ralph/prd.json | jq '.'

# View iteration history
cat scripts/ralph/progress.txt

# Check execution log
cat scripts/ralph/ralph.log
```

---

## Customization

### Edit prompt.md for Your Needs

The `prompt.md` is Chravel-specific but you can adjust:

- Quality check commands
- Project-specific patterns
- File structure conventions

### Integrate with Existing CLAUDE.md

If you already have a `CLAUDE.md` in repo root, Ralph will read it automatically for patterns and conventions.

### Combine with claude-progress.txt

Ralph's `progress.txt` complements your existing `claude-progress.txt` Anti-Goldfish Protocol. They serve similar purposes:
- `claude-progress.txt` — Manual session handoffs
- `scripts/ralph/progress.txt` — Autonomous iteration logs

---

## Common Issues

### Quality checks failing
Update `prompt.md` with correct commands for your setup.

### Stories too big
If Claude runs out of context mid-story, split into smaller pieces.

### Mock data being modified
The prompt explicitly forbids this. If it happens, check story acceptance criteria clarity.

### Branch conflicts
Ralph creates feature branches. Ensure you're not already on the target branch.

---

## File Reference

| File | Purpose |
|------|---------|
| `ralph.sh` | Main bash loop, spawns Claude instances |
| `ralph-once.sh` | Single iteration for debugging |
| `ralph-status.sh` | Progress summary |
| `prompt.md` | Instructions fed to each Claude instance |
| `prd.json` | Task list with completion status |
| `progress.txt` | Learnings log across iterations |
| `ralph.log` | Execution timestamps and output |
| `skills/prd/` | PRD generation skill |
| `skills/ralph/` | PRD → JSON conversion skill |

---

## Credits

- [Ryan Carson / snarktank](https://github.com/snarktank/ralph) — Ralph implementation
- [Geoffrey Huntley](https://ghuntley.com/ralph/) — Original Ralph pattern
- [Anthropic](https://anthropic.com) — Claude Code

---

## Quick Reference

```bash
# Create PRD
claude → "Load prd skill, create PRD for [feature]"

# Convert to JSON
claude → "Load ralph skill, convert tasks/prd-[name].md to prd.json"

# Run autonomously
./scripts/ralph/ralph.sh 10

# Check status
./scripts/ralph/ralph-status.sh
```

**Time to first autonomous run: ~5 minutes**
