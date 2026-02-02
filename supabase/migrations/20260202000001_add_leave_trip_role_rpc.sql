-- Migration: Add self-service leave_trip_role RPC
-- This allows users to remove themselves from a role (leave a channel)
-- without requiring admin permissions.

-- Create the leave_trip_role function for self-service role removal
CREATE OR REPLACE FUNCTION public.leave_trip_role(
  _trip_id text, 
  _role_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role_name text;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You must be logged in to leave a role'
    );
  END IF;

  -- Check if the user actually has this role assignment
  IF NOT EXISTS (
    SELECT 1 FROM public.user_trip_roles
    WHERE trip_id = _trip_id 
    AND user_id = v_user_id 
    AND role_id = _role_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You are not assigned to this role'
    );
  END IF;

  -- Get role name for confirmation message
  SELECT role_name INTO v_role_name
  FROM public.trip_roles
  WHERE id = _role_id;

  -- Delete the user's role assignment (self-removal only)
  DELETE FROM public.user_trip_roles
  WHERE trip_id = _trip_id 
  AND user_id = v_user_id 
  AND role_id = _role_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Successfully left role: %s', COALESCE(v_role_name, 'Unknown'))
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.leave_trip_role(text, uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.leave_trip_role IS 'Self-service function allowing authenticated users to remove themselves from a trip role. Unlike remove_user_from_role, this does not require admin permissions - users can only remove their own role assignments.';
