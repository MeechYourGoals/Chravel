-- Add organizer_display_name column to trips table
-- This allows event organizers to specify a display name for who's organizing the event
-- e.g., "Los Angeles Rams", "Boys & Girls Club of Dallas", "Acme Events Inc."

ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS organizer_display_name TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN public.trips.organizer_display_name IS 'Custom display name for the event/trip organizer (e.g., organization name, company, or group)';

-- Create an index for potential filtering/searching by organizer
CREATE INDEX IF NOT EXISTS idx_trips_organizer_display_name ON public.trips(organizer_display_name) WHERE organizer_display_name IS NOT NULL;
