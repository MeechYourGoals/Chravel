

# Speed Up Slow Travel Tabs: Payments, Places, Links, and Polls

## Root Cause Analysis

After a deep dive into every tab's data fetching pattern, here is why some tabs load fast and others feel sluggish:

### Why Chat, Calendar, and Concierge Load Fast
- **Chat** and **Calendar** use TanStack Query with prefetching baked in. When you open a trip, the system immediately pre-loads chat messages and calendar events in the background. By the time you tap those tabs, the data is already cached.
- **Concierge** is stateless -- it renders instantly with no data to fetch.

### Why Payments Is Slow (3 Sequential Waterfalls)
The Payments tab makes **4 sequential network calls** that cannot start until the previous one finishes:

```text
1. usePayments hook -> paymentService.getTripPaymentMessages()  [waits for auth]
2. PaymentsTab useEffect -> tripService.getTripMembers()         [sequential]
3. PaymentsTab useEffect -> supabase profiles query              [waits for #2]
4. PaymentsTab useEffect -> paymentBalanceService.getBalanceSummary()  [waits for #1]
```

Inside `getBalanceSummary()` there are **5 more sequential queries**:
```text
a. auth.getUser()                    [verify auth]
b. trip_members SELECT               [verify membership]
c. trip_payment_messages SELECT       [get payments]
d. payment_splits SELECT              [get splits - waits for c]
e. profiles_public + user_payment_methods SELECT  [waits for c+d for user IDs]
f. Currency conversion API calls      [per-currency, sequential]
```

That is up to **9 sequential round-trips** before anything renders. Additionally, `usePayments` uses raw `useState`/`useEffect` instead of TanStack Query, so it does not benefit from prefetching, caching, or stale-while-revalidate.

### Why Places Is Slow (Nested Waterfalls + Links Sub-Tab Remounts)
The Places tab has two problems:

1. **PlacesSection loads 3 things sequentially**: trip basecamp query, places data from `trip_link_index`, and personal basecamp -- all in separate `useEffect` calls that run one after another.

2. **Links sub-tab remounts every time**: When you switch between "Base Camps" and "Links" inside Places, the `LinksPanel` and `TripLinksDisplay` components are conditionally rendered (`{activeTab === 'links' && ...}`). This means **every time you click Links, it unmounts and remounts**, triggering a fresh `getTripLinks()` fetch. There is no caching or keep-alive.

3. **TripLinksDisplay uses raw useState/useEffect** instead of TanStack Query, so switching away and back always refetches from scratch.

### Why Polls Is Slow (Offline Cache + Mock Data Processing)
The polls hook (`useTripPolls`) does use TanStack Query, which is good. But:

1. In demo mode, it reads mock poll votes from **async platform storage** (`getStorageItem`), processes mock data, and merges storage polls -- all synchronously blocking render.
2. In authenticated mode, it reads from **IndexedDB offline cache first** (`getCachedEntities`), which is an async operation that adds latency even when online.
3. The prefetch for polls (`prefetchTab` in `usePrefetchTrip`) uses a **dynamic import** (`await import(...)`) before it can even start fetching, adding ~100-200ms of overhead.

---

## Fix Plan

### Fix 1: Convert Payments to TanStack Query with Parallel Fetching

**Files**: `src/hooks/usePayments.ts`, `src/components/payments/PaymentsTab.tsx`

**Current**: `usePayments` uses `useState` + `useEffect` with sequential fetches. `PaymentsTab` has 3 additional `useEffect` blocks that waterfall.

**Change**:
- Rewrite `usePayments` to use `useQuery` from TanStack Query with key `tripKeys.payments(tripId)`. This enables prefetching to work (the prefetch hook already targets this key but the actual hook never consumes it).
- In `PaymentsTab`, replace the 3 separate `useEffect` calls (members, balance, profiles) with a **single parallel fetch** using `Promise.all()`:
  ```
  const [members, balanceSummary] = await Promise.all([
    tripService.getTripMembers(tripId),
    paymentBalanceService.getBalanceSummary(tripId, userId)
  ]);
  ```
- Move the members query into the same TanStack Query hook (or use `useQuery` for members separately with `tripKeys.members(tripId)` which is already prefetched on trip load).

**Inside `paymentBalanceService.getBalanceSummary()`**:
- Combine the 5 sequential queries into 2 parallel batches:
  - Batch 1 (auth): `auth.getUser()` + `trip_members` membership check (parallel)
  - Batch 2 (data): `trip_payment_messages` + `profiles_public` + `user_payment_methods` (parallel, after auth passes)
  - `payment_splits` can run after we have payment IDs, but overlap with the profiles fetch

This reduces the waterfall from 9 sequential calls to 3 sequential batches.

### Fix 2: Keep Places Sub-Tabs Mounted (No Remount on Switch)

**File**: `src/components/PlacesSection.tsx`

**Current**: `{activeTab === 'links' && <LinksPanel ... />}` -- conditional rendering causes full remount.

**Change**: Use the same `display: none` pattern already proven in `MountedTabs.tsx`:
```
<div style={{ display: activeTab === 'basecamps' ? 'block' : 'none' }}>
  <BasecampsPanel ... />
</div>
<div style={{ display: activeTab === 'links' ? 'block' : 'none' }}>
  <LinksPanel ... />
</div>
```

This keeps both sub-tabs mounted after first visit. Switching between "Base Camps" and "Links" becomes instant -- no refetching, no remounting.

### Fix 3: Convert TripLinksDisplay to TanStack Query

**File**: `src/components/places/TripLinksDisplay.tsx`

**Current**: Uses `useState` + `useEffect` with `loadLinks()` that calls `getTripLinks()` on every mount.

**Change**: Replace with `useQuery`:
```
const { data: links = [], isLoading } = useQuery({
  queryKey: ['tripLinks', tripId],
  queryFn: () => getTripLinks(tripId, isDemoMode),
  staleTime: 2 * 60 * 1000,  // 2 minutes
  gcTime: 10 * 60 * 1000,     // 10 minutes
});
```

Benefits: cached across remounts, prefetchable, stale-while-revalidate behavior. Combined with Fix 2 (keep mounted), the Links panel will load once and stay cached.

### Fix 4: Parallel Data Loading in PlacesSection

**File**: `src/components/PlacesSection.tsx`

**Current**: Three separate `useEffect` blocks that each independently fetch data (places, personal basecamp, realtime subscription). The places fetch and personal basecamp fetch run in parallel by accident (separate effects) but both block their own render paths.

**Change**: Combine the places + personal basecamp fetches into a single `useEffect` with `Promise.all()`:
```
useEffect(() => {
  const loadData = async () => {
    const [placesResult, basecampResult] = await Promise.all([
      loadPlaces(),
      loadPersonalBasecamp()
    ]);
    setPlaces(placesResult);
    setPersonalBasecamp(basecampResult);
  };
  loadData();
}, [tripId, isDemoMode]);
```

### Fix 5: Remove Polls Offline-Cache Overhead When Online

**File**: `src/hooks/useTripPolls.ts`

**Current**: Even when online, the polls query first reads from IndexedDB cache (`getCachedEntities`), adding ~50-200ms of latency before the actual Supabase fetch starts.

**Change**: Skip the IndexedDB read when `navigator.onLine === true`:
```
// Only read from cache when offline
if (navigator.onLine === false) {
  const cachedEntities = await getCachedEntities(...);
  if (cachedEntities.length > 0) return cachedPolls;
}

// Online: go straight to Supabase
const { data, error } = await supabase.from('trip_polls')...
```

Still cache results for offline use after fetching, but don't block the online path.

### Fix 6: Add Places to Prefetch Pipeline

**File**: `src/hooks/usePrefetchTrip.ts`

**Current**: The `prefetchTab` function has `case 'places': break;` (no-op). Places data is never prefetched.

**Change**: Add prefetch for trip links when hovering/visiting the Places tab:
```
case 'places': {
  queryClient.prefetchQuery({
    queryKey: ['tripLinks', tripId],
    queryFn: () => getTripLinks(tripId, false),
    staleTime: QUERY_CACHE_CONFIG.places.staleTime,
  });
  break;
}
```

### Fix 7: Remove Dynamic Imports from Prefetch

**File**: `src/hooks/usePrefetchTrip.ts`

**Current**: Several prefetch cases use `await import(...)` before they can start fetching. This adds module-load latency to what should be a fast cache-warming operation.

**Change**: Import `supabase` at the top of the file (it is already imported transitively through services) and use it directly in prefetch cases, removing the 5 dynamic imports.

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `src/hooks/usePayments.ts` | Convert to TanStack Query | Payments benefits from prefetch cache; no re-fetch on tab revisit |
| `src/components/payments/PaymentsTab.tsx` | `Promise.all()` for members + balance | Removes 3 sequential waterfalls |
| `src/services/paymentBalanceService.ts` | Parallel query batches inside `getBalanceSummary` | Cuts 9 round-trips to 3 batches |
| `src/components/PlacesSection.tsx` | `display:none` instead of conditional render; `Promise.all()` for parallel loading | Instant sub-tab switching; faster initial load |
| `src/components/places/TripLinksDisplay.tsx` | Convert to `useQuery` | Links cached across visits; prefetchable |
| `src/hooks/useTripPolls.ts` | Skip IndexedDB read when online | Removes 50-200ms overhead for polls |
| `src/hooks/usePrefetchTrip.ts` | Add places prefetch; remove dynamic imports | Places data pre-warmed; faster prefetch across all tabs |

**Expected outcome**: Every tab (Chat, Calendar, Concierge, Media, Payments, Places, Polls, Tasks) loads within 200-300ms of first click. Links and Base Camps sub-tabs within Places switch instantly. Revisiting any tab is near-instant due to TanStack Query cache.

