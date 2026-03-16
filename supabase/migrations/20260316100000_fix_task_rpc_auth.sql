-- Fix: update_task_with_version RPC auth bypass
-- Problem: Original function trusted caller-supplied p_creator_id parameter
-- instead of auth.uid(). Also missing trip membership check.
-- Fix: Drop old signature, recreate with auth.uid() + trip membership + admin override.

-- Drop old function (signature change: removing p_creator_id parameter)
DROP FUNCTION IF EXISTS public.update_task_with_version(UUID, INTEGER, UUID, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN);

CREATE OR REPLACE FUNCTION public.update_task_with_version(
  p_task_id UUID,
  p_current_version INTEGER,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_due_at TIMESTAMPTZ DEFAULT NULL,
  p_is_poll BOOLEAN DEFAULT NULL
)
RETURNS SETOF trip_tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actual_version INTEGER;
  v_creator_id UUID;
  v_trip_id UUID;
BEGIN
  -- Get current version, creator, and trip with row lock
  SELECT version, creator_id, trip_id
  INTO v_actual_version, v_creator_id, v_trip_id
  FROM trip_tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found' USING ERRCODE = 'P0002';
  END IF;

  -- Authorization: caller must be a trip member
  IF NOT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = v_trip_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a trip member' USING ERRCODE = '42501';
  END IF;

  -- Authorization: only the task creator or a trip admin can edit
  IF v_creator_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_id = v_trip_id AND user_id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Access denied: only the task creator or an admin can edit' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Version check
  IF COALESCE(v_actual_version, 1) != COALESCE(p_current_version, 1) THEN
    RAISE EXCEPTION 'Task has been modified by another user (expected version %, found %)',
      p_current_version, v_actual_version
      USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  UPDATE trip_tasks
  SET
    title = CASE WHEN p_title IS NULL THEN title ELSE NULLIF(p_title, '') END,
    description = CASE WHEN p_description IS NULL THEN description ELSE NULLIF(p_description, '') END,
    due_at = CASE WHEN p_due_at IS NULL THEN due_at ELSE p_due_at END,
    is_poll = COALESCE(p_is_poll, is_poll),
    version = COALESCE(v_actual_version, 1) + 1,
    updated_at = NOW()
  WHERE id = p_task_id
  RETURNING *;
END;
$$;

-- Grant to authenticated users (function body enforces membership + creator/admin check)
GRANT EXECUTE ON FUNCTION public.update_task_with_version(
  UUID, INTEGER, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN
) TO authenticated;
