-- Enable AI Concierge by default for Pro/Event trips, even in high privacy mode.
-- High privacy still controls message encryption; AI availability is now managed
-- by ai_access_enabled instead of being hard-disabled by trip type.

CREATE OR REPLACE FUNCTION public.initialize_trip_privacy_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.trip_privacy_configs (
    trip_id,
    privacy_mode,
    ai_access_enabled,
    created_by
  ) VALUES (
    NEW.id,
    CASE
      WHEN NEW.trip_type IN ('pro', 'event') THEN COALESCE(NEW.privacy_mode, 'high')
      ELSE COALESCE(NEW.privacy_mode, 'standard')
    END,
    COALESCE(NEW.ai_access_enabled, true),
    NEW.created_by
  );
  RETURN NEW;
END;
$function$;

-- Backfill only untouched legacy defaults.
-- This avoids overriding explicit organizer/admin decisions to keep AI disabled.
--
-- Legacy rows are identified as:
-- - pro/event trip
-- - high privacy
-- - ai_access_enabled currently false
-- - privacy config has never been updated since creation
UPDATE public.trips AS t
SET
  ai_access_enabled = true,
  updated_at = now()
FROM public.trip_privacy_configs AS pc
WHERE pc.trip_id = t.id
  AND t.trip_type IN ('pro', 'event')
  AND pc.privacy_mode = 'high'
  AND pc.ai_access_enabled = false
  AND pc.updated_at <= pc.created_at + interval '1 second'
  AND COALESCE(t.ai_access_enabled, false) = false;

UPDATE public.trip_privacy_configs AS pc
SET
  ai_access_enabled = true,
  updated_at = now()
FROM public.trips AS t
WHERE pc.trip_id = t.id
  AND t.trip_type IN ('pro', 'event')
  AND pc.privacy_mode = 'high'
  AND pc.ai_access_enabled = false
  AND pc.updated_at <= pc.created_at + interval '1 second';

COMMENT ON FUNCTION public.initialize_trip_privacy_config() IS
'Automatically creates privacy configuration when a trip is created. Pro and Event trips default to High Privacy mode with AI enabled by default unless explicitly disabled.';
