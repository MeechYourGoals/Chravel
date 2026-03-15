

# Invite Flow Hardening Plan

Based on Claude's audit from the `fix-invite-join-flows` branch, here are the actionable changes needed in the current codebase. I've excluded items already handled or targeting dead code.

## Changes

### 1. Auth Handoff: sessionStorage → localStorage
**Files:** `src/pages/JoinTrip.tsx`, `src/pages/AuthPage.tsx`

Currently the invite code is stored in `sessionStorage`, which doesn't survive OAuth redirects or tab switches. Switch all `sessionStorage` references for `INVITE_CODE_STORAGE_KEY` to `localStorage`.

### 2. OAuth Redirect URLs: Include invite query param
**File:** `src/pages/JoinTrip.tsx`

When redirecting to `/auth`, append `&invite={token}` as a fallback so the invite code survives even if localStorage is cleared.

### 3. AuthPage: Restore invite context
**File:** `src/pages/AuthPage.tsx`

On mount, check for `invite` query param. If present and user just authenticated, restore the invite code to localStorage and redirect to `/join/{code}`.

### 4. Triple-source invite code restoration on JoinTrip mount
**File:** `src/pages/JoinTrip.tsx`

On mount, resolve the invite code from three sources (priority order):
1. URL param (`:token`)
2. `localStorage` (`INVITE_CODE_STORAGE_KEY`)
3. `invite` query param

If the URL param is missing but another source has the code, redirect to `/join/{code}`.

### 5. Auto-join retry: Set ref only on success
**File:** `src/pages/JoinTrip.tsx`

Currently `autoJoinAttemptedRef.current = true` is set before calling `handleJoinTrip()`. Move it to only be set on successful completion, so transient failures allow a retry.

### 6. OG Preview: Return 404 for invalid invites
**File:** `supabase/functions/generate-invite-preview/index.ts`

When an invite code is not found in the database, return HTTP 404 (not 200) with `noindex, nofollow` and `no-cache` headers. This prevents social platforms from caching stale "You're Invited!" metadata for broken links.

### 7. Post-join query invalidation and cleanup
**File:** `src/pages/JoinTrip.tsx`

After a successful join (all paths: approval, already_member, direct):
- Invalidate `['trips']`, `['trip', tripId]`, and `['trip-members', tripId]` queries
- Remove invite code from localStorage

### 8. current_uses increment in join-trip
**File:** `supabase/functions/join-trip/index.ts`

After successfully creating a join request, increment `current_uses` on the `trip_invites` row with optimistic concurrency (only increment if current value matches what we read).

### 9. Database: Unique constraint verification
Run a check (read query) to confirm `trip_members(trip_id, user_id)` unique constraint exists. If not, add it via migration. Based on the audit, it likely already exists.

---

## Not Included (already handled or dead code)
- `approve-join-request` edge function fixes (dead code — frontend uses the DB RPC)
- `trip_join_requests` unique constraint (defensive, lower priority)
- Batch approval UI, bulk invite, observability dashboards (future features)

