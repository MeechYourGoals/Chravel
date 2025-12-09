-- First, drop existing conflicting INSERT policies on trip_events
DROP POLICY IF EXISTS "Trip members can create events" ON public.trip_events;
DROP POLICY IF EXISTS "Trip creators can add events" ON public.trip_events;
DROP POLICY IF EXISTS "Authenticated users can create events for their trips" ON public.trip_events;
DROP POLICY IF EXISTS "Users can create events" ON public.trip_events;

-- Create a single consolidated INSERT policy
CREATE POLICY "Trip members and creators can insert events"
ON public.trip_events
FOR INSERT
TO authenticated
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

-- Ensure UPDATE policy exists for event creators
DROP POLICY IF EXISTS "Event creators can update their events" ON public.trip_events;
CREATE POLICY "Event creators can update their events"
ON public.trip_events
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Ensure DELETE policy exists for event creators
DROP POLICY IF EXISTS "Event creators can delete their events" ON public.trip_events;
CREATE POLICY "Event creators can delete their events"
ON public.trip_events
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Ensure SELECT policy exists for trip members
DROP POLICY IF EXISTS "Trip members can view events" ON public.trip_events;
CREATE POLICY "Trip members can view events"
ON public.trip_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_events.trip_id
    AND tm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_events.trip_id
    AND t.created_by = auth.uid()
  )
);