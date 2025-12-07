-- Fix RLS policies for trip_events to allow trip creators and members to insert
-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Trip members can insert events" ON public.trip_events;
DROP POLICY IF EXISTS "Users can create events for their trips" ON public.trip_events;
DROP POLICY IF EXISTS "trip_events_insert_policy" ON public.trip_events;

-- Create a more permissive INSERT policy that allows:
-- 1. Trip members to create events
-- 2. Trip creators to create events (even if not in trip_members)
CREATE POLICY "Allow event creation for trip members and creators"
ON public.trip_events
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
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
  )
);

-- Also ensure UPDATE policy exists
DROP POLICY IF EXISTS "Trip members can update events" ON public.trip_events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.trip_events;

CREATE POLICY "Allow event updates for creators and admins"
ON public.trip_events
FOR UPDATE
USING (
  -- Event creator can update
  auth.uid() = created_by
  OR
  -- Trip admins can update any event
  EXISTS (
    SELECT 1 FROM public.trip_admins ta
    WHERE ta.trip_id = trip_events.trip_id
    AND ta.user_id = auth.uid()
  )
);

-- Ensure DELETE policy exists
DROP POLICY IF EXISTS "Trip members can delete events" ON public.trip_events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.trip_events;

CREATE POLICY "Allow event deletion for creators and admins"
ON public.trip_events
FOR DELETE
USING (
  -- Event creator can delete
  auth.uid() = created_by
  OR
  -- Trip admins can delete any event
  EXISTS (
    SELECT 1 FROM public.trip_admins ta
    WHERE ta.trip_id = trip_events.trip_id
    AND ta.user_id = auth.uid()
  )
);

-- Ensure SELECT policy allows viewing
DROP POLICY IF EXISTS "Trip members can view events" ON public.trip_events;
DROP POLICY IF EXISTS "Users can view trip events" ON public.trip_events;

CREATE POLICY "Allow viewing events for trip members and creators"
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