ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS organizer_display_name TEXT;

COMMENT ON COLUMN public.trips.organizer_display_name IS 'Custom display name for the event/trip organizer';

CREATE INDEX IF NOT EXISTS idx_trips_organizer_display_name ON public.trips(organizer_display_name) WHERE organizer_display_name IS NOT NULL;