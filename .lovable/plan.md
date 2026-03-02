
# Gemini Model Research: Corrected Findings + Voice Fix Plan

## Key Research Findings

### 1. TWO DIFFERENT PRODUCTS, TWO DIFFERENT MODEL NAME SYSTEMS

The docs you linked are **Vertex AI** docs (cloud.google.com). Chravel uses **Google AI Studio** (ai.google.dev). The model names are DIFFERENT between these two platforms:

| Platform | Live Audio Model ID | Text/Reasoning Model ID |
|----------|-------------------|------------------------|
| **Vertex AI** (cloud.google.com) | `gemini-live-2.5-flash-native-audio` | `gemini-3.1-pro-preview` |
| **Google AI Studio** (ai.google.dev) | `gemini-2.5-flash-native-audio-preview-12-2025` | `gemini-3.1-pro-preview` |

Critical distinction: The Vertex model `gemini-live-2.5-flash-native-audio` (GA, no date suffix) is a **different model ID** than the AI Studio model `gemini-2.5-flash-native-audio-preview-12-2025` (Preview, with date suffix). They use different API endpoints too.

### 2. CORRECT MODEL NAME FOR VOICE (AI Studio Path)

Since Chravel uses `generativelanguage.googleapis.com` (AI Studio endpoint) with an API key (not Vertex OAuth), the correct model name is:

```
gemini-2.5-flash-native-audio-preview-12-2025
```

This is confirmed by:
- The official AI Studio model page: `ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-native-audio-preview-12-2025`
- The official ephemeral tokens docs: both Python and JavaScript examples use exactly this model name with `liveConnectConstraints`
- The official Live API quickstart: `MODEL = "gemini-2.5-flash-native-audio-preview-12-2025"`

**The current edge function code IS using the correct model name.** My previous recommendation was correct. The Vertex model name (`gemini-live-2.5-flash-native-audio` without date suffix) would NOT work with the AI Studio endpoint.

### 3. GEMINI 3.1 PRO PREVIEW -- AVAILABLE ON AI STUDIO

Good news: `gemini-3.1-pro-preview` is available on BOTH Vertex and AI Studio. The current `_shared/gemini.ts` already has:

```typescript
const DEFAULT_PRO_MODEL = 'gemini-3.1-pro-preview';
```

So the text concierge is **already using Gemini 3.1 Pro Preview** for pro-tier requests. It supports:
- Grounding with Google Search
- System instructions
- Structured output
- Function calling
- Thinking
- 1M token context window

**However**, `gemini-3.1-pro-preview` does **NOT** support Live API. Live API is only supported by the native audio models. This confirms you need two separate models.

### 4. TWO-MODEL ARCHITECTURE (CONFIRMED CORRECT)

| Use Case | Model | Why |
|----------|-------|-----|
| Text concierge, web scraping, smart import, calendar import, grounding | `gemini-3.1-pro-preview` | Best reasoning, grounding, structured output, 1M context |
| Live bidirectional voice | `gemini-2.5-flash-native-audio-preview-12-2025` | Only model that supports Live API on AI Studio |

The app already does this. The `_shared/gemini.ts` handles text calls with `gemini-3.1-pro-preview`. The `gemini-voice-session` edge function uses `gemini-2.5-flash-native-audio-preview-12-2025`. No change needed to the model routing.

### 5. API KEY: ONE KEY WORKS FOR BOTH

Your single `GEMINI_API_KEY` from Google AI Studio works for both models. No separate keys needed. Both models are accessed via `generativelanguage.googleapis.com` using the same API key.

### 6. WHY VOICE STILL FAILS: ZERO EDGE FUNCTION LOGS

The edge function has `verify_jwt = false` set and the code logs `handler_enter` as the first action. Yet there are **ZERO logs**. This means one of:

a. The edge function deployment didn't pick up the latest code (most likely)
b. The client's `supabase.functions.invoke()` is silently failing before reaching the server
c. The Supabase gateway is rejecting requests before they reach the function runtime

The token format (`liveConnectConstraints`) and model name are both correct per official docs. The issue is that the function is not being reached.

---

## Fix Plan

### Fix 1: Force redeploy the edge function

The function needs to be redeployed to pick up the latest code changes (liveConnectConstraints format, correct model name, handler_enter logging, verify_jwt=false).

### Fix 2: Test the edge function directly

After redeployment, call the edge function health check endpoint directly to verify it responds. Then attempt a POST with auth to verify the token creation works.

### Fix 3: Check client-side invocation

Read the browser console logs for `[VOICE:G0]` entries. If `invoke_start` appears but `invoke_done` never does, the Supabase SDK call is hanging. If neither appears, the client code isn't reaching the startSession function.

### Fix 4: No model name changes needed

The current configuration is correct:
- Voice: `gemini-2.5-flash-native-audio-preview-12-2025` (correct for AI Studio)
- Text: `gemini-3.1-pro-preview` (already set in `_shared/gemini.ts`)
- Token format: `liveConnectConstraints` (correct per latest docs)

### Fix 5: Verify `gemini-3.1-pro-preview` is used everywhere it should be

The `_shared/gemini.ts` already maps old model names to `gemini-3.1-pro-preview` via aliases. However, there's one hardcoded `gemini-2.0-flash` in `functionExecutor.ts` line 1536 used for web page analysis. This should be updated to use the shared model resolution.

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/gemini-voice-session/index.ts` | No model/format changes needed -- just needs redeployment |
| `supabase/functions/_shared/functionExecutor.ts` | Update hardcoded `gemini-2.0-flash` on line 1536 to use `DEFAULT_FLASH_MODEL` (`gemini-3-flash-preview`) |

### Verification checklist

1. Redeploy `gemini-voice-session` edge function
2. Call GET health check: should return `configured: true`, model: `gemini-2.5-flash-native-audio-preview-12-2025`
3. Open browser console, tap Live
4. Look for `[VOICE:G0] invoke_start` and `invoke_done` in console
5. Check edge function logs for `handler_enter`
6. If token creation succeeds, look for `[VOICE:G2] ws_setup_complete`

### Key takeaway

The model names and token format are already correct. The most likely issue is that the edge function hasn't been redeployed with the latest code changes, so all the fixes from the last few iterations (liveConnectConstraints, correct model, handler_enter logging) are not actually running in production.
