-- Update the initialize_trip_privacy_config trigger to default Pro/Event trips to High Privacy
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
    -- Pro and Event trips default to 'high' privacy with E2EE
    CASE WHEN NEW.trip_type IN ('pro', 'event') THEN 'high' ELSE 'standard' END,
    -- AI access disabled for high privacy, enabled for standard
    CASE WHEN NEW.trip_type IN ('pro', 'event') THEN false ELSE true END,
    NEW.created_by
  );
  RETURN NEW;
END;
$function$;

-- Add comment explaining the privacy defaults
COMMENT ON FUNCTION public.initialize_trip_privacy_config() IS 'Automatically creates privacy configuration when a trip is created. Pro and Event trips default to High Privacy mode with E2EE enabled and AI access disabled. Consumer trips default to Standard Privacy.';