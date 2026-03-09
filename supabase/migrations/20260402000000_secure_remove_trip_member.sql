-- Secure remove_trip_member_safe: validate auth.uid() matches p_removing_user_id
-- Fixes SECURITY-AUDIT-2026-02-09 finding B4: SECURITY DEFINER accepts unchecked user IDs.
-- Also removes the p_removing_user_id parameter in favor of auth.uid() to prevent spoofing.

CREATE OR REPLACE FUNCTION public.remove_trip_member_safe(
  p_trip_id TEXT,
  p_user_id_to_remove UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removing_user_id UUID;
  v_removing_user_role TEXT;
  v_target_user_role TEXT;
  v_is_creator BOOLEAN;
BEGIN
  -- Use authenticated user, not client-supplied ID
  v_removing_user_id := auth.uid();

  IF v_removing_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT;
    RETURN;
  END IF;

  -- Cannot remove yourself (use leave_trip instead)
  IF p_user_id_to_remove = v_removing_user_id THEN
    RETURN QUERY SELECT FALSE, 'Use leave_trip to remove yourself'::TEXT;
    RETURN;
  END IF;

  -- Check if removing user is the trip creator
  SELECT (created_by = v_removing_user_id) INTO v_is_creator
  FROM trips
  WHERE id = p_trip_id;

  -- Get removing user's role in trip_members
  SELECT role INTO v_removing_user_role
  FROM trip_members
  WHERE trip_id = p_trip_id AND user_id = v_removing_user_id;

  -- Must be creator, admin, or owner to remove
  IF NOT v_is_creator AND v_removing_user_role NOT IN ('admin', 'owner') THEN
    -- Also check trip_admins table
    IF NOT EXISTS (
      SELECT 1 FROM trip_admins
      WHERE trip_id = p_trip_id AND user_id = v_removing_user_id
    ) THEN
      RETURN QUERY SELECT FALSE, 'Only admins and owners can remove members'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Get target user's role
  SELECT role INTO v_target_user_role
  FROM trip_members
  WHERE trip_id = p_trip_id AND user_id = p_user_id_to_remove;

  -- Target must be a member
  IF v_target_user_role IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User is not a member of this trip'::TEXT;
    RETURN;
  END IF;

  -- Cannot remove the trip creator
  IF EXISTS (
    SELECT 1 FROM trips
    WHERE id = p_trip_id AND created_by = p_user_id_to_remove
  ) THEN
    RETURN QUERY SELECT FALSE, 'Cannot remove trip creator'::TEXT;
    RETURN;
  END IF;

  -- Cannot remove an owner role
  IF v_target_user_role = 'owner' THEN
    RETURN QUERY SELECT FALSE, 'Cannot remove trip owner'::TEXT;
    RETURN;
  END IF;

  -- Remove the member (triggers handle channel ownership, calendar cleanup, audit)
  DELETE FROM trip_members
  WHERE trip_id = p_trip_id AND user_id = p_user_id_to_remove;

  -- Log the removal as a notification for the removed user
  INSERT INTO notification_logs (user_id, type, title, body, data)
  VALUES (
    p_user_id_to_remove,
    'member_removed',
    'Removed from trip',
    COALESCE(p_reason, 'You were removed from a trip'),
    jsonb_build_object('trip_id', p_trip_id, 'removed_by', v_removing_user_id)
  );

  RETURN QUERY SELECT TRUE, 'Member removed successfully'::TEXT;
END;
$$;

COMMENT ON FUNCTION public.remove_trip_member_safe(TEXT, UUID, TEXT) IS
  'Securely removes a member from a trip. Uses auth.uid() for authorization - no client-supplied user ID.';
