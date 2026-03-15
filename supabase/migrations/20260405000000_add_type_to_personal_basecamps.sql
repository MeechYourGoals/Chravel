-- Add accommodation type column to trip_personal_basecamps
-- Fixes: Personal Base Camp type selection (hotel/short-term/other) was never persisted
-- Default 'hotel' matches the BasecampSelector form default
ALTER TABLE trip_personal_basecamps
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'hotel';
