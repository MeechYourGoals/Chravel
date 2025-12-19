-- Ensure trip basecamp updates are member-scoped and non-spoofable.
-- Anyone with an active membership in the trip can update the Trip Base Camp.

CREATE OR REPLACE FUNCTION public.update_trip_basecamp_with_version(
  p_trip_id text,
  p_current_version integer,
  p_name text,
  p_address text,
  p_latitude double precision,
  p_longitude double precision,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
  v_is_authorized BOOLEAN := false;
BEGIN
  -- Require an authenticated caller
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  END IF;

  -- Prevent client spoofing of user id (used for history)
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User mismatch'
    );
  END IF;

  -- Authorization: active trip member OR trip creator
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.trip_members tm
      WHERE tm.trip_id = p_trip_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = p_trip_id
        AND t.created_by = auth.uid()
    )
  )
  INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Not authorized'
    );
  END IF;

  -- Lock row and get current version
  SELECT basecamp_version INTO v_current_version
  FROM public.trips
  WHERE id = p_trip_id
  FOR UPDATE;

  -- Check version match
  IF v_current_version != p_current_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'conflict', true,
      'current_version', v_current_version,
      'message', 'Basecamp was modified by another user'
    );
  END IF;

  -- Update with version increment
  v_new_version := v_current_version + 1;

  UPDATE public.trips SET
    basecamp_name = p_name,
    basecamp_address = p_address,
    basecamp_latitude = p_latitude,
    basecamp_longitude = p_longitude,
    basecamp_version = v_new_version,
    updated_at = NOW()
  WHERE id = p_trip_id;

  -- Log change to history if function exists
  BEGIN
    PERFORM public.log_basecamp_change(
      p_trip_id,
      auth.uid(),
      'trip',
      'updated',
      NULL, NULL, NULL, NULL,
      p_name, p_address, p_latitude, p_longitude
    );
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'new_version', v_new_version
  );
END;
$$;

