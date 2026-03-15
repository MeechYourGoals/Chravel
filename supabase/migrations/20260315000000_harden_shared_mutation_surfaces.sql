-- Hardening pass for shared mutation surfaces: source_type attribution,
-- URL dedup for trip_links, and versioned calendar update RPC.

-- 1. Add source_type to trip_tasks for AI attribution parity with trip_events
ALTER TABLE trip_tasks ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual';

-- 2. Add source_type to trip_polls for AI attribution parity with trip_events
ALTER TABLE trip_polls ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual';

-- 3. Add normalized_url + unique constraint to trip_links to prevent server-side duplicates
--    The client already has dedupeKey() but there's no DB constraint to catch race conditions.
CREATE OR REPLACE FUNCTION public.normalize_link_url(url text)
RETURNS text
LANGUAGE sql IMMUTABLE STRICT
AS $$
  SELECT lower(regexp_replace(url, '/+$', ''));
$$;

ALTER TABLE trip_links ADD COLUMN IF NOT EXISTS normalized_url TEXT
  GENERATED ALWAYS AS (normalize_link_url(url)) STORED;

-- Partial unique index: only enforced when normalized_url is not null (always, since url is NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_links_unique_url
  ON trip_links(trip_id, normalized_url);

-- 4. Versioned calendar event update RPC
--    Prevents concurrent edits from silently overwriting each other.
--    Returns the updated row on success, raises exception on version mismatch.
CREATE OR REPLACE FUNCTION public.update_event_with_version(
  p_event_id UUID,
  p_current_version INTEGER,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time TIMESTAMPTZ DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_event_category TEXT DEFAULT NULL,
  p_include_in_itinerary BOOLEAN DEFAULT NULL,
  p_is_all_day BOOLEAN DEFAULT NULL,
  p_source_data JSONB DEFAULT NULL
)
RETURNS SETOF trip_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actual_version INTEGER;
  v_trip_id UUID;
  v_created_by UUID;
BEGIN
  -- Get current version, trip_id, and creator with row lock
  SELECT version, trip_id, created_by
  INTO v_actual_version, v_trip_id, v_created_by
  FROM trip_events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found' USING ERRCODE = 'P0002';
  END IF;

  -- Authorization: caller must be a trip member
  IF NOT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = v_trip_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: not a trip member' USING ERRCODE = '42501';
  END IF;

  -- Authorization: only the event creator or a trip admin can edit
  IF v_created_by != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_id = v_trip_id AND user_id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Access denied: only the event creator or an admin can edit' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Version check (treat NULL as version 1 for backward compat)
  IF COALESCE(v_actual_version, 1) != COALESCE(p_current_version, 1) THEN
    RAISE EXCEPTION 'Event has been modified by another user (expected version %, found %)',
      p_current_version, v_actual_version
      USING ERRCODE = 'P0001';
  END IF;

  -- Apply updates (only non-NULL params are applied)
  RETURN QUERY
  UPDATE trip_events
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    start_time = COALESCE(p_start_time, start_time),
    end_time = COALESCE(p_end_time, end_time),
    location = COALESCE(p_location, location),
    event_category = COALESCE(p_event_category, event_category),
    include_in_itinerary = COALESCE(p_include_in_itinerary, include_in_itinerary),
    is_all_day = COALESCE(p_is_all_day, is_all_day),
    source_data = COALESCE(p_source_data, source_data),
    version = COALESCE(v_actual_version, 1) + 1,
    updated_at = NOW()
  WHERE id = p_event_id
  RETURNING *;
END;
$$;

-- Grant to authenticated users (function body enforces membership + creator/admin check)
GRANT EXECUTE ON FUNCTION public.update_event_with_version(
  UUID, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, BOOLEAN, BOOLEAN, JSONB
) TO authenticated;

-- 5. Versioned task update RPC
--    Prevents concurrent edits to task title/description from silently overwriting.
CREATE OR REPLACE FUNCTION public.update_task_with_version(
  p_task_id UUID,
  p_current_version INTEGER,
  p_creator_id UUID,
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
BEGIN
  -- Get current version and creator with row lock
  SELECT version, creator_id INTO v_actual_version, v_creator_id
  FROM trip_tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found' USING ERRCODE = 'P0002';
  END IF;

  -- Creator check
  IF v_creator_id != p_creator_id THEN
    RAISE EXCEPTION 'Only the task creator can edit this task' USING ERRCODE = '42501';
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
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    due_at = COALESCE(p_due_at, due_at),
    is_poll = COALESCE(p_is_poll, is_poll),
    version = COALESCE(v_actual_version, 1) + 1,
    updated_at = NOW()
  WHERE id = p_task_id
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_task_with_version(
  UUID, INTEGER, UUID, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN
) TO authenticated;
