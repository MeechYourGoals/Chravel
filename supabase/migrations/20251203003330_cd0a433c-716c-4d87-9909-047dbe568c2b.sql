-- Add is_hidden column for privacy feature
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- Create index for efficient hidden trip queries
CREATE INDEX IF NOT EXISTS idx_trips_is_hidden ON trips(is_hidden) WHERE is_hidden = true;

-- Create index for efficient archived trip queries  
CREATE INDEX IF NOT EXISTS idx_trips_is_archived ON trips(is_archived) WHERE is_archived = true;