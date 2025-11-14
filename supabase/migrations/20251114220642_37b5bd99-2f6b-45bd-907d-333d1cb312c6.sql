-- ============================================================================
-- ADD MISSING NOTIFICATION TRIGGERS
-- Adds notifications for calendar event creation and regular chat messages
-- ============================================================================

-- ============================================================================
-- 1. CALENDAR EVENT CREATION NOTIFICATIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_calendar_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_creator_name TEXT;
BEGIN
  -- Get trip details
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  -- Get creator's name
  SELECT COALESCE(
    display_name,
    first_name || ' ' || last_name,
    email
  ) INTO v_creator_name
  FROM profiles
  WHERE user_id = NEW.created_by;
  
  -- Get all trip members except creator
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.created_by;
  
  -- Send notification to all trip members
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

-- Create trigger for new calendar events
DROP TRIGGER IF EXISTS trigger_notify_calendar_event ON trip_events;
CREATE TRIGGER trigger_notify_calendar_event
AFTER INSERT ON trip_events
FOR EACH ROW
WHEN (NEW.include_in_itinerary = TRUE)
EXECUTE FUNCTION notify_on_calendar_event();

COMMENT ON FUNCTION notify_on_calendar_event IS 'Sends notifications when new calendar events are created';

-- ============================================================================
-- 2. REGULAR CHAT MESSAGE NOTIFICATIONS (respects user preferences)
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_sender_name TEXT;
BEGIN
  -- Skip if message is deleted
  IF NEW.is_deleted = TRUE THEN
    RETURN NEW;
  END IF;
  
  -- Get trip details
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  -- Get sender's name
  SELECT COALESCE(
    display_name,
    first_name || ' ' || last_name,
    email
  ) INTO v_sender_name
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Get all trip members except sender
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.user_id;
  
  -- Send notification (will be filtered by user preferences - defaults to OFF)
  IF v_member_ids IS NOT NULL AND array_length(v_member_ids, 1) > 0 THEN
    PERFORM send_notification(
      v_member_ids,
      NEW.trip_id::UUID,
      'chat',
      '💬 ' || COALESCE(v_sender_name, 'Someone') || ' in ' || v_trip_name,
      SUBSTRING(NEW.content, 1, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
      jsonb_build_object(
        'message_id', NEW.id,
        'trip_id', NEW.trip_id,
        'sender_id', NEW.user_id,
        'trip_name', v_trip_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for chat messages
-- NOTE: This is separate from the mention trigger
-- Users can enable/disable this in preferences (defaults to OFF)
DROP TRIGGER IF EXISTS trigger_notify_chat_message ON trip_chat_messages;
CREATE TRIGGER trigger_notify_chat_message
AFTER INSERT ON trip_chat_messages
FOR EACH ROW
WHEN (NEW.is_deleted = FALSE OR NEW.is_deleted IS NULL)
EXECUTE FUNCTION notify_on_chat_message();

COMMENT ON FUNCTION notify_on_chat_message IS 'Sends notifications for all chat messages (respects user preferences, defaults to OFF)';

-- ============================================================================
-- 3. UPDATE BROADCAST TRIGGER TO HANDLE URGENT PRIORITY
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_on_broadcast()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_creator_name TEXT;
  v_title_prefix TEXT;
BEGIN
  -- Get trip details
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  -- Get creator's name
  SELECT COALESCE(
    display_name,
    first_name || ' ' || last_name,
    email
  ) INTO v_creator_name
  FROM profiles
  WHERE user_id = NEW.created_by;
  
  -- Get all trip members except broadcaster
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.created_by;
  
  -- Set title prefix based on priority
  v_title_prefix := CASE 
    WHEN NEW.priority = 'urgent' THEN '🚨 URGENT: '
    WHEN NEW.priority = 'high' THEN '⚠️ '
    ELSE '📢 '
  END;
  
  -- Send notification
  IF v_member_ids IS NOT NULL AND array_length(v_member_ids, 1) > 0 THEN
    PERFORM send_notification(
      v_member_ids,
      NEW.trip_id::UUID,
      'broadcast',
      v_title_prefix || COALESCE(v_creator_name, 'Someone') || ' sent a broadcast',
      SUBSTRING(NEW.message, 1, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END,
      jsonb_build_object(
        'broadcast_id', NEW.id,
        'trip_id', NEW.trip_id,
        'priority', COALESCE(NEW.priority, 'normal'),
        'trip_name', v_trip_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate broadcast trigger with updated function
DROP TRIGGER IF EXISTS trigger_notify_broadcast ON broadcasts;
CREATE TRIGGER trigger_notify_broadcast
AFTER INSERT ON broadcasts
FOR EACH ROW
WHEN (NEW.is_sent = TRUE OR NEW.scheduled_for IS NULL)
EXECUTE FUNCTION notify_on_broadcast();

COMMENT ON FUNCTION notify_on_broadcast IS 'Sends notifications for broadcasts with priority-based styling';