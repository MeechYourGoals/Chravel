

# Switch Voice from xAI Grok to Gemini Live API

## Why Grok Voice Has Never Worked (and Cannot Work in This Stack)

The root cause is **architectural**, not a code bug. From the official xAI documentation:

```text
Browser (React) <--WebSocket--> Backend (FastAPI/Express) <--WebSocket--> xAI API
```

The xAI Grok Voice Agent API **requires a persistent backend WebSocket proxy server**. The browser cannot connect directly to `wss://api.x.ai/v1/realtime` -- xAI's server rejects direct browser WebSocket handshakes regardless of auth method (subprotocol, query param, etc.). Every example in xAI's own cookbook and docs shows a Python/Node.js backend server maintaining a long-lived WebSocket to xAI and relaying audio.

Supabase Edge Functions are HTTP request/response handlers -- they cannot maintain persistent bidirectional WebSocket connections as a relay server. This means **xAI Grok Voice is architecturally impossible** in the Lovable + Supabase stack without adding a separate always-on server infrastructure (like LiveKit Cloud, a dedicated VPS, etc.).

No amount of code fixes to `useGrokVoice.ts` can solve this. The connection will always fail at the WebSocket handshake level.

## Why Gemini Live API Is the Right Move

The Gemini Live API supports **direct browser-to-Google WebSocket connections**:

```text
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key={API_KEY}
```

No backend proxy needed. The browser connects directly, streams audio both ways, and gets real-time voice responses. This is confirmed by multiple working browser-only implementations (Google's own multimodal-live-api-web-console, jsalsman/gemini-live, etc.).

Additional benefits:
- **Stack consistency**: Gemini already powers Smart Import, AI Search, AI Concierge text, and file parsing
- **Single vendor**: One API key for all AI features instead of managing xAI + Google separately
- **Native audio model**: `gemini-live-2.5-flash-native-audio` is purpose-built for voice-to-voice
- **VAD built-in**: Server-side voice activity detection, automatic turn-taking
- **30+ voices and languages** out of the box
- **Direct browser WebSocket**: No proxy infrastructure needed

## Implementation Plan

### Step 1: Get Gemini API Key

Before any code changes, you'll need to provide your Google AI (Gemini) API key. This will be stored securely as a Supabase secret called `GEMINI_API_KEY`.

- Get it from https://aistudio.google.com/apikey
- It needs Gemini Live API access enabled

### Step 2: Create Edge Function `gemini-voice-session`

Repurpose the existing `xai-voice-session` edge function pattern:
- Keep ALL existing auth + tier gating logic (super admin, Frequent Chraveler, Pro plans)
- Return `{ api_key: GEMINI_API_KEY }` instead of `XAI_API_KEY`
- Same security model: key never in client bundle, only returned at runtime after auth

### Step 3: Rewrite `useGrokVoice.ts` as `useGeminiVoice.ts`

Complete rewrite of the voice hook to use Gemini Live API WebSocket protocol:

**Connection**: Direct browser WebSocket to:
```text
wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}
```

**Session setup**: First message after connection sends configuration:
```json
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio",
    "generationConfig": {
      "responseModalities": ["AUDIO", "TEXT"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": {
            "voiceName": "Kore"
          }
        }
      }
    },
    "systemInstruction": {
      "parts": [{ "text": "You are Chravel AI Concierge..." }]
    }
  }
}
```

**Audio streaming**: Send mic PCM data as base64 in `realtimeInput` messages:
```json
{
  "realtimeInput": {
    "mediaChunks": [{
      "mimeType": "audio/pcm;rate=16000",
      "data": "<base64 PCM>"
    }]
  }
}
```

**Receiving audio**: Listen for `serverContent` messages with `inlineData` audio parts, decode and play via AudioContext queue (reuse existing playback queue logic).

**VAD + Turn-taking**: Gemini Live API has built-in server-side VAD. When the user stops speaking, the model automatically generates a response -- no manual `commit` + `response.create` needed.

**Interruption**: Gemini supports barge-in natively. When user starts speaking during assistant playback, the server sends a turn-complete signal and the client cancels playback.

**What carries over from current code**:
- `VoiceState` type and state machine (idle, connecting, listening, thinking, speaking, error)
- Audio playback queue with `nextPlayTimeRef` scheduling
- PCM encoding/decoding helpers (adjusted for 16kHz instead of 24kHz)
- Mic capture via ScriptProcessorNode
- Connection timeout logic
- Cleanup and resource management
- `shouldStreamRef` gate for mic during playback

### Step 4: Update Imports in Consuming Components

These files import from `useGrokVoice` and need import path updates:
- `src/components/AIConciergeChat.tsx` -- change `useGrokVoice` to `useGeminiVoice`
- `src/features/chat/components/VoiceButton.tsx` -- update `VoiceState` import path
- `src/features/chat/components/AiChatInput.tsx` -- update `VoiceState` import path

No behavioral changes to these components -- the hook exposes the same interface.

### Step 5: Clean Up xAI Voice Artifacts

- Delete `supabase/functions/xai-voice-session/index.ts` (or repurpose as `gemini-voice-session`)
- Remove `xai-voice-session` from `supabase/config.toml`
- Delete `src/hooks/useGrokVoice.ts` after the new hook is created
- Update `src/billing/types.ts` comment from "Grok Voice" to "Gemini Voice"
- `XAI_API_KEY` secret can remain (not harmful), or be cleaned up later

## Voice Selection

Gemini Live API offers multiple voices. Since the "Rex = Recs = Recommendations" nod was for xAI specifically, for Gemini we should pick a voice that sounds authoritative and warm for a travel concierge. Options include Aoede, Charon, Fenrir, Kore, Puck, and others. We can set whichever you prefer -- Kore is a good default (warm, clear) but this is easily configurable.

## Files Changed Summary

| File | Action |
|------|--------|
| `supabase/functions/gemini-voice-session/index.ts` | Create (reuse auth/tier logic from xai-voice-session) |
| `src/hooks/useGeminiVoice.ts` | Create (full Gemini Live API WebSocket implementation) |
| `src/components/AIConciergeChat.tsx` | Update import from useGrokVoice to useGeminiVoice |
| `src/features/chat/components/VoiceButton.tsx` | Update VoiceState import path |
| `src/features/chat/components/AiChatInput.tsx` | Update VoiceState import path |
| `src/hooks/useGrokVoice.ts` | Delete |
| `supabase/functions/xai-voice-session/index.ts` | Delete |
| `supabase/config.toml` | Remove xai-voice-session, add gemini-voice-session |
| `src/billing/types.ts` | Update comment |

## Next Step

Before I can implement, I need you to provide your Gemini API key so I can store it as a Supabase secret. Go to https://aistudio.google.com/apikey to get one, then let me know and I'll use the secure secrets tool to store it.

