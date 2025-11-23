-- Phase 4: Backfill trip_type for existing trips
-- This migration ensures all existing trips have proper trip_type values

-- First, update any trips that are clearly Pro trips based on naming patterns
UPDATE trips
SET trip_type = 'pro'
WHERE trip_type IS NULL 
  AND (
    name ILIKE '%lakers%' 
    OR name ILIKE '%beyonce%' 
    OR name ILIKE '%lacrosse%'
    OR name ILIKE '%soccer%'
    OR name ILIKE '%eli lilly%'
    OR name ILIKE '%tour%'
    OR name ILIKE '%concert%'
    OR name ILIKE '%team%'
    OR name ILIKE '%league%'
  );

-- Update any trips that are clearly Events based on naming patterns
UPDATE trips
SET trip_type = 'event'
WHERE trip_type IS NULL 
  AND (
    name ILIKE '%conference%' 
    OR name ILIKE '%summit%' 
    OR name ILIKE '%expo%'
    OR name ILIKE '%festival%'
  );

-- Set remaining NULL trips to 'consumer' (standard trips)
UPDATE trips
SET trip_type = 'consumer'
WHERE trip_type IS NULL;

-- Add default value for future inserts
ALTER TABLE trips
ALTER COLUMN trip_type SET DEFAULT 'consumer';

-- Add comment for documentation
COMMENT ON COLUMN trips.trip_type IS 'Type of trip: consumer (standard), pro (organizations/teams), or event (conferences/festivals)';
