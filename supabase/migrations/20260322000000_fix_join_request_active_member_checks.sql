-- Security fix: only ACTIVE trip members can reject or dismiss join requests.
-- Previous definitions allowed former members (status='left') to perform
-- moderation actions on consumer trips because they checked only trip_id+user_id.

-- Re-define reject_join_request with active-member guard on consumer trips.
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
  v_cooldown_until TIMESTAMPTZ;
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
    IF NOT EXISTS (
      SELECT 1
      FROM public.trip_members
      WHERE trip_id = req.trip_id
        AND user_id = auth.uid()
        AND (status IS NULL OR status = 'active')
    ) THEN
      RETURN jsonb_build_object('success', FALSE, 'message', 'Only trip members can reject join requests');
    END IF;
  END IF;

  v_cooldown_until := NOW() + INTERVAL '24 hours';

  UPDATE public.trip_join_requests
  SET
    status = 'rejected',
    resolved_at = NOW(),
    resolved_by = auth.uid(),
    rejection_cooldown_until = v_cooldown_until
  WHERE id = _request_id;

  INSERT INTO public.admin_audit_logs (admin_id, action, trip_id, target_user_id, old_state, new_state)
  VALUES (
    auth.uid(),
    'reject_join',
    req.trip_id,
    req.user_id,
    jsonb_build_object('status', 'pending', 'request_id', _request_id),
    jsonb_build_object('status', 'rejected', 'cooldown_until', v_cooldown_until::text)
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

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Join request rejected',
    'trip_id', req.trip_id,
    'cooldown_until', v_cooldown_until::text
  );
END;
$$;

-- Re-define dismiss_join_request with active-member guard on consumer trips.
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
    IF NOT EXISTS (
      SELECT 1
      FROM public.trip_members
      WHERE trip_id = req.trip_id
        AND user_id = auth.uid()
        AND (status IS NULL OR status = 'active')
    ) THEN
      RETURN jsonb_build_object('success', FALSE, 'message', 'Only trip members can dismiss join requests');
    END IF;
  END IF;

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
