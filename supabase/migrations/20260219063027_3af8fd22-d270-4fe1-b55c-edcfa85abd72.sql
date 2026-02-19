
-- Fix 1: Add missing real_name and name_preference columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS real_name text,
  ADD COLUMN IF NOT EXISTS name_preference text DEFAULT 'display';

-- Fix 2: Recreate profiles_public view with real_name, name_preference, and updated resolved_display_name
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
  SELECT 
    user_id,
    display_name,
    real_name,
    name_preference,
    avatar_url,
    first_name,
    last_name,
    CASE
      WHEN name_preference = 'display' AND NULLIF(display_name, '') IS NOT NULL THEN display_name
      WHEN NULLIF(real_name, '') IS NOT NULL THEN real_name
      WHEN NULLIF(display_name, '') IS NOT NULL THEN display_name
      WHEN NULLIF(concat(first_name, ' ', last_name), ' ') IS NOT NULL THEN concat(first_name, ' ', last_name)
      ELSE 'User'
    END AS resolved_display_name,
    CASE
      WHEN (show_email = true AND is_trip_co_member(auth.uid(), user_id)) THEN email
      ELSE NULL
    END AS email,
    CASE
      WHEN (show_phone = true AND is_trip_co_member(auth.uid(), user_id)) THEN phone
      ELSE NULL
    END AS phone
  FROM profiles
  WHERE auth.uid() IS NOT NULL;
