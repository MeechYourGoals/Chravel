
## Scope + decisions (Gate 1)

### Objective
Fix Grok Voice so the mic button reliably starts a real-time, low-latency voice conversation (not “dictation”), and update the mic button styling to match the send button’s purple gradient.

### Success criteria (what “done” means)
1. Mic button (idle state) uses the **same purple gradient as Send** (and keeps premium hover/press).
2. Tapping mic transitions **Idle → Connecting → Listening** within a few seconds (no infinite “Connecting”).
3. Voice round-trip works end-to-end: speak → transcription appears as a user message → assistant transcript streams as text → assistant audio plays.
4. Interrupt works: tap mic during Speaking cancels playback and returns to Listening quickly.
5. Failures surface clearly: connection/auth errors show an inline error + auto-reset; no silent hangs.
6. Assistant responses are **always visible in text** (accessibility + trust), in addition to voice.

### Key finding (root cause)
In `src/hooks/useGrokVoice.ts`, we successfully mint an ephemeral token (`data.client_secret.value`) but **never use it to authenticate the WebSocket**. The WS is created as:
- `new WebSocket("wss://api.x.ai/v1/realtime?model=grok-3-fast")`

So xAI rejects/terminates the handshake. Because `onclose` only sets state when `activeRef.current === true` (which is only set in `onopen`), a failed handshake can leave the UI stuck in **Connecting** indefinitely.

Secondary issues that will block “OpenAI Voice Mode”-level experience even after connect:
- Missing/partial `session.update` (no voice, instructions, server_vad, modalities)
- Event type mismatches (your handler listens for `response.audio.delta` / `response.audio_transcript.delta`, but xAI/OpenAI-spec commonly uses `response.output_audio.delta` / `response.output_audio_transcript.delta`)
- Mic audio keeps streaming during Speaking (risk of feedback + confusing turn-taking)
- Audio playback is not queued/scheduled; chunk playback will be jittery

---

## Target manifest (Gate 2)

### Files to change
1. `src/features/chat/components/VoiceButton.tsx`
   - Change the idle/primary gradient from amber→yellow to **send button’s purple gradient**.
   - Keep state-specific colors (listening green, speaking blue, error red) unless you want full purple everywhere.

2. `src/hooks/useGrokVoice.ts`
   - Fix authentication for browser WebSocket using the ephemeral token.
   - Add connection timeout + better close/error handling (no infinite “Connecting”).
   - Send full `session.update` for voice agent configuration.
   - Support both xAI/OpenAI-spec event names (robust parsing).
   - Implement “voice-mode” turn-taking (VAD-driven commits + response.create), pause mic streaming during Speaking, and add audio playback queue.

3. `src/components/AIConciergeChat.tsx`
   - Render streaming transcripts in the thread (not only finalized assistant transcript).
   - Surface `voiceError` in an inline toast/badge so failures are obvious.
   - Ensure assistant responses are always shown as text (already true at “done”, but we’ll make streaming visible too).

### Optional (only if needed after the WS fix)
4. `supabase/functions/xai-voice-session/index.ts`
   - Either keep current `POST /v1/realtime/sessions` approach, or switch to docs-recommended `POST /v1/realtime/client_secrets`.
   - If we switch: update the client to accept both response shapes (`data.client_secret.value` OR `data.value`), so it’s backward compatible.

---

## Implementation plan (Gate 3)

### A) UI: make mic idle gradient purple (fast, low-risk)
- In `VoiceButton.tsx`, update the `default` style (eligible + idle) to match Send:
  - Use the same class string as Send: `bg-gradient-to-r from-indigo-600 to-purple-600 ...`
- Keep the existing hover/active micro-interactions (`hover:scale-105 active:scale-95`) and `size-11` so it stays symmetric.

Notes:
- For **ineligible** state, we can keep a slightly dimmed purple gradient + lock badge so it doesn’t disappear on dark backgrounds.

---

### B) Fix “Connecting forever” (core reliability)
In `useGrokVoice.ts`:

#### B1) Authenticate the WebSocket using the ephemeral token
Implement browser-safe auth via `Sec-WebSocket-Protocol` (subprotocols), consistent with the OpenAI Realtime WebSocket pattern (xAI states compatibility with OpenAI Realtime spec).

Proposed connection attempts (most → least likely to work):
1. `new WebSocket(url, ['realtime', `openai-insecure-api-key.${token}`])`
2. If (1) closes before open: retry with `new WebSocket(url, ['realtime', `xai-insecure-api-key.${token}`])`
3. If still failing: final fallback using query param (ephemeral only):
   - `wss://api.x.ai/v1/realtime?model=...&access_token=${token}` (exact param name TBD; only used if docs confirm / if subprotocol retries fail)

We’ll implement the retries deterministically:
- Attempt #1, wait up to N seconds for `onopen`, else close and try #2.
- If #2 fails, throw a clear error so UI shows a useful message instead of hanging.

#### B2) Add “connect timeout” + correct onclose behavior
- Start a timer when creating WS; if `onopen` hasn’t fired within e.g. 6–8 seconds:
  - `setVoiceState('error')`
  - `setErrorMessage('Unable to connect to voice service. Please try again.')`
  - `cleanup()`
- In `ws.onclose`, if we never reached `onopen`, treat it as a connection failure and set error state (do not leave state as `connecting`).

---

### C) Make it actually “Voice Mode” (not dictation)
Once connected, update the protocol + turn model:

#### C1) Send a full `session.update` immediately on open
Include:
- `voice: 'Ara'` (or keep current server-configured voice if you prefer)
- `instructions` (Chravel concierge)
- `turn_detection: { type: 'server_vad' }`
- audio formats, sample rate expectations if supported
- `response` defaults with modalities `[ 'text', 'audio' ]` where spec supports it

(We will keep the payload compatible with your current server session settings: `pcm16`, 24k).

#### C2) VAD-driven “end of speech” => auto-response
Today, you set state to Thinking on `input_audio_buffer.speech_stopped`, but you do not automatically commit/request a response. Add:
- On `speech_stopped`: send
  - `input_audio_buffer.commit`
  - `response.create` with `modalities: ['text','audio']`
- This makes it feel like OpenAI/Gemini voice mode: user talks naturally, model responds without extra taps.

#### C3) Pause mic streaming while Speaking
To prevent feedback + accidental capture of assistant audio:
- Only stream mic chunks when `voiceState === 'listening'` (or a `shouldStreamMicRef.current` boolean).
- When we enter Speaking, stop sending audio (keep the MediaStream alive; just stop appending).

#### C4) Audio playback queue (reduce jitter)
Replace “play each chunk immediately” with a simple queue:
- Track `nextStartTimeRef`
- Schedule each chunk with `source.start(Math.max(ctx.currentTime, nextStartTimeRef))`
- Advance `nextStartTimeRef += buffer.duration`
- On interrupt/cancel: stop all scheduled sources + reset queue time.

This is the biggest perceived-quality win after “it connects”.

---

### D) Fix event compatibility (xAI vs OpenAI naming)
In `handleServerEvent`, support multiple possible event names:
- User transcription:
  - `conversation.item.input_audio_transcription.completed` (keep)
- Assistant transcript deltas:
  - `response.output_audio_transcript.delta`
  - `response.audio_transcript.delta` (current)
- Assistant audio deltas:
  - `response.output_audio.delta`
  - `response.audio.delta` (current)
- Completion:
  - `response.done` (keep)

We’ll implement a small normalizer:
- If `msg.type` is one of the known variants, route to the same handler.

---

### E) Transcript-first UI (answering your question + improving trust)
#### Opinion + product direction
Yes: voice responses should also be shown in text, always.
- Trust: users can verify what the assistant “thinks it heard”
- Accessibility: silent environments, hearing impaired, read-back
- Utility: copy/share/search in chat history
- Recovery: if audio fails, user still gets the answer

#### Implementation
In `AIConciergeChat.tsx`:
- While assistant transcript is streaming (hook’s `assistantTranscript`):
  - show/update a “live assistant message bubble” (single message ID) instead of only adding a final message at `.done`.
- Similarly, once the user transcription completes, show as a user message (already done).
- If voice fails mid-turn, drop the last user transcript into the text input (optional but recommended), so they can press Send.

---

## Verification plan (Gate 4)

### Manual acceptance tests (Desktop Chrome)
1. Mic idle gradient matches send gradient (purple).
2. Tap mic:
   - within 1–8s: transitions to Listening (no infinite Connecting).
3. Speak 1–2 sentences, stop:
   - user transcript appears as a user message
   - assistant transcript starts streaming (text updates in-place)
   - assistant audio plays with minimal jitter
4. During assistant speaking: tap mic
   - audio stops quickly
   - state returns to Listening
5. Turn off mic / stop voice:
   - closes WS and mic stream cleanly (no continuing audio capture)

### Mobile (iOS Safari / PWA)
1. Tap mic triggers permission prompt; deny shows clear message.
2. Approve mic: audio playback works from user gesture (no silent failure).
3. Bottom composer not clipped; safe-area respected (already in `pb-[env(safe-area-inset-bottom)]`).

### Security checks
- Confirm no `XAI_API_KEY` in client bundle or network calls.
- Only ephemeral token used client-side.

### Observability (for debugging)
- Add DEV-only logs for WS close codes/reasons and session token presence (never log the token value).
- Check Edge Function logs for `xai-voice-session` to confirm token minting is called when tapping mic.

---

## Risks / mitigations (Gate 1+4)
- **Auth mechanism mismatch**: If xAI doesn’t accept the OpenAI-style subprotocol, we may need to:
  - use a lightweight WS proxy edge function (backend connects with headers; browser connects to Supabase WS endpoint), or
  - use a documented query-param token method if available.
  Mitigation: implement retry strategy + clear error states; keep changes localized to `useGrokVoice`.

- **Model mismatch** (`grok-3-fast` vs voice agent model): If WS rejects the model:
  - fallback to a known voice model name (from docs) and/or read model from the server response if provided.

---

## Delivery checklist (Gate 5)
- [ ] Mic idle gradient purple, symmetrical with Send
- [ ] No more “Connecting forever”
- [ ] Real voice loop: VAD stop → response → auto ready for next turn
- [ ] Streaming transcript visible in thread (not just final)
- [ ] Interrupt cancels audio + continues
- [ ] Mobile permission + playback handled
- [ ] Edge logs + UI error handling clear

