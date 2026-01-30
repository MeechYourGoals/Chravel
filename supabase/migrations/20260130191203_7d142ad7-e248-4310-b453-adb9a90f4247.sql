-- Fix: Secure profiles_public view by requiring authentication
-- The view currently exposes base fields (display_name, avatar_url, bio, app_role, etc.) to anyone

-- Drop the existing view
DROP VIEW IF EXISTS public.profiles_public;

-- Create secure profiles_public view with proper access controls
-- Only authenticated users can access, and sensitive fields are hidden unless user owns the profile or shares a trip
CREATE VIEW public.profiles_public 
WITH (security_invoker = true)
AS SELECT 
    user_id,
    display_name,
    avatar_url,
    bio,
    app_role,
    role,
    timezone,
    created_at,
    updated_at,
    subscription_status,
    -- Email: only show if viewing own profile OR show_email=true AND shares a trip
    CASE
        WHEN (user_id = auth.uid()) THEN email
        WHEN ((show_email = true) AND is_trip_co_member(auth.uid(), user_id)) THEN email
        ELSE NULL::text
    END AS email,
    -- Phone: only show if viewing own profile OR show_phone=true AND shares a trip
    CASE
        WHEN (user_id = auth.uid()) THEN phone
        WHEN ((show_phone = true) AND is_trip_co_member(auth.uid(), user_id)) THEN phone
        ELSE NULL::text
    END AS phone,
    -- First/Last name: only show if viewing own profile OR shares a trip
    CASE
        WHEN (user_id = auth.uid()) THEN first_name
        WHEN is_trip_co_member(auth.uid(), user_id) THEN first_name
        ELSE NULL::text
    END AS first_name,
    CASE
        WHEN (user_id = auth.uid()) THEN last_name
        WHEN is_trip_co_member(auth.uid(), user_id) THEN last_name
        ELSE NULL::text
    END AS last_name,
    -- Privacy settings: only visible to own profile
    CASE
        WHEN (user_id = auth.uid()) THEN show_email
        ELSE NULL::boolean
    END AS show_email,
    CASE
        WHEN (user_id = auth.uid()) THEN show_phone
        ELSE NULL::boolean
    END AS show_phone,
    -- Notification settings: only visible to own profile
    CASE
        WHEN (user_id = auth.uid()) THEN notification_settings
        ELSE NULL::jsonb
    END AS notification_settings
FROM profiles
WHERE 
    -- CRITICAL: Require authentication - unauthenticated users see nothing
    auth.uid() IS NOT NULL
    AND (
        -- User can see their own profile
        user_id = auth.uid()
        -- OR they share a trip with this user
        OR is_trip_co_member(auth.uid(), user_id)
    );

-- Add comment explaining the security model
COMMENT ON VIEW public.profiles_public IS 'Secure view of profiles - requires authentication and only shows profiles of trip co-members or own profile. Sensitive fields (email, phone, names) are further protected by privacy settings.';