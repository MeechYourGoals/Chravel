-- Enforce trip-scoped role integrity for role assignments (Pro Trips)
-- Ensures role_id belongs to the same trip_id being assigned.

CREATE OR REPLACE FUNCTION public.assign_trip_role(
  _trip_id text,
  _user_id uuid,
  _role_id uuid,
  _set_as_primary boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_role boolean;
BEGIN
  -- Check permissions (admins only)
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = _trip_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = _trip_id 
      AND user_id = auth.uid()
      AND (permissions->>'can_manage_roles')::boolean = true
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only admins can assign roles'
    );
  END IF;

  -- Verify user is a member
  IF NOT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = _trip_id AND user_id = _user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User must be a trip member'
    );
  END IF;

  -- ✅ Trip-scoped role integrity: role must belong to the same trip
  IF NOT EXISTS (
    SELECT 1
    FROM public.trip_roles tr
    WHERE tr.id = _role_id
      AND tr.trip_id = _trip_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Role does not belong to this trip'
    );
  END IF;

  -- Check if this is the user's first role
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_trip_roles
    WHERE trip_id = _trip_id AND user_id = _user_id
  ) INTO is_first_role;

  -- If it's the first role, it MUST be primary.
  -- If _set_as_primary is true, we need to demote existing primary role first.
  IF _set_as_primary AND NOT is_first_role THEN
    UPDATE public.user_trip_roles
    SET is_primary = false, updated_at = NOW()
    WHERE trip_id = _trip_id 
    AND user_id = _user_id 
    AND is_primary = true;
  END IF;

  -- Insert the new role
  -- If is_first_role is true, force is_primary = true
  -- Else use _set_as_primary (which defaults to false)
  INSERT INTO public.user_trip_roles (
    trip_id,
    user_id,
    role_id,
    is_primary,
    assigned_by
  )
  VALUES (
    _trip_id,
    _user_id,
    _role_id,
    CASE WHEN is_first_role THEN true ELSE _set_as_primary END,
    auth.uid()
  )
  ON CONFLICT (trip_id, user_id, role_id)
  DO UPDATE SET
    is_primary = CASE 
      WHEN is_first_role THEN true 
      WHEN _set_as_primary THEN true
      ELSE public.user_trip_roles.is_primary
    END,
    assigned_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role assigned successfully'
  );
END;
$$;

