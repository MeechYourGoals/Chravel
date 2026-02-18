-- Leave trip edge cases: re-join, trip_admins cleanup, approve_join_request
-- Complements 20260218000000_trip_persistence_after_creator_leaves.sql

-- ============================================================================
-- 1. approve_join_request: Re-join support (ON CONFLICT DO UPDATE)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  trip_data RECORD;
  profile_exists BOOLEAN;
BEGIN
  SELECT * INTO req FROM public.trip_join_requests WHERE id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Join request not found');
  END IF;

  IF req.status != 'pending' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'This request has already been ' || req.status);
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = req.user_id) INTO profile_exists;
  IF NOT profile_exists THEN
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object('success', FALSE, 'message', 'This join request is no longer valid (user account was deleted)', 'cleaned_up', TRUE);
  END IF;

  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;
  IF NOT FOUND THEN
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object('success', FALSE, 'message', 'This trip no longer exists', 'cleaned_up', TRUE);
  END IF;

  IF trip_data.trip_type IN ('pro', 'event') THEN
    IF NOT (trip_data.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.trip_admins WHERE trip_id = req.trip_id AND user_id = auth.uid())) THEN
      RETURN jsonb_build_object('success', FALSE, 'message', 'Only trip admins can approve join requests for Pro/Event trips');
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = req.trip_id AND user_id = auth.uid() AND (status IS NULL OR status = 'active')) THEN
      RETURN jsonb_build_object('success', FALSE, 'message', 'Only trip members can approve join requests');
    END IF;
  END IF;

  UPDATE public.trip_join_requests SET status = 'approved', resolved_at = now(), resolved_by = auth.uid() WHERE id = _request_id;

  -- Re-join: ON CONFLICT DO UPDATE restores status=active for users who left
  INSERT INTO public.trip_members (trip_id, user_id, role, status)
  VALUES (req.trip_id, req.user_id, 'member', 'active')
  ON CONFLICT (trip_id, user_id) DO UPDATE SET status = 'active', left_at = NULL, role = EXCLUDED.role;

  IF req.invite_code IS NOT NULL AND req.invite_code != '' THEN
    UPDATE public.trip_invites SET current_uses = current_uses + 1, updated_at = now()
    WHERE trip_id = req.trip_id AND code = req.invite_code;
  END IF;

  BEGIN
    PERFORM public.create_notification(req.user_id, '✅ Join Request Approved',
      'Your request to join "' || trip_data.name || '" has been approved!', 'success',
      jsonb_build_object('trip_id', req.trip_id, 'trip_name', trip_data.name, 'action', 'join_approved'));
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to send approval notification: %', SQLERRM;
  END;

  RETURN jsonb_build_object('success', TRUE, 'message', 'User added to trip successfully', 'trip_id', req.trip_id, 'user_id', req.user_id);
END;
$$;

-- ============================================================================
-- 2. leave_trip: Remove from trip_admins when leaving
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
  v_remaining_admins int;
  v_notify_user_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'You must be logged in');
  END IF;

  SELECT name, created_by INTO v_trip_name, v_creator_id FROM trips WHERE id = _trip_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Trip not found');
  END IF;

  IF NOT public.is_active_trip_member(v_user_id, _trip_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You are not a member of this trip');
  END IF;

  v_is_creator := (v_creator_id = v_user_id);

  SELECT COUNT(*) INTO v_active_count
  FROM trip_members
  WHERE trip_id = _trip_id AND (status IS NULL OR status = 'active') AND user_id != v_user_id;

  -- Remove from trip_admins (creator or non-creator admin)
  DELETE FROM trip_admins WHERE trip_id = _trip_id AND user_id = v_user_id;

  UPDATE trip_members SET status = 'left', left_at = now()
  WHERE trip_id = _trip_id AND user_id = v_user_id;

  IF v_active_count = 0 THEN
    UPDATE trips SET archived_at = now(), is_archived = true WHERE id = _trip_id;
    RETURN jsonb_build_object('success', true, 'archived', true);
  END IF;

  -- Count remaining admins (after our DELETE)
  SELECT COUNT(*) INTO v_remaining_admins FROM trip_admins WHERE trip_id = _trip_id;

  -- Promote when: (a) creator left, or (b) last admin left (no admins remain)
  IF v_remaining_admins = 0 AND v_active_count > 0 THEN
    SELECT user_id INTO v_new_admin
    FROM trip_members
    WHERE trip_id = _trip_id AND (status IS NULL OR status = 'active')
    ORDER BY created_at ASC LIMIT 1;

    IF v_new_admin IS NOT NULL THEN
      UPDATE trip_members SET role = 'admin' WHERE trip_id = _trip_id AND user_id = v_new_admin;
      INSERT INTO trip_admins (trip_id, user_id, granted_by, permissions)
      VALUES (_trip_id, v_new_admin, v_user_id, '{"can_manage_roles":true,"can_manage_channels":true,"can_designate_admins":true}'::jsonb)
      ON CONFLICT (trip_id, user_id) DO UPDATE SET permissions = EXCLUDED.permissions;
    END IF;
  END IF;

  -- Who should receive member_left notification: creator if active, else first admin
  IF public.is_active_trip_member(v_creator_id, _trip_id) THEN
    v_notify_user_id := v_creator_id;
  ELSE
    SELECT user_id INTO v_notify_user_id FROM trip_admins WHERE trip_id = _trip_id LIMIT 1;
  END IF;

  RETURN jsonb_build_object('success', true, 'notify_user_id', v_notify_user_id);
END;
$$;
