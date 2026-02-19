
# Deep Audit Fix: Auth Cascade Failure, 0 Members, Slow Loading, Connection Disconnects

## Root Cause Analysis

There are 3 interconnected root causes creating a cascading failure across the entire app:

### Root Cause 1: `profiles.real_name` and `profiles.name_preference` columns do not exist in the database

The `useAuth.tsx` profile fetch (line 192) queries for `real_name` and `name_preference`, but these columns were never added to the `profiles` table. The Postgres logs confirm repeated `column profiles.real_name does not exist` errors.

**Cascade effect:**
- Profile fetch fails with a non-PGRST116 error
- `fetchUserProfile()` returns `null`
- `transformUser()` runs with no profile data
- Auth state becomes partially broken (user object missing profile fields)
- All RLS-gated queries (trip_members, payments, polls, tasks, etc.) either fail silently or return empty results
- Trip Members shows "0 Chravelers" even though the DB has members (e.g., "Nard" trip has 4 members, "Netflix" trip has 1)
- Payments tab hangs on "Loading..." because it can't resolve member profiles
- Polls and Tasks fail to load because they depend on authenticated member context

### Root Cause 2: `trip_members.status` column does not exist

The Postgres logs show dozens of `column trip_members.status does not exist` errors. While the previous fix changed the `.select('status')` to `.select('*')` and used `as any`, other code paths or the `ensure_creator_is_member` trigger flow may still reference it. The `tripService.ts` line 671 checks `membershipData.status` which will always be `undefined` (since the column doesn't exist), but due to the `as any` cast and null-coalescing logic, this particular path works. However, any other code querying `status` directly will fail.

### Root Cause 3: Too many Supabase Realtime channels (35+ per trip)

Opening a single trip creates 20-35 simultaneous WebSocket channel subscriptions (chat, reactions, threads, media, payments, polls, tasks, calendar, basecamps, presence, read receipts, typing indicators, join requests, admins, members, etc.). Supabase has a default limit of ~100 concurrent connections per project. With even 3-4 users browsing trips, the limit is exceeded, causing:
- "Connection disconnected" toast messages
- Realtime subscriptions silently failing
- Channels competing for slots, leading to dropped connections
- Slow reconnection loops consuming bandwidth

---

## Fix Plan

### Fix 1: Add missing `real_name` and `name_preference` columns to `profiles` table (SQL migration)

```sql
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS real_name text,
  ADD COLUMN IF NOT EXISTS name_preference text DEFAULT 'display';
```

This is the single most impactful fix. Once these columns exist, the profile fetch succeeds, auth hydrates properly, and all downstream RLS-gated queries start working again.

Also update the `profiles_public` view to include `real_name` and `name_preference` so the resolved_display_name formula can use them.

### Fix 2: Add fallback in `useAuth.tsx` profile fetch

Even after adding the columns, add a defensive fallback so future schema drift doesn't break auth again:

In `fetchUserProfile()`, if the full select fails, retry with a minimal select (`user_id, display_name, email, avatar_url, first_name, last_name`). This matches the architecture memory note about "profile-fetching-resilience."

### Fix 3: Guarantee minimum 1 member (creator) in trip detail display

In `MobileTripDetail.tsx` line 526 and the Trip Members modal, enforce that `participants.length` is always at least 1 when the trip has a `created_by` field. Change the display logic:

```
{Math.max(tripWithUpdatedDescription.participants.length, 1)} Chravelers
```

And in the `useTripDetailData` hook, if `membersQuery` returns empty but the trip has a `created_by`, synthesize a minimum creator member.

### Fix 4: Consolidate Supabase Realtime channels

This is the biggest performance win. Instead of 20-35 individual channels per trip, consolidate into 2-3 multiplexed channels:

**Channel 1: `trip_data:{tripId}`** -- Listens to: `trip_members`, `trip_events`, `trip_tasks`, `trip_polls`, `trip_payment_messages`, `payment_splits`, `trip_media`

**Channel 2: `trip_chat:{tripId}`** -- Listens to: `chat_messages`, `message_reactions`, `message_read_receipts`

**Channel 3: `trip_presence:{tripId}`** -- Presence channel for typing indicators and online status

This reduces connections from ~30 per trip to 3 per trip, a 10x reduction. Implementation:
- Create `src/hooks/useTripRealtimeHub.ts` that opens these 3 channels and dispatches events to subscribers
- Refactor existing hooks to subscribe to the hub instead of opening their own channels
- Add connection health monitoring with automatic reconnect

### Fix 5: Add explicit timeouts to tab content loading

Per the architecture memory notes, add explicit timeouts:
- Payments: 10s timeout with fallback "Unable to load payments" message
- Places: 8s timeout with "Retry" button
- Polls/Tasks: 8s timeout with empty state
- Concierge: 8s timeout with error message and retry

---

## Implementation Order

1. **SQL Migration** -- Add `real_name` and `name_preference` columns (instant fix for auth cascade)
2. **useAuth.tsx fallback** -- Defensive resilience for future schema changes
3. **Member count guarantee** -- Never show "0 Chravelers"
4. **Realtime consolidation** -- Fix "connection disconnected" and slow loading
5. **Tab timeouts** -- Prevent infinite spinners

## Technical Details

### Files to modify:
- `src/hooks/useAuth.tsx` -- Add fallback select
- `src/pages/MobileTripDetail.tsx` -- Fix Chravelers count display
- `src/hooks/useTripDetailData.ts` -- Guarantee minimum creator member
- New: `src/hooks/useTripRealtimeHub.ts` -- Consolidated realtime channels
- Multiple hooks (usePayments, useTripTasks, useTripPolls, useUnreadCounts, etc.) -- Refactor to use hub
- SQL migration for `profiles` table

### Database changes:
- Add `real_name TEXT` column to `profiles`
- Add `name_preference TEXT DEFAULT 'display'` column to `profiles`
- Update `profiles_public` view to include these columns in `resolved_display_name` formula
