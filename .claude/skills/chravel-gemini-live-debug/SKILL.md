---
name: chravel-gemini-live-debug
description: Debug and implement Gemini API and Gemini Live voice integration in Chravel. Use when working with AI concierge, Gemini Live sessions, function calling, multimodal content, or voice interaction. Triggers on "gemini", "AI concierge bug", "voice chat", "gemini live", "function calling", "google AI".
---

# Chravel Gemini Live Debug

Debug and implement Gemini API integrations in ChravelApp.

## Chravel Gemini Architecture

### Key Locations
- `src/lib/geminiLive/` — Gemini Live client, session management, audio processing
- `src/components/ai/` — AI concierge UI components
- `src/hooks/useAIConciergePreferences.ts` — Concierge preferences
- `src/types/ai.ts` — AI-related type definitions

### SDK
- Package: `@google/genai` (NOT the deprecated `@google/generative-ai`)
- Current models: `gemini-3-pro-preview`, `gemini-3-flash-preview`
- Legacy models (`gemini-2.5-*`, `gemini-2.0-*`, `gemini-1.5-*`) are deprecated

### Integration Points
- Text chat via AI Concierge
- Voice interaction via Gemini Live
- Function calling for trip actions (create events, add places, etc.)
- Structured output for parsed responses
- Multimodal input (images, documents)

## Debug Protocol

### 1. Identify the Layer
- **SDK/API issue:** Wrong model name, auth failure, rate limit, malformed request
- **Session management:** WebSocket lifecycle, reconnection, state cleanup
- **Audio processing:** Microphone access, audio encoding/decoding, playback
- **Function calling:** Tool definition mismatch, response parsing, action execution
- **UI issue:** State not reflecting API response, loading states, error display

### 2. Common Issues
- Using deprecated model names → Use `gemini-3-*-preview`
- Using deprecated SDK (`@google/generative-ai`) → Migrate to `@google/genai`
- Function call responses not parsed correctly → Check tool definition schema
- Audio session not cleaning up → Check WebSocket close handlers
- Concierge context not including trip data → Check context injection

### 3. API Reference
When debugging API issues, fetch the official spec:
- Discovery spec: `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta`
- Docs index: `https://ai.google.dev/gemini-api/docs/llms.txt`

## Rules

- Always use v1beta unless explicitly pinned to v1
- Clean up WebSocket connections on unmount
- Handle API errors gracefully — show user-friendly messages
- Function calling tools must match the exact schema the model expects
- Test voice features on actual mobile devices, not just desktop
