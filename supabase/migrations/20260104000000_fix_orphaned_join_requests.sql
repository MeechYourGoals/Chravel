-- Migration: Fix orphaned join requests when user is deleted
-- Root Cause: Original trip_join_requests table was created WITHOUT foreign key constraints.
-- Later migration with FK used IF NOT EXISTS, so the FK was never applied.
-- This migration adds proper FK constraint and cleans up orphaned records.

-- ============================================================================
-- STEP 1: Clean up any existing orphaned join requests
-- (requests where the user no longer exists in auth.users)
-- ============================================================================

-- Delete orphaned join requests (user no longer exists)
DELETE FROM public.trip_join_requests tjr
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = tjr.user_id
);

-- Delete join requests where the profile was deleted (soft-orphaned)
DELETE FROM public.trip_join_requests tjr
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = tjr.user_id
);

-- Log cleanup (will appear in Supabase logs during migration)
DO $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up orphaned join requests';
END;
$$;

-- ============================================================================
-- STEP 2: Add proper foreign key constraint if not exists
-- ============================================================================

-- First check if the constraint exists, if not add it
DO $$
BEGIN
  -- Check if FK constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_join_requests_user_id_fkey'
    AND table_name = 'trip_join_requests'
  ) THEN
    -- Add FK with CASCADE delete
    ALTER TABLE public.trip_join_requests
    ADD CONSTRAINT trip_join_requests_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added FK constraint trip_join_requests_user_id_fkey with ON DELETE CASCADE';
  ELSE
    RAISE NOTICE 'FK constraint trip_join_requests_user_id_fkey already exists';
  END IF;
END;
$$;

-- Also ensure trip_id references trips table with cascade
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_join_requests_trip_id_fkey'
    AND table_name = 'trip_join_requests'
  ) THEN
    -- Note: trip_id is TEXT type matching trips.id
    ALTER TABLE public.trip_join_requests
    ADD CONSTRAINT trip_join_requests_trip_id_fkey
    FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added FK constraint trip_join_requests_trip_id_fkey with ON DELETE CASCADE';
  END IF;
END;
$$;

-- ============================================================================
-- STEP 3: Create cleanup function for orphaned join requests
-- This can be called manually or via scheduled job
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_join_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
  orphan_user_count INTEGER := 0;
  orphan_profile_count INTEGER := 0;
BEGIN
  -- Delete requests where user no longer exists in auth.users
  DELETE FROM public.trip_join_requests tjr
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = tjr.user_id
  );
  GET DIAGNOSTICS orphan_user_count = ROW_COUNT;
  
  -- Delete requests where profile no longer exists
  DELETE FROM public.trip_join_requests tjr
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = tjr.user_id
  );
  GET DIAGNOSTICS orphan_profile_count = ROW_COUNT;
  
  deleted_count := orphan_user_count + orphan_profile_count;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'deleted_orphan_users', orphan_user_count,
    'deleted_orphan_profiles', orphan_profile_count,
    'total_deleted', deleted_count
  );
END;
$$;

-- Grant execute to service role only (for edge functions)
REVOKE ALL ON FUNCTION public.cleanup_orphaned_join_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_join_requests() TO service_role;

COMMENT ON FUNCTION public.cleanup_orphaned_join_requests IS 
'Removes orphaned join requests where the user no longer exists. Safe to run multiple times.';

-- ============================================================================
-- STEP 4: Update approve_join_request to check for valid user first
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
  user_exists BOOLEAN;
  result JSONB;
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

  -- Check if the requesting user still exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = req.user_id
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    -- User was deleted - clean up the orphaned request
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'This join request is no longer valid (user account was deleted)',
      'cleaned_up', TRUE
    );
  END IF;

  -- Also check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = req.user_id) THEN
    -- Profile was deleted - clean up
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'This join request is no longer valid (user profile was deleted)',
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
-- STEP 5: Update reject_join_request to check for valid user first
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
  user_exists BOOLEAN;
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

  -- Check if the requesting user still exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = req.user_id
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    -- User was deleted - clean up the orphaned request
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Orphaned request removed (user account was deleted)',
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
-- STEP 6: Create a view for valid pending join requests (for UI use)
-- This filters out any orphaned requests automatically
-- ============================================================================

CREATE OR REPLACE VIEW public.valid_pending_join_requests AS
SELECT 
  tjr.id,
  tjr.trip_id,
  tjr.user_id,
  tjr.invite_code,
  tjr.status,
  tjr.requested_at,
  tjr.resolved_at,
  tjr.resolved_by,
  p.display_name,
  p.avatar_url,
  p.first_name,
  p.last_name
FROM public.trip_join_requests tjr
INNER JOIN public.profiles p ON p.user_id = tjr.user_id
INNER JOIN auth.users u ON u.id = tjr.user_id
WHERE tjr.status = 'pending';

-- Grant select on view to authenticated users
GRANT SELECT ON public.valid_pending_join_requests TO authenticated;

-- RLS for the view (inherits from underlying tables)
-- Note: Views don't have RLS directly, but underlying table policies apply

COMMENT ON VIEW public.valid_pending_join_requests IS 
'Pending join requests with valid user profiles. Automatically filters out orphaned requests.';

-- ============================================================================
-- STEP 7: Add index for better performance on orphan cleanup queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_trip_join_requests_user_status 
ON public.trip_join_requests(user_id, status);

-- ============================================================================
-- STEP 8: Grant RPC permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_join_request(uuid) TO authenticated;
