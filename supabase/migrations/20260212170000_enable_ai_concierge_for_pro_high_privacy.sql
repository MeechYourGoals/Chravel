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

-- Backfill existing Pro/Event trips created with legacy "AI off in high privacy" defaults.
UPDATE public.trip_privacy_configs AS pc
SET
  ai_access_enabled = true,
  updated_at = now()
FROM public.trips AS t
WHERE pc.trip_id = t.id
  AND t.trip_type IN ('pro', 'event')
  AND pc.ai_access_enabled = false;

-- Keep trips table values aligned for historical records.
UPDATE public.trips
SET
  ai_access_enabled = true,
  updated_at = now()
WHERE trip_type IN ('pro', 'event')
  AND COALESCE(ai_access_enabled, false) = false;

COMMENT ON FUNCTION public.initialize_trip_privacy_config() IS
'Automatically creates privacy configuration when a trip is created. Pro and Event trips default to High Privacy mode with AI enabled by default unless explicitly disabled.';
