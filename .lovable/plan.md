

# Grok Voice for AI Concierge (Frequent Chraveler + Pro Tiers)

## Overview

Add real-time voice conversation powered by xAI's Grok Voice Agent API to the AI Concierge. Voice is feature-gated: Free/Explorer = text only (mic visible but locked); Frequent Chraveler + Pro = voice + text. The xAI API key is stored server-side only, and the client authenticates via ephemeral tokens minted by a new edge function.

## Pre-Requisite: Build Errors

There are existing TypeScript build errors in `useWebPush.ts`, `pushNotifications.ts`, `notificationService.ts`, and `productionNotificationService.ts` -- all referencing `pushManager` on `ServiceWorkerRegistration`. These must be fixed first (add type assertion `(registration as any).pushManager`) to unblock deployment.

## Pre-Requisite: XAI_API_KEY Secret

Before implementation, we need the `XAI_API_KEY` stored in Supabase Edge Function secrets. You mentioned you'll provide this -- we'll add it via the secrets tool before deploying the edge function.

## Architecture

```text
  Browser (Chravel PWA)
  +-----------------------------------------+
  |  AIConciergeChat                        |
  |    +-- VoiceButton (mic icon)           |
  |    +-- useGrokVoice() hook              |
  |         |                               |
  |   1. POST /xai-voice-session            |
  |         |                               |
  |   2. Open WebSocket to xAI              |
  |      wss://api.x.ai/v1/realtime        |
  |         |                               |
  |   3. Stream mic audio (PCM base64)      |
  |   4. Receive audio + transcript deltas  |
  +-----------------------------------------+

  Supabase Edge Function
  +-----------------------------------+
  | xai-voice-session/index.ts        |
  |  - Verify auth (Supabase JWT)     |
  |  - Check tier (frequent/pro)      |
  |  - Mint ephemeral token from xAI  |
  |  - Return token to client         |
  +-----------------------------------+
```

## Implementation Steps

### Step 1: Fix Existing Build Errors (3 files)

Add `(registration as any).pushManager` type assertions in:
- `src/hooks/useWebPush.ts` (lines 203, 205, 250, 277)
- `src/platform/pushNotifications.ts` (line 48)
- `src/services/notificationService.ts` (lines 159, 163, 615)
- `src/services/productionNotificationService.ts` (lines 94, 324)

### Step 2: Add XAI_API_KEY Secret

Request the xAI API key from the user and store it in Supabase secrets. This key is never exposed to the client.

### Step 3: Create Edge Function `xai-voice-session`

**File**: `supabase/functions/xai-voice-session/index.ts`

Responsibilities:
- Authenticate the user via Supabase JWT
- Check subscription tier: allow only `frequent-chraveler`, `pro-starter`, `pro-growth`, `pro-enterprise`, or super admin
- Call `POST https://api.x.ai/v1/realtime/client_secrets` with the server-side `XAI_API_KEY`
- Return the ephemeral token (expires in 300 seconds) to the client
- Return 403 with `{ error: "VOICE_NOT_INCLUDED" }` for ineligible tiers

Add to `supabase/config.toml`:
```toml
[functions.xai-voice-session]
verify_jwt = true
```

### Step 4: Create Voice State Machine Hook

**File**: `src/hooks/useGrokVoice.ts`

A React hook that manages the entire voice lifecycle:

**States**: `idle` | `connecting` | `listening` | `thinking` | `speaking` | `error`

**Core logic**:
1. `startVoice()`: Call the edge function to get ephemeral token, open WebSocket to `wss://api.x.ai/v1/realtime`, send `session.update` with voice config (voice: "Ara", server VAD, PCM 24kHz, Chravel concierge instructions)
2. `stopVoice()`: Close mic, close WebSocket, clean up audio context
3. Mic capture: Use `navigator.mediaDevices.getUserMedia()` + `AudioWorkletNode` to capture PCM 16-bit samples, base64-encode, send via `input_audio_buffer.append`
4. Handle server events:
   - `conversation.item.input_audio_transcription.completed` -- user transcript
   - `response.output_audio_transcript.delta` -- assistant text streaming
   - `response.output_audio.delta` -- play audio via Web Audio API
   - `response.done` -- transition back to idle
5. Interrupt: If user taps mic during `speaking`, stop playback and start listening
6. Error handling: On WebSocket close/error, transition to `error` state, drop any partial transcript into the text input as fallback
7. Cleanup on unmount: Close mic, stop audio, close WebSocket

**Voice config sent in `session.update`**:
```json
{
  "type": "session.update",
  "session": {
    "instructions": "You are Chravel AI Concierge. Be concise, travel-smart, and action-oriented. Prefer actionable answers and bullets. Keep responses under 30 seconds of speech.",
    "voice": "Ara",
    "turn_detection": { "type": "server_vad" },
    "audio": {
      "input": { "format": { "type": "audio/pcm", "rate": 24000 } },
      "output": { "format": { "type": "audio/pcm", "rate": 24000 } }
    }
  }
}
```

### Step 5: Create Voice Button Component

**File**: `src/features/chat/components/VoiceButton.tsx`

A circular button that sits left of the Send button in the input row. Visual states:

| State | Icon | Style |
|-------|------|-------|
| Idle (eligible) | Mic icon | Glass style, matches send button |
| Idle (ineligible) | Mic + Lock badge | Dimmed, tooltip "Voice (Pro)" |
| Listening | Animated mic with pulsing ring | Green accent |
| Thinking | Spinner | Purple accent |
| Speaking | Sound wave + "Tap to interrupt" | Blue accent |
| Error | Mic with X | Red, auto-resets to idle |

Tap behavior:
- Idle + eligible: Start voice session
- Idle + ineligible: Show upgrade modal
- Listening: Commit audio buffer and request response
- Speaking: Interrupt playback, start listening again

### Step 6: Update AiChatInput Component

**File**: `src/features/chat/components/AiChatInput.tsx`

- Add `VoiceButton` between textarea and send button
- Add new props: `voiceState`, `onVoiceToggle`, `isVoiceEligible`, `onVoiceUpgrade`
- Voice button is always visible but gated by tier

### Step 7: Update AIConciergeChat Component

**File**: `src/components/AIConciergeChat.tsx`

- Import and use `useGrokVoice()` hook
- Determine voice eligibility: `tier === 'frequent-chraveler' || isPro || isSuperAdmin`
- Pass voice state and handlers to `AiChatInput`
- When voice transcript arrives (user or assistant), append to the messages array just like text messages
- Update header status indicator to show voice states ("Listening...", "Thinking...", "Speaking...")
- On voice error, fall back gracefully: drop partial transcript into text input

### Step 8: Add Voice Entitlement

**File**: `src/billing/types.ts`

Add new entitlement:
```typescript
| 'voice_concierge'         // Grok Voice in AI Concierge
```

**File**: `src/hooks/useUnifiedEntitlements.ts`

Add to FEATURE_LIMITS:
```typescript
voice_concierge: { free: 0, explorer: 0, 'frequent-chraveler': -1, 'pro-starter': -1 },
```

Add `'voice_concierge'` to `FeatureName` type in `src/billing/types.ts`.

### Step 9: Empty State Enhancement

In the empty state section of `AIConciergeChat.tsx`, add:
- If voice eligible: A "Try Voice" button that starts listening
- If not eligible: A "Voice is Pro" chip linking to upgrade

## Feature Gating Summary

| Tier | Text Chat | Voice |
|------|-----------|-------|
| Free | 5/trip | Locked (mic visible, shows upgrade) |
| Explorer | 10/trip | Locked (mic visible, shows upgrade) |
| Frequent Chraveler | Unlimited | Enabled |
| Pro (all tiers) | Unlimited | Enabled |
| Super Admin | Unlimited | Enabled |

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useWebPush.ts` | Fix pushManager type errors |
| `src/platform/pushNotifications.ts` | Fix pushManager type errors |
| `src/services/notificationService.ts` | Fix pushManager type errors |
| `src/services/productionNotificationService.ts` | Fix pushManager type errors |
| `supabase/functions/xai-voice-session/index.ts` | NEW: Ephemeral token minting endpoint |
| `supabase/config.toml` | Add xai-voice-session config |
| `src/hooks/useGrokVoice.ts` | NEW: Voice state machine + WebSocket + audio |
| `src/features/chat/components/VoiceButton.tsx` | NEW: Mic button with state-based visuals |
| `src/features/chat/components/AiChatInput.tsx` | Add VoiceButton to input row |
| `src/components/AIConciergeChat.tsx` | Integrate voice hook, gating, header states |
| `src/billing/types.ts` | Add voice_concierge entitlement + feature name |
| `src/hooks/useUnifiedEntitlements.ts` | Add voice_concierge to FEATURE_LIMITS |

## Security Guarantees

- XAI_API_KEY exists ONLY in Supabase Edge Function secrets -- never in client code, VITE_ vars, or network responses
- Client receives only ephemeral tokens (300s TTL)
- Edge function validates Supabase JWT + tier before minting tokens
- One active voice session at a time (enforced in hook)
- Mic permission denial shows clear message with guidance

## Mobile/PWA Considerations

- Bottom input bar respects `env(safe-area-inset-bottom)` (already implemented)
- Mic button sized for touch targets (min 44x44px)
- Audio playback uses Web Audio API (works in iOS Safari PWA)
- Falls back gracefully if `getUserMedia` is blocked

