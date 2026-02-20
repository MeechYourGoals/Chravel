# Cache Invalidation & Immediate Update Analysis

> **Problem:** Updates (payments, basecamps, polls, tasks, smart import) don't appear immediately—users often need to refresh or exit/re-enter the trip to see changes.

## Root Cause Summary

The app uses **TanStack Query** for server state. Updates fail to appear immediately when:

1. **Mutation doesn't invalidate the query cache** — The mutation saves to DB but never calls `queryClient.invalidateQueries()` or `setQueryData()`, so the UI keeps showing stale cached data.
2. **Local state instead of cache** — Some features use `useState` + callback to update a parent, but the TanStack Query cache (used by prefetch, other tabs, or remounts) is never updated.
3. **Query key mismatch** — Invalidation uses a different key shape than the query (e.g. `['personalBasecamp', tripId]` vs `['personalBasecamp', tripId, userId]`). Partial keys work in TanStack Query v5, but consistency helps.
4. **No optimistic update** — Invalidation triggers a refetch, which can take 1–3 seconds. Without optimistic update, the UI shows old data until the refetch completes.
5. **Tab switching / prefetch** — When switching tabs, prefetched data may be stale. If the mutation didn't invalidate, the prefetched cache is wrong.

---

## Feature-by-Feature Audit

### ✅ Payments (Fixed)
- **Before:** Form reset immediately, no loading state, no cache update after save.
- **After:** Optimistic `setQueryData` on success, loading state, form only resets on success.
- **Hooks:** `usePayments`, `paymentService.createPaymentMessage`
- **Query key:** `tripKeys.payments(tripId)`

### ❌ Personal Basecamp (Gap)
- **Issue:** `BasecampsPanel` saves via `basecampService.upsertPersonalBasecamp()` and calls `setPersonalBasecamp()` (local state). The **usePersonalBasecamp** TanStack Query cache is never invalidated.
- **Impact:** When user switches tabs, navigates away and back, or PlacesSection remounts, they see stale data from the cache.
- **Fix:** Invalidate `['personalBasecamp', tripId, userId]` after save/delete.

### ✅ Trip Basecamp (OK)
- **Implementation:** `useUpdateTripBasecamp` uses optimistic update + delayed invalidation (2s).
- **Note:** The 2s delay avoids a race where refetch returns before DB commit. Optimistic update shows correct value immediately.

### ✅ Tasks (OK)
- **Implementation:** `useTripTasks` has optimistic updates and `invalidateQueries` on mutations.
- **Query key:** `['tripTasks', tripId, isDemoMode]`

### ✅ Polls (OK)
- **Implementation:** `useTripPolls` invalidates on create/vote/update.
- **Query key:** `['tripPolls', tripId, isDemoMode]`

### ⚠️ Calendar / Smart Import (Partial)
- **Implementation:** `CalendarImportModal` invalidates `tripKeys.calendar(tripId)` and calls `onImportComplete` → `refreshEvents()`.
- **Potential gap:** If import runs in background or modal closes before refetch completes, user might briefly see old data. Invalidation should trigger refetch for active observers.
- **Event Agenda/Lineup:** Use `['event-agenda', eventId]` and `['event-lineup', eventId]`. Verify import modals invalidate these.

### ⚠️ Places / Trip Links
- **Implementation:** `TripLinksDisplay` uses `setQueryData` for add/update/delete. Good.
- **PlacesSection** uses `useState` for places from `trip_link_index`; `placesRefreshTrigger` forces reload. Pull-to-refresh invalidates. Add-place flow may need cache update.

---

## Recommended Pattern

For every mutation that affects displayed data:

1. **Optimistic update (preferred):** `queryClient.setQueryData(key, newValue)` immediately so the UI updates before the server responds.
2. **On success:** Either keep the optimistic value (if correct) or `invalidateQueries` to refetch and confirm.
3. **On error:** Rollback with `queryClient.setQueryData(key, context.previousValue)`.
4. **Fallback:** If optimistic update is complex, at minimum call `queryClient.invalidateQueries({ queryKey })` on success so a refetch runs.

---

## Query Key Reference

| Feature           | Query Key                               | Source                    |
|-------------------|-----------------------------------------|---------------------------|
| Payments          | `tripKeys.payments(tripId)`             | usePayments               |
| Payment balances  | `tripKeys.paymentBalances(tripId, userId)` | useBalanceSummary       |
| Trip basecamp     | `tripBasecampKeys.trip(tripId)`         | useTripBasecamp           |
| Personal basecamp | `['personalBasecamp', tripId, userId]`   | usePersonalBasecamp        |
| Tasks             | `['tripTasks', tripId, isDemoMode]`     | useTripTasks              |
| Polls             | `['tripPolls', tripId, isDemoMode]`     | useTripPolls              |
| Calendar          | `tripKeys.calendar(tripId)`             | useCalendarManagement     |
| Trip links        | `['tripLinks', tripId]`                 | TripLinksDisplay          |
