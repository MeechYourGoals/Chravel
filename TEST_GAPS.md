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

## Integrations platform replay/idempotency coverage
- **Area:** `supabase/functions/gmail-import-worker/index.ts`, `supabase/functions/file-ai-parser/index.ts`, `supabase/functions/calendar-sync/index.ts`
- **Why this gap matters:** Integration retries and provider replays can silently duplicate or corrupt shared trip data.
- **Missing coverage:** No shared contract tests for idempotent reruns, out-of-order events, or partial import terminal states across provider pipelines.
- **Failure mode if untested:** Duplicate imports, stale sync state, and false-success UX after partial failures.
- **Suggested tests:** End-to-end integration suite with deterministic replay payloads, duplicate-run attempts, and partial-step failures asserting `completed_partial` semantics.
- **Priority:** high
- **Provenance:** March 2026 integrations/import-export audit

## Export completeness + authorization manifest tests
- **Area:** `supabase/functions/export-user-data/index.ts`, `supabase/functions/export-trip/index.ts`
- **Why this gap matters:** Exports are trust/privacy boundaries and can become compliance incidents when partial or over-scoped.
- **Missing coverage:** No manifest-based assertions for table completeness, mandatory-section failures, and per-role authorization boundaries.
- **Failure mode if untested:** Silent omissions presented as success, or unauthorized data leakage in generated export packages.
- **Suggested tests:** Integration tests validating manifest row counts, enforced auth checks, and blocked access for non-members/non-admins.
- **Priority:** high
- **Provenance:** March 2026 integrations/import-export audit
