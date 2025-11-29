-- Fix RLS infinite recursion on trip_admins, trip_roles, and user_trip_roles
-- Migration: Fix infinite recursion in RLS policies by using SECURITY DEFINER functions
-- Date: 2025-01-29

-- ============================================
-- Phase 1: Fix trip_admins RLS Policy
-- ============================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Trip admins manage admins" ON public.trip_admins;

-- Create new policy using SECURITY DEFINER function to avoid recursion
CREATE POLICY "Trip admins manage admins"
ON public.trip_admins
FOR ALL
TO authenticated
USING (
  -- Use SECURITY DEFINER function to avoid recursion
  public.is_trip_admin(auth.uid(), trip_id)
  OR
  -- Trip creator always has access
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_admins.trip_id 
    AND t.created_by = auth.uid()
  )
);

-- ============================================
-- Phase 2: Fix trip_roles RLS Policy
-- ============================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Trip admins manage roles" ON public.trip_roles;

-- Create new policy using SECURITY DEFINER function
CREATE POLICY "Trip admins manage roles"
ON public.trip_roles
FOR ALL
TO authenticated
USING (
  public.is_trip_admin(auth.uid(), trip_id)
  OR
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_roles.trip_id 
    AND t.created_by = auth.uid()
  )
);

-- ============================================
-- Phase 3: Fix user_trip_roles RLS Policy
-- ============================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Trip admins assign roles" ON public.user_trip_roles;

-- Create new policy using SECURITY DEFINER function
CREATE POLICY "Trip admins assign roles"
ON public.user_trip_roles
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_trip_admin(auth.uid(), trip_id)
  OR EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = user_trip_roles.trip_id 
    AND t.created_by = auth.uid()
  )
);

-- ============================================
-- Phase 4: Backfill Missing Admin Records
-- ============================================

-- Add missing admins for existing Pro/Event trips
-- This ensures all trip creators are properly registered as admins
INSERT INTO public.trip_admins (trip_id, user_id, granted_by, permissions)
SELECT 
  t.id,
  t.created_by,
  t.created_by,
  jsonb_build_object(
    'can_manage_roles', true,
    'can_manage_channels', true,
    'can_designate_admins', true
  )
FROM public.trips t
WHERE t.trip_type IN ('pro', 'event')
AND NOT EXISTS (
  SELECT 1 FROM public.trip_admins ta 
  WHERE ta.trip_id = t.id AND ta.user_id = t.created_by
)
ON CONFLICT (trip_id, user_id) DO NOTHING;

-- ============================================
-- Verification Query (for manual testing)
-- ============================================

-- Run this to verify all Pro/Event trip creators are now admins:
-- SELECT t.id, t.name, t.trip_type, t.created_by, 
--        EXISTS(SELECT 1 FROM trip_admins WHERE trip_id = t.id AND user_id = t.created_by) as has_admin
-- FROM trips t 
-- WHERE trip_type IN ('pro', 'event');

COMMENT ON POLICY "Trip admins manage admins" ON public.trip_admins IS 
  'Fixed: Uses is_trip_admin() SECURITY DEFINER function to avoid infinite recursion';

COMMENT ON POLICY "Trip admins manage roles" ON public.trip_roles IS 
  'Fixed: Uses is_trip_admin() SECURITY DEFINER function to avoid infinite recursion';

COMMENT ON POLICY "Trip admins assign roles" ON public.user_trip_roles IS 
  'Fixed: Uses is_trip_admin() SECURITY DEFINER function to avoid infinite recursion';