-- Add basecamp coordinates to trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS basecamp_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS basecamp_longitude DOUBLE PRECISION;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_trips_basecamp_coords 
ON trips(basecamp_latitude, basecamp_longitude);

-- Enable realtime for trip basecamp updates (ensure REPLICA IDENTITY is set)
ALTER TABLE trips REPLICA IDENTITY FULL;