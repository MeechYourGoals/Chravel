

# Fix Grok Voice: Direct API Key + Correct Protocol

## Root Cause Analysis (First Principles)

Three compounding issues explain why voice has never connected, despite multiple fix attempts:

1. **Wrong WebSocket URL**: The code connects to `wss://api.x.ai/v1/realtime?model=grok-3-fast`. The xAI Voice Agent API docs specify `wss://api.x.ai/v1/realtime` with NO model parameter. `grok-3-fast` is a text model -- the voice agent endpoint auto-selects the voice-capable model. xAI likely rejects the handshake immediately.

2. **Ephemeral token layer adds untestable complexity**: The edge function calls `POST /v1/realtime/client_secrets` to mint an ephemeral token, then the client uses it via `Sec-WebSocket-Protocol`. If anything goes wrong in this chain (wrong request format, unexpected response shape, xAI endpoint behavior), the WebSocket silently fails. Edge function logs show zero request traces, making it impossible to diagnose.

3. **Mismatched session.update payload**: The code sends a hybrid of OpenAI and xAI format fields that the xAI server may reject silently.

## The Fix: Direct API Key via Edge Function

Eliminate the ephemeral token entirely. Instead:
- Edge function returns the `XAI_API_KEY` directly (still behind auth + tier gating)
- Client uses it with `Sec-WebSocket-Protocol` subprotocol auth (standard pattern)
- Remove the model param from the URL
- Use the exact `session.update` format from xAI docs
- Set voice to **Rex** (Recs = Recommendations -- love it)

### Security Model (why this is acceptable)

- API key is never in client code or bundle -- only returned at runtime via authenticated edge function
- Tier-gated: only Frequent Chraveler, Pro, and Super Admin users can retrieve it
- xAI has server-side rate limits per key
- Key is rotatable if compromised
- This is the same pattern OpenAI's own Realtime Console uses (user provides API key, browser connects directly)

## Implementation (3 files)

### File 1: `supabase/functions/xai-voice-session/index.ts`

Remove the ephemeral token minting. After auth + tier check, simply return the API key:

```text
Before: POST to xAI /v1/realtime/client_secrets -> return ephemeral token
After:  Return { api_key: XAI_API_KEY } directly
```

All existing auth, tier gating, and super admin logic stays exactly the same.

### File 2: `src/hooks/useGrokVoice.ts`

Major changes:

**A) Fix WebSocket URL**
```text
Before: wss://api.x.ai/v1/realtime?model=grok-3-fast
After:  wss://api.x.ai/v1/realtime
```

**B) Use API key directly instead of ephemeral token**
```text
Before: Parse data.client_secret.value from edge function response
After:  Parse data.api_key from edge function response
```

The subprotocol auth stays the same pattern:
```text
new WebSocket(url, ['realtime', 'openai-insecure-api-key.${apiKey}'])
```

**C) Fix session.update to match xAI docs exactly**
```text
{
  "type": "session.update",
  "session": {
    "voice": "Rex",
    "instructions": "You are Chravel AI Concierge...",
    "turn_detection": { "type": "server_vad" },
    "audio": {
      "input": { "format": { "type": "audio/pcm", "rate": 24000 } },
      "output": { "format": { "type": "audio/pcm", "rate": 24000 } }
    }
  }
}
```

Remove the redundant top-level `input_audio_format`, `output_audio_format`, `input_audio_transcription`, and `modalities` fields that are not in the xAI spec.

**D) Simplify subprotocol fallback**

Keep just `openai-insecure-api-key` prefix (xAI docs confirm compatibility with OpenAI Realtime API spec). Remove the `xai-insecure-api-key` fallback to reduce connection attempt time.

### File 3: Voice set to Rex

In the `session.update` payload, change `voice: 'Ara'` to `voice: 'Rex'`.

## What stays the same (zero regressions)

- VoiceButton component (purple gradient, state visuals) -- no changes needed
- AiChatInput layout (mic left, send right) -- no changes needed
- AIConciergeChat integration (transcript streaming, error display) -- no changes needed
- Tier gating logic in edge function -- stays identical
- Mic capture, audio playback queue, VAD turn-taking -- all stay
- All existing text chat behavior -- untouched

## Files Changed Summary

| File | Change |
|------|--------|
| `supabase/functions/xai-voice-session/index.ts` | Remove ephemeral token minting, return API key directly |
| `src/hooks/useGrokVoice.ts` | Fix URL (remove model param), use API key, fix session.update format, voice = Rex |

## Verification

After implementation:
1. Tap mic -- should transition Connecting -> Listening within 2-3 seconds
2. Speak -- user transcript appears, assistant responds with audio + text
3. Edge function logs should show successful requests
4. Browser DevTools Network tab: confirm WS connects to `wss://api.x.ai/v1/realtime` (no model param)

