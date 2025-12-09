-- Fix calendar event creation RLS issue and simplify permissions
-- 
-- ROOT CAUSE ANALYSIS:
-- The INSERT policy on trip_events (created in 20251209052538) checks if user is trip creator via:
--   EXISTS (SELECT 1 FROM trips WHERE created_by = auth.uid())
-- But this SELECT on trips table requires the user to have SELECT permission on trips.
-- If the user is a trip creator but NOT in trip_members, they may not have SELECT permission,
-- causing the INSERT to fail even though they should be allowed to create events.
--
-- SOLUTION:
-- 1. Ensure trip creators are ALWAYS added to trip_members (business rule)
-- 2. Simplify RLS: Any trip member can edit/delete any event (shared calendar model)
-- 3. Ensure the trip_events INSERT policy correctly uses trip_members
-- 4. Ensure all related policies are consistent

-- Step 1: Ensure trip creators are ALWAYS added to trip_members
-- This is a business rule: if you create a trip, you are automatically a member
CREATE OR REPLACE FUNCTION public.auto_add_trip_creator_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Automatically add trip creator as admin member
  INSERT INTO public.trip_members (
    trip_id,
    user_id,
    role,
    status
  ) VALUES (
    NEW.id,
    NEW.created_by,
    'admin',
    'active'
  )
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-add trip creator
DROP TRIGGER IF EXISTS auto_add_trip_creator_trigger ON public.trips;
CREATE TRIGGER auto_add_trip_creator_trigger
  AFTER INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_trip_creator_as_member();

-- Step 2: Ensure trip creators can view their own trips (backup policy)
-- This policy allows trip creators to SELECT from trips table even if they're not in trip_members
-- (though they should always be in trip_members now due to the trigger above)
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

-- Step 3: Fix the trip_events INSERT policy
-- Since trip creators are now always in trip_members, we can simplify to just check trip_members
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
    -- User is a trip member (any status)
    -- Trip creators are automatically members, so this covers them too
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_events.trip_id
      AND tm.user_id = auth.uid()
    )
    OR
    -- Fallback: User is the trip creator (in case trigger hasn't run yet)
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_events.trip_id
      AND t.created_by = auth.uid()
    )
  )
);

-- Step 4: Ensure SELECT policy on trip_events allows trip members to view events
DROP POLICY IF EXISTS "Trip members can view events" ON public.trip_events;
DROP POLICY IF EXISTS "Allow viewing calendar events" ON public.trip_events;

CREATE POLICY "Allow viewing calendar events"
ON public.trip_events
FOR SELECT
TO authenticated
USING (
  -- User is a trip member (any status)
  -- Trip creators are automatically members, so this covers them too
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_events.trip_id
    AND tm.user_id = auth.uid()
  )
  OR
  -- Fallback: User is the trip creator (in case trigger hasn't run yet)
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_events.trip_id
    AND t.created_by = auth.uid()
  )
);

-- Step 5: Simplify UPDATE and DELETE policies - any trip member can edit/delete any event
-- This follows the shared calendar model: if you're a collaborator, you can fix wrong info
DROP POLICY IF EXISTS "Event creators can update their events" ON public.trip_events;
DROP POLICY IF EXISTS "Allow calendar event updates" ON public.trip_events;

CREATE POLICY "Allow calendar event updates"
ON public.trip_events
FOR UPDATE
TO authenticated
USING (
  -- Any trip member can update any event (shared calendar model)
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_events.trip_id
    AND tm.user_id = auth.uid()
  )
  OR
  -- Fallback: User is the trip creator (in case trigger hasn't run yet)
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_events.trip_id
    AND t.created_by = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for the updated row
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

DROP POLICY IF EXISTS "Event creators can delete their events" ON public.trip_events;
DROP POLICY IF EXISTS "Allow calendar event deletion" ON public.trip_events;

CREATE POLICY "Allow calendar event deletion"
ON public.trip_events
FOR DELETE
TO authenticated
USING (
  -- Any trip member can delete any event (shared calendar model)
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_events.trip_id
    AND tm.user_id = auth.uid()
  )
  OR
  -- Fallback: User is the trip creator (in case trigger hasn't run yet)
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_events.trip_id
    AND t.created_by = auth.uid()
  )
);

-- Add helpful comments
COMMENT ON FUNCTION public.auto_add_trip_creator_as_member() IS 
  'Automatically adds trip creator as admin member when a trip is created. Ensures trip creators are always in trip_members.';

COMMENT ON POLICY "Trip creators can view their own trips" ON public.trips IS 
  'Allows trip creators to view their own trips. Backup policy (creators should always be in trip_members due to trigger).';

COMMENT ON POLICY "Trip creators and members can view trips" ON public.trips IS 
  'Allows trip creators OR trip members to view trips. This is the primary SELECT policy for trips.';

COMMENT ON POLICY "Allow calendar event creation" ON public.trip_events IS 
  'Allows trip members to create calendar events. Requires auth.uid() = created_by. Trip creators are automatically members.';

COMMENT ON POLICY "Allow viewing calendar events" ON public.trip_events IS 
  'Allows trip members to view calendar events. Trip creators are automatically members.';

COMMENT ON POLICY "Allow calendar event updates" ON public.trip_events IS 
  'Allows any trip member to update any calendar event. Shared calendar model - collaborators can fix wrong information.';

COMMENT ON POLICY "Allow calendar event deletion" ON public.trip_events IS 
  'Allows any trip member to delete any calendar event. Shared calendar model - collaborators can remove incorrect events.';
