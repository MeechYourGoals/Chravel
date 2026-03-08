# Gemini Live Voice Fix Report

**Date**: 2026-03-08
**Status**: Implemented — pending live testing

---

## A. Architecture Summary

### Before (broken)
```
Browser → Supabase Edge Function (mint token, choose AI Studio or Vertex)
Browser → Direct WebSocket to AI Studio OR Vertex Live
         (setup message had structural bugs preventing setupComplete)
```

### After (fixed)
```
Browser → Supabase Edge Function (mint Vertex OAuth2 token only)
Browser → Direct WebSocket to Vertex Live (GA model, correct setup payload)
```

**Provider**: Vertex AI only (AI Studio path removed entirely)
**Model**: `gemini-live-2.5-flash-native-audio` (GA)
**Voice**: Charon (default)
**Transport**: WebSocket (stateful, bidirectional)

---

## B. Files Changed

| File | Change |
|------|--------|
| `supabase/functions/gemini-voice-session/index.ts` | Complete rewrite: removed AI Studio path, fixed setup message structure, converted function declarations to lowercase OpenAPI types, added tool/preview feature flags |
| `src/hooks/useGeminiLive.ts` | Removed dual-provider branching, removed hardcoded AI Studio WS URL, replaced 25-min expiry timer with OAuth2 lifetime + goAway handling, added session resumption hooks |
| `src/config/voiceFeatureFlags.ts` | Added `VOICE_AFFECTIVE_DIALOG` and `VOICE_PROACTIVE_AUDIO` preview flags |
| `src/components/AIConciergeChat.tsx` | Flipped `DUPLEX_VOICE_ENABLED` from `false` to `true` |
| `docs/GEMINI_LIVE_FIX_REPORT.md` | This file |

---

## C. Stable Setup Payload (Exact Shape)

This is what the edge function sends to the client as `setupMessage`, which the client sends as the first WebSocket message:

```json
{
  "setup": {
    "model": "projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/gemini-live-2.5-flash-native-audio",
    "generation_config": {
      "response_modalities": ["AUDIO"],
      "speech_config": {
        "voice_config": {
          "prebuilt_voice_config": {
            "voice_name": "Charon"
          }
        }
      }
    },
    "system_instruction": {
      "parts": [{ "text": "..." }]
    },
    "realtime_input_config": {
      "automatic_activity_detection": {
        "disabled": false,
        "start_of_speech_sensitivity": "START_OF_SPEECH_SENSITIVITY_LOW",
        "end_of_speech_sensitivity": "END_OF_SPEECH_SENSITIVITY_HIGH"
      }
    },
    "input_audio_transcription": {},
    "output_audio_transcription": {},
    "tools": [
      {
        "function_declarations": [
          {
            "name": "getPaymentSummary",
            "description": "Get a summary of who owes money to whom in the trip",
            "parameters": { "type": "object", "properties": {} }
          }
        ]
      }
    ]
  }
}
```

### Critical structural fixes:
1. **`realtime_input_config`** — moved from inside `generation_config` to **top-level** in `setup`
2. **`input_audio_transcription`** — moved from inside `generation_config` to **top-level** in `setup`
3. **`output_audio_transcription`** — moved from inside `generation_config` to **top-level** in `setup`
4. **Function declaration types** — changed from UPPERCASE (`OBJECT`, `STRING`) to **lowercase** (`object`, `string`) per OpenAPI schema spec
5. **Tools** — gated behind `VOICE_TOOLS_ENABLED` env var (default: `true`)
6. **`google_search`** — removed from tools array (can be re-added later behind flag)

---

## D. Experimental Preview Config Shape

Only added when env flags are enabled — never part of baseline handshake:

```json
{
  "setup": {
    "generation_config": {
      "enable_affective_dialog": true
    },
    "proactivity": {
      "proactive_audio": true
    }
  }
}
```

Controlled by:
- `VOICE_AFFECTIVE_DIALOG=true` (Supabase Edge Function env)
- `VOICE_PROACTIVE_AUDIO=true` (Supabase Edge Function env)

---

## E. Remaining Risks

1. **Browser-direct-to-Vertex**: OAuth2 token is passed via URL parameter to the browser. Functional but not ideal. Future: Cloud Run proxy.
2. **Token expiry**: OAuth2 token valid for 1 hour. Sessions longer than 1h need reconnection. Client warns at 55 min.
3. **Concurrent session limits**: Vertex docs conflict (1,000 vs 5,000 per project). Monitor quotas.
4. **Session resumption**: Hooks are in place (goAway handling, resumption token storage) but full auto-reconnect with resumption token is not yet implemented.
5. **API version**: Using `v1` endpoint. If setup fails, may need `v1beta1`.

---

## F. Manual Steps Required in GCP / Vertex / Supabase

### GCP
1. Ensure `Vertex AI API` is enabled in the project
2. Ensure the service account has `roles/aiplatform.user` role
3. Verify `gemini-live-2.5-flash-native-audio` is available in your region

### Supabase Edge Function Secrets
Required:
- `VERTEX_PROJECT_ID` — GCP project ID
- `VERTEX_LOCATION` — e.g., `us-central1`
- `VERTEX_SERVICE_ACCOUNT_KEY` — base64-encoded service account JSON key

Optional:
- `VOICE_TOOLS_ENABLED` — `true` (default) or `false` to test without tools
- `VOICE_AFFECTIVE_DIALOG` — `false` (default) or `true`
- `VOICE_PROACTIVE_AUDIO` — `false` (default) or `true`

---

## G. Copy-Paste Commands

```bash
# Deploy the updated edge function
supabase functions deploy gemini-voice-session

# Set env vars (if not already set)
supabase secrets set VERTEX_PROJECT_ID=your-project-id
supabase secrets set VERTEX_LOCATION=us-central1
supabase secrets set VERTEX_SERVICE_ACCOUNT_KEY=$(base64 -w0 service-account.json)

# Test without tools first (minimal handshake)
supabase secrets set VOICE_TOOLS_ENABLED=false

# After confirming setupComplete works, enable tools
supabase secrets set VOICE_TOOLS_ENABLED=true

# Local dev
npm run dev

# Verify build
npm run lint && npm run typecheck && npm run build
```

---

## Validation Checklist

- [ ] `setupComplete` received in browser console (`[VOICE:G2] ws_setup_complete`)
- [ ] User speaks → input transcription appears in UI
- [ ] Model responds with Charon voice → audio plays
- [ ] Output transcription appears
- [ ] User interrupts during model speech → playback stops immediately
- [ ] Second user utterance works in same session
- [ ] Tool call works (e.g., "show me the payment summary")
- [ ] Reconnect path handled cleanly
- [ ] Error state shown clearly in UI
- [ ] No regressions to text chat fallback
- [ ] Dictation mode (Web Speech API) still works independently
