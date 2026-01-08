-- Phase 1: Fix Message Alert Bug - Update should_send_notification to handle 'chat' type
CREATE OR REPLACE FUNCTION public.should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs notification_preferences%ROWTYPE;
  v_enabled BOOLEAN := true;
  v_is_quiet BOOLEAN := false;
  v_current_time TIME;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences, return true (allow notification with defaults)
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  
  -- Check if push is enabled globally
  IF NOT COALESCE(v_prefs.push_enabled, true) THEN
    RETURN false;
  END IF;
  
  -- Check quiet hours
  IF COALESCE(v_prefs.quiet_hours_enabled, false) AND 
     v_prefs.quiet_start IS NOT NULL AND 
     v_prefs.quiet_end IS NOT NULL THEN
    v_current_time := LOCALTIME;
    IF v_prefs.quiet_start < v_prefs.quiet_end THEN
      v_is_quiet := v_current_time BETWEEN v_prefs.quiet_start AND v_prefs.quiet_end;
    ELSE
      v_is_quiet := v_current_time >= v_prefs.quiet_start OR v_current_time <= v_prefs.quiet_end;
    END IF;
    
    IF v_is_quiet THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Check specific notification type preference
  -- Note: 'chat' is an alias for 'chat_messages' from the trigger
  CASE p_notification_type
    WHEN 'broadcasts' THEN v_enabled := COALESCE(v_prefs.broadcasts, true);
    WHEN 'chat_messages', 'messages', 'chat' THEN v_enabled := COALESCE(v_prefs.chat_messages, false);
    WHEN 'calendar_events', 'calendar' THEN v_enabled := COALESCE(v_prefs.calendar_events, true);
    WHEN 'tasks', 'task' THEN v_enabled := COALESCE(v_prefs.tasks, true);
    WHEN 'payments', 'payment' THEN v_enabled := COALESCE(v_prefs.payments, true);
    WHEN 'polls', 'poll' THEN v_enabled := COALESCE(v_prefs.polls, true);
    WHEN 'join_requests', 'join_request' THEN v_enabled := COALESCE(v_prefs.join_requests, true);
    WHEN 'basecamp_updates', 'basecamp' THEN v_enabled := COALESCE(v_prefs.basecamp_updates, true);
    WHEN 'trip_invites' THEN v_enabled := COALESCE(v_prefs.trip_invites, true);
    ELSE v_enabled := true;
  END CASE;
  
  RETURN v_enabled;
END;
$$;

-- Phase 2: Add mentioned_user_ids column to trip_chat_messages (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip_chat_messages' 
    AND column_name = 'mentioned_user_ids'
  ) THEN
    ALTER TABLE public.trip_chat_messages 
    ADD COLUMN mentioned_user_ids UUID[] DEFAULT '{}';
  END IF;
END $$;

-- Create index for efficient mention queries
CREATE INDEX IF NOT EXISTS idx_trip_chat_mentions 
ON public.trip_chat_messages USING GIN(mentioned_user_ids);

-- Phase 3: Set default notification preferences
ALTER TABLE public.notification_preferences 
ALTER COLUMN chat_messages SET DEFAULT false,
ALTER COLUMN mentions_only SET DEFAULT true,
ALTER COLUMN broadcasts SET DEFAULT true,
ALTER COLUMN calendar_events SET DEFAULT true,
ALTER COLUMN payments SET DEFAULT true,
ALTER COLUMN tasks SET DEFAULT true,
ALTER COLUMN polls SET DEFAULT true,
ALTER COLUMN join_requests SET DEFAULT true,
ALTER COLUMN basecamp_updates SET DEFAULT true,
ALTER COLUMN push_enabled SET DEFAULT true,
ALTER COLUMN email_enabled SET DEFAULT true;

-- Phase 5: Add soft delete columns to notifications (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'is_visible'
  ) THEN
    ALTER TABLE public.notifications 
    ADD COLUMN is_visible BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'cleared_at'
  ) THEN
    ALTER TABLE public.notifications 
    ADD COLUMN cleared_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for visible notifications
CREATE INDEX IF NOT EXISTS idx_notifications_visible 
ON public.notifications(user_id, is_visible) 
WHERE is_visible = true;

-- Update existing notifications to be visible
UPDATE public.notifications SET is_visible = true WHERE is_visible IS NULL;

-- Create trigger to auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (
    user_id,
    chat_messages,
    mentions_only,
    broadcasts,
    calendar_events,
    payments,
    tasks,
    polls,
    join_requests,
    basecamp_updates,
    push_enabled,
    email_enabled
  ) VALUES (
    NEW.user_id,
    false,  -- chat_messages OFF by default (conservative)
    true,   -- mentions_only ON
    true,   -- broadcasts ON
    true,   -- calendar_events ON
    true,   -- payments ON
    true,   -- tasks ON
    true,   -- polls ON
    true,   -- join_requests ON
    true,   -- basecamp_updates ON
    true,   -- push_enabled ON
    true    -- email_enabled ON
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_profile_created_notification_prefs ON public.profiles;
CREATE TRIGGER on_profile_created_notification_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_notification_preferences();

-- Update notify_on_chat_message to handle mentions properly
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
    AND tm.status = 'active'
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
          'trip_id', NEW.trip_id,
          'trip_name', v_trip_name,
          'message_id', NEW.id,
          'sender_name', v_author_name,
          'is_mention', v_is_mentioned
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_notify_chat_message ON public.trip_chat_messages;
CREATE TRIGGER trigger_notify_chat_message
  AFTER INSERT ON public.trip_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_chat_message();