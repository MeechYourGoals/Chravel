
# Gemini Live: Post-Claude-Code Merge Gap Analysis + Full-Screen Takeover

## What Claude Code Fixed (PR #830)

Claude Code addressed **RC1** (parallel setup timer leaks, substep granularity) and **RC4** (turn completion / audio drain detection):

1. **AudioPlaybackQueue.onDrain callback** -- added constructor param so the hook knows when all audio buffers finish playing
2. **turnComplete deferred transition** -- `modelRespondingRef` stays `true` during audio tail so barge-in works; `onDrain` triggers the actual `listening` transition with a 5s safety timeout
3. **Token failure fast-path** -- replaced `Promise.allSettled` with sequential awaits (token first, then mic) so token errors surface instantly
4. **Duplicate turn prevention** -- accumulators cleared immediately after `onTurnCompleteRef` fires, preventing `ws.onclose` from re-emitting the same turn
5. **RC2, RC3, RC5** shipped as-is (token expire 120s, silent keepalive, session timeout 90s)

## What Claude Code MISSED (Still Broken)

### Critical Gap 1: WRONG MODEL NAME (Agent 2 finding -- never detected by Claude)

The edge function uses:
```
models/gemini-live-2.5-flash-native-audio
```

The correct model name per official Google documentation (confirmed via `ai.google.dev/gemini-api/docs/live-guide` and `ai.google.dev/gemini-api/docs/ephemeral-tokens`):
```
gemini-2.5-flash-native-audio-preview-12-2025
```

**Evidence:** Every official example (Python SDK, JavaScript SDK, REST) uses `gemini-2.5-flash-native-audio-preview-12-2025`. The model `gemini-live-2.5-flash-native-audio` does not appear in any Google documentation.

**Impact:** The `auth_tokens` endpoint may accept the request and return a 200 + token (the API is lenient with model validation at token creation time), but when the client connects via WebSocket, the Live service cannot resolve the model and silently refuses to start the session -- no `setupComplete`, no error, just hangs until the 12s timeout fires.

### Critical Gap 2: OUTDATED TOKEN FORMAT (`bidiGenerateContentSetup` vs `liveConnectConstraints`)

The edge function uses the old format:
```json
{
  "bidiGenerateContentSetup": {
    "model": "...",
    "generationConfig": { ... },
    "systemInstruction": { ... },
    "tools": [...]
  }
}
```

The current documented format (confirmed via `ai.google.dev/gemini-api/docs/ephemeral-tokens`):
```json
{
  "liveConnectConstraints": {
    "model": "gemini-2.5-flash-native-audio-preview-12-2025",
    "config": {
      "responseModalities": ["AUDIO", "TEXT"],
      "speechConfig": { ... },
      "systemInstruction": { ... },
      "tools": [...]
    }
  }
}
```

Key differences:
- Top-level key changed from `bidiGenerateContentSetup` to `liveConnectConstraints`
- `generationConfig` flattened into `config`
- `model` moved inside `liveConnectConstraints` (not `bidiGenerateContentSetup`)

### Critical Gap 3: `verify_jwt = true` Still Set

`supabase/config.toml` line 103 still has `verify_jwt = true` for `gemini-voice-session`. With Supabase's signing-keys system, this means the gateway validates the JWT before the function boots. If it rejects, the function never runs and no `handler_enter` log appears. The function already validates auth manually (lines 680-703), so `verify_jwt = false` is safe and necessary for debuggability.

### Gap 4: `createEphemeralTokenWithoutGrounding` Also Uses Wrong Format

Lines 552-620 define a fallback function that also uses the old `bidiGenerateContentSetup` format. Both token creation paths need to be updated.

## What's Already Correct (No Changes Needed)

- CORS handling (`getCorsHeaders` with suffix matching for `.lovable.app`)
- `ENABLE_VOICE_GROUNDING` defaults to `false` (our previous fix)
- WebSocket endpoint (`BidiGenerateContentConstrained` with `?access_token=`)
- Audio format (PCM16 at 16kHz input, 24kHz output)
- All of Claude's RC1/RC4 fixes (drain callbacks, deferred transitions, fast-path token errors)
- Gate 0 instrumentation (sessionAttemptId correlation)

---

## Fix Plan

### Fix 1: Correct model name (edge function)

**File: `supabase/functions/gemini-voice-session/index.ts`**

Change line 10:
```
FROM: 'models/gemini-live-2.5-flash-native-audio'
  TO: 'gemini-2.5-flash-native-audio-preview-12-2025'
```

No `models/` prefix -- the official docs and SDK examples consistently omit it.

### Fix 2: Update token format to `liveConnectConstraints` (edge function)

Replace both `createEphemeralToken` and `createEphemeralTokenWithoutGrounding` functions. The new request body structure:

```json
{
  "uses": 1,
  "expireTime": "...",
  "newSessionExpireTime": "...",
  "liveConnectConstraints": {
    "model": "gemini-2.5-flash-native-audio-preview-12-2025",
    "config": {
      "responseModalities": ["AUDIO", "TEXT"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": { "voiceName": "Puck" }
        }
      },
      "systemInstruction": {
        "parts": [{ "text": "..." }]
      },
      "tools": [{ "functionDeclarations": [...] }]
    }
  }
}
```

The `createEphemeralTokenWithoutGrounding` variant is the same but without `googleSearch` in tools (which is already the case since grounding is disabled).

### Fix 3: Set `verify_jwt = false` for gemini-voice-session

**File: `supabase/config.toml`**

Change line 103:
```
FROM: verify_jwt = true
  TO: verify_jwt = false
```

The function already validates auth manually via `supabase.auth.getUser()`.

### Fix 4: Full-Screen Takeover for Conversation Mode

Currently `VoiceLiveOverlay` is an inline banner above the chat input. Per the user's request (and matching ChatGPT/Gemini Live patterns), conversation mode should take over the entire screen.

**File: `src/features/chat/components/VoiceLiveOverlay.tsx`**

Redesign from inline banner to full-screen overlay:
- Use `fixed inset-0 z-50` to cover the entire viewport
- Dark gradient background with blur
- Center the conversation controls vertically
- Large animated orb/pulse visualization in the center showing state (listening, speaking, thinking)
- Real-time transcript text displayed below the orb
- Red X close button at top-right or bottom-center
- "LIVE" badge visible
- Status text (Listening, Speaking, Thinking) prominently displayed

Layout concept:
```text
+----------------------------------+
|                          [X]     |
|                                  |
|         ( Pulsing Orb )          |
|         "Listening..."           |
|                                  |
|   "What's the weather like       |
|    in Barcelona?"                |
|                                  |
|   "It's going to be sunny..."   |
|                                  |
|           [LIVE]                 |
+----------------------------------+
```

When the user exits (taps X), they return to the chat view where any rich cards (places, flights, hotels) generated during the voice session are visible in the chat history (already handled by `onTurnComplete` persisting messages).

**File: `src/components/AIConciergeChat.tsx`**

Change rendering from inline to portal/overlay:
- Remove the `VoiceLiveOverlay` from inside the `chat-composer` div
- Render it as a sibling at the root level (or via portal) so it can go full-screen
- When `liveOverlayOpen` is true, the overlay covers the entire concierge panel

### Fix 5: Consolidate `createEphemeralTokenWithoutGrounding`

Since `ENABLE_VOICE_GROUNDING` defaults to `false` and both functions now use the same format, simplify to a single `createEphemeralToken` that accepts an `includeGrounding` boolean parameter. Remove the duplicate function.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/gemini-voice-session/index.ts` | Fix model name, update token format to `liveConnectConstraints`, consolidate token functions |
| `supabase/config.toml` | Set `verify_jwt = false` for gemini-voice-session |
| `src/features/chat/components/VoiceLiveOverlay.tsx` | Redesign as full-screen immersive overlay |
| `src/components/AIConciergeChat.tsx` | Move overlay rendering to full-screen position |

## Verification Checklist

1. Redeploy edge function after model name + token format change
2. Open AI Concierge, tap Live
3. Console: `[VOICE:G0] invoke_done` shows `hasData: true, hasError: false`
4. Edge function logs: `handler_enter` with sessionAttemptId (now visible with verify_jwt=false)
5. Edge function logs: `Token created` with correct model name
6. Console: `[VOICE:G2] ws_setup_complete` within 10s (this is THE proof that model + format fix worked)
7. Speak and verify audio response plays back
8. Full-screen overlay covers entire viewport during voice session
9. Transcript visible in real-time on the overlay
10. Exit voice: overlay dismisses, rich cards visible in chat history
11. Red X button accessible and clearly positioned

## Risk: MEDIUM

- Model name change is highest-confidence fix (matches official docs exactly)
- Token format change involves restructuring the request body -- if the REST API still expects the old format, it will fail fast with a clear error (not silently)
- Full-screen overlay is a UI-only change, no state logic changes
- `verify_jwt = false` is safe since function already validates auth manually

## Rollback

Set `VITE_VOICE_LIVE_ENABLED=false` to hide voice. Or revert the edge function to use the old model/format (though it didn't work before either).
