-- Fix calendar bulk import timeout
-- The notify_on_calendar_event trigger fires FOR EACH ROW and does heavy work
-- (trips SELECT, profiles SELECT, trip_members SELECT, send_notification for each member).
-- For bulk imports (33+ events), this causes HTTP timeout before the client gets a response.
--
-- Solution: Skip notifications when source_type = 'bulk_import'.
-- Users see import progress in the UI; per-event notifications are unnecessary for bulk imports.

CREATE OR REPLACE FUNCTION public.notify_on_calendar_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_creator_name TEXT;
BEGIN
  -- Skip notifications for bulk imports — user sees progress in UI, avoids DB timeout
  IF NEW.source_type = 'bulk_import' THEN
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
$$;

COMMENT ON FUNCTION public.notify_on_calendar_event IS
  'Sends notifications when new calendar events are created. Skips notifications for bulk_import source_type to avoid timeout on large imports (82+ games, 100+ city tours).';
