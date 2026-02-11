

# Voice Assistant Options + Build Error Fix

## Build Error Fix (Quick)

The TypeScript error on line 90 of `useConsumerSubscription.tsx` is a type mismatch: `userTier` can be `'pro-starter' | 'pro-growth' | 'pro-enterprise'` but `ConsumerSubscription.tier` in `src/types/consumer.ts` only allows `'free' | 'explorer' | 'frequent-chraveler'`. Fix: widen the `ConsumerSubscription.tier` type to include pro tiers.

| File | Change |
|------|--------|
| `src/types/consumer.ts` | Add `'pro-starter' \| 'pro-growth' \| 'pro-enterprise'` to the `tier` field |

---

## Voice Assistant: Your Three Options

### Option A: Web Speech API (FREE, Zero Dependencies, Works Today)

The browser has a built-in speech engine. No API keys, no WebSockets, no edge functions, no new packages.

How it works:
1. User taps mic -> browser's `SpeechRecognition` captures speech to text
2. That text is sent through your **existing** AI Concierge text pipeline (the `gemini-chat` / `lovable-concierge` edge function that already works)
3. Browser's `SpeechSynthesis` reads the response aloud

Pros:
- Zero cost, zero setup, zero new API keys
- Works offline for the STT portion
- Reuses your existing concierge backend (proven working)
- Can be implemented in ~150 lines replacing the 700-line Gemini voice hook

Cons:
- Voice quality is "browser quality" (robotic on some devices, decent on iOS/Chrome)
- Not available in all browsers (Safari has quirks, Firefox limited)
- No real-time conversation feel -- it's speak-then-wait, like Siri

### Option B: ElevenLabs Conversational AI (Premium, Simple SDK)

ElevenLabs has a React SDK (`@elevenlabs/react`) with a `useConversation` hook that handles all WebRTC/audio complexity in ~30 lines. This is the easiest path to a natural, high-quality voice assistant.

How it works:
1. Create an agent in ElevenLabs dashboard (configure personality, voice, tools)
2. Edge function generates a conversation token
3. `useConversation` hook manages WebRTC connection, mic, playback -- everything

Pros:
- Production-quality voices (29 languages, customizable)
- WebRTC handles all audio codec complexity (no PCM, no manual WebSocket)
- Barge-in support, natural conversation flow
- Simple React hook -- far less code than current Gemini attempt

Cons:
- Requires ElevenLabs account + API key ($5/mo starter)
- Agent must be configured in the ElevenLabs web UI
- AI responses come from ElevenLabs' agent, not your existing concierge pipeline (though you can configure the agent's system prompt to match)

### Option C: Remove Voice Entirely

Surgically remove all Gemini voice code and the Grok remnants. Keep the mic button but repurpose it or hide it. Focus on making the text concierge richer with:
- Clickable place links with preview cards
- Inline map widgets
- Photo thumbnails for recommendations
- Markdown rendering (already partially implemented)

---

## My Recommendation: Option A (Web Speech API)

Here's why:
1. It works **today** with zero new infrastructure
2. It reuses your proven concierge backend -- no new AI pipeline to debug
3. Zero cost, zero API keys
4. If you later want premium voice (Option B), it's an additive upgrade, not a rewrite
5. For the a16z demo, "tap mic, speak, get answer read back" is functionally identical to what Gemini Live would have done

The implementation replaces the 700-line `useGeminiVoice.ts` with a ~150-line `useWebSpeechVoice.ts` that:
- Uses `webkitSpeechRecognition` / `SpeechRecognition` for STT
- Sends transcribed text through the existing concierge (same `supabase.functions.invoke('gemini-chat')` path)
- Uses `SpeechSynthesis` to speak the response
- Keeps the same `VoiceState` type so VoiceButton and AiChatInput need zero changes

## Technical Plan (Option A)

### File 1: `src/hooks/useWebSpeechVoice.ts` (NEW)

Create a clean hook using the browser's Web Speech API:
- Same exported types (`VoiceState`, `UseGeminiVoiceReturn`) for drop-in compatibility
- `startVoice`: request mic permission, start `SpeechRecognition`, transition to 'listening'
- On speech result: transition to 'thinking', call existing concierge via `supabase.functions.invoke('gemini-chat')`
- On AI response: transition to 'speaking', use `SpeechSynthesis.speak()` to read it aloud
- On speech end: transition back to 'idle'
- Error handling: immediate state transitions, no WebSocket complexity

### File 2: `src/hooks/useGeminiVoice.ts` (DELETE or gut)

Remove the 700-line Gemini Live WebSocket implementation entirely.

### File 3: `src/components/AIConciergeChat.tsx`

Change import from `useGeminiVoice` to `useWebSpeechVoice`. Everything else stays the same because the hook interface is identical.

### File 4: `src/features/chat/components/VoiceButton.tsx`

No changes needed -- it already works with the `VoiceState` type.

### File 5: `src/features/chat/components/AiChatInput.tsx`

No changes needed -- same interface.

### File 6: `src/types/consumer.ts`

Widen `ConsumerSubscription.tier` to include pro tiers to fix the build error.

### Cleanup: Remove Gemini Voice Remnants

- `supabase/functions/gemini-voice-session/index.ts` -- can be deleted (no longer needed)
- `XAI_API_KEY` secret -- leftover from Grok attempt, can be removed later

