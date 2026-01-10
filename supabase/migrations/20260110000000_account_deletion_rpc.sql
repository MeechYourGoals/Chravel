-- Migration: Account Deletion RPC Function
-- 
-- Creates a SECURITY DEFINER function that initiates account deletion.
-- The actual deletion is handled by the delete-account Edge Function,
-- but this RPC provides a convenient wrapper for the client.
--
-- DATA HANDLING STRATEGY:
-- This function is a thin wrapper - the Edge Function handles:
-- 1. Profile anonymization (soft delete with PII removal)
-- 2. Trip membership removal
-- 3. Owned trip handling (delete if empty, transfer if has members)
-- 4. Storage cleanup (avatars, media)
-- 5. Auth user deletion

-- Create the RPC function that the client can call
-- This function returns a record indicating that deletion should proceed via Edge Function
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_result jsonb;
BEGIN
  -- Get the current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated',
      'code', 'AUTH_REQUIRED'
    );
  END IF;
  
  -- Verify user exists in profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found',
      'code', 'PROFILE_NOT_FOUND'
    );
  END IF;
  
  -- Check if user is already marked as deleted
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = v_user_id 
    AND subscription_status = 'deleted'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Account already deleted or pending deletion',
      'code', 'ALREADY_DELETED'
    );
  END IF;
  
  -- Return instruction to proceed with Edge Function
  -- The Edge Function will handle the actual deletion with service role
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Please proceed with Edge Function deletion',
    'code', 'PROCEED_TO_EDGE_FUNCTION',
    'user_id', v_user_id
  );
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

-- Revoke from public/anon for security
REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM public;

-- Add comment documenting the function
COMMENT ON FUNCTION public.request_account_deletion() IS 
  'Initiates account deletion process. Returns success indicating the client should call the delete-account Edge Function. The Edge Function handles actual data cleanup and auth user deletion.';

-- Create a helper view for debugging/admin (not exposed to clients)
-- This allows admins to see deleted accounts
CREATE OR REPLACE VIEW admin_deleted_accounts AS
SELECT 
  user_id,
  display_name,
  updated_at as deleted_at
FROM public.profiles
WHERE subscription_status = 'deleted'
  AND display_name = '[Deleted User]';

-- This view is for admin use only, no RLS exposure
REVOKE ALL ON admin_deleted_accounts FROM anon;
REVOKE ALL ON admin_deleted_accounts FROM authenticated;

-- Grant to service role only
GRANT SELECT ON admin_deleted_accounts TO service_role;

COMMENT ON VIEW admin_deleted_accounts IS 
  'Admin-only view to see deleted/anonymized user accounts for compliance auditing.';
