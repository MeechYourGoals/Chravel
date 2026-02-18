# Polls + Tasks Architecture Audit (Desktop, Mobile, Tablet)

Date: 2026-02-18
Scope: Existing implementation audit (no runtime behavior changes)

## Overall grades (0-100)

| Dimension | Polls | Tasks | Notes |
|---|---:|---:|---|
| Code elegance | 76 | 71 | Strong hook + query patterning, but duplicated concerns across view layers and some dead/placeholder code paths. |
| Functionality | 84 | 80 | Core CRUD + optimistic updates + offline queue exist; task assignment/edit workflows are partial. |
| Edge-case coverage | 72 | 75 | Good offline + conflict handling in key mutations; several permission and data-integrity edge cases remain. |
| Smoothness | 83 | 79 | Pull-to-refresh, optimistic updates, haptics, skeletons are strong; some invalidate-heavy patterns can cause visible jitter. |
| Intuitiveness | 78 | 73 | UX is mostly clear; behavior differs across mobile/desktop and some affordances are incomplete (e.g. edit task). |
| Scalability/concurrency readiness | 69 | 74 | Versioned RPC-based writes are a good start; JSON vote model and full-list invalidation limit large-scale efficiency. |

## Architecture findings by platform

### Shared data architecture
- Polls and tasks are centralized in hooks (`useTripPolls`, `useTripTasks`) using TanStack Query with cache + mutation flows. 
- Both implement optimistic mutation patterns and offline queue/cached fallback paths.
- Tasks add explicit optimistic-locking retries via server version checks and conflict mapping.

### Desktop
- Desktop tab surfaces route through `TripTabs` into `CommentsWall` (polls) and `TripTasksTab` (tasks).
- The desktop tasks view is richer in filters/grouping than mobile.

### Mobile/tablet
- App routes tablet widths (<1024) through mobile (`useIsMobile`), so tablet uses mobile task UX by design.
- Mobile task UX uses swipe actions and pull-to-refresh (`MobileTripTasks`) and does not expose the same filter controls as desktop.
- Polls on mobile are rendered through `CommentsWall` as well, giving mostly shared behavior.

## Bugs / cleanup issues to fix

1. **Task delete authorization appears too broad at application layer**
   - Code comment says “any trip member can delete” and client does plain delete by `id`, which is risky unless fully constrained by RLS/policy.

2. **Task assignment API surface is placeholder / non-functional**
   - `assignTask` and `bulkAssign` return success toast paths without actual persistence.

3. **Task editing is exposed but not implemented**
   - `TripTasksTab` “edit” actions only toast “future update,” which creates dead-end UX.

4. **Poll voting makes one RPC call per option**
   - Multi-select poll votes loop over options and call RPC repeatedly, which amplifies contention and latency.

5. **Poll option IDs are deterministic (`option_${index}`) at create time**
   - Predictable IDs can complicate merges/migrations and can be brittle if option order mutates.

6. **Potential membership/permission drift for polls**
   - Poll creation enforces authenticated user, but does not mirror task `ensure_trip_membership` pattern.

7. **Invalidate-heavy refresh strategy for high traffic**
   - Many mutations do full query invalidation; at scale this may trigger frequent refetch/repaint churn for busy trips.

## Production readiness plan (10 users → 100k+ MAU)

### P0 (must-do)
1. **Enforce authz in DB for every write path**
   - Validate strict RLS for `trip_tasks`, `task_status`, `trip_polls`, and vote/close/delete RPCs.
   - Replace any “client-trust” assumptions with policy-backed checks.

2. **Finish task assignment + edit flows end-to-end**
   - Implement assignment persistence and audit fields.
   - Add task update mutation + UI form, remove placeholder toast-only affordances.

3. **Batch voting RPC for multi-select polls**
   - Introduce single atomic RPC taking `option_ids[]`, version, and policy checks.
   - Return authoritative poll snapshot + new version in one roundtrip.

4. **Real-time consistency for polls/tasks**
   - Add/verify channel subscriptions for both entities and reconcile with optimistic state.
   - Use conflict-aware merge strategy rather than blanket invalidation where possible.

### P1 (should-do)
1. **Query key normalization and cache strategy hardening**
   - Include mode/context dimensions consistently in query keys.
   - Move from broad invalidations to targeted `setQueryData` merges for known rows.

2. **Observability + SLO instrumentation**
   - Emit metrics for mutation latency, conflict rate, offline queue depth, replay success, and UI stale-age.
   - Add alerting thresholds for failed replay and conflict spikes.

3. **Performance at large trip sizes**
   - Server pagination/cursoring for poll/task histories.
   - Virtualized rendering for long task lists and high-option polls.

4. **Cross-device parity pass (desktop/mobile/tablet)**
   - Decide explicit tablet UX target: mobile parity or hybrid.
   - Align filter/sort affordances where feature parity is expected.

### P2 (nice-to-have, high leverage)
1. **Domain service extraction**
   - Pull business logic from UI hooks into tested domain services for cleaner separation and easier regression control.

2. **Idempotency + dedupe keys for queued operations**
   - Add operation keys for exactly-once semantics during reconnect storms.

3. **Load testing + chaos test suite**
   - Synthetic concurrency tests for vote/task toggle conflicts and reconnect replay behavior.

## Edge-case handling policy recommendations

- **Offline**: Keep optimistic state visible; surface queued badge + sync status per item.
- **Conflict**: Present non-destructive retry, show “latest won” diff where applicable.
- **Permission loss mid-session**: Detect 403/RLS denial and degrade UI controls immediately.
- **Deleted/archived trip while active**: Auto-navigate with contextual toast and recovery link.
- **Massive list sizes**: Auto-switch to paginated/virtualized mode and debounce expensive filters.

## Suggested target after remediation
- Polls: low-90s across functionality/smoothness/intuitiveness, high-80s scalability.
- Tasks: low-90s functionality, high-80s elegance/intuitiveness, high-80s scalability.

