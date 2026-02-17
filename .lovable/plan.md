
# Fix: Universal Trip Search Across All Trip Types

## Problem

The Search modal and the background list use **two different data pipelines**:

- **Background list**: correctly filters across consumer trips, pro trips, and events using `filteredProTrips` and `filteredEvents`
- **Search modal**: only receives consumer `trips` array via `matchingTrips={trips}`. Pro trips and events are never passed to it.

Additionally, the Pro Trips view (line 964-970) does not pass `matchingTrips` or `onTripSelect` at all, meaning search results are always empty there.

## Solution

### 1. Build a unified search results array in Index.tsx

Create a new `useMemo` that combines filtered consumer trips, filtered pro trips, and filtered events into a single `Trip[]` array. Pro trips and events will be converted to the `Trip` interface shape (they share `id`, `title`, `location`, `dateRange`, `coverPhoto`, `participants`). Each converted item gets a `trip_type` tag ('pro' or 'event') so the select handler knows where to route.

This uses the already-computed `filteredData` object (which has `.trips`, `.proTrips`, `.events`) so there is zero duplicated filtering logic.

### 2. Pass the unified array to all three SearchOverlay instances

All three SearchOverlay components (consumer view at ~line 799, pro view at ~line 964, events view at ~line 1159) will receive the same `matchingTrips={allSearchableTrips}` and `onTripSelect={handleSearchTripSelect}`.

### 3. Update handleSearchTripSelect to route by trip type

The current handler always navigates to `/trip/{id}`. It needs to check the trip type and route to:
- `/trip/{id}` for consumer trips
- `/pro-trip/{id}` for pro trips
- `/event/{id}` for events

The trip type can be determined by checking the unified array or by matching against known pro/event IDs.

### 4. Sync background filtering with search modal

When the search modal is open and the user types, the `searchQuery` state already drives background filtering (the `filteredData` memo uses `searchQuery`). The background filtering already works universally. The only missing piece is the modal not showing those same results -- which is fixed by step 2.

## Technical Details

### File: `src/pages/Index.tsx`

**New useMemo (~after line 510):**
```typescript
const allSearchableTrips = useMemo(() => {
  const result: Trip[] = [...filteredData.trips];

  // Convert pro trips (Record<string, ProTripData>) to Trip[]
  Object.entries(filteredData.proTrips).forEach(([id, pro]) => {
    result.push({
      id,
      title: pro.title,
      location: pro.location,
      dateRange: pro.dateRange,
      description: pro.description,
      coverPhoto: pro.coverPhoto,
      participants: pro.participants?.map(p => ({
        id: p.id, name: p.name, avatar: p.avatar
      })) || [],
      trip_type: 'pro',
    });
  });

  // Convert events (Record<string, EventData>) to Trip[]
  Object.entries(filteredData.events).forEach(([id, evt]) => {
    result.push({
      id,
      title: evt.title,
      location: evt.location,
      dateRange: evt.dateRange,
      description: evt.description,
      coverPhoto: evt.coverPhoto,
      participants: [],
      trip_type: 'event',
    });
  });

  return result;
}, [filteredData]);
```

**Update handleSearchTripSelect (~line 154):**
```typescript
const handleSearchTripSelect = useCallback(
  (tripId: string | number) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    // Find the trip to determine correct route
    const match = allSearchableTrips.find(t => t.id === tripId);
    if (match?.trip_type === 'pro') {
      navigate(`/pro-trip/${tripId}`);
    } else if (match?.trip_type === 'event') {
      navigate(`/event/${tripId}`);
    } else {
      navigate(`/trip/${tripId}`);
    }
  },
  [navigate, allSearchableTrips],
);
```

**Update all three SearchOverlay instances:**
- Line ~805: `matchingTrips={allSearchableTrips}` (already has onTripSelect)
- Line ~964-970: Add `matchingTrips={allSearchableTrips}` and `onTripSelect={handleSearchTripSelect}`
- Line ~1165: `matchingTrips={allSearchableTrips}` (already has onTripSelect)

### No changes needed to SearchOverlay.tsx

The `SearchOverlay` component already renders any `Trip[]` it receives. Since pro trips and events are converted to match the `Trip` interface (with `title`, `location`, `dateRange`, `coverPhoto`), it will display them correctly with no component changes.

## What This Fixes

- Typing "nurse" in search will show **Nurse John** (pro trip) in the modal
- Typing "SXSW" will show **SXSW** (event) in the modal
- Typing "net" will show **Netflix is a Joke Festival** (event) regardless of which tab you are on
- Clicking a result routes to the correct detail page (`/trip/`, `/pro-trip/`, or `/event/`)
- Background filtering and modal results are always in sync (both derived from the same `filteredData` object)
