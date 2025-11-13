-- ============================================================
-- PRO TRIP ADMIN & ROLE MANAGEMENT SYSTEM
-- Complete backend: indexes, triggers, RPC functions, RLS policies
-- ============================================================

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_trip_admins_trip_user 
ON public.trip_admins(trip_id, user_id);

CREATE INDEX IF NOT EXISTS idx_trip_roles_trip_id 
ON public.trip_roles(trip_id);

CREATE INDEX IF NOT EXISTS idx_user_trip_roles_trip_user 
ON public.user_trip_roles(trip_id, user_id);

CREATE INDEX IF NOT EXISTS idx_trip_channels_role 
ON public.trip_channels(required_role_id) 
WHERE required_role_id IS NOT NULL;

-- ============================================================
-- ADD MISSING COLUMNS
-- ============================================================

-- Ensure trip_channels has required_role_id column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip_channels' 
    AND column_name = 'required_role_id'
  ) THEN
    ALTER TABLE public.trip_channels 
    ADD COLUMN required_role_id UUID REFERENCES public.trip_roles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- TRIGGERS: AUTO-CREATE CHANNEL WHEN ROLE IS CREATED
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_create_channel_for_role()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  -- Auto-create a private channel for this role
  INSERT INTO public.trip_channels (
    trip_id, 
    channel_name, 
    channel_slug,
    required_role_id, 
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
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_create_channel_for_role_trigger ON public.trip_roles;
CREATE TRIGGER auto_create_channel_for_role_trigger
AFTER INSERT ON public.trip_roles
FOR EACH ROW 
EXECUTE FUNCTION public.auto_create_channel_for_role();

-- ============================================================
-- TRIGGERS: AUTO-ARCHIVE CHANNEL WHEN ROLE IS DELETED
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_archive_channel_on_role_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  -- Archive all channels linked to this role
  UPDATE public.trip_channels
  SET is_archived = TRUE, updated_at = now()
  WHERE required_role_id = OLD.id;
  
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS auto_archive_channel_on_role_delete_trigger ON public.trip_roles;
CREATE TRIGGER auto_archive_channel_on_role_delete_trigger
AFTER DELETE ON public.trip_roles
FOR EACH ROW 
EXECUTE FUNCTION public.auto_archive_channel_on_role_delete();

-- ============================================================
-- RPC FUNCTION: PROMOTE USER TO ADMIN
-- ============================================================

CREATE OR REPLACE FUNCTION public.promote_to_admin(
  _trip_id TEXT, 
  _target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
DECLARE
  trip_data RECORD;
BEGIN
  -- Verify caller is admin
  SELECT * INTO trip_data FROM public.trips WHERE id = _trip_id;
  
  IF NOT (
    trip_data.created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = _trip_id 
      AND user_id = auth.uid()
      AND (permissions->>'can_designate_admins')::boolean = true
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only admins with permission can promote users'
    );
  END IF;

  -- Check if user is a trip member
  IF NOT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = _trip_id AND user_id = _target_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User must be a trip member first'
    );
  END IF;

  -- Promote user to admin
  INSERT INTO public.trip_admins (
    trip_id, 
    user_id, 
    granted_by, 
    permissions
  )
  VALUES (
    _trip_id, 
    _target_user_id, 
    auth.uid(), 
    jsonb_build_object(
      'can_manage_roles', true,
      'can_manage_channels', true,
      'can_designate_admins', false
    )
  )
  ON CONFLICT (trip_id, user_id) 
  DO UPDATE SET 
    permissions = EXCLUDED.permissions,
    granted_by = EXCLUDED.granted_by;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User promoted to admin successfully'
  );
END;
$$;

-- ============================================================
-- RPC FUNCTION: DEMOTE USER FROM ADMIN
-- ============================================================

CREATE OR REPLACE FUNCTION public.demote_from_admin(
  _trip_id TEXT, 
  _target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
DECLARE
  trip_data RECORD;
BEGIN
  -- Verify caller is admin
  SELECT * INTO trip_data FROM public.trips WHERE id = _trip_id;
  
  IF NOT (
    trip_data.created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = _trip_id 
      AND user_id = auth.uid()
      AND (permissions->>'can_designate_admins')::boolean = true
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only admins with permission can demote users'
    );
  END IF;

  -- Cannot demote trip creator
  IF trip_data.created_by = _target_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cannot demote trip creator'
    );
  END IF;

  -- Demote user
  DELETE FROM public.trip_admins
  WHERE trip_id = _trip_id AND user_id = _target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User demoted successfully'
  );
END;
$$;

-- ============================================================
-- RPC FUNCTION: CREATE ROLE
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_trip_role(
  _trip_id TEXT,
  _role_name TEXT,
  _permission_level permission_level DEFAULT 'edit',
  _feature_permissions JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
DECLARE
  role_id UUID;
  default_permissions JSONB;
BEGIN
  -- Verify caller is admin
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
      'message', 'Only admins can create roles'
    );
  END IF;

  -- Set default feature permissions if not provided
  default_permissions := COALESCE(
    _feature_permissions,
    jsonb_build_object(
      'media', jsonb_build_object(
        'can_view', true,
        'can_upload', true,
        'can_delete_own', true,
        'can_delete_any', false
      ),
      'tasks', jsonb_build_object(
        'can_view', true,
        'can_create', true,
        'can_assign', false,
        'can_complete', true,
        'can_delete', false
      ),
      'calendar', jsonb_build_object(
        'can_view', true,
        'can_create_events', true,
        'can_edit_events', false,
        'can_delete_events', false
      ),
      'channels', jsonb_build_object(
        'can_view', true,
        'can_post', true,
        'can_edit_messages', false,
        'can_delete_messages', false,
        'can_manage_members', false
      ),
      'payments', jsonb_build_object(
        'can_view', true,
        'can_create', false,
        'can_approve', false
      )
    )
  );

  -- Create role
  INSERT INTO public.trip_roles (
    trip_id, 
    role_name, 
    permission_level, 
    feature_permissions, 
    created_by
  )
  VALUES (
    _trip_id, 
    _role_name, 
    _permission_level, 
    default_permissions, 
    auth.uid()
  )
  RETURNING id INTO role_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role created successfully',
    'role_id', role_id
  );
END;
$$;

-- ============================================================
-- RPC FUNCTION: DELETE ROLE
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_trip_role(_role_id UUID)
RETURNS JSONB
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
DECLARE
  role_data RECORD;
BEGIN
  -- Get role details
  SELECT * INTO role_data FROM public.trip_roles WHERE id = _role_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Role not found'
    );
  END IF;

  -- Verify caller is admin
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = role_data.trip_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = role_data.trip_id 
      AND user_id = auth.uid()
      AND (permissions->>'can_manage_roles')::boolean = true
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only admins can delete roles'
    );
  END IF;

  -- Delete role (trigger will archive associated channel)
  DELETE FROM public.trip_roles WHERE id = _role_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role deleted successfully'
  );
END;
$$;

-- ============================================================
-- RPC FUNCTION: ASSIGN ROLE TO USER
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_user_to_role(
  _trip_id TEXT,
  _user_id UUID,
  _role_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is admin
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

  -- Assign role
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
    true,
    auth.uid()
  )
  ON CONFLICT (trip_id, user_id, role_id) 
  DO UPDATE SET 
    is_primary = true,
    assigned_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role assigned successfully'
  );
END;
$$;

-- ============================================================
-- RPC FUNCTION: REMOVE USER FROM ROLE
-- ============================================================

CREATE OR REPLACE FUNCTION public.remove_user_from_role(
  _trip_id TEXT,
  _user_id UUID,
  _role_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is admin
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
      'message', 'Only admins can remove roles'
    );
  END IF;

  -- Remove role assignment
  DELETE FROM public.user_trip_roles
  WHERE trip_id = _trip_id 
  AND user_id = _user_id 
  AND role_id = _role_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role removed successfully'
  );
END;
$$;

-- ============================================================
-- ENHANCED RLS POLICIES
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Trip admins manage admins" ON public.trip_admins;
DROP POLICY IF EXISTS "Trip admins manage roles" ON public.trip_roles;
DROP POLICY IF EXISTS "Trip admins assign roles" ON public.user_trip_roles;

-- trip_admins: Admins can view and manage other admins
CREATE POLICY "Trip admins manage admins"
ON public.trip_admins
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_admins ta
    WHERE ta.trip_id = trip_admins.trip_id 
    AND ta.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_admins.trip_id 
    AND t.created_by = auth.uid()
  )
);

-- trip_roles: Admins can manage roles
CREATE POLICY "Trip admins manage roles"
ON public.trip_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_admins ta
    WHERE ta.trip_id = trip_roles.trip_id 
    AND ta.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_roles.trip_id 
    AND t.created_by = auth.uid()
  )
);

-- user_trip_roles: Admins can assign roles, members can view their own
CREATE POLICY "Trip admins assign roles"
ON public.user_trip_roles
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.trip_admins ta
    WHERE ta.trip_id = user_trip_roles.trip_id 
    AND ta.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = user_trip_roles.trip_id 
    AND t.created_by = auth.uid()
  )
);