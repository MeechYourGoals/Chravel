-- Fix notify_on_chat_message function - trip_members has no status column
CREATE OR REPLACE FUNCTION public.notify_on_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_name TEXT;
  v_author_name TEXT;
  v_member RECORD;
  v_should_notify BOOLEAN;
  v_prefs notification_preferences%ROWTYPE;
  v_is_mentioned BOOLEAN;
BEGIN
  -- Get trip name
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  -- Get author name
  v_author_name := COALESCE(NEW.author_name, 'Someone');
  
  -- Notify each trip member except the sender
  FOR v_member IN 
    SELECT tm.user_id 
    FROM trip_members tm 
    WHERE tm.trip_id = NEW.trip_id 
    AND tm.user_id != NEW.user_id
  LOOP
    -- Check if user is mentioned
    v_is_mentioned := NEW.mentioned_user_ids IS NOT NULL 
                      AND v_member.user_id = ANY(NEW.mentioned_user_ids);
    
    -- Get user preferences
    SELECT * INTO v_prefs
    FROM notification_preferences
    WHERE user_id = v_member.user_id;
    
    -- Determine if we should notify
    v_should_notify := false;
    
    IF NOT FOUND THEN
      -- No preferences = use defaults (chat off, but mentions on)
      v_should_notify := v_is_mentioned;
    ELSIF v_is_mentioned THEN
      -- Always notify on mention (unless push globally disabled)
      v_should_notify := COALESCE(v_prefs.push_enabled, true);
    ELSIF COALESCE(v_prefs.mentions_only, true) THEN
      -- User only wants mentions, skip regular messages
      v_should_notify := false;
    ELSE
      -- Check if chat notifications are enabled
      v_should_notify := public.should_send_notification(v_member.user_id, 'chat');
    END IF;
    
    IF v_should_notify THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        trip_id,
        is_read,
        is_visible,
        metadata
      ) VALUES (
        v_member.user_id,
        CASE WHEN v_is_mentioned 
          THEN v_author_name || ' mentioned you'
          ELSE 'New message in ' || COALESCE(v_trip_name, 'your trip')
        END,
        LEFT(NEW.content, 100),
        CASE WHEN v_is_mentioned THEN 'mention' ELSE 'chat' END,
        NEW.trip_id,
        false,
        true,
        jsonb_build_object(
          'message_id', NEW.id,
          'sender_id', NEW.user_id,
          'is_mention', v_is_mentioned
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;