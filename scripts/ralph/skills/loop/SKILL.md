---
name: loop
description: Use when scheduling recurring monitoring, babysitting PRs, watching deploys, supervising Ralph, running smoke checks, or any periodic engineering supervision task. Triggers on "/loop", "babysit", "watch", "monitor", "check every", "keep an eye on". NOT for feature implementation (use Ralph), event-driven automation (use hooks), or durable scheduling (use CI).
---

# Loop Orchestration Skill

Schedule, monitor, and supervise recurring engineering tasks using Claude Code's `/loop` command and `CronCreate`/`CronList`/`CronDelete` tools.

## When to Use

Use this skill when the user says something like:
- "babysit this PR"
- "watch the deploy"
- "monitor Ralph's progress"
- "check if the migration finished"
- "loop on this until it's green"
- "/loop ..."

**Do NOT use this skill for:** feature implementation, wide refactors, or anything that should be a hook, subagent, or CI job. See [Decision Matrix](#decision-matrix) below.

---

## Core Concepts

### What /loop Is

`/loop` creates session-scoped recurring prompts that fire between your turns. It uses cron under the hood. Tasks expire after **3 days** and are gone when the session exits.

### What /loop Is NOT

- Not persistent (dies with session)
- Not event-driven (that's hooks)
- Not isolated execution (that's subagents/worktrees)
- Not durable CI (that's GitHub Actions / headless SDK)

---

## Decision Matrix

Before creating a loop, determine the right tool:

| Signal | Tool | Why |
|--------|------|-----|
| "Check every N minutes if X happened" | **`/loop`** | Periodic polling, session-scoped |
| "When Claude edits a file, run prettier" | **Hook** | Event-driven, lifecycle-triggered |
| "Explore the codebase for X" | **Subagent** | Isolated context, parallel work |
| "Fix this in an isolated branch" | **Subagent + worktree** | No collision with working tree |
| "Run this every morning forever" | **Desktop scheduled task** | Durable, survives restarts |
| "On every push, run tests" | **GitHub Actions / CI** | Production-grade, auditable |
| "Implement these 8 stories autonomously" | **Ralph** | Multi-iteration builder loop |

### Decision Tree

```
Is this triggered by a Claude Code lifecycle event?
  YES → Use a Hook (PostToolUse, PreToolUse, SessionStart, etc.)
  NO ↓

Does this need to survive session restarts?
  YES → Use CI / Desktop Scheduled Tasks / Headless SDK
  NO ↓

Does this require isolated file changes?
  YES → Use a Subagent with worktree isolation
  NO ↓

Is this periodic monitoring, checking, or summarizing?
  YES → Use /loop ✓
  NO ↓

Is this multi-story feature implementation?
  YES → Use Ralph
  NO → Probably just do it directly
```

### Hooks vs /loop — Common Confusion Points

| Task | Correct Tool |
|------|-------------|
| Format files after edit | Hook (PostToolUse) |
| Typecheck after edit | Hook (PostToolUse) |
| Block edits to protected files | Hook (PreToolUse) |
| Notify Slack when session ends | Hook (SessionEnd) — if available |
| Check deploy status every 5 min | /loop |
| Summarize PR comments every 20 min | /loop |
| Re-run smoke tests every hour | /loop |

---

## Required Parameters for Every Loop

**Every loop MUST define these before scheduling.** Do not create vague open-ended loops.

### Canonical Loop Schema

```yaml
objective:            # What are we trying to achieve?
interval:             # How often to check (e.g., "5m", "1h")
max_runtime:          # When does this loop auto-expire? (max 3 days)
success_condition:    # What means "done, stop looping"?
failure_condition:    # What means "this is broken, escalate"?
escalation_condition: # What means "I need a human"?
allowed_actions:      # What can the loop DO? (read-only? spawn agents? edit?)
approval_required_for: # What actions need human sign-off?
artifacts_to_read:    # Files/endpoints to check each iteration
artifacts_to_write:   # Where to persist status between iterations
notify_when_done:     # How to alert the user (inline message, OS notification, Slack)
```

### Example: Fully Specified Loop

```yaml
objective: "Monitor PR #247 until CI passes and no unresolved comments remain"
interval: "10m"
max_runtime: "6h"
success_condition: "CI green AND 0 unresolved review comments"
failure_condition: "Same test failing 3 consecutive checks"
escalation_condition: "New review comments requesting architectural changes"
allowed_actions:
  - read PR status via gh
  - spawn worktree subagent to fix lint/type/test failures
  - post fix commits to PR branch
approval_required_for:
  - schema changes
  - auth/RLS modifications
  - changes to files outside PR scope
artifacts_to_read:
  - "gh pr view 247 --json state,reviewDecision,statusCheckRollup"
  - "gh pr view 247 --json comments"
artifacts_to_write:
  - "tmp/loop-status/pr-247.md"
notify_when_done: "inline summary with PR URL"
```

---

## Stop Conditions and Escalation Policy

### Every Loop MUST Have an Exit

Loops without exit conditions are anti-patterns. Define:

1. **Success exit** — objective met, loop self-terminates
2. **Failure exit** — repeated failure, loop stops and reports
3. **Timeout exit** — max_runtime reached, loop summarizes and stops
4. **Escalation exit** — situation requires human judgment, loop pauses and asks

### Escalation Tiers

| Tier | Trigger | Action |
|------|---------|--------|
| **Auto-resolve** | Lint failure, type error, simple test fix | Spawn worktree agent, fix, push |
| **Auto-resolve + notify** | Flaky test, transient deploy failure | Fix and tell user what happened |
| **Pause + summarize** | Same failure 3+ times, unknown error | Stop loop, write incident summary |
| **Hard stop + ask** | Auth changes, schema migration, RLS policy, billing | Stop immediately, present options |

### Failure Budget

If the same check fails **3 consecutive iterations** with no progress:
1. Stop the loop
2. Write a root-cause summary to `tmp/loop-status/`
3. Report to user with diagnosis and recommended next steps
4. Do NOT keep polling hoping it fixes itself

---

## Human Approval Thresholds

### Auto-safe (no approval needed)

- Reading status (PR, deploy, build logs)
- Summarizing and reporting
- Running local tests
- Re-running lint/typecheck
- Reading files for comparison

### Safe with worktree isolation

- Fixing lint/type/test failures
- Applying suggested review changes
- Updating non-critical config

### ALWAYS requires approval

- Database schema changes (migrations)
- Auth/RLS policy modifications
- Billing/payment/entitlement changes
- Production config or environment variables
- Secrets or credential handling
- Deleting files, branches, or data
- Modifying CI/CD pipelines
- Changes to files outside the loop's stated scope
- Force pushes or history rewrites

**Rule:** When in doubt, pause and ask. The cost of asking is low. The cost of unauthorized production changes is high.

---

## State and Artifact Conventions

### Directory Structure

```
tmp/
  loop-status/          # Current state of active loops (overwritten each iteration)
    pr-247.md
    deploy-watch.md
    ralph-supervisor.md
  loop-history/         # Append-only log of all iterations
    2026-03-08-pr-247.jsonl
    2026-03-08-deploy-watch.jsonl
```

### Status File Format (tmp/loop-status/{task}.md)

```markdown
# Loop: {objective}
## Last Check: {timestamp}
## Status: WATCHING | SUCCESS | FAILING | ESCALATED | EXPIRED
## Iteration: {n} of {max}

### Current State
{1-3 line summary}

### Delta Since Last Check
{what changed}

### Blockers
{none | list}

### Confidence: HIGH | MEDIUM | LOW
### Next Action: {what the loop will do next}
### Escalation: NONE | PENDING | REQUIRED
```

### History File Format (tmp/loop-history/{date}-{task}.jsonl)

One JSON object per line, one line per iteration:

```json
{"ts":"2026-03-08T14:30:00Z","iter":3,"status":"WATCHING","delta":"CI still running","confidence":"HIGH","action":"recheck in 5m"}
```

### Why This Matters

- Loops run in a session with compressing context — previous iterations may be summarized
- Writing state to disk gives each iteration access to what happened before
- History files enable post-mortem analysis
- Status files prevent re-deriving everything from scratch each iteration

### State Discipline Rules

1. **Read status file FIRST** each iteration before doing anything else
2. **Compare current state vs previous** — report deltas, not absolute state
3. **Write status file LAST** each iteration after all checks complete
4. **Never delete history** — append only
5. **Clean up status files** when loop exits (success or failure)

---

## Structured Output Format

Every loop iteration MUST report in this format:

```
## Loop Iteration {n} — {objective}
**Status:** WATCHING | SUCCESS | FAILING | ESCALATED
**Delta:** {what changed since last check}
**Blockers:** {none | description}
**Confidence:** HIGH | MEDIUM | LOW
**Next:** {next action or "DONE"}
**Escalation:** {none | recommendation}
```

Keep it terse. No essays. If nothing changed, say "No change since last check" and move on.

---

## Cost and Token Discipline

### Rules

1. **Cheap checks first** — `gh pr view --json state` before reading full diff
2. **Read status file before anything** — don't re-derive what you already know
3. **Inspect diffs/logs/artifacts** — not the whole repo
4. **Cache file paths** — if you found the relevant files in iteration 1, don't glob the whole tree in iteration 5
5. **Widen scope ONLY on failure** — if the cheap check shows a problem, then dig deeper
6. **Terse routine output** — when everything is fine, say so in 2 lines
7. **Verbose only on state change** — expand output when something actually changes
8. **Avoid re-reading CLAUDE.md every iteration** — you have it in context
9. **Prefer `--json` flags** — structured output is cheaper to parse than full text

### Cost Estimation

| Loop Type | Tokens/Iteration (approx) | Cost Guidance |
|-----------|---------------------------|---------------|
| Status check (gh, curl) | 500-2K | Run frequently (2-5m) |
| Log analysis | 2-5K | Run moderately (10-20m) |
| Code comparison/diff | 5-15K | Run infrequently (30m-1h) |
| Full smoke test suite | 15-50K | Run sparingly (1-2h) |

Match interval to cost. Don't run expensive checks every 2 minutes.

---

## Anti-Patterns — Do NOT Use /loop For

### Hard No

| Anti-Pattern | Why | Use Instead |
|-------------|-----|-------------|
| Feature implementation | Loops monitor, they don't build | Ralph |
| Wide refactors | Too much state, too many files | Subagent or manual |
| Anything needing restart persistence | Session-scoped = ephemeral | CI / Desktop scheduled |
| Polling expensive endpoints every minute | Waste of tokens and API calls | Longer intervals or webhooks |
| Tasks that should be webhooks/hooks | Event-driven != periodic | Hooks |
| Prod infra mutations without approval | Dangerous | Manual with approval |
| Parallel file edits across worktrees | Merge conflict factory | Sequential or coordinated |
| "Just keep trying until it works" | Infinite loop with no learning | Diagnose root cause first |

### Smell Tests

- If you're checking more than 10 files per iteration → too broad, narrow scope
- If every iteration output is identical → nothing is changing, widen interval or stop
- If you're spawning subagents every iteration → probably should just be a subagent
- If the loop has been running 6+ hours with no state change → it's stuck, escalate
- If you can't define a success condition → you shouldn't be looping

---

## Compound Workflow Patterns

### Pattern 1: Loop → Inspect → Subagent → Summarize

```
/loop 10m check PR #247 status. If CI fails, spawn a worktree subagent to fix it. Summarize what the agent did. Recheck on next iteration.
```

Flow: `check status → detect failure → spawn isolated fix → verify fix → report`

### Pattern 2: Loop → Compare → Escalate

```
/loop 15m read tmp/loop-status/deploy-watch.md, then check Vercel deploy status. Compare with last iteration. If same error 3x, stop and summarize root cause.
```

Flow: `read previous state → check current → diff → escalate if stuck`

### Pattern 3: Loop → Rerun Skill

```
/loop 20m /review-pr 247
```

Flow: `invoke existing skill on schedule → skill handles its own logic`

### Pattern 4: Loop → Notify on Completion

```
/loop 5m check if the Vercel deploy finished. When it does, summarize the result and tell me whether to proceed with the migration.
```

Flow: `poll → detect completion → synthesize recommendation → stop`

### Pattern 5: Loop → Gather → Digest

```
/loop 1h collect all new PR comments, Slack mentions, and failing checks. Write a digest to tmp/loop-status/standup.md.
```

Flow: `gather from multiple sources → deduplicate → write structured digest`

---

## Interval Syntax Reference

| Form | Example | Parsed |
|------|---------|--------|
| Leading token | `/loop 5m check the build` | Every 5 minutes |
| Trailing clause | `/loop check the build every 2h` | Every 2 hours |
| No interval | `/loop check the build` | Default: every 10 minutes |

Supported units: `s` (seconds, rounded up to 1m), `m` (minutes), `h` (hours), `d` (days).

Non-standard intervals (e.g., 7m, 90m) get rounded to nearest clean cron expression.

### Recommended Intervals by Task Type

| Task Type | Interval | Rationale |
|-----------|----------|-----------|
| Deploy/CI status | 2-5m | Fast feedback, cheap check |
| PR babysitting | 10-20m | Comments arrive slowly |
| Ralph supervision | 10-15m | Iterations take ~10-30m each |
| Post-deploy smoke | 5m for 30m | Short burst, then stop |
| Regression watch | 30m-1h | Expensive checks, run less |
| Daily digest | 1d (cron: `0 9 * * *`) | Once per day |

---

## Session and Restart Handling

### The Hard Truth

`/loop` is session-scoped. When the session dies, all loops die. There is no catch-up for missed fires.

### Mitigation Strategy

1. **Write state to disk every iteration** — this is non-optional
2. **Use `tmp/loop-status/` files** — they survive session death even if the loop doesn't
3. **On session restart, check for orphaned status files** — if `tmp/loop-status/deploy-watch.md` exists with status WATCHING, the user probably wants to restart that loop
4. **Recommend graduation** when a loop proves valuable:

| Loop has been... | Graduate to... |
|------------------|---------------|
| Running manually every session | Desktop scheduled task |
| Checking CI on every push | GitHub Actions workflow |
| Needed across team members | Shared CI/webhook pipeline |
| Running >2 days | Headless SDK automation |

### Handoff Template

When graduating a loop to CI:
```
This loop has been valuable. To make it durable:
1. I'll create a GitHub Actions workflow that does the same check
2. It will run on: [schedule/push/PR event]
3. It will notify via: [Slack/GitHub comment/email]
4. Should I create the workflow file?
```

---

## Chravel-Specific Loop Playbooks

See `playbooks/chravel-playbooks.md` for 15 production-ready loop templates covering:

1. PR babysitting
2. Vercel deploy monitoring
3. Supabase migration / RLS verification
4. Ralph supervision
5. Post-deploy smoke checks
6. Invite acceptance / trip recovery monitoring
7. AI concierge regression watch
8. Smart import smoke tests
9. Signed URL / media access verification
10. Billing entitlement parity checks
11. Realtime/chat rendering regression watch
12. PWA/mobile/web parity checks
13. Error budget loop
14. Vercel preview post-deploy suite
15. Morning engineering digest

Each playbook follows the canonical schema and includes the exact `/loop` command.

---

## Quick Reference

### Create a loop
```
/loop 5m check if the deployment finished
```

### List active loops
```
what scheduled tasks do I have?
```

### Cancel a loop
```
cancel the deploy check job
```

### One-shot reminder (not a loop)
```
remind me in 45 minutes to check the integration tests
```

### Limits
- Max 50 scheduled tasks per session
- 3-day auto-expiry on recurring tasks
- 1-minute minimum granularity (cron)
- Session-scoped only

---

## Implementation Checklist

When setting up a new loop:

- [ ] Defined all required parameters (objective, interval, conditions, etc.)
- [ ] Created `tmp/loop-status/{task}.md` with initial state
- [ ] Verified the check is cheap enough for the chosen interval
- [ ] Confirmed approval thresholds for any write actions
- [ ] Set a max_runtime that isn't "forever"
- [ ] Tested the check manually once before scheduling
- [ ] Confirmed the loop has a success exit condition

---

*Last Updated: 2026-03-08*
*Maintained By: AI Engineering Team + Meech*
