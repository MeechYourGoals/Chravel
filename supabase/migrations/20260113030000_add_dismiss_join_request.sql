-- Migration: Add dismiss_join_request function
-- Purpose: Allow trip members/admins to silently dismiss (delete) join requests
-- Use cases:
--   1. Orphaned requests from deleted users that can't be approved/rejected
--   2. Unknown/spam users who got hold of invite codes
--   3. Abusive users that members want to put in "request purgatory"
-- 
-- Unlike reject (which notifies the user and sets status='rejected'),
-- dismiss completely removes the request without notification.

-- ============================================================================
-- STEP 1: Clean up any existing orphaned join requests
-- (This is a safety net in case previous cleanup didn't run or new orphans exist)
-- ============================================================================

DELETE FROM public.trip_join_requests tjr
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = tjr.user_id
);

DELETE FROM public.trip_join_requests tjr
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = tjr.user_id
);

-- ============================================================================
-- STEP 2: Create dismiss_join_request function
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

  -- Only allow dismissing pending requests
  IF req.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Only pending requests can be dismissed'
    );
  END IF;

  -- Get trip data
  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;
  
  IF NOT FOUND THEN
    -- Trip was deleted - just delete the orphaned request
    DELETE FROM public.trip_join_requests WHERE id = _request_id;
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Orphaned request removed (trip no longer exists)',
      'cleaned_up', TRUE
    );
  END IF;
  
  -- Check authorization (same logic as approve/reject)
  IF trip_data.trip_type IN ('pro', 'event') THEN
    -- Pro/Event trips: Only creator or admins can dismiss
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

  -- Delete the request (no notification, no status change - just remove)
  DELETE FROM public.trip_join_requests WHERE id = _request_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Request dismissed',
    'trip_id', req.trip_id
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.dismiss_join_request(uuid) TO authenticated;

COMMENT ON FUNCTION public.dismiss_join_request IS 
'Silently dismiss (delete) a join request without notifying the requester. 
Used for orphaned requests, spam, or to put unwanted requesters in "purgatory".';

-- ============================================================================
-- STEP 3: Update trip_join_requests to allow re-requests after rejection
-- Add a unique constraint on (trip_id, user_id, status='pending') instead of
-- just (trip_id, user_id) so rejected users can try again
-- ============================================================================

-- First, check if the old unique constraint exists and drop it
DO $$
BEGIN
  -- Drop the old unique index if it exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'trip_join_requests_trip_user_unique'
  ) THEN
    DROP INDEX IF EXISTS public.trip_join_requests_trip_user_unique;
    RAISE NOTICE 'Dropped old unique index trip_join_requests_trip_user_unique';
  END IF;
  
  -- Also check for constraint-based unique
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_join_requests_trip_user_unique'
    AND table_name = 'trip_join_requests'
  ) THEN
    ALTER TABLE public.trip_join_requests 
    DROP CONSTRAINT IF EXISTS trip_join_requests_trip_user_unique;
    RAISE NOTICE 'Dropped old unique constraint trip_join_requests_trip_user_unique';
  END IF;
END;
$$;

-- Create a partial unique index that only applies to pending requests
-- This allows users to re-request after rejection while preventing duplicate pending requests
CREATE UNIQUE INDEX IF NOT EXISTS trip_join_requests_pending_unique
ON public.trip_join_requests (trip_id, user_id)
WHERE status = 'pending';

COMMENT ON INDEX trip_join_requests_pending_unique IS 
'Ensures only one pending request per user per trip. Allows re-requests after rejection.';

-- ============================================================================
-- STEP 4: Create a trigger to auto-cleanup orphaned requests
-- This runs when a profile is deleted (as a backup to FK cascade)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_join_requests_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a profile is deleted, remove any pending join requests from that user
  DELETE FROM public.trip_join_requests
  WHERE user_id = OLD.user_id AND status = 'pending';
  
  RETURN OLD;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS cleanup_join_requests_on_profile_delete ON public.profiles;

CREATE TRIGGER cleanup_join_requests_on_profile_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_orphaned_join_requests_trigger();

COMMENT ON FUNCTION public.cleanup_orphaned_join_requests_trigger IS 
'Automatically cleans up pending join requests when a user profile is deleted.';
