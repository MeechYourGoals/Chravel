# Tasks Launch Readiness Audit (Trips)

Date: 2026-02-27

## Dogfood first (requested Vercel skill)

- Attempted to install and run the requested Vercel dogfood skill via the codex `skill-installer` workflow.
- Blocker: external access to `skills.sh` / GitHub is blocked in this environment (`403 Forbidden` tunnel), so the skill cannot be installed/executed here.
- Workaround used for this audit: local code walk + targeted test execution + full build gates.

## Scope audited

- Tasks trip tab UI (desktop/mobile)
- Tasks hook + mutations + optimistic updates + realtime invalidation
- Demo mode + offline + assignment behavior
- Existing task tests and coverage gaps
- Quick dependency cross-check with media query/cache patterns

## High-risk bugs and launch blockers

### 1) Mobile completion logic breaks for demo/unauth users
**Impact:** Completed tasks can appear as incomplete in mobile task UI for demo mode users.

- `MobileTripTasks` computes completion only with authenticated `user.id`; when no user exists it hard-returns `false`.
- Desktop uses `demo-user` fallback and does not have this mismatch.

**Why this matters:** inconsistent behavior between desktop/mobile for the same demo trip is a trust-breaker in launch demos and QA.

---

### 2) “Load all tasks” logic is implemented but not reachable in UI
**Impact:** Trips with 100+ tasks will silently hide older tasks with no affordance.

- Hook limits initial fetch to `TASKS_PER_PAGE = 100` and exposes `hasMoreTasks` / `loadAllTasks`.
- Neither desktop nor mobile tasks UI uses those return values.

**Why this matters:** pro/touring use case can exceed 100 actionable tasks quickly.

---

### 3) Assignment/status writes are not transactional on create
**Impact:** partial writes can create orphan task records without matching assignment/status rows.

- Create flow inserts `trip_tasks`, then inserts `task_status`, then `task_assignments`.
- If `task_status` or `task_assignments` fails after `trip_tasks` succeeds, data becomes inconsistent until manual cleanup.

**Why this matters:** this creates subtle integrity bugs that look like random missing assignees/completion entries.

---

### 4) UI exposes edit/delete actions to all users, backend blocks some
**Impact:** non-creators can see edit/remove actions that fail at mutation time.

- `TaskRow` always renders Edit/Remove controls.
- `updateTaskMutation` and `deleteTaskMutation` enforce creator-only conditions.

**Why this matters:** avoid avoidable destructive-action failures; this is noisy and feels broken.

## Medium-risk edge cases likely to bite post-launch

1. **Cannot truly clear assignees in update path**
   - assignment/status updates run only when `assignedTo.length > 0`; empty array does not clear existing assignees.

2. **Query-key discipline drift**
   - tasks hook hardcodes `['tripTasks', tripId, isDemoMode]` in many places instead of `tripKeys.tasks(...)`.
   - today this matches, but future key migration risks stale-cache regressions.

3. **Dead/duplicate task services suggest maintenance drift**
   - `taskService` and `taskOfflineQueue` appear unreferenced.
   - duplicate pathways increase risk of future fixes being applied in one path but not the live path.

## Coverage gaps to close before GA

- Add tests for mobile demo completion behavior parity.
- Add tests for >100 tasks UX (`hasMoreTasks` surfaced and clicked).
- Add tests for assignment clear-on-edit behavior.
- Add integration-style test for partial write failure handling during create.

## Minimal, high-impact MVP additions (without overbuilding)

1. **Task ownership-aware actions (cheap, high trust)**
   - Hide/disable edit+delete for non-creators.
   - Keep RLS/backend enforcement unchanged.

2. **“Show all tasks” affordance (critical at scale)**
   - Use existing `hasMoreTasks` + `loadAllTasks` already in hook.
   - Add a compact CTA only when needed.

3. **Overdue + due-soon quick filters**
   - Reuse existing filter/sort UI; add lightweight presets.
   - Helps operators prioritize quickly in touring/corporate contexts.

4. **Atomic create RPC for task + status + assignments**
   - Single backend operation for integrity.
   - Keep current UI unchanged while removing partial-write class of bugs.

## Media dependency note

- No direct runtime dependency from Tasks UI/hook to trip media services was found in this audit.
- The main shared dependency pattern is TanStack Query cache discipline (`tripKeys` + cache config).
- Recommendation: keep media launch-readiness as a separate focused audit, since this run was Tasks-deep and only a quick cross-check for coupling.

## Suggested launch sequencing (fastest risk burn-down)

1. Fix mobile demo completion parity.
2. Expose `loadAllTasks` UI affordance.
3. Gate edit/delete by creator in UI.
4. Add regression tests for all three.
5. Follow up with atomic create RPC (can ship just after launch if needed, but before scale).
