
# Fix Share Link Issues: Remove Auto-Redirect, Remove "Powered by," Fix Build Errors

## Root Cause: Why Wrong Trip Appeared

The `generate-trip-preview` edge function (line 390) includes:
```
<meta http-equiv="refresh" content="5;url=...">
```

This auto-redirects after 5 seconds to `{appBaseUrl}/trip/{tripId}/preview`. The `appBaseUrl` is determined by the `SITE_URL` env var, which in the Lovable Cloud environment resolves to the preview domain (not `chravel.app`). When the redirect lands on the Lovable preview SPA, the `TripPreview.tsx` component has its own 5-second safety timeout (lines 38-47) that forces loading to complete even if data hasn't arrived. If the `get-trip-preview` edge function is slow or the route resolution falls through to demo data, you see the wrong trip. Removing the auto-redirect eliminates this entirely.

---

## Changes

### 1. Remove "Powered by ChravelApp" from all preview cards

**`supabase/functions/generate-trip-preview/index.ts` (line 487)**
- Remove `<div class="logo">Powered by ChravelApp</div>`
- Keep the CTA button "View Trip on ChravelApp" (this is the manual click action)

**`supabase/functions/generate-invite-preview/index.ts` (line 501)**
- Remove `<div class="logo">Powered by ChravelApp</div>`

**`src/pages/DemoTripGate.tsx` (lines 226-228)**
- Remove the "Powered by ChravelApp" text from the demo gate footer

### 2. Remove auto-redirect (the 5-second meta refresh)

**`supabase/functions/generate-trip-preview/index.ts` (line 389-390)**
- Delete the `<meta http-equiv="refresh" ...>` tag entirely
- Users must click "View Trip on ChravelApp" to navigate

**`supabase/functions/generate-invite-preview/index.ts` (lines 392-393 and 600)**
- Delete both `<meta http-equiv="refresh" ...>` tags
- Delete the "Redirecting you to ChravelApp in 5 seconds..." text (line 499)
- Users must click "Join This Trip" to navigate

### 3. Fix 5 remaining build errors

**`supabase/functions/demo-concierge/index.ts` (lines 119, 131)**
- Add explicit type annotations: `.map((item: any) => ...)` and `.filter((item: any) => ...)`

**`supabase/functions/enhanced-ai-parser/index.ts` (line 289)**
- The `messages` array has `role: string` but `runParserModel` expects strict literal roles. Cast with `as any` at the call site.

**`supabase/functions/gemini-voice-session/index.ts` (line 65)**
- Add explicit type: `.some((row: any) => ...)`

**`supabase/functions/generate-embeddings/index.ts` (line 251)**
- The `doc` variable is typed as `{}` because the `Map` generic isn't inferred. Change `new Map(docs.map(...))` to `new Map<string, any>(docs.map(...))`.

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/generate-trip-preview/index.ts` | Remove meta refresh redirect (line 390) and "Powered by" (line 487) |
| `supabase/functions/generate-invite-preview/index.ts` | Remove both meta refresh tags (lines 393, 600), "Redirecting..." text (line 499), and "Powered by" (line 501) |
| `src/pages/DemoTripGate.tsx` | Remove "Powered by ChravelApp" (lines 226-228) |
| `supabase/functions/demo-concierge/index.ts` | Add `any` type annotations to `.map` and `.filter` callbacks |
| `supabase/functions/enhanced-ai-parser/index.ts` | Cast messages to `as any` at `runParserModel` call |
| `supabase/functions/gemini-voice-session/index.ts` | Add `any` type to `.some` callback |
| `supabase/functions/generate-embeddings/index.ts` | Type the `Map` generic as `Map<string, any>` |

## Implementation Order

1. Fix all 5 build errors (quick type fixes)
2. Remove "Powered by ChravelApp" from all 3 locations
3. Remove auto-redirect meta tags from both preview edge functions
4. Deploy updated edge functions
