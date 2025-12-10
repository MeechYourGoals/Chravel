-- Enable support for multi-role channel access and proper role assignment

-- 1. Update can_access_channel to allow access via ANY role (not just primary)
CREATE OR REPLACE FUNCTION public.can_access_channel(_user_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_channels tc
    INNER JOIN public.channel_role_access cra ON cra.channel_id = tc.id
    INNER JOIN public.user_trip_roles utr
      ON utr.trip_id = tc.trip_id
      AND utr.role_id = cra.role_id
      AND utr.user_id = _user_id
      -- Removed: AND utr.is_primary = true (Allow any role to grant access)
    WHERE tc.id = _channel_id
  )
$$;

-- 2. Update auto_create_channel_for_role to also populate channel_role_access
-- AND check for has_channel permission
CREATE OR REPLACE FUNCTION public.auto_create_channel_for_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_channel_id UUID;
  should_create boolean;
BEGIN
  -- Check if channel creation is enabled for this role (default to true)
  should_create := COALESCE((NEW.feature_permissions->'channels'->>'has_channel')::boolean, true);
  
  IF NOT should_create THEN
    RETURN NEW;
  END IF;

  -- Insert into trip_channels
  INSERT INTO public.trip_channels (
    trip_id, 
    channel_name, 
    channel_slug,
    required_role_id, -- Keep for backward compatibility if needed, or nullable
    is_private,
    created_by
  )
  VALUES (
    NEW.trip_id, 
    NEW.role_name,
    lower(replace(NEW.role_name, ' ', '-')),
    NEW.id, 
    true,
    NEW.created_by
  )
  ON CONFLICT (trip_id, channel_slug) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO new_channel_id;
  
  -- If channel was created (or existed), link it in channel_role_access
  IF new_channel_id IS NOT NULL THEN
    INSERT INTO public.channel_role_access (channel_id, role_id)
    VALUES (new_channel_id, NEW.id)
    ON CONFLICT (channel_id, role_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Function to assign a role to a user, handling primary/secondary logic
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

  -- Check if this is the user's first role
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_trip_roles
    WHERE trip_id = _trip_id AND user_id = _user_id
  ) INTO is_first_role;

  -- If it's the first role, it MUST be primary.
  -- If _set_as_primary is true, we need to demote existing primary role first.
  
  IF _set_as_primary AND NOT is_first_role THEN
    -- Demote existing primary role
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
      ELSE public.user_trip_roles.is_primary -- Keep existing value if conflict
    END,
    assigned_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role assigned successfully'
  );
END;
$$;
