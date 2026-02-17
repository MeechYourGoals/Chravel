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

-- Backfill ALL rows where ai_access_enabled is false
UPDATE trip_privacy_configs SET ai_access_enabled = true, updated_at = now()
WHERE ai_access_enabled = false;

UPDATE trips SET ai_access_enabled = true, updated_at = now()
WHERE COALESCE(ai_access_enabled, false) = false;