-- Fix "Unknown User" issue by relaxing profiles_public view restrictions
-- and improving is_trip_co_member() function

-- 1. Update is_trip_co_member() to also check if viewer is trip creator
CREATE OR REPLACE FUNCTION public.is_trip_co_member(viewer_id uuid, target_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    -- Original check: both users are members of the same trip
    SELECT 1
    FROM trip_members tm1
    JOIN trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = viewer_id
      AND tm2.user_id = target_user_id
  )
  OR EXISTS (
    -- New check: viewer is trip creator and target is a member
    SELECT 1
    FROM trips t
    JOIN trip_members tm ON tm.trip_id = t.id
    WHERE t.created_by = viewer_id
      AND tm.user_id = target_user_id
  )
  OR EXISTS (
    -- New check: target is trip creator and viewer is a member
    SELECT 1
    FROM trips t
    JOIN trip_members tm ON tm.trip_id = t.id
    WHERE t.created_by = target_user_id
      AND tm.user_id = viewer_id
  )
$function$;

-- 2. Recreate profiles_public view with relaxed WHERE clause
-- Any authenticated user can see basic profile info
-- Sensitive fields (email, phone) still require privacy settings + co-membership
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.first_name,
  p.last_name,
  p.show_email,
  p.show_phone,
  -- Sensitive fields: only show if privacy settings allow AND users share a trip
  CASE 
    WHEN p.show_email = true AND is_trip_co_member(auth.uid(), p.user_id) THEN p.email
    WHEN p.user_id = auth.uid() THEN p.email
    ELSE NULL
  END AS email,
  CASE 
    WHEN p.show_phone = true AND is_trip_co_member(auth.uid(), p.user_id) THEN p.phone
    WHEN p.user_id = auth.uid() THEN p.phone
    ELSE NULL
  END AS phone,
  -- Resolved display name: reliable fallback chain for display
  COALESCE(
    NULLIF(TRIM(p.display_name), ''),
    NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
    NULLIF(TRIM(p.first_name), ''),
    SPLIT_PART(p.email, '@', 1),
    'User'
  ) AS resolved_display_name
FROM public.profiles p
WHERE auth.uid() IS NOT NULL;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO authenticated;

COMMENT ON VIEW public.profiles_public IS 'Public view of profiles with privacy-protected sensitive fields. Basic info visible to all authenticated users; email/phone require privacy settings + trip co-membership.';