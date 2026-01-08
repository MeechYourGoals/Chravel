-- Create the check_invite_code_exists function for secure invite code validation
-- This prevents enumeration attacks by only returning boolean, not exposing table data

CREATE OR REPLACE FUNCTION public.check_invite_code_exists(code_param text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM trip_invites
    WHERE code = code_param
      AND is_active = true
  )
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_invite_code_exists(text) TO authenticated;