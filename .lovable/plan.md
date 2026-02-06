

# Remove Custom Calculator, Use Native Google Maps Directions

## Summary

Remove the broken custom distance calculator and replace it with a simple form that generates a native Google Maps directions embed. Google Maps will handle all the semantic search resolution internally (e.g., "SoFi Stadium" → actual location).

---

## What Gets Removed

| File | Action |
|------|--------|
| `src/components/places/DistanceCalculator.tsx` | Delete entirely |
| `src/components/places/LocationInput.tsx` | Delete entirely |
| `src/components/places/BasecampsPanel.tsx` | Remove import and usage of DistanceCalculator |

---

## What Gets Added

A new, simpler **DirectionsEmbed** component that:
- Uses plain text inputs (no autocomplete/geocoding required)
- Has quick-fill buttons for Trip/Personal Base Camp
- Builds a native Google Maps directions URL with `saddr` and `daddr`
- Displays the results in an iframe (Google handles everything)

---

## Technical Implementation

### New File: `src/components/places/DirectionsEmbed.tsx`

A simple component with:
- Two text inputs (From and To)
- Swap button to reverse directions
- Quick-fill buttons for basecamps
- "Get Directions" button that generates an embed URL
- Iframe showing the Google Maps directions result

```tsx
// Core logic - NO geocoding required
const handleGetDirections = () => {
  if (!fromText.trim() || !toText.trim()) return;
  
  const saddr = encodeURIComponent(fromText.trim());
  const daddr = encodeURIComponent(toText.trim());
  const url = `https://www.google.com/maps?output=embed&saddr=${saddr}&daddr=${daddr}`;
  
  setDirectionsUrl(url);
  setShowDirections(true);
};
```

### Modified File: `src/components/places/BasecampsPanel.tsx`

Replace `DistanceCalculator` with `DirectionsEmbed`:

```tsx
// Remove this:
import { DistanceCalculator } from './DistanceCalculator';

// Add this:
import { DirectionsEmbed } from './DirectionsEmbed';

// Replace usage:
<DirectionsEmbed
  tripBasecamp={tripBasecamp}
  personalBasecamp={personalBasecamp}
/>
```

---

## User Experience Flow

1. User types "SoFi Stadium Los Angeles" in "From" field
2. User types "Crypto.com Arena" in "To" field  
3. User clicks "Get Directions"
4. Google Maps embed appears showing:
   - The route between the two locations
   - Distance and travel time
   - Turn-by-turn directions (interactive in embed)

**Key difference**: Google Maps resolves "SoFi Stadium Los Angeles" → actual stadium location. No Nominatim, no custom geocoding, no coordinate extraction needed.

---

## Visual Design

**Before clicking "Get Directions"**:
```text
┌─────────────────────────────────────────────────────────────────┐
│  🗺️ Get Directions                                              │
│  ───────────────────────────────────────────────────────────── │
│  From: [Trip Base Camp] [Personal Base Camp]                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📍 SoFi Stadium Los Angeles                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ⇅                                     │
│  To: [Trip Base Camp] [Personal Base Camp]                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📍 Crypto.com Arena                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [ 🗺️ Get Directions ]                                         │
└─────────────────────────────────────────────────────────────────┘
```

**After clicking "Get Directions"**:
```text
┌─────────────────────────────────────────────────────────────────┐
│  🗺️ Directions: SoFi Stadium → Crypto.com Arena    [✕ Close]   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │            [Google Maps Directions Embed]                │  │
│  │         Shows route, distance, and travel time           │  │
│  │              Interactive within iframe                   │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/places/DistanceCalculator.tsx` | **Delete** | Remove broken custom calculator |
| `src/components/places/LocationInput.tsx` | **Delete** | No longer needed |
| `src/components/places/DirectionsEmbed.tsx` | **Create** | Simple text inputs + native directions embed |
| `src/components/places/BasecampsPanel.tsx` | **Modify** | Swap DistanceCalculator → DirectionsEmbed |

---

## Why This Works

1. **Google Maps handles semantic search** - "Popeyes Inglewood CA" resolves correctly
2. **No API calls needed** - The `?output=embed&saddr=X&daddr=Y` format is free
3. **Button is always enabled** - Just needs text in both fields, no coordinates
4. **Full directions experience** - Distance, duration, route all visible in embed
5. **Much simpler code** - ~80 lines instead of ~300 lines

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| User types partial venue name | Google Maps will show multiple matches or best guess |
| Location not found | Google Maps shows "couldn't find" message in embed |
| Both fields empty | Button disabled |
| User clicks quick-fill | Text populated from basecamp address |
| User wants to change search | Click "Close" to return to input form |

