
# Fix: Interactive Map & Search Functionality

## Root Cause Analysis

### Issue 1: "Interactive map unavailable. Retry" shows but map can't be interacted with
**Root Cause:** The Google Maps JavaScript API fails to initialize (likely due to API key restrictions, missing API enablement, or billing issues). The current retry just reloads the page which doesn't help.

**Current Flow:**
1. MapCanvas tries to load Google Maps JS API via `loadMaps()`
2. If it times out (8 seconds) or errors, `forceIframeFallback` is set to true
3. This shows the static GoogleMapsEmbed iframe instead
4. The "Retry" button calls `window.location.reload()` which reloads into the same failing state

### Issue 2: "Location not found" when searching in fallback mode
**Root Cause:** There's a disconnect in how search results flow to the embed iframe.

**Current Flow:**
1. User types "Los Angeles" → PlacesSection.handleSearchSubmit() calls
2. `GoogleMapsService.geocodeWithNominatim("Los Angeles")` - this WORKS and returns coords
3. `mapRef.current?.centerOn(coords, 15)` is called
4. MapCanvas.centerOn() in fallback mode calls `setIframeSearchLocation({lat, lng})`
5. BUT... it sets `address: undefined` because the PlacesSection doesn't pass the address

**The Bug (Line 231-236 in MapCanvas.tsx):**
```tsx
if (useFallbackEmbed || forceIframeFallback) {
  setIframeSearchLocation({
    lat: latLng.lat,
    lng: latLng.lng,
    address: undefined  // ← BUG: No address passed!
  });
```

Meanwhile, `GoogleMapsService.buildEmbeddableUrl()` prefers the address parameter to build the URL. When address is undefined but coords exist, it builds a URL like:
```
https://www.google.com/maps?output=embed&ll=34.0522,-118.2437&z=15
```

This URL format sometimes doesn't work as expected with the iframe embed.

---

## Solution

### Fix 1: Improve centerOn() to accept address parameter
Make the `centerOn()` method accept an optional address parameter so the embed can use address-based URLs (more reliable).

### Fix 2: Update PlacesSection to pass the address
Pass the geocoded display name to centerOn so it can build the proper embed URL.

### Fix 3: Better retry mechanism (non-page-reload)  
Replace the page reload with a proper retry that re-attempts the API initialization (as planned earlier but not implemented).

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/places/MapCanvas.tsx` | Update centerOn signature to accept optional address, add retryAttempt state for retry |
| `src/components/PlacesSection.tsx` | Pass display name from Nominatim to centerOn |

---

## Technical Changes

### 1. MapCanvas.tsx - Add address to centerOn and implement proper retry

**Add retryAttempt state (line ~77):**
```tsx
const [retryAttempt, setRetryAttempt] = useState(0);
```

**Update centerOn signature (lines 228-237):**
```tsx
centerOn: (latLng: { lat: number; lng: number }, zoom = 15, address?: string) => {
  // Handle iframe fallback mode
  if (useFallbackEmbed || forceIframeFallback) {
    setIframeSearchLocation({
      lat: latLng.lat,
      lng: latLng.lng,
      address: address || undefined  // Now accepts address!
    });
    return;
  }
  // ... rest unchanged
}
```

**Update MapCanvasRef interface (line 44):**
```tsx
centerOn: (latLng: { lat: number; lng: number }, zoom?: number, address?: string) => void;
```

**Update Retry button (lines 803-808):**
```tsx
<button
  onClick={() => {
    setForceIframeFallback(false);
    setUseFallbackEmbed(false);
    setRetryAttempt(prev => prev + 1);
  }}
  className="underline hover:no-underline"
>
  Retry
</button>
```

**Add retryAttempt to initMap useEffect dependencies (line 456):**
```tsx
}, [retryAttempt]);  // Re-run when retry is clicked
```

### 2. PlacesSection.tsx - Pass address to centerOn

**Update handleSearchSubmit (lines 413-416):**
```tsx
if (coords) {
  // Center map on the found location - pass display name for embed URL
  mapRef.current?.centerOn(
    { lat: coords.lat, lng: coords.lng }, 
    15, 
    coords.displayName || trimmedQuery  // Pass address for fallback mode
  );
  setSearchError(null);
}
```

---

## Why This Fixes Both Issues

### Search now works in fallback mode:
1. User searches "Los Angeles"
2. Nominatim returns `{ lat: 34.0522, lng: -118.2437, displayName: "Los Angeles, CA, USA" }`
3. PlacesSection calls `centerOn(coords, 15, "Los Angeles, CA, USA")`  
4. MapCanvas sets `iframeSearchLocation` with the address
5. GoogleMapsEmbed builds URL: `https://www.google.com/maps?output=embed&q=Los+Angeles%2C+CA%2C+USA`
6. Map iframe centers on Los Angeles ✓

### Retry actually retries:
1. User clicks "Retry"
2. `retryAttempt` increments, `useFallbackEmbed` resets
3. useEffect re-runs `initMap()` 
4. If API key/billing is now valid, interactive map loads
5. If still failing, gracefully falls back to embed again

---

## Summary

| Issue | Root Cause | Fix |
|-------|------------|-----|
| "Location not found" | centerOn() didn't pass address to embed | Add address parameter, pass displayName from Nominatim |
| Retry doesn't work | Page reload doesn't retry API init | Use retryAttempt state to re-trigger useEffect |

This is a minimal 2-file fix (~15 lines of changes) that resolves both issues.
