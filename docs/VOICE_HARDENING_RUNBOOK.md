# Voice Hardening Runbook — Ship-Safe Layer for Gemini Live

## Overview

The voice system has two modes:

1. **Dictation mode (active)** — Waveform button uses browser Web Speech API for speech-to-text. Transcribed text fills the input field for user review before sending.
2. **Duplex mode (disabled, preserved)** — Bidirectional Gemini Live via Vertex AI. Full conversation with audio playback. Gated behind `DUPLEX_VOICE_ENABLED = false`.

Five guardrail features wrap the duplex implementation (all preserved for re-enablement):

1. **Feature flags** — Gate voice UI and initialization
2. **Circuit breaker** — Prevent infinite reconnect loops; graceful fallback to text
3. **Transport sanity** — Duplex (WebSocket) required; reject SSE/HTTP
4. **Audio invariants** — Explicit contract + asserts for capture/playback
5. **Concierge session store** — Single source of truth for session state

---

## Current State: Dictation Mode

### How It Works

1. User taps the waveform button (🔊) in the concierge input bar
2. Browser requests microphone permission (if not already granted)
3. Web Speech API captures speech and transcribes to text
4. Transcribed text appears in the input field (editable)
5. User can review, edit, then tap Send
6. After 2s of silence, transcript auto-finalizes into the input field

### Key File

`src/hooks/useWebSpeechVoice.ts` — handles all platform quirks:
- iOS Safari auto-restart (iOS ends recognition on every pause)
- 2s silence timer for auto-finalization
- 5s no-audio timeout for permission errors
- PWA detection and clear error messaging

### Device Optimization

| Platform | Behavior |
|----------|----------|
| Desktop Chrome/Edge | `continuous=true`, stable recognition |
| iOS Safari | Auto-restart loop (up to 20 restarts), `continuous=false` |
| iOS PWA | May not support Web Speech — clear error shown |
| Android Chrome | `continuous=true`, stable |
| Mobile web (all) | Same waveform button, responsive layout |

---

## Duplex Mode: Re-Enablement Guide

### Quick Enable

```typescript
// src/components/AIConciergeChat.tsx line ~57
const DUPLEX_VOICE_ENABLED = true;  // ← flip this
```

### Prerequisites (Must Be Working First)

See `docs/GEMINI_LIVE_ARCHITECTURE_REPORT.md` § "Step-by-Step Fix Guide" for the complete checklist. Summary:

1. **Supabase secrets set:** `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_SERVICE_ACCOUNT_KEY`
2. **Edge function deployed:** `gemini-voice-session`
3. **WebSocket handshake fixed:** `BidiGenerateContentSetup` message with correct fields
4. **OAuth2 flow verified:** Service account key decodes and mints valid tokens

### Known Issues to Fix Before Re-Enabling

| Issue | Location | Fix |
|-------|----------|-----|
| Missing `enableAffectiveDialog` | Edge function setup message | Add to `generation_config` |
| Missing `proactivity.proactiveAudio` | Edge function setup message | Add as top-level setup field |
| Wrong API version (`v1` vs `v1beta1`) | Edge function WebSocket URL | Try `v1beta1` for preview features |
| Function declaration type casing | Edge function `VOICE_FUNCTION_DECLARATIONS` | Verify `OBJECT`→`object` etc. |
| Service account key encoding | Edge function `parseServiceAccountKey` | Verify Base64 with no line breaks |

---

## Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `DUPLEX_VOICE_ENABLED` | `false` | Master switch for duplex voice in `AIConciergeChat.tsx` |
| `VITE_VOICE_LIVE_ENABLED` | `true` | Gate voice UI + initialization at env level |
| `VITE_VOICE_DIAGNOSTICS_ENABLED` | `false` | Extra console logs (connection codes, audio params) |
| `VITE_VOICE_USE_WEBSOCKET_ONLY` | `true` | Enforce duplex transport; reject SSE/HTTP fallback |

### How to Toggle

Add to `.env` or `.env.local` (restart dev server after):

```bash
VITE_VOICE_LIVE_ENABLED=true
VITE_VOICE_DIAGNOSTICS_ENABLED=true
```

---

## Circuit Breaker (Duplex Only)

After **3 failures** within **5 minutes**, voice is disabled for the session. User sees:

- Toast: "Voice is temporarily unavailable—switched to text."
- Bar with "Try voice again" button.

### Reset

- In-app: Click "Try voice again".
- Programmatic: `resetCircuitBreaker()` from `@/voice/circuitBreaker`.
- Storage: `localStorage` key `chravel_voice_circuit_breaker` (24h expiry).

---

## Transport Sanity (Duplex Only)

Voice uses **WebSocket only**. SSE/HTTP polling is rejected.

- Centralized in `src/voice/transport/createTransport.ts`.
- `createWebSocketTransport({ url })` validates URL (`ws://` or `wss://`) and creates socket.

---

## Audio Contract (Duplex Only)

Defined in `src/voice/audioContract.ts`:

- **Input**: 16 kHz mono PCM16, chunk 20–40 ms.
- **Output**: 24 kHz mono PCM16.
- **Asserts**: No giant frames (>48k samples), no empty-frame loops.

---

## Files Reference

| File | Purpose | Mode |
|------|---------|------|
| `src/components/AIConciergeChat.tsx` | Main UI + `DUPLEX_VOICE_ENABLED` flag | Both |
| `src/hooks/useWebSpeechVoice.ts` | Web Speech API dictation | Dictation |
| `src/hooks/useGeminiLive.ts` | Gemini Live WebSocket hook | Duplex |
| `src/features/chat/components/VoiceButton.tsx` | Waveform button | Both |
| `src/features/chat/components/VoiceLiveOverlay.tsx` | Waveform ring overlay | Duplex |
| `src/features/chat/components/AiChatInput.tsx` | Input bar with voice button | Both |
| `src/config/voiceFeatureFlags.ts` | Env-level feature flags | Both |
| `src/voice/circuitBreaker.ts` | Circuit breaker logic | Duplex |
| `src/voice/transport/createTransport.ts` | WebSocket transport | Duplex |
| `src/voice/audioContract.ts` | Audio contract + asserts | Duplex |
| `src/store/conciergeSessionStore.ts` | Session state store | Both |
| `supabase/functions/gemini-voice-session/index.ts` | Edge function (OAuth2 + config) | Duplex |

---

## Quick Test Checklist

### Dictation Mode (Current)
- [ ] Tap waveform → browser asks for mic permission
- [ ] Speak → text appears in input field
- [ ] User can edit text before sending
- [ ] 2s silence → transcript finalizes in input field
- [ ] Tap waveform again → stops listening
- [ ] Works on desktop Chrome
- [ ] Works on iOS Safari
- [ ] Works on Android Chrome
- [ ] Text chat unchanged
- [ ] Trip navigation unchanged

### Duplex Mode (After Re-Enabling)
- [ ] `DUPLEX_VOICE_ENABLED=true` → VoiceLiveOverlay opens on tap
- [ ] Edge function returns token (check logs)
- [ ] WebSocket connects to Vertex AI
- [ ] Audio capture → model response → audio playback
- [ ] 3 voice failures → circuit breaker toast
- [ ] "Try voice again" → circuit resets

---

## Regression Risk

**LOW** — Dictation mode uses the well-tested `useWebSpeechVoice` hook. Duplex code is fully preserved but not invoked. Flipping `DUPLEX_VOICE_ENABLED` back to `true` restores the full duplex path with no code changes needed (assuming Vertex issues are fixed).

**Rollback**: Set `DUPLEX_VOICE_ENABLED = false` to return to dictation-only mode.
