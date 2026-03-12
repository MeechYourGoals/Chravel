---
name: chravel-gemini-live-debug
description: Debug and implement Gemini API and Gemini Live voice integration in Chravel. Use when working with AI concierge, Gemini Live sessions, function calling, multimodal content, or voice interaction. Triggers on "gemini", "AI concierge bug", "voice chat", "gemini live", "function calling", "google AI".
---

# Chravel Gemini Live Debug

Debug and implement Gemini API integrations in ChravelApp.

## Chravel Gemini Architecture

### Key Locations
- `src/lib/geminiLive/` — Gemini Live client, session management, audio processing
- `src/components/AIConciergeChat.tsx` — Main concierge UI (text + streaming)
- `src/features/chat/components/` — Chat rendering, grounding widgets
- `src/hooks/useAIConciergePreferences.ts` — Concierge preferences
- `src/types/ai.ts` — AI-related type definitions

### Voice Proxy Architecture
- `supabase/functions/gemini-voice-proxy/index.ts` — WebSocket proxy to Vertex AI Live API
- `supabase/functions/gemini-voice-session/index.ts` — Voice session management
- **Voice model**: `VERTEX_LIVE_MODEL` env var (default: `gemini-live-2.5-flash-native-audio`, GA)
  - The preview model (`gemini-live-2.5-flash-preview-native-audio-09-2025`) is deprecated
  - Model is now env-configurable — no code change needed for future model upgrades

### SDK & Models
- Concierge uses **raw HTTP fetch** to Gemini API (NOT `@google/genai` SDK)
- Text models: `gemini-3-flash-preview` (flash), `gemini-3.1-pro-preview` (pro)
- Voice model: `gemini-live-2.5-flash-native-audio` (GA, Vertex AI Live API)
- Legacy models (`gemini-2.5-*`, `gemini-2.0-*`, `gemini-1.5-*`) are deprecated
- `gemini-3-pro-preview` deprecated March 9, 2026 → routes to `gemini-3.1-pro-preview`

### Concierge Gemini Config
- **Thought signatures**: `thinkingConfig: { thinkingLevel }` in `generationConfig` (env: `ENABLE_THINKING_CONFIG`, default ON)
- **Streaming function args**: `toolConfig: { functionCallingConfig: { streamFunctionCallArguments: true } }` for trip queries
- **Combined grounding**: googleSearch + functionDeclarations as separate tool objects (env: `ENABLE_COMBINED_GROUNDING`, default OFF)
- **Maps grounding**: googleMaps tool (env: `ENABLE_MAPS_GROUNDING`, default OFF)

## Debug Protocol

### 1. Identify the Layer
- **SDK/API issue:** Wrong model name, auth failure, rate limit, malformed request
- **Session management:** WebSocket lifecycle, reconnection, state cleanup
- **Audio processing:** Microphone access, audio encoding/decoding, playback
- **Function calling:** Tool definition mismatch, response parsing, action execution
- **UI issue:** State not reflecting API response, loading states, error display
- **Grounding issue:** Combined tools 400 error, maps widget not rendering, missing context token

### 2. Common Issues
- Using deprecated model names → Use `gemini-3-flash-preview` or `gemini-3.1-pro-preview`
- Using deprecated SDK (`@google/generative-ai`) → Migrate to `@google/genai`
- Function call responses not parsed correctly → Check tool definition schema
- Audio session not cleaning up → Check WebSocket close handlers
- Concierge context not including trip data → Check context injection
- Combined grounding 400 error → googleSearch and functionDeclarations must be SEPARATE tool objects
- Maps widget not rendering → Check `googleMapsWidgetContextToken` in metadata, API key config
- Voice model error → Check `VERTEX_LIVE_MODEL` env var, model availability

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
- Voice model is env-configurable via `VERTEX_LIVE_MODEL` — do NOT hardcode
- API key isolation: `GEMINI_API_KEY` (server) must differ from `VITE_GOOGLE_MAPS_API_KEY` (client)
