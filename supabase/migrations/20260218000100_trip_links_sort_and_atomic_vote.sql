-- Add explicit sort order for trip links so drag-and-drop persists deterministically
ALTER TABLE public.trip_links
ADD COLUMN IF NOT EXISTS sort_order integer;

-- Backfill existing rows using creation order per trip
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY trip_id ORDER BY created_at ASC) - 1 AS rn
  FROM public.trip_links
)
UPDATE public.trip_links tl
SET sort_order = ranked.rn
FROM ranked
WHERE ranked.id = tl.id
  AND tl.sort_order IS NULL;

ALTER TABLE public.trip_links
ALTER COLUMN sort_order SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_trip_links_trip_id_sort_order
  ON public.trip_links(trip_id, sort_order);

-- Atomic vote increment for concurrency safety
CREATE OR REPLACE FUNCTION public.increment_trip_link_votes(p_link_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.trip_links
  SET votes = COALESCE(votes, 0) + 1
  WHERE id = p_link_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;
