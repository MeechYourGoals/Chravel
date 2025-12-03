-- Add taste test tracking columns for free users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_pro_trips_used INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_events_used INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_pro_trip_limit INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_event_limit INTEGER DEFAULT 1;