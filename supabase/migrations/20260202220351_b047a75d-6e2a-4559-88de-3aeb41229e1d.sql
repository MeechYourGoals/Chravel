-- Fix "Unknown User" issue by relaxing profiles_public view restrictions
-- and improving is_trip_co_member() to handle trip creators

-- First, update is_trip_co_member() to also check if viewer is trip creator
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

-- Drop and recreate profiles_public view with relaxed WHERE clause
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
    user_id,
    display_name,
    avatar_url,
    first_name,
    last_name,
    -- Computed field for reliable name display
    COALESCE(
        NULLIF(display_name, ''),
        NULLIF(CONCAT(first_name, ' ', last_name), ' '),
        'User'
    ) AS resolved_display_name,
    -- Protected fields - only visible to trip co-members with privacy settings
    CASE 
        WHEN show_email = true AND is_trip_co_member(auth.uid(), user_id) THEN email 
        ELSE NULL 
    END AS email,
    CASE 
        WHEN show_phone = true AND is_trip_co_member(auth.uid(), user_id) THEN phone 
        ELSE NULL 
    END AS phone
FROM public.profiles
WHERE auth.uid() IS NOT NULL;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;