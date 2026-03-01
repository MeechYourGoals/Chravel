

# Stage-Gated Voice Live Debug + Fix Plan

## Evidence Summary

| Check | Result |
|-------|--------|
| Edge function deployed? | YES -- boots in 32ms, responds to GET health check |
| GEMINI_API_KEY configured? | YES -- health check returns `configured: true` |
| Model name | `models/gemini-2.5-flash-native-audio-preview-12-2025` (valid, confirmed by Google examples) |
| Recent invocation logs? | **ZERO** -- no POST calls recorded. The function was never called by the client recently. |
| WebSocket URL correct? | YES -- `BidiGenerateContentConstrained` with `?access_token=` (correct for ephemeral tokens) |
| Client-side code correct? | Structurally yes -- calls `supabase.functions.invoke('gemini-voice-session')` |
| CORS headers? | Present, but `Access-Control-Allow-Origin` is `https://chravel.app` (may reject preview domain) |

## Root Cause Hypothesis (Evidence-Based)

**Zero edge function logs despite the function being deployed and healthy** means the client's `supabase.functions.invoke()` call is either:
1. Being rejected by CORS (preview domain `id-preview--*.lovable.app` not matching `chravel.app` origin)
2. Being rejected by `verify_jwt = true` before handler code runs (Supabase gateway returns 401 before booting the function, so no logs appear)
3. Silently failing on the client (error swallowed by timeout race or caught by generic catch)

The auto-reconnect logic then masks this: the first failure triggers a 2s retry, the second failure also fails silently, the third triggers the circuit breaker -- all while the user sees "Connecting... Establishing voice session..." for up to 25+ seconds.

---

## Gate 0: Prove the Edge Function Is Actually Invoked

**Pass criteria**: A single tap of Live produces a matching log line in both client console AND edge function logs with the same `sessionAttemptId`.

### Changes

**Client (`src/hooks/useGeminiLive.ts`):**
- Generate `sessionAttemptId = crypto.randomUUID()` at tap time
- Send it in the edge function body: `{ tripId, voice, sessionAttemptId }`
- Log with `console.warn` (not behind VOICE_DEBUG flag) at these mandatory points:
  - `[VOICE:G0] tap_live` -- immediately on startSession
  - `[VOICE:G0] invoke_start` -- before `supabase.functions.invoke`
  - `[VOICE:G0] invoke_done` -- after invoke returns (log status, duration, error if any)
  - `[VOICE:G0] invoke_failed` -- if invoke throws (log the full error message)

**Server (`supabase/functions/gemini-voice-session/index.ts`):**
- Log `handler_enter` as the FIRST line inside the POST handler (before auth check), including `sessionAttemptId` from body
- This ensures we get a log even if auth fails downstream

**If Gate 0 fails**: The function is never reached. Fix the client call (URL, auth, CORS) before proceeding.

---

## Gate 1: Token Creation Succeeds

**Pass criteria**: Edge function log shows `Token created` with a valid response and latency under 15s.

### Changes

**Server:**
- Already has good token creation logging (lines 540-560)
- Add: log the upstream Gemini `auth_tokens` response status code and latency separately
- Add: if token creation fails, log the full upstream error body (already partially done, enhance with status code)
- Add: surface the raw Gemini error in the response to the client (not just generic "failed to create token")

**Client:**
- Log the full sessionData response keys (already done via voiceLog, but now also via `console.warn` for Gate 1 visibility)
- If `sessionData.error` is present, log it immediately and show it to the user -- do NOT proceed to WebSocket

---

## Gate 2: WebSocket Handshake Completes

**Pass criteria**: Client logs show `ws:opened` followed by `ws:setupComplete` within 10s.

### Changes

**Client (`src/hooks/useGeminiLive.ts`):**
- Add `console.warn` logs (not just voiceLog) at:
  - `[VOICE:G2] ws_connecting` -- log the WS URL host (not the token)
  - `[VOICE:G2] ws_opened` -- log readyState
  - `[VOICE:G2] ws_first_message` -- log the type of the first inbound message
  - `[VOICE:G2] ws_setup_complete` -- log timing
  - `[VOICE:G2] ws_closed` -- log code + reason
  - `[VOICE:G2] ws_error` -- log event details
- **Log the first 5 inbound WS message types** (key names only, no secrets) so we can see if setupComplete never arrives vs never received
- **Display WS close code/reason on the UI error state** (not just in logs)

### Timeout fix
- Reduce `WEBSOCKET_SETUP_TIMEOUT_MS` from 25s to 12s
- Show incremental status: "Getting voice session..." during edge function call, "Opening audio channel..." during WS handshake

---

## Gate 3: Audio Send/Receive Works

**Pass criteria**: Client logs show `firstAudioChunkSent` and `firstAudioReceived` within 5s of `setupComplete`.

### Changes
- Already mostly instrumented via diagnostics metrics
- Add `console.warn` logs for:
  - `[VOICE:G3] mic_acquired` -- log device label
  - `[VOICE:G3] audio_context_state` -- log state (must be 'running')
  - `[VOICE:G3] first_audio_sent` 
  - `[VOICE:G3] first_audio_received`
  - `[VOICE:G3] first_audio_played`

---

## Auto-Reconnect Fix (After Gates Pass)

The current auto-reconnect masks failures by silently retrying and showing "Connecting..." again without explanation.

### Changes
- **Disable auto-reconnect by default** -- set `autoReconnectAllowedRef.current = false` initially
- Only enable it AFTER a first successful session (after `setupComplete` + `capture_started`)
- When reconnecting, show "Retrying... (attempt 1/2)" instead of "Connecting..."
- Cap retries at 2, with 2s backoff
- After max retries: show the actual error with WS close code, not generic "connection timed out"

---

## UI Fixes (VoiceLiveOverlay)

### Layout restructure

Remove the orb section entirely (lines 96-154 in VoiceLiveOverlay.tsx). Replace with:

```text
[  Red X  ]   [ Status Label . Detail text        ]
[  Live   ]   [ Transcript preview...              ]
```

### Specific changes to `VoiceLiveOverlay.tsx`:

1. **Delete** the entire orb div (lines 97-154): the `AudioLines` icon, pulse rings, gradient orb, and error icon
2. **Add "Live" label** under the close button: small red uppercase text, centered in the 44px-wide left column
3. **Left column**: CSS grid or flex column with `w-[44px]` fixed, items centered
4. **Right column**: `min-w-0` + truncation for status text, `flex-1`
5. **Status text updates**: Map `requesting_mic` to show "Getting voice session..." then "Opening audio channel..." based on which sub-step is active (pass a `substep` prop or use a more granular label)
6. **No layout jumping**: Use `min-h-[52px]` on the container so it doesn't shift when text changes

### Acceptance criteria
- Red X button centered exactly above "Live" label on all widths (375px-1920px)
- No waveform/AudioLines icon visible anywhere in the overlay
- Status text readable, left-aligned, truncated on overflow
- No horizontal shift when status changes between "Connecting" / "Listening" / "Speaking"

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useGeminiLive.ts` | Gate 0-3 instrumentation (console.warn logs), disable auto-reconnect by default, reduce WS timeout, incremental status |
| `supabase/functions/gemini-voice-session/index.ts` | Gate 0 handler_enter log (before auth), sessionAttemptId correlation, enhanced error surfacing |
| `src/features/chat/components/VoiceLiveOverlay.tsx` | Remove orb, add "Live" label, restructure to 2-column grid, no layout jumping |

## Verification Checklist

1. Open AI Concierge in any trip
2. Open browser console (not behind debug flag)
3. Tap Live button
4. Verify `[VOICE:G0] tap_live` appears in console
5. Verify `[VOICE:G0] invoke_start` appears within 100ms
6. Verify `[VOICE:G0] invoke_done` appears within 10s with status
7. Check edge function logs for `handler_enter` with matching sessionAttemptId
8. If Gate 0 passes: verify `[VOICE:G2] ws_opened` and `ws_setup_complete`
9. If Gate 2 passes: speak and verify `[VOICE:G3] first_audio_sent` and `first_audio_received`
10. End session: mic indicator disappears, UI returns to idle
11. Red X button centered above "Live" on mobile (375px) and desktop
12. No waveform icon visible

## Risk: LOW-MEDIUM

- Instrumentation is additive (console.warn logs)
- Auto-reconnect change reduces retry aggression (safer)
- UI changes are purely visual
- Edge function change is a single log line addition

## Rollback

Set `VITE_VOICE_LIVE_ENABLED=false` to hide voice entirely. Text chat unaffected.

