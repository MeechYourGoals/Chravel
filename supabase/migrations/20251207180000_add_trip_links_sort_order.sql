-- Add sort_order column to trip_links table for drag-and-drop reordering
ALTER TABLE trip_links
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_trip_links_trip_sort
ON trip_links(trip_id, sort_order);

-- Update existing links with default sort order based on created_at
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY trip_id ORDER BY created_at DESC) as rn
  FROM trip_links
)
UPDATE trip_links
SET sort_order = ordered.rn
FROM ordered
WHERE trip_links.id = ordered.id AND trip_links.sort_order = 0;
