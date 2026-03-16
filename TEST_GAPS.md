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

## Frontend runtime performance regression suite (missing)
- **Area:** app-wide (`src/main.tsx`, `src/App.tsx`, `src/components/media/MediaGrid.tsx`, `src/features/chat/components/ChatMessages.tsx`, `src/hooks/useUnreadCounts.ts`)
- **Why this gap matters:** Runtime regressions currently slip because there are no release-blocking budgets/tests for startup, rerenders, list scaling, resume cost, or memory growth.
- **Missing coverage:** No CI gate for bundle budgets, no interaction-latency checks, no memory-growth scenarios, no list virtualization thresholds enforcement.
- **Failure mode if untested:** App appears fine in small demos but degrades under long chat/media sessions, mobile resume, and realtime update bursts.
- **Suggested tests:**
  - Route interactive timing tests on throttled profiles
  - Rerender scope tests for localized updates
  - Large-list virtualization tests (>500 messages/media items)
  - Background/resume freeze-time and subscription duplication tests
  - Bundle budget checks per route chunk in CI
- **Priority:** high
- **Provenance:** March 2026 frontend runtime constitution audit
