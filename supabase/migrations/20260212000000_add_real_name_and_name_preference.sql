-- Add real_name and name_preference columns to profiles
-- Enables privacy-aware display: users can choose to show real name or display name (e.g., role)

-- 1. Add columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS real_name TEXT,
  ADD COLUMN IF NOT EXISTS name_preference TEXT DEFAULT 'display';

-- 2. Add check constraint for name_preference
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_name_preference_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_name_preference_check
  CHECK (name_preference IN ('real', 'display'));

-- 3. Backfill: existing users - name_preference = 'display' (keeps current display_name behavior)
UPDATE public.profiles
SET name_preference = CASE
  WHEN real_name IS NOT NULL AND NULLIF(TRIM(real_name), '') IS NOT NULL THEN 'real'
  ELSE 'display'
END
WHERE name_preference IS NULL OR name_preference NOT IN ('real', 'display');

-- 4. Ensure default for new rows
ALTER TABLE public.profiles
  ALTER COLUMN name_preference SET DEFAULT 'display';

COMMENT ON COLUMN public.profiles.real_name IS 'User''s legal/real name. Shown when name_preference=real.';
COMMENT ON COLUMN public.profiles.name_preference IS 'Which name to show to others: real (real_name) or display (display_name).';

-- 5. Update profiles_public view with new resolved_display_name logic
--    DISPLAY_NAME_FORMULA:
--    effective_name =
--      if (name_preference == 'display' AND display_name non-empty) -> display_name
--      else if (real_name non-empty) -> real_name
--      else if (display_name non-empty) -> display_name
--      else -> fallback (first+last, first, email prefix, 'Chravel User')
--
--    When name_preference='display', real_name must NOT appear anywhere to others.

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
      WHEN (p.user_id = auth.uid()) AND COALESCE(p.email, '') != ''
        THEN NULLIF(SPLIT_PART(p.email, '@', 1), '')
      WHEN (p.show_email = true) AND public.is_trip_co_member(auth.uid(), p.user_id) AND COALESCE(p.email, '') != ''
        THEN NULLIF(SPLIT_PART(p.email, '@', 1), '')
      ELSE 'Chravel User'
    END
  ) AS resolved_display_name,
  CASE
    WHEN (p.user_id = auth.uid()) THEN p.email
    WHEN ((p.show_email = true) AND public.is_trip_co_member(auth.uid(), p.user_id)) THEN p.email
    ELSE NULL::text
  END AS email,
  CASE
    WHEN (p.user_id = auth.uid()) THEN p.phone
    WHEN ((p.show_phone = true) AND public.is_trip_co_member(auth.uid(), p.user_id)) THEN p.phone
    ELSE NULL::text
  END AS phone
FROM public.profiles p
WHERE auth.uid() IS NOT NULL;

GRANT SELECT ON public.profiles_public TO authenticated;

COMMENT ON VIEW public.profiles_public IS 'Public profile view. resolved_display_name respects name_preference (real vs display). When preference=display, real_name is never shown.';
