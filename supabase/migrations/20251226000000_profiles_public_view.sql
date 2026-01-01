-- Enforce profile contact privacy by restricting direct column access
-- and providing a privacy-aware view for email/phone exposure.

REVOKE SELECT (email, phone) ON public.profiles FROM authenticated;
REVOKE SELECT (email, phone) ON public.profiles FROM anon;

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
    WHEN p.show_email = true OR p.user_id = auth.uid() THEN p.email
    ELSE NULL
  END AS email,
  CASE
    WHEN p.show_phone = true OR p.user_id = auth.uid() THEN p.phone
    ELSE NULL
  END AS phone
FROM public.profiles p;

GRANT SELECT ON public.profiles_public TO authenticated;
