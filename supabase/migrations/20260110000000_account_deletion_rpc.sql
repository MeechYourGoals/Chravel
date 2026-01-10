-- Account deletion request function
-- Marks account for deletion with 30-day grace period per App Store Guideline 5.1.1
-- Created: 2026-01-10

-- First, add columns to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'deletion_requested_at') THEN
    ALTER TABLE public.profiles ADD COLUMN deletion_requested_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'deletion_scheduled_for') THEN
    ALTER TABLE public.profiles ADD COLUMN deletion_scheduled_for timestamptz;
  END IF;
END
$$;

-- Create index for finding accounts pending deletion
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_scheduled
ON public.profiles (deletion_scheduled_for)
WHERE deletion_scheduled_for IS NOT NULL;

-- Create the RPC function to request account deletion
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_scheduled_date timestamptz;
  v_existing_request timestamptz;
BEGIN
  -- Verify authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if deletion already requested
  SELECT deletion_scheduled_for INTO v_existing_request
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_existing_request IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Account deletion already scheduled',
      'scheduled_for', v_existing_request
    );
  END IF;

  -- Calculate deletion date (30 days from now per App Store guidelines)
  v_scheduled_date := now() + interval '30 days';

  -- Mark profile for deletion
  UPDATE public.profiles
  SET
    deletion_requested_at = now(),
    deletion_scheduled_for = v_scheduled_date
  WHERE user_id = v_user_id;

  -- Log to security audit if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public'
             AND table_name = 'security_audit_log') THEN
    INSERT INTO public.security_audit_log (event_type, user_id, details)
    VALUES (
      'account_deletion_requested',
      v_user_id,
      jsonb_build_object(
        'scheduled_for', v_scheduled_date,
        'requested_at', now()
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account scheduled for deletion in 30 days',
    'scheduled_for', v_scheduled_date
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

-- Create function to cancel deletion request
CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_scheduled_date timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get current scheduled date
  SELECT deletion_scheduled_for INTO v_scheduled_date
  FROM public.profiles
  WHERE user_id = v_user_id;

  -- Check if there's a pending deletion to cancel
  IF v_scheduled_date IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No pending deletion request to cancel'
    );
  END IF;

  -- Check if deletion date has passed
  IF v_scheduled_date <= now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Deletion period has expired and cannot be cancelled'
    );
  END IF;

  -- Cancel the deletion request
  UPDATE public.profiles
  SET
    deletion_requested_at = NULL,
    deletion_scheduled_for = NULL
  WHERE user_id = v_user_id;

  -- Log cancellation if audit table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public'
             AND table_name = 'security_audit_log') THEN
    INSERT INTO public.security_audit_log (event_type, user_id, details)
    VALUES (
      'account_deletion_cancelled',
      v_user_id,
      jsonb_build_object('cancelled_at', now())
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Deletion request cancelled successfully'
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated;

-- Create function to check deletion status
CREATE OR REPLACE FUNCTION public.get_account_deletion_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_requested_at timestamptz;
  v_scheduled_for timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT deletion_requested_at, deletion_scheduled_for
  INTO v_requested_at, v_scheduled_for
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_scheduled_for IS NULL THEN
    RETURN jsonb_build_object(
      'pending_deletion', false
    );
  END IF;

  RETURN jsonb_build_object(
    'pending_deletion', true,
    'requested_at', v_requested_at,
    'scheduled_for', v_scheduled_for,
    'days_remaining', EXTRACT(DAY FROM (v_scheduled_for - now()))
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_account_deletion_status() TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.request_account_deletion() IS
'Marks user account for deletion with 30-day grace period. App Store Guideline 5.1.1 compliant.';

COMMENT ON FUNCTION public.cancel_account_deletion() IS
'Cancels a pending account deletion request if within the 30-day grace period.';

COMMENT ON FUNCTION public.get_account_deletion_status() IS
'Returns the current account deletion status including days remaining if pending.';
