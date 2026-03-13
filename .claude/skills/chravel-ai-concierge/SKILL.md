---
name: chravel-ai-concierge
description: Implement and debug the Chravel AI Concierge feature — the AI travel assistant that helps with trip planning, recommendations, and coordination. Use when building concierge features, adding tool actions, or debugging AI responses. Triggers on "AI concierge", "concierge feature", "trip assistant", "AI recommendation", "concierge tool".
---

# Chravel AI Concierge Implementation

The AI Concierge is Chravel's AI travel assistant. It helps users plan trips, find places, coordinate with group members, and manage trip logistics.

## Architecture

### Components
- `src/components/AIConciergeChat.tsx` — Main concierge chat UI (SSE streaming, metadata handling)
- `src/services/conciergeGateway.ts` — Client gateway (SSE stream parsing, type-safe metadata events)
- `src/features/chat/components/` — Chat rendering (MessageBubble, ChatMessages, GroundingCitationCard, GoogleMapsWidget)
- `src/hooks/useAIConciergePreferences.ts` — User preferences for concierge behavior
- `src/hooks/useConciergeHistory.ts` — Chat history persistence and restoration
- `src/store/conciergeSessionStore.ts` — Session state (messages, metadata, grounding data)
- `src/types/grounding.ts` — Grounding type definitions

### Backend (Edge Functions)
- `supabase/functions/lovable-concierge/index.ts` — Main concierge edge function (Gemini API calls, streaming, tool execution)
- `supabase/functions/_shared/gemini.ts` — Model alias table (`gemini-3-flash-preview`, `gemini-3.1-pro-preview`)
- `supabase/functions/_shared/promptBuilder.ts` — PLAN→EXECUTE→RESPOND system prompt construction
- `supabase/functions/_shared/functionExecutor.ts` — 40+ tool implementations
- `supabase/functions/_shared/security/toolRouter.ts` — Capability token enforcement
- `supabase/functions/_shared/aiUtils.ts` — Query complexity analysis, model selection

### Gemini Config (production)
The concierge uses raw HTTP fetch to Gemini API (NOT `@google/genai` SDK). Key config:
- **Thought signatures**: `thinkingConfig: { thinkingLevel }` in `generationConfig` (env: `ENABLE_THINKING_CONFIG`, default ON)
- **Streaming function args**: `toolConfig: { functionCallingConfig: { streamFunctionCallArguments: true } }` for trip queries
- **Combined grounding**: `googleSearch` + `functionDeclarations` as separate tool objects (env: `ENABLE_COMBINED_GROUNDING`, default OFF)
- **Maps grounding**: `googleMaps` tool (env: `ENABLE_MAPS_GROUNDING`, default OFF, Gemini 2.5 models only)
- **API key isolation**: Server-side `GEMINI_API_KEY` validated against client-side `VITE_GOOGLE_MAPS_API_KEY`

### Capabilities
The concierge can:
- Answer questions about the trip (dates, members, itinerary)
- Recommend places, restaurants, activities
- Create events on the calendar
- Add places to the trip
- Create tasks and polls for group decisions
- Import data via Smart Import
- Provide PDF trip recaps

### Tool Calling
The concierge uses Gemini function calling to execute actions:
- Each tool has a defined schema (name, description, parameters)
- Tools are read-only (queries) or write (mutations)
- Write tools require confirmation before execution
- Tool results must be verified against actual database state

## Implementation Rules

### 1. Confirmation UX
- Read-only tools (search, lookup): No confirmation needed
- Write tools (create event, add place): Show confirmation card BEFORE executing
- Destructive tools (delete, remove): Require explicit user confirmation
- Multi-item actions: Show summary before executing

### 2. Context Injection
- Include trip context (name, dates, members, existing itinerary) in system prompt
- Include user preferences from `useAIConciergePreferences`
- Do NOT include sensitive data (payment info, private messages)

### 3. Response Quality
- Concierge responses should be conversational but actionable
- Include structured data (cards, lists) for recommendations
- Show evidence for claims (ratings, reviews, distances)
- Never fabricate trip data — always query real state

### 4. Error Handling
- API failures: Show friendly retry message
- Tool failures: Explain what went wrong, offer alternatives
- Rate limits: Queue requests, show typing indicator
- Missing context: Ask clarifying questions instead of guessing

### 5. State Sync
- After write tools execute, invalidate relevant TanStack Query caches
- Newly created items must appear in the UI immediately
- Optimistic updates with rollback on failure
