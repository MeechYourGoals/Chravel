
Objective
Make trip/event deletion reliable and immediate on the home page (no manual refresh), across consumer/pro/event cards and mobile/desktop flows.

What the deeper dive found (exact causes)
1) Creator-delete logic is inconsistent and often wrong
- `tripService.getUserTrips()` always includes trips where `created_by = activeUserId` (owner trips).
- Current “delete for me” implementation (`archiveService.deleteTripForMe`) only removes a row from `trip_members`, not the `trips` row.
- For creators, removing membership does not remove ownership, so the trip stays visible after refetch.

2) Pro/Event cards lose creator context during delete decisions
- `TripGrid` pro swipe path builds a fake trip with only `{id,title}` (`handleProTripSwipeDelete`), so `created_by` is missing.
- That makes creator checks false and routes creators into `deleteTripForMe` (wrong path).

3) Deletion logic is fragmented across multiple direct service calls
- `TripCard`, `TripGrid` swipe delete, `MobileTripDetail`, `MobileProTripDetail`, `MobileEventDetail`, `EventCard`, and `MobileEventCard` each implement delete behavior differently.
- Some use hooks (`useEvents`/`useProTrips`), some call `archiveService` directly, resulting in inconsistent cache updates and UX.

4) Event/Pro mutation hooks are structurally stale
- `useEvents` and `useProTrips` query fns currently return `[]` placeholders, while homepage data actually comes from `useTrips`.
- Their mutation invalidations (`events`, `proTrips`) don’t align with the home list source-of-truth (`trips`).

Implementation plan (multi-workstream / “multiple agents” approach)
Workstream A — Canonical deletion decision engine
- Add a single shared helper (e.g. `src/services/tripDeletionService.ts`) that decides action from context:
  - If creator + consumer free tier → archive.
  - If creator + pro/event/paid tier → archive (or hard-delete only if we explicitly support and secure that path).
  - If non-creator member → leave trip (`deleteTripForMe`).
- Return a typed result (`'archived' | 'left'`) so UI messages are accurate.
- Stop relying on inferred creator state from partial objects.

Workstream B — Unify all UI entry points onto one mutation path
- Replace all direct delete logic in:
  - `src/components/TripCard.tsx`
  - `src/components/home/TripGrid.tsx`
  - `src/components/EventCard.tsx`
  - `src/components/MobileEventCard.tsx`
  - `src/pages/MobileTripDetail.tsx`
  - `src/pages/MobileProTripDetail.tsx`
  - `src/pages/MobileEventDetail.tsx`
- Route all through one hook (extend `useTrips` or create `useDeleteTripAction`) that:
  - Performs optimistic removal from `['trips', userId, isDemoMode]` immediately.
  - Executes canonical action (archive vs leave).
  - Rolls back on error.
  - Invalidates `['trips']` on settled.

Workstream C — Immediate home-page consistency guarantees
- In optimistic step, remove item from cache before request resolves.
- Keep existing `refreshTrips()` callback, but make it backup, not primary UX mechanism.
- Ensure every success path also invalidates `['trips']` (single source-of-truth for home list).
- Keep one toast contract:
  - archived path: “Trip archived”
  - left path: “Removed from your account”
  - error path with actionable reason (auth, permission, network).

Workstream D — Pro/Event alignment cleanup
- Either:
  1) migrate Pro/Event card mutations to the same canonical delete hook, or
  2) make `useEvents`/`useProTrips` derive from `useTrips` and invalidate `['trips']` too.
- Add `created_by` to pro/event transformed card data where needed for deterministic creator logic.

Workstream E — Observability + hardening
- Add structured client logs (dev only) in delete flow:
  - `tripId`, `viewMode`, `isCreator`, chosen action, Supabase error code/message.
- Improve `archiveService.deleteTripForMe` errors:
  - distinguish auth failure, RLS denial, and “no membership row”.
- Optional safety RPC (later): server-side `leave_or_archive_trip` with `auth.uid()` trust only, to eliminate client ambiguity.

Validation checklist (must pass)
1) Consumer creator deletes from home card → card disappears instantly, remains gone after refresh.
2) Consumer member deletes from home card → card disappears instantly, remains gone after refresh.
3) Pro creator deletes from home card → archive path chosen, card disappears instantly.
4) Event creator deletes from home card → archive path chosen, card disappears instantly.
5) Mobile detail-page delete for trip/pro/event → redirect home and item is already absent without pull-to-refresh.
6) Undo path in swipe delete still works and rollback restores card correctly if request fails.
7) No regressions in archived filter visibility.
8) Verify on desktop + mobile viewport + PWA refresh behavior.

Risk notes
- Highest-risk area is changing delete semantics for creators; we will preserve current policy intent by using archive for creators unless explicit hard-delete is approved.
- This plan avoids DB schema changes and focuses on deterministic client behavior + cache correctness first.

Deliverable order
1) Canonical delete action helper + typed result.
2) Unified mutation hook with optimistic cache update + rollback.
3) Migrate all delete entry points.
4) Pro/Event creator-context fixes.
5) Logging + end-to-end verification pass.
