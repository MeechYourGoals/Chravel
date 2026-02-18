

# Voice Mode for AI Concierge -- Final Implementation Plan

## Why It Never Worked

Two confirmed bugs, both visible in the code:

1. **Line 193 of `gemini-voice-session/index.ts`** sends `tools: [{ functionDeclarations: ... }, { googleSearch: {} }]` -- Gemini returns 400, killing the WebSocket before it opens. This is the primary failure.
2. **`AIConciergeChat.tsx`** never imports `useGeminiLive` or passes voice props to `AiChatInput` -- so the mic button literally never renders.

Everything else (WebSocket hook, audio capture, PCM encoding, audio playback, VoiceButton UI) is already built and correct.

## Key Design Decisions

- **Free for all users** -- no subscription gate. Remove the `canUseVoiceConcierge` entitlement check from the edge function and always pass `isVoiceEligible={true}` on the client.
- **Real-time conversation** -- user speaks, AI hears live via Gemini Live bidirectional WebSocket, responds with voice AND text simultaneously (like Grok/ChatGPT voice mode).
- **Text query = text-only response** -- voice is only used when the user activates voice mode. Regular text input continues to work as-is with text-only responses.

## Changes (4 files)

### 1. Fix Edge Function -- `supabase/functions/gemini-voice-session/index.ts`

**Bug fix (line 193):** Remove `{ googleSearch: {} }` from the tools array. Only include `functionDeclarations`:

```typescript
// Line 193 -- FROM:
tools: [{ functionDeclarations: VOICE_FUNCTION_DECLARATIONS }, { googleSearch: {} }],

// TO:
tools: [{ functionDeclarations: VOICE_FUNCTION_DECLARATIONS }],
```

**Remove subscription gate:** Replace the `canUseVoiceConcierge` check (lines 288-297) so it always allows access. This makes voice free for all authenticated users.

**Add structured logging** around ephemeral token creation:
```typescript
console.log('[gemini-voice-session] Creating ephemeral token', {
  model: params.model,
  voice: params.voice,
  toolCount: VOICE_FUNCTION_DECLARATIONS.length,
  sessionId,
});
```

And on error:
```typescript
console.error('[gemini-voice-session] Token creation failed', {
  status: tokenResponse.status,
  body: body.substring(0, 500),
  sessionId,
});
```

### 2. Wire Voice into Chat -- `src/components/AIConciergeChat.tsx`

**Imports:** Add `useGeminiLive` and `VoiceState` type.

**State and hook setup:**
```typescript
const [voiceActive, setVoiceActive] = useState(false);

const mapGeminiToVoiceState = (s: GeminiLiveState): VoiceState => {
  switch (s) {
    case 'listening': return 'listening';
    case 'speaking': return 'speaking';
    case 'connecting': return 'connecting';
    case 'error': return 'error';
    default: return 'idle';
  }
};

const geminiLive = useGeminiLive({
  tripId,
  onTranscript: (text) => {
    // Append text to chat as assistant message (streaming accumulation)
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.type === 'assistant' && last.id === 'voice-streaming') {
        return prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, content: m.content + text } : m
        );
      }
      return [...prev, {
        id: 'voice-streaming',
        type: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
      }];
    });
  },
  onTurnComplete: () => {
    // Finalize the streaming message with a real ID
    setMessages(prev =>
      prev.map(m => m.id === 'voice-streaming'
        ? { ...m, id: crypto.randomUUID() }
        : m
      )
    );
  },
  onToolCall: async (call) => {
    // Stub for MVP -- return acknowledgment
    return { result: `Action ${call.name} noted` };
  },
});
```

**Voice toggle handler:**
```typescript
const handleVoiceToggle = () => {
  if (geminiLive.state === 'idle' || geminiLive.state === 'error') {
    geminiLive.startSession();
    setVoiceActive(true);
  } else {
    geminiLive.endSession();
    setVoiceActive(false);
  }
};
```

**Auto-revert on error (useEffect):**
```typescript
useEffect(() => {
  if (geminiLive.state === 'error' && voiceActive) {
    toast.error(geminiLive.error || 'Voice session ended. Returning to text mode.');
    setVoiceActive(false);
  }
}, [geminiLive.state, geminiLive.error, voiceActive]);
```

**Voice active indicator (JSX, between header and messages):**
```
When voiceActive and state is not idle/error:
- Green pulse dot + state label ("Connecting..." / "Listening..." / "AI Speaking...")
- "End Voice" button that calls endSession and sets voiceActive=false
```

**Pass voice props to AiChatInput:**
```typescript
<AiChatInput
  // ... existing props ...
  voiceState={mapGeminiToVoiceState(geminiLive.state)}
  isVoiceEligible={true}  // Free for all users
  onVoiceToggle={handleVoiceToggle}
/>
```

### 3. VoiceButton Behavior Adjustment -- `src/features/chat/components/VoiceButton.tsx`

Since voice is now free for all, the "locked" state with the Lock icon will never appear (isEligible is always true). No code changes needed -- the existing component handles `isEligible={true}` correctly.

### 4. Deploy Edge Function

Deploy `gemini-voice-session` after the bug fix.

## State Machine (already enforced by useGeminiLive)

```text
idle --> connecting --> listening <--> speaking
  ^                       |               |
  |          error <------+---------------+
  +------------|
  (auto-revert via useEffect)
```

- **Start**: User taps mic --> `startSession()` --> connecting
- **Connected**: WebSocket `setupComplete` --> listening (audio capture begins)
- **AI responds**: Audio chunks arrive --> speaking (plays audio + streams text)
- **Turn done**: `turnComplete` --> listening (ready for next user input)
- **Stop**: User taps "End Voice" --> `endSession()` --> idle
- **Any error**: --> error --> auto-revert to idle + toast

## iOS Safari Compatibility

Already handled in the existing `useGeminiLive` hook:
- `AudioContext` created fresh per session on button tap (satisfies iOS user-gesture requirement)
- `getUserMedia` with echo cancellation and noise suppression
- PCM16 encoding at 16kHz input, 24kHz playback
- Standard WebSocket API (universally supported)

## What This Does NOT Change

- Text chat continues to work exactly as before
- No new API keys needed (uses existing `GEMINI_API_KEY`)
- No new edge functions needed
- No database changes needed

## Manual Test Checklist

1. Free user on desktop Chrome: Tap mic --> permission prompt --> speak --> AI responds with voice + text in chat
2. iOS Safari: Permission prompt --> bidirectional conversation works
3. Text input while voice active: Still works (hybrid mode)
4. "End Voice" button: Immediately stops session, reverts to text
5. Network error during voice: Toast shows error, auto-reverts to text mode
6. Mic permission denied: Error toast, stays in text mode
7. Send a text query while NOT in voice mode: Response is text-only (no audio)
8. Multiple voice turns: Each AI response appears as a separate message in chat
