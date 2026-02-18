# Voice Mode for AI Concierge — Implementation Plan

> **Purpose:** Definitive plan to make Gemini Live voice fully functional across desktop, mobile, tablet, and iOS Safari.  
> **Date:** 2026-02-18  
> **Status:** Ready for implementation

---

## Executive Summary

You already have **90% of the voice infrastructure built**. The failures stem from:

1. **Root cause:** `gemini-voice-session` combines `functionDeclarations` + `googleSearch` in the tools array, causing Gemini's auth_tokens API to return 400 and killing the session before it starts.
2. **UI gap:** `AIConciergeChat.tsx` never passes voice props to `AiChatInput`, so the mic button never appears.

**Recommended approach:** Fix the tools bug, wire the existing hooks, add a strict state machine and fallbacks. **Do NOT** switch to Whisper + ElevenLabs — the 3-hop pipeline adds 5–8 seconds latency and loses natural interruption. Gemini Live is the right architecture.

---

## Current State (What Exists)

| Component | Location | Status |
|----------|----------|--------|
| `useGeminiLive.ts` | `src/hooks/` | ✅ Full bidirectional WebSocket audio (mic capture, PCM streaming, playback, tool calling) |
| `gemini-voice-session` | `supabase/functions/` | ⚠️ Tools config bug at line 191 |
| `VoiceButton.tsx` | `src/features/chat/components/` | ✅ Polished mic UI with pulse animations |
| `useWebSpeechVoice.ts` | `src/hooks/` | ✅ Browser STT fallback (not used for Gemini Live) |
| `AiChatInput` | `src/features/chat/components/` | ✅ Accepts `voiceState`, `onVoiceToggle`, `onVoiceUpgrade` |
| `AIConciergeChat.tsx` | `src/components/` | ❌ Does not pass any voice props |

---

## MVP Success Criteria (Non-Negotiable)

1. **Pro user** taps mic → speaks → AI responds with voice + text appended to chat.
2. **Start/Stop** always works — no zombie "listening" state.
3. **Stop speaking** instantly halts audio playback.
4. **Any failure** (mic denied, WS error, Gemini 400/500) auto-reverts to text mode with clear toast.
5. **iOS Safari** — permission prompt + audio playback works.

---

## Implementation Steps

### Step 1: Fix Gemini Live Session Bootstrap Bug

**File:** `supabase/functions/gemini-voice-session/index.ts`

**Change:** Line 191 — remove `googleSearch` from tools. Use **only** `functionDeclarations`.

```typescript
// BEFORE (broken — causes 400):
tools: [{ functionDeclarations: VOICE_FUNCTION_DECLARATIONS }, { googleSearch: {} }],

// AFTER (fixed):
tools: [{ functionDeclarations: VOICE_FUNCTION_DECLARATIONS }],
```

**Rationale:** Gemini's ephemeral token API for Live sessions does not support mixing `functionDeclarations` and `googleSearch` in the same tools array. Voice sessions are trip-scoped; function tools (calendar, tasks, polls, places, payments) cover all use cases. Add `googleSearch` back later once voice is stable, in a compliant format.

**Add structured logging:**

```typescript
const voiceSessionId = crypto.randomUUID();
console.log('[gemini-voice-session]', { voiceSessionId, model: params.model, toolsShape: 'functionDeclarations only' });

// In createEphemeralToken, when tokenResponse.ok is false:
if (!tokenResponse.ok) {
  const body = await tokenResponse.text();
  console.error('[gemini-voice-session] Token creation failed', {
    voiceSessionId,
    status: tokenResponse.status,
    body: body.substring(0, 500),
  });
  throw new Error(`Failed to create Gemini ephemeral token (${tokenResponse.status}): ${body.substring(0, 500)}`);
}
```

---

### Step 2: Add Voice Session State Machine

**File:** `src/hooks/useGeminiLive.ts`

**Enhancements:**

1. **Add `voiceSessionId`** — generate at start, pass to edge function body, log on connect/error.
2. **Add `requesting_permission`** state — separate from `connecting` so UI can show "Allow microphone" before WS.
3. **iOS AudioContext resume** — ensure `audioContext.resume()` is called after user gesture (the click that starts the session is sufficient; verify we don't create AudioContext before that).
4. **Explicit `thinking` state** — when user has spoken and we're waiting for first AI audio chunk, show "thinking" in UI. (Optional for MVP — `connecting` can cover it.)

**State flow:**
```
idle → requesting_permission → connecting → listening → [thinking] → speaking → listening → ...
         ↑                        ↑
         mic denied               WS/setup failed
              ↓                        ↓
            error → idle            error → idle
```

**Error handling:** Any error must call `cleanup()`, `setState('idle')`, `setError(msg)`.

---

### Step 3: Wire Voice into AIConciergeChat

**File:** `src/components/AIConciergeChat.tsx`

**Imports to add:**
```typescript
import { useGeminiLive, type ToolCallRequest } from '@/hooks/useGeminiLive';
import { useUnifiedEntitlements } from '@/hooks/useUnifiedEntitlements';
```

**New state and hooks:**
```typescript
const { canUse } = useUnifiedEntitlements();
const isVoiceEligible = canUse('voice_concierge');

const {
  state: voiceState,
  error: voiceError,
  startSession,
  endSession,
  isSupported: isVoiceSupported,
} = useGeminiLive({
  tripId,
  voice: 'Puck',
  onTranscript: (text) => {
    if (!text?.trim()) return;
    setMessages(prev => [...prev, {
      id: `voice-${Date.now()}`,
      type: 'assistant',
      content: text,
      timestamp: new Date().toISOString(),
    }]);
  },
  onToolCall: handleVoiceToolCall,
  onTurnComplete: () => { /* optional: refresh data */ },
});
```

**Voice state mapping for VoiceButton:**  
`VoiceButton` expects `VoiceState`: `'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error'`.  
`useGeminiLive` returns `GeminiLiveState`: `'idle' | 'connecting' | 'listening' | 'speaking' | 'error'`.  
Map directly — `connecting` covers "thinking" for MVP.

**Voice toggle handler:**
```typescript
const handleVoiceToggle = useCallback(() => {
  if (voiceState === 'idle' || voiceState === 'error') {
    startSession();
  } else {
    endSession();
  }
}, [voiceState, startSession, endSession]);
```

**Upgrade handler:**
```typescript
const handleVoiceUpgrade = useCallback(() => {
  toast.error('Voice concierge requires a Pro subscription', {
    description: 'Upgrade to Frequent Chraveler to use voice.',
  });
  if (upgradeUrl) window.location.href = upgradeUrl;
}, [upgradeUrl]);
```

**Pass props to AiChatInput:**
```typescript
<AiChatInput
  // ...existing props...
  voiceState={voiceState}
  isVoiceEligible={isVoiceEligible && isVoiceSupported}
  onVoiceToggle={handleVoiceToggle}
  onVoiceUpgrade={handleVoiceUpgrade}
/>
```

**Error handling:** When `voiceError` is set, show toast and ensure we're back to idle:
```typescript
useEffect(() => {
  if (voiceError) {
    toast.error(voiceError);
    endSession();
  }
}, [voiceError, endSession]);
```

---

### Step 4: Implement Voice Tool Call Handler

**File:** `src/components/AIConciergeChat.tsx`

**Handler signature:** `onToolCall` receives `ToolCallRequest` and must return `Promise<Record<string, unknown>>`.

**Option A — Client-side execution (recommended for MVP):**

Use existing services: `calendarService`, `taskService`, `pollService`, and Supabase for payments. Map voice args to service args.

| Tool | Voice Args | Service Call |
|------|------------|--------------|
| `addToCalendar` | title, startTime, endTime, location, description | `calendarService.createEvent({ trip_id, title, start_time: startTime, end_time: endTime, location, description })` |
| `createTask` | content, dueDate | `taskService.createTask(tripId, { title: content, description: content, due_at: dueDate })` |
| `createPoll` | question, options | `pollService.createPoll(tripId, { question, options })` |
| `getPaymentSummary` | (none) | Query `trip_payment_messages` + `payment_splits` via Supabase |
| `searchPlaces` | query, type | **Stub for MVP:** `{ message: 'Use the Places tab to search. Voice search coming soon.' }` |

**Option B — Edge function (cleaner, reuses server logic):**

Create `execute-voice-tool` edge function that accepts `{ functionName, args, tripId }`, validates auth + trip access, calls `functionExecutor.executeFunctionCall`, returns result. Client invokes it and passes result back to `useGeminiLive`.

**Recommended for MVP:** Option A for `addToCalendar`, `createTask`, `createPoll`, `getPaymentSummary`. Stub `searchPlaces`.

**Example implementation (client-side):**
```typescript
const handleVoiceToolCall = useCallback(async (call: ToolCallRequest): Promise<Record<string, unknown>> => {
  try {
    switch (call.name) {
      case 'addToCalendar': {
        const { title, startTime, endTime, location, description } = call.args as any;
        const { event } = await calendarService.createEvent({
          trip_id: tripId,
          title,
          start_time: startTime,
          end_time: endTime ?? undefined,
          location: location ?? undefined,
          description: description ?? undefined,
        });
        return { success: true, message: `Added "${title}" to calendar`, event };
      }
      case 'createTask': {
        const { content, dueDate } = call.args as any;
        const task = await taskService.createTask(tripId, {
          title: content,
          description: content,
          due_at: dueDate ?? undefined,
        });
        return { success: true, message: `Created task: "${content}"`, task };
      }
      case 'createPoll': {
        const { question, options } = call.args as any;
        const poll = await pollService.createPoll(tripId, { question, options });
        return { success: true, message: `Created poll: "${question}"`, poll };
      }
      case 'getPaymentSummary': {
        // Query Supabase for payments + splits
        const { data: payments } = await supabase
          .from('trip_payment_messages')
          .select('id, amount, description')
          .eq('trip_id', tripId)
          .limit(20);
        // ... build summary
        return { success: true, totalPayments: payments?.length ?? 0, /* ... */ };
      }
      case 'searchPlaces':
        return { message: 'Use the Places tab to search. Voice search coming soon.' };
      default:
        return { error: `Unknown tool: ${call.name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Tool execution failed' };
  }
}, [tripId]);
```

---

### Step 5: Voice Active UX

**File:** `src/components/AIConciergeChat.tsx`

When `voiceState` is `listening` or `speaking`:

1. **Banner:** Show "Voice Active" below header with a subtle background.
2. **Timer:** Optional — show elapsed time while listening.
3. **Transcript:** If `useGeminiLive` exposes partial transcript, display it; otherwise "Listening…".
4. **Stop button:** The VoiceButton already acts as toggle — tapping again calls `endSession`. Ensure it's clear (e.g. "Stop" label when active).

**Hybrid mode:** Text input remains available. User can type while voice is active.

---

### Step 6: Fallbacks

| Scenario | Action |
|----------|--------|
| Mic permission denied | Toast: "Microphone access denied. Allow mic permission in browser settings." Remain in text mode. |
| WebSocket connection fails | Toast with error. Call `endSession()`, revert to text. |
| Gemini 400 on token creation | Toast: "Voice session failed: [error message]". Revert to text. |
| Free user taps mic | Show upgrade prompt (existing `handleVoiceUpgrade`). |
| Network error mid-session | Toast. `endSession()`. |

---

### Step 7: iOS Safari Considerations

- **AudioContext:** Must be created/resumed only after user gesture. `startSession` is triggered by click — ensure we don't create `AudioContext` before that.
- **getUserMedia:** Works in Safari 14.3+. Request `audio` only.
- **WebSocket:** Universal support.
- **Sample rate:** useGeminiLive uses 16kHz input, 24kHz output — standard for Gemini Live.

**If issues persist:** Add explicit `audioContext.resume()` right before `startAudioCapture`, after setupComplete.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `supabase/functions/gemini-voice-session/index.ts` | Fix tools array; add voiceSessionId + logging |
| `src/components/AIConciergeChat.tsx` | Wire useGeminiLive, useUnifiedEntitlements, pass voice props, implement onToolCall, add voice banner |
| `src/hooks/useGeminiLive.ts` | (Optional) Add voiceSessionId, requesting_permission state, stricter error transitions |

---

## Manual Test Checklist

- [ ] **Pro user:** Tap mic → permission prompt → say "What's on the calendar?" → AI responds with voice + text in chat
- [ ] **Free user:** Tap mic → upgrade prompt
- [ ] **Stop listening:** Tap mic again → session ends, no zombie state
- [ ] **Stop speaking:** (If we add explicit stop-speaking control) — playback stops immediately
- [ ] **Mic denied:** Deny permission → toast, text chat still works
- [ ] **Network error:** Disconnect network mid-session → toast, revert to text
- [ ] **iOS Safari:** Same flows work
- [ ] **Desktop Chrome:** Full bidirectional conversation

---

## Why NOT Whisper + ElevenLabs

| Factor | Whisper + ElevenLabs | Gemini Live |
|--------|----------------------|-------------|
| Latency per turn | 5–8 seconds | Sub-second |
| Natural interruption | No | Yes |
| New API keys | 2 (OpenAI + ElevenLabs) | 0 (GEMINI_API_KEY already set) |
| New edge functions | 2 | 0 |
| Conversational feel | Walkie-talkie | Real conversation |

---

## Rollback Strategy

If voice causes regressions: remove voice props from `AiChatInput` in `AIConciergeChat` (one-line change). Text concierge remains fully functional. Revert the tools fix only if it breaks something else (unlikely — we're removing a feature, not adding).

---

## Regression Risk

**LOW** — Changes are additive. Text concierge flow is untouched. Edge function change is a single-line fix. Voice is gated behind entitlement check.
