-- Identity Snapshot Strategy: store sender display name at message creation time
-- so names survive account deletion and are stable across name changes.

-- 1. Add snapshot columns to trip_chat_messages
ALTER TABLE public.trip_chat_messages
  ADD COLUMN IF NOT EXISTS sender_display_name TEXT,
  ADD COLUMN IF NOT EXISTS sender_avatar_url TEXT;

-- 2. Backfill sender_display_name from profiles for existing messages
-- Uses author_name as final fallback (already stored at send time).
UPDATE public.trip_chat_messages m
SET sender_display_name = COALESCE(
  p.display_name,
  TRIM(CONCAT_WS(' ', p.first_name, p.last_name)),
  m.author_name
),
sender_avatar_url = p.avatar_url
FROM public.profiles p
WHERE m.user_id = p.user_id
  AND m.sender_display_name IS NULL;

-- For messages whose user no longer has a profile, copy author_name
UPDATE public.trip_chat_messages
SET sender_display_name = author_name
WHERE sender_display_name IS NULL AND author_name IS NOT NULL;

-- 3. Display name change tracking on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS display_name_change_count INT DEFAULT 0;

-- 4. Update profiles_public view with resolved_display_name computed column.
-- This column ALWAYS returns a usable name via COALESCE chain:
--   display_name > first+last > first > email prefix
-- This eliminates the entire class of bugs where individual queries forget
-- to select first_name/last_name and get NULL for display_name.
--
-- IMPORTANT: Preserves the security model from migration 20260130191203:
-- - Requires authentication (auth.uid() IS NOT NULL)
-- - Only shows profiles of trip co-members or own profile
-- - Sensitive fields (email, phone, first/last name) are protected by is_trip_co_member()

-- First, ensure the is_trip_co_member function exists
CREATE OR REPLACE FUNCTION public.is_trip_co_member(viewer_id UUID, profile_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Same user is always a co-member of themselves
  IF viewer_id = profile_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if both users share at least one trip
  RETURN EXISTS (
    SELECT 1 FROM public.trip_members tm1
    JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = viewer_id
      AND tm2.user_id = profile_user_id
  );
END;
$$;

DROP VIEW IF EXISTS public.profiles_public;

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
    -- resolved_display_name: ALWAYS returns a usable name
    -- This is the key fix for the "Former Member" bug
    COALESCE(
      NULLIF(TRIM(display_name), ''),
      NULLIF(TRIM(CONCAT_WS(' ', NULLIF(TRIM(first_name), ''), NULLIF(TRIM(last_name), ''))), ''),
      NULLIF(TRIM(first_name), ''),
      NULLIF(split_part(email, '@', 1), '')
    ) AS resolved_display_name,
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

-- Add comment explaining the security model and resolved_display_name
COMMENT ON VIEW public.profiles_public IS 'Secure view of profiles with resolved_display_name. Requires authentication and only shows profiles of trip co-members or own profile. resolved_display_name always returns a usable name via COALESCE(display_name, first+last, first, email_prefix).';

GRANT SELECT ON public.profiles_public TO authenticated;

-- 5. Rate-limit trigger: max 2 display_name changes per 30 days
CREATE OR REPLACE FUNCTION public.enforce_display_name_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act when display_name actually changed
  IF OLD.display_name IS DISTINCT FROM NEW.display_name THEN
    -- Check if last change was within 30 days and count >= 2
    IF OLD.display_name_change_count >= 2
       AND OLD.display_name_updated_at IS NOT NULL
       AND OLD.display_name_updated_at > NOW() - INTERVAL '30 days' THEN
      RAISE EXCEPTION 'Display name can only be changed twice every 30 days.';
    END IF;

    -- Reset counter if window has passed
    IF OLD.display_name_updated_at IS NULL
       OR OLD.display_name_updated_at <= NOW() - INTERVAL '30 days' THEN
      NEW.display_name_change_count := 1;
    ELSE
      NEW.display_name_change_count := COALESCE(OLD.display_name_change_count, 0) + 1;
    END IF;

    NEW.display_name_updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_display_name_rate_limit ON public.profiles;
CREATE TRIGGER trg_display_name_rate_limit
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_display_name_rate_limit();
