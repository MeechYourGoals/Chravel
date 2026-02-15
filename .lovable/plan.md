
# Fix Places Counter: Root Cause Analysis and Solution

## Root Cause (3 separate issues)

### Issue 1: Consumer TripCard Days counter is hardcoded to "5"
Line 519 of `TripCard.tsx` has a hardcoded `5` instead of using `calculateDaysCount(trip.dateRange)`. Every consumer trip shows "5 Days" regardless of actual dates.

### Issue 2: Pro and Event cards ignore Supabase placesCount entirely
`ProTripCard.tsx` calls `calculateProTripPlacesCount(trip)` which inspects `trip.schedule` and `trip.itinerary` arrays. For real Supabase trips, the converter (`convertSupabaseTripToProTrip`) sets these to empty arrays `[]`, so the function always returns "0" or a dash.

Same issue for `EventCard.tsx` and `MobileEventCard.tsx` -- they call `calculateEventPlacesCount(event)` which checks `event.sessions` and `event.itinerary`, both empty for Supabase trips.

The Supabase query in `tripService.ts` correctly fetches `trip_events` with locations and attaches the count as `trip_events_places`, but **only the consumer `TripCard` reads `trip.placesCount`**. Pro and Event cards never look at that value.

### Issue 3: placesCount not passed through to ProTripData/EventData
`convertSupabaseTripToProTrip` and `convertSupabaseTripToEvent` don't carry `placesCount` from the mock trip into the Pro/Event data structures. There's no `placesCount` field on these types.

## Database Verification
The data IS correct in Supabase:
- Trevor Noah Tour: 24 events with locations (showing 0 on card)
- Lakers 2026: 43 events with locations (showing 0 on card)
- Netflix is a Joke: 42 events with locations (showing 0 on card)

The Supabase query logic is working. The problem is purely in how the UI reads the count.

## Solution

### Step 1: Add `placesCount` to ProTripData and EventData types
Add an optional `placesCount?: number` field to both type definitions so the Supabase-fetched count can flow through.

### Step 2: Pass placesCount through converters
In `convertSupabaseTripToProTrip` and `convertSupabaseTripToEvent`, copy `mockTrip.placesCount` into the returned object.

### Step 3: Update ProTripCard to use placesCount
Replace `calculateProTripPlacesCount(trip)` with `trip.placesCount ?? calculateProTripPlacesCount(trip)`. This prefers the Supabase count when available, falls back to demo data calculation.

### Step 4: Update EventCard and MobileEventCard similarly
Replace `calculateEventPlacesCount(event)` with `event.placesCount ?? calculateEventPlacesCount(event)`.

### Step 5: Fix consumer TripCard Days counter
Replace hardcoded `5` with `calculateDaysCount(trip.dateRange)` so days are calculated correctly too.

## Files to Modify

| File | Change |
|------|--------|
| `src/types/pro.ts` | Add `placesCount?: number` to ProTripData |
| `src/types/events.ts` | Add `placesCount?: number` to EventData |
| `src/utils/tripConverter.ts` | Pass `placesCount` through to Pro and Event converters |
| `src/components/ProTripCard.tsx` | Use `trip.placesCount` with fallback |
| `src/components/EventCard.tsx` | Use `event.placesCount` with fallback |
| `src/components/MobileEventCard.tsx` | Use `event.placesCount` with fallback |
| `src/components/TripCard.tsx` | Fix hardcoded "5" Days counter |

## Result
All trip types (Consumer, Pro, Event) will show accurate Places counts from calendar events with locations, consistent across demo and real Supabase trips. The Days counter for consumer trips will also be fixed.
