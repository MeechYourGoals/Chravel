-- Migration: Add free Pro trip trial tracking columns to profiles
-- Purpose: Allow each new user to create one free Pro trip before requiring subscription

-- Add columns to track free Pro trip usage
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS free_pro_trips_used INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS free_pro_trip_limit INTEGER DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN profiles.free_pro_trips_used IS 'Number of free Pro trips the user has created';
COMMENT ON COLUMN profiles.free_pro_trip_limit IS 'Maximum number of free Pro trips allowed (default: 1)';

-- Create index for efficient lookup
CREATE INDEX IF NOT EXISTS idx_profiles_free_pro_trips ON profiles(free_pro_trips_used, free_pro_trip_limit);
