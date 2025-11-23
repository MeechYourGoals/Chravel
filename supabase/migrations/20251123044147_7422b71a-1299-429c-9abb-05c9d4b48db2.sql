-- Phase 2: Add enabled_features column to trips table
-- This column stores which features are enabled for Pro/Event trips
-- Consumer trips always have all features enabled (ignore this column)

ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS enabled_features TEXT[] 
DEFAULT ARRAY['chat', 'calendar', 'concierge', 'media', 'payments', 'places', 'polls', 'tasks'];

-- Add constraint: Only allow valid feature names
ALTER TABLE public.trips
ADD CONSTRAINT valid_enabled_features CHECK (
  enabled_features <@ ARRAY['chat', 'calendar', 'concierge', 'media', 'payments', 'places', 'polls', 'tasks']::TEXT[]
);

-- Add comment for documentation
COMMENT ON COLUMN public.trips.enabled_features IS 'Array of enabled feature names for Pro/Event trips. Consumer trips ignore this and have all features enabled. Valid values: chat, calendar, concierge, media, payments, places, polls, tasks';

-- Create index for performance when querying by enabled features
CREATE INDEX IF NOT EXISTS idx_trips_enabled_features ON public.trips USING GIN (enabled_features);