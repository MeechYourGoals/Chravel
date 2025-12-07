-- Fix RLS circular dependency that prevents calendar event creation
-- 
-- ROOT CAUSE:
-- The INSERT policy on trip_events checks if user is trip creator via:
--   EXISTS (SELECT 1 FROM trips WHERE created_by = auth.uid())
-- But the SELECT policy on trips ONLY allows viewing if user is in trip_members.
-- This creates a circular dependency where:
--   1. User tries to INSERT into trip_events
--   2. Policy checks if user is trip creator by SELECTing from trips
--   3. SELECT fails because user is not in trip_members
--   4. INSERT is denied even though user IS the trip creator
--
-- FIX: Add a SELECT policy on trips that allows creators to view their own trips

-- Add SELECT policy for trip creators (ORed with existing trip_members policy)
DROP POLICY IF EXISTS "Trip creators can view their own trips" ON public.trips;
CREATE POLICY "Trip creators can view their own trips"
ON public.trips
FOR SELECT
USING (auth.uid() = created_by);

-- Also update the trip_events INSERT policy to be more robust
-- Drop all existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Allow event creation for trip members and creators" ON public.trip_events;
DROP POLICY IF EXISTS "Trip members can insert events" ON public.trip_events;
DROP POLICY IF EXISTS "Users can create events for their trips" ON public.trip_events;
DROP POLICY IF EXISTS "trip_events_insert_policy" ON public.trip_events;
DROP POLICY IF EXISTS "Trip members can create events" ON public.trip_events;

-- Create a clean INSERT policy that works with the new trips SELECT policy
CREATE POLICY "Allow calendar event creation"
ON public.trip_events
FOR INSERT
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
    -- This now works because we added the trips SELECT policy for creators
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_events.trip_id
      AND t.created_by = auth.uid()
    )
  )
);

-- Also ensure the SELECT policy on trip_events allows creators to view events
DROP POLICY IF EXISTS "Allow viewing events for trip members and creators" ON public.trip_events;
DROP POLICY IF EXISTS "Trip members can view events" ON public.trip_events;
DROP POLICY IF EXISTS "Users can view events for their trips" ON public.trip_events;

CREATE POLICY "Allow viewing calendar events"
ON public.trip_events
FOR SELECT
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

-- Ensure UPDATE and DELETE policies are consistent
DROP POLICY IF EXISTS "Allow event updates for creators and admins" ON public.trip_events;
DROP POLICY IF EXISTS "Event creators can update their events" ON public.trip_events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.trip_events;

CREATE POLICY "Allow calendar event updates"
ON public.trip_events
FOR UPDATE
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
);

DROP POLICY IF EXISTS "Allow event deletion for creators and admins" ON public.trip_events;
DROP POLICY IF EXISTS "Event creators can delete their events" ON public.trip_events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.trip_events;

CREATE POLICY "Allow calendar event deletion"
ON public.trip_events
FOR DELETE
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

COMMENT ON POLICY "Allow calendar event creation" ON public.trip_events IS 
  'Allows trip members OR trip creators to create calendar events.';
