# Voice Hardening Runbook — Ship-Safe Layer for Gemini Live

## Overview

Five guardrail features wrap the Gemini Live voice implementation:

1. **Feature flags** — Gate voice UI and initialization
2. **Circuit breaker** — Prevent infinite reconnect loops; graceful fallback to text
3. **Transport sanity** — Duplex (WebSocket) required; reject SSE/HTTP
4. **Audio invariants** — Explicit contract + asserts for capture/playback
5. **Concierge session store** — Single source of truth for session state

## Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `VITE_VOICE_LIVE_ENABLED` | `false` | Gate voice UI + initialization. `false` = no voice init. |
| `VITE_VOICE_DIAGNOSTICS_ENABLED` | `false` | Extra console logs (connection codes, audio params). |
| `VITE_VOICE_USE_WEBSOCKET_ONLY` | `true` | Enforce duplex; reject silent downgrade to SSE/HTTP. |

### How to Toggle

Add to `.env` or `.env.local`:

```bash
# Enable voice (for local dev / staging)
VITE_VOICE_LIVE_ENABLED=true

# Enable diagnostics for debugging
VITE_VOICE_DIAGNOSTICS_ENABLED=true
```

Restart dev server after changing env vars.

### Verify Behavior

- **Voice disabled** (`VITE_VOICE_LIVE_ENABLED=false`): Voice mic button hidden; no WebSocket or mic capture.
- **Voice enabled** (`VITE_VOICE_LIVE_ENABLED=true`): Voice mic visible; tap to start session.

## Circuit Breaker

After **3 failures** within **5 minutes**, voice is disabled for the session. User sees:

- Toast: "Voice is temporarily unavailable—switched to text."
- Bar with "Try voice again" button.

### How to Test

1. Enable voice (`VITE_VOICE_LIVE_ENABLED=true`).
2. Trigger 3+ failures (e.g. revoke mic permission, disconnect network, or invalid API key).
3. Confirm toast and "Try voice again" bar appear.
4. Click "Try voice again" → circuit resets; voice can be retried.

### Reset

- In-app: Click "Try voice again".
- Programmatic: `resetCircuitBreaker()` from `@/voice/circuitBreaker`.
- Storage: `localStorage` key `chravel_voice_circuit_breaker` (24h expiry).

## Transport Sanity

Voice uses **WebSocket only**. SSE/HTTP polling is rejected.

- Centralized in `src/voice/transport/createTransport.ts`.
- `createWebSocketTransport({ url })` validates URL (`ws://` or `wss://`) and creates socket.
- With `VITE_VOICE_DIAGNOSTICS_ENABLED=true`, connection open/close codes are logged.

## Audio Contract

Defined in `src/voice/audioContract.ts`:

- **Input**: 16 kHz mono PCM16, chunk 20–40 ms.
- **Output**: 24 kHz mono PCM16.
- **Asserts**: No giant frames (>48k samples), no empty-frame loops.

With diagnostics enabled, `AudioContext` sample rate and capture format are logged.

## Concierge Session Store

`src/store/conciergeSessionStore.ts` — keyed by `trip_id`:

- Message history (persistent in UI)
- Voice session state machine state
- `last_error` + `last_success` timestamps

Query limits remain in `useConciergeUsage` (server RPC).

## Files Changed

| File | Purpose |
|------|---------|
| `src/config/voiceFeatureFlags.ts` | Voice feature flags |
| `src/voice/circuitBreaker.ts` | Circuit breaker logic |
| `src/voice/transport/createTransport.ts` | WebSocket transport creation |
| `src/voice/audioContract.ts` | Audio contract + asserts |
| `src/store/conciergeSessionStore.ts` | Concierge session store |
| `src/hooks/useGeminiLive.ts` | Integrate flags, circuit breaker, transport, audio |
| `src/components/AIConciergeChat.tsx` | Gate voice UI, circuit breaker UI, store sync |
| `src/lib/geminiLive/audioCapture.ts` | Use audio contract, assert chunk framing |
| `.env.example` | Voice flag docs |
| `scripts/validate-env.ts` | Voice flag validation |

## Quick Test Checklist

- [ ] `VITE_VOICE_LIVE_ENABLED=false` → voice button hidden
- [ ] `VITE_VOICE_LIVE_ENABLED=true` → voice works (with valid auth + API key)
- [ ] 3 voice failures → toast + "Try voice again" bar
- [ ] "Try voice again" → circuit resets, voice retry works
- [ ] Text chat unchanged
- [ ] Trip navigation unchanged
- [ ] Demo mode: no crashes, no infinite retries

## Regression Risk

**LOW** — Wrappers and targeted refactors; core behavior unchanged when flags are enabled.

**Rollback**: Set `VITE_VOICE_LIVE_ENABLED=false` to disable voice; text chat unaffected.
