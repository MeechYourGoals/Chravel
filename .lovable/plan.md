

# Fix: Live Button Silent Failure + Enable Features + Toast Feedback

## Root Cause

**The edge function was not deployed.** Zero logs for `gemini-voice-proxy` despite it being configured in `config.toml` and having code in place. I just deployed it successfully. The WS connection from the client was timing out after 20 seconds with no toast feedback visible because the user likely didn't wait that long.

Additionally, there's a **missing toast on initial click** — the user gets no immediate visual feedback that the Live session is starting, so it looks like "nothing happens."

## Changes

### 1. `src/components/AIConciergeChat.tsx` — Add toast feedback to `handleLiveToggle`
- Add `toast.info('Starting live voice…')` immediately when Live toggle starts
- Wrap the `await startLiveSession()` in a try/catch that shows `toast.error(...)` on failure
- This ensures the user always sees feedback on click, even before WS connects

### 2. `src/hooks/useGeminiLive.ts` — Add toast on dictation/voice errors
- Import `toast` from sonner
- Add toast feedback in `startSession` catch block and WS error/close handlers so the user always sees what went wrong
- Add toast on circuit breaker open

### 3. `supabase/functions/gemini-voice-proxy/index.ts` — Enable tools, affective, proactive
- Change `VOICE_TOOLS_ENABLED` default from `'false'` to `'true'`
- Change `VOICE_AFFECTIVE_DIALOG` default from `'false'` to `'true'`
- Change `VOICE_PROACTIVE_AUDIO` default from `'false'` to `'true'`

### 4. `supabase/functions/gemini-voice-session/index.ts` — Enable tools, affective, proactive
- Same three default changes to `'true'`

### 5. `src/config/voiceFeatureFlags.ts` — Align client-side defaults
- Change `VOICE_AFFECTIVE_DIALOG` default from `'false'` to `'true'`
- Change `VOICE_PROACTIVE_AUDIO` default from `'false'` to `'true'`

### 6. Redeploy both edge functions after changes

## Toast Strategy

| Event | Toast Type | Message |
|-------|-----------|---------|
| Live button clicked | info | "Starting live voice…" |
| Mic denied | error | "Microphone permission denied…" |
| WS connection dropped | error | "Voice connection dropped…" |
| Setup timeout | error | "Voice setup timed out…" |
| Circuit breaker open | warning | "Voice temporarily unavailable" |
| Auth failed | error | "Not authenticated…" |
| Vertex not configured | error | "Voice AI not configured" |
| Live session started | success | (none — the UI state change is sufficient) |

