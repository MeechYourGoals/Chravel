

# Fix "Places" Counter: Pull from Calendar Events with Locations

## Problem
The "Places" counter on trip cards currently pulls from `trip_links` (curated links in the Ideas section). This is inaccurate because trip links include non-place items like wedding registries, articles, forms, and docs.

## Solution
Change the "Places" counter to count **calendar entries (`trip_events`) that have a non-empty `location` field**. This is naturally accurate: only events with real locations count as "places."

- Keep the label **"Places"** (no rename)
- Keep Trip Links as-is (no rename to "Ideas" or "Links")
- Consistent logic across Consumer, Pro, and Events

## Why Calendar Events > Trip Links

- Calendar entries with locations = actual places the group is going
- Entries without locations (reminders, tasks, flights without venue) are automatically excluded
- Works perfectly for touring artists (tour stops), sports teams (game venues), weddings (ceremony/reception venues), group trips (restaurants, attractions)
- All trip types share the same `trip_events` table -- one consistent counter

## Technical Changes

### 1. Database Query (`src/services/tripService.ts`)
- Replace `trip_links` count query with `trip_events` count query
- Filter: `location IS NOT NULL AND location != ''`
- Count distinct locations to avoid duplicates (e.g., two events at the same venue)

```text
Before: supabase.from('trip_links').select('trip_id').in('trip_id', tripIds)
After:  supabase.from('trip_events').select('trip_id, location').in('trip_id', tripIds).not('location', 'is', null).neq('location', '')
```

Then count unique locations per trip instead of raw row count.

### 2. Trip Converter (`src/utils/tripConverter.ts`)
- Update the property name from `trip_links` to `trip_events_places` (or similar) when extracting counts
- The `placesCount` prop continues to flow to components unchanged

### 3. Demo Data (`src/data/tripsData.ts`)
- Keep existing hardcoded `placesCount` values for demo trips -- these are already reasonable numbers

### 4. Pro/Event Card Stats (`src/utils/tripStatsUtils.ts`)
- For real (Supabase) Pro/Event trips, use the same `trip_events` location count
- For demo Pro/Event trips, keep existing `calculateProTripPlacesCount` / `calculateEventPlacesCount` as fallback

### 5. No Changes Needed
- Trip Links UI (Places > Ideas section) -- unchanged
- `trip_link_index` table -- unchanged
- `trip_links` table -- still used for its original purpose, just not for the counter
- Label stays "Places" everywhere

## Edge Cases Handled
- "Get passport by Thursday" (no location) -- not counted
- "Chicago Bulls @ Atlanta Hawks" (has location) -- counted
- Two events at same venue -- counted as 1 place (distinct locations)
- Flight "Depart LAX 8am" (location: "LAX") -- counted (airports are places, and this is a feature, not a bug -- it shows the trip involves that location)
- Empty calendar -- shows 0 or dash, same as today

