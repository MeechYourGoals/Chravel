---
name: chravel-ai-concierge
description: Implement and debug the Chravel AI Concierge feature — the AI travel assistant that helps with trip planning, recommendations, and coordination. Use when building concierge features, adding tool actions, or debugging AI responses. Triggers on "AI concierge", "concierge feature", "trip assistant", "AI recommendation", "concierge tool".
---

# Chravel AI Concierge Implementation

The AI Concierge is Chravel's AI travel assistant. It helps users plan trips, find places, coordinate with group members, and manage trip logistics.

## Architecture

### Components
- `src/components/ai/` — Concierge UI (chat interface, suggestion cards, action confirmations)
- `src/hooks/useAIConciergePreferences.ts` — User preferences for concierge behavior

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
