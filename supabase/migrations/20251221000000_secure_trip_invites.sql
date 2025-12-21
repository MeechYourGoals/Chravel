-- Remove insecure public access policy that allowed enumerating all invites
DROP POLICY IF EXISTS "Public can view active invites by code" ON public.trip_invites;

-- Ensure code column has unique constraint to prevent duplicates
-- We wrap in DO block to avoid error if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trip_invites_code_key'
    ) THEN
        ALTER TABLE public.trip_invites ADD CONSTRAINT trip_invites_code_key UNIQUE (code);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Create secure function to check code existence without exposing table data
-- This prevents enumeration while allowing the app to check for collisions during generation
CREATE OR REPLACE FUNCTION public.check_invite_code_exists(code_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trip_invites 
    WHERE code = code_param
  );
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.check_invite_code_exists(TEXT) TO anon, authenticated, service_role;
