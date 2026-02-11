

# Fix Gemini Voice: Three Root Causes Identified

## What Went Wrong

After reading every documentation link, Google's official WebSocket API reference, and Google's own React live-api-web-console source code, I found three compounding bugs that explain the infinite "Connecting" spinner:

### Root Cause 1: Wrong Model Name (the killer bug)

The code sends `models/gemini-2.5-flash-native-audio` in the setup message. **This model ID does not exist.** Google's documentation across every page consistently uses:

```
models/gemini-2.5-flash-native-audio-preview-12-2025
```

When you send an invalid model name, Google's server responds with an error message -- but our code silently drops it (see Root Cause 2), so `setupComplete` never fires and the button spins forever.

### Root Cause 2: Silent Error Swallowing

The `handleServerMessage` function only handles three message types: `setupComplete`, `serverContent`, and `toolCall`. Any other message (including **error responses from Google**) is silently ignored. We literally throw away the error telling us what's wrong.

The `ws.onerror` handler just logs `"WebSocket error"` with zero details. We're flying blind.

### Root Cause 3: Deprecated `mediaChunks` Field

The WebSocket API reference explicitly states:

> `mediaChunks[]` -- DEPRECATED: Use one of `audio`, `video`, or `text` instead.

Our code sends `realtimeInput.mediaChunks`. While this may still work, the correct format per current docs is `realtimeInput.audio`.

## The Fix (Surgical, 3 Changes)

### Change 1: Fix the model name

```
Before: 'models/gemini-2.5-flash-native-audio'
After:  'models/gemini-2.5-flash-native-audio-preview-12-2025'
```

This is the single change that will unblock the connection.

### Change 2: Add comprehensive error handling for ALL server messages

Add logging and error state handling for unrecognized messages from Google. This means if something goes wrong in the future, we'll see the actual error instead of spinning forever:

- Log ALL incoming WebSocket messages that don't match known types
- Parse and display Google's error messages to the user
- Specifically handle `goAway` and `sessionResumptionUpdate` message types from the spec
- Improve `ws.onerror` to include the error event details

### Change 3: Fix deprecated `mediaChunks` to `audio`

Update the mic streaming code from:

```json
{
  "realtimeInput": {
    "mediaChunks": [{ "mimeType": "audio/pcm;rate=16000", "data": "..." }]
  }
}
```

To the current API format:

```json
{
  "realtimeInput": {
    "audio": { "mimeType": "audio/pcm;rate=16000", "data": "..." }
  }
}
```

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useGeminiVoice.ts` | Fix model name, add error handling for all server messages, fix deprecated mediaChunks to audio |

That's it. One file. The edge function is fine -- it correctly returns the API key. The UI components are fine. The WebSocket URL is correct. The setup message structure is correct (model, generationConfig, systemInstruction all match the spec). The only issues are the wrong model name, swallowed errors, and deprecated field name.

## Why I'm Confident This Will Work

1. The WebSocket URL format (`wss://generativelanguage.googleapis.com/ws/...?key=API_KEY`) is confirmed correct by Google's API reference for client-to-server connections
2. The setup message format matches the `BidiGenerateContentSetup` spec exactly (model, generationConfig with responseModalities and speechConfig, systemInstruction with parts)
3. Google's own React web console uses this exact same raw WebSocket pattern (they wrap it in their SDK, but the underlying protocol is identical)
4. The audio format (16kHz PCM in, 24kHz PCM out) matches the spec
5. The only thing wrong was the model identifier -- a typo-level bug that caused a silent server-side rejection

## What Stays Unchanged (zero regressions)

- Edge function `gemini-voice-session` -- working correctly
- VoiceButton component -- no changes
- AiChatInput component -- no changes
- AIConciergeChat integration -- no changes
- Tier gating / auth -- no changes
- Voice: Kore (warm, clear concierge voice)

