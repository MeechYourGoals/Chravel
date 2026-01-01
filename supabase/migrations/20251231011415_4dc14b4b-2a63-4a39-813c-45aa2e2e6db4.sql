-- Fix Security Definer View: profiles_public
-- The view currently runs with definer (postgres) permissions, bypassing RLS on profiles table
-- Recreating with security_invoker = true ensures RLS policies on profiles are respected

-- Drop and recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS SELECT 
    id,
    user_id,
    display_name,
    first_name,
    last_name,
    avatar_url,
    bio,
    show_email,
    show_phone,
    created_at,
    updated_at,
    -- Only expose email/phone based on user's privacy settings
    CASE WHEN show_email = true THEN email ELSE NULL END AS email,
    CASE WHEN show_phone = true THEN phone ELSE NULL END AS phone
FROM public.profiles;

-- Grant SELECT to authenticated and anon roles
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- Add comment documenting the view purpose and security model
COMMENT ON VIEW public.profiles_public IS 'Public-facing profile view with security_invoker=true. Respects RLS policies on profiles table. Email/phone only visible when user has enabled show_email/show_phone.';