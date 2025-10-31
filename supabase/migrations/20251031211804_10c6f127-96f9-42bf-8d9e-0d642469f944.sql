-- Add categories column to trips table for trip categorization feature
-- This enables Explorer+ users to tag trips with categories (Work, Leisure, Family, etc.)

ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance on category filtering
CREATE INDEX IF NOT EXISTS idx_trips_categories ON trips USING GIN(categories);

COMMENT ON COLUMN trips.categories IS 'Array of category IDs for trip classification (Explorer+ feature)';
