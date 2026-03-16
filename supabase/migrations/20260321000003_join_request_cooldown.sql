-- 24-hour cooldown on join requests after rejection.
-- Prevents abuse where a rejected user immediately re-requests, spamming admins.
--
-- Safety notes:
-- 1. Existing rows: rejection_cooldown_until defaults to NULL, meaning no cooldown.
--    The join-trip edge function only blocks when cooldown IS NOT NULL AND > NOW().
-- 2. Migration is transactional — concurrent reject_join_request calls see old or new
--    function atomically; no partial-state exposure.
-- 3. RLS: trip_join_requests already has row-level security. rejection_cooldown_until
--    is a column on the same table — no separate column policy needed.

-- 1. Add cooldown column (safe on existing rows: defaults to NULL = no cooldown)
ALTER TABLE public.trip_join_requests
  ADD COLUMN IF NOT EXISTS rejection_cooldown_until TIMESTAMPTZ;

-- 2. Re-define reject_join_request to set 24-hour cooldown on rejection.
--    This supersedes the version from 20260321000000_wire_admin_audit_logs.sql.
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
    IF NOT EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = req.trip_id AND user_id = auth.uid()) THEN
      RETURN jsonb_build_object('success', FALSE, 'message', 'Only trip members can reject join requests');
    END IF;
  END IF;

  v_cooldown_until := NOW() + INTERVAL '24 hours';

  -- Update status and set 24-hour re-request cooldown
  UPDATE public.trip_join_requests
  SET
    status = 'rejected',
    resolved_at = NOW(),
    resolved_by = auth.uid(),
    rejection_cooldown_until = v_cooldown_until
  WHERE id = _request_id;

  -- Audit log
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
