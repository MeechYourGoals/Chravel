
# Fix: API Key Leak in Place Photo URLs + Image Proxy

## Problem

`getPlaceDetails` (line 308) and the future `searchPlaces` preview photo feature embed `GOOGLE_MAPS_API_KEY` directly into URLs returned to the client. Every user rendering a place photo in the concierge chat sees the raw API key in their browser's network tab.

## Solution

Create a server-side image proxy edge function that:
- Accepts a `placePhotoName` param (e.g. `places/ChIJ.../photos/AUc...`)
- Fetches the actual image bytes from Google using the API key server-side
- Returns the image with CORS + cache headers
- Also supports a generic `url=` param for future use (Custom Search images, etc.)
- Includes SSRF guards (block private IPs, require HTTPS)
- Enforces a 7MB max image size

Then update `functionExecutor.ts` to generate proxy URLs instead of raw Google API URLs.

## Files

| File | Change |
|------|--------|
| `supabase/functions/image-proxy/index.ts` | **New** -- Image proxy edge function |
| `supabase/functions/_shared/functionExecutor.ts` | Add `buildPlacePhotoProxyUrl()` helper; update `searchPlaces` to include `previewPhotoUrl`; update `getPlaceDetails` to use proxy URLs instead of raw key URLs |

## Technical Details

### image-proxy/index.ts
- `GET ?placePhotoName=places/ChIJ.../photos/AUc...&maxWidthPx=600&maxHeightPx=400` -- fetches from Places API with server-side key
- `GET ?url=https://...` -- generic HTTPS image proxy with SSRF guard
- Anti-traversal: rejects `..`, `://`, leading `/` in placePhotoName
- 12s timeout on upstream fetch
- Cache-Control: `public, max-age=86400, stale-while-revalidate=604800`

### functionExecutor.ts changes
- New helper `buildPlacePhotoProxyUrl(placePhotoName, maxWidthPx, maxHeightPx)` that returns `/functions/v1/image-proxy?placePhotoName=...`
- `searchPlaces`: add `previewPhotoUrl` using first photo's name through proxy
- `getPlaceDetails` line 306-309: replace raw `key=` URLs with proxy URLs
- No changes to function declarations in `lovable-concierge/index.ts` (the tool schema is unchanged; only the returned URL format changes)

### Deployment
- Deploy new `image-proxy` edge function
- Redeploy `lovable-concierge` to pick up updated `functionExecutor.ts`
- No new secrets needed (`GOOGLE_MAPS_API_KEY` is already configured)
