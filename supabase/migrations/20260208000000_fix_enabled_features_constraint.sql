-- Fix: Update valid_enabled_features CHECK constraint to include Pro/Event-specific features
-- Root cause: The original constraint (20251123) only allowed 8 shared features.
-- Pro trips require 'team' and Event trips require 'agenda' and 'lineup'.
-- This caused the create-trip Edge Function to return a 500 when inserting
-- Pro or Event trips (DB rejected the insert with a constraint violation).

ALTER TABLE public.trips
DROP CONSTRAINT IF EXISTS valid_enabled_features;

ALTER TABLE public.trips
ADD CONSTRAINT valid_enabled_features CHECK (
  enabled_features <@ ARRAY[
    'agenda',
    'calendar',
    'chat',
    'concierge',
    'lineup',
    'media',
    'payments',
    'places',
    'polls',
    'tasks',
    'team'
  ]::TEXT[]
);

COMMENT ON CONSTRAINT valid_enabled_features ON public.trips IS 
  'Ensures enabled_features only contains valid feature names. Includes shared features plus Pro-specific (team) and Event-specific (agenda, lineup).';
