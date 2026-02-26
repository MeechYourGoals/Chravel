-- Fix security vulnerabilities
-- 1. Restrict trip_members INSERT to prevent arbitrary joining
-- 2. Restrict UPDATE/DELETE on trip resources to active members only

-- ============================================================================
-- 0. Dependencies
-- ============================================================================

-- Ensure is_super_admin exists (idempotent definition)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = ANY (
    ARRAY[
      'ccamechi@gmail.com'
    ]
  );
$$;

-- ============================================================================
-- 1. Fix Trip Membership Bypass
-- ============================================================================

-- Drop the permissive policy that allowed any user to insert themselves into any trip.
-- Previous Policy: WITH CHECK (user_id = auth.uid()) -> Allowed joining ANY trip ID.
--
-- FIX: Regular users must now join via the 'join-trip' Edge Function or
-- 'join_trip_via_invite' RPC. Both use SECURITY DEFINER (Service Role) to
-- bypass RLS and perform strict checks (invite validity, expiration, approval).
DROP POLICY IF EXISTS "Users can join trips via valid invites" ON public.trip_members;

-- ============================================================================
-- 2. Fix Stale Creator Permissions (Tasks, Events, Broadcasts, Polls)
-- ============================================================================

-- Trip Tasks
DROP POLICY IF EXISTS "Task creators can update their tasks" ON public.trip_tasks;
CREATE POLICY "Creators can update own tasks if member" ON public.trip_tasks
FOR UPDATE USING (
  auth.uid() = creator_id AND
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_tasks.trip_id
    AND tm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Task creators can delete their tasks" ON public.trip_tasks;
CREATE POLICY "Creators can delete own tasks if member" ON public.trip_tasks
FOR DELETE USING (
  auth.uid() = creator_id AND
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_tasks.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Trip Events
DROP POLICY IF EXISTS "Event creators can update their events" ON public.trip_events;
CREATE POLICY "Creators can update own events if member" ON public.trip_events
FOR UPDATE USING (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_events.trip_id
    AND tm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Event creators can delete their events" ON public.trip_events;
CREATE POLICY "Creators can delete own events if member" ON public.trip_events
FOR DELETE USING (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_events.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Broadcasts
DROP POLICY IF EXISTS "Broadcast creators can update their broadcasts" ON public.broadcasts;
CREATE POLICY "Creators can update own broadcasts if member" ON public.broadcasts
FOR UPDATE USING (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = broadcasts.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Trip Polls
DROP POLICY IF EXISTS "Owners can update trip_polls" ON public.trip_polls;
CREATE POLICY "Creators can update own polls if member" ON public.trip_polls
FOR UPDATE USING (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_polls.trip_id
    AND tm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can delete trip_polls" ON public.trip_polls;
CREATE POLICY "Creators can delete own polls if member" ON public.trip_polls
FOR DELETE USING (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_polls.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Trip Files
DROP POLICY IF EXISTS "Owners can update trip_files" ON public.trip_files;
CREATE POLICY "Creators can update own files if member" ON public.trip_files
FOR UPDATE USING (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_files.trip_id
    AND tm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can delete trip_files" ON public.trip_files;
CREATE POLICY "Creators can delete own files if member" ON public.trip_files
FOR DELETE USING (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_files.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Trip Links
DROP POLICY IF EXISTS "Owners can update trip_links" ON public.trip_links;
CREATE POLICY "Creators can update own links if member" ON public.trip_links
FOR UPDATE USING (
  auth.uid() = added_by AND
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_links.trip_id
    AND tm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can delete trip_links" ON public.trip_links;
CREATE POLICY "Creators can delete own links if member" ON public.trip_links
FOR DELETE USING (
  auth.uid() = added_by AND
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_links.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- ============================================================================
-- 3. Restrict READ access for trip_polls, trip_links, trip_files
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can read trip_polls" ON public.trip_polls;
CREATE POLICY "Trip members can read polls" ON public.trip_polls
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_polls.trip_id
    AND tm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Anyone can read trip_links" ON public.trip_links;
CREATE POLICY "Trip members can read links" ON public.trip_links
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_links.trip_id
    AND tm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Anyone can read trip_files" ON public.trip_files;
CREATE POLICY "Trip members can read files" ON public.trip_files
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_files.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- ============================================================================
-- 4. Restore authorized trip_members INSERT capabilities
-- ============================================================================

-- Allow Creators to re-join their own trips (for recovery/auto-fix)
CREATE POLICY "Creators can rejoin their own trips" ON public.trip_members
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (SELECT 1 FROM trips WHERE id = trip_members.trip_id AND created_by = auth.uid())
);

-- Allow Super Admins to join any trip (for debugging/support)
CREATE POLICY "Super admins can join any trip" ON public.trip_members
FOR INSERT WITH CHECK (
  public.is_super_admin() AND user_id = auth.uid()
);
