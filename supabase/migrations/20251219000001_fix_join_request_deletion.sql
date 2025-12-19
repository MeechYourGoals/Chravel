-- Fix for stuck join requests when user is deleted
-- This migration updates the approve_join_request and reject_join_request functions
-- to gracefully handle cases where the user no longer exists when trying to send notifications.

-- Re-create approve_join_request with error handling for notifications
CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  trip_data RECORD;
  requester_profile RECORD;
  result JSONB;
BEGIN
  SELECT * INTO req 
  FROM public.trip_join_requests 
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Join request not found'
    );
  END IF;

  IF req.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'This request has already been ' || req.status
    );
  END IF;

  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;
  
  IF NOT (
    trip_data.created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = req.trip_id AND user_id = auth.uid()
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Only trip admins can approve join requests'
    );
  END IF;

  UPDATE public.trip_join_requests
  SET 
    status = 'approved',
    resolved_at = now(),
    resolved_by = auth.uid()
  WHERE id = _request_id;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (req.trip_id, req.user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Try to fetch profile and send notification, but don't fail if user is missing
  BEGIN
    SELECT display_name INTO requester_profile
    FROM public.profiles
    WHERE user_id = req.user_id;

    PERFORM public.create_notification(
      req.user_id,
      '✅ Join Request Approved',
      'Your request to join "' || trip_data.name || '" has been approved!',
      'success',
      jsonb_build_object(
        'trip_id', req.trip_id,
        'trip_name', trip_data.name,
        'action', 'join_approved'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error (if we had logging) or just ignore notification failure
    -- This handles the case where the user was deleted (FK violation)
    RAISE NOTICE 'Failed to send approval notification: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'User added to trip successfully',
    'trip_id', req.trip_id,
    'user_id', req.user_id
  );
END;
$$;

-- Re-create reject_join_request with error handling for notifications
CREATE OR REPLACE FUNCTION public.reject_join_request(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  trip_data RECORD;
  result JSONB;
BEGIN
  SELECT * INTO req 
  FROM public.trip_join_requests 
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Join request not found'
    );
  END IF;

  IF req.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'This request has already been ' || req.status
    );
  END IF;

  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;
  
  IF NOT (
    trip_data.created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = req.trip_id AND user_id = auth.uid()
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Only trip admins can reject join requests'
    );
  END IF;

  UPDATE public.trip_join_requests
  SET 
    status = 'rejected',
    resolved_at = now(),
    resolved_by = auth.uid()
  WHERE id = _request_id;

  -- Try to send notification, but don't fail if user is missing
  BEGIN
    PERFORM public.create_notification(
      req.user_id,
      'Join Request Update',
      'Your request to join "' || trip_data.name || '" was not approved at this time.',
      'info',
      jsonb_build_object(
        'trip_id', req.trip_id,
        'trip_name', trip_data.name,
        'action', 'join_rejected'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error (if we had logging) or just ignore notification failure
    -- This handles the case where the user was deleted (FK violation)
    RAISE NOTICE 'Failed to send rejection notification: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Join request rejected',
    'trip_id', req.trip_id,
    'user_id', req.user_id
  );
END;
$$;
