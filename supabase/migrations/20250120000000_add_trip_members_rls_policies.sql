-- Migration: Add INSERT/UPDATE/DELETE RLS Policies for trip_members
-- Date: 2025-01-20
-- Description: Enables proper trip membership management via RLS policies

-- ============================================
-- 1. Allow trip admins to add members
-- ============================================
CREATE POLICY "Trip admins can add members"
ON public.trip_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_members.trip_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'admin'
  )
  OR auth.uid() = user_id -- Users can add themselves via invite links
);

-- ============================================
-- 2. Allow admins to update member roles
-- ============================================
CREATE POLICY "Trip admins can update members"
ON public.trip_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_members.trip_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_members.trip_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'admin'
  )
);

-- ============================================
-- 3. Allow users to leave trips (delete their own membership)
-- ============================================
CREATE POLICY "Users can leave trips"
ON public.trip_members
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 4. Also allow admins to remove members
-- ============================================
CREATE POLICY "Trip admins can remove members"
ON public.trip_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_members.trip_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'admin'
  )
);
