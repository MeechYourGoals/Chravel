

## Root Cause Analysis

The card order inconsistency has **one core bug** with two contributing factors:

### Bug: Race condition — remote order arrives too late, never re-applied

Here's what happens on login:

```text
Timeline:
  t0  Component mounts → useEffect kicks off fetchRemoteOrder (async)
  t1  Items arrive from React Query → applyOrder runs
      → remoteOrderRef.current is still null
      → Falls back to localStorage (stale, device-specific)
      → Cards render in WRONG order
  t2  fetchRemoteOrder resolves → sets remoteOrderRef.current
      → But remoteOrderRef is a React ref — NO re-render triggered
      → Cards stay in wrong order until next navigation
```

Because `remoteOrderRef` is a ref (not state), the component never re-renders when the correct remote order arrives. The cards are stuck in whatever order localStorage had — which is device-specific and often stale.

### Contributing factor: Module-level debounce timer

There's a single `upsertTimer` variable shared across all hook instances. If a user switches between My Trips → Pro → Events quickly, the debounce timers clobber each other, potentially dropping saves.

### Contributing factor: Silent upsert failures

The `catch {}` block in `debouncedUpsert` swallows all errors. If the upsert fails (network, RLS, etc.), the user has no idea their reorder didn't persist.

---

## Fix Plan

### 1. Convert `remoteOrderRef` to state so remote fetch triggers re-render

Replace `remoteOrderRef` with a `useState<string[] | null>` so that when the remote order arrives, `applyOrder` re-runs via its dependency and the grid re-renders with the correct order.

### 2. Make `applyOrder` depend on remote order state

Update the `applyOrder` callback to include `remoteOrder` in its closure/deps, so it uses the freshest data.

### 3. In `SortableTripGrid`, re-apply order when `applyOrder` identity changes

The existing `useEffect` already depends on `applyOrder`, so once `applyOrder` gets a new identity from the state change, the grid will re-sort automatically.

### 4. Scope debounce timer per hook instance

Move `upsertTimer` into a `useRef` so each dashboard type gets its own independent debounce.

### 5. Add error logging for failed upserts

Log upsert failures so we can diagnose persistence issues.

---

## Files Changed

- `src/hooks/useDashboardCardOrder.ts` — All changes are in this single file

## Risk

- **Low**: Single-file change, no schema changes, no RLS changes.
- The fix makes the existing Supabase fetch actually take effect in the UI.

