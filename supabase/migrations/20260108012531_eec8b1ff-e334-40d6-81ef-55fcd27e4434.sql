-- Fix trip_invites enumeration risk by requiring authentication
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view active invites by code" ON public.trip_invites;
DROP POLICY IF EXISTS "Anyone can view active invites by code" ON public.trip_invites;

-- Create authenticated-only policy for viewing active invites
CREATE POLICY "Authenticated users can view active invites by code"
ON public.trip_invites
FOR SELECT
TO authenticated
USING (is_active = true);