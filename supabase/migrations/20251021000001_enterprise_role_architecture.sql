-- Migration: Enterprise Role Channel Architecture
-- This migration implements:
-- 1. Primary role enforcement (one role per user per trip)
-- 2. Multi-role channel access (channels can grant access to multiple roles)
-- 3. Admin permission system (granular admin capabilities)
-- 4. Updated RLS policies for security

-- ==========================================
-- STEP 1: Add is_primary column to user_trip_roles
-- ==========================================

-- Add is_primary column (default true for backward compatibility)
ALTER TABLE public.user_trip_roles
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true;

-- Create unique partial index to enforce ONE primary role per user per trip
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_role_per_user_trip
ON public.user_trip_roles (user_id, trip_id)
WHERE is_primary = true;

-- Migrate existing data: Set first role as primary, others as secondary
-- This handles users who currently have multiple roles
WITH ranked_roles AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id, trip_id ORDER BY assigned_at) as rn
  FROM public.user_trip_roles
)
UPDATE public.user_trip_roles
SET is_primary = false
WHERE id IN (SELECT id FROM ranked_roles WHERE rn > 1);

-- ==========================================
-- STEP 2: Create channel_role_access table
-- ==========================================

-- This table allows channels to grant access to multiple roles
-- Replaces the single required_role_id in trip_channels
CREATE TABLE IF NOT EXISTS public.channel_role_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.trip_channels(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.trip_roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, role_id)
);

-- Enable RLS
ALTER TABLE public.channel_role_access ENABLE ROW LEVEL SECURITY;

-- Migrate existing channel-role mappings from trip_channels.required_role_id
INSERT INTO public.channel_role_access (channel_id, role_id)
SELECT id, required_role_id
FROM public.trip_channels
WHERE required_role_id IS NOT NULL
ON CONFLICT (channel_id, role_id) DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_channel_role_access_channel
ON public.channel_role_access(channel_id);

CREATE INDEX IF NOT EXISTS idx_channel_role_access_role
ON public.channel_role_access(role_id);

-- Note: We keep required_role_id for backward compatibility during migration
-- It can be removed in a future migration after all code is updated

-- ==========================================
-- STEP 3: Add permissions column to trip_admins
-- ==========================================

-- Add granular permissions for admin actions
ALTER TABLE public.trip_admins
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
  "can_manage_roles": true,
  "can_manage_channels": true,
  "can_designate_admins": false
}'::jsonb;

-- Update existing admins to have basic permissions
UPDATE public.trip_admins
SET permissions = '{
  "can_manage_roles": true,
  "can_manage_channels": true,
  "can_designate_admins": false
}'::jsonb
WHERE permissions IS NULL;

-- Identify trip creators/owners and grant them full admin permissions
-- Assumption: trip creators should be super admins
UPDATE public.trip_admins ta
SET permissions = '{
  "can_manage_roles": true,
  "can_manage_channels": true,
  "can_designate_admins": true
}'::jsonb
WHERE ta.user_id IN (
  SELECT created_by
  FROM trips
  WHERE id = ta.trip_id
);

-- ==========================================
-- STEP 4: Updated security functions
-- ==========================================

-- Function to check if user has specific admin permission
CREATE OR REPLACE FUNCTION public.has_admin_permission(
  _user_id UUID,
  _trip_id TEXT,
  _permission TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_admins
    WHERE user_id = _user_id
      AND trip_id = _trip_id
      AND (permissions->>_permission)::boolean = true
  )
$$;

-- Function to get user's PRIMARY role for a trip
CREATE OR REPLACE FUNCTION public.get_user_primary_role(
  _user_id UUID,
  _trip_id TEXT
)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role_id
  FROM public.user_trip_roles
  WHERE user_id = _user_id
    AND trip_id = _trip_id
    AND is_primary = true
  LIMIT 1
$$;

-- Updated function to check if user can access a channel (now supports multi-role access)
CREATE OR REPLACE FUNCTION public.can_access_channel(
  _user_id UUID,
  _channel_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
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
      AND utr.is_primary = true  -- Only primary role grants channel access
    WHERE tc.id = _channel_id
  )
$$;

-- ==========================================
-- STEP 5: Updated RLS Policies
-- ==========================================

-- Drop old policy for trip_admins management
DROP POLICY IF EXISTS "Trip admins can manage admins" ON public.trip_admins;

-- New policy: Only admins with can_designate_admins permission can manage admins
CREATE POLICY "Super admins can designate admins"
ON public.trip_admins
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_permission(auth.uid(), trip_id, 'can_designate_admins')
);

CREATE POLICY "Super admins can revoke admins"
ON public.trip_admins
FOR DELETE
TO authenticated
USING (
  has_admin_permission(auth.uid(), trip_id, 'can_designate_admins')
);

-- Policy for user_trip_roles: Enforce primary role constraint
DROP POLICY IF EXISTS "Admins can manage role assignments" ON public.user_trip_roles;

CREATE POLICY "Admins with role permission can assign roles"
ON public.user_trip_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_admin_permission(auth.uid(), trip_id, 'can_manage_roles')
  -- Ensure only one primary role per user
  AND (
    NOT is_primary
    OR NOT EXISTS (
      SELECT 1 FROM public.user_trip_roles utr
      WHERE utr.trip_id = user_trip_roles.trip_id
        AND utr.user_id = user_trip_roles.user_id
        AND utr.is_primary = true
    )
  )
);

CREATE POLICY "Admins with role permission can update roles"
ON public.user_trip_roles
FOR UPDATE
TO authenticated
USING (
  has_admin_permission(auth.uid(), trip_id, 'can_manage_roles')
)
WITH CHECK (
  has_admin_permission(auth.uid(), trip_id, 'can_manage_roles')
);

CREATE POLICY "Admins with role permission can revoke roles"
ON public.user_trip_roles
FOR DELETE
TO authenticated
USING (
  has_admin_permission(auth.uid(), trip_id, 'can_manage_roles')
);

-- RLS for channel_role_access table
CREATE POLICY "Admins can manage channel role access"
ON public.channel_role_access
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_channels tc
    WHERE tc.id = channel_role_access.channel_id
      AND has_admin_permission(auth.uid(), tc.trip_id, 'can_manage_channels')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_channels tc
    WHERE tc.id = channel_role_access.channel_id
      AND has_admin_permission(auth.uid(), tc.trip_id, 'can_manage_channels')
  )
);

CREATE POLICY "Users can view channel role access for their channels"
ON public.channel_role_access
FOR SELECT
TO authenticated
USING (
  can_access_channel(auth.uid(), channel_id)
);

-- Updated policy for trip_channels to use channel permission
DROP POLICY IF EXISTS "Admins can manage channels" ON public.trip_channels;

CREATE POLICY "Admins with channel permission can manage channels"
ON public.trip_channels
FOR ALL
TO authenticated
USING (
  has_admin_permission(auth.uid(), trip_id, 'can_manage_channels')
)
WITH CHECK (
  has_admin_permission(auth.uid(), trip_id, 'can_manage_channels')
);

-- ==========================================
-- STEP 6: Add helpful comments
-- ==========================================

COMMENT ON COLUMN public.user_trip_roles.is_primary IS
'Indicates if this is the user''s primary role for this trip. Each user can have only ONE primary role per trip, enforced by partial unique index.';

COMMENT ON TABLE public.channel_role_access IS
'Many-to-many mapping allowing channels to grant access to multiple roles. Replaces the single required_role_id pattern.';

COMMENT ON COLUMN public.trip_admins.permissions IS
'Granular admin permissions: can_manage_roles, can_manage_channels, can_designate_admins';

COMMENT ON FUNCTION public.get_user_primary_role IS
'Returns the UUID of user''s primary role for a trip. Each user has exactly one primary role.';

COMMENT ON FUNCTION public.has_admin_permission IS
'Checks if user has a specific admin permission (can_manage_roles, can_manage_channels, can_designate_admins)';
