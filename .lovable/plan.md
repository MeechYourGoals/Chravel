
# Speed Optimization Plan for Chravel (PWA / Mobile / Capacitor)

## Problem Summary

After thorough codebase analysis, I identified **5 concrete bottlenecks** causing perceived slowness when switching between tabs and loading sub-features. The good news: your architecture already has strong foundations (lazy loading, MountedTabs with `display:none`, TanStack Query caching, content-aware skeletons). The issues are gaps in that architecture.

---

## Bottleneck 1: Mobile Does NOT Prefetch Priority Tabs on Trip Load

**Impact**: Every tab click on mobile triggers a fresh network request the first time.

Desktop (`TripTabs.tsx` line 74-78) calls `prefetchPriorityTabs(tripId)` on mount, which pre-loads Chat, Calendar, and Tasks data in the background. Mobile (`MobileTripTabs.tsx`) only prefetches on hover/focus -- which doesn't happen on touch devices. Users tap, then wait.

**Fix**: Add `prefetchPriorityTabs(tripId)` call to `MobileTripTabs.tsx` on mount, matching the desktop pattern. This means by the time someone taps Calendar or Tasks, the data is already cached.

---

## Bottleneck 2: Payments Uses Raw useEffect/useState Instead of TanStack Query

**Impact**: Payments data is fetched from scratch every time the tab mounts. No cache, no prefetch, no instant re-visit.

`MobileTripPayments.tsx` (702 lines) uses a manual `useEffect` + `useState` pattern with `setIsLoading(true)` to fetch members, payments, and balance summary. Because this bypasses TanStack Query entirely:
- The prefetch system (`usePrefetchTrip`) can't pre-warm the data
- Tab re-visits re-fetch everything from scratch
- There's a custom 10-second timeout with `safeReload()` as the retry mechanism

**Fix**: Migrate the core data fetching in `MobileTripPayments` to use `useQuery` with the existing `tripKeys.payments(tripId)` cache key. This is a targeted refactor of the fetch logic only -- the UI rendering stays identical. After this change, the prefetch system will automatically warm the Payments cache, and re-visiting the tab will be instant.

---

## Bottleneck 3: Payments Makes Sequential Waterfall Requests

**Impact**: 3-4 round trips before the tab renders (members, then payments, then balance summary, then optionally user profile).

In authenticated mode (`MobileTripPayments.tsx` line 214-284), the flow is:
1. `Promise.all([members, payments])` -- good, parallel
2. Then checks if user is in members list -- if not, fires another query for user profile
3. Then fires `paymentBalanceService.getBalanceSummary()` -- sequential after step 2

**Fix**: Move the user profile lookup into the initial `Promise.all`, and fire the balance summary fetch in parallel with members+payments. This collapses 3 sequential round trips into 1 parallel batch.

---

## Bottleneck 4: PlacesSection Personal Basecamp Fetched Sequentially

**Impact**: Places tab loads trip basecamp first, then personal basecamp in a separate `useEffect`, creating a visible "pop-in" delay.

`PlacesSection.tsx` uses `useTripBasecamp(tripId)` via TanStack Query (good), but the personal basecamp is fetched in a separate `useEffect` that runs after mount. These could be parallelized.

**Fix**: Create a small `usePersonalBasecamp` hook that uses `useQuery`, letting both basecamps load in parallel via TanStack Query's automatic deduplication. This also enables the prefetch system to warm personal basecamp data.

---

## Bottleneck 5: No Adjacent-Tab Prefetch on Mobile

**Impact**: When a user taps Calendar, the adjacent tabs (Chat and Concierge) aren't pre-warmed for the likely next tap.

Desktop calls `prefetchAdjacentTabs` when a tab changes. Mobile does not. On mobile, where every millisecond matters (especially on Capacitor/PWA), this is a missed opportunity.

**Fix**: Add `prefetchAdjacentTabs` call to the `handleTabPress` callback in `MobileTripTabs.tsx`.

---

## Summary of Changes

| File | Change | Expected Impact |
|------|--------|----------------|
| `MobileTripTabs.tsx` | Add `prefetchPriorityTabs` on mount + `prefetchAdjacentTabs` on tab switch | Chat/Calendar/Tasks instant on first tap |
| `MobileTripPayments.tsx` | Migrate fetch logic to `useQuery` with `tripKeys.payments` | Payments tab benefits from prefetch cache, instant re-visits |
| `MobileTripPayments.tsx` | Parallelize balance summary + user profile with initial fetch | ~500ms faster Payments first load |
| `PlacesSection.tsx` | Extract personal basecamp to `useQuery` hook for parallel loading | Places sub-tabs load ~200ms faster |

## What This Does NOT Change

- No UI/layout changes (strict read-only on visual behavior)
- No hook consolidation (per project policy)
- No TypeScript strict mode changes
- MountedTabs architecture stays identical
- All existing error boundaries, skeletons, and timeouts preserved
- Demo mode logic untouched

## Expected Results

- **First tab tap on mobile**: ~300-800ms faster (data already cached from prefetch)
- **Payments tab**: ~500ms faster first load, instant re-visits
- **Places tab**: ~200ms faster sub-tab rendering
- **Tab switching overall**: Near-instant for visited tabs (already working), significantly faster for first visits
