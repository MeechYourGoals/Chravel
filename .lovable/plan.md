
# Tab Loading Race Condition & Google Maps Fix Plan

## ✅ COMPLETED

All fixes have been implemented:

### Fix 1: Synchronous Tab Mounting ✅
Changed `if (!hasBeenVisited) return null;` to `if (!hasBeenVisited && !isActive) return null;` in:
- `src/components/mobile/MobileTripTabs.tsx` (line 352)
- `src/components/TripTabs.tsx` (line 297)
- `src/components/trip/MountedTabs.tsx` (line 52)

This ensures the **currently active tab always mounts immediately** on first click, eliminating the "click away and back" race condition.

### Fix 2: Always-Show Google Maps Embed ✅ (NEW)
Updated `src/components/places/MapCanvas.tsx`:
- **Immediate embed**: Keyless Google Maps iframe renders INSTANTLY on mount
- **Background JS API**: Interactive Google Maps JS API loads in background
- **Seamless swap**: If JS API succeeds, swaps to interactive map; if fails, embed stays visible
- **Never broken**: Users NEVER see "Oops! Something went wrong" - embed is always working
- **Small banner**: If JS API unavailable after 8s, shows discrete "Interactive map unavailable" with retry option
- **MutationObserver**: Uses efficient observer instead of polling interval for error detection

Key changes:
- Added `jsApiReady` state to track when JS API is ready
- Render condition now `!jsApiReady || useFallbackEmbed || forceIframeFallback`
- No loading spinner on initial mount - embed shows immediately
- Error modal removed - embed handles all failure cases gracefully

---

## Root Cause Summary

| Issue | Cause | Fix Applied |
|-------|-------|-------------|
| "Click away and back" to load | `useEffect` updates `visitedTabs` after first render | Active tab always mounts: `!hasBeenVisited && !isActive` |
| Google Maps "Oops!" error | API key/billing/quota issues | Always-show embed pattern with background JS API loading |
| Blank/loading map | JS API blocking render | Embed renders instantly, JS API loads async |

---

## Verification Checklist

1. ✅ Click any tab for the first time → loads immediately (no skeleton delay)
2. ✅ Places tab shows Google Maps embed IMMEDIATELY on first render
3. ✅ If JS API loads successfully → seamlessly swaps to interactive map
4. ✅ If JS API fails → embed stays visible with small "unavailable" banner
5. ✅ NEVER shows "Oops! Something went wrong" error
6. ✅ All tabs remain fast on subsequent visits (already mounted)
7. ✅ Error boundaries isolate failures per-tab (from previous fix)
