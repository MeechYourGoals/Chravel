

# Deep Dive: Why Restaurant Photos Timed Out + Fix Plan

## Root Cause Analysis

### What actually happened in the screenshot

1. You asked: "restaurants nearby and can you show me photos of what the food looks like"
2. Gemini correctly identified this as a trip-related query and invoked the `searchPlaces` tool
3. `searchPlaces` returned results WITH `previewPhotoUrl` fields (proxied through `image-proxy`)
4. The model then likely tried to call `getPlaceDetails` for each restaurant to get more photos (up to 5 photos per place)
5. The follow-up LLM call (where Gemini writes the response incorporating tool results) has a 40-second timeout
6. Total chain: LLM (5-8s) + searchPlaces API (2-3s) + follow-up LLM with tool results (5-10s) = 12-21s normally, but on a bad day the Places API or follow-up LLM can take 15-20s each, pushing past the combined server timeout

### Three compounding problems

**Problem 1: No timeout budget management.** The streaming endpoint has a 50s outer timeout, the follow-up call has 40s, but the `searchPlaces` call has NO timeout at all. If Places API is slow (5-10s), the remaining budget for the follow-up LLM call shrinks, causing a cascade failure.

**Problem 2: `onFunctionCall` is never wired on the client.** The `conciergeGateway.ts` properly parses `function_call` SSE events and calls `callbacks.onFunctionCall?.(name, result)`. But `AIConciergeChat.tsx` never passes an `onFunctionCall` callback when calling `invokeConciergeStream()`. This means tool results (which contain `previewPhotoUrl`, ratings, addresses) are received and immediately discarded. The client relies entirely on the follow-up LLM text to mention the photos as markdown `![image](url)` -- if that follow-up times out, everything is lost.

**Problem 3: Photos require a two-step chain.** `searchPlaces` returns `previewPhotoUrl` (1 photo per place). But if the user asks for "food photos," the model may attempt `getPlaceDetails` per restaurant (sequential, not parallel) to get more photos, multiplying latency.

### Key separation audit (GOOD NEWS)

Your key separation is already correct:
- `GEMINI_API_KEY` (secret) -- only used for LLM calls in `gemini.ts` and `lovable-concierge/index.ts`
- `GOOGLE_MAPS_API_KEY` (secret) -- used server-side only in `functionExecutor.ts` and `image-proxy`
- `VITE_GOOGLE_MAPS_API_KEY` (secret) -- browser-only, used for Maps JS API loading

No key leakage detected. The `image-proxy` edge function correctly keeps `GOOGLE_MAPS_API_KEY` server-side and never exposes it to the client. Photo URLs served to the client are proxied through `/functions/v1/image-proxy?placePhotoName=...`.

### API restrictions from your screenshot

Your key has 27 APIs enabled including Places API (New), Geocoding, Directions, Routes, Distance Matrix, Time Zone, Maps Embed, Custom Search, and more. This covers everything needed. No missing APIs.

---

## Fix Plan (4 changes)

### A) Wire `onFunctionCall` on the client to render tool results immediately

**File: `src/components/AIConciergeChat.tsx`**

Currently, when `searchPlaces` returns results (with photo URLs, ratings, addresses), the SSE event arrives but is silently dropped. Fix: pass an `onFunctionCall` handler that renders place cards directly into the chat as a rich message, BEFORE waiting for the follow-up LLM response.

This means even if the follow-up LLM call times out, the user still sees the restaurant results with photos immediately.

```text
onFunctionCall: (name, result) => {
  if (name === 'searchPlaces' && result.places) {
    // Render place results as a structured message immediately
    // Include previewPhotoUrl, rating, address, mapsUrl
  }
  if (name === 'getPlaceDetails' && result.photoUrls) {
    // Append photo gallery to the existing stream message
  }
}
```

### B) Add timeout to `searchPlaces` in `functionExecutor.ts`

**File: `supabase/functions/_shared/functionExecutor.ts`**

The `searchPlaces` fetch has no `AbortSignal.timeout()`. Other tools (getDirectionsETA, getTimezone, getPlaceDetails) all have 8-10s timeouts, but searchPlaces does not. Add `signal: AbortSignal.timeout(8_000)` and reduce `maxResultCount` from 5 to 3 when the query mentions "restaurants" or "food" to keep the response fast.

### C) Create a `PlaceResultCards` component for rich rendering

**File: `src/features/chat/components/PlaceResultCards.tsx` (new)**

A dedicated component that renders 2-3 restaurant cards inline in the chat bubble, each showing:
- Place name (linked to Google Maps)
- Star rating + review count
- Price level indicator
- Address
- 1 thumbnail photo (from `previewPhotoUrl`, loaded via `image-proxy`)
- "Open in Maps" link

This component will be used by the `onFunctionCall` handler and also parsed from markdown `![](image-proxy?...)` patterns in the follow-up LLM response.

### D) Parallelize photo fetches in the follow-up flow

**File: `supabase/functions/lovable-concierge/index.ts`**

When the streaming path processes multiple sequential function calls (e.g., `searchPlaces` then `getPlaceDetails` x3), they currently execute sequentially in a `for...of` loop. Change: if the model returns multiple function calls in a single response, execute them with `Promise.all` (with individual 8s timeouts). If any photo fetch fails, return the place data without photos rather than failing the entire request.

---

## Files Changed Summary

| File | Change | Priority |
|---|---|---|
| `src/components/AIConciergeChat.tsx` | Wire `onFunctionCall` callback to render tool results immediately | Critical |
| `src/features/chat/components/PlaceResultCards.tsx` | New component for rich place/restaurant cards with photos | Critical |
| `supabase/functions/_shared/functionExecutor.ts` | Add 8s timeout to `searchPlaces`; reduce maxResultCount to 3 | High |
| `supabase/functions/lovable-concierge/index.ts` | Parallelize multi-function-call execution with `Promise.all` | High |
| `src/features/chat/components/ChatMessages.tsx` | Detect and render `PlaceResultCards` from function_call data in messages | High |

## What is NOT changed

- `image-proxy` edge function -- already works correctly
- `conciergeGateway.ts` -- already parses `function_call` events correctly
- Key configuration -- already properly separated
- `MessageRenderer.tsx` -- markdown image rendering already works (img component handles `image-proxy` URLs)
- No new API keys or secrets needed
- No database migrations needed

## Env Vars / Deployment Checklist

| Variable | Where Set | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Supabase secrets | LLM calls only |
| `GOOGLE_MAPS_API_KEY` | Supabase secrets | Server-side Places/Routes/Maps/Photos |
| `VITE_GOOGLE_MAPS_API_KEY` | Lovable secrets | Browser Maps JS API loading |
| `LOVABLE_API_KEY` | Supabase secrets | Gateway fallback |
| `GOOGLE_CUSTOM_SEARCH_CX` | Supabase secrets (if set) | Image/web search |

**Browser key HTTP referrer restrictions should include:**
- `chravel.lovable.app`
- `*.lovable.app` (for preview URLs)
- `localhost:*` (for local dev)
- Your production domain when deployed

## QA Test Cases

1. "Find 2-3 restaurants near Crypto.com Arena with photos" -- should show place cards with thumbnails within 10s
2. "How long from LAX to Crypto.com Arena by car" -- should show directions + map card
3. If Places API is slow, place cards should still appear without photos (graceful degradation)
4. If the follow-up LLM times out, the function_call results should already be visible in chat

