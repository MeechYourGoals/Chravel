-- Fix trip date columns to accept ISO 8601 datetime format
-- Change from 'date' to 'timestamp with time zone' for API compatibility

ALTER TABLE trips 
ALTER COLUMN start_date TYPE timestamp with time zone USING start_date::timestamp with time zone;

ALTER TABLE trips 
ALTER COLUMN end_date TYPE timestamp with time zone USING end_date::timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN trips.start_date IS 'Trip start date/time in ISO 8601 format';
COMMENT ON COLUMN trips.end_date IS 'Trip end date/time in ISO 8601 format';