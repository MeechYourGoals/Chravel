-- Secure Structured Objects (Calendar, Polls, Tasks) audit & fix

-- 1. Helper Functions for Unified Authorization
CREATE OR REPLACE FUNCTION public.is_trip_member(trip_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.trip_members tm
    WHERE tm.trip_id = is_trip_member.trip_id
      AND tm.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_trip_admin(trip_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.trip_members tm
    WHERE tm.trip_id = is_trip_admin.trip_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Secure Trip Events
-- Add Foreign Key Constraints
DO $$ BEGIN
  ALTER TABLE public.trip_events
    ADD CONSTRAINT fk_trip_events_trip FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.trip_events
    ADD CONSTRAINT fk_trip_events_creator FOREIGN KEY (created_by) REFERENCES auth.users(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update RLS Policies
DROP POLICY IF EXISTS "Trip members can view events" ON public.trip_events;
CREATE POLICY "Trip members can view events" ON public.trip_events
  FOR SELECT USING (public.is_trip_member(trip_id));

DROP POLICY IF EXISTS "Trip members can create events" ON public.trip_events;
CREATE POLICY "Trip members can create events" ON public.trip_events
  FOR INSERT WITH CHECK (public.is_trip_member(trip_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Event creators can update their events" ON public.trip_events; -- Drop old policy
CREATE POLICY "Event creators and admins can update events" ON public.trip_events
  FOR UPDATE USING (created_by = auth.uid() OR public.is_trip_admin(trip_id));

DROP POLICY IF EXISTS "Event creators can delete their events" ON public.trip_events; -- Drop old policy
CREATE POLICY "Event creators and admins can delete events" ON public.trip_events
  FOR DELETE USING (created_by = auth.uid() OR public.is_trip_admin(trip_id));


-- 3. Secure Trip Tasks
-- Add Foreign Key Constraints
DO $$ BEGIN
  ALTER TABLE public.trip_tasks
    ADD CONSTRAINT fk_trip_tasks_trip FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.trip_tasks
    ADD CONSTRAINT fk_trip_tasks_creator FOREIGN KEY (creator_id) REFERENCES auth.users(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update RLS Policies
DROP POLICY IF EXISTS "Trip members can view tasks" ON public.trip_tasks;
CREATE POLICY "Trip members can view tasks" ON public.trip_tasks
  FOR SELECT USING (public.is_trip_member(trip_id));

DROP POLICY IF EXISTS "Trip members can create tasks" ON public.trip_tasks;
CREATE POLICY "Trip members can create tasks" ON public.trip_tasks
  FOR INSERT WITH CHECK (public.is_trip_member(trip_id) AND creator_id = auth.uid());

DROP POLICY IF EXISTS "Task creators can update their tasks" ON public.trip_tasks;
CREATE POLICY "Task creators and admins can update tasks" ON public.trip_tasks
  FOR UPDATE USING (creator_id = auth.uid() OR public.is_trip_admin(trip_id));

DROP POLICY IF EXISTS "Task creators can delete their tasks" ON public.trip_tasks;
CREATE POLICY "Task creators and admins can delete tasks" ON public.trip_tasks
  FOR DELETE USING (creator_id = auth.uid() OR public.is_trip_admin(trip_id));


-- 4. Secure Trip Polls
-- Fix Schema: trip_id should be TEXT to match trips.id
ALTER TABLE public.trip_polls ALTER COLUMN trip_id TYPE TEXT USING trip_id::text;

-- Add Foreign Key Constraints
DO $$ BEGIN
  ALTER TABLE public.trip_polls
    ADD CONSTRAINT fk_trip_polls_trip FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.trip_polls
    ADD CONSTRAINT fk_trip_polls_creator FOREIGN KEY (created_by) REFERENCES auth.users(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update RLS Policies
DROP POLICY IF EXISTS "Users can view polls from their trips" ON public.trip_polls;
DROP POLICY IF EXISTS "Members can read trip_polls" ON public.trip_polls; -- Remove potential duplicate/old policies
CREATE POLICY "Trip members can view polls" ON public.trip_polls
  FOR SELECT USING (public.is_trip_member(trip_id));

DROP POLICY IF EXISTS "Users can manage polls in their trips" ON public.trip_polls; -- Remove the overly permissive policy
CREATE POLICY "Trip members can create polls" ON public.trip_polls
  FOR INSERT WITH CHECK (public.is_trip_member(trip_id) AND created_by = auth.uid());

CREATE POLICY "Poll creators and admins can update polls" ON public.trip_polls
  FOR UPDATE USING (created_by = auth.uid() OR public.is_trip_admin(trip_id));

CREATE POLICY "Poll creators and admins can delete polls" ON public.trip_polls
  FOR DELETE USING (created_by = auth.uid() OR public.is_trip_admin(trip_id));


-- 5. Secure Task Status
-- Prevent users from modifying task status for trips they are not members of
DROP POLICY IF EXISTS "Users can manage their own task status" ON public.task_status;
CREATE POLICY "Trip members can manage their own task status" ON public.task_status
  FOR ALL
  USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1
      FROM public.trip_tasks tt
      WHERE tt.id = task_status.task_id
        AND public.is_trip_member(tt.trip_id)
    )
  )
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1
      FROM public.trip_tasks tt
      WHERE tt.id = task_status.task_id
        AND public.is_trip_member(tt.trip_id)
    )
  );
