-- Migration: Add DELETE RLS policies for media and link tables
-- Issue: Media deletion fails silently because there are no DELETE policies
-- The tables have SELECT and INSERT policies but missing DELETE policies
-- This causes the delete operation to succeed at the SQL level but affect 0 rows

-- ============================================================================
-- 1. Add DELETE policy for trip_media_index
-- Allows trip members to delete media items from trips they belong to
-- ============================================================================

-- Drop if exists to ensure idempotent migration
DROP POLICY IF EXISTS "Members can delete trip media" ON public.trip_media_index;

CREATE POLICY "Members can delete trip media"
ON public.trip_media_index FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members m 
    WHERE m.trip_id = trip_media_index.trip_id 
    AND m.user_id = auth.uid()
  )
);

COMMENT ON POLICY "Members can delete trip media" ON public.trip_media_index IS 
'Allows trip members to delete media items (photos, videos, files) from their trips. Required for the media hub delete functionality to work.';

-- ============================================================================
-- 2. Add DELETE policy for trip_link_index
-- Allows trip members to delete auto-extracted links from chat
-- ============================================================================

-- Drop if exists to ensure idempotent migration
DROP POLICY IF EXISTS "Members can delete trip links" ON public.trip_link_index;

CREATE POLICY "Members can delete trip links"
ON public.trip_link_index FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members m 
    WHERE m.trip_id = trip_link_index.trip_id 
    AND m.user_id = auth.uid()
  )
);

COMMENT ON POLICY "Members can delete trip links" ON public.trip_link_index IS 
'Allows trip members to delete auto-extracted links from their trip chat. Required for the media hub links tab delete functionality.';

-- ============================================================================
-- 3. Add UPDATE policy for trip_media_index (if missing)
-- Allows trip members to update media metadata (captions, tags, etc.)
-- ============================================================================

-- Drop if exists to ensure idempotent migration
DROP POLICY IF EXISTS "Members can update trip media" ON public.trip_media_index;

CREATE POLICY "Members can update trip media"
ON public.trip_media_index FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members m 
    WHERE m.trip_id = trip_media_index.trip_id 
    AND m.user_id = auth.uid()
  )
);

COMMENT ON POLICY "Members can update trip media" ON public.trip_media_index IS 
'Allows trip members to update media metadata like captions and tags.';

-- ============================================================================
-- 4. Add UPDATE policy for trip_link_index (if missing)
-- Allows trip members to update link metadata
-- ============================================================================

-- Drop if exists to ensure idempotent migration  
DROP POLICY IF EXISTS "Members can update trip links" ON public.trip_link_index;

CREATE POLICY "Members can update trip links"
ON public.trip_link_index FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members m 
    WHERE m.trip_id = trip_link_index.trip_id 
    AND m.user_id = auth.uid()
  )
);

COMMENT ON POLICY "Members can update trip links" ON public.trip_link_index IS 
'Allows trip members to update link metadata.';

-- ============================================================================
-- 5. Ensure trip_links DELETE policy allows all trip members (not just owner)
-- This is more flexible for collaborative trips
-- ============================================================================

-- Add a trip-member-based DELETE policy (in addition to owner policy)
DROP POLICY IF EXISTS "Members can delete trip links" ON public.trip_links;

CREATE POLICY "Members can delete trip links"
ON public.trip_links FOR DELETE
USING (
  -- Owner can always delete
  auth.uid() = added_by
  OR
  -- Trip members can delete any link in their trip
  EXISTS (
    SELECT 1 FROM public.trip_members m 
    WHERE m.trip_id::text = trip_links.trip_id::text
    AND m.user_id = auth.uid()
  )
);

COMMENT ON POLICY "Members can delete trip links" ON public.trip_links IS 
'Allows link owners and trip members to delete manually-added links from their trips.';
