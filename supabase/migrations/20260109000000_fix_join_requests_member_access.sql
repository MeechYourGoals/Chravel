-- Migration: Fix RLS policies for trip_join_requests to allow member access
-- Problem: Regular trip members couldn't see join requests for consumer trips
-- Solution: Allow ANY trip member to view requests for consumer trips,
--           while maintaining admin-only access for pro/event trips

-- ============================================================================
-- STEP 1: Drop existing restrictive SELECT policies
-- ============================================================================

-- Drop the policy that only allows admins to view requests
DROP POLICY IF EXISTS "Trip admins can view join requests" ON public.trip_join_requests;

-- Drop individual user view policy (we'll consolidate)
DROP POLICY IF EXISTS "Users can view their own join requests" ON public.trip_join_requests;

-- ============================================================================
-- STEP 2: Create new consolidated SELECT policy
-- Allows:
--   1. Users to view their own requests (any trip type)
--   2. Trip admins (creator + trip_admins) to view all requests (any trip type)
--   3. ANY trip member to view requests (consumer trips only)
-- ============================================================================

CREATE POLICY "Users and members can view join requests"
ON public.trip_join_requests
FOR SELECT
USING (
  -- Path 1: User can always view their own requests
  user_id = auth.uid()
  OR
  -- Path 2: Admin/member access based on trip type
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_join_requests.trip_id
    AND (
      -- Admin path: Creator can always view
      t.created_by = auth.uid()
      OR
      -- Admin path: Users in trip_admins can always view
      EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id AND ta.user_id = auth.uid()
      )
      OR
      -- Member path: Any trip member can view for consumer trips
      -- This enables the collaborative approval model for regular group trips
      (
        (t.trip_type IS NULL OR t.trip_type = 'consumer')
        AND EXISTS (
          SELECT 1 FROM public.trip_members tm
          WHERE tm.trip_id = t.id AND tm.user_id = auth.uid()
        )
      )
    )
  )
);

-- ============================================================================
-- STEP 3: Create/update UPDATE policy for approving/rejecting requests
-- Note: Actual approval happens via RPC functions with proper authorization,
--       but the RLS policy should reflect the same rules for consistency
-- ============================================================================

DROP POLICY IF EXISTS "Trip admins can update join requests" ON public.trip_join_requests;

CREATE POLICY "Authorized users can update join requests"
ON public.trip_join_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_join_requests.trip_id
    AND (
      -- Admin path: Creator can always update
      t.created_by = auth.uid()
      OR
      -- Admin path: Users in trip_admins can always update
      EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id AND ta.user_id = auth.uid()
      )
      OR
      -- Member path: Any trip member can update for consumer trips
      (
        (t.trip_type IS NULL OR t.trip_type = 'consumer')
        AND EXISTS (
          SELECT 1 FROM public.trip_members tm
          WHERE tm.trip_id = t.id AND tm.user_id = auth.uid()
        )
      )
    )
  )
);

-- ============================================================================
-- STEP 4: Create INSERT policy for creating join requests
-- Users can create their own join requests (handled by edge function with
-- service role, but RLS should allow it for safety)
-- ============================================================================

DROP POLICY IF EXISTS "Users can create join requests" ON public.trip_join_requests;

CREATE POLICY "Users can create their own join requests"
ON public.trip_join_requests
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

-- ============================================================================
-- STEP 5: Create DELETE policy for cleaning up requests
-- Only admins should be able to delete requests
-- ============================================================================

DROP POLICY IF EXISTS "Trip admins can delete join requests" ON public.trip_join_requests;

CREATE POLICY "Trip admins can delete join requests"
ON public.trip_join_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_join_requests.trip_id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id AND ta.user_id = auth.uid()
      )
    )
  )
);

-- ============================================================================
-- STEP 6: Add index to improve query performance for trip_type lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trips_trip_type
ON public.trips(trip_type);

-- ============================================================================
-- STEP 7: Update view to reflect new access patterns
-- ============================================================================

-- Recreate the valid_pending_join_requests view with updated comment
DROP VIEW IF EXISTS public.valid_pending_join_requests;

CREATE VIEW public.valid_pending_join_requests AS
SELECT
  tjr.id,
  tjr.trip_id,
  tjr.user_id,
  tjr.invite_code,
  tjr.status,
  tjr.requested_at,
  tjr.resolved_at,
  tjr.resolved_by,
  tjr.requester_name,
  tjr.requester_email,
  p.display_name,
  p.avatar_url,
  p.first_name,
  p.last_name
FROM public.trip_join_requests tjr
INNER JOIN public.profiles p ON p.user_id = tjr.user_id
INNER JOIN auth.users u ON u.id = tjr.user_id
WHERE tjr.status = 'pending';

GRANT SELECT ON public.valid_pending_join_requests TO authenticated;

COMMENT ON VIEW public.valid_pending_join_requests IS
'Pending join requests with valid user profiles. RLS policies control access:
- Consumer trips: Any trip member can view
- Pro/Event trips: Only admins can view';

-- ============================================================================
-- STEP 8: Add logging comment
-- ============================================================================

COMMENT ON POLICY "Users and members can view join requests" ON public.trip_join_requests IS
'Consolidated SELECT policy: Users see own requests, admins see all,
members see requests for consumer trips only. Pro/Event trips require admin access.';

COMMENT ON POLICY "Authorized users can update join requests" ON public.trip_join_requests IS
'UPDATE policy mirrors SELECT: admins can update any, members can update for consumer trips only.';
