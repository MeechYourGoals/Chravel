-- Migration: Fix channel membership sync when user_trip_roles change
-- The existing sync_channel_memberships trigger only fires on trip_members changes.
-- When a user's primary role changes via user_trip_roles, their channel access
-- should update accordingly. This adds the missing trigger.

-- ==========================================
-- STEP 1: Function to sync channel memberships on role changes
-- ==========================================

CREATE OR REPLACE FUNCTION public.sync_channel_memberships_on_role_change()
RETURNS TRIGGER AS $$
DECLARE
  v_trip_id TEXT;
  v_user_id UUID;
  v_role_id UUID;
  channel_record RECORD;
BEGIN
  -- Determine trip_id and user_id from the trigger context
  IF TG_OP = 'DELETE' THEN
    v_trip_id := OLD.trip_id;
    v_user_id := OLD.user_id;
    v_role_id := OLD.role_id;
  ELSE
    v_trip_id := NEW.trip_id;
    v_user_id := NEW.user_id;
    v_role_id := NEW.role_id;
  END IF;

  -- On INSERT: Add user to channels that grant access to their new role
  IF TG_OP = 'INSERT' THEN
    FOR channel_record IN
      SELECT tc.id AS channel_id
      FROM public.trip_channels tc
      JOIN public.channel_role_access cra ON cra.channel_id = tc.id
      WHERE tc.trip_id = v_trip_id
      AND cra.role_id = v_role_id
    LOOP
      INSERT INTO public.channel_members (channel_id, user_id)
      VALUES (channel_record.channel_id, v_user_id)
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    END LOOP;

    -- Also check legacy trip_channels with matching role_filter
    FOR channel_record IN
      SELECT tc.id AS channel_id
      FROM public.trip_channels tc
      WHERE tc.trip_id = v_trip_id
      AND tc.required_role_id = v_role_id
    LOOP
      INSERT INTO public.channel_members (channel_id, user_id)
      VALUES (channel_record.channel_id, v_user_id)
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    END LOOP;
  END IF;

  -- On DELETE: Remove user from channels that were granted by the deleted role
  -- (only if the user has no other role granting access to the same channel)
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.channel_members cm
    WHERE cm.user_id = v_user_id
    AND cm.channel_id IN (
      -- Channels the deleted role granted access to
      SELECT cra.channel_id
      FROM public.channel_role_access cra
      WHERE cra.role_id = v_role_id
      UNION
      SELECT tc.id
      FROM public.trip_channels tc
      WHERE tc.required_role_id = v_role_id AND tc.trip_id = v_trip_id
    )
    AND cm.channel_id NOT IN (
      -- Channels the user still has access to via other roles
      SELECT cra2.channel_id
      FROM public.channel_role_access cra2
      JOIN public.user_trip_roles utr ON utr.role_id = cra2.role_id
      WHERE utr.user_id = v_user_id AND utr.trip_id = v_trip_id
      UNION
      SELECT tc2.id
      FROM public.trip_channels tc2
      JOIN public.user_trip_roles utr2 ON utr2.role_id = tc2.required_role_id
      WHERE utr2.user_id = v_user_id AND utr2.trip_id = v_trip_id
    );
  END IF;

  -- On UPDATE (role_id changed): Remove from old role's channels, add to new
  IF TG_OP = 'UPDATE' AND OLD.role_id IS DISTINCT FROM NEW.role_id THEN
    -- Remove from old role channels (if no other role grants access)
    DELETE FROM public.channel_members cm
    WHERE cm.user_id = v_user_id
    AND cm.channel_id IN (
      SELECT cra.channel_id FROM public.channel_role_access cra WHERE cra.role_id = OLD.role_id
      UNION
      SELECT tc.id FROM public.trip_channels tc WHERE tc.required_role_id = OLD.role_id AND tc.trip_id = v_trip_id
    )
    AND cm.channel_id NOT IN (
      SELECT cra2.channel_id
      FROM public.channel_role_access cra2
      JOIN public.user_trip_roles utr ON utr.role_id = cra2.role_id
      WHERE utr.user_id = v_user_id AND utr.trip_id = v_trip_id AND utr.id != NEW.id
      UNION
      SELECT tc2.id
      FROM public.trip_channels tc2
      JOIN public.user_trip_roles utr2 ON utr2.role_id = tc2.required_role_id
      WHERE utr2.user_id = v_user_id AND utr2.trip_id = v_trip_id AND utr2.id != NEW.id
    );

    -- Add to new role channels
    FOR channel_record IN
      SELECT cra.channel_id
      FROM public.channel_role_access cra WHERE cra.role_id = NEW.role_id
      UNION
      SELECT tc.id FROM public.trip_channels tc WHERE tc.required_role_id = NEW.role_id AND tc.trip_id = v_trip_id
    LOOP
      INSERT INTO public.channel_members (channel_id, user_id)
      VALUES (channel_record.channel_id, v_user_id)
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 2: Create trigger on user_trip_roles
-- ==========================================

DROP TRIGGER IF EXISTS sync_channel_memberships_on_role_change_trigger ON public.user_trip_roles;

CREATE TRIGGER sync_channel_memberships_on_role_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_trip_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_channel_memberships_on_role_change();

COMMENT ON TRIGGER sync_channel_memberships_on_role_change_trigger ON public.user_trip_roles IS
'Syncs channel_members when user_trip_roles change. Adds user to channels their new role grants access to, removes from channels their old role granted.';
