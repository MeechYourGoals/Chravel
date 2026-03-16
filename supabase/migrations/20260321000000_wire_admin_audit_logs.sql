-- Wire admin_audit_logs to all privileged admin mutation RPCs.
-- Adds audit log inserts to: approve_join_request, reject_join_request,
-- dismiss_join_request, and remove_trip_member_safe.
-- Uses CREATE OR REPLACE FUNCTION to patch each function in-place.

-- ============================================================================
-- 1. approve_join_request — audit on successful approval
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

  -- Audit log
  INSERT INTO public.admin_audit_logs (admin_id, action, trip_id, target_user_id, old_state, new_state)
  VALUES (
    auth.uid(),
    'approve_join',
    req.trip_id,
    req.user_id,
    jsonb_build_object('status', 'pending', 'request_id', _request_id),
    jsonb_build_object('status', 'approved')
  );

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
-- 2. reject_join_request — audit on successful rejection
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reject_join_request(_request_id uuid)
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
    RETURN jsonb_build_object('success', TRUE, 'message', 'Orphaned request removed (user account no longer exists)', 'cleaned_up', TRUE);
  END IF;

  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;

  IF NOT FOUND THEN
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object('success', TRUE, 'message', 'Orphaned request removed (trip no longer exists)', 'cleaned_up', TRUE);
  END IF;

  IF trip_data.trip_type IN ('pro', 'event') THEN
    IF NOT (
      trip_data.created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.trip_admins WHERE trip_id = req.trip_id AND user_id = auth.uid())
    ) THEN
      RETURN jsonb_build_object('success', FALSE, 'message', 'Only trip admins can reject join requests for Pro/Event trips');
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = req.trip_id AND user_id = auth.uid()) THEN
      RETURN jsonb_build_object('success', FALSE, 'message', 'Only trip members can reject join requests');
    END IF;
  END IF;

  UPDATE public.trip_join_requests
  SET status = 'rejected', resolved_at = now(), resolved_by = auth.uid()
  WHERE id = _request_id;

  -- Audit log
  INSERT INTO public.admin_audit_logs (admin_id, action, trip_id, target_user_id, old_state, new_state)
  VALUES (
    auth.uid(),
    'reject_join',
    req.trip_id,
    req.user_id,
    jsonb_build_object('status', 'pending', 'request_id', _request_id),
    jsonb_build_object('status', 'rejected')
  );

  BEGIN
    PERFORM public.create_notification(
      req.user_id,
      'Join Request Update',
      'Your request to join "' || trip_data.name || '" was not approved at this time.',
      'info',
      jsonb_build_object('trip_id', req.trip_id, 'trip_name', trip_data.name, 'action', 'join_rejected')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to send rejection notification: %', SQLERRM;
  END;

  RETURN jsonb_build_object('success', TRUE, 'message', 'Join request rejected', 'trip_id', req.trip_id);
END;
$$;

-- ============================================================================
-- 3. dismiss_join_request — audit on successful dismissal
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dismiss_join_request(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  trip_data RECORD;
BEGIN
  SELECT * INTO req FROM public.trip_join_requests WHERE id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Join request not found');
  END IF;

  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;

  IF NOT FOUND THEN
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object('success', TRUE, 'message', 'Orphaned request removed (trip no longer exists)', 'cleaned_up', TRUE);
  END IF;

  IF trip_data.trip_type IN ('pro', 'event') THEN
    IF NOT (
      trip_data.created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.trip_admins WHERE trip_id = req.trip_id AND user_id = auth.uid())
    ) THEN
      RETURN jsonb_build_object('success', FALSE, 'message', 'Only trip admins can dismiss join requests for Pro/Event trips');
    END IF;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = req.trip_id AND user_id = auth.uid()) THEN
      RETURN jsonb_build_object('success', FALSE, 'message', 'Only trip members can dismiss join requests');
    END IF;
  END IF;

  -- Audit log before delete (so we still have the request data)
  INSERT INTO public.admin_audit_logs (admin_id, action, trip_id, target_user_id, old_state, new_state)
  VALUES (
    auth.uid(),
    'dismiss_join',
    req.trip_id,
    req.user_id,
    jsonb_build_object('status', req.status, 'request_id', _request_id),
    NULL
  );

  DELETE FROM public.trip_join_requests WHERE id = _request_id;

  RETURN jsonb_build_object('success', TRUE, 'message', 'Join request dismissed', 'trip_id', req.trip_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.dismiss_join_request(uuid) TO authenticated;

-- ============================================================================
-- 4. remove_trip_member_safe — audit on successful removal
-- ============================================================================

CREATE OR REPLACE FUNCTION public.remove_trip_member_safe(
  p_trip_id TEXT,
  p_user_id_to_remove UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removing_user_id UUID;
  v_removing_user_role TEXT;
  v_target_user_role TEXT;
  v_is_creator BOOLEAN;
BEGIN
  v_removing_user_id := auth.uid();

  IF v_removing_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT;
    RETURN;
  END IF;

  IF p_user_id_to_remove = v_removing_user_id THEN
    RETURN QUERY SELECT FALSE, 'Use leave_trip to remove yourself'::TEXT;
    RETURN;
  END IF;

  SELECT (created_by = v_removing_user_id) INTO v_is_creator
  FROM trips WHERE id = p_trip_id;

  SELECT role INTO v_removing_user_role
  FROM trip_members WHERE trip_id = p_trip_id AND user_id = v_removing_user_id;

  IF NOT v_is_creator AND v_removing_user_role NOT IN ('admin', 'owner') THEN
    IF NOT EXISTS (SELECT 1 FROM trip_admins WHERE trip_id = p_trip_id AND user_id = v_removing_user_id) THEN
      RETURN QUERY SELECT FALSE, 'Only admins and owners can remove members'::TEXT;
      RETURN;
    END IF;
  END IF;

  SELECT role INTO v_target_user_role
  FROM trip_members WHERE trip_id = p_trip_id AND user_id = p_user_id_to_remove;

  IF v_target_user_role IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User is not a member of this trip'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM trips WHERE id = p_trip_id AND created_by = p_user_id_to_remove) THEN
    RETURN QUERY SELECT FALSE, 'Cannot remove trip creator'::TEXT;
    RETURN;
  END IF;

  IF v_target_user_role = 'owner' THEN
    RETURN QUERY SELECT FALSE, 'Cannot remove trip owner'::TEXT;
    RETURN;
  END IF;

  DELETE FROM trip_members WHERE trip_id = p_trip_id AND user_id = p_user_id_to_remove;

  -- Audit log
  INSERT INTO public.admin_audit_logs (admin_id, action, trip_id, target_user_id, old_state, new_state)
  VALUES (
    v_removing_user_id,
    'remove_member',
    p_trip_id,
    p_user_id_to_remove,
    jsonb_build_object('role', v_target_user_role, 'reason', p_reason),
    NULL
  );

  INSERT INTO notification_logs (user_id, type, title, body, data)
  VALUES (
    p_user_id_to_remove,
    'member_removed',
    'Removed from trip',
    COALESCE(p_reason, 'You were removed from a trip'),
    jsonb_build_object('trip_id', p_trip_id, 'removed_by', v_removing_user_id)
  );

  RETURN QUERY SELECT TRUE, 'Member removed successfully'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.remove_trip_member_safe(TEXT, UUID, TEXT) IS
  'Securely removes a member from a trip. Uses auth.uid() for authorization. Writes to admin_audit_logs.';
