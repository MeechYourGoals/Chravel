

## Findings

### Three distinct root causes confirmed:

**Bug 1: Only 3 cards rendered when 5 requested**
- `HotelResultCards.tsx` line 89: `hotels.slice(0, 3)` — hardcoded limit
- `PlaceResultCards.tsx` line 66: `places.slice(0, 3)` — same hardcoded limit
- The backend may return 5+ results, but the UI always truncates to 3

**Bug 2: "Sorry, I encountered an error" fallback text with cards still showing**
- Cards commit to React state immediately when the `searchPlaces`/`searchHotels` function-call result arrives (via `ensureAndPatch` in AIConciergeChat.tsx ~line 1217)
- The assistant text is generated in a separate streaming pass after tool results
- If the text-generation step fails (token budget, timeout, model error), cards are already in state but the text falls back to an error message
- This is the non-atomic response composition issue — cards and text are independent state updates

**Bug 3: TTS "listen" button fails — "API keys are not supported"**
- `concierge-tts/index.ts` line 88-90 uses `?key=` query parameter with `GOOGLE_CLOUD_TTS_API_KEY`
- The primary voice is `en-US-Chirp3-HD-Charon` — Chirp3-HD voices **require OAuth2/service account auth**, not API keys
- The error message in the screenshot confirms this: "API keys are not supported by this API. Expected OAuth2 access token"
- The `VERTEX_SERVICE_ACCOUNT_KEY` secret already exists for voice sessions — it should be reused here
- The fallback voice `en-US-Neural2-J` works with API keys, but the code only falls back on 400/404 status codes, and the auth error returns 403 which isn't in the `FALLBACK_RETRY_STATUSES` set

### Why the mixed state (error text + cards)?
The streaming handler in AIConciergeChat.tsx processes function-call results as they arrive and immediately patches them into the message via `ensureAndPatch`. The assistant's text content is accumulated separately. When the model fails to produce text after the tool call (timeout, token limit, or error), the error fallback sets the content to the error message, but the cards are already attached to that same message object. Result: error text + working cards.

---

## Minimal Fix Plan

### Fix 1: Remove hardcoded `.slice(0, 3)` limits
- `HotelResultCards.tsx` line 89: Remove `.slice(0, 3)` — render all hotels passed in
- `PlaceResultCards.tsx` line 66: Remove `.slice(0, 3)` — render all places passed in
- The parent components control what's passed; the rendering component shouldn't truncate

### Fix 2: TTS auth — switch from API key to OAuth2 service account
- Replace `GOOGLE_CLOUD_TTS_API_KEY` usage with `VERTEX_SERVICE_ACCOUNT_KEY` (already set)
- Generate OAuth2 access token from the service account JSON
- Use `Authorization: Bearer <token>` header instead of `?key=` query param
- Add 403 to `FALLBACK_RETRY_STATUSES` so auth failures on Chirp3-HD voices fall back to Neural2-J
- Cache the OAuth2 token in module-level memory (tokens last ~1 hour)

### Fix 3: Graceful partial-success text
- In the error/fallback path of AIConciergeChat.tsx, if cards already exist on the message, don't overwrite with a generic error — instead set a softer message like "Here's what I found:" so cards + text are coherent
- This is the minimal safe fix for the non-atomic composition issue without rewriting the streaming architecture

### Files to change:
1. `src/features/chat/components/HotelResultCards.tsx` — remove `.slice(0, 3)`
2. `src/features/chat/components/PlaceResultCards.tsx` — remove `.slice(0, 3)`
3. `supabase/functions/concierge-tts/index.ts` — replace API key auth with OAuth2 service account auth
4. `src/components/AIConciergeChat.tsx` — improve error fallback when cards already rendered

