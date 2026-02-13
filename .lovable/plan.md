

# Gemini-Native AI Concierge Implementation Plan

## Build Error Fix (Pre-requisite)

**File: `src/services/channelService.ts` (line 617)**

The `insertData` variable is typed as `Record<string, unknown>`, which doesn't match the Supabase `.insert()` overload expecting a typed row array. Fix: cast `insertData` to `any` before passing to `.insert()`.

---

## Architecture Decisions

### WebSocket / Gemini Live Voice

Supabase Edge Functions are **stateless HTTP handlers** and cannot maintain persistent WebSocket connections. Previous attempts at WebSocket proxying through edge functions failed. Therefore:

- **Gemini Live Audio** will use a **direct client-to-Gemini WebSocket** from the browser, authenticated with the `GEMINI_API_KEY` fetched via a short-lived token endpoint (edge function returns a scoped session token).
- No `gemini-live-proxy` edge function -- the browser connects directly to `wss://generativelanguage.googleapis.com/ws/...`.

### Lovable AI Gateway vs Direct Gemini

The existing `lovable-concierge` edge function uses the Lovable AI Gateway. Since the user explicitly requests direct Gemini API access for features the gateway doesn't support (function calling, grounding tools, Live audio), the plan replaces the gateway call with a direct Gemini REST call using the existing `GEMINI_API_KEY` secret.

---

## Phase 1: Replace Lovable Gateway with Direct Gemini (Text Chat)

### 1.1 Update Edge Function: `supabase/functions/lovable-concierge/index.ts`

- Replace the `fetch('https://ai.gateway.lovable.dev/v1/chat/completions', ...)` call (line 621) with a direct call to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
- Use `GEMINI_API_KEY` (already configured as a secret) instead of `LOVABLE_API_KEY`
- Keep ALL existing logic: RAG, context building, rate limiting, PII redaction, usage tracking
- Convert the OpenAI-format messages array to Gemini's `contents` format
- Map `system` role to `systemInstruction` field
- Parse Gemini's response format back to the existing response contract so the frontend needs zero changes

### 1.2 Add Gemini Function Calling Declarations

Within the same edge function update, add `tools` with function declarations:

- `addToCalendar(title, datetime, location, notes)` -- inserts into `trip_events`
- `createTask(content, assignee, dueDate)` -- inserts into `trip_tasks`
- `createPoll(question, options)` -- inserts into `trip_polls`
- `getPaymentSummary()` -- queries `trip_payment_messages` + `payment_splits`
- `searchPlaces(query, nearLat, nearLng)` -- calls Google Places API

When Gemini returns a `functionCall`, the edge function executes it against Supabase, returns the result to Gemini as a `functionResponse`, and gets the final natural-language answer.

### 1.3 Enable Google Search Grounding

Add `googleSearch` to the `tools` array for queries that need real-time information (sports scores, flight status, weather, news). The existing location-query detection logic will be extended to also detect general "current info" queries.

---

## Phase 2: Gemini Live Voice (Direct Client WebSocket)

### 2.1 Create Token Endpoint: `supabase/functions/gemini-voice-session/index.ts`

A lightweight edge function that:
- Authenticates the user (JWT)
- Checks voice entitlement (`canUse('voice_concierge')`)
- Returns the `GEMINI_API_KEY` and a pre-built system instruction with trip context
- The browser uses these to open a direct WebSocket to Gemini Live

### 2.2 Create Live Voice Hook: `src/hooks/useGeminiLive.ts`

Replaces `useWebSpeechVoice` for eligible users:
- Opens WebSocket to `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`
- Sends `BidiGenerateContentSetup` with model, system instruction (trip context), and voice config
- Captures microphone audio via `AudioWorklet`, streams PCM 16-bit 24kHz to Gemini
- Receives audio chunks from Gemini, plays via `AudioContext`
- Handles interruption (user speaking stops AI playback)
- States: `idle`, `connecting`, `listening`, `speaking`, `error`
- Falls back to `useWebSpeechVoice` if WebSocket fails or browser doesn't support AudioWorklet

### 2.3 Update `src/components/AIConciergeChat.tsx`

- Import `useGeminiLive` conditionally based on voice eligibility
- Add a voice mode toggle (text vs live voice)
- When in live voice mode, show a visual audio indicator instead of text input
- Live voice conversations are independent of text chat history (Gemini Live manages its own session)

### 2.4 Update Config

Add to `supabase/config.toml`:
```
[functions.gemini-voice-session]
verify_jwt = true
```

---

## Phase 3: Multimodal Support

### 3.1 Update Edge Function for Image Input

Extend `lovable-concierge` to accept `attachments` in the request body:
- Accept base64-encoded images (JPEG/PNG, max 4MB)
- Convert to Gemini's `inlineData` format within `contents`
- Gemini natively analyzes images -- no separate vision API needed

### 3.2 Update `src/features/chat/components/AiChatInput.tsx`

- Add an image attachment button (camera icon)
- Support file picker and camera capture (via Capacitor on mobile)
- Show thumbnail preview before sending
- Send base64 data alongside message text to the edge function

---

## Phase 4: System Prompt Enhancement

### 4.1 Update `buildSystemPrompt` in Edge Function

Add function calling instructions to the system prompt so Gemini knows when to use tools vs respond directly. Include the current date dynamically (already done). Add instructions for multimodal responses.

---

## Files Modified

| File | Change |
|------|--------|
| `src/services/channelService.ts` | Fix build error: cast `insertData` to `any` for `.insert()` |
| `supabase/functions/lovable-concierge/index.ts` | Replace Lovable Gateway with direct Gemini API; add function calling + Google Search grounding |
| `supabase/functions/gemini-voice-session/index.ts` | **NEW** -- Token + context endpoint for Live voice |
| `supabase/config.toml` | Add `gemini-voice-session` entry (already exists, verify) |
| `src/hooks/useGeminiLive.ts` | **NEW** -- Direct WebSocket to Gemini Live for bidirectional audio |
| `src/components/AIConciergeChat.tsx` | Integrate voice mode toggle, multimodal input, useGeminiLive |
| `src/features/chat/components/AiChatInput.tsx` | Add image attachment button |

## Implementation Order

1. Fix `channelService.ts` build error
2. Update `lovable-concierge` edge function (direct Gemini + function calling)
3. Create `gemini-voice-session` edge function
4. Create `useGeminiLive` hook
5. Update `AIConciergeChat` with voice toggle
6. Add multimodal image input to `AiChatInput`

## Secrets Required

- `GEMINI_API_KEY` -- Already configured
- `GOOGLE_MAPS_API_KEY` -- Already configured (for Places function calling)

No new secrets needed.

