-- Migration: Fix role-based channel synchronization and edge cases
-- This migration addresses:
-- 1. Auto-sync channel memberships when user roles change
-- 2. Channel ownership transfer when creator leaves
-- 3. Ensure all trip creators have proper admin entry
-- 4. Handle multi-role channel access (not just primary)

-- ============================================
-- SECTION 1: Sync channel memberships on role changes
-- ============================================

-- Function to sync a user's channel memberships based on their roles
CREATE OR REPLACE FUNCTION public.sync_user_channel_memberships(
  p_trip_id TEXT,
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_channel RECORD;
BEGIN
  -- Get all channels in the trip and check if user should have access
  FOR v_channel IN
    SELECT tc.id as channel_id, tc.channel_name
    FROM trip_channels tc
    WHERE tc.trip_id = p_trip_id
    AND tc.is_archived = false
  LOOP
    -- Check if user has ANY role that grants access to this channel
    IF EXISTS (
      SELECT 1
      FROM user_trip_roles utr
      INNER JOIN channel_role_access cra ON cra.role_id = utr.role_id
      WHERE utr.trip_id = p_trip_id
      AND utr.user_id = p_user_id
      AND cra.channel_id = v_channel.channel_id
    ) THEN
      -- User should have access - add membership if not exists
      INSERT INTO trip_channel_members (channel_id, user_id, joined_at)
      VALUES (v_channel.channel_id, p_user_id, NOW())
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    ELSE
      -- User should NOT have access - remove membership if exists
      DELETE FROM trip_channel_members
      WHERE channel_id = v_channel.channel_id
      AND user_id = p_user_id;
    END IF;
  END LOOP;
END;
$$;

-- Trigger function for user_trip_roles changes
CREATE OR REPLACE FUNCTION public.trigger_sync_channel_on_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New role assigned - sync channel access for this user
    PERFORM sync_user_channel_memberships(NEW.trip_id, NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Role updated - sync channel access
    PERFORM sync_user_channel_memberships(NEW.trip_id, NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Role removed - sync channel access (may remove from channels)
    PERFORM sync_user_channel_memberships(OLD.trip_id, OLD.user_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS sync_channel_on_role_change ON public.user_trip_roles;
CREATE TRIGGER sync_channel_on_role_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_trip_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_channel_on_role_change();

-- ============================================
-- SECTION 2: Channel ownership transfer on member leave
-- ============================================

-- Function to transfer channel ownership when creator leaves
CREATE OR REPLACE FUNCTION public.transfer_channel_ownership_on_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_channel RECORD;
  v_new_owner UUID;
BEGIN
  -- Find all channels created by this leaving user in this trip
  FOR v_channel IN
    SELECT tc.id, tc.trip_id, tc.channel_name
    FROM trip_channels tc
    WHERE tc.created_by = OLD.user_id
    AND tc.trip_id = OLD.trip_id
  LOOP
    -- Find a new owner: prefer an admin, then any remaining channel member
    SELECT COALESCE(
      -- First try: another admin with channel management permission
      (SELECT ta.user_id
       FROM trip_admins ta
       WHERE ta.trip_id = OLD.trip_id
       AND ta.user_id != OLD.user_id
       AND (ta.permissions->>'can_manage_channels')::boolean = true
       LIMIT 1),
      -- Second try: any other trip admin
      (SELECT ta.user_id
       FROM trip_admins ta
       WHERE ta.trip_id = OLD.trip_id
       AND ta.user_id != OLD.user_id
       LIMIT 1),
      -- Third try: the trip creator
      (SELECT t.created_by
       FROM trips t
       WHERE t.id = OLD.trip_id
       AND t.created_by != OLD.user_id)
    ) INTO v_new_owner;

    -- Transfer ownership if we found someone
    IF v_new_owner IS NOT NULL THEN
      UPDATE trip_channels
      SET created_by = v_new_owner
      WHERE id = v_channel.id;
    END IF;
    -- If no new owner found, channel persists with original creator_by
    -- (orphaned but still functional for remaining members)
  END LOOP;

  RETURN OLD;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS transfer_channel_ownership_on_member_leave ON public.trip_members;
CREATE TRIGGER transfer_channel_ownership_on_member_leave
  BEFORE DELETE ON public.trip_members
  FOR EACH ROW
  EXECUTE FUNCTION public.transfer_channel_ownership_on_leave();

-- ============================================
-- SECTION 3: Ensure trip creators are in trip_admins
-- ============================================

-- Update initialize_pro_trip_admin to also handle consumer trips
-- (so all trip creators have admin capabilities if needed later)
CREATE OR REPLACE FUNCTION public.initialize_trip_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- For pro/event trips, creator gets full admin permissions
  IF NEW.trip_type IN ('pro', 'event') THEN
    INSERT INTO public.trip_admins (
      trip_id,
      user_id,
      granted_by,
      permissions
    ) VALUES (
      NEW.id,
      NEW.created_by,
      NEW.created_by,
      jsonb_build_object(
        'can_manage_roles', true,
        'can_manage_channels', true,
        'can_designate_admins', true
      )
    )
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Replace old trigger name with consistent naming
DROP TRIGGER IF EXISTS initialize_pro_trip_admin_trigger ON public.trips;
DROP TRIGGER IF EXISTS initialize_trip_admin_trigger ON public.trips;
CREATE TRIGGER initialize_trip_admin_trigger
  AFTER INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_trip_admin();

-- ============================================
-- SECTION 4: Sync channel access when channel_role_access changes
-- ============================================

-- Function to sync all users when a role is granted/revoked channel access
CREATE OR REPLACE FUNCTION public.trigger_sync_channels_on_role_access_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trip_id TEXT;
  v_user RECORD;
BEGIN
  -- Get the trip_id for this channel
  IF TG_OP = 'DELETE' THEN
    SELECT tc.trip_id INTO v_trip_id
    FROM trip_channels tc
    WHERE tc.id = OLD.channel_id;

    -- Sync all users who had this role
    FOR v_user IN
      SELECT DISTINCT utr.user_id
      FROM user_trip_roles utr
      WHERE utr.role_id = OLD.role_id
      AND utr.trip_id = v_trip_id
    LOOP
      PERFORM sync_user_channel_memberships(v_trip_id, v_user.user_id);
    END LOOP;
  ELSE
    SELECT tc.trip_id INTO v_trip_id
    FROM trip_channels tc
    WHERE tc.id = NEW.channel_id;

    -- Sync all users who have this role
    FOR v_user IN
      SELECT DISTINCT utr.user_id
      FROM user_trip_roles utr
      WHERE utr.role_id = NEW.role_id
      AND utr.trip_id = v_trip_id
    LOOP
      PERFORM sync_user_channel_memberships(v_trip_id, v_user.user_id);
    END LOOP;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS sync_channels_on_role_access_change ON public.channel_role_access;
CREATE TRIGGER sync_channels_on_role_access_change
  AFTER INSERT OR DELETE ON public.channel_role_access
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_channels_on_role_access_change();

-- ============================================
-- SECTION 5: Backfill existing data
-- ============================================

-- Ensure existing pro/event trip creators are in trip_admins
INSERT INTO public.trip_admins (trip_id, user_id, granted_by, permissions)
SELECT
  t.id,
  t.created_by,
  t.created_by,
  jsonb_build_object(
    'can_manage_roles', true,
    'can_manage_channels', true,
    'can_designate_admins', true
  )
FROM trips t
WHERE t.trip_type IN ('pro', 'event')
AND t.created_by IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM trip_admins ta
  WHERE ta.trip_id = t.id
  AND ta.user_id = t.created_by
)
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- Sync channel memberships for all existing role assignments
DO $$
DECLARE
  v_assignment RECORD;
BEGIN
  FOR v_assignment IN
    SELECT DISTINCT trip_id, user_id
    FROM user_trip_roles
  LOOP
    PERFORM sync_user_channel_memberships(v_assignment.trip_id, v_assignment.user_id);
  END LOOP;
END;
$$;

-- ============================================
-- SECTION 6: Add helpful comments
-- ============================================

COMMENT ON FUNCTION public.sync_user_channel_memberships(TEXT, UUID) IS
'Synchronizes a user''s channel memberships based on ALL their roles (not just primary).
Called automatically when roles change or channel access is modified.';

COMMENT ON FUNCTION public.trigger_sync_channel_on_role_change() IS
'Trigger function that syncs channel memberships whenever a user''s role assignment changes.';

COMMENT ON FUNCTION public.transfer_channel_ownership_on_leave() IS
'Automatically transfers channel ownership to another admin when the channel creator leaves the trip.';

COMMENT ON TRIGGER sync_channel_on_role_change ON public.user_trip_roles IS
'Ensures channel memberships stay in sync when user roles are added, updated, or removed.';

COMMENT ON TRIGGER transfer_channel_ownership_on_member_leave ON public.trip_members IS
'Transfers channel ownership to another admin when the original creator leaves the trip.';

-- ============================================
-- SECTION 7: Primary role auto-promotion
-- ============================================

-- When a primary role is deleted, automatically promote another role to primary
CREATE OR REPLACE FUNCTION public.auto_promote_primary_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act if the deleted role was primary
  IF OLD.is_primary = true THEN
    -- Check if user has other roles in this trip
    -- If so, promote the oldest one to primary
    UPDATE user_trip_roles
    SET is_primary = true
    WHERE id = (
      SELECT id
      FROM user_trip_roles
      WHERE trip_id = OLD.trip_id
      AND user_id = OLD.user_id
      AND id != OLD.id
      ORDER BY assigned_at ASC
      LIMIT 1
    );
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS auto_promote_primary_role_trigger ON public.user_trip_roles;
CREATE TRIGGER auto_promote_primary_role_trigger
  AFTER DELETE ON public.user_trip_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_promote_primary_role();

-- Ensure first role assignment is always primary
CREATE OR REPLACE FUNCTION public.ensure_first_role_is_primary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If user has no other roles in this trip, force this one to be primary
  IF NOT EXISTS (
    SELECT 1 FROM user_trip_roles
    WHERE trip_id = NEW.trip_id
    AND user_id = NEW.user_id
    AND id != NEW.id
  ) THEN
    NEW.is_primary := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_first_role_is_primary_trigger ON public.user_trip_roles;
CREATE TRIGGER ensure_first_role_is_primary_trigger
  BEFORE INSERT ON public.user_trip_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_first_role_is_primary();

COMMENT ON FUNCTION public.auto_promote_primary_role() IS
'Automatically promotes another role to primary when the current primary role is deleted.';

COMMENT ON FUNCTION public.ensure_first_role_is_primary() IS
'Ensures the first role assigned to a user in a trip is always marked as primary.';
