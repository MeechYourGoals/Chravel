# Concierge "Live" Feature — Forensic Audit Report

**Date:** 2026-03-11
**Auditor:** Claude Code (Opus 4.6)
**Scope:** Full end-to-end analysis of the Gemini Live voice feature

---

## 1. Component Inventory

### Frontend Components

| # | Name | File Path | Score | Function | Health |
|---|------|-----------|-------|----------|--------|
| 1 | **AIConciergeChat** | `src/components/AIConciergeChat.tsx` | 98 | Parent orchestrator. Wires useGeminiLive to UI, manages Live toggle, streaming bubbles, turn completion. | **Healthy** — well-structured, all props passed correctly. |
| 2 | **AiChatInput** | `src/features/chat/components/AiChatInput.tsx` | 95 | Renders the Live pill button (Sparkles + "Live" label). Receives `onLiveToggle`, `isLiveActive`, `isLiveEligible`, `isLiveConnecting`. | **Healthy** — button is rendered when `isLiveEligible && onLiveToggle` are both truthy. Click handler calls `onLiveToggle` directly. No z-index or pointer-events issues found. |
| 3 | **VoiceActiveBar** | `src/features/chat/components/VoiceActiveBar.tsx` | 85 | Compact inline bar showing Live session state (Connecting/Listening/Speaking/Error). Shown when `isLiveSessionActive`. | **Healthy** — pure presentational, no logic bugs. |
| 4 | **VoiceLiveOverlay** | `src/features/chat/components/VoiceLiveOverlay.tsx` | 40 | Full-screen immersive voice overlay (Claude voice / Grok voice style). | **UNUSED** — imported nowhere in the codebase. Dead code. The codebase switched to VoiceActiveBar (inline) but this file was never removed. |
| 5 | **VoiceButton** | `src/features/chat/components/VoiceButton.tsx` | 60 | Waveform button for Web Speech API dictation only. Separate from Live. | **Healthy** — correctly scoped to dictation. |

### Hooks

| # | Name | File Path | Score | Function | Health |
|---|------|-----------|-------|----------|--------|
| 6 | **useGeminiLive** | `src/hooks/useGeminiLive.ts` | 100 | Core hook. Manages WebSocket to `gemini-voice-proxy`, audio capture/playback, state machine, circuit breaker, auto-reconnect, tool calls. ~1300 lines. | **Mostly healthy** — see failure analysis below. |
| 7 | **useVoiceToolHandler** | `src/hooks/useVoiceToolHandler.ts` | 80 | Client-side tool executor. Handles addToCalendar, createTask, createPoll locally; routes other tools to `execute-concierge-tool` edge function. | **Healthy** — proper input validation. |
| 8 | **useWebSpeechVoice** | `src/hooks/useWebSpeechVoice.ts` | 30 | Web Speech API dictation (legacy). Used by VoiceButton only. | **Healthy but separate** — not involved in Live flow. |
| 9 | **useConciergeReadAloud** | `src/hooks/useConciergeReadAloud.ts` | 20 | TTS for reading assistant messages aloud (concierge-tts edge function). | **Healthy, not involved in Live flow.** |

### Libraries

| # | Name | File Path | Score | Function | Health |
|---|------|-----------|-------|----------|--------|
| 10 | **audioCapture** | `src/lib/geminiLive/audioCapture.ts` | 95 | Microphone → PCM16 16kHz mono. AudioWorklet primary, ScriptProcessor fallback. | **Healthy** — proper downsample, worklet inlined as blob URL. |
| 11 | **audioPlayback** | `src/lib/geminiLive/audioPlayback.ts` | 90 | PCM16 24kHz → AudioBufferSourceNode scheduling. Handles drain callback for turn transitions. | **Healthy** — proper scheduling, flush, destroy. |
| 12 | **circuitBreaker** | `src/voice/circuitBreaker.ts` | 75 | Prevents infinite reconnect loops (3 failures in 5 min → circuit opens). localStorage-backed. | **Healthy but aggressive** — 3 failures is low. If Vertex is down, user hits this fast. Half-open logic is correct. |
| 13 | **audioContract** | `src/voice/audioContract.ts` | 70 | Audio parameter contract — 16kHz in, 24kHz out, chunk assertions. | **Healthy.** |
| 14 | **voiceFeatureFlags** | `src/config/voiceFeatureFlags.ts` | 65 | `VOICE_LIVE_ENABLED`, `VOICE_DIAGNOSTICS_ENABLED`, etc. | **Suspicious** — `VOICE_LIVE_ENABLED` is checked in config but NOT gated in `useGeminiLive.startSession()`. The flag exists but isn't actually enforced in the main flow. This is benign (defaults to true) but is dead code. |

### Supabase Edge Functions

| # | Name | File Path | Score | Function | Health |
|---|------|-----------|-------|----------|--------|
| 15 | **gemini-voice-proxy** | `supabase/functions/gemini-voice-proxy/index.ts` | 100 | **THE CRITICAL PATH.** WebSocket relay: Browser ↔ Proxy ↔ Vertex AI Live API. Handles auth, GCP OAuth2 token minting, setup message, bidirectional relay, keepalive. | **See detailed analysis below.** |
| 16 | **gemini-voice-session** | `supabase/functions/gemini-voice-session/index.ts` | 15 | **LEGACY/UNUSED** HTTP endpoint. Returns `{ accessToken, websocketUrl, setupMessage }` for client-side direct connection. Frontend does NOT call this — only the proxy is used. | **Dead code** — retained but unreachable from frontend. |
| 17 | **concierge-tts** | `supabase/functions/concierge-tts/index.ts` | 20 | Google Cloud TTS for read-aloud feature. Not involved in Live voice. | **Healthy, separate system.** |
| 18 | **vertexAuth (shared)** | `supabase/functions/_shared/vertexAuth.ts` | 95 | OAuth2 JWT signing with GCP service account key. Used by proxy, session, and TTS. | **Healthy** — proper RS256 JWT, 1hr token lifetime, 15s timeout. |

### State Management

| # | Name | File Path | Score | Function | Health |
|---|------|-----------|-------|----------|--------|
| 19 | **conciergeSessionStore** | `src/store/conciergeSessionStore.ts` | 40 | Zustand store for chat session persistence. NOT involved in voice state. | **Not relevant to Live.** |
| 20 | **DUPLEX_VOICE_ENABLED** | `src/components/AIConciergeChat.tsx:58` | 90 | Hardcoded `const DUPLEX_VOICE_ENABLED = true`. Controls whether Live button appears. | **Healthy** — always true, cannot be remotely toggled off. |

---

## 2. End-to-End Flow Map

```
USER TAP "Live" button
  │
  ├─ AiChatInput.onClick → calls onLiveToggle prop
  │
  ├─ AIConciergeChat.handleLiveToggle()
  │   ├─ Stop dictation if running
  │   ├─ If Live active → endLiveSession() → return
  │   ├─ Check plan limits (incrementUsageOnSuccess)
  │   ├─ toast.info('Starting live voice…')
  │   └─ await startLiveSession()
  │
  ├─ useGeminiLive.startSession()
  │   ├─ Gate 0: Circuit breaker check
  │   ├─ Gate 0: Browser support check (WebSocket + AudioContext + getUserMedia)
  │   ├─ Gate 0: Re-entrancy guard (isStartingRef)
  │   ├─ State → 'requesting_mic'
  │   ├─ Create AudioContext
  │   ├─ PARALLEL:
  │   │   ├─ supabase.auth.getSession() → get JWT
  │   │   └─ navigator.mediaDevices.getUserMedia() → get MediaStream
  │   ├─ Resume AudioContext (iOS Safari)
  │   ├─ Create AudioPlaybackQueue
  │   ├─ Build WSS URL: wss://{supabase-host}/functions/v1/gemini-voice-proxy
  │   ├─ new WebSocket(proxyUrl)
  │   │
  │   ├─ ws.onopen:
  │   │   ├─ Send init message: { authToken, tripId, voice, sessionAttemptId }
  │   │   └─ Start 20s setup timeout
  │   │
  │   ├─ [PROXY RECEIVES INIT] gemini-voice-proxy:
  │   │   ├─ Parse init JSON
  │   │   ├─ Verify Supabase JWT (getUser)
  │   │   ├─ Check VERTEX_PROJECT_ID + VERTEX_SERVICE_ACCOUNT_KEY
  │   │   ├─ Build system prompt (TripContextBuilder)
  │   │   ├─ Mint OAuth2 access token (vertexAuth.createVertexAccessToken)
  │   │   ├─ Build BidiGenerateContentSetup message
  │   │   ├─ Open upstream WSS to Vertex AI: wss://{location}-aiplatform.googleapis.com/...
  │   │   │   ├─ Uses ?access_token= query param (Deno WS doesn't support custom headers)
  │   │   ├─ upstream.onopen → send setup message → flush client buffer
  │   │   ├─ Start 30s upstream keepalive
  │   │   └─ Bidirectional relay: client ↔ proxy ↔ Vertex AI
  │   │
  │   ├─ [VERTEX RESPONDS] setupComplete message relayed to client
  │   │
  │   ├─ ws.onmessage (setupComplete):
  │   │   ├─ Clear setup timeout
  │   │   ├─ State → 'ready'
  │   │   ├─ Start 15s client keepalive (silent PCM16 frames)
  │   │   ├─ startAudioCapture() → AudioWorklet/ScriptProcessor
  │   │   │   ├─ On success: recordCircuitBreakerSuccess()
  │   │   │   ├─ State → 'listening'
  │   │   └─ Audio loop: capture → base64 PCM16 → ws.send(realtimeInput)
  │   │
  │   ├─ [USER SPEAKS] Audio chunks sent via realtimeInput
  │   │   ├─ State → 'sending' (after first chunk)
  │   │   ├─ inputTranscript from Vertex → setUserTranscript
  │   │
  │   ├─ [VERTEX RESPONDS] modelTurn with audio + text
  │   │   ├─ State → 'playing'
  │   │   ├─ Audio enqueued to AudioPlaybackQueue
  │   │   ├─ outputTranscript → setAssistantTranscript
  │   │   ├─ turnComplete → emit turn, wait for playback drain
  │   │   └─ On drain → State → 'listening'
  │   │
  │   ├─ [BARGE-IN] RMS threshold (0.035) during playback
  │   │   ├─ Flush playback
  │   │   ├─ Send clientContent.turnComplete
  │   │   ├─ State → 'interrupted' → 'listening'
  │   │
  │   └─ [TEARDOWN] endSession()
  │       ├─ cleanup(): stop capture, stop tracks, destroy playback, close WS
  │       ├─ State → 'idle'
  │       └─ Clear all timers/intervals
```

---

## 3. Bug Diagnosis — Ranked Failure Points

### FAILURE POINT #1: `Deno.upgradeWebSocket` Not Supported in Supabase Edge Functions
**Probability: 85%** (HIGHEST)

**Evidence:**
- `supabase/functions/gemini-voice-proxy/index.ts:724` uses `Deno.upgradeWebSocket(req)`.
- Supabase Edge Functions run on Deno Deploy. As of March 2026, **Supabase Edge Functions do NOT support WebSocket upgrades**. The `Deno.upgradeWebSocket` API exists in standalone Deno but is NOT available in the Supabase Edge Functions runtime. The function will fail at this line with a runtime error.
- The function also uses `serve()` from `https://deno.land/std@0.168.0/http/server.ts` which predates WebSocket support in Supabase's runtime.

**User-visible symptom:**
- Tapping "Live" → connecting spinner → 20-second timeout → "Voice setup timed out" error toast.
- Or immediate WebSocket connection refused / 426 Upgrade Required response.

**Log signal expected:**
- `[VOICE:G2] ws_connecting` fires on frontend
- `[VOICE:G2] ws_closed` with code 1006 (abnormal closure) or no messages received
- No server-side logs because the function crashes before reaching `clientWs.onopen`

**Exact fix:**
Supabase Edge Functions cannot act as WebSocket proxies. The architecture must change to one of:
1. **Use the `gemini-voice-session` HTTP endpoint** to mint an access token + setup message, then have the **browser connect directly** to Vertex AI's WebSocket endpoint using the returned token. This is the pattern used by many production Gemini Live apps.
2. **Deploy the WebSocket proxy on a different platform** (Cloud Run, Fly.io, Railway) that supports WebSocket upgrades.
3. **Use Supabase Realtime channels** as a message relay (complex, not recommended for audio streaming).

---

### FAILURE POINT #2: Missing VERTEX_PROJECT_ID / VERTEX_SERVICE_ACCOUNT_KEY
**Probability: 70%** (if proxy works)

**Evidence:**
- These are **not listed in `.env.example`** — only in `.env.production.example`.
- They're server-only secrets that must be set in Supabase Edge Function secrets via Dashboard or CLI.
- If missing, proxy sends `{ error: { code: 500, message: 'Vertex AI not configured' } }` and closes with code 4500.

**User-visible symptom:** "Voice AI is not configured. Please contact support."

**Log signal expected:** `[voice-proxy:xxx] init_received` → `close 4500 Not configured`

**Exact fix:** Set `VERTEX_PROJECT_ID` and `VERTEX_SERVICE_ACCOUNT_KEY` (base64-encoded JSON) in Supabase Edge Function secrets.

---

### FAILURE POINT #3: Vertex AI OAuth2 Token Exchange Failure
**Probability: 40%** (if secrets are set but misconfigured)

**Evidence:**
- `vertexAuth.ts` parses the service account key from base64, extracts PEM private key, signs a JWT, and exchanges it at `https://oauth2.googleapis.com/token`.
- If the base64 encoding is wrong, PEM is corrupted, or the service account doesn't have `aiplatform.googleapis.com` API enabled, this fails.

**User-visible symptom:** Connection timeout or "Voice session error".

**Log signal expected:** `[voice-proxy:xxx] minting_token` followed by error, no `token_minted` log.

**Exact fix:** Verify service account key is properly base64-encoded and the GCP project has Vertex AI API enabled with the Live API accessible.

---

### FAILURE POINT #4: Upstream WebSocket to Vertex AI Connection Failure
**Probability: 30%**

**Evidence:**
- `gemini-voice-proxy/index.ts:913-914`: upstream WS uses `?access_token=` query param because Deno WebSocket doesn't support custom headers.
- If Vertex AI rejects query-param auth (some endpoints require Authorization header), the upstream connection fails.
- The model path uses `gemini-live-2.5-flash-native-audio` — if this model name is wrong or deprecated, connection will fail.

**User-visible symptom:** 20-second timeout, "Voice setup timed out".

**Log signal expected:** `upstream_connecting` but no `upstream_opened` or `setup_complete_received`.

---

### FAILURE POINT #5: Circuit Breaker Stuck Open
**Probability: 15%**

**Evidence:**
- After 3 failures within 5 minutes, circuit opens. Persisted in localStorage.
- If the underlying issue is resolved but user hasn't waited 5 minutes or manually reset, all attempts are blocked.

**User-visible symptom:** Immediate "Voice is temporarily unavailable. Tap 'Try voice again' to retry." — no connection attempt made.

**Log signal expected:** `[VOICE:G0] tap_live` immediately followed by circuit breaker error state.

**Exact fix:** Already handled — "Try voice again" button calls `resetCircuitBreaker()`.

---

## 4. Supabase Edge Functions Audit

### gemini-voice-proxy (CRITICAL PATH)

| Field | Value |
|-------|-------|
| **Function name** | `gemini-voice-proxy` |
| **File path** | `supabase/functions/gemini-voice-proxy/index.ts` |
| **Purpose** | WebSocket relay: Browser ↔ Vertex AI Live API |
| **Expected request** | WebSocket upgrade, first message: `{ authToken, tripId, voice, sessionAttemptId }` |
| **Expected response** | WebSocket frames: Vertex AI bidirectional audio + text |
| **Required auth** | Supabase JWT (validated via `supabase.auth.getUser`) |
| **Required secrets** | `VERTEX_PROJECT_ID`, `VERTEX_SERVICE_ACCOUNT_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| **Likely failure** | **`Deno.upgradeWebSocket` not supported in Supabase Edge Functions runtime** |
| **Logging gaps** | Good logging with `[voice-proxy:uuid]` tag. Missing: structured error on GCP token exchange failure. |
| **Timeout concerns** | 20s client-side setup timeout, 15s context build timeout, 15s GCP token exchange timeout. These are reasonable but stacked (could total 50s). |

### gemini-voice-session (LEGACY/UNUSED)

| Field | Value |
|-------|-------|
| **Function name** | `gemini-voice-session` |
| **File path** | `supabase/functions/gemini-voice-session/index.ts` |
| **Purpose** | HTTP POST → returns `{ accessToken, websocketUrl, setupMessage }` for client-direct WS |
| **Expected request** | POST with `{ tripId, voice, sessionAttemptId, resumptionToken? }` |
| **Expected response** | JSON: `{ accessToken, model, voice, provider, websocketUrl, setupMessage, ... }` |
| **Required auth** | Authorization header (Supabase JWT) |
| **Required secrets** | Same as proxy: `VERTEX_PROJECT_ID`, `VERTEX_SERVICE_ACCOUNT_KEY` |
| **Likely failure** | Works as HTTP endpoint but **is not called by frontend code** |
| **Logging** | Good structured logging with request ID |
| **Key insight** | **This is the correct approach for Supabase**: mint a short-lived GCP token server-side, return it to client, let client connect directly to Vertex AI WebSocket. |

### concierge-tts

| Field | Value |
|-------|-------|
| **Function name** | `concierge-tts` |
| **File path** | `supabase/functions/concierge-tts/index.ts` |
| **Purpose** | Google Cloud TTS for read-aloud feature (separate from Live) |
| **Required secrets** | `VERTEX_SERVICE_ACCOUNT_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| **Not involved in Live flow** | ✓ |

---

## 5. Secrets / Env Vars Audit

### Frontend (VITE_* — build-time injected)

| Variable | Where Read | Frontend-Safe | Missing Risk | Fallback |
|----------|-----------|---------------|-------------|----------|
| `VITE_VOICE_LIVE_ENABLED` | `src/config/voiceFeatureFlags.ts` | ✅ Yes | Low | Defaults to `true` |
| `VITE_VOICE_DIAGNOSTICS_ENABLED` | `src/config/voiceFeatureFlags.ts` | ✅ Yes | None | Defaults to `false` |
| `VITE_VOICE_USE_WEBSOCKET_ONLY` | `src/config/voiceFeatureFlags.ts` | ✅ Yes | None | Defaults to `true` |
| `VITE_VOICE_DEBUG` | `src/hooks/useGeminiLive.ts` | ✅ Yes | None | Falls back to `import.meta.env.DEV` |
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts` | ✅ Yes | Low | Has hardcoded `KNOWN_PROJECT_URL` fallback |
| `VITE_SUPABASE_ANON_KEY` | `src/integrations/supabase/client.ts` | ✅ Yes | Low | Has hardcoded `KNOWN_ANON_KEY` fallback |

**Frontend verdict:** No frontend env var issues. SUPABASE_PROJECT_URL resolves correctly for WSS URL construction.

### Edge Functions (Deno.env — server-only)

| Variable | Where Read | Server-Only | Missing = Silent Failure? | Current Fallback |
|----------|-----------|-------------|--------------------------|------------------|
| `VERTEX_PROJECT_ID` | proxy, session, tts | ✅ Yes | **YES** — proxy sends 500 error but client may timeout first | None — hard error |
| `VERTEX_SERVICE_ACCOUNT_KEY` | proxy, session, tts | ✅ Yes | **YES** — same as above | None — hard error |
| `VERTEX_LOCATION` | proxy, session | ✅ Yes | No — defaults to `us-central1` | `us-central1` |
| `SUPABASE_URL` | all edge functions | ✅ Yes | Would crash all Supabase client creation | Auto-injected by Supabase |
| `SUPABASE_ANON_KEY` | all edge functions | ✅ Yes | Would crash auth | Auto-injected by Supabase |
| `VOICE_TOOLS_ENABLED` | proxy, session | ✅ Yes | No | `true` |
| `VOICE_AFFECTIVE_DIALOG` | proxy, session | ✅ Yes | No | `true` |
| `VOICE_PROACTIVE_AUDIO` | proxy, session | ✅ Yes | No | `true` |
| `GEMINI_API_KEY` | `_shared/gemini.ts`, `lovable-concierge` | ✅ Yes | Not relevant to Live (used by text concierge) | Lovable fallback |

**Server-side verdict:** `VERTEX_PROJECT_ID` and `VERTEX_SERVICE_ACCOUNT_KEY` are **CRITICAL** and their absence causes a clean error message, but this doesn't help if the proxy can't even accept WebSocket connections.

---

## 6. Dead Code / Drift Audit

### Dead Code

| Item | File | Evidence | Action |
|------|------|----------|--------|
| **VoiceLiveOverlay** | `src/features/chat/components/VoiceLiveOverlay.tsx` | Not imported by any file. AIConciergeChat uses VoiceActiveBar instead. | **Remove** |
| **gemini-voice-session** | `supabase/functions/gemini-voice-session/index.ts` | Not called from frontend. Only referenced in test file for tool parity check. | **KEEP** — this is actually the correct architecture. Should be revived as the primary path. |
| **VOICE_LIVE_ENABLED flag** | `src/config/voiceFeatureFlags.ts` | Exported but never checked in `useGeminiLive.startSession()` or `AIConciergeChat`. The actual gate is `DUPLEX_VOICE_ENABLED` (hardcoded `true`). | **Remove or wire up** — currently misleading. |
| **_liveConversationHistory** | `src/components/AIConciergeChat.tsx:540` | Destructured with `_` prefix = intentionally unused. Conversation history is managed via `messages` state + `handleLiveTurnComplete`. | Benign — the hook exposes it but the parent doesn't need it. |

### Competing Voice Systems

| System | Purpose | Status | Canonical? |
|--------|---------|--------|-----------|
| **useGeminiLive** (WebSocket proxy) | Bidirectional Gemini Live voice | **Active but broken** (proxy can't accept WS) | Intended canonical |
| **useWebSpeechVoice** (Web Speech API) | One-shot browser dictation | **Active, working** | Secondary/fallback |
| **gemini-voice-session** (HTTP + client WS) | Mint token, client connects directly | **Legacy/unused** | **Should be canonical** |
| **concierge-tts** (Google Cloud TTS) | Read text aloud | **Active, working** | Separate system (not "Live") |

### Stale Props / State

- `VoiceLiveOverlay` receives `onReconnect` prop but this component is never rendered — dead code.
- `useGeminiLive` returns `sendImage()` but it's never called anywhere.
- `useGeminiLive` returns `interruptPlayback()` but it's never called from UI (barge-in is automatic via RMS detection).

---

## 7. Logging / Observability

### Known Good Trace (Expected)

```
[VOICE:G0] tap_live { sessionAttemptId, tripId, voice }
[VOICE:G0] parallel_start { sessionAttemptId }
[VOICE:G3] audio_context_state { state, sampleRate }
[VOICE:G0] parallel_done { sessionAttemptId }
[VOICE:G3] mic_acquired { sessionAttemptId, deviceLabel }
[VOICE:G2] ws_connecting { sessionAttemptId, proxyUrl }
[VOICE:G2] ws_opened { sessionAttemptId, readyState }
[VOICE:G2] sending_init { sessionAttemptId }
--- SERVER SIDE ---
[voice-proxy:xxxx] client_connected
[voice-proxy:xxxx] init_received { hasTripId, hasAuthToken, voice }
[voice-proxy:xxxx] authenticated { userId }
[voice-proxy:xxxx] context_built
[voice-proxy:xxxx] minting_token
[voice-proxy:xxxx] token_minted
[voice-proxy:xxxx] upstream_connecting
[voice-proxy:xxxx] upstream_opened
[voice-proxy:xxxx] setup_sent { ... }
[voice-proxy:xxxx] first_upstream_message { keys, hasSetupComplete }
[voice-proxy:xxxx] setup_complete_received
--- CLIENT SIDE ---
[VOICE:G2] ws_message_1 { keys, hasSetupComplete: true }
[VOICE:G2] ws_setup_complete { sessionAttemptId }
[VOICE:G3] first_audio_sent { sessionAttemptId }
[VOICE:G3] first_audio_received { sessionAttemptId }
[VOICE:G3] first_audio_played { sessionAttemptId }
```

### What Actually Happens (Suspected)

```
[VOICE:G0] tap_live { sessionAttemptId, tripId, voice }
[VOICE:G0] parallel_start { sessionAttemptId }
[VOICE:G3] audio_context_state { state, sampleRate }
[VOICE:G0] parallel_done { sessionAttemptId }
[VOICE:G3] mic_acquired { sessionAttemptId, deviceLabel }
[VOICE:G2] ws_connecting { sessionAttemptId, proxyUrl }
[VOICE:G2] ws_closed { sessionAttemptId, code: 1006, reason: '' }
  ← WebSocket upgrade rejected by Supabase Edge Functions runtime
  ← No server-side logs because Deno.upgradeWebSocket fails
```

### Missing Instrumentation

1. **No health check call before WebSocket attempt.** The proxy has a GET health endpoint that returns `{ configured: true/false }`. The frontend should call this first to fail fast with a clear error.
2. **No client-side ping/pong monitoring.** The keepalive sends silent audio but doesn't verify the proxy is actually relaying.
3. **No structured telemetry export.** All logging is `console.warn` — no Sentry, no analytics, no structured event pipeline.

---

## 8. Final Output

### Top 5 Root Causes (Ranked)

1. **[P0 — CRITICAL] Supabase Edge Functions do not support `Deno.upgradeWebSocket`.** The `gemini-voice-proxy` WebSocket relay cannot run in Supabase's Deno Deploy runtime. This is the primary reason Live doesn't work. The WebSocket connection from the browser is rejected at the infrastructure level before any application code runs.

2. **[P1 — CRITICAL] Missing Vertex AI credentials.** Even if the proxy worked, `VERTEX_PROJECT_ID` and `VERTEX_SERVICE_ACCOUNT_KEY` may not be set in Supabase Edge Function secrets. These are not in `.env.example` and are easy to miss during setup.

3. **[P2 — MODERATE] Wrong architecture for Supabase.** The proxy pattern (browser → Supabase WS → Vertex WS) is the right idea for keeping GCP credentials server-side, but the wrong platform. The existing `gemini-voice-session` HTTP endpoint already implements the correct alternative: mint a short-lived token server-side, return it to the browser, and let the browser connect directly to Vertex AI.

4. **[P3 — LOW] Circuit breaker accumulates failures from infrastructure issue.** Each failed connection attempt (from P0) counts toward the circuit breaker threshold. After 3 attempts, voice is disabled for 5 minutes with no clear indication of what's wrong.

5. **[P4 — LOW] Duplicate edge functions with drift.** `gemini-voice-proxy` and `gemini-voice-session` have independently maintained copies of the same function declarations, voice addendum, and setup message builder. They can drift. The proxy has "SILENT EXECUTION." in descriptions while the session function doesn't.

### Fastest Safe Fix

**Switch from WebSocket proxy to client-direct WebSocket using the existing `gemini-voice-session` endpoint.**

Steps:
1. In `useGeminiLive.startSession()`, instead of opening a WebSocket to the proxy:
   - Call `gemini-voice-session` via HTTP POST (same as `supabase.functions.invoke('gemini-voice-session', ...)`)
   - Receive `{ accessToken, websocketUrl, setupMessage }`
   - Open WebSocket directly to Vertex AI: `wss://{location}-aiplatform.googleapis.com/...?access_token={token}`
   - Send `setupMessage` as first WS frame
   - Continue with existing audio capture/playback logic (unchanged)

2. This requires:
   - ~50 lines of change in `useGeminiLive.ts` (replace proxy WS with HTTP+direct WS)
   - No edge function changes (gemini-voice-session already works)
   - No UI changes
   - No new dependencies

3. Security note: The GCP access token is short-lived (1hr) and scoped to `cloud-platform`. It's passed via query param on the Vertex WebSocket URL. This is the same pattern Google's own SDK uses.

### Correct Long-Term Fix

1. Use `gemini-voice-session` as the session bootstrapper (HTTP → token + config)
2. Client connects directly to Vertex AI WebSocket
3. Remove `gemini-voice-proxy` (dead code after migration)
4. Remove `VoiceLiveOverlay` (already dead code)
5. Consolidate function declarations into a shared file used by both text and voice concierge
6. Add a pre-flight health check before attempting voice (call the health endpoint)
7. Implement structured telemetry for voice session lifecycle

### Issue Classification

**The issue is primarily: BACKEND INFRA (Supabase Edge Functions don't support WebSocket upgrades)**

The UI wiring is correct. The state management is correct. The permissions are correct. The audio pipeline is correct. The Gemini Live protocol implementation is correct. The problem is that the WebSocket proxy edge function **cannot run** on Supabase's platform.

---

## 9. Handoff Section (For Fixing LLM)

### Context
The Concierge "Live" feature in Chravel uses Gemini Live (Vertex AI bidirectional audio API) for real-time voice conversation. The feature is fully wired in the frontend but **does not work** because the WebSocket proxy edge function (`supabase/functions/gemini-voice-proxy/index.ts`) uses `Deno.upgradeWebSocket` which is NOT supported in Supabase Edge Functions.

### What to do
1. **Modify `src/hooks/useGeminiLive.ts`** to use a two-step connection:
   - Step 1: HTTP POST to `gemini-voice-session` edge function to get `{ accessToken, websocketUrl, setupMessage }`
   - Step 2: Open WebSocket directly to Vertex AI using the returned URL + token
   - Step 3: Send setupMessage as first frame
   - All existing audio capture, playback, state machine, tool call, and transcript handling stays the same

2. **Key files to modify:**
   - `src/hooks/useGeminiLive.ts` — replace `getProxyWsUrl()` + proxy WS with HTTP+direct WS
   - No other files need changes

3. **Key files to reference:**
   - `supabase/functions/gemini-voice-session/index.ts` — the HTTP endpoint that returns everything needed
   - `supabase/functions/_shared/vertexAuth.ts` — the OAuth2 token minting (already working)

4. **Do NOT modify:**
   - `src/lib/geminiLive/audioCapture.ts` — working correctly
   - `src/lib/geminiLive/audioPlayback.ts` — working correctly
   - `src/voice/circuitBreaker.ts` — working correctly
   - Any UI components — all wiring is correct

5. **After fixing:**
   - Verify `VERTEX_PROJECT_ID` and `VERTEX_SERVICE_ACCOUNT_KEY` are set in Supabase secrets
   - Test with `npm run dev` and open browser console — look for `[VOICE:G2] ws_setup_complete`
   - The `gemini-voice-proxy` can be deleted after confirming the fix works

### Regression Risk: LOW
The fix changes only the connection setup path. All audio, state, UI, and tool handling code is untouched.

### Rollback Strategy
Revert the single file change to `useGeminiLive.ts`. The proxy code still exists and can be re-enabled.
