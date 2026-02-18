-- Trip Persistence After Creator Leaves
-- Ensures trips persist when creator/members leave. Leaving = soft-delete membership only.
-- No cascading deletes from trips or memberships. Admin auto-transfer when last admin leaves.

-- ============================================================================
-- 1. Schema: Add status/left_at to trip_members, archived_at to trips
-- ============================================================================

-- Add status if missing (some migrations have it, some don't)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trip_members' AND column_name='status') THEN
    ALTER TABLE public.trip_members ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    UPDATE public.trip_members SET status = 'active' WHERE status IS NULL;
  END IF;
END $$;

-- Add left_at for soft-delete tracking
ALTER TABLE public.trip_members ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ;

-- Add archived_at for when last member leaves (Option A: archive, not delete)
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ============================================================================
-- 2. Helper: is_active_trip_member (replaces is_trip_member for access checks)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_active_trip_member(_user_id uuid, _trip_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE user_id = _user_id AND trip_id = _trip_id
      AND (status IS NULL OR status = 'active')
  )
$$;

-- Update is_trip_member to use active-only check (backward compat)
CREATE OR REPLACE FUNCTION public.is_trip_member(_user_id uuid, _trip_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_active_trip_member(_user_id, _trip_id)
$$;

-- ============================================================================
-- 3. leave_trip RPC: Soft-delete membership, transfer admin, archive if last
-- ============================================================================

CREATE OR REPLACE FUNCTION public.leave_trip(_trip_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_trip_name text;
  v_creator_id uuid;
  v_active_count int;
  v_new_admin uuid;
  v_is_creator boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'You must be logged in');
  END IF;

  -- Get trip and creator
  SELECT name, created_by INTO v_trip_name, v_creator_id FROM trips WHERE id = _trip_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Trip not found');
  END IF;

  -- Check user is active member
  IF NOT public.is_active_trip_member(v_user_id, _trip_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You are not a member of this trip');
  END IF;

  v_is_creator := (v_creator_id = v_user_id);

  -- Count active members (excluding self)
  SELECT COUNT(*) INTO v_active_count
  FROM trip_members
  WHERE trip_id = _trip_id AND (status IS NULL OR status = 'active') AND user_id != v_user_id;

  -- Soft-delete: set status = 'left', left_at = now()
  UPDATE trip_members
  SET status = 'left', left_at = now()
  WHERE trip_id = _trip_id AND user_id = v_user_id;

  -- If last member: archive trip
  IF v_active_count = 0 THEN
    UPDATE trips SET archived_at = now(), is_archived = true WHERE id = _trip_id;
    RETURN jsonb_build_object('success', true, 'archived', true);
  END IF;

  -- If creator left and others remain: promote longest-tenured member to admin
  IF v_is_creator AND v_active_count > 0 THEN
    SELECT user_id INTO v_new_admin
    FROM trip_members
    WHERE trip_id = _trip_id AND (status IS NULL OR status = 'active')
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_new_admin IS NOT NULL THEN
      UPDATE trip_members SET role = 'admin' WHERE trip_id = _trip_id AND user_id = v_new_admin;
      INSERT INTO trip_admins (trip_id, user_id, granted_by, permissions)
      VALUES (_trip_id, v_new_admin, v_user_id, '{"can_manage_roles":true,"can_manage_channels":true,"can_designate_admins":true}'::jsonb)
      ON CONFLICT (trip_id, user_id) DO UPDATE SET permissions = EXCLUDED.permissions;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_trip(text) TO authenticated;

-- ============================================================================
-- 4. trip_members: Add UPDATE policy for self-leave (soft delete)
-- ============================================================================

-- Users can update own row to set status='left' (leave trip)
DROP POLICY IF EXISTS "Users can leave trip (soft delete)" ON public.trip_members;
CREATE POLICY "Users can leave trip (soft delete)"
ON public.trip_members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status = 'left');

-- Keep DELETE policy for admins removing others; self-leave uses UPDATE
-- "Users can leave trips" DELETE policy stays for backward compat but RPC is preferred

-- ============================================================================
-- 5. Channel ownership transfer: Fire on UPDATE (status -> left) not just DELETE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.transfer_channel_ownership_on_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel RECORD;
  v_new_owner UUID;
  v_leaving_user UUID;
BEGIN
  -- OLD.user_id on DELETE; on UPDATE, OLD is the row being updated
  v_leaving_user := COALESCE(OLD.user_id, NEW.user_id);

  FOR v_channel IN
    SELECT tc.id, tc.trip_id FROM trip_channels tc
    WHERE tc.created_by = v_leaving_user AND tc.trip_id = COALESCE(OLD.trip_id, NEW.trip_id)
  LOOP
    SELECT COALESCE(
      (SELECT ta.user_id FROM trip_admins ta
       WHERE ta.trip_id = v_channel.trip_id AND ta.user_id != v_leaving_user
       AND (ta.permissions->>'can_manage_channels')::boolean = true LIMIT 1),
      (SELECT ta.user_id FROM trip_admins ta
       WHERE ta.trip_id = v_channel.trip_id AND ta.user_id != v_leaving_user LIMIT 1),
      (SELECT tm.user_id FROM trip_members tm
       WHERE tm.trip_id = v_channel.trip_id AND tm.user_id != v_leaving_user
       AND (tm.status IS NULL OR tm.status = 'active')
       ORDER BY tm.created_at ASC LIMIT 1)
    ) INTO v_new_owner;

    IF v_new_owner IS NOT NULL THEN
      UPDATE trip_channels SET created_by = v_new_owner WHERE id = v_channel.id;
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on UPDATE when status changes to 'left'
DROP TRIGGER IF EXISTS transfer_channel_ownership_on_member_leave ON public.trip_members;
CREATE TRIGGER transfer_channel_ownership_on_member_leave
  AFTER UPDATE OF status ON public.trip_members
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM 'left' AND NEW.status = 'left')
  EXECUTE FUNCTION public.transfer_channel_ownership_on_leave();

-- Also fire on DELETE (for any legacy hard-delete paths)
DROP TRIGGER IF EXISTS transfer_channel_ownership_on_member_delete ON public.trip_members;
CREATE TRIGGER transfer_channel_ownership_on_member_delete
  BEFORE DELETE ON public.trip_members
  FOR EACH ROW
  EXECUTE FUNCTION public.transfer_channel_ownership_on_leave();

-- ============================================================================
-- 6. Notify functions: Exclude left members (add status filter only)
-- ============================================================================

-- notify_on_chat_message: only notify active members
CREATE OR REPLACE FUNCTION public.notify_on_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_name TEXT;
  v_author_name TEXT;
  v_member RECORD;
  v_should_notify BOOLEAN;
  v_prefs notification_preferences%ROWTYPE;
  v_is_mentioned BOOLEAN;
BEGIN
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  v_author_name := COALESCE(NEW.author_name, 'Someone');

  FOR v_member IN
    SELECT tm.user_id FROM trip_members tm
    WHERE tm.trip_id = NEW.trip_id AND tm.user_id != NEW.user_id
      AND (tm.status IS NULL OR tm.status = 'active')
  LOOP
    v_is_mentioned := NEW.mentioned_user_ids IS NOT NULL AND v_member.user_id = ANY(NEW.mentioned_user_ids);
    SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = v_member.user_id;
    v_should_notify := false;
    IF NOT FOUND THEN
      v_should_notify := v_is_mentioned;
    ELSIF v_is_mentioned THEN
      v_should_notify := COALESCE(v_prefs.push_enabled, true);
    ELSIF COALESCE(v_prefs.mentions_only, true) THEN
      v_should_notify := false;
    ELSE
      v_should_notify := public.should_send_notification(v_member.user_id, 'chat');
    END IF;
    IF v_should_notify THEN
      INSERT INTO notifications (user_id, title, message, type, trip_id, is_read, is_visible, metadata)
      VALUES (v_member.user_id,
        CASE WHEN v_is_mentioned THEN v_author_name || ' mentioned you' ELSE 'New message in ' || COALESCE(v_trip_name, 'your trip') END,
        LEFT(NEW.content, 100),
        CASE WHEN v_is_mentioned THEN 'mention' ELSE 'chat' END,
        NEW.trip_id, false, true,
        jsonb_build_object('message_id', NEW.id, 'sender_id', NEW.user_id, 'is_mention', v_is_mentioned));
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- notify_on_calendar_event: only notify active members (preserve bulk_import skip)
CREATE OR REPLACE FUNCTION public.notify_on_calendar_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_creator_name TEXT;
  v_skip TEXT;
BEGIN
  BEGIN
    v_skip := current_setting('chravel.skip_calendar_notifications', true);
  EXCEPTION WHEN OTHERS THEN
    v_skip := '';
  END;
  IF v_skip = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  SELECT COALESCE(display_name, first_name || ' ' || last_name, email) INTO v_creator_name
  FROM profiles WHERE user_id = NEW.created_by;
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.created_by
    AND (status IS NULL OR status = 'active');

  IF v_member_ids IS NOT NULL AND array_length(v_member_ids, 1) > 0 THEN
    PERFORM send_notification(v_member_ids, NEW.trip_id::UUID, 'calendar',
      '📅 New event: ' || NEW.title,
      COALESCE(v_creator_name, 'Someone') || ' added a new event' ||
        CASE WHEN NEW.start_time IS NOT NULL THEN ' on ' || to_char(NEW.start_time, 'Mon DD, YYYY at HH:MI AM') ELSE '' END ||
        CASE WHEN NEW.location IS NOT NULL THEN ' at ' || NEW.location ELSE '' END,
      jsonb_build_object('event_id', NEW.id, 'trip_id', NEW.trip_id, 'start_time', NEW.start_time, 'location', NEW.location, 'action', 'event_created'));
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.leave_trip IS 'Soft-deletes membership (status=left). Transfers admin if creator leaves. Archives trip if last member.';

-- ============================================================================
-- 7. Trips SELECT: Access by active membership only (not created_by)
-- Leaving user loses access immediately.
-- ============================================================================

DROP POLICY IF EXISTS "Trip creators can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view their trips" ON public.trips;
CREATE POLICY "Users can view their trips"
ON public.trips FOR SELECT TO authenticated
USING (public.is_active_trip_member(auth.uid(), id));
