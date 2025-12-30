-- Fix profiles_public leakage (PII + row exposure)
--
-- Context:
-- - `public.profiles` contains PII (email/phone).
-- - RLS can be bypassed unintentionally when exposing data through a VIEW owned by a privileged role.
-- - A previous migration (20251230211119_...) recreated `profiles_public` and granted it to `anon`,
--   selecting raw email/phone without privacy gating.
--
-- Goal:
-- - Ensure `profiles_public` only returns rows that would be visible under the intended co-member rules.
-- - Ensure email/phone are only returned when the user opted-in (show_*) or when the requester is the owner.
-- - Avoid app-wide TypeScript cascades by keeping the existing `profiles_public` interface stable.

-- Defense-in-depth: authenticated/anon should not be able to read raw contact columns from the base table.
REVOKE SELECT (email, phone) ON public.profiles FROM authenticated;
REVOKE SELECT (email, phone) ON public.profiles FROM anon;

-- Recreate the view with explicit visibility + privacy gating.
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
  -- Always allow users to see their own profile in the view
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

-- Tighten exposure: do not allow unauthenticated access to the profile directory.
REVOKE ALL ON public.profiles_public FROM anon;
GRANT SELECT ON public.profiles_public TO authenticated;

