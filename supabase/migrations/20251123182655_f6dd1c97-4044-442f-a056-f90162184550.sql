-- Add caption and tags to trip_media_index for media metadata
ALTER TABLE trip_media_index
  ADD COLUMN caption TEXT,
  ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Create index for tag searches
CREATE INDEX idx_trip_media_tags ON trip_media_index USING GIN(tags);

-- Add comment explaining new fields
COMMENT ON COLUMN trip_media_index.caption IS 'User-provided caption/description for media item';
COMMENT ON COLUMN trip_media_index.tags IS 'Array of user-defined tags for categorization and search';