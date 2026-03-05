

# Fix Build Errors + TTS Latency Optimization

## Part 1: Fix Build Errors (3 issues in seed-carlton-universe)

### Issue 1: `categories` type mismatch (lines 172, 185, 198, etc.)
The `TripDef` interface declares `categories?: string[]` but values are assigned as JSON strings like `'["touring"]'`. Fix: change all 10 occurrences to actual arrays: `['touring']`, `['sports']`, `['work']`, `['productions']`.

### Issue 2: `JSON.parse(t.categories)` on line 895
Since `categories` will now be `string[]` (not a JSON string), remove the `JSON.parse` wrapper. Just use `t.categories || []`.

### Issue 3: `error` is `unknown` on line 1066
Add type narrowing: `(error instanceof Error ? error.message : String(error))`.

## Part 2: TTS Latency Optimization

The current architecture already returns raw binary audio (not Base64 JSON) from the edge function, and the frontend already uses blob playback. The bottleneck is:

1. **OAuth2 token minting** — every single TTS request mints a fresh JWT and exchanges it for an access token (~1-2s)
2. **Full text sent at once** — long AI responses synthesize as one giant request (~5-15s for Google to process)
3. **No playback until entire response downloads**

### Changes

#### A. Edge Function: Cache OAuth2 tokens (`concierge-tts/index.ts`)
Cache the access token in module-level memory (Deno edge functions keep warm for minutes). Only re-mint when expired. Saves ~1-2s per request.

#### B. Frontend: Sentence chunking (`useConciergeReadAloud.ts`)
Split text into sentences. Fetch and play the first sentence immediately (~0.5-1s for a short sentence). Pre-fetch subsequent sentences while the first plays. Queue them for gapless playback.

This transforms perceived latency from "wait 20-30s for everything" to "hear first words in ~1-2s."

### Files

| File | Change |
|------|--------|
| `supabase/functions/seed-carlton-universe/index.ts` | Fix 3 build errors |
| `supabase/functions/concierge-tts/index.ts` | Add OAuth2 token caching |
| `src/hooks/useConciergeReadAloud.ts` | Implement sentence chunking + audio queue |

