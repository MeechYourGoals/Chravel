-- Fix: Media/Files/Links delete operations silently affect 0 rows under RLS
--
-- Root cause:
-- - Client deletes can return 200 OK while deleting 0 rows when DELETE policies are missing/too strict.
-- - Some policies referenced trip_members directly; depending on trip_members RLS, this can evaluate false.
--
-- This migration makes deletes consistent by:
-- - Using the SECURITY DEFINER helper public.is_trip_member(...) when available.
-- - Allowing trip creators (trips.created_by) as well as members.
-- - Adding missing DELETE policies for trip_files.

-- Ensure helper exists (SECURITY DEFINER bypasses trip_members RLS safely).
CREATE OR REPLACE FUNCTION public.is_trip_member(_user_id uuid, _trip_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_members
    WHERE user_id = _user_id AND trip_id = _trip_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_trip_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trip_member(uuid, text) TO anon;

-- -----------------------------------------------------------------------------
-- trip_media_index
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can delete trip media" ON public.trip_media_index;
CREATE POLICY "Members can delete trip media"
ON public.trip_media_index
FOR DELETE
TO authenticated
USING (
  public.is_trip_member(auth.uid(), trip_id)
  OR EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = trip_media_index.trip_id
      AND t.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can update trip media" ON public.trip_media_index;
CREATE POLICY "Members can update trip media"
ON public.trip_media_index
FOR UPDATE
TO authenticated
USING (
  public.is_trip_member(auth.uid(), trip_id)
  OR EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = trip_media_index.trip_id
      AND t.created_by = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- trip_files
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can delete trip files" ON public.trip_files;
CREATE POLICY "Members can delete trip files"
ON public.trip_files
FOR DELETE
TO authenticated
USING (
  public.is_trip_member(auth.uid(), trip_id)
  OR EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = trip_files.trip_id
      AND t.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can update trip files" ON public.trip_files;
CREATE POLICY "Members can update trip files"
ON public.trip_files
FOR UPDATE
TO authenticated
USING (
  public.is_trip_member(auth.uid(), trip_id)
  OR EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = trip_files.trip_id
      AND t.created_by = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- trip_link_index
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can delete trip links" ON public.trip_link_index;
CREATE POLICY "Members can delete trip links"
ON public.trip_link_index
FOR DELETE
TO authenticated
USING (
  public.is_trip_member(auth.uid(), trip_id)
  OR EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = trip_link_index.trip_id
      AND t.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can update trip links" ON public.trip_link_index;
CREATE POLICY "Members can update trip links"
ON public.trip_link_index
FOR UPDATE
TO authenticated
USING (
  public.is_trip_member(auth.uid(), trip_id)
  OR EXISTS (
    SELECT 1
    FROM public.trips t
    WHERE t.id = trip_link_index.trip_id
      AND t.created_by = auth.uid()
  )
);
