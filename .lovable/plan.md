

# Calendar Timeout: Root Cause Analysis & Fix Plan

## The Problem
The Calendar tab shows "Couldn't load calendar — Failed to load calendar events: Timeout" after 10 seconds. This is one of the most critical features.

## Root Cause Analysis

The timeout chain in `getTripEvents()` (calendarService.ts:340-421) executes **4 sequential async operations** before the actual Supabase query even runs:

```text
1. demoModeService.isDemoModeEnabled()     — async localStorage + secureStorage read
2. offlineSyncService.getCachedEntities()  — IndexedDB open + full scan + filter
3. supabase.auth.getUser()                 — network round-trip to Supabase auth
4. supabase.from('trip_events').select()   — actual data query
```

All 4 are sequential, and all 4 must complete within the **10-second `withTimeout`** wrapper in `useCalendarEvents.ts:47-51`.

### Why it times out:
- **`getUser()` is the bottleneck.** On cold start or flaky connections, `supabase.auth.getUser()` makes a network call to validate the JWT. If Supabase auth is slow or the device has marginal connectivity, this alone can take 5-8 seconds.
- **IndexedDB `getCachedEntities`** does a full table scan with `getAllFromIndex` then filters in JS — adds 100-500ms on mobile.
- **`isDemoModeEnabled`** cascades through localStorage → secureStorageService (another IndexedDB read) — adds 50-200ms.
- **Only 1 retry** (`retry: 1` in useCalendarEvents.ts:97), so after the first timeout + 1 retry = 2 failures = permanent error state.
- **The catch block returns `[]` (empty array)** on failure (line 419), but the `withTimeout` wrapper **throws** before that catch runs, so the graceful fallback never executes.

### Critical design flaw:
The `withTimeout` wraps the entire `calendarService.getTripEvents()` call, but `getTripEvents` has its own internal try/catch that returns `[]` on failure with cached data fallback. **The timeout kills the promise before the fallback logic can execute.**

## Fix Plan

### 1. Decouple auth from the query path (calendarService.ts)
Move `getUser()` out of the hot path. Use `supabase.auth.getSession()` (synchronous/cached) instead of `getUser()` (network call). The session JWT is already validated client-side and is sufficient for RLS queries.

### 2. Parallelize pre-query checks (calendarService.ts)
Run `isDemoModeEnabled()` and `getCachedEntities()` in parallel with `Promise.all` instead of sequentially.

### 3. Increase timeout + add progressive strategy (useCalendarEvents.ts)
- Increase timeout from 10s → 15s
- Add `retry: 2` with exponential backoff (`retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000)`)
- Show cached/stale data immediately while refetching in background

### 4. Fix the fallback short-circuit (useCalendarEvents.ts + calendarService.ts)
The `withTimeout` wrapper prevents the internal catch block from returning cached data. Fix by:
- Moving the cache read **before** the timeout wrapper
- If cache exists, return it immediately and refetch in background
- Only apply timeout to the network fetch, not the full function

### 5. Skip IndexedDB cache read when online (calendarService.ts)
Follow the pattern already used in `useTripPolls.ts:162-163`: only read from IndexedDB when `navigator.onLine === false`. This eliminates 100-500ms of unnecessary I/O on the happy path.

## Files to Edit

| File | Change |
|------|--------|
| `src/services/calendarService.ts` | Replace `getUser()` with `getSession()`, parallelize checks, skip cache when online |
| `src/features/calendar/hooks/useCalendarEvents.ts` | Increase timeout to 15s, retry 2x with backoff, serve stale data during refetch |

## Expected Impact
- **Happy path**: ~200ms faster (skip IndexedDB + use cached session)
- **Degraded network**: Shows cached data immediately instead of timeout error
- **Retry resilience**: 3 total attempts (initial + 2 retries) with backoff instead of 2

