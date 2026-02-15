
# Activate Gemini Live Voice + Enrich Context Parity

## Summary

ElevenLabs is already fully removed from the codebase (confirmed zero references in `src/` and `supabase/`). No cleanup needed there.

The real work is activating the Gemini Live bidirectional voice and giving it the same rich context the text concierge has. Right now the voice button works but only does browser Speech-to-Text (transcribes your voice, sends text to the normal AI pipeline). The full Gemini Live WebSocket infrastructure (`useGeminiLive.ts` + `gemini-voice-session` edge function) is built but disconnected from the UI.

## Problem: Voice Session Context Gap

The `gemini-voice-session` edge function currently builds a minimal system instruction with only:
- Trip name, destination, dates
- 5 upcoming calendar events

The text-based `lovable-concierge` gets ALL of this via `TripContextBuilder` + `promptBuilder`:
- Broadcasts (with priority levels)
- Calendar events (with locations, descriptions)
- Polls (questions, options, votes)
- Tasks (assignees, due dates, status)
- Payments (who owes whom, amounts, methods)
- Chat messages (recent context)
- Places (trip basecamp, personal basecamp with coordinates)
- User preferences (dietary, vibe, budget, accessibility, time preference)
- Saved links
- RAG context from kb_chunks

## Implementation Plan

### Step 1: Enrich `gemini-voice-session` edge function with full trip context

Reuse the existing `TripContextBuilder` and `buildSystemPrompt` from `_shared/` to build the voice session's system instruction. This gives voice feature parity with text concierge.

Changes to `supabase/functions/gemini-voice-session/index.ts`:
- Import `TripContextBuilder` from `_shared/contextBuilder.ts`
- Import `buildSystemPrompt` from `_shared/promptBuilder.ts`
- Replace the manual trip query + minimal system instruction with `TripContextBuilder.buildContext()` + `buildSystemPrompt()`
- Fetch user preferences via `TripContextBuilder` (it already supports `userId`)
- Add voice-specific guidelines as an addendum to the full system prompt (keep responses conversational, no markdown, concise for spoken delivery)
- Include function declarations in the ephemeral token's `bidiGenerateContentSetup` so Gemini Live can call tools (addToCalendar, createTask, createPoll, searchPlaces, getPaymentSummary)
- Enable Google Search grounding in the setup for real-time queries

### Step 2: Wire `useGeminiLive` into `AIConciergeChat`

Currently `AIConciergeChat` uses `useWebSpeechVoice` (aliased as `useGeminiVoice`). Switch to `useGeminiLive` for eligible users while keeping `useWebSpeechVoice` as fallback for unsupported browsers.

Changes to `src/components/AIConciergeChat.tsx`:
- Import `useGeminiLive` alongside the existing `useWebSpeechVoice`
- Use `useGeminiLive` when the browser supports WebSocket + AudioContext and user is voice-eligible
- Fall back to `useWebSpeechVoice` when Gemini Live is not supported
- Route `onTranscript` callbacks from Gemini Live to display AI spoken responses as chat messages
- Map Gemini Live states (`idle`, `connecting`, `listening`, `speaking`, `error`) to the existing `VoiceState` type so the `VoiceButton` component works without changes

### Step 3: Handle Gemini Live tool execution results in the client

When Gemini Live calls a function (e.g., addToCalendar), the client-side WebSocket handler in `useGeminiLive` needs to:
- Detect `toolCall` messages from the WebSocket
- Execute them via a callback (or send results back to the WebSocket)
- Display confirmation in the chat

Changes to `src/hooks/useGeminiLive.ts`:
- Add `onToolCall` callback option for function calling responses
- Parse `toolCall` messages from the Gemini Live WebSocket protocol
- Send `toolResponse` back through the WebSocket so Gemini can continue the conversation

### Step 4: Update VoiceButton states for Gemini Live

The existing `VoiceButton` component already supports all needed states (`idle`, `connecting`, `listening`, `speaking`, `error`). No changes needed to the button itself -- just ensure the state mapping is correct.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/gemini-voice-session/index.ts` | Use TripContextBuilder + buildSystemPrompt for full context, add function declarations and grounding to ephemeral token setup |
| `src/components/AIConciergeChat.tsx` | Wire useGeminiLive as primary voice with useWebSpeechVoice fallback |
| `src/hooks/useGeminiLive.ts` | Add tool call handling, onToolCall callback |

## What This Achieves

After implementation, the voice concierge will:
- Have full awareness of broadcasts, calendar, polls, payments, tasks, chat, places, and basecamps
- Filter recommendations by user preferences (dietary, vibe, budget, accessibility)
- Execute real actions (add calendar events, create tasks/polls, search places)
- Use Google Search grounding for real-time queries (scores, weather, news)
- Speak responses back via bidirectional audio (not just transcribe-and-type)
- Fall back gracefully to browser Speech-to-Text on unsupported browsers

## Technical Notes

- The ephemeral token approach (already implemented) keeps the GEMINI_API_KEY server-side -- only a scoped, short-lived token reaches the client
- The system prompt for voice will be the same rich prompt as text, with an addendum for spoken delivery style (no markdown, concise, conversational)
- Voice entitlement checks are already implemented in the edge function (`canUseVoiceConcierge`)
- The `VoiceButton` UI component needs zero changes
