-- get_trip_admin_permissions(p_trip_id): returns admin status and permissions for the
-- calling user. Consolidates super-admin and trip-admin checks server-side so the
-- client hook no longer relies on client-side email matching for access decisions.
--
-- Returns JSON: { is_admin: bool, can_manage_roles: bool, can_manage_channels: bool,
--                 can_designate_admins: bool }

CREATE OR REPLACE FUNCTION public.get_trip_admin_permissions(p_trip_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permissions JSONB;
BEGIN
  -- Super admin: full access to all trips
  IF public.is_super_admin() THEN
    RETURN '{"is_admin":true,"can_manage_roles":true,"can_manage_channels":true,"can_designate_admins":true}'::JSON;
  END IF;

  -- Regular user: check trip_admins table
  SELECT permissions INTO v_permissions
  FROM public.trip_admins
  WHERE trip_id = p_trip_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN '{"is_admin":false,"can_manage_roles":false,"can_manage_channels":false,"can_designate_admins":false}'::JSON;
  END IF;

  RETURN json_build_object(
    'is_admin', true,
    'can_manage_roles',       COALESCE((v_permissions ->> 'can_manage_roles')::boolean,       false),
    'can_manage_channels',    COALESCE((v_permissions ->> 'can_manage_channels')::boolean,     false),
    'can_designate_admins',   COALESCE((v_permissions ->> 'can_designate_admins')::boolean,    false)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_trip_admin_permissions(TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_trip_admin_permissions(TEXT) IS
  'Returns admin status and permissions for the calling user on a given trip. '
  'Handles super-admin bypass server-side via is_super_admin().';
