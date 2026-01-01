-- Create profiles_public view for public profile data access
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  user_id,
  display_name,
  first_name,
  last_name,
  email,
  avatar_url,
  bio,
  phone,
  show_email,
  show_phone,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;