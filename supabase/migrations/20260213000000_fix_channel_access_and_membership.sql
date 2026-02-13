-- Migration: Fix channel access for trip admins/creators and auto-add channel members
-- Date: 2026-02-13
-- Purpose:
--   1. Update can_access_channel() to also grant access to trip admins and trip creators
--   2. Auto-add creator as channel_members entry when a channel is created
--   3. Ensure channel_members is populated for admins who access channels
--
-- ROOT CAUSE:
--   The can_access_channel() function only checked channel_role_access + user_trip_roles.
--   Trip admins/creators with no user_trip_roles entry were denied by RLS on channel_messages,
--   causing "Failed to send message" errors. The member count also showed 0 because
--   member count computation was skipped for admin-fetched channels.

-- ============================================
-- SECTION 1: Fix can_access_channel to handle admins, creators, and channel_members
-- ============================================

CREATE OR REPLACE FUNCTION public.can_access_channel(
  _user_id UUID,
  _channel_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check 1: User has a role that grants channel access via channel_role_access
    SELECT 1
    FROM public.trip_channels tc
    INNER JOIN public.channel_role_access cra ON cra.channel_id = tc.id
    INNER JOIN public.user_trip_roles utr
      ON utr.trip_id = tc.trip_id
      AND utr.role_id = cra.role_id
      AND utr.user_id = _user_id
    WHERE tc.id = _channel_id
  )
  OR EXISTS (
    -- Check 2: User is a trip admin
    SELECT 1
    FROM public.trip_channels tc
    INNER JOIN public.trip_admins ta
      ON ta.trip_id = tc.trip_id
      AND ta.user_id = _user_id
    WHERE tc.id = _channel_id
  )
  OR EXISTS (
    -- Check 3: User is the trip creator
    SELECT 1
    FROM public.trip_channels tc
    INNER JOIN public.trips t
      ON t.id = tc.trip_id
      AND t.created_by = _user_id
    WHERE tc.id = _channel_id
  )
  OR EXISTS (
    -- Check 4: User is an explicit channel member
    SELECT 1
    FROM public.channel_members cm
    WHERE cm.channel_id = _channel_id
      AND cm.user_id = _user_id
  )
$$;

-- ============================================
-- SECTION 2: Auto-add creator to channel_members when a channel is created
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_add_channel_creator_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Automatically add the channel creator as a member
  INSERT INTO public.channel_members (channel_id, user_id, joined_at)
  VALUES (NEW.id, NEW.created_by, NOW())
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS auto_add_channel_creator_member ON public.trip_channels;
CREATE TRIGGER auto_add_channel_creator_member
  AFTER INSERT ON public.trip_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_channel_creator_as_member();

-- ============================================
-- SECTION 3: Backfill - Add missing channel_members entries for existing channel creators
-- ============================================

INSERT INTO public.channel_members (channel_id, user_id, joined_at)
SELECT tc.id, tc.created_by, tc.created_at
FROM public.trip_channels tc
WHERE tc.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.channel_members cm
    WHERE cm.channel_id = tc.id
    AND cm.user_id = tc.created_by
  )
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- ============================================
-- SECTION 4: Backfill - Add missing channel_members for trip admins
-- who should have access to all channels in their trip
-- ============================================

INSERT INTO public.channel_members (channel_id, user_id, joined_at)
SELECT tc.id, ta.user_id, NOW()
FROM public.trip_channels tc
INNER JOIN public.trip_admins ta ON ta.trip_id = tc.trip_id
WHERE tc.is_archived = false
  AND NOT EXISTS (
    SELECT 1 FROM public.channel_members cm
    WHERE cm.channel_id = tc.id
    AND cm.user_id = ta.user_id
  )
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- ============================================
-- SECTION 5: Comments
-- ============================================

COMMENT ON FUNCTION public.can_access_channel(UUID, UUID) IS
'Checks if a user can access a channel. Grants access if the user:
1) Has a role granting access via channel_role_access + user_trip_roles
2) Is a trip admin (trip_admins table)
3) Is the trip creator (trips.created_by)
4) Is an explicit channel member (channel_members table)';

COMMENT ON FUNCTION public.auto_add_channel_creator_as_member() IS
'Trigger function that automatically adds the channel creator as a channel_members entry
when a new channel is created. This ensures the creator can always send messages.';
