
-- Fix: Make notify_on_calendar_event trigger skippable during bulk imports
-- This prevents the trigger from doing heavy work (send_notification for each row)
-- which causes HTTP timeouts on bulk inserts of 10+ events.

CREATE OR REPLACE FUNCTION public.notify_on_calendar_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_creator_name TEXT;
  v_skip TEXT;
BEGIN
  -- Allow bulk imports to skip notifications via session variable
  BEGIN
    v_skip := current_setting('chravel.skip_calendar_notifications', true);
  EXCEPTION WHEN OTHERS THEN
    v_skip := '';
  END;
  
  IF v_skip = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  SELECT COALESCE(
    display_name,
    first_name || ' ' || last_name,
    email
  ) INTO v_creator_name
  FROM profiles
  WHERE user_id = NEW.created_by;
  
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.created_by;
  
  IF v_member_ids IS NOT NULL AND array_length(v_member_ids, 1) > 0 THEN
    PERFORM send_notification(
      v_member_ids,
      NEW.trip_id::UUID,
      'calendar',
      '📅 New event: ' || NEW.title,
      COALESCE(v_creator_name, 'Someone') || ' added a new event' || 
        CASE WHEN NEW.start_time IS NOT NULL 
          THEN ' on ' || to_char(NEW.start_time, 'Mon DD, YYYY at HH:MI AM')
          ELSE ''
        END ||
        CASE WHEN NEW.location IS NOT NULL 
          THEN ' at ' || NEW.location
          ELSE ''
        END,
      jsonb_build_object(
        'event_id', NEW.id,
        'trip_id', NEW.trip_id,
        'start_time', NEW.start_time,
        'location', NEW.location,
        'action', 'event_created'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
