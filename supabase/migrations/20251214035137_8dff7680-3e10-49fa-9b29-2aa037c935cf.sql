-- Apply media delete policies (from existing migration 20251213000000)
-- This ensures media deletion actually works and "Item deleted" toast is accurate

-- 1. Add DELETE policy for trip_media_index
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

-- 2. Add DELETE policy for trip_link_index
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

-- 3. Add UPDATE policy for trip_media_index
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

-- 4. Add UPDATE policy for trip_link_index
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

-- 5. Trip links delete policy (allow members, not just owner)
DROP POLICY IF EXISTS "Members can delete trip links" ON public.trip_links;

CREATE POLICY "Members can delete trip links"
ON public.trip_links FOR DELETE
USING (
  auth.uid() = added_by
  OR
  EXISTS (
    SELECT 1 FROM public.trip_members m 
    WHERE m.trip_id::text = trip_links.trip_id::text
    AND m.user_id = auth.uid()
  )
);