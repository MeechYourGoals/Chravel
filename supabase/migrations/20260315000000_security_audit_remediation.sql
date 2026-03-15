-- Security Audit Remediation (2026-03-15)
-- Addresses remaining findings from security audit:
--   1. invite_links: Anonymous enumeration of active invite links
--   2. profiles_public: Document that view is canonical safe path for co-member reads
--
-- Backward compatibility:
--   - get-invite-preview edge function uses service_role (bypasses RLS) → unaffected
--   - join-trip edge function uses service_role (bypasses RLS) → unaffected
--   - All frontend invite flows go through edge functions, not direct table reads
--   - All frontend co-member profile reads use profiles_public view, not base table

BEGIN;

-- ============================================================================
-- FIX 1: invite_links — Remove anonymous enumeration
-- Previously: "Anyone can view active invite links" with USING (is_active = true)
-- allowed unauthenticated users to enumerate all active invite links including
-- trip_id, code, and created_by fields.
--
-- Fix: Replace with trip-member-scoped SELECT and creator-scoped write policies.
-- Anonymous invite redemption goes through get-invite-preview edge function
-- which uses service_role and bypasses RLS.
-- ============================================================================

-- Drop the overly permissive anonymous SELECT policy
DROP POLICY IF EXISTS "Anyone can view active invite links" ON public.invite_links;

-- Trip members can view invite links for trips they belong to
-- This supports the "manage invites" UI for trip members
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
        WHERE tm.trip_id::text = invite_links.trip_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
      )
    );
  END IF;
END $$;

-- Invite link creators can manage (update/delete) their own links
-- INSERT policy already exists: "Users can create invite links" WITH CHECK (auth.uid() = created_by)
-- UPDATE policy already exists: "Users can update their own invite links" USING (auth.uid() = created_by)
-- No additional write policies needed.

-- ============================================================================
-- FIX 2: profiles — Sensitive field exposure documentation
-- The profiles_public view (last updated in migration 20260220000001) already
-- excludes billing/quota fields (subscription_status, subscription_product_id,
-- app_role, free_pro_trips_used, free_pro_trip_limit, free_events_used,
-- free_event_limit, stripe_customer_id, stripe_subscription_id, etc.)
-- and masks email/phone based on privacy flags.
--
-- All frontend co-member profile reads go through profiles_public view.
-- All direct profiles table queries are for the authenticated user's own profile.
-- This was verified by grep: every .from('profiles') call in src/ uses
-- .eq('user_id', user.id) or .eq('id', user.id) where user is auth.uid().
--
-- The base table RLS policy "Users can view trip co-member profiles" still
-- grants full row access to co-members at the RLS level. Postgres RLS is
-- row-level only and cannot filter columns. The view layer provides the
-- column-level filtering.
--
-- For defense-in-depth, we also update get_visible_profile_fields() to
-- explicitly exclude billing/quota fields for non-owners.
-- ============================================================================

-- Update get_visible_profile_fields to exclude billing/quota fields for non-owners
CREATE OR REPLACE FUNCTION public.get_visible_profile_fields(
  profile_user_id UUID,
  viewer_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  is_owner BOOLEAN;
  is_co_member BOOLEAN;
BEGIN
  is_owner := (profile_user_id = viewer_id);

  -- Check if viewer shares a trip with the profile owner
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
    -- Owner gets full profile
    SELECT jsonb_build_object(
      'user_id', p.user_id,
      'display_name', p.display_name,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'real_name', p.real_name,
      'name_preference', p.name_preference,
      'avatar_url', p.avatar_url,
      'bio', p.bio,
      'email', p.email,
      'phone', p.phone,
      'show_email', p.show_email,
      'show_phone', p.show_phone,
      'job_title', p.job_title,
      'show_job_title', p.show_job_title,
      'app_role', p.app_role,
      'role', p.role,
      'subscription_status', p.subscription_status,
      'subscription_product_id', p.subscription_product_id,
      'subscription_end', p.subscription_end,
      'free_pro_trips_used', p.free_pro_trips_used,
      'free_pro_trip_limit', p.free_pro_trip_limit,
      'free_events_used', p.free_events_used,
      'free_event_limit', p.free_event_limit,
      'notification_settings', p.notification_settings,
      'timezone', p.timezone,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ) INTO result
    FROM public.profiles p
    WHERE p.user_id = profile_user_id;
  ELSIF is_co_member THEN
    -- Co-member gets display-safe fields only (NO billing/quota/admin data)
    SELECT jsonb_build_object(
      'user_id', p.user_id,
      'display_name', p.display_name,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'real_name', p.real_name,
      'name_preference', p.name_preference,
      'avatar_url', p.avatar_url,
      'bio', p.bio,
      'show_email', p.show_email,
      'show_phone', p.show_phone,
      'job_title', CASE WHEN p.show_job_title THEN p.job_title ELSE NULL END,
      'show_job_title', p.show_job_title,
      'email', CASE WHEN p.show_email THEN p.email ELSE NULL END,
      'phone', CASE WHEN p.show_phone THEN p.phone ELSE NULL END,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ) INTO result
    FROM public.profiles p
    WHERE p.user_id = profile_user_id;
  ELSE
    -- Not owner or co-member: minimal fields only
    SELECT jsonb_build_object(
      'user_id', p.user_id,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ) INTO result
    FROM public.profiles p
    WHERE p.user_id = profile_user_id;
  END IF;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Grant execute to authenticated users
REVOKE ALL ON FUNCTION public.get_visible_profile_fields(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_visible_profile_fields(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_visible_profile_fields(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.get_visible_profile_fields IS
  'Returns profile fields based on viewer relationship. Owner sees all fields. '
  'Co-members see display-safe fields only (no billing, quota, subscription, or admin data). '
  'Others see only display_name and avatar_url.';

-- ============================================================================
-- VERIFICATION COMMENTS
-- ============================================================================

COMMENT ON TABLE public.invite_links IS
  'Trip invite links. RLS restricts SELECT to authenticated trip members only. '
  'Anonymous enumeration prevented. Edge functions use service_role for public invite preview/redemption.';

COMMIT;
