

# Gemini Live Voice — Production Fix Plan

## Diagnosis

### The proxy edge function logs are empty
No logs found for `gemini-voice-proxy`. This means either the function has never been successfully invoked, or the WebSocket upgrade is failing before reaching the handler. The function IS configured in `config.toml` with `verify_jwt = false`.

### Primary root cause: Setup message field casing mismatch

The confirmed-working gist (Section 3) uses **camelCase** for all setup payload fields:
```json
{
  "setup": {
    "generationConfig": { "responseModalities": ["AUDIO"], "speechConfig": { ... } },
    "systemInstruction": { "parts": [{ "text": "..." }] },
    "realtimeInputConfig": { "activityHandling": "START_OF_ACTIVITY_INTERRUPTS" },
    "inputAudioTranscription": {},
    "outputAudioTranscription": {},
    "contextWindowCompression": { "slidingWindow": {} },
    "sessionResumption": {}
  }
}
```

The current proxy (`gemini-voice-proxy/index.ts` lines 943-969) sends **snake_case**:
```json
{
  "setup": {
    "generation_config": { "response_modalities": ["AUDIO"], "speech_config": { ... } },
    "system_instruction": { ... },
    "realtime_input_config": { "automatic_activity_detection": { ... } },
    "input_audio_transcription": {},
    "context_window_compression": { "sliding_window": {} },
    "session_resumption": {}
  }
}
```

While protobuf JSON technically accepts both, the gist author explicitly tested this with 55+ E2E runs against the same Vertex endpoint, and uses camelCase throughout. The user's own analysis notes the distinction between envelope keys (camelCase: `setup`, `clientContent`, `realtimeInput`, `toolResponse`) and setup payload fields. The gist demonstrates both layers use camelCase. Normalizing to match the confirmed-working reference is the safe fix.

### Secondary issue: `realtimeInputConfig` structure

The proxy uses `automatic_activity_detection` with nested sensitivity enums. The gist uses the simpler `activityHandling: "START_OF_ACTIVITY_INTERRUPTS"`. Per the user's instructions: keep automatic VAD enabled (it's on by default) AND set `activityHandling` for interruption behavior. These are not substitutes — they control different things. The gist's setup works with just `activityHandling` because automatic VAD is enabled by default when not explicitly disabled.

### Tertiary issue: Handshake complexity

30+ tool declarations + affective dialog + proactive audio + google_search all in the initial handshake. Per the user's phased approach, strip to Mode 0 first.

### Keepalive casing mismatch

Proxy sends keepalive as `realtime_input` / `media_chunks` / `mime_type` (snake_case). Should match the camelCase used by the client and the gist.

## Implementation Plan

### Phase A: Protocol truth + boring handshake (single deploy)

**File: `supabase/functions/gemini-voice-proxy/index.ts`**

1. **Rewrite setup message to camelCase** matching the gist exactly:
   - `generation_config` → `generationConfig`
   - `response_modalities` → `responseModalities`
   - `speech_config` → `speechConfig`
   - `voice_config` → `voiceConfig`
   - `prebuilt_voice_config` → `prebuiltVoiceConfig`
   - `voice_name` → `voiceName`
   - `system_instruction` → `systemInstruction`
   - `realtime_input_config` → `realtimeInputConfig`
   - `input_audio_transcription` → `inputAudioTranscription`
   - `output_audio_transcription` → `outputAudioTranscription`
   - `context_window_compression` → `contextWindowCompression`
   - `sliding_window` → `slidingWindow`
   - `session_resumption` → `sessionResumption`

2. **Replace `automatic_activity_detection` block** with `activityHandling: "START_OF_ACTIVITY_INTERRUPTS"` — matching the gist. Automatic VAD remains enabled by default (not explicitly disabled).

3. **Default `VOICE_TOOLS_ENABLED` to `false`** (Mode 0 — no tools in baseline)

4. **Default `VOICE_AFFECTIVE_DIALOG` to `false`** (strip for isolation, not because invalid)

5. **Default `VOICE_PROACTIVE_AUDIO` to `false`** (strip for isolation, not because invalid)

6. **Fix keepalive message casing** — `realtime_input` → `realtimeInput`, `media_chunks` → `mediaChunks`, `mime_type` → `mimeType`

7. **Add protocol observability logging:**
   - Log the full setup message JSON (or a hash + key structure) on `setup_sent`
   - Log the first upstream JSON frame verbatim on `upstreamWs.onmessage` (first message only)
   - Log whether `setupComplete` was received before close
   - Log upstream close code, reason, and whether it was clean
   - Add a correlation ID to the session tag

8. **Remove `google_search` from tools** even when tools are enabled (add back in Mode 3)

**File: `supabase/functions/gemini-voice-session/index.ts`**

9. **Align defaults:** `VOICE_TOOLS_ENABLED` → `false`, `VOICE_AFFECTIVE_DIALOG` → `false`, `VOICE_PROACTIVE_AUDIO` → `false`

### Exact setup payload after fix (Mode 0)

```json
{
  "setup": {
    "model": "projects/{PROJECT}/locations/{LOCATION}/publishers/google/models/gemini-live-2.5-flash-native-audio",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": { "voiceName": "Charon" }
        }
      }
    },
    "systemInstruction": {
      "parts": [{ "text": "..." }]
    },
    "realtimeInputConfig": {
      "activityHandling": "START_OF_ACTIVITY_INTERRUPTS"
    },
    "inputAudioTranscription": {},
    "outputAudioTranscription": {},
    "contextWindowCompression": { "slidingWindow": {} },
    "sessionResumption": {}
  }
}
```

No tools. No affective. No proactive. No google_search. Automatic VAD on by default.

### Feature-flag matrix for phased rollback

| Mode | Tools | Search | Affective | Proactive | When |
|------|-------|--------|-----------|-----------|------|
| 0 | OFF | OFF | OFF | OFF | Phase A — get setupComplete |
| 1 | OFF | OFF | OFF | OFF | Phase B — verify transcription |
| 2 | 1 fn | OFF | OFF | OFF | Phase C — one test tool |
| 3 | subset | ON | OFF | OFF | Phase D — curated tools |
| 4 | subset | ON | ON | OFF | Phase E — affective |
| 5 | full | ON | ON | ON | Phase F — full production |

### No client-side changes needed

The client (`useGeminiLive.ts`) already handles both camelCase and snake_case responses (lines 936-942). The proxy fix is server-side only.

### Dead code: Duplicate OAuth functions

The proxy duplicates `createVertexAccessToken`, `base64UrlEncode`, `parseServiceAccountKey` locally (lines 672-757) instead of importing from `_shared/vertexAuth.ts`. Clean up by importing from shared module.

### Verification steps after deploy

1. Click Live button → check Supabase edge function logs for `gemini-voice-proxy`
2. Look for: `client_connected` → `init_received` → `authenticated` → `token_minted` → `upstream_connecting` → `upstream_opened` → `setup_sent` → first upstream message logged
3. If first upstream message contains `setupComplete` → success
4. If upstream closes before `setupComplete` → log will show close code/reason, which pinpoints the Vertex rejection reason
5. If no logs appear at all → the edge function is not deployed or the WS upgrade is failing at the Supabase infrastructure level

