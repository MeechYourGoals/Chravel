-- Migration: Add dismiss_join_request function for swipe-to-delete
-- This allows trip admins to permanently remove a join request without
-- going through the formal approve/reject flow. Useful for:
-- 1. Orphaned requests from deleted users
-- 2. Spam or unwanted requests
-- 3. Putting unwanted users in "purgatory" (neither approved nor rejected)

-- ============================================================================
-- STEP 1: Create dismiss_join_request function
-- This permanently deletes a request instead of marking it rejected
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
  -- Fetch the join request
  SELECT * INTO req
  FROM public.trip_join_requests
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Join request not found'
    );
  END IF;

  -- Get trip data for authorization check
  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;

  IF NOT FOUND THEN
    -- Trip was deleted - clean up the orphaned request
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Orphaned request removed (trip no longer exists)',
      'cleaned_up', TRUE
    );
  END IF;

  -- Check authorization: For consumer trips, any member can dismiss
  -- For pro/event trips, only creator or admins can dismiss
  IF trip_data.trip_type IN ('pro', 'event') THEN
    IF NOT (
      trip_data.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.trip_admins
        WHERE trip_id = req.trip_id AND user_id = auth.uid()
      )
    ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'message', 'Only trip admins can dismiss join requests for Pro/Event trips'
      );
    END IF;
  ELSE
    -- Consumer trip: any member can dismiss
    IF NOT EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_id = req.trip_id AND user_id = auth.uid()
    ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'message', 'Only trip members can dismiss join requests'
      );
    END IF;
  END IF;

  -- Permanently delete the request (no status change, just remove)
  DELETE FROM public.trip_join_requests WHERE id = _request_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Join request dismissed',
    'trip_id', req.trip_id
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.dismiss_join_request(uuid) TO authenticated;

COMMENT ON FUNCTION public.dismiss_join_request IS
'Permanently deletes a join request without approval/rejection. Used for swipe-to-delete.';

-- ============================================================================
-- STEP 2: Update reject_join_request to handle orphaned users more gracefully
-- Fix: Use direct table check instead of auth.users (which may require higher permissions)
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
  -- Fetch the join request
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

  -- Check if user profile exists (this is our proxy for user existence)
  -- Using profiles table instead of auth.users for RLS compatibility
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = req.user_id
  ) INTO profile_exists;

  IF NOT profile_exists THEN
    -- User/profile was deleted - clean up the orphaned request
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Orphaned request removed (user account no longer exists)',
      'cleaned_up', TRUE
    );
  END IF;

  -- Get trip data
  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;

  IF NOT FOUND THEN
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Orphaned request removed (trip no longer exists)',
      'cleaned_up', TRUE
    );
  END IF;

  -- Check authorization
  IF trip_data.trip_type IN ('pro', 'event') THEN
    IF NOT (
      trip_data.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.trip_admins
        WHERE trip_id = req.trip_id AND user_id = auth.uid()
      )
    ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'message', 'Only trip admins can reject join requests for Pro/Event trips'
      );
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_id = req.trip_id AND user_id = auth.uid()
    ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'message', 'Only trip members can reject join requests'
      );
    END IF;
  END IF;

  -- Update the request status
  UPDATE public.trip_join_requests
  SET
    status = 'rejected',
    resolved_at = now(),
    resolved_by = auth.uid()
  WHERE id = _request_id;

  -- Try to send notification (non-critical)
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

-- ============================================================================
-- STEP 3: Similarly update approve_join_request
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
  -- Fetch the join request
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

  -- Check if user profile exists (proxy for user existence)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = req.user_id
  ) INTO profile_exists;

  IF NOT profile_exists THEN
    -- User was deleted - clean up the orphaned request
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'This join request is no longer valid (user account was deleted)',
      'cleaned_up', TRUE
    );
  END IF;

  -- Get trip data for authorization check
  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;

  IF NOT FOUND THEN
    -- Trip was deleted - clean up
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'This trip no longer exists',
      'cleaned_up', TRUE
    );
  END IF;

  -- Check authorization: For consumer trips, any member can approve
  -- For pro/event trips, only creator or admins can approve
  IF trip_data.trip_type IN ('pro', 'event') THEN
    IF NOT (
      trip_data.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.trip_admins
        WHERE trip_id = req.trip_id AND user_id = auth.uid()
      )
    ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'message', 'Only trip admins can approve join requests for Pro/Event trips'
      );
    END IF;
  ELSE
    -- Consumer trip: any member can approve
    IF NOT EXISTS (
      SELECT 1 FROM public.trip_members
      WHERE trip_id = req.trip_id AND user_id = auth.uid()
    ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'message', 'Only trip members can approve join requests'
      );
    END IF;
  END IF;

  -- Update the request status
  UPDATE public.trip_join_requests
  SET
    status = 'approved',
    resolved_at = now(),
    resolved_by = auth.uid()
  WHERE id = _request_id;

  -- Add user to trip members
  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (req.trip_id, req.user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Try to send notification (non-critical - wrapped in exception handler)
  BEGIN
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
    -- Log but don't fail - notification is non-critical
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

-- ============================================================================
-- STEP 4: Create a trigger to auto-cleanup orphaned requests
-- Runs when profiles are deleted to clean up any pending join requests
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_join_requests_on_profile_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete any pending join requests for this user
  DELETE FROM public.trip_join_requests
  WHERE user_id = OLD.user_id AND status = 'pending';

  RETURN OLD;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_cleanup_join_requests_on_profile_delete ON public.profiles;

-- Create trigger
CREATE TRIGGER trigger_cleanup_join_requests_on_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_join_requests_on_profile_delete();

COMMENT ON TRIGGER trigger_cleanup_join_requests_on_profile_delete ON public.profiles IS
'Automatically cleans up pending join requests when a user profile is deleted';
