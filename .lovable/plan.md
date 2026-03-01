

# Fix Places Explore Tab: Loading Spinner + Performance

## Problem Summary
Three issues identified in the Places > Explore tab:

1. **White spinner instead of yellow/gold** -- `TripLinksDisplay.tsx` uses a plain white `border-white` spinner while every other tab uses the branded `border-primary` (gold) spinner
2. **Slow loading / timeout** -- The Explore sub-tab fetches from `trip_links` table with a 15-second timeout, and this query appears to be timing out for real trips
3. **Tab switching doesn't help** -- PlacesSection keeps both sub-tabs mounted via `display: none`, so switching away never unmounts/remounts the Explore tab. The failed query with `retry: 1` stays in error state permanently

## Root Cause

- `TripLinksDisplay.tsx` line 372-381: Custom white spinner (`border-b-2 border-white`) instead of the standard branded spinner
- `PlacesSection.tsx` line 225: `display: none` keeps LinksPanel/TripLinksDisplay alive even when viewing Base Camps, preventing recovery via tab switching
- `TripLinksDisplay.tsx` line 199: `retry: 1` means after initial failure + 1 retry, the query is permanently stuck in error state until manual refetch

## Fix Plan

### 1. Fix the loading spinner color (TripLinksDisplay.tsx)

Replace the white spinner (lines 374-379) with the standard branded spinner matching `DefaultTabSkeleton`:

```text
Before:  border-b-2 border-white
After:   border-4 border-primary/30 border-t-primary
```

Also add "Loading..." text below for consistency with other tabs.

### 2. Add refetch-on-tab-switch for Explore (PlacesSection.tsx)

When the user switches to the "links" (Explore) tab and the query is in error state, automatically trigger a refetch. This makes tab-switching a recovery mechanism:

- Pass a `isActive` prop or use a callback so that when `activeTab` changes to `'links'`, if the TripLinksDisplay query is in error state, it refetches
- Alternatively, add `refetchOnMount: 'always'` or switch from `display: none` to conditional rendering for the Explore tab only (since it doesn't benefit from staying mounted like Base Camps does)

The simplest approach: keep `display: none` for Base Camps (which has map state worth preserving) but use conditional rendering for Explore (which is just a list). This way switching tabs remounts TripLinksDisplay and triggers a fresh query.

### 3. Improve error recovery (TripLinksDisplay.tsx)

- Increase `retry` from 1 to 2 for better resilience
- Add `refetchOnWindowFocus: true` so returning to the browser retries
- Reduce timeout from 15s to 10s for faster error surfacing

## Files to Change

| File | Change |
|---|---|
| `src/components/places/TripLinksDisplay.tsx` | Fix spinner color; adjust retry/timeout config |
| `src/components/PlacesSection.tsx` | Switch Explore from `display: none` to conditional render for remount recovery |

## Technical Details

### TripLinksDisplay.tsx spinner fix (line 372-381)

Replace the loading block with:
```tsx
if (loading) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"
          aria-label="Loading links"
          data-testid="trip-links-loading"
        />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
```

### TripLinksDisplay.tsx query config (line 185-201)

```tsx
retry: 2,
retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
refetchOnWindowFocus: true,
```

Reduce `FETCH_TIMEOUT_MS` from 15000 to 10000.

### PlacesSection.tsx tab rendering (lines 225-247)

Change Explore from `display: none` to conditional rendering:

```tsx
{/* Base Camps -- keep mounted via display:none (preserves map state) */}
<div style={{ display: activeTab === 'basecamps' ? 'block' : 'none' }}>
  <BasecampsPanel ... />
</div>

{/* Explore -- conditional render (remounts on tab switch for recovery) */}
{activeTab === 'links' && (
  <LinksPanel ... />
)}
```

## Invariants Preserved
- Auth-gated trip access unchanged
- RLS policies unchanged
- No new network calls on mount (Explore only fetches when its tab is active)
- Base Camps still preserves state via display:none
- Demo mode behavior unchanged

## Manual Test Checklist
- [ ] Click Places tab, then Explore -- spinner should be gold/yellow, not white
- [ ] If Explore times out, switch to Base Camps and back -- should retry automatically
- [ ] Logged-in user: Explore loads links from trip_links table
- [ ] Demo mode: Explore loads mock links correctly
- [ ] Base Camps state (map, basecamp selections) preserved when switching sub-tabs

## Regression Risk: LOW
Rollback: Revert the 2 files to restore previous behavior.
