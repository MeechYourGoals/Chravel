-- Security Audit Remediation (2026-03-15)
-- Addresses remaining findings from security audit:
--   1. invite_links: Anonymous enumeration of active invite links
--   2. get_visible_profile_fields: Sensitive field exposure to non-owners
--
-- Backward compatibility:
--   - get-invite-preview edge function uses service_role (bypasses RLS) → unaffected
--   - join-trip edge function uses service_role (bypasses RLS) → unaffected
--   - All frontend invite flows go through edge functions, not direct table reads
--   - All frontend co-member profile reads use profiles_public view, not base table
--   - get_visible_profile_fields preserves TABLE return type and parameter names
--     to avoid breaking any callers (no callers found, but signature is preserved)

BEGIN;

-- ============================================================================
-- FIX 1: invite_links — Remove anonymous enumeration
-- Previously: "Anyone can view active invite links" with USING (is_active = true)
-- allowed unauthenticated users to enumerate all active invite links including
-- trip_id, code, and created_by fields.
--
-- Fix: Replace with trip-member-scoped SELECT policy.
-- Anonymous invite redemption goes through get-invite-preview edge function
-- which uses service_role and bypasses RLS.
--
-- Existing write policies are correctly scoped:
--   INSERT: "Users can create invite links" WITH CHECK (auth.uid() = created_by)
--   UPDATE: "Users can update their own invite links" USING (auth.uid() = created_by)
-- ============================================================================

-- Drop the overly permissive anonymous SELECT policy
DROP POLICY IF EXISTS "Anyone can view active invite links" ON public.invite_links;

-- Trip members can view invite links for trips they belong to
-- This supports the "manage invites" UI for trip members
-- Both invite_links.trip_id and trip_members.trip_id are TEXT — no cast needed
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invite_links'
    AND policyname = 'Trip members can view invite links'
  ) THEN
    CREATE POLICY "Trip members can view invite links"
    ON public.invite_links
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.trip_members tm
        WHERE tm.trip_id = invite_links.trip_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
      )
    );
  END IF;
END $$;

-- ============================================================================
-- FIX 2: get_visible_profile_fields — Exclude sensitive fields for non-owners
--
-- The existing function (from migrations 20251111 + 20251119) returns profile
-- data with email/phone privacy enforcement, but does NOT filter out billing,
-- subscription, quota, or admin fields for non-owner viewers.
--
-- This replacement:
--   - Preserves the TABLE return type (no signature break)
--   - Preserves parameter names (profile_user_id, requesting_user_id)
--   - Returns display-safe fields for co-members (excludes billing/quota/admin)
--   - Returns minimal fields for non-co-members
--   - Returns full profile for owner
--
-- The profiles_public view (migration 20260220000001) is the canonical safe
-- read path for co-member profiles and already excludes sensitive columns.
-- This function provides defense-in-depth for any direct RPC callers.
-- ============================================================================

-- Replace the overload with explicit second parameter (the canonical one per types.ts)
CREATE OR REPLACE FUNCTION public.get_visible_profile_fields(
  profile_user_id UUID,
  requesting_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  show_email BOOLEAN,
  show_phone BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner BOOLEAN;
  is_co_member BOOLEAN;
BEGIN
  is_owner := (profile_user_id = requesting_user_id);

  -- Check if requesting user shares a trip with the profile owner
  IF NOT is_owner THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trip_members tm1
      JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
      WHERE tm1.user_id = requesting_user_id
      AND tm2.user_id = profile_user_id
      AND tm1.status = 'active'
      AND tm2.status = 'active'
    ) INTO is_co_member;
  ELSE
    is_co_member := false;
  END IF;

  IF is_owner THEN
    -- Owner sees full profile
    RETURN QUERY
    SELECT
      p.user_id,
      p.display_name,
      p.avatar_url,
      p.bio,
      p.email,
      p.phone,
      p.first_name,
      p.last_name,
      p.show_email,
      p.show_phone
    FROM public.profiles p
    WHERE p.user_id = profile_user_id;
  ELSIF is_co_member THEN
    -- Co-member sees display-safe fields; email/phone gated by privacy flags
    -- No billing, quota, subscription, or admin data returned
    RETURN QUERY
    SELECT
      p.user_id,
      p.display_name,
      p.avatar_url,
      p.bio,
      CASE WHEN p.show_email THEN p.email ELSE NULL END,
      CASE WHEN p.show_phone THEN p.phone ELSE NULL END,
      p.first_name,
      p.last_name,
      p.show_email,
      p.show_phone
    FROM public.profiles p
    WHERE p.user_id = profile_user_id;
  ELSE
    -- Not owner or co-member: minimal fields only
    RETURN QUERY
    SELECT
      p.user_id,
      p.display_name,
      p.avatar_url,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::BOOLEAN,
      NULL::BOOLEAN
    FROM public.profiles p
    WHERE p.user_id = profile_user_id;
  END IF;
END;
$$;

-- Also replace the overload with DEFAULT parameter (from migration 20251111)
-- to keep both signatures consistent
CREATE OR REPLACE FUNCTION public.get_visible_profile_fields(
  profile_user_id UUID,
  viewer_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  bio TEXT,
  show_email BOOLEAN,
  show_phone BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner BOOLEAN;
  is_co_member BOOLEAN;
BEGIN
  is_owner := (profile_user_id = viewer_id);

  IF NOT is_owner THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trip_members tm1
      JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
      WHERE tm1.user_id = viewer_id
      AND tm2.user_id = profile_user_id
      AND tm1.status = 'active'
      AND tm2.status = 'active'
    ) INTO is_co_member;
  ELSE
    is_co_member := false;
  END IF;

  IF is_owner THEN
    -- Owner sees full profile
    RETURN QUERY
    SELECT
      p.id,
      p.user_id,
      p.display_name,
      p.avatar_url,
      p.email,
      p.phone,
      p.first_name,
      p.last_name,
      p.bio,
      p.show_email,
      p.show_phone,
      p.created_at,
      p.updated_at
    FROM public.profiles p
    WHERE p.user_id = profile_user_id;
  ELSIF is_co_member THEN
    -- Co-member: display-safe fields, email/phone gated by privacy flags
    RETURN QUERY
    SELECT
      p.id,
      p.user_id,
      p.display_name,
      p.avatar_url,
      CASE WHEN p.show_email THEN p.email ELSE NULL END,
      CASE WHEN p.show_phone THEN p.phone ELSE NULL END,
      p.first_name,
      p.last_name,
      p.bio,
      p.show_email,
      p.show_phone,
      p.created_at,
      p.updated_at
    FROM public.profiles p
    WHERE p.user_id = profile_user_id;
  ELSE
    -- Not owner or co-member: minimal fields
    RETURN QUERY
    SELECT
      p.id,
      p.user_id,
      p.display_name,
      p.avatar_url,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::BOOLEAN,
      NULL::BOOLEAN,
      p.created_at,
      p.updated_at
    FROM public.profiles p
    WHERE p.user_id = profile_user_id;
  END IF;
END;
$$;

-- Grant execute permissions (matching existing grants)
GRANT EXECUTE ON FUNCTION public.get_visible_profile_fields(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visible_profile_fields(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visible_profile_fields(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.get_visible_profile_fields(UUID, UUID) IS
  'Returns profile fields based on viewer relationship. Owner sees all fields. '
  'Co-members see display-safe fields with email/phone gated by privacy flags. '
  'Others see only display_name and avatar_url. '
  'Billing, quota, subscription, and admin data are never exposed through this function.';

-- ============================================================================
-- VERIFICATION COMMENTS
-- ============================================================================

COMMENT ON TABLE public.invite_links IS
  'Trip invite links. RLS restricts SELECT to authenticated trip members only. '
  'Anonymous enumeration prevented. Edge functions use service_role for public invite preview/redemption.';

COMMIT;
