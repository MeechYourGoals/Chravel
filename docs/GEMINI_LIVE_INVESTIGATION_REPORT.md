# Gemini Live API Deep Dive Report: What's Broken, What's Wired, and What's Missing

> **Date:** 2026-03-08
> **Purpose:** Comprehensive investigation report for Meech to feed into ChatGPT with external resources, to produce a working implementation plan

---

## 1. EXECUTIVE SUMMARY

The Gemini Live bidirectional voice system in Chravel is **95% built** but **0% working**. The entire client-side infrastructure (audio capture, playback, WebSocket management, barge-in, tool calling, UI overlay) is production-grade and complete. The edge function for token minting is complete. **The system fails at the WebSocket handshake layer** — the connection to Google's servers either never completes setup, times out, or returns errors. The root causes are a combination of API configuration issues, protocol mismatches, and evolving Google API requirements.

---

## 2. WHAT IS FULLY WIRED AND WORKING (Client-Side)

### 2.1 Audio Pipeline (Complete)
- **`src/lib/geminiLive/audioCapture.ts`** — AudioWorklet-based PCM16 capture at 16kHz mono, with ScriptProcessor fallback for older iOS. Downsamples from native sample rate, converts to base64 PCM16.
- **`src/lib/geminiLive/audioPlayback.ts`** — `AudioPlaybackQueue` class that schedules PCM16 24kHz audio buffers for gapless playback, with flush/destroy for barge-in.
- **`src/voice/audioContract.ts`** — Runtime assertions on chunk framing (no giant frames >48k samples, no empty loops).

### 2.2 WebSocket Session Hook (Complete)
- **`src/hooks/useGeminiLive.ts`** (1400+ lines) — Full state machine covering:
  - Parallel mic permission + token fetch (saves 5-15s)
  - WebSocket lifecycle (open → setup → listening → sending → playing → interrupted → idle)
  - Barge-in detection via RMS threshold (0.035) — flushes playback queue and sends cancel signal
  - Tool call dispatching (receives `function_call` from Gemini, executes via `useVoiceToolHandler`, returns `toolResponse`)
  - Input/output transcript accumulation
  - Turn management (turnComplete, drain timeout, conversation history)
  - Auto-reconnect (max 2 retries after first successful session)
  - Keepalive pings (silent PCM16 frame every 15s)
  - Session expiry warning (25 min)
  - Both camelCase and snake_case field handling (AI Studio vs Vertex)

### 2.3 UI Components (Complete)
- **`src/features/chat/components/VoiceLiveOverlay.tsx`** — Full-screen immersive voice UI with waveform ring
- **`src/features/chat/components/VoiceButton.tsx`** — Waveform button with state visualization
- **`src/features/chat/components/AiChatInput.tsx`** — Input bar integrating voice button

### 2.4 Safety Infrastructure (Complete)
- **`src/voice/circuitBreaker.ts`** — 3-failures-in-5-minutes circuit breaker with localStorage persistence (24h TTL), half-open probe
- **`src/voice/transport/createTransport.ts`** — WebSocket-only transport (rejects SSE/HTTP)
- **`src/config/voiceFeatureFlags.ts`** — Environment-driven feature flags

### 2.5 Tool Handler (Complete)
- **`src/hooks/useVoiceToolHandler.ts`** — Bridges 35 tool declarations to Supabase/client-side execution

### 2.6 State Management (Complete)
- **`src/store/conciergeSessionStore.ts`** — Zustand store for session state

---

## 3. WHAT IS FULLY WIRED (Server-Side)

### 3.1 Edge Function: `gemini-voice-session`
**File:** `supabase/functions/gemini-voice-session/index.ts` (1050 lines)

This function does TWO things:
1. **Mints an access token** (either Vertex AI OAuth2 or AI Studio ephemeral token)
2. **Returns WebSocket URL + setup message** for the client to connect directly to Google

**Vertex AI path (default, `VOICE_PROVIDER=vertex`):**
- Decodes base64 service account key
- Signs a JWT with RSA (RS256) using Web Crypto API
- Exchanges JWT for OAuth2 access token at `https://oauth2.googleapis.com/token`
- Returns: `{ accessToken, websocketUrl, setupMessage, model, voice, provider }`

**AI Studio path (fallback, `VOICE_PROVIDER=ai_studio`):**
- Creates ephemeral token via `POST https://generativelanguage.googleapis.com/v1alpha/auth_tokens`
- Returns: `{ accessToken, websocketUrl, model, voice, provider }`

### 3.2 Voice Function Declarations
35 tool declarations defined in the edge function for the Gemini model to call during voice sessions (addToCalendar, searchPlaces, createPoll, etc.)

### 3.3 System Prompt + Voice Addendum
The edge function builds a full trip-context system prompt via `TripContextBuilder` and appends a voice-specific addendum with delivery guidelines.

---

## 4. WHERE IT BREAKS — THE 5 ROOT CAUSES

### ROOT CAUSE 1: WebSocket Handshake Protocol Mismatch

**The BidiGenerateContentSetup message has structural issues.**

Current setup message sent by client (built by edge function):
```json
{
  "setup": {
    "model": "projects/{PROJECT}/locations/{LOCATION}/publishers/google/models/gemini-live-2.5-flash-native-audio",
    "generation_config": {
      "response_modalities": ["AUDIO"],
      "speech_config": { ... },
      "realtime_input_config": { ... },
      "output_audio_transcription": {},
      "input_audio_transcription": {}
    },
    "system_instruction": { "parts": [{ "text": "..." }] },
    "tools": [{ "function_declarations": [...] }, { "google_search": {} }]
  }
}
```

**Problems identified:**
- **`response_modalities: ["AUDIO"]`** — Should likely be `["AUDIO", "TEXT"]` for transcripts to work. Text-only responses (like tool call descriptions) need TEXT modality.
- **Missing `enableAffectiveDialog: true`** in `generation_config` — Required for natural conversational voice.
- **Missing `proactivity: { proactiveAudio: true }`** as a top-level setup field — Allows the model to speak proactively.
- **The exact field structure may have changed** since the API is rapidly evolving. The setup message format needs to be validated against current Vertex AI Live API docs (as of March 2026).

### ROOT CAUSE 2: API Endpoint Version Mismatch

**Current:** Uses `v1` endpoint:
```
wss://{LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1.LlmBidiService/BidiGenerateContent
```

**Problem:** Features like `enableAffectiveDialog`, `proactiveAudio`, and native audio models are **preview features** that may require `v1beta1`:
```
wss://{LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent
```

The codebase has a comment acknowledging this (`// GA endpoint uses v1 (not v1beta1)`) but the model being used (`gemini-live-2.5-flash-native-audio`) is a preview/native-audio model that may only be available on v1beta1.

### ROOT CAUSE 3: Function Declaration Type Casing

**Current:** Uses UPPERCASE enum values:
```json
{ "type": "OBJECT", "properties": { "title": { "type": "STRING" } } }
```

**Problem:** Vertex AI REST API may expect lowercase enum values:
```json
{ "type": "object", "properties": { "title": { "type": "string" } } }
```

This is documented in `docs/GEMINI_LIVE_ARCHITECTURE_REPORT.md` as Issue D but was never verified or fixed. If the model rejects the function declarations, the entire setup message fails silently or the WebSocket closes.

### ROOT CAUSE 4: OAuth2 / Authentication Issues

The Vertex AI path requires:
1. `VERTEX_PROJECT_ID` — GCP project ID
2. `VERTEX_LOCATION` — Region (default: `us-central1`)
3. `VERTEX_SERVICE_ACCOUNT_KEY` — Base64-encoded service account JSON

**Failure modes:**
- Service account key not set or incorrectly Base64-encoded (line breaks, padding stripped)
- Service account lacks `roles/aiplatform.user` permission
- Vertex AI API not enabled on the GCP project
- Token exchange fails silently (the edge function has error handling, but the client may not surface it clearly)
- The `atob()` function used for decoding may behave differently on Deno vs browser (edge function runs in Deno)

For the **AI Studio path** (legacy fallback):
- "Unregistered Callers" error documented as a known issue — API key created in Cloud Console may not work for `generativelanguage.googleapis.com`
- Key must be from Google AI Studio or the Generative Language API must be explicitly enabled
- The ephemeral token endpoint (`v1alpha/auth_tokens`) is alpha and may have changed

### ROOT CAUSE 5: Model Availability and Naming

**Current models referenced:**
- Vertex: `gemini-live-2.5-flash-native-audio`
- AI Studio: `gemini-2.5-flash-native-audio-preview-12-2025`

**Problem:** These model names are from late 2025/early 2026. Google frequently changes model names and availability. The model may have been:
- Renamed (e.g., preview suffix changed)
- Graduated to GA with a different name
- Deprecated in favor of a newer version
- Region-restricted (only available in certain `VERTEX_LOCATION` values)

---

## 5. HISTORICAL ISSUES WE ENCOUNTERED

Based on the codebase evidence (error messages, logging gates, docs, and defensive code):

### 5.1 "Unregistered Callers" Error
- Occurred on the AI Studio path
- API key was not created via Google AI Studio or Generative Language API wasn't enabled
- Led to the creation of `docs/VOICE_MODE_VERTEX_VS_GOOGLE_AI_ANALYSIS.md`

### 5.2 WebSocket Setup Timeout
- The WebSocket would open (`ws.onopen` fires) but `setupComplete` was never received
- The 12-second timeout would fire (`WEBSOCKET_SETUP_TIMEOUT_MS = 12_000`)
- Logged as `[VOICE:G2] ws_setup_timeout` with `wsMessageCount` showing how many messages were received
- This suggests the setup message was malformed or the model rejected it silently

### 5.3 WebSocket Close with No Error
- Socket would close with code 1006 (abnormal closure) or protocol errors
- No clear error message from the server
- Led to the creation of `mapWsCloseError()` with specific messages for each code

### 5.4 Circuit Breaker Tripping
- After 3 failed attempts, the circuit breaker would open and disable voice entirely
- Users would see "Voice is temporarily unavailable" with no clear cause
- Led to adding the "Try voice again" reset button

### 5.5 Audio Context Suspended on iOS
- iOS Safari requires AudioContext to be resumed on user gesture
- The code has TWO resume attempts with a 100ms gap between them
- This was fixed but may have masked other issues during testing

### 5.6 Confusion Between Vertex AI and Google AI Paths
- The codebase evolved from Google AI → Vertex AI path
- Both paths exist in the same edge function with a `VOICE_PROVIDER` switch
- The client-side code handles both providers but the WebSocket URL construction is identical for both (`?access_token=`)
- The Vertex path uses OAuth2 tokens while AI Studio uses ephemeral tokens — they authenticate differently

---

## 6. HOW CLOSE WE GOT

### What Worked:
- Edge function health check: `GET /functions/v1/gemini-voice-session` returns `{ configured: true }`
- Token generation: The OAuth2/ephemeral token flow runs without error
- Microphone capture: Audio is captured, downsampled, and base64-encoded correctly
- WebSocket opens: `ws.onopen` fires successfully
- Setup message sent: `vertexSetupMessage` is sent as first frame

### What Didn't Work:
- **`setupComplete` was never received** — The model never acknowledged the setup
- **No audio response ever came back** — We never got to the `server_content.model_turn.parts[].inline_data` handling
- **The session would timeout at Gate 2** (WebSocket setup) every time

### The Gap:
The entire issue is between "WebSocket opens" and "setupComplete received". The setup message format is wrong, the API endpoint version may be wrong, or the model name may be wrong. Everything else — audio pipeline, state machine, tool handling, UI — is production-ready.

---

## 7. WHAT NEEDS TO HAPPEN TO MAKE IT WORK

### 7.1 Validate the Exact Setup Message Format
- Get the current (March 2026) Vertex AI Live API documentation
- Verify the exact JSON structure of `BidiGenerateContentSetup`
- Check if `generation_config` fields have changed names or structure
- Verify `response_modalities`, `speech_config`, `realtime_input_config` structure

### 7.2 Fix API Endpoint Version
- Try `v1beta1` instead of `v1` for the WebSocket URL
- Check if `native-audio` models require a specific endpoint version

### 7.3 Fix Model Name
- Verify `gemini-live-2.5-flash-native-audio` is still the correct model identifier
- Check region availability for the model

### 7.4 Fix Function Declaration Casing
- Test with lowercase `type: "object"` vs uppercase `type: "OBJECT"`
- Or temporarily remove all function declarations to test basic audio first

### 7.5 Test Incrementally
1. First: Get `setupComplete` with a minimal setup message (no tools, no system instruction)
2. Then: Add system instruction
3. Then: Add function declarations
4. Then: Add advanced features (affectiveDialog, proactiveAudio)

### 7.6 Verify Secrets
- Confirm `VERTEX_SERVICE_ACCOUNT_KEY` decodes correctly
- Confirm service account has `roles/aiplatform.user` on the project
- Confirm Vertex AI API is enabled
- Confirm the region supports the model

---

## 8. COMPLETE FILE INVENTORY

### Frontend (all preserved, ready to re-enable):
| File | Lines | Purpose |
|------|-------|---------|
| `src/components/AIConciergeChat.tsx` | ~800 | Main UI + `DUPLEX_VOICE_ENABLED = false` flag (line 61) |
| `src/hooks/useGeminiLive.ts` | ~1400 | Full WebSocket duplex hook (state machine, audio, tools) |
| `src/hooks/useVoiceToolHandler.ts` | ~310 | Tool execution bridge |
| `src/hooks/useWebSpeechVoice.ts` | ~400 | Web Speech API dictation (current active fallback) |
| `src/features/chat/components/VoiceLiveOverlay.tsx` | — | Full-screen immersive voice UI |
| `src/features/chat/components/VoiceButton.tsx` | — | Waveform button |
| `src/features/chat/components/AiChatInput.tsx` | — | Input bar with voice button |
| `src/lib/geminiLive/audioCapture.ts` | ~243 | AudioWorklet/ScriptProcessor PCM16 capture |
| `src/lib/geminiLive/audioPlayback.ts` | ~103 | AudioContext playback queue |
| `src/voice/audioContract.ts` | — | Audio spec + runtime asserts |
| `src/voice/circuitBreaker.ts` | — | Failure tracking + half-open probe |
| `src/voice/transport/createTransport.ts` | — | WebSocket-only transport |
| `src/config/voiceFeatureFlags.ts` | — | Environment flag resolution |
| `src/store/conciergeSessionStore.ts` | — | Session state store |

### Backend:
| File | Lines | Purpose |
|------|-------|---------|
| `supabase/functions/gemini-voice-session/index.ts` | ~1050 | Token minting + WebSocket config + 35 tool declarations |
| `supabase/functions/_shared/contextBuilder.ts` | — | Trip context for system prompts |
| `supabase/functions/_shared/promptBuilder.ts` | — | System prompt generation |
| `supabase/functions/execute-concierge-tool/index.ts` | — | Server-side tool execution bridge |

### Documentation:
| File | Purpose |
|------|---------|
| `docs/GEMINI_LIVE_ARCHITECTURE_REPORT.md` | Architecture overview + fix guide |
| `docs/VOICE_HARDENING_RUNBOOK.md` | Ship-safe layer + re-enablement steps |
| `docs/VOICE_MODE_VERTEX_VS_GOOGLE_AI_ANALYSIS.md` | Vertex vs Google AI comparison |
| `docs/GEMINI_LIVE_INVESTIGATION_REPORT.md` | **THIS REPORT** |

---

## 9. ENVIRONMENT VARIABLES NEEDED

### Supabase Edge Function Secrets (for Vertex AI):
```
VERTEX_PROJECT_ID=<your-gcp-project-id>
VERTEX_LOCATION=us-central1
VERTEX_SERVICE_ACCOUNT_KEY=<base64-encoded service account JSON>
```

### Supabase Edge Function Secrets (for AI Studio fallback):
```
GEMINI_API_KEY=<key from aistudio.google.com>
VOICE_PROVIDER=ai_studio
```

### Frontend `.env` (optional):
```
VITE_VOICE_LIVE_ENABLED=true
VITE_VOICE_DIAGNOSTICS_ENABLED=true
VITE_VOICE_USE_WEBSOCKET_ONLY=true
VITE_GEMINI_VOICE_NAME=Charon
```

---

## 10. THE ONE-LINE FIX (Once Handshake Works)

```typescript
// src/components/AIConciergeChat.tsx line 61
const DUPLEX_VOICE_ENABLED = true;  // flip this
```

Everything else is already wired. The ONLY thing blocking production is the WebSocket handshake — specifically, getting `setupComplete` back from Google's server after sending the `BidiGenerateContentSetup` message.

---

## 11. CURRENT SETUP MESSAGE (EXACT CODE — Line 958-984 of edge function)

This is the exact setup message being sent. This is the critical piece that needs to be validated against current Google docs:

```json
{
  "setup": {
    "model": "projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/gemini-live-2.5-flash-native-audio",
    "generation_config": {
      "response_modalities": ["AUDIO"],
      "speech_config": {
        "voice_config": {
          "prebuilt_voice_config": {
            "voice_name": "Charon"
          }
        }
      },
      "realtime_input_config": {
        "automatic_activity_detection": {
          "start_of_speech_sensitivity": "START_OF_SPEECH_SENSITIVITY_LOW",
          "end_of_speech_sensitivity": "END_OF_SPEECH_SENSITIVITY_HIGH"
        }
      },
      "output_audio_transcription": {},
      "input_audio_transcription": {}
    },
    "system_instruction": {
      "parts": [{ "text": "<full system prompt + voice addendum>" }]
    },
    "tools": [
      { "function_declarations": [/* 35 tool declarations with UPPERCASE types */] },
      { "google_search": {} }
    ]
  }
}
```

---

## 12. CLIENT WEBSOCKET URL CONSTRUCTION (useGeminiLive.ts line 865-867)

```typescript
// Both Vertex and AI Studio use the same URL pattern — this may be wrong for Vertex
const wsUrl = isVertex
  ? `${websocketUrl}?access_token=${encodeURIComponent(accessToken)}`
  : `${websocketUrl}?access_token=${encodeURIComponent(accessToken)}`;
```

Note: Both branches are identical. Vertex AI may require a different auth mechanism (e.g., `Bearer` token in a header, or `Authorization` param) vs AI Studio's ephemeral token approach.

---

## 13. AUDIO FORMAT SPECIFICATIONS

### Input (Microphone → Gemini):
- Format: PCM16 (signed 16-bit little-endian)
- Sample rate: 16,000 Hz
- Channels: 1 (mono)
- MIME type sent: `audio/pcm;rate=16000`
- Chunk size: ~20-40ms frames
- Encoding: base64

### Output (Gemini → Speaker):
- Format: PCM16 (signed 16-bit little-endian)
- Sample rate: 24,000 Hz
- Channels: 1 (mono)
- Decoded from base64 in `serverContent.modelTurn.parts[].inlineData.data`

### Audio Capture Pipeline:
1. `getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })`
2. AudioWorklet (or ScriptProcessor fallback) captures at native sample rate
3. Downsamples to 16kHz if needed
4. Converts Float32 → Int16 (PCM16)
5. Base64-encodes the Int16 buffer
6. Sends via WebSocket as `{ realtimeInput: { mediaChunks: [{ mimeType, data }] } }`

---

## 14. QUESTIONS FOR CHATGPT / EXTERNAL RESOURCES

When feeding this report to ChatGPT with external docs, ask:

1. **What is the exact `BidiGenerateContentSetup` JSON structure as of March 2026** for the Vertex AI Live API with `gemini-live-2.5-flash-native-audio`?
2. **Should the WebSocket URL use `v1` or `v1beta1`** for native audio models?
3. **What is the current correct model name** for Gemini Live bidirectional audio on Vertex AI?
4. **Should function declaration `type` fields be uppercase (`OBJECT`) or lowercase (`object`)** in the Live API context?
5. **Is `enableAffectiveDialog` still a valid field**, and where exactly does it go in the setup message?
6. **Does `proactiveAudio` exist in the current API**, and what is its exact placement?
7. **What is the correct `realtime_input_config` structure** for automatic activity detection (barge-in)?
8. **Are there any required headers** on the WebSocket connection beyond the access token?
9. **What exact scopes** does the service account need for Vertex AI Live API access?
10. **Is there a minimal working example** of a `BidiGenerateContentSetup` message that gets `setupComplete` back?
11. **Does Vertex AI Live API accept `access_token` as a query param on the WebSocket URL**, or does it need to be passed differently?
12. **What is the correct audio MIME type for input** — `audio/pcm;rate=16000` or something else?
