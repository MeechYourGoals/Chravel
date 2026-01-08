-- Fix profiles table to restrict sensitive data exposure
-- Only show email/phone when user explicitly allows AND viewer is a trip co-member

-- Step 1: Drop existing overly permissive SELECT policies
DROP POLICY IF EXISTS "Users can view privacy-controlled profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of trip co-members" ON public.profiles;

-- Step 2: Create a secure helper function to check if viewer is a trip co-member
CREATE OR REPLACE FUNCTION public.is_trip_co_member(viewer_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM trip_members tm1
    JOIN trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = viewer_id
      AND tm2.user_id = target_user_id
  )
$$;

-- Step 3: Create a secure view that exposes only appropriate profile data
-- This view uses SECURITY INVOKER (default) so RLS applies to the viewer
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
SELECT 
  user_id,
  -- Always visible public fields
  display_name,
  avatar_url,
  bio,
  app_role,
  role,
  timezone,
  created_at,
  updated_at,
  -- Subscription status (non-sensitive)
  subscription_status,
  -- Conditional fields - only show if user explicitly allows AND viewer is co-member
  CASE 
    WHEN user_id = auth.uid() THEN email
    WHEN show_email = true AND public.is_trip_co_member(auth.uid(), user_id) THEN email
    ELSE NULL
  END as email,
  CASE 
    WHEN user_id = auth.uid() THEN phone
    WHEN show_phone = true AND public.is_trip_co_member(auth.uid(), user_id) THEN phone
    ELSE NULL
  END as phone,
  -- First/last name - only visible to self or trip co-members
  CASE 
    WHEN user_id = auth.uid() THEN first_name
    WHEN public.is_trip_co_member(auth.uid(), user_id) THEN first_name
    ELSE NULL
  END as first_name,
  CASE 
    WHEN user_id = auth.uid() THEN last_name
    WHEN public.is_trip_co_member(auth.uid(), user_id) THEN last_name
    ELSE NULL
  END as last_name,
  -- Privacy settings visible to user
  CASE 
    WHEN user_id = auth.uid() THEN show_email
    ELSE NULL
  END as show_email,
  CASE 
    WHEN user_id = auth.uid() THEN show_phone
    ELSE NULL
  END as show_phone,
  -- Sensitive fields - NEVER exposed via this view (only direct table access for self)
  -- stripe_customer_id, stripe_subscription_id, subscription_end, etc. are excluded
  -- Users can access these via direct table query with RLS
  CASE 
    WHEN user_id = auth.uid() THEN notification_settings
    ELSE NULL
  END as notification_settings
FROM public.profiles;

-- Step 4: Create new, more restrictive SELECT policy on profiles table
-- Users can ONLY see their own full profile via direct table access
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Step 5: Grant SELECT on the public view to authenticated users
-- This allows trip co-members to see appropriate profile data via the view
GRANT SELECT ON public.profiles_public TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.profiles_public IS 
'Secure view for profile data. Shows: display_name, avatar_url, bio always. 
Shows email only if show_email=true AND viewer is trip co-member.
Shows phone only if show_phone=true AND viewer is trip co-member.
Shows first_name/last_name to trip co-members.
Never exposes: stripe_customer_id, stripe_subscription_id, subscription_product_id.';