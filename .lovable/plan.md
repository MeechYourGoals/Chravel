

# Fix Gemini Voice: The Real Root Cause -- Stale Closure Bug

## What Actually Went Wrong (First Principles)

Every previous fix attempt (correct model name, error handling, deprecated field fix) was technically correct but **invisible** because of a fundamental React bug that prevents ALL error recovery.

### The Bug: Stale Closure in `startVoice`

`startVoice` is a `useCallback` that captures `voiceState` in its closure. When the user clicks the mic button:

1. `voiceState` is `'idle'` -- this is what the closure captures
2. `setVoiceState('connecting')` is called -- React schedules a state update, but the closure still holds `'idle'`
3. WebSocket is created and handlers are registered
4. If anything goes wrong (bad model, network error, etc.), `ws.onerror` fires
5. `ws.onerror` checks: `voiceState === 'connecting'` -- but `voiceState` in the closure is `'idle'`, so this is **always false**
6. Error is swallowed, UI stays on "Connecting" forever

The same stale closure affects the 10-second timeout handler. Both paths that should recover from errors are broken.

### Why This Escaped Detection

- Console logs would show the error being logged (`console.error('[useGeminiVoice] WebSocket error:', event)`)
- But the state transition (`setVoiceState('error')`) never executes because of the false condition
- The user sees zero console output because production builds gate logs behind `import.meta.env.DEV`
- No edge function logs appear because either: the edge function call succeeds but the WS fails, OR the whole flow dies before the invoke

## The Fix (Two Changes)

### Change 1: Remove stale `voiceState` checks from error handlers

Replace all references to the stale `voiceState` closure with refs or unconditional error handling:

**ws.onerror** (line 487-495):
```
Before: if (!activeRef.current && voiceState === 'connecting') {
After:  Always set error state when WS errors during connection
```

**Timeout handler** (line 426-435):
```
Before: if (activeRef.current || voiceState === 'connecting') {
After:  if (ws.readyState !== WebSocket.OPEN) { -- just close and error unconditionally }
```

### Change 2: Remove `voiceState` from `startVoice` dependency array

Line 521: `[voiceState, cleanup, handleServerMessage, startMicCapture, onAssistantMessage]`

Remove `voiceState` from the deps. The function doesn't need it as a dependency since we're eliminating all uses of the stale value inside it. This also prevents unnecessary re-creation of the callback on every state change.

### Change 3: Force all error logs to run unconditionally (not just DEV)

Remove the `if (import.meta.env.DEV)` gates on critical error logging so you can see what Google's server actually responds when things go wrong. This is essential for debugging in the preview environment.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useGeminiVoice.ts` | Fix stale closure in ws.onerror and timeout, remove voiceState from deps, unconditional error logging |

## Why This Will Work

1. The edge function is deployed and working (confirmed: returns 401 without auth, which is correct)
2. The `GEMINI_API_KEY` secret is configured
3. The model name `gemini-2.5-flash-native-audio-preview-12-2025` is correct per Google's docs
4. The WebSocket URL matches Google's API reference exactly
5. The setup message format matches the `BidiGenerateContentSetup` spec
6. The `realtimeInput.audio` format matches the current (non-deprecated) API
7. The ONLY remaining issue is that error handlers can't fire due to the stale closure -- this fix eliminates that

After this fix, one of two things will happen:
- **Success**: setupComplete fires, state transitions to "Listening", voice works
- **Visible failure**: If Google rejects the connection for any reason, the error message will appear immediately instead of spinning forever, giving us the exact error to diagnose

## What Stays Unchanged

- Edge function `gemini-voice-session` -- confirmed working
- VoiceButton, AiChatInput, AIConciergeChat -- no changes
- Model name, voice (Kore), audio format -- all confirmed correct
- Tier gating, auth flow -- no changes

