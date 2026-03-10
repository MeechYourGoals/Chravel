# Automation Decision Matrix

When to use `/loop` vs hooks vs subagents vs CI/headless for Chravel engineering automation.

---

## Quick Decision Table

| Question | /loop | Hook | Subagent | Ralph | CI/Headless |
|----------|:-----:|:----:|:--------:|:-----:|:-----------:|
| Triggered by time/interval? | **Yes** | No | No | No | Yes |
| Triggered by Claude lifecycle event? | No | **Yes** | No | No | No |
| Triggered by git push/PR event? | No | No | No | No | **Yes** |
| Needs isolated file changes? | No | No | **Yes** | Yes | Yes |
| Needs to survive session restart? | No | No | No | **Yes**[1] | **Yes** |
| Monitors external state (deploy, CI)? | **Yes** | No | No | No | Yes |
| Implements features/stories? | No | No | Partial | **Yes** | No |
| Runs forever / across days? | 3d max | Always | No | Until done | **Yes** |
| Needs human in the loop? | Optional | No | No | No | Optional |

[1] Ralph survives restarts via `ralph.sh` bash loop + disk state, not session persistence.

---

## Detailed Comparison

### /loop (Session-Scoped Cron)

**What it is:** Recurring prompts on a timer within a Claude Code session.

**Best for:**
- Polling deploy/CI status
- Babysitting PRs (comments, checks)
- Supervising Ralph iterations
- Post-deploy smoke checks
- Periodic digests/summaries
- Short-lived monitoring (hours, not weeks)

**Limitations:**
- Dies when session exits
- No catch-up for missed fires
- 1-minute minimum granularity
- 3-day max lifetime
- Fires only when Claude is idle

**Cost profile:** Low per-iteration (if checks are cheap), accumulates over time.

---

### Hooks (Event-Driven Lifecycle)

**What it is:** Shell commands triggered by Claude Code events (PostToolUse, PreToolUse, SessionStart, etc.).

**Best for:**
- Auto-formatting after edits (prettier, eslint --fix)
- Type-checking after file changes
- Blocking edits to protected files
- Injecting context on session start
- Notifications on specific events
- Enforcing repo conventions automatically

**Limitations:**
- Only fires on Claude Code lifecycle events
- Cannot poll external systems
- Cannot run on a timer
- Must be fast (blocks Claude's turn)

**Cost profile:** Zero token cost (shell commands), runs instantly.

**Chravel hooks already configured:**
- `SessionStart` → install deps
- `PostToolUse (Edit|Write)` → prettier + typecheck

---

### Subagents (Isolated Parallel Work)

**What it is:** Spawned Claude instances with their own context, optionally in git worktrees.

**Best for:**
- Exploring codebase without polluting main context
- Fixing issues in isolation (worktree)
- Parallel research across multiple files
- Implementing fixes that a /loop detected
- Code review of specific PRs

**Limitations:**
- One-shot (not recurring unless looped)
- Context doesn't flow back automatically
- Worktree changes need manual merge
- Can be expensive for broad tasks

**Cost profile:** Medium-high per invocation, but bounded.

**Relationship to /loop:** Loops DETECT problems. Subagents FIX them. Combine: `/loop` detects CI failure → spawns worktree subagent → subagent fixes → loop verifies.

---

### Ralph (Autonomous Builder Loop)

**What it is:** External bash loop that spawns fresh Claude instances to implement stories from a PRD.

**Best for:**
- Multi-story feature implementation
- Autonomous development with progress tracking
- Work that takes hours/days of coding
- Tasks with clear acceptance criteria per story

**Limitations:**
- Requires PRD + prd.json setup
- One story per iteration
- Fresh context each iteration (no memory)
- Needs monitoring (use /loop for this!)

**Cost profile:** High (full Claude session per iteration), but productive.

**Relationship to /loop:** Ralph BUILDS features. /loop SUPERVISES Ralph. They're complementary, not alternatives.

---

### CI / Headless SDK / Desktop Scheduled Tasks

**What it is:** Durable automation that runs independently of any terminal session.

**Best for:**
- Tests on every push
- Nightly builds
- Scheduled dependency updates
- Production monitoring
- Anything that must run unattended for weeks/months
- Cross-team automation

**Limitations:**
- Requires setup (workflow files, SDK config)
- Less interactive than /loop
- Harder to iterate on quickly

**Cost profile:** Varies. GitHub Actions minutes + API calls.

**Relationship to /loop:** Prototype in /loop, graduate to CI when proven valuable.

---

## Common Misuse Patterns

### Using /loop when you need a Hook

**Wrong:**
```
/loop 1m after every file edit, run prettier
```

**Right:**
```json
// .claude/settings.json → hooks.PostToolUse
{
  "matcher": "Edit|Write",
  "hooks": [{ "type": "command", "command": "prettier --write \"$CLAUDE_FILE_PATHS\"" }]
}
```

### Using /loop when you need CI

**Wrong:**
```
/loop 1d run the full test suite and report
```

**Right:** Create a GitHub Actions workflow with `schedule: - cron: '0 9 * * *'`

### Using /loop when you need Ralph

**Wrong:**
```
/loop 10m implement the next user story from the PRD
```

**Right:** `./scripts/ralph/ralph.sh 20`

### Using /loop when you need a Subagent

**Wrong:**
```
/loop 5m explore the codebase and find all auth-related files
```

**Right:** Spawn an Explore subagent once, get the results.

### Using Ralph when you need /loop

**Wrong:** Running Ralph to "check if the deploy succeeded"

**Right:** `/loop 5m check if the Vercel deploy succeeded`

---

## Graduation Path

```
Experiment (manual check)
    ↓
/loop (session-scoped, quick iteration)
    ↓
Desktop Scheduled Task (durable, local)
    ↓
GitHub Actions / Headless SDK (durable, shared, auditable)
```

When to graduate:
- You've restarted the same /loop 3+ sessions in a row → make it durable
- Multiple team members need the same check → make it shared
- The check is critical for production → make it CI

---

*Last Updated: 2026-03-08*
