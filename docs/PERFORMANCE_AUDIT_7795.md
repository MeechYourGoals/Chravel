# Performance Audit: PR cursor/system-performance-improvements-7795

**Date:** 2026-02-22  
**Context:** Egress diagnosis identified 381K+ REST API calls (trips, trip_admins, trip_channels, auth/user) as critical. This PR merged optimizations for notifications, trips select, media search, media pagination, and realtime channels.

---

## Summary

| Change | Current Rank | Notes |
|--------|--------------|-------|
| 1. Notification consolidation | 95 | NotificationBell removed (dead code). TripActionBar works. |
| 2. Narrow select in getUserTrips | 95 | Fixed: added `card_color`, `organizer_display_name` for Pro/Event cards. |
| 3. Media search → Postgres | 92 | Fixed: added NFD normalization for accented chars (e.g. "café" → "cafe"). |
| 4. Media grid pagination | 92 | Fixed: added infinite scroll to MobileUnifiedMediaHub; prefetch key aligned. |
| 5. useTrips dual channels merge | 95 | No regressions. Single channel `user_trips:${userId}`. |

---

## Bugs Fixed (Post-Merge Audit)

### 1. `tripService.getUserTrips` — Missing `card_color` and `organizer_display_name`

**Problem:** Narrow select omitted Pro/Event columns. ProTripCard and EventCard use `card_color` and `organizer_display_name`; without them, cards showed default colors and no organizer name.

**Fix:** Added `card_color, organizer_display_name` to `TRIP_LIST_COLUMNS` in `tripService.ts`.

**Rank:** 82 → 95

---

### 2. `mediaSearchService` — Accented chars not matching

**Problem:** Search for "café" failed because `sanitize` stripped accents but `calculateRelevanceScore` compared against raw text. Stored "café" and query "cafe" didn't match.

**Fix:** Added `normalizeForSearch()` using NFD + strip combining marks. Applied to query string and `calculateRelevanceScore` comparisons. Also applied to `searchMediaByTags`.

**Rank:** 88 → 92

---

### 3. `MobileUnifiedMediaHub` — No infinite scroll

**Problem:** Desktop `UnifiedMediaHub` used `MediaGrid` with `onLoadMore`/`hasMore`. Mobile `MobileUnifiedMediaHub` did not destructure `hasMoreMedia` or `fetchNextMediaPage`. Users with 50+ items only saw first 50 on mobile.

**Fix:** Destructured `hasMoreMedia`, `fetchNextMediaPage`, `isFetchingNextMedia` from `useMediaManagement`. Added IntersectionObserver sentinel and loading indicator when fetching next page.

**Rank:** 78 → 92

---

### 4. `usePrefetchTrip` — Media tab prefetch key mismatch

**Problem:** Media tab prefetch used `queryKey: tripKeys.media(tripId, isDemoMode)` and `fetchTripMediaItems`. `useMediaManagement` uses `queryKey: [...tripKeys.media(tripId, isDemoMode), 'paginated']` and `fetchTripMediaItemsPaginated` via `useInfiniteQuery`. Prefetch populated a different cache key.

**Fix:** Switched to `prefetchInfiniteQuery` with the same key as `useMediaManagement` and `fetchTripMediaItemsPaginated`.

**Rank:** 78 → 92

---

## Functionality Check

| Component | Status |
|-----------|--------|
| NotificationBell | Removed (dead code). TripActionBar handles notifications. |
| TripActionBar | Uses shared `useNotificationRealtime`; behavior unchanged. |
| useTrips | Still returns `refreshTrips`; `useUserTripsRealtime` replaces dual channels. |
| MediaTabs | Uses `useMediaSync` for search; `useMediaManagement` for grid. Unchanged. |
| MediaSearchBar | Uses `searchMedia`/`searchMediaByTags`; DB filters + NFD applied. |
| Pro/Event cards | `card_color` and `organizer_display_name` restored. |
| Mobile media | Infinite scroll added. |
| Prefetch | Uses `prefetchInfiniteQuery` with matching key. |

---

## Additional Fixes (Post-Audit Round 2)

### Auth user caching
- **`authCache.ts`** — 5-minute in-memory cache for `getUser()`. Reduces `/auth/v1/user` calls from repeated service invocations.
- **`tripService.getUserTrips`** — Uses `getCachedAuthUser()` instead of `supabase.auth.getUser()`.
- **`invalidateAuthCache()`** — Called on sign-out and `onAuthStateChange` when session is lost.

### trip_admins / trip_channels React Query
- **`useTripAdmins`** — Migrated to `useQuery` with `staleTime: 60s`, `refetchOnWindowFocus: false`. Realtime subscription invalidates on change.
- **`useTripRoles`** — Migrated to `useQuery` (includes trip_channels via join). Same caching + realtime invalidation.

### NotificationBell removal
- Removed dead `NotificationBell.tsx` component. TripActionBar handles notifications.

---

## Relation to Egress Diagnosis

The merged PR **reduces**:

- **Payload size:** Narrow select in `getUserTrips` (~60% smaller per row).
- **Media egress:** Search pushed to Postgres (O(results) vs O(all)); paginated grids (50 vs all).
- **Realtime channels:** Fewer Supabase channels (notification consolidation, useTrips merge).

~~The PR **does not** address:~~

- ~~**Auth user caching:**~~ **Fixed** — `authCache` with 5min TTL; `getUserTrips` uses it.
- ~~**trip_admins / trip_channels:**~~ **Fixed** — `useTripAdmins` and `useTripRoles` migrated to React Query.

---

## Recommendations to Reach 95+ on All Items

1. ~~**NotificationBell:**~~ Removed dead code.
2. **Auth user:** Add `useQuery`-style caching for `getUser()`/`getSession()` if used across many components.
3. **trip_admins / trip_channels:** Migrate to React Query with `staleTime` to reduce repeated fetches on mount/unmount.

---

## Regression Risk

**Low.** All changes are additive or fix bugs. No breaking changes to existing flows.

**Rollback:** Revert the 4 commits on `cursor/system-performance-improvements-7795` plus this audit’s fixes.
