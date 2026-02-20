## Cache invalidation & “refresh to see it” deep dive

Chravel uses **TanStack Query** as the canonical client cache for server state. When users report:

- “I added X but don’t see it until refresh”
- “I have to exit the trip and come back”
- “It saved, but UI didn’t update”

…the root cause is almost always one of these:

- **Mutation doesn’t touch the cache**: data is written to Supabase, but we never call `queryClient.setQueryData()` (or `invalidateQueries()`), so UI keeps rendering stale cached data.
- **Inconsistent query keys**: the code invalidates `['personalBasecamp', tripId]` but the query is keyed as `['personalBasecamp', tripId, userId]`, so invalidation is a no-op.
- **Refetch-only UX**: invalidation/refetch can take 1–3s on mobile networks. Without an optimistic update, the UI stays stale until the refetch resolves (or appears “broken” if user navigates before it completes).

## Recommended mutation pattern (default)

For any mutation that affects data currently displayed in the UI:

- **Optimistic update** via `queryClient.setQueryData(queryKey, updater)` in `onMutate`
- **Rollback** on error using the snapshot returned by `onMutate`
- **Background reconcile** with `queryClient.invalidateQueries({ queryKey })` in `onSettled`

Minimum acceptable (when optimistic is hard): **invalidate on success**.

## Feature key map (current)

- **Payments**
  - List: `tripKeys.payments(tripId)` → `['tripPayments', tripId]` (`src/lib/queryKeys.ts`)
  - Balance: `tripKeys.paymentBalances(tripId, userId)` → `['tripPaymentBalances', tripId, userId]`

- **Trip basecamp**
  - `tripBasecampKeys.trip(tripId)` → `['tripBasecamp', tripId]` (`src/hooks/useTripBasecamp.ts`)

- **Personal basecamp**
  - `personalBasecampKeys.tripUser(tripId, userId)` → `['personalBasecamp', tripId, userId]` (`src/hooks/usePersonalBasecamp.ts`)

- **Tasks**
  - `tripKeys.tasks(tripId, isDemoMode?)` → `['tripTasks', tripId]` or `['tripTasks', tripId, isDemoMode]`

- **Polls**
  - `tripKeys.polls(tripId, isDemoMode?)` → `['tripPolls', tripId]` or `['tripPolls', tripId, isDemoMode]`

- **Calendar**
  - `tripKeys.calendar(tripId)` → `['calendarEvents', tripId]`

## Notes on “it saved but still didn’t show”

Even when a mutation **does** invalidate, users can still experience lag if:

- the UI relies on a **refetch** before showing new data, or
- invalidation targets the wrong key shape, so the visible query never refetches.

The safest default is:

- optimistic cache update for immediate UI
- invalidate in the background to converge to server truth

