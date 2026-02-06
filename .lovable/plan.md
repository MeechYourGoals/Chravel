

# Fix Google Maps + General-Purpose Distance Calculator

## Overview

Three interconnected fixes for the Places tab:

1. **Fix search centering in fallback mode** - The embed URL uses `ll=` which doesn't reliably center; switching to `q=` format
2. **Create a general-purpose distance calculator** - Calculate distance between ANY two locations (dinner → nightclub, hotel → attraction, etc.)
3. **Improve the retry mechanism** - Better UX when interactive map is unavailable

---

## Problem Summary

From the screenshot:
- "Interactive map unavailable - Retry" banner is showing (JS API failed to load)
- Search doesn't center the map in fallback mode
- No way to calculate distances between two arbitrary locations

---

## Solution Design

### The Distance Calculator Concept

**User Story**: "I want to know how far the nightclub is from the restaurant we're going to for dinner"

**UI Design**: A compact distance tool with two location fields:

```text
┌─────────────────────────────────────────────────────────────────┐
│  📍 From: [ Marriott Hotel, Chicago          ] [📍]            │
│  📍 To:   [ Gibson's Steakhouse              ] [📍]            │
│  ─────────────────────────────────────────────────────────────  │
│      🚗 3.2 mi • 12 min     🚶 45 min     🚇 25 min             │
│                     [Show on Map]                               │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features**:
- Two autocomplete inputs for origin and destination
- Quick-fill buttons: "Trip Base Camp" / "Personal Base Camp" / "Current Location"
- Mode toggle: Driving / Walking / Transit
- Shows distance + duration
- "Show on Map" button to draw route on the map

---

## Technical Implementation

### File 1: `src/services/googleMapsService.ts`

**Fix: Improve `buildEmbeddableUrl` for coordinate-based centering**

The current URL format uses `ll=lat,lng` which doesn't work reliably. Change to `q=lat,lng` format:

```ts
// Current (unreliable)
return `${baseUrl}?output=embed&ll=${coords.lat},${coords.lng}&z=15`;

// Fixed (reliable centering)
return `${baseUrl}?output=embed&q=${coords.lat},${coords.lng}&z=15`;
```

### File 2: `src/components/places/DistanceCalculator.tsx` (NEW)

Create a general-purpose distance calculator component:

```tsx
interface DistanceCalculatorProps {
  tripBasecamp?: BasecampLocation | null;
  personalBasecamp?: PersonalBasecamp | null;
  onShowRoute?: (origin: LatLng, destination: LatLng) => void;
}

export const DistanceCalculator: React.FC<DistanceCalculatorProps> = ({
  tripBasecamp,
  personalBasecamp,
  onShowRoute,
}) => {
  const [fromLocation, setFromLocation] = useState<{
    address: string;
    coords?: { lat: number; lng: number };
  } | null>(null);
  
  const [toLocation, setToLocation] = useState<{
    address: string;
    coords?: { lat: number; lng: number };
  } | null>(null);
  
  const [distanceResult, setDistanceResult] = useState<{
    driving?: { distance: string; duration: string };
    walking?: { distance: string; duration: string };
    transit?: { distance: string; duration: string };
  } | null>(null);
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'driving' | 'walking' | 'transit'>('driving');

  // Quick-fill handlers
  const fillFromTripBasecamp = () => {
    if (tripBasecamp) {
      setFromLocation({
        address: tripBasecamp.address,
        coords: tripBasecamp.coordinates,
      });
    }
  };

  const fillFromPersonalBasecamp = () => {
    if (personalBasecamp?.latitude && personalBasecamp?.longitude) {
      setFromLocation({
        address: personalBasecamp.address || '',
        coords: { lat: personalBasecamp.latitude, lng: personalBasecamp.longitude },
      });
    }
  };

  // Calculate distance when both locations are set
  const calculateDistance = async () => {
    if (!fromLocation?.coords || !toLocation?.coords) return;
    
    setIsCalculating(true);
    try {
      const origin = `${fromLocation.coords.lat},${fromLocation.coords.lng}`;
      const dest = `${toLocation.coords.lat},${toLocation.coords.lng}`;
      
      // Fetch all three modes in parallel
      const [driving, walking, transit] = await Promise.allSettled([
        GoogleMapsService.getDistanceMatrix(origin, dest, 'DRIVING'),
        GoogleMapsService.getDistanceMatrix(origin, dest, 'WALKING'),
        GoogleMapsService.getDistanceMatrix(origin, dest, 'TRANSIT'),
      ]);
      
      setDistanceResult({
        driving: parseDistanceResult(driving),
        walking: parseDistanceResult(walking),
        transit: parseDistanceResult(transit),
      });
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-xl p-4 border border-white/10">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Route size={18} />
        Distance Calculator
      </h3>
      
      {/* From Location */}
      <LocationInput
        label="From"
        value={fromLocation?.address || ''}
        onLocationSelect={setFromLocation}
        quickFillOptions={[
          tripBasecamp && { label: 'Trip Base Camp', onClick: fillFromTripBasecamp },
          personalBasecamp && { label: 'Personal Base Camp', onClick: fillFromPersonalBasecamp },
        ].filter(Boolean)}
      />
      
      {/* To Location */}
      <LocationInput
        label="To"
        value={toLocation?.address || ''}
        onLocationSelect={setToLocation}
        quickFillOptions={[/* same options */]}
      />
      
      {/* Calculate Button */}
      <Button onClick={calculateDistance} disabled={!fromLocation || !toLocation}>
        Calculate Distance
      </Button>
      
      {/* Results */}
      {distanceResult && (
        <DistanceResults 
          result={distanceResult} 
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          onShowRoute={() => onShowRoute?.(fromLocation!.coords!, toLocation!.coords!)}
        />
      )}
    </div>
  );
};
```

### File 3: `src/components/places/LocationInput.tsx` (NEW)

A reusable autocomplete input for locations:

```tsx
interface LocationInputProps {
  label: string;
  value: string;
  onLocationSelect: (location: { address: string; coords?: LatLng }) => void;
  quickFillOptions?: Array<{ label: string; onClick: () => void }>;
  placeholder?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  label,
  value,
  onLocationSelect,
  quickFillOptions = [],
  placeholder = "Enter a location...",
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced autocomplete using Nominatim
  const debouncedSearch = useDebouncedCallback(async (q: string) => {
    if (q.length < 3) return;
    const results = await GoogleMapsService.autocompleteWithNominatim(q, 5);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  }, 300);

  const handleSelect = async (suggestion: any) => {
    setQuery(suggestion.description);
    setShowSuggestions(false);
    
    // Use stored coordinates from Nominatim response
    if (suggestion._coords) {
      onLocationSelect({
        address: suggestion.description,
        coords: suggestion._coords,
      });
    }
  };

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <label className="text-sm text-gray-300">{label}</label>
        {quickFillOptions.map((option, i) => (
          <button
            key={i}
            onClick={option.onClick}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            debouncedSearch(e.target.value);
          }}
          placeholder={placeholder}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
              >
                {s.description}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

### File 4: `src/components/places/BasecampsPanel.tsx`

Add the distance calculator below the basecamp cards:

```tsx
// After the grid of basecamp cards:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mobile-safe-scroll">
  {/* Trip Base Camp Card */}
  {/* ... existing ... */}
  
  {/* Personal Base Camp Card */}
  {/* ... existing ... */}
</div>

{/* Distance Calculator - Full Width */}
<div className="mt-4">
  <DistanceCalculator
    tripBasecamp={tripBasecamp}
    personalBasecamp={personalBasecamp}
    onShowRoute={(origin, destination) => {
      // Will be wired to MapCanvas.showRoute
    }}
  />
</div>
```

### File 5: `src/components/GoogleMapsEmbed.tsx`

Fix URL priority to prefer address over coordinates:

```tsx
// Priority 1: External search location (from search bar)
if (searchLocation?.lat && searchLocation?.lng) {
  // Prefer address if available (more reliable centering)
  if (searchLocation.address) {
    url = GoogleMapsService.buildEmbeddableUrl(searchLocation.address);
  } else {
    url = GoogleMapsService.buildEmbeddableUrl(undefined, {
      lat: searchLocation.lat,
      lng: searchLocation.lng,
    });
  }
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/googleMapsService.ts` | Modify | Fix `buildEmbeddableUrl` to use `q=` for coords |
| `src/components/places/DistanceCalculator.tsx` | Create | General-purpose distance calculator |
| `src/components/places/LocationInput.tsx` | Create | Reusable autocomplete location input |
| `src/components/places/BasecampsPanel.tsx` | Modify | Add DistanceCalculator component |
| `src/components/GoogleMapsEmbed.tsx` | Modify | Prefer address for embed URL centering |
| `src/components/PlacesSection.tsx` | Modify | Wire up route display callback |

---

## User Experience Flow

1. **Search Works**: User types "Popeyes Inglewood CA" → map centers on that location
2. **Distance Calculator**: 
   - User clicks "Trip Base Camp" quick-fill for "From"
   - User types "Gibson's Steakhouse" for "To"
   - Sees: "🚗 3.2 mi • 12 min"
   - Clicks "Show on Map" → route drawn on map
3. **Any Two Locations**: User can enter any two addresses, restaurants, attractions, etc.

---

## Scope Summary

- **New Files**: 2 (DistanceCalculator.tsx, LocationInput.tsx)
- **Modified Files**: 4
- **Lines Added**: ~300
- **New Dependencies**: None
- **Database Changes**: None
- **Mobile/PWA**: Fully responsive design

