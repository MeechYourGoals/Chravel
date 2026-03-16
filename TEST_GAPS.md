# Test Gaps

> Track meaningful missing coverage discovered during debugging and implementation.
> Prioritize gaps that protect critical paths.

---

## Chat reconnect backfill correctness
- **Area:** `src/features/chat/hooks/useTripChat.ts`
- **Why this gap matters:** Messages lost during websocket drops are the most common chat reliability issue for mobile users
- **Missing coverage:** No test for backfill fetch on channel reconnect or visibilitychange
- **Failure mode if untested:** Backfill could silently fail, fetch duplicates, or miss edge cases (empty gap, >100 messages in gap, encrypted messages)
- **Suggested tests:** Mock Supabase channel status change to SUBSCRIBED (after CHANNEL_ERROR), verify gap messages are fetched and merged without duplicates
- **Priority:** high
- **Provenance:** March 2026 chat reliability audit

## Chat read receipt debounce and incremental marking
- **Area:** `src/features/chat/components/TripChat.tsx`
- **Why this gap matters:** Read receipt storms caused N×M DB writes per new message
- **Missing coverage:** No test that only new messages are marked as read, and that the 1s debounce batches correctly
- **Failure mode if untested:** Regression to marking all messages on every INSERT; debounce timer not cleared on unmount causing memory leak
- **Suggested tests:** Render TripChat, simulate 5 rapid message arrivals, verify markMessagesAsRead called once with only the new IDs (not all visible)
- **Priority:** medium
- **Provenance:** March 2026 chat reliability audit

## Chat client_message_id always set on online sends
- **Area:** `src/features/chat/hooks/useTripChat.ts`
- **Why this gap matters:** Idempotent sends prevent duplicate messages on network retries
- **Missing coverage:** No test verifying client_message_id is present in online (non-offline) message payloads
- **Failure mode if untested:** Regression could remove client_message_id from online sends, losing retry safety
- **Suggested tests:** Mock sendChatMessage, call sendMessageAsync, verify messageData includes a valid UUID client_message_id
- **Priority:** medium
- **Provenance:** March 2026 chat reliability audit

## Chat reaction incremental updates vs full refetch
- **Area:** `src/features/chat/components/TripChat.tsx`
- **Why this gap matters:** Full reaction refetch on every message caused O(N) queries
- **Missing coverage:** No test that reactions are only fetched once and subsequent updates come from realtime
- **Failure mode if untested:** Regression to refetching all reactions on every new message
- **Suggested tests:** Render TripChat, simulate 3 messages arriving, verify getMessagesReactions called exactly once (initial), not on subsequent INSERTs
- **Priority:** low
- **Provenance:** March 2026 chat reliability audit

## Migration compatibility window regression suite
- **Area:** `supabase/migrations/` + app DB access layer
- **Why this gap matters:** Current migration history shows repeated modification of high-risk tables and policies; without compatibility testing, rolling deploy windows can break old/new app versions.
- **Missing coverage:** No automated CI test that validates both old-app/new-schema and new-app/old-schema compatibility for one deploy window.
- **Failure mode if untested:** Runtime failures during phased rollout, policy mismatches, or enum/state parsing regressions after migration apply.
- **Suggested tests:** CI job that boots previous app build against latest schema, and current app build against prior schema snapshot; verify critical CRUD/auth paths.
- **Priority:** high
- **Provenance:** 2026-03 data evolution hardening audit
