

# Fix: AI Concierge "Offline" Toast + Placeholder Text + Trip Context Capabilities

## Problem 1: False "AI Concierge Offline" Toast

**Root Cause**: On app startup, `AppInitializer` runs `apiHealthCheck.checkConciergeHealth()`, which invokes `lovable-concierge` with a `{ message: 'ping' }` POST. If the edge function has a cold start, network hiccup, or any transient error, the health check marks the service as "offline" and fires a destructive red toast: "AI Concierge Offline -- Attempting to reconnect automatically..."

This is a false alarm. The concierge is a cloud service backed by Gemini -- it is never truly "offline." Cold starts, transient 5xx responses, and network delays do not mean the service is down. Showing a destructive toast for a startup ping is alarmist and misleading.

**Fix**: Remove the destructive "offline" toast entirely from `useApiHealth.tsx`. The health check can still run in the background for logging/metrics, but it should never show a red toast to users. If the concierge truly fails when the user sends a message, the chat component already handles that error inline with a retry mechanism -- that is the right place for error feedback, not a startup ping.

Changes:
- **`src/hooks/useApiHealth.tsx`**: Remove the `toast()` calls for concierge offline status (lines 35-41). Keep the health check logic for internal monitoring but suppress user-facing toasts. Also remove the periodic polling toast notifications for status changes.

## Problem 2: Placeholder Text Still Says "Ask me anything about your trip"

**Root Cause**: The empty state in `AIConciergeChat.tsx` (line 575) still reads "Ask me anything about your trip:" -- this was supposed to be updated when the AI scope was loosened to handle general travel questions. The input placeholder (line 609ish) was updated to "Ask me anything about travel..." but the empty state heading was missed.

**Fix**: Update the empty state copy in `AIConciergeChat.tsx` to match the broadened scope:
- Change "Ask me anything about your trip:" to "Ask me anything about travel:"
- The example questions are good and should stay -- they demonstrate trip-context capabilities
- Add one general travel example to show the broader scope

Changes:
- **`src/components/AIConciergeChat.tsx`**: Update line 575 from "Ask me anything about your trip:" to "Ask me anything about travel:"

## Problem 3: Ensuring Trip Context Questions Actually Work

**Current State**: The backend infrastructure is already solid. The `contextBuilder.ts` fetches calendar events (`trip_events`), tasks (`trip_tasks`), payments (`trip_payment_messages`), polls (`trip_polls`), broadcasts, messages, and places. The system prompt explicitly instructs the AI to answer calendar, task, and payment questions. The RAG pipeline (hybrid search with embeddings) also retrieves relevant context.

**Verification**: No code changes needed here. The `TripContextBuilder` already:
- Fetches ALL calendar events from `trip_events` (line 348-370)
- Fetches ALL tasks from `trip_tasks` with assignee names (line 372-391)
- Fetches ALL payments from `trip_payment_messages` with payer names (line 394-414)
- Fetches polls, broadcasts, messages, places, and user preferences

The system prompt (line 741-833) explicitly instructs the AI to answer these questions with source citations. The example questions listed in the empty state are fully supported by the existing context pipeline.

## Also: PlusUpgrade.tsx Placeholder

The `PlusUpgrade.tsx` component (shown to free users who hit their limit) also has a hardcoded "Ask me anything about your trip..." placeholder. This should match the new wording.

Changes:
- **`src/features/chat/components/PlusUpgrade.tsx`**: Update placeholder from "Ask me anything about your trip..." to "Ask me anything about travel..."

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useApiHealth.tsx` | Remove destructive toast notifications for offline services; keep health checks for internal monitoring only |
| `src/components/AIConciergeChat.tsx` | Update empty state copy from "your trip" to "travel" |
| `src/features/chat/components/PlusUpgrade.tsx` | Update placeholder text to match |

## Why This Prevents Recurrence

- The "offline" toast is removed at the source -- no health check failure will ever produce a user-facing red toast again
- Error handling for actual AI failures remains in the chat component where it belongs (inline retry, not a global toast)
- The placeholder text is updated in both locations where it appears

