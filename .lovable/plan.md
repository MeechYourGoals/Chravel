

# Fix Build Errors + Wire Up 4 New Google API Tools for AI Concierge

## Part 1: Fix 2 Build Errors

### Fix A: `Broadcasts.tsx` line 96-104 -- useEffect cleanup returns Promise

`supabase.removeChannel(channel)` returns `Promise<"error" | "ok" | "timed out">`. The `subscribeToBroadcasts` method returns `() => supabase.removeChannel(channel)`, which means the cleanup function returns a Promise. React's `useEffect` cleanup must return `void`.

**Fix:** Wrap the cleanup call so it doesn't return the Promise:

```ts
// Line 104: change
return unsub;
// to
return () => { unsub(); };
```

### Fix B: `useTripMembersQuery.ts` line 214 -- `leave_trip` not in generated types

The `as const` assertion forces TypeScript to match the literal against the generated RPC type list, but `leave_trip` is not in the generated types.

**Fix:** Cast `supabase.rpc` to `any`:

```ts
// Line 214: change
await supabase.rpc('leave_trip' as const, {
// to
await (supabase.rpc as any)('leave_trip', {
```

---

## Part 2: Add 4 New Tools to AI Concierge

Both Cursor's and ChatGPT's analyses are largely correct. The synthesis:

- **Keep the existing function-calling architecture** (no separate REST endpoints)
- **Add 4 tools** as new cases in `functionExecutor.ts` + declarations in `lovable-concierge/index.ts`
- **Use Places API photos** for "show me photos" queries instead of Custom Search (avoids extra setup; covers most use cases)
- **Defer** Cloud Translation, Custom Search, and document import wrapper (already exists via Smart Import)

### Tool 1: `getDirectionsETA`

- **API:** Routes API (Directions API fallback)
- **Input:** `{ origin, destination, departureTime? }`
- **Output:** `{ durationMinutes, distanceKm, distanceMiles, summary }`
- **Use case:** "How long from the hotel to dinner?"
- **Implementation:** POST to `https://routes.googleapis.com/directions/v2:computeRoutes` using `GOOGLE_MAPS_API_KEY`

### Tool 2: `getTimezone`

- **API:** Time Zone API
- **Input:** `{ lat, lng }`
- **Output:** `{ timeZoneId, timeZoneName, utcOffsetMinutes }`
- **Use case:** "What time zone is our destination?" / normalizing itinerary times
- **Implementation:** GET to `https://maps.googleapis.com/maps/api/timezone/json` using `GOOGLE_MAPS_API_KEY`

### Tool 3: `getPlaceDetails`

- **API:** Places API (New) -- already enabled
- **Input:** `{ placeId }`
- **Output:** `{ name, address, phone, website, hours, rating, priceLevel, editorialSummary, photoUrls }`
- **Use case:** "Tell me more about that restaurant" / "Show me photos of Hollywood Bowl"
- **Implementation:** GET to `https://places.googleapis.com/v1/places/{placeId}` with expanded field mask including `photos`
- **Note:** Also enhances `searchPlaces` by adding `photos` to the field mask so place results include photo references

### Tool 4: `searchImages`

- **API:** Google Custom Search JSON API
- **Input:** `{ query, count? }`
- **Output:** `{ images: [{ title, thumbnailUrl, imageUrl, sourceDomain }] }`
- **Use case:** "Show me pictures of Medellin Flower Festival" (generic, non-place images)
- **Requires:** `GOOGLE_CUSTOM_SEARCH_CX` secret (Custom Search Engine ID)
- **Behavior:** If CX secret is not set, returns a helpful error message suggesting the user use "search for [place name]" instead (falls back to Places photos)

### Existing `searchPlaces` Enhancement

- Add `photos` to the field mask in `searchPlaces` so results include photo references
- Add `id` (placeId) to the response so `getPlaceDetails` can be called as a follow-up

---

## What's Deferred (and why)

| Feature | Reason |
|---------|--------|
| Custom Search for images (initially) | Extra setup (CX engine); Places photos cover venue queries |
| Cloud Translation | UI changes needed (per-message toggle); v2 feature |
| Document/itinerary parsing via Concierge | Already exists as Smart Import; wrapper is a convenience layer for later |
| Speech-to-Text | Already handled via Gemini Live bidirectional audio |
| Separate REST tool endpoints | Function calling already routes via `functionExecutor.ts`; no duplication needed |

---

## Structured Logging

Add timing and success/failure logging to `executeFunctionCall`:

```
[Tool] getDirectionsETA | 340ms | success
[Tool] searchImages | 120ms | error: CX not configured
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/features/broadcasts/components/Broadcasts.tsx` | Fix useEffect cleanup return type |
| `src/hooks/useTripMembersQuery.ts` | Cast `leave_trip` RPC to `any` |
| `supabase/functions/_shared/functionExecutor.ts` | Add 4 new tool implementations + structured logging |
| `supabase/functions/lovable-concierge/index.ts` | Add 4 new function declarations + enhance `searchPlaces` field mask |

---

## Manual Test Checklist

1. "Best tacos near the hotel" -- existing `searchPlaces` still works, now includes placeId and photo refs
2. "Tell me more about [place from search]" -- `getPlaceDetails` returns hours, website, photos, editorial summary
3. "How long from basecamp to [restaurant] at 6pm?" -- `getDirectionsETA` returns ETA
4. "What time zone is Medellin in?" -- `getTimezone` returns tz info
5. "Show me pictures of Medellin" -- `searchImages` returns images (if CX configured) or helpful fallback
6. If any tool fails -- text response still works, no broken UI

## Post-Implementation

- Redeploy `lovable-concierge` edge function
- Optionally add `GOOGLE_CUSTOM_SEARCH_CX` secret for generic image search (instructions provided after implementation)

