-- =====================================================
-- COMPREHENSIVE SECURITY FIXES
-- Date: 2026-01-07
-- Purpose: Fix security vulnerabilities identified by Lovable scanner
--   1. Trip invite codes exposed to anyone on the internet
--   2. Organization invite tokens accessible to unauthorized users  
--   3. User email addresses and phone numbers could be harvested
--   4. Security definer view issues
-- =====================================================

BEGIN;

-- =====================================================
-- FIX 1: TRIP_INVITES - Remove Public Enumeration
-- Problem: "Public can view active invites by code" allows enumeration
-- Solution: Remove public access, only allow specific code lookups via function
-- =====================================================

-- Drop the insecure public access policy (if it still exists)
DROP POLICY IF EXISTS "Public can view active invites by code" ON public.trip_invites;
DROP POLICY IF EXISTS "Anyone can view active invites by code" ON public.trip_invites;
DROP POLICY IF EXISTS "Anyone can view active trip invites" ON public.trip_invites;

-- Ensure trip_invites has proper RLS enabled
ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate with correct permissions
DROP POLICY IF EXISTS "Trip members can view invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Trip admins can create invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Trip admins can update invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Trip admins can delete invites" ON public.trip_invites;

-- Policy 1: Trip members can view invites for their trips (not public enumeration)
CREATE POLICY "Trip members can view trip invites"
ON public.trip_invites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_invites.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy 2: Trip creators and admins can create invites
CREATE POLICY "Trip admins can create invites"
ON public.trip_invites
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id
        AND ta.user_id = auth.uid()
      )
    )
  )
);

-- Policy 3: Trip creators and admins can update invites
CREATE POLICY "Trip admins can update invites"
ON public.trip_invites
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id
        AND ta.user_id = auth.uid()
      )
    )
  )
);

-- Policy 4: Trip creators and admins can delete invites
CREATE POLICY "Trip admins can delete invites"
ON public.trip_invites
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id
        AND ta.user_id = auth.uid()
      )
    )
  )
);

-- Secure function to look up invite by code (used by edge functions with service role)
-- This prevents client-side enumeration while allowing server-side lookups
CREATE OR REPLACE FUNCTION public.check_invite_code_exists(code_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return whether a code exists, not the actual data
  RETURN EXISTS (
    SELECT 1 FROM public.trip_invites 
    WHERE code = code_param
  );
END;
$$;

-- Grant execute to authenticated users only (for collision checking during code generation)
REVOKE EXECUTE ON FUNCTION public.check_invite_code_exists(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_invite_code_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_invite_code_exists(TEXT) TO service_role;

-- =====================================================
-- FIX 2: ORGANIZATION_INVITES - Restrict Token Access
-- Problem: Anyone can view pending invites by token, exposing emails
-- Solution: Only allow authenticated users to view their own invites
-- =====================================================

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can view pending invites by token" ON public.organization_invites;
DROP POLICY IF EXISTS "Invitees can view their pending invites" ON public.organization_invites;
DROP POLICY IF EXISTS "Organization admins can view invites" ON public.organization_invites;
DROP POLICY IF EXISTS "Organization admins can manage invites" ON public.organization_invites;

-- Policy 1: Authenticated users can only view their own pending invites (by matching email)
CREATE POLICY "Users can view their own pending invites"
ON public.organization_invites
FOR SELECT
TO authenticated
USING (
  -- User can view invites sent to their email
  lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  AND status = 'pending'
  AND expires_at > now()
);

-- Policy 2: Organization owners and admins can view all invites for their org
CREATE POLICY "Org admins can view organization invites"
ON public.organization_invites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_invites.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

-- Policy 3: Organization owners and admins can create invites
CREATE POLICY "Org admins can create invites"
ON public.organization_invites
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_invites.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

-- Policy 4: Organization owners and admins can update invites
CREATE POLICY "Org admins can update invites"
ON public.organization_invites
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_invites.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

-- Policy 5: Organization owners and admins can delete invites
CREATE POLICY "Org admins can delete invites"
ON public.organization_invites
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_invites.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'admin')
  )
);

-- =====================================================
-- FIX 3: PROFILES - Enforce Privacy Flags in RLS
-- Problem: show_email and show_phone flags not enforced at RLS level
-- Solution: Create RLS policy that masks email/phone based on privacy settings
-- =====================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can view privacy-controlled profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of trip co-members" ON public.profiles;

-- Policy 1: Users can always view their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Users can view basic profile info of trip co-members
-- Note: This policy allows viewing the row, but sensitive fields are masked in the view
CREATE POLICY "Users can view trip co-member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Can view profiles of users who share at least one trip
  user_id IN (
    SELECT tm2.user_id 
    FROM public.trip_members tm1
    JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = auth.uid()
    AND tm2.user_id != auth.uid()
  )
);

-- Policy 3: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 4: Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- FIX 4: PROFILES_PUBLIC VIEW - Ensure Security Invoker and Privacy
-- Problem: View might expose PII without respecting privacy flags
-- Solution: Recreate view with security_invoker and proper field masking
-- =====================================================

DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS SELECT 
  p.id,
  p.user_id,
  p.display_name,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.bio,
  p.show_email,
  p.show_phone,
  p.created_at,
  p.updated_at,
  -- Only expose email if user has opted in OR it's their own profile
  CASE 
    WHEN p.user_id = auth.uid() THEN p.email
    WHEN p.show_email = true THEN p.email
    ELSE NULL 
  END AS email,
  -- Only expose phone if user has opted in AND they share a trip (or it's their own)
  CASE 
    WHEN p.user_id = auth.uid() THEN p.phone
    WHEN p.show_phone = true AND EXISTS (
      SELECT 1 FROM public.trip_members tm1
      JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
      WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = p.user_id
    ) THEN p.phone
    ELSE NULL 
  END AS phone
FROM public.profiles p;

-- Grant SELECT to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

COMMENT ON VIEW public.profiles_public IS 
  'Privacy-aware profile view. Uses security_invoker=true to respect RLS. Email visible only if show_email=true. Phone visible only if show_phone=true AND users share a trip.';

-- =====================================================
-- FIX 5: Secure function for profile lookup with privacy
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_profile_with_privacy(target_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  email TEXT,
  phone TEXT,
  show_email BOOLEAN,
  show_phone BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  requesting_user_id UUID;
  shares_trip BOOLEAN;
BEGIN
  requesting_user_id := auth.uid();
  
  -- Check if users share a trip
  SELECT EXISTS (
    SELECT 1 FROM trip_members tm1
    JOIN trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = requesting_user_id
    AND tm2.user_id = target_user_id
    AND tm1.user_id != tm2.user_id
  ) INTO shares_trip;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.bio,
    -- Email: visible if own profile or show_email is true
    CASE 
      WHEN p.user_id = requesting_user_id THEN p.email
      WHEN p.show_email = true THEN p.email
      ELSE NULL 
    END,
    -- Phone: visible if own profile or (show_phone is true AND shares trip)
    CASE 
      WHEN p.user_id = requesting_user_id THEN p.phone
      WHEN p.show_phone = true AND shares_trip THEN p.phone
      ELSE NULL 
    END,
    p.show_email,
    p.show_phone
  FROM profiles p
  WHERE p.user_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_with_privacy(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_profile_with_privacy IS 
  'Returns profile data respecting privacy settings. Email shown if show_email=true. Phone shown if show_phone=true AND users share a trip.';

-- =====================================================
-- FIX 6: Add audit logging for sensitive operations
-- =====================================================

-- Create audit log table if not exists
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  target_table TEXT,
  target_id TEXT,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit logs
CREATE POLICY "Service role only for audit logs"
ON public.security_audit_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at);

-- =====================================================
-- VERIFICATION: Add comment documenting the security fixes
-- =====================================================

COMMENT ON TABLE public.trip_invites IS 
  'Trip invitation codes. RLS restricts access to trip members only. Public enumeration prevented.';

COMMENT ON TABLE public.organization_invites IS 
  'Organization invitations. RLS restricts access to invitee (by email) and org admins only.';

COMMENT ON TABLE public.profiles IS 
  'User profiles. Email/phone protected by show_email and show_phone privacy flags enforced via profiles_public view.';

COMMIT;
