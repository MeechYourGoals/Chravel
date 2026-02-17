-- Enable AI Concierge for ALL Pro and Event trips.
-- Policy: AI is enabled by default for pro/event trips from now on.

-- 1. Update trip_privacy_configs: set ai_access_enabled = true for all pro/event trips
UPDATE public.trip_privacy_configs AS pc
SET
  ai_access_enabled = true,
  updated_at = now()
FROM public.trips AS t
WHERE pc.trip_id = t.id
  AND t.trip_type IN ('pro', 'event')
  AND pc.ai_access_enabled = false;

-- 2. Update trips table ai_access_enabled for consistency (if column exists)
UPDATE public.trips AS t
SET
  ai_access_enabled = true,
  updated_at = now()
WHERE t.trip_type IN ('pro', 'event')
  AND COALESCE(t.ai_access_enabled, false) = false;

-- Note: initialize_trip_privacy_config (20260212170000) already defaults new trips to
-- ai_access_enabled = true via COALESCE(NEW.ai_access_enabled, true).
-- This migration backfills existing Pro/Event trips that still had AI disabled.
