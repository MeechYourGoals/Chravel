-- PROFILES_PRIVACY_LEAK
-- Enforce show_email/show_phone at the database boundary.
--
-- Background:
-- - `public.profiles` contains PII (email/phone) and historically had SELECT policies that
--   allowed any trip co-member to read the full row.
-- - Postgres RLS is row-level only; it cannot selectively hide individual columns.
-- - Therefore, a co-member SELECT policy on `profiles` implicitly exposes *all* columns,
--   including email/phone, even when show_email/show_phone are false.
--
-- Fix:
-- 1) Restrict direct SELECT on `public.profiles` to the profile owner (self) only.
-- 2) Provide a privacy-aware directory view (`public.profiles_public`) for co-member access,
--    which masks email/phone via CASE expressions honoring show_email/show_phone.
-- 3) Ensure `anon` cannot enumerate profiles.
--
-- Notes:
-- - This migration is written to be resilient across environments where `profiles.email/phone`
--   may have been removed (e.g. secure_profiles hardening). In that case, the view still
--   exposes `email`/`phone` as NULL columns for interface compatibility.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ensure privacy flags exist (safe/idempotent).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_email boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_phone boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- Lock down base table access: self-only SELECT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profile information" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of trip co-members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view privacy-controlled profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Preserve expected write policies (idempotently recreate).
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Co-member directory view: row visibility + field-level privacy gating
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  has_email boolean;
  has_phone boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email'
  ) INTO has_email;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'phone'
  ) INTO has_phone;

  IF has_email AND has_phone THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.profiles_public
      WITH (security_barrier = true)
      AS
      SELECT
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
        CASE
          WHEN p.user_id = auth.uid() OR p.show_email = true THEN p.email
          ELSE NULL
        END AS email,
        CASE
          WHEN p.user_id = auth.uid() OR p.show_phone = true THEN p.phone
          ELSE NULL
        END AS phone
      FROM public.profiles p
      WHERE
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.trip_members tm1
          JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
          WHERE tm1.user_id = auth.uid()
            AND tm2.user_id = p.user_id
        );
    $view$;
  ELSE
    -- If contact columns do not exist on base table, keep a stable interface:
    -- expose email/phone as NULL and continue to enforce row visibility for co-members.
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.profiles_public
      WITH (security_barrier = true)
      AS
      SELECT
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
        NULL::text AS email,
        NULL::text AS phone
      FROM public.profiles p
      WHERE
        p.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.trip_members tm1
          JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
          WHERE tm1.user_id = auth.uid()
            AND tm2.user_id = p.user_id
        );
    $view$;
  END IF;
END $$;

REVOKE ALL ON public.profiles_public FROM anon;
GRANT SELECT ON public.profiles_public TO authenticated;

