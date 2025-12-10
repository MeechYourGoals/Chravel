-- ============================================
-- PENDING TRIP ACCESS FOR JOIN REQUESTS
-- ============================================
-- Allows users with pending join requests to view basic trip information
-- (name, destination, dates, cover image) for card display on home page
-- while still blocking access to trip content until approved

-- 1. Add policy for pending members to view trip preview data
DROP POLICY IF EXISTS "Pending members can view trip preview" ON public.trips;

CREATE POLICY "Pending members can view trip preview"
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

-- 3. Add index for trip_id lookups in join requests
CREATE INDEX IF NOT EXISTS idx_trip_join_requests_trip_user 
ON public.trip_join_requests(trip_id, user_id);

COMMENT ON POLICY "Pending members can view trip preview" ON public.trips IS 
'Allows users with pending join requests to view basic trip information (name, destination, dates, cover image) for card display. Full trip access is still restricted by RLS on trip_members table.';
