

# Remove Old Map, Keep DirectionsEmbed Only

## Rationale

The DirectionsEmbed is working perfectly and serves the actual user need: "How far is X from Y?" The old interactive/embed map below it was:
- Showing "Interactive map unavailable" errors
- Not providing value a user can't get from opening Google Maps natively
- Adding visual clutter beneath the DirectionsEmbed

## What Gets Removed

### Files to Delete (10 files)

| File | Reason |
|------|--------|
| `src/components/places/MapCanvas.tsx` (915 lines) | The old interactive map component |
| `src/components/GoogleMapsEmbed.tsx` | Iframe embed used as MapCanvas fallback |
| `src/components/places/UnifiedMapControls.tsx` | Search bar overlay that floated on the old map |
| `src/components/places/PlaceInfoOverlay.tsx` | Place info card that appeared on old map |
| `src/components/places/SearchContextSwitch.tsx` | Trip/Personal context toggle for old map |
| `src/components/places/StaticMapEmbed.tsx` | Static map embed helper |
| `src/hooks/map/useMapState.ts` | Map state management hook |
| `src/hooks/map/useMapSearch.ts` | Map search state hook |
| `src/hooks/map/useMapRouting.ts` | Map routing/polyline hook |
| `src/components/places/__tests__/MapCanvas.test.tsx` | Tests for deleted component |

### Code Removed from PlacesSection.tsx

- `MapCanvas` import and ref
- `UnifiedMapControls` import
- All search state: `searchQuery`, `isSearching`, `searchError`, `isMapLoading`
- All search handlers: `handleSearchChange`, `handleSearchSubmit`, `handleClearSearch`
- `handleCenterMap` function
- `handleMapReady` function
- `distanceSettings` object
- `searchContext` state and `handleContextChange`
- The entire map rendering block (lines 536-574)
- Several deprecated state variables (`_lastUpdatedLocation`, `_showPersonalBasecampSelector`)

### Code Cleaned Up in LinksPanel.tsx

- Remove `onCenterMap` prop (dead code with no map to center)
- Remove `distanceUnit` and `preferredMode` props (no longer needed)

### Code Cleaned Up in BasecampsPanel.tsx

- Remove deprecated `onCenterMap` prop from the interface
- Remove `activeContext` and `onContextChange` props (context switching was for the old map)

## What Stays

| Component | Why |
|-----------|-----|
| `DirectionsEmbed.tsx` | Working perfectly - the replacement |
| `BasecampsPanel.tsx` | Houses basecamp cards + DirectionsEmbed |
| `LinksPanel.tsx` | Trip links display (cleaned up) |
| `googleMapsService.ts` | Still used by basecamp selector and DirectionsEmbed URL building |
| `googlePlacesNew.ts` | Still used by `LocationSearchBar.tsx` on the home page |

## Result

The Places tab becomes cleaner and more focused:

```text
Before:                          After:
┌──────────────────────┐        ┌──────────────────────┐
│ Base Camps Tab       │        │ Base Camps Tab       │
│ ┌────────┬─────────┐ │        │ ┌────────┬─────────┐ │
│ │ Trip   │Personal │ │        │ │ Trip   │Personal │ │
│ └────────┴─────────┘ │        │ └────────┴─────────┘ │
│ ┌──────────────────┐ │        │ ┌──────────────────┐ │
│ │ Get Directions   │ │        │ │ Get Directions   │ │
│ └──────────────────┘ │        │ └──────────────────┘ │
│ ┌──────────────────┐ │        │                      │
│ │ Google Map       │ │        │ (cleaner, focused)   │
│ │ "unavailable"    │ │        │                      │
│ │ [Retry]          │ │        └──────────────────────┘
│ └──────────────────┘ │
└──────────────────────┘
```

## Technical Details

### PlacesSection.tsx - Major Simplification

Remove approximately 150 lines of map-related state and handlers. The component shrinks from ~577 lines to ~400 lines. Key removals:
- `mapRef` and `MapCanvasRef` usage
- Search state variables and handlers
- `handleCenterMap`, `handleMapReady`, `handleContextChange`
- `distanceSettings` configuration
- `searchContext` state
- The entire map JSX block at the bottom

### BasecampsPanel.tsx - Interface Cleanup

Remove deprecated props from the interface:
- `onCenterMap` (already marked as deprecated with TODO)
- `activeContext` and `onContextChange` (no longer needed without the map)

### LinksPanel.tsx - Dead Props Removal

Remove props that referenced the old map:
- `onCenterMap`
- `distanceUnit`
- `preferredMode`

Update the call site in PlacesSection.tsx accordingly.

## Migration Safety

- `googlePlacesNew` service is NOT deleted (still used by `LocationSearchBar.tsx`)
- `googleMapsService.ts` is NOT deleted (used by basecamp selector for geocoding)
- No database changes required
- No breaking changes to any other tabs/features

