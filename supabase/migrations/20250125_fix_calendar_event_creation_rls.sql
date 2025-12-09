-- Fix calendar event creation RLS issue
-- 
-- ROOT CAUSE ANALYSIS:
-- The INSERT policy on trip_events (created in 20251209052538) checks if user is trip creator via:
--   EXISTS (SELECT 1 FROM trips WHERE created_by = auth.uid())
-- But this SELECT on trips table requires the user to have SELECT permission on trips.
-- If the user is a trip creator but NOT in trip_members, they may not have SELECT permission,
-- causing the INSERT to fail even though they should be allowed to create events.
--
-- SOLUTION:
-- 1. Ensure trip creators can SELECT their own trips (even if not in trip_members)
-- 2. Ensure the trip_events INSERT policy correctly uses this permission
-- 3. Ensure all related policies are consistent

-- Step 1: Ensure trip creators can view their own trips
-- This policy allows trip creators to SELECT from trips table even if they're not in trip_members
DROP POLICY IF EXISTS "Trip creators can view their own trips" ON public.trips;
CREATE POLICY "Trip creators can view their own trips"
ON public.trips
FOR SELECT
USING (auth.uid() = created_by);

-- Also ensure the combined policy exists (from 20251208000217)
DROP POLICY IF EXISTS "Trip creators and members can view trips" ON public.trips;
CREATE POLICY "Trip creators and members can view trips"
ON public.trips
FOR SELECT
USING (
  auth.uid() = created_by 
  OR EXISTS (
    SELECT 1 FROM trip_members tm 
    WHERE tm.trip_id = trips.id AND tm.user_id = auth.uid()
  )
);

-- Step 2: Fix the trip_events INSERT policy to ensure it works correctly
-- The policy from 20251209052538 should work, but let's ensure it's correct
DROP POLICY IF EXISTS "Trip members and creators can insert events" ON public.trip_events;
DROP POLICY IF EXISTS "Allow calendar event creation" ON public.trip_events;

CREATE POLICY "Allow calendar event creation"
ON public.trip_events
FOR INSERT
TO authenticated
WITH CHECK (
  -- Must be the authenticated user creating the event
  auth.uid() = created_by
  AND (
    -- Option 1: User is a trip member (any status)
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_events.trip_id
      AND tm.user_id = auth.uid()
    )
    OR
    -- Option 2: User is the trip creator
    -- This now works because we ensured trip creators can SELECT from trips above
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_events.trip_id
      AND t.created_by = auth.uid()
    )
  )
);

-- Step 3: Ensure SELECT policy on trip_events allows creators to view events
DROP POLICY IF EXISTS "Trip members can view events" ON public.trip_events;
DROP POLICY IF EXISTS "Allow viewing calendar events" ON public.trip_events;

CREATE POLICY "Allow viewing calendar events"
ON public.trip_events
FOR SELECT
TO authenticated
USING (
  -- User is a trip member
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_events.trip_id
    AND tm.user_id = auth.uid()
  )
  OR
  -- User is the trip creator
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_events.trip_id
    AND t.created_by = auth.uid()
  )
);

-- Step 4: Ensure UPDATE and DELETE policies are consistent
DROP POLICY IF EXISTS "Event creators can update their events" ON public.trip_events;
DROP POLICY IF EXISTS "Allow calendar event updates" ON public.trip_events;

CREATE POLICY "Allow calendar event updates"
ON public.trip_events
FOR UPDATE
TO authenticated
USING (
  -- Event creator can update their own events
  auth.uid() = created_by
  OR
  -- Trip creator can update any event on their trip
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_events.trip_id
    AND t.created_by = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for the updated row
  auth.uid() = created_by
  OR
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_events.trip_id
    AND t.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Event creators can delete their events" ON public.trip_events;
DROP POLICY IF EXISTS "Allow calendar event deletion" ON public.trip_events;

CREATE POLICY "Allow calendar event deletion"
ON public.trip_events
FOR DELETE
TO authenticated
USING (
  -- Event creator can delete their own events
  auth.uid() = created_by
  OR
  -- Trip creator can delete any event on their trip
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_events.trip_id
    AND t.created_by = auth.uid()
  )
);

-- Add helpful comments
COMMENT ON POLICY "Trip creators can view their own trips" ON public.trips IS 
  'Allows trip creators to view their own trips even if not in trip_members table. Fixes RLS circular dependency for calendar events.';

COMMENT ON POLICY "Trip creators and members can view trips" ON public.trips IS 
  'Allows trip creators OR trip members to view trips. This is the primary SELECT policy for trips.';

COMMENT ON POLICY "Allow calendar event creation" ON public.trip_events IS 
  'Allows trip members OR trip creators to create calendar events. Requires auth.uid() = created_by.';

COMMENT ON POLICY "Allow viewing calendar events" ON public.trip_events IS 
  'Allows trip members OR trip creators to view calendar events.';

COMMENT ON POLICY "Allow calendar event updates" ON public.trip_events IS 
  'Allows event creators OR trip creators to update calendar events.';

COMMENT ON POLICY "Allow calendar event deletion" ON public.trip_events IS 
  'Allows event creators OR trip creators to delete calendar events.';
