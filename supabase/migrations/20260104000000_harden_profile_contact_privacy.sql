-- Harden profile contact privacy (email/phone) at the database layer.
--
-- Problem:
-- - `public.profiles` includes email + phone.
-- - Row-level policies can limit *rows* but not *columns*, so trip co-members can still
--   exfiltrate contact info even when `show_email/show_phone` are false.
--
-- Solution (defense-in-depth):
-- 1) Revoke direct SELECT privileges on `profiles.email` and `profiles.phone` for `anon/authenticated`.
-- 2) Expose a privacy-aware surface via `public.profiles_public` that:
--    - only returns rows for self or users who share a trip
--    - only returns email/phone when explicitly shared (show_*) or when the requester is the owner
-- 3) Remove unauthenticated access to the directory view.
--
-- Notes:
-- - This intentionally avoids relying on RLS for column-level protection (Postgres can't).
-- - `profiles_public` is created as a SECURITY BARRIER view; row visibility is enforced in the view
--   predicate to avoid accidental widening from future base-table policy changes.
-- - Keep this migration idempotent.

-- ---------------------------------------------------------------------------
-- 1) Revoke direct access to raw contact columns (if they exist)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email'
  ) THEN
    REVOKE SELECT (email) ON public.profiles FROM authenticated;
    REVOKE SELECT (email) ON public.profiles FROM anon;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'phone'
  ) THEN
    REVOKE SELECT (phone) ON public.profiles FROM authenticated;
    REVOKE SELECT (phone) ON public.profiles FROM anon;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Privacy-aware profile directory view (masked contact fields)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
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
    WHEN p.user_id = auth.uid() OR p.show_email IS TRUE THEN p.email
    ELSE NULL
  END AS email,
  CASE
    WHEN p.user_id = auth.uid() OR p.show_phone IS TRUE THEN p.phone
    ELSE NULL
  END AS phone
FROM public.profiles p
WHERE
  -- Always allow users to see their own profile in the directory view
  p.user_id = auth.uid()
  OR
  -- Co-member visibility: only users who share at least one trip
  EXISTS (
    SELECT 1
    FROM public.trip_members tm1
    JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = auth.uid()
      AND tm2.user_id = p.user_id
  );

REVOKE ALL ON public.profiles_public FROM anon;
GRANT SELECT ON public.profiles_public TO authenticated;

COMMENT ON VIEW public.profiles_public IS
'Privacy-aware profile directory view. Rows limited to self + trip co-members. email/phone only returned when show_* is true or for the profile owner. Raw email/phone columns are not directly selectable by authenticated/anon.';

