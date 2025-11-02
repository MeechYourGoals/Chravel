# Deployment Fix Summary

## Problem

Production appeared to revert to an old version after successful deployment, causing "Places → Links" to disappear and other features to break. This was caused by:

1. **Stale Service Workers** caching old app shells
2. **CDN/Edge cache** serving outdated HTML/JS
3. **No visibility** into which build was actually live
4. **Missing production fallbacks** for mock data

## Solutions Implemented

### 1. Service Worker Cache Kill (One-Time)

**File**: `src/main.tsx`

Added temporary code to unregister all stale service workers and clear caches on first load after this deploy:

```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations?.().then(regs => regs.forEach(r => r.unregister()));
  caches?.keys?.().then(keys => keys.forEach(k => caches.delete(k)));
  console.log('[SW] Cleared stale service workers and caches');
}
```

**Action Required**: Remove this block after one release cycle (once all users have cleared caches).

### 2. Build Version Badge

**Files**: 
- `src/components/BuildBadge.tsx` (new)
- `src/App.tsx` (updated)

Added visible build badge to bottom-right corner showing:
- Build ID (from `VITE_BUILD_ID` env var)
- Environment mode (dev/staging/production)

Now you can instantly verify which build is live.

### 3. Health Endpoint

**Files**:
- `src/pages/Healthz.tsx` (new)
- `src/App.tsx` (added route)

Visit `/healthz` to see:
- Current build ID
- Environment mode
- Timestamp
- Feature flags status
- Overall health status

### 4. Places → Links Mock Data Fallback

**Files**:
- `src/services/mockDataService.ts` (enhanced)
- `src/components/PlacesSection.tsx` (already using forceLoad)

Changes:
- Added trip-specific mock data (4 city sets: NYC, LA, Paris, Tokyo)
- Mock data now loads based on tripId (tripId % 4)
- Force-load enabled in production for demo/empty states

### 5. Map Search Nominatim Fallback

**File**: `src/components/places/MapCanvas.tsx`

Enhanced search to fallback to OpenStreetMap Nominatim when Google Maps API returns no results:

```typescript
let result = await GoogleMapsService.searchPlacesByText(query, searchOptions);

if (!result.results || result.results.length === 0) {
  const nominatimResult = await GoogleMapsService.fallbackGeocodeNominatim(query);
  // Use Nominatim result...
}
```

### 6. Confirmed: No Links Tab in Media

**File**: `src/components/UnifiedMediaHub.tsx`

Verified Media tab only shows: All / Photos / Videos / Files (no Links tab)

## Next Steps

### Immediate (Before Deploy)

1. **Set `VITE_BUILD_ID` environment variable** in your deployment platform:
   - Vercel: `$VERCEL_GIT_COMMIT_SHA`
   - Render: `$RENDER_GIT_COMMIT`
   - Other: `$(date +%Y-%m-%dT%H:%M:%SZ)-$(git rev-parse --short HEAD)`

2. **Deploy to main branch**

3. **Purge CDN/build cache** in your platform's UI

### After Deploy

1. Visit your app and verify:
   - Build badge shows new version in bottom-right
   - `/healthz` returns correct buildId
   - Places → Links shows 10 items
   - Media has no Links tab
   - Map search works (try "Central Park")

2. Test in multiple browsers (to confirm cache clearing)

3. Check console for SW clear confirmation: `[SW] Cleared stale service workers and caches`

### Follow-Up (Next Release)

1. Remove the SW cache kill code from `src/main.tsx` (it's temporary)
2. Consider adding proper SW update flow (`skipWaiting()` + `clients.claim()`) if you need offline support
3. Add feature flags for easier production debugging

## Files Changed

- `src/main.tsx` - Added SW cache clearing
- `src/components/BuildBadge.tsx` - New component
- `src/App.tsx` - Added BuildBadge, Healthz route
- `src/pages/Healthz.tsx` - New health endpoint
- `src/services/mockDataService.ts` - Trip-specific mock data
- `src/components/places/MapCanvas.tsx` - Nominatim fallback
- `BUILD_ID_SETUP.md` - Documentation (new)
- `DEPLOYMENT_FIX_SUMMARY.md` - This file (new)

## Commit Message

```
fix(deploy): kill stale SW; force Places>Links mock fallback; remove Media Links; map search fallback; add build badge & /healthz

- Clear stale service workers and caches on load (temporary fix)
- Add build version badge (bottom-right) and /healthz endpoint
- Enhance MockDataService with trip-specific places (NYC/LA/Paris/Tokyo)
- Add Nominatim fallback for map search when Google returns empty
- Confirm Media tab has no Links (only All/Photos/Videos/Files)

Fixes production cache issues causing "working then reverting" behavior.
```

## Monitoring

After deploy, monitor:
1. Build badge version matches latest commit SHA
2. `/healthz` shows expected features
3. Console logs for any errors
4. User reports of "disappearing features"

If issues persist:
- Check that main branch has latest commits
- Verify deploy pulled correct SHA
- Confirm CDN cache was purged
- Check browser DevTools → Application → Service Workers
