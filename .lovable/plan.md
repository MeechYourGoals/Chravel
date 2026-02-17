

# Fix: AI Concierge Errors -- Unregistered Callers, Truncated Response, Empty Bubble

## Issues Identified

### Issue 1: "Method doesn't allow unregistered callers" error
**Root Cause:** The Gemini API is returning HTTP 403 with this error. This happens when the `GEMINI_API_KEY` doesn't have the Generative Language API enabled in Google Cloud Console, OR the key has IP/referrer restrictions that block server-side calls from Supabase Edge Functions. The error text gets truncated to 200 characters by `conciergeGateway.ts` line 147 (`errorText.substring(0, 200)`), which is why you see "Please use API Key or other form of API c" cut off.

**Fix:** Two changes:
1. **Backend (lovable-concierge):** When the streaming call to Gemini fails with 403 ("unregistered callers"), catch it explicitly and fall back to the Lovable gateway instead of letting the error propagate to the client. This ensures the user always gets a response.
2. **Frontend (conciergeGateway.ts):** Stop truncating error messages at 200 chars. Show the full error or a user-friendly message instead of the raw API error text.

### Issue 2: AI response cut off mid-sentence
**Root Cause:** The client sends `maxTokens: 1024` (line 634 in `AIConciergeChat.tsx`). For a detailed query like "when are Nurse John's Europe shows", Gemini hits the 1024-token output limit and stops generating mid-sentence ("While he performed several sold"). The `finishReason` from Gemini would be `MAX_TOKENS`.

**Fix:** Increase `maxTokens` from `1024` to `4096` in the client request config. The edge function already accepts up to 4000 (validated at line 102), so we also increase that cap to `8192`.

### Issue 3: Wrong name (John-Paul Servino vs John de la Cruz)
**Root Cause:** This is a Gemini hallucination from Google Search grounding returning mixed results. The fix to increase output tokens helps (more room for nuance), and enabling Google Search grounding is already active. We cannot control Gemini's factual accuracy directly, but increasing the token budget and ensuring grounding is enabled gives it the best chance.

### Issue 4: Empty chat bubble before AI responds
**Root Cause:** Line 660-668 in `AIConciergeChat.tsx` creates an empty assistant message (`content: ''`) immediately. Then `isTyping` is set to `false` only when the first chunk arrives (line 676-677). But the typing dots indicator (three bouncing dots) is rendered BELOW the empty bubble (line 69-78 in `ChatMessages.tsx`). So the user sees: empty dark bubble + dots below it.

**Fix:** Don't create the empty assistant bubble until the first chunk arrives. The typing dots indicator (which already exists and works) will show alone until streaming text starts appearing.

## Technical Details

### File 1: `src/components/AIConciergeChat.tsx`

| Line | Change |
|------|--------|
| 634 | Change `maxTokens: 1024` to `maxTokens: 4096` |
| 659-668 | Remove the immediate empty bubble creation. Instead, create the bubble inside `onChunk` when the first chunk arrives. |

### File 2: `src/services/conciergeGateway.ts`

| Line | Change |
|------|--------|
| 147 | Replace raw error text with a user-friendly message: "AI service temporarily unavailable. Please try again." instead of exposing raw Gemini API errors |

### File 3: `supabase/functions/lovable-concierge/index.ts`

| Lines | Change |
|-------|--------|
| 102 | Increase max validation from 4000 to 8192 |
| 421-426 | In the streaming Gemini call error handler, detect 403 errors and attempt Lovable gateway fallback before throwing |
| 1110 | Change default `maxTokens` fallback from 2048 to 4096 |

### File 4: `src/features/chat/components/ChatMessages.tsx`

No changes needed. The existing typing dots indicator (lines 69-78) already works correctly with `isTyping`. Once we stop creating the empty bubble prematurely, the dots will show by themselves.

## What This Fixes

- **No more raw API errors shown to users** -- Gemini 403 errors are caught and either retried via Lovable gateway or shown as a friendly message
- **No more truncated responses** -- 4096 max output tokens gives Gemini enough room for detailed answers about tour dates, schedules, etc.
- **No more empty chat bubble** -- The three-dot typing animation shows alone until the first streamed token arrives, then the bubble appears with content
- **Error text no longer cut off** -- User-friendly error message replaces the truncated raw API error

