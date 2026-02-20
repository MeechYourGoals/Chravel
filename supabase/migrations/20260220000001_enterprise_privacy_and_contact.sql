-- Add job_title and show_job_title to profiles (enterprise display name settings)
-- Add contact fields to organizations (primary contact section)

-- 1. Profiles: job title for organization directory
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS show_job_title BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.job_title IS 'User''s job title. Shown in org directory when show_job_title=true.';
COMMENT ON COLUMN public.profiles.show_job_title IS 'Whether to display job title in organization directory (under name in parentheses).';

-- 2. Organizations: primary contact fields
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_job_title TEXT;

COMMENT ON COLUMN public.organizations.contact_name IS 'Primary contact name for the organization';
COMMENT ON COLUMN public.organizations.contact_email IS 'Primary contact email for the organization';
COMMENT ON COLUMN public.organizations.contact_phone IS 'Primary contact phone for the organization';
COMMENT ON COLUMN public.organizations.contact_job_title IS 'Primary contact job title for the organization';

-- 3. Update profiles_public to expose job_title and show_job_title for client rendering
-- Uses COALESCE to support both profiles.email/phone and private_profiles.email/phone schemas
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT
  p.user_id,
  p.display_name,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.bio,
  p.show_email,
  p.show_phone,
  p.job_title,
  p.show_job_title,
  (
    CASE
      WHEN p.name_preference = 'display' AND NULLIF(TRIM(COALESCE(p.display_name, '')), '') IS NOT NULL
        THEN NULLIF(TRIM(p.display_name), '')
      WHEN NULLIF(TRIM(COALESCE(p.real_name, '')), '') IS NOT NULL
        THEN NULLIF(TRIM(p.real_name), '')
      WHEN NULLIF(TRIM(COALESCE(p.display_name, '')), '') IS NOT NULL
        THEN NULLIF(TRIM(p.display_name), '')
      WHEN NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(p.first_name), ''), NULLIF(TRIM(p.last_name), ''))), '') IS NOT NULL
        THEN NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(p.first_name), ''), NULLIF(TRIM(p.last_name), ''))), '')
      WHEN NULLIF(TRIM(p.first_name), '') IS NOT NULL
        THEN NULLIF(TRIM(p.first_name), '')
      WHEN (p.user_id = auth.uid()) AND COALESCE(COALESCE(p.email, pp.email), '') != ''
        THEN NULLIF(SPLIT_PART(COALESCE(p.email, pp.email), '@', 1), '')
      WHEN (p.show_email = true) AND public.is_trip_co_member(auth.uid(), p.user_id) AND COALESCE(COALESCE(p.email, pp.email), '') != ''
        THEN NULLIF(SPLIT_PART(COALESCE(p.email, pp.email), '@', 1), '')
      ELSE 'Chravel User'
    END
  ) AS resolved_display_name,
  CASE
    WHEN (p.user_id = auth.uid()) THEN COALESCE(p.email, pp.email)
    WHEN ((p.show_email = true) AND public.is_trip_co_member(auth.uid(), p.user_id)) THEN COALESCE(p.email, pp.email)
    ELSE NULL::text
  END AS email,
  CASE
    WHEN (p.user_id = auth.uid()) THEN COALESCE(p.phone, pp.phone)
    WHEN ((p.show_phone = true) AND public.is_trip_co_member(auth.uid(), p.user_id)) THEN COALESCE(p.phone, pp.phone)
    ELSE NULL::text
  END AS phone
FROM public.profiles p
LEFT JOIN public.private_profiles pp ON p.id = pp.id
WHERE auth.uid() IS NOT NULL;

GRANT SELECT ON public.profiles_public TO authenticated;

COMMENT ON VIEW public.profiles_public IS 'Public profile view. resolved_display_name respects name_preference. job_title and show_job_title exposed for org directory display.';
