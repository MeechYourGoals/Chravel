CREATE OR REPLACE FUNCTION public.notify_on_poll_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trip_name TEXT;
  v_creator_name TEXT;
  v_member RECORD;
  v_trip_uuid UUID;
BEGIN
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  BEGIN
    v_trip_uuid := NEW.trip_id::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    v_trip_uuid := NULL;
  END;
  
  SELECT COALESCE(display_name, first_name || ' ' || last_name, email, 'Someone') 
  INTO v_creator_name
  FROM profiles WHERE user_id = NEW.created_by;
  
  FOR v_member IN 
    SELECT user_id FROM trip_members 
    WHERE trip_id = NEW.trip_id AND user_id != NEW.created_by
  LOOP
    IF should_send_notification(v_member.user_id, 'polls') THEN
      INSERT INTO notifications (user_id, trip_id, type, title, message, metadata)
      VALUES (
        v_member.user_id,
        v_trip_uuid,
        'poll',
        '📊 New poll: ' || NEW.question,
        v_creator_name || ' created a poll in ' || COALESCE(v_trip_name, 'your trip'),
        jsonb_build_object(
          'poll_id', NEW.id,
          'trip_id', NEW.trip_id,
          'trip_name', v_trip_name,
          'creator_id', NEW.created_by
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;