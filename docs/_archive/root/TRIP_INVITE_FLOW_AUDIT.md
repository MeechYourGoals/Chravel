# Trip Invite Flow Audit & Implementation

## AUDIT FINDINGS

| Component | Location | Current State | Gap Analysis |
|-----------|----------|---------------|--------------|
| **Invite link generation** | `src/hooks/useInviteLink.ts` | ✅ Working | Generates branded `chravel.app/join/[code]` links correctly |
| **Route handler (/join/[code])** | `src/pages/JoinTrip.tsx` | ✅ Working | Handles auth redirect, shows preview, creates join requests |
| **Auth redirect preservation** | `src/pages/JoinTrip.tsx:35` | ✅ Working | Uses `sessionStorage` to preserve invite code through auth flow |
| **trip_join_requests table** | `supabase/migrations/20251008191413_*.sql` | ✅ Working | Schema exists with `status: pending|approved|rejected` |
| **RLS policies for pending members** | `supabase/migrations/20251113165330_*.sql` | ⚠️ Partial | Users can view own requests, but cannot see trip details until approved |
| **Approval request creation** | `supabase/functions/join-trip/index.ts:175` | ✅ Working | Creates join request with `status: 'pending'` |
| **Admin notification system** | `supabase/functions/join-trip/index.ts:227` | ✅ Working | Creates notification for trip creator |
| **Pending state UI rendering** | `src/pages/Index.tsx` | ❌ **BROKEN** | No pending trips displayed on home page |
| **Approval action handlers** | `supabase/functions/approve-join-request/index.ts` | ✅ Working | Updates status and adds to trip_members on approve |
| **Pending trip card component** | N/A | ❌ **MISSING** | No component to show grayed-out pending trips |
| **useTrips hook** | `src/hooks/useTrips.ts` | ❌ **BROKEN** | Only fetches trips where user is creator, not pending member |
| **Realtime updates** | N/A | ❌ **MISSING** | No subscription for status changes (pending → approved) |

## CRITICAL GAPS

1. **Pending trips don't appear on home page** - Users who submit join requests never see the trip card
2. **No pending trip UI** - Missing grayed-out card with "Pending Approval" badge
3. **useTrips doesn't fetch pending trips** - Only queries `trips.created_by = user.id`, not `trip_join_requests.user_id = user.id`
4. **No realtime status updates** - When admin approves, user doesn't see card become active without refresh
5. **RLS may block trip details** - Pending members might not be able to read trip data for card display

## DATABASE CHANGES

### Migration: Add Pending Trip Access

```sql
-- File: supabase/migrations/20250131_add_pending_trip_access.sql

-- 1. Ensure users can view trip details for trips they have pending requests
-- This allows pending members to see trip name, destination, dates, cover image for card display
CREATE POLICY IF NOT EXISTS "Pending members can view trip preview"
ON public.trips
FOR SELECT
USING (
  -- User is creator
  created_by = auth.uid()
  OR
  -- User is approved member
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trips.id
    AND tm.user_id = auth.uid()
  )
  OR
  -- User has pending join request (for card preview only)
  EXISTS (
    SELECT 1 FROM public.trip_join_requests tjr
    WHERE tjr.trip_id = trips.id
    AND tjr.user_id = auth.uid()
    AND tjr.status = 'pending'
  )
);

-- 2. Add index for faster pending request lookups
CREATE INDEX IF NOT EXISTS idx_trip_join_requests_user_status 
ON public.trip_join_requests(user_id, status) 
WHERE status = 'pending';

-- 3. Ensure RLS allows users to view their own pending requests (already exists, but verify)
-- Policy "Users can view their own join requests" should already exist from migration 20251008191413
```

## RLS POLICY SPECIFICATIONS

### Current Policies (Working)
- ✅ Users can view their own join requests (`trip_join_requests.user_id = auth.uid()`)
- ✅ Trip admins can view all pending requests for their trips
- ✅ Trip admins can update status (approve/reject)

### Missing Policies (To Add)
- ❌ Pending members can view trip preview data (name, destination, dates, cover_image_url)
- ❌ Pending members CANNOT access trip content (chat, calendar, media, etc.) until approved

**Solution:** The migration above adds a SELECT policy on `trips` that allows pending members to read basic trip info for card display, but RLS on other tables (trip_chat, trip_calendar, etc.) will still block access until they're in `trip_members`.

## IMPLEMENTATION PLAN

### Step 1: Update Database RLS (Migration)
**File:** `supabase/migrations/20250131_add_pending_trip_access.sql`
- Add policy for pending members to view trip preview
- Add index for performance

### Step 2: Extend Trip Service to Fetch Pending Trips
**File:** `src/services/tripService.ts`
- Modify `getUserTrips()` to also fetch trips from `trip_join_requests` where `status = 'pending'`
- Mark these trips with `membership_status: 'pending'` property

### Step 3: Create PendingTripCard Component
**File:** `src/components/PendingTripCard.tsx`
- Grayed-out UI with reduced opacity
- "Pending Approval" badge
- Non-clickable (or clickable but shows "Waiting for approval" message)

### Step 4: Update Home Page to Render Pending Trips
**File:** `src/pages/Index.tsx`
- Separate pending trips from active trips
- Render `PendingTripCard` for pending trips
- Render regular `TripCard` for active trips

### Step 5: Add Realtime Subscription
**File:** `src/hooks/useTrips.ts` or new `src/hooks/usePendingTrips.ts`
- Subscribe to `trip_join_requests` changes
- When status changes from `pending` → `approved`, refetch trips
- When status changes from `pending` → `rejected`, remove from list

### Step 6: Update JoinTrip Redirect
**File:** `src/pages/JoinTrip.tsx`
- After creating pending request, redirect to home (`/`) instead of trip page
- Show success message: "Request submitted! You'll see the trip on your home page once approved."

## EDGE CASES TO HANDLE

1. ✅ **Expired invite link** - Already handled in `get-invite-preview` edge function
2. ✅ **User already member** - Already handled in `join-trip` edge function (returns `already_member: true`)
3. ⚠️ **User has pending request, clicks same link** - Currently creates duplicate (UNIQUE constraint prevents, but should show existing request)
4. ⚠️ **Admin denies, user tries again** - Should allow new request (delete old rejected request or allow new one)
5. ✅ **Invite for deleted trip** - Already handled (returns 404)
6. ⚠️ **Rate limiting** - Not implemented (could add per-user, per-trip rate limit)

## TESTING CHECKLIST

- [ ] Unauthenticated user clicks invite → signs up → lands on home with pending trip card
- [ ] Authenticated user clicks invite → immediate pending trip card on home
- [ ] Pending card renders grayed out with "Pending Approval" badge
- [ ] Pending card is non-clickable (or shows message on click)
- [ ] Trip admin sees pending request in trip settings
- [ ] Admin approve action → member's card becomes active (real-time)
- [ ] Admin deny action → member's card removed or shows denial state
- [ ] All flows work for `trip_type: 'consumer' | 'pro' | 'event'`
- [ ] RLS prevents pending users from accessing trip content
- [ ] Mobile PWA deep link handling works correctly
- [ ] Realtime updates work without page refresh

## KNOWN RISKS / EDGE CASES

1. **RLS Performance**: Adding OR condition to trips SELECT policy may slow queries. Mitigation: Index on `trip_join_requests(user_id, status)`.
2. **Duplicate Requests**: UNIQUE constraint on `(trip_id, user_id)` prevents duplicates, but UI should show existing request instead of error.
3. **Rejected Requests**: Currently, rejected requests stay in table. Should we allow re-requesting? Recommendation: Delete rejected requests after 7 days or allow new request.
4. **Rate Limiting**: No protection against spam requests. Future: Add per-user, per-trip rate limit (max 3 requests per 24 hours).
