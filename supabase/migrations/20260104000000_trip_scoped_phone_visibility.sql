-- Trip-Scoped Phone Visibility
-- Enables phone number sharing only between users who share at least one trip
-- This respects the existing show_phone privacy flag while adding trip-scoping

-- Function to check if two users share at least one trip
CREATE OR REPLACE FUNCTION public.users_share_trip(viewer_id uuid, target_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members tm1
    JOIN trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = viewer_id 
    AND tm2.user_id = target_id
    AND tm1.user_id != tm2.user_id
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.users_share_trip(uuid, uuid) TO authenticated;

-- Update the profiles_public view to enforce trip-scoped phone visibility
-- Phone is only visible if:
-- 1. It's the user's own profile, OR
-- 2. show_phone is true AND the viewer shares at least one trip with the target
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
    WHEN p.user_id = auth.uid() THEN pp.email
    WHEN p.show_email = true THEN pp.email
    ELSE NULL
  END AS email,
  CASE
    WHEN p.user_id = auth.uid() THEN pp.phone
    WHEN p.show_phone = true AND public.users_share_trip(auth.uid(), p.user_id) THEN pp.phone
    ELSE NULL
  END AS phone
FROM public.profiles p
LEFT JOIN public.private_profiles pp ON p.id = pp.id;

-- Ensure authenticated users can select from the view
GRANT SELECT ON public.profiles_public TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.users_share_trip IS 
  'Returns true if two users share at least one trip. Used for trip-scoped contact visibility.';

COMMENT ON VIEW public.profiles_public IS 
  'Privacy-aware view of profiles. Phone/email only visible based on privacy settings and trip membership.';
