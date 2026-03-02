# Gemini Live Architecture Report

> **Date:** 2026-03-02 (updated)
> **Purpose:** Architecture overview + step-by-step fix guide for the Vertex AI bidirectional voice integration

---

## 1. Current Architecture (What Actually Runs)

### Text AI Concierge (typing messages)

```
AIConciergeChat → conciergeGateway.invokeConciergeStream()
                → POST /functions/v1/lovable-concierge  (stream: true)
```

**Client never calls `gemini-chat`.** The `gemini-chat` edge function exists but is a **proxy** that internally calls `lovable-concierge`. So the flow is:

- **Client** → `lovable-concierge` (directly)
- **gemini-chat** → (unused by main Concierge tab; proxies to lovable-concierge when invoked)

### Voice AI Concierge — Current State (Disabled)

The bidirectional Gemini Live integration is **feature-flagged off** (`DUPLEX_VOICE_ENABLED = false` in `src/components/AIConciergeChat.tsx`). The waveform button currently uses Web Speech API dictation (speech-to-text into the input field). All duplex infrastructure is preserved and ready to re-enable.

### Voice AI Concierge — Duplex Architecture (When Re-Enabled)

```
useGeminiLive.startSession()
  → POST /functions/v1/gemini-voice-session  { tripId, voice }
  → Returns ephemeral token
  → Client opens WebSocket to Vertex AI directly
     (wss://{region}-aiplatform.googleapis.com/ws/...)
```

---

## 2. Provider Routing (lovable-concierge)

| Condition | Provider used |
|-----------|---------------|
| `GEMINI_API_KEY` set, `AI_PROVIDER` ≠ `lovable` | **Gemini API directly** (streaming + non-streaming) |
| `GEMINI_API_KEY` missing | **Lovable gateway** (fallback) |
| `AI_PROVIDER=lovable` | **Lovable gateway** (forced) |

---

## 3. Functions That Need Secrets

| Function | Secrets Required | Fallback |
|----------|-----------------|----------|
| `gemini-voice-session` | `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_SERVICE_ACCOUNT_KEY` | None — throws if missing |
| `lovable-concierge` | `GEMINI_API_KEY` (preferred) | `LOVABLE_API_KEY` |
| `gemini-chat` | None (proxies to lovable-concierge) | N/A |

---

## 4. Step-by-Step Fix Guide for a Specialist

### Prerequisites

1. **Google Cloud Project** with Vertex AI API enabled and billing active
2. **Service Account** with `roles/aiplatform.user` permission
3. **Service Account JSON key** — Base64-encode the entire JSON file

### Step 1: Verify Supabase Secrets

Set these in **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

```
VERTEX_PROJECT_ID=your-gcp-project-id
VERTEX_LOCATION=us-central1
VERTEX_SERVICE_ACCOUNT_KEY=<base64-encoded JSON key>
```

Verify the Base64 encoding:
```bash
# Encode
cat service-account.json | base64 -w 0

# Verify it decodes correctly
echo "<your_base64>" | base64 -d | jq .client_email
```

### Step 2: Test the Edge Function Directly

```bash
# Health check (no auth needed)
curl -X GET \
  https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/gemini-voice-session \
  -H "Authorization: Bearer <anon_key>"
# Should return: { "configured": true }

# Token generation
curl -X POST \
  https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/gemini-voice-session \
  -H "Authorization: Bearer <user_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"tripId": "<valid_trip_id>", "voice": "Charon"}'
# Should return: { accessToken, expiresAt, websocketUri, model, config }
```

### Step 3: Fix the WebSocket Handshake (BidiGenerateContentSetup)

**File:** `supabase/functions/gemini-voice-session/index.ts`

The `BidiGenerateContentSetup` message (sent as the first WebSocket frame) has these known issues:

#### Issue A: Missing `enableAffectiveDialog`

This field must be inside `generation_config`, not at the top level:

```json
{
  "setup": {
    "model": "projects/{project}/locations/{location}/publishers/google/models/gemini-live-2.5-flash-native-audio",
    "generation_config": {
      "response_modalities": ["AUDIO", "TEXT"],
      "speech_config": { ... },
      "enableAffectiveDialog": true
    }
  }
}
```

#### Issue B: Missing `proactivity` object

This is a top-level field in the setup, NOT inside `generation_config`:

```json
{
  "setup": {
    "model": "...",
    "generation_config": { ... },
    "proactivity": {
      "proactiveAudio": true
    }
  }
}
```

#### Issue C: Endpoint Version

Current code uses `v1`:
```
wss://{LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1.LlmBidiService/BidiGenerateContent
```

`enableAffectiveDialog` and `proactiveAudio` are **preview features** — try `v1beta1`:
```
wss://{LOCATION}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent
```

#### Issue D: Function Declaration Field Naming

The `VOICE_FUNCTION_DECLARATIONS` array uses `type: 'OBJECT'`, `type: 'STRING'`. Vertex AI REST may expect lowercase enum values (`object`, `string`). Cross-reference with [Vertex AI Function Calling docs](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling).

### Step 4: Verify OAuth2 Token Flow

The `parseServiceAccountKey` function decodes with `atob(base64Key)`. Common failure modes:

- Line breaks in the Base64 string (use `-w 0` when encoding)
- Padding issues (`=` stripped)
- Wrong encoding (URL-safe Base64 vs standard)

After decoding, verify:
```javascript
const key = JSON.parse(atob(base64Key));
console.log(key.client_email);  // Should be a valid email
console.log(key.private_key?.substring(0, 30)); // Should start with "-----BEGIN"
```

### Step 5: Re-enable Duplex Voice

In `src/components/AIConciergeChat.tsx`, change:
```typescript
const DUPLEX_VOICE_ENABLED = false;
// → change to:
const DUPLEX_VOICE_ENABLED = true;
```

### Step 6: Redeploy

```bash
supabase functions deploy gemini-voice-session
```

Or in Lovable: the edge function auto-deploys on save.

### Step 7: Test End-to-End

1. Open a trip → Concierge tab
2. Tap the waveform button (should open the VoiceLiveOverlay)
3. Speak — verify audio capture and model response
4. Check edge function logs: Supabase Dashboard → Edge Functions → `gemini-voice-session` → Logs

---

## 5. Key Files Reference

| File | Purpose |
|------|---------|
| `src/components/AIConciergeChat.tsx` | Main concierge UI; `DUPLEX_VOICE_ENABLED` flag |
| `src/hooks/useGeminiLive.ts` | Gemini Live WebSocket hook (complete duplex logic) |
| `src/features/chat/components/VoiceLiveOverlay.tsx` | Waveform ring overlay UI for duplex mode |
| `src/hooks/useWebSpeechVoice.ts` | Web Speech API dictation fallback (currently active) |
| `src/features/chat/components/VoiceButton.tsx` | Waveform button component |
| `src/voice/circuitBreaker.ts` | Circuit breaker for voice failures |
| `src/voice/transport/createTransport.ts` | WebSocket transport creation |
| `src/voice/audioContract.ts` | Audio capture/playback contract |
| `src/config/voiceFeatureFlags.ts` | Feature flags (VOICE_LIVE_ENABLED, diagnostics) |
| `supabase/functions/gemini-voice-session/index.ts` | Edge function: OAuth2 token + WebSocket URI |
| `src/store/conciergeSessionStore.ts` | Session state (messages, voice state) |

---

## 6. Gemini Live Flow (When Working)

```
1. User taps waveform button
2. Client: supabase.functions.invoke('gemini-voice-session', { body: { tripId, voice } })
3. gemini-voice-session:
   - Reads VERTEX_SERVICE_ACCOUNT_KEY secret
   - Mints OAuth2 access token via Google's token endpoint
   - Builds trip context + system prompt
   - Returns { accessToken, websocketUri, model, config }
4. Client: Opens WebSocket to wss://{region}-aiplatform.googleapis.com/ws/...
5. Client: Sends BidiGenerateContentSetup as first frame
6. Client: Sends audio chunks (PCM16 16kHz mono) via BidiGenerateContentRealtimeInput
7. Vertex AI: Streams back audio + text transcription
8. Client: Plays audio via AudioPlaybackQueue, shows transcript in chat
```

---

## 7. Summary

- **Text:** Uses `lovable-concierge` → Gemini directly when `GEMINI_API_KEY` is set.
- **Voice (current):** Web Speech API dictation via waveform button → text fills input field.
- **Voice (duplex, disabled):** Uses `gemini-voice-session` → Vertex AI Live API directly; requires service account secrets.
- **To re-enable:** Fix the handshake issues in Steps 3-4, set `DUPLEX_VOICE_ENABLED = true`, redeploy.
