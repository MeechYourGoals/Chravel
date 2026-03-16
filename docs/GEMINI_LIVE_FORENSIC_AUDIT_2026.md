# Gemini Live Forensic Audit Report — March 2026

> **Purpose:** Comprehensive audit and surgical fix of the Gemini Live bi-directional voice implementation for production reliability.

---

## 1. Current Implementation Architecture

### Flow (Direct Vertex AI Path)

```
User taps Live button
  → AIConciergeChat.toggleVoice() [DUPLEX_VOICE_ENABLED=true]
  → useGeminiLive.startSession()
  → Parallel: getUserMedia (mic) + POST gemini-voice-session (HTTP)
  → gemini-voice-session: OAuth2 token + builds setupMessage
  → Returns { accessToken, websocketUrl, setupMessage }
  → Client opens WebSocket: wss://{region}-aiplatform.googleapis.com/ws/...?access_token=XXX
  → Client sends setupMessage as first frame
  → Waits for setupComplete (20s timeout)
  → On setupComplete: startAudioCapture → stream PCM16 to WS
  → Receives serverContent (audio, transcripts, toolCall, turnComplete)
  → Tool calls → useVoiceToolHandler → execute-concierge-tool (server) or client Supabase
  → Tool results sent back as toolResponse with SILENT scheduling
```

### Key Files

| Layer | File | Purpose |
|-------|------|---------|
| Client | `src/hooks/useGeminiLive.ts` | WebSocket lifecycle, audio capture/playback, tool dispatch |
| Client | `src/lib/geminiLive/audioCapture.ts` | PCM16 16kHz capture (AudioWorklet/ScriptProcessor) |
| Client | `src/lib/geminiLive/audioPlayback.ts` | PCM16 24kHz playback queue |
| Client | `src/hooks/useVoiceToolHandler.ts` | Tool execution (client + execute-concierge-tool) |
| Edge | `supabase/functions/gemini-voice-session/index.ts` | Token minting, setup message, WebSocket URL |
| Edge | `supabase/functions/execute-concierge-tool/index.ts` | Server-side tool execution (same as text concierge) |
| Edge | `supabase/functions/_shared/voiceToolDeclarations.ts` | 35 tool declarations for Live API |

### Architecture Decision: **C — Vertex AI with Server-Side Auth**

- **Why:** Production-safe. Credentials never touch the browser. OAuth2 token minted server-side; client connects directly to Vertex with short-lived token. Same pattern as official Google demo (Python server + JS client).
- **Alternative B (proxy):** `gemini-voice-proxy` exists but is not wired in the client. Client uses direct path.
- **Alternative A (API key):** Not suitable for Vertex AI; requires OAuth/service account.

---

## 2. Official Reference Architecture (Vertex AI Live API)

**Sources:** [Get started WebSocket](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api/get-started-websocket), [Live API reference](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/multimodal-live), [ai.google.dev Live API](https://ai.google.dev/api/live)

- **Endpoint:** `wss://{LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`
- **Auth:** OAuth 2.0 bearer token (query param `?access_token=` for browser; header for server)
- **First message:** `{ setup: BidiGenerateContentSetup }` — camelCase
- **Model:** `projects/{PROJECT}/locations/{LOCATION}/publishers/google/models/gemini-live-2.5-flash-native-audio`
- **Audio:** PCM16 16kHz mono input, 24kHz output
- **Tools:** `{ functionDeclarations: [...] }` — OpenAPI-style types (lowercase: object, string, number)

---

## 3. Gap Analysis: Current vs Correct

| Area | Current | Correct | Fix |
|------|---------|---------|-----|
| sessionResumption | `{}` when no token | Omit field | Omit when no token |
| Keepalive (proxy) | `data: ""` | Base64 PCM16 silence | Use SILENT_KEEPALIVE_B64 |
| setup message | camelCase | camelCase | ✓ Already correct |
| Endpoint | v1beta1 | v1beta1 | ✓ Correct |
| Model | gemini-live-2.5-flash-native-audio | GA model | ✓ Correct |
| Tool parity | 35 tools, execute-concierge-tool | Same as text | ✓ Parity exists |

---

## 4. Exact Root Cause(s)

**Primary:** `sessionResumption: {}` when no resumption token. Some Vertex AI API versions reject empty objects for optional fields; omitting the field avoids rejection.

**Secondary:** Proxy keepalive used empty `data`; upstream may reject invalid media chunks. Fixed by using base64-encoded PCM16 silence (320 samples).

---

## 5. Minimal Production-Safe Fix Plan

1. **gemini-voice-session:** Omit `sessionResumption` when `resumptionToken` is absent.
2. **gemini-voice-proxy:** Same sessionResumption fix; replace empty keepalive data with base64 PCM16 silence.
3. No client changes required for the handshake fix.

---

## 6. Code Changes Made

- `supabase/functions/gemini-voice-session/index.ts`: Omit `sessionResumption` when no token.
- `supabase/functions/gemini-voice-proxy/index.ts`: Omit `sessionResumption` when no token; use `SILENT_KEEPALIVE_B64` for keepalive.

---

## 7. External Configuration Changes Required

### Supabase Edge Function Secrets

Set in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

| Secret | Description |
|--------|-------------|
| `VERTEX_PROJECT_ID` | GCP project ID |
| `VERTEX_LOCATION` | Region (e.g. `us-central1`) |
| `VERTEX_SERVICE_ACCOUNT_KEY` | Base64-encoded service account JSON |

**Encode key:**
```bash
cat service-account.json | base64 -w 0
```

### Google Cloud Console

1. **Enable Vertex AI API:** APIs & Services → Enable "Vertex AI API"
2. **Create Service Account:** IAM → Service Accounts → Create → Grant `roles/aiplatform.user`
3. **Create Key:** Service Account → Keys → Add Key → JSON → Download
4. **Billing:** Ensure project has billing enabled

### Optional Env Vars (Edge Function)

| Var | Default | Purpose |
|-----|---------|---------|
| `VERTEX_LIVE_MODEL` | `gemini-live-2.5-flash-native-audio` | Model override |
| `VOICE_TOOLS_ENABLED` | `true` | Enable/disable tools |
| `VOICE_AFFECTIVE_DIALOG` | `true` | Affective dialog (preview) |
| `VOICE_PROACTIVE_AUDIO` | `true` | Proactive audio (preview) |

---

## 8. Dead Code Removed

None. Changes are additive/conditional.

---

## 9. Regression Risks

- **Text concierge:** Unchanged. Uses `lovable-concierge`, not voice path.
- **Dictation:** Unchanged. `useWebSpeechVoice` separate from `useGeminiLive`.
- **Tool execution:** Unchanged. Same `execute-concierge-tool` and `useVoiceToolHandler`.

---

## 10. Final Verification Steps

1. Deploy: `supabase functions deploy gemini-voice-session gemini-voice-proxy`
2. Set secrets if not already set
3. In app: Open trip → tap Live (waveform) → allow mic → verify setupComplete arrives within 20s
4. Speak → verify audio response
5. Test tool: "Add dinner to the calendar tomorrow at 7pm" → verify pending action created

---

## Tool Parity Summary

The Live voice assistant has access to the same tools as the text concierge:

- **Client-side (useVoiceToolHandler):** addToCalendar, createTask, createPoll, getPaymentSummary (Supabase direct)
- **Server-side (execute-concierge-tool):** searchPlaces, getPlaceDetails, getDirectionsETA, savePlace, searchWeb, searchFlights, updateCalendarEvent, deleteCalendarEvent, createBroadcast, getWeatherForecast, convertCurrency, makeReservation, settleExpense, etc.

All tools route through `execute-concierge-tool` which uses `executeToolSecurely` → `executeFunctionCall` (same as lovable-concierge).
