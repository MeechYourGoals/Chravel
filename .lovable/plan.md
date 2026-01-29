
# Tab Loading Race Condition & Google Maps Fix Plan

## ✅ COMPLETED

All fixes have been implemented:

### Fix 1: Synchronous Tab Mounting ✅
Changed `if (!hasBeenVisited) return null;` to `if (!hasBeenVisited && !isActive) return null;` in:
- `src/components/mobile/MobileTripTabs.tsx` (line 352)
- `src/components/TripTabs.tsx` (line 297)
- `src/components/trip/MountedTabs.tsx` (line 52)

This ensures the **currently active tab always mounts immediately** on first click, eliminating the "click away and back" race condition.

### Fix 2: Google Maps Fallback Improvement ✅
Updated `src/components/places/MapCanvas.tsx` (lines 789-823):
- Added "Retry Full Map" button when in fallback/iframe mode
- Button triggers full page reload to re-attempt Google Maps API initialization
- Provides clear user feedback and escape hatch from degraded mode

---

## Root Cause Summary

| Issue | Cause | Fix Applied |
|-------|-------|-------------|
| "Click away and back" to load | `useEffect` updates `visitedTabs` after first render | Active tab always mounts: `!hasBeenVisited && !isActive` |
| Google Maps stuck/error | API key/billing/quota issues | Faster 8s timeout + Retry button in fallback mode |

---

## Verification Checklist

1. ✅ Click any tab for the first time → loads immediately (no skeleton delay)
2. ✅ Places tab with Maps error → shows "Retry Full Map" button
3. ✅ All tabs remain fast on subsequent visits (already mounted)
4. ✅ Error boundaries isolate failures per-tab (from previous fix)
