-- Create notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  chat_messages BOOLEAN DEFAULT FALSE,
  mentions_only BOOLEAN DEFAULT TRUE,
  broadcasts BOOLEAN DEFAULT TRUE,
  tasks BOOLEAN DEFAULT TRUE,
  payments BOOLEAN DEFAULT TRUE,
  calendar_events BOOLEAN DEFAULT TRUE,
  polls BOOLEAN DEFAULT TRUE,
  join_requests BOOLEAN DEFAULT TRUE,
  trip_invites BOOLEAN DEFAULT TRUE,
  basecamp_updates BOOLEAN DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_start TEXT DEFAULT '22:00',
  quiet_end TEXT DEFAULT '08:00',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;

-- Create RLS policies
CREATE POLICY "Users can view own preferences" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Add poll notification trigger
CREATE OR REPLACE FUNCTION public.notify_on_poll_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_name TEXT;
  v_creator_name TEXT;
  v_member RECORD;
BEGIN
  -- Get trip name
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  -- Get creator name
  SELECT COALESCE(display_name, first_name || ' ' || last_name, email, 'Someone') 
  INTO v_creator_name
  FROM profiles WHERE user_id = NEW.created_by;
  
  -- Notify all trip members except creator
  FOR v_member IN 
    SELECT user_id FROM trip_members 
    WHERE trip_id = NEW.trip_id AND user_id != NEW.created_by
  LOOP
    -- Check if user wants poll notifications
    IF should_send_notification(v_member.user_id, 'polls') THEN
      INSERT INTO notifications (user_id, trip_id, type, title, message, metadata)
      VALUES (
        v_member.user_id,
        NEW.trip_id::UUID,
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
$$;

-- Create trigger for polls
DROP TRIGGER IF EXISTS trigger_notify_poll_created ON trip_polls;
CREATE TRIGGER trigger_notify_poll_created
AFTER INSERT ON trip_polls
FOR EACH ROW
EXECUTE FUNCTION notify_on_poll_created();

-- Add basecamp update notification trigger
CREATE OR REPLACE FUNCTION public.notify_on_basecamp_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updater_name TEXT;
  v_member RECORD;
BEGIN
  -- Only trigger if basecamp actually changed
  IF OLD.basecamp_address IS NOT DISTINCT FROM NEW.basecamp_address 
     AND OLD.basecamp_name IS NOT DISTINCT FROM NEW.basecamp_name THEN
    RETURN NEW;
  END IF;
  
  -- Get updater name (use trip creator as fallback)
  SELECT COALESCE(display_name, first_name || ' ' || last_name, email, 'Someone') 
  INTO v_updater_name
  FROM profiles WHERE user_id = NEW.created_by;
  
  -- Notify all trip members
  FOR v_member IN 
    SELECT user_id FROM trip_members WHERE trip_id = NEW.id
  LOOP
    -- Check if user wants basecamp notifications
    IF should_send_notification(v_member.user_id, 'basecamp_updates') THEN
      INSERT INTO notifications (user_id, trip_id, type, title, message, metadata)
      VALUES (
        v_member.user_id,
        NEW.id::UUID,
        'system',
        '📍 Base camp updated',
        'The base camp for ' || COALESCE(NEW.name, 'your trip') || ' has been updated to ' || COALESCE(NEW.basecamp_name, NEW.basecamp_address, 'a new location'),
        jsonb_build_object(
          'trip_id', NEW.id,
          'trip_name', NEW.name,
          'basecamp_name', NEW.basecamp_name,
          'basecamp_address', NEW.basecamp_address
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for basecamp updates
DROP TRIGGER IF EXISTS trigger_notify_basecamp_update ON trips;
CREATE TRIGGER trigger_notify_basecamp_update
AFTER UPDATE ON trips
FOR EACH ROW
WHEN (OLD.basecamp_address IS DISTINCT FROM NEW.basecamp_address OR OLD.basecamp_name IS DISTINCT FROM NEW.basecamp_name)
EXECUTE FUNCTION notify_on_basecamp_update();

-- Update should_send_notification to check the new notification_preferences table
CREATE OR REPLACE FUNCTION public.should_send_notification(p_user_id uuid, p_notification_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs RECORD;
  v_enabled BOOLEAN;
BEGIN
  -- Get user's notification preferences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences, default to enabled
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- Check specific notification type
  CASE p_notification_type
    WHEN 'broadcasts' THEN v_enabled := v_prefs.broadcasts;
    WHEN 'chat_messages', 'messages' THEN v_enabled := v_prefs.chat_messages;
    WHEN 'tasks' THEN v_enabled := v_prefs.tasks;
    WHEN 'payments' THEN v_enabled := v_prefs.payments;
    WHEN 'calendar', 'calendar_events' THEN v_enabled := v_prefs.calendar_events;
    WHEN 'polls' THEN v_enabled := v_prefs.polls;
    WHEN 'join_requests' THEN v_enabled := v_prefs.join_requests;
    WHEN 'trip_invites' THEN v_enabled := v_prefs.trip_invites;
    WHEN 'basecamp_updates' THEN v_enabled := v_prefs.basecamp_updates;
    ELSE v_enabled := true;
  END CASE;
  
  RETURN COALESCE(v_enabled, true);
END;
$$;