-- ============================================================================
-- CHRAVEL NOTIFICATIONS SYSTEM
-- Complete notification infrastructure for iOS/Android/Web
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICATION PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Channels
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  
  -- Categories (what to notify about)
  chat_messages BOOLEAN DEFAULT FALSE, -- Default OFF (too noisy)
  mentions_only BOOLEAN DEFAULT TRUE,  -- Only @mentions in chat
  broadcasts BOOLEAN DEFAULT TRUE,
  tasks BOOLEAN DEFAULT TRUE,
  payments BOOLEAN DEFAULT TRUE,
  calendar_reminders BOOLEAN DEFAULT TRUE,
  trip_invites BOOLEAN DEFAULT TRUE,
  join_requests BOOLEAN DEFAULT TRUE,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_start TIME DEFAULT '22:00',
  quiet_end TIME DEFAULT '08:00',
  timezone TEXT DEFAULT 'America/Los_Angeles',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

COMMENT ON TABLE notification_preferences IS 'User notification preferences and settings';

-- ============================================================================
-- 2. NOTIFICATION HISTORY TABLE (In-app notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::JSONB,
  
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  CONSTRAINT valid_notification_type CHECK (
    notification_type IN (
      'broadcast',
      'mention',
      'chat',
      'task',
      'payment',
      'calendar',
      'invite',
      'join_request',
      'system'
    )
  )
);

COMMENT ON TABLE notification_history IS 'History of all notifications sent to users';

CREATE INDEX idx_notification_history_user_unread ON notification_history(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notification_history_user_created ON notification_history(user_id, created_at DESC);
CREATE INDEX idx_notification_history_trip ON notification_history(trip_id);
CREATE INDEX idx_notification_history_expires ON notification_history(expires_at) WHERE expires_at < NOW();

-- ============================================================================
-- 3. PUSH TOKENS TABLE (Device-specific push notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios', 'android', 'web'
  device_info JSONB DEFAULT '{}'::JSONB,
  
  active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_platform CHECK (platform IN ('ios', 'android', 'web')),
  UNIQUE(user_id, token, platform)
);

COMMENT ON TABLE push_tokens IS 'Push notification tokens for user devices';

CREATE INDEX idx_push_tokens_user_active ON push_tokens(user_id, active) WHERE active = TRUE;
CREATE INDEX idx_push_tokens_platform ON push_tokens(platform, active) WHERE active = TRUE;

-- ============================================================================
-- 4. CORE NOTIFICATION FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION send_notification(
  p_user_ids UUID[],
  p_trip_id UUID,
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_preferences RECORD;
  v_sent_count INTEGER := 0;
BEGIN
  -- Loop through each recipient
  FOREACH v_user_id IN ARRAY p_user_ids LOOP
    -- Get user's notification preferences (create default if not exists)
    SELECT * INTO v_preferences
    FROM notification_preferences
    WHERE user_id = v_user_id;
    
    -- Create default preferences if none exist
    IF v_preferences IS NULL THEN
      INSERT INTO notification_preferences (user_id)
      VALUES (v_user_id)
      RETURNING * INTO v_preferences;
    END IF;
    
    -- Check if this notification type is enabled for this user
    IF (
      (p_notification_type = 'broadcast' AND v_preferences.broadcasts) OR
      (p_notification_type = 'mention' AND v_preferences.mentions_only) OR
      (p_notification_type = 'chat' AND v_preferences.chat_messages) OR
      (p_notification_type = 'task' AND v_preferences.tasks) OR
      (p_notification_type = 'payment' AND v_preferences.payments) OR
      (p_notification_type = 'calendar' AND v_preferences.calendar_reminders) OR
      (p_notification_type = 'invite' AND v_preferences.trip_invites) OR
      (p_notification_type = 'join_request' AND v_preferences.join_requests) OR
      (p_notification_type = 'system') -- System notifications always sent
    ) THEN
      -- Check quiet hours (only if enabled)
      IF NOT (
        v_preferences.quiet_hours_enabled AND
        CURRENT_TIME BETWEEN v_preferences.quiet_start AND v_preferences.quiet_end
      ) THEN
        -- Insert into notification history (in-app notification)
        INSERT INTO notification_history (
          user_id,
          trip_id,
          notification_type,
          title,
          body,
          data
        )
        VALUES (
          v_user_id,
          p_trip_id,
          p_notification_type,
          p_title,
          p_body,
          p_data
        );
        
        v_sent_count := v_sent_count + 1;
        
        -- TODO: Call push notification service
        -- This would invoke: supabase.functions.invoke('send-push-notification', {...})
        -- Human must implement APNs setup for iOS
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_sent_count;
END;
$$;

COMMENT ON FUNCTION send_notification IS 'Core function to send notifications respecting user preferences and quiet hours';

-- ============================================================================
-- 5. NOTIFICATION TRIGGERS
-- ============================================================================

-- A. Broadcast notifications
CREATE OR REPLACE FUNCTION notify_on_broadcast()
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
    p.full_name,
    p.username,
    split_part(u.email, '@', 1)
  ) INTO v_creator_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = NEW.created_by;
  
  -- Get all trip members except broadcaster
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.created_by;
  
  -- Send notification
  IF v_member_ids IS NOT NULL AND array_length(v_member_ids, 1) > 0 THEN
    PERFORM send_notification(
      v_member_ids,
      NEW.trip_id,
      'broadcast',
      '📢 ' || v_creator_name || ' sent a broadcast',
      SUBSTRING(NEW.message, 1, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END,
      jsonb_build_object(
        'broadcast_id', NEW.id,
        'trip_id', NEW.trip_id,
        'priority', COALESCE(NEW.priority, 'normal')
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_broadcast ON broadcasts;
CREATE TRIGGER trigger_notify_broadcast
AFTER INSERT ON broadcasts
FOR EACH ROW
WHEN (NEW.is_sent = TRUE OR NEW.scheduled_for IS NULL)
EXECUTE FUNCTION notify_on_broadcast();

-- B. @Mention notifications in chat
CREATE OR REPLACE FUNCTION notify_on_mention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mentioned_users UUID[];
  v_trip_name TEXT;
  v_sender_name TEXT;
BEGIN
  -- Extract UUID patterns that look like mentions
  -- Assumes format: @uuid or content contains user IDs
  v_mentioned_users := ARRAY(
    SELECT DISTINCT unnest(regexp_matches(NEW.content, '@([a-f0-9-]{36})', 'g'))::UUID
  );
  
  IF v_mentioned_users IS NOT NULL AND array_length(v_mentioned_users, 1) > 0 THEN
    -- Get trip name
    SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
    
    -- Get sender's name
    SELECT COALESCE(
      p.full_name,
      p.username,
      split_part(u.email, '@', 1)
    ) INTO v_sender_name
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE u.id = NEW.sender_id;
    
    -- Send notification
    PERFORM send_notification(
      v_mentioned_users,
      NEW.trip_id,
      'mention',
      '💬 ' || v_sender_name || ' mentioned you',
      SUBSTRING(NEW.content, 1, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
      jsonb_build_object(
        'message_id', NEW.id,
        'trip_id', NEW.trip_id,
        'sender_id', NEW.sender_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_mention ON trip_chat_messages;
CREATE TRIGGER trigger_notify_mention
AFTER INSERT ON trip_chat_messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_mention();

-- C. Task assignment notifications
CREATE OR REPLACE FUNCTION notify_on_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task RECORD;
  v_trip_name TEXT;
  v_assigner_name TEXT;
BEGIN
  -- Get task details
  SELECT t.*, tt.title, tt.trip_id INTO v_task
  FROM trip_tasks tt
  JOIN task_assignments t ON t.task_id = tt.id
  WHERE t.id = NEW.id;
  
  -- Get trip name
  SELECT name INTO v_trip_name FROM trips WHERE id = v_task.trip_id;
  
  -- Get assigner's name (who assigned the task)
  SELECT COALESCE(
    p.full_name,
    p.username,
    split_part(u.email, '@', 1)
  ) INTO v_assigner_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = (SELECT creator_id FROM trip_tasks WHERE id = NEW.task_id);
  
  -- Send notification
  PERFORM send_notification(
    ARRAY[NEW.user_id],
    v_task.trip_id,
    'task',
    '✅ New task: ' || v_task.title,
    'Assigned by ' || v_assigner_name || ' in ' || v_trip_name,
    jsonb_build_object(
      'task_id', NEW.task_id,
      'trip_id', v_task.trip_id,
      'assignment_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_task ON task_assignments;
CREATE TRIGGER trigger_notify_task
AFTER INSERT ON task_assignments
FOR EACH ROW
EXECUTE FUNCTION notify_on_task_assignment();

-- D. Payment request notifications
CREATE OR REPLACE FUNCTION notify_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_name TEXT;
  v_creator_name TEXT;
  v_participant_ids UUID[];
BEGIN
  -- Get trip name
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  -- Get creator's name
  SELECT COALESCE(
    p.full_name,
    p.username,
    split_part(u.email, '@', 1)
  ) INTO v_creator_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = NEW.created_by;
  
  -- Convert split_participants to UUID array (if stored as text[])
  v_participant_ids := ARRAY(
    SELECT unnest(NEW.split_participants)::UUID
  );
  
  -- Remove creator from notifications (they created it)
  v_participant_ids := ARRAY(
    SELECT unnest(v_participant_ids)
    WHERE unnest(v_participant_ids) != NEW.created_by
  );
  
  -- Send notification to all participants
  IF v_participant_ids IS NOT NULL AND array_length(v_participant_ids, 1) > 0 THEN
    PERFORM send_notification(
      v_participant_ids,
      NEW.trip_id,
      'payment',
      '💰 Payment split: ' || NEW.description,
      v_creator_name || ' added a $' || NEW.amount::TEXT || ' ' || NEW.currency || ' expense',
      jsonb_build_object(
        'payment_id', NEW.id,
        'trip_id', NEW.trip_id,
        'amount', NEW.amount,
        'currency', NEW.currency
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_payment ON trip_payments;
CREATE TRIGGER trigger_notify_payment
AFTER INSERT ON trip_payments
FOR EACH ROW
EXECUTE FUNCTION notify_on_payment();

-- E. Trip invitation notifications
CREATE OR REPLACE FUNCTION notify_on_trip_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_name TEXT;
  v_inviter_name TEXT;
BEGIN
  -- Only notify on pending invites (status = 'pending')
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;
  
  -- Get trip name
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  -- Get inviter's name
  SELECT COALESCE(
    p.full_name,
    p.username,
    split_part(u.email, '@', 1)
  ) INTO v_inviter_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = NEW.inviter_id;
  
  -- Send notification (if user_id exists - some invites are email-only)
  IF NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      ARRAY[NEW.user_id],
      NEW.trip_id,
      'invite',
      '🎉 Trip invitation: ' || v_trip_name,
      v_inviter_name || ' invited you to join their trip',
      jsonb_build_object(
        'invite_id', NEW.id,
        'trip_id', NEW.trip_id,
        'invite_code', NEW.code
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: This trigger assumes invite_links table has inviter_id and user_id columns
-- If not, you may need to adjust based on your actual schema
DROP TRIGGER IF EXISTS trigger_notify_trip_invite ON invite_links;
CREATE TRIGGER trigger_notify_trip_invite
AFTER INSERT ON invite_links
FOR EACH ROW
EXECUTE FUNCTION notify_on_trip_invite();

-- ============================================================================
-- 6. CALENDAR REMINDER SCHEDULER (Cron Job)
-- ============================================================================
CREATE OR REPLACE FUNCTION schedule_calendar_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_member_ids UUID[];
  v_trip_name TEXT;
  v_sent_count INTEGER := 0;
BEGIN
  -- Find events starting in 15 minutes (with 1-minute tolerance)
  FOR v_event IN
    SELECT * FROM trip_itinerary_items
    WHERE start_time BETWEEN (NOW() + INTERVAL '14 minutes') AND (NOW() + INTERVAL '16 minutes')
    AND start_time > NOW()
  LOOP
    -- Get trip members
    SELECT ARRAY_AGG(user_id) INTO v_member_ids
    FROM trip_members WHERE trip_id = v_event.trip_id;
    
    -- Get trip name
    SELECT name INTO v_trip_name FROM trips WHERE id = v_event.trip_id;
    
    IF v_member_ids IS NOT NULL AND array_length(v_member_ids, 1) > 0 THEN
      -- Send reminder
      v_sent_count := v_sent_count + send_notification(
        v_member_ids,
        v_event.trip_id,
        'calendar',
        '🕐 Event starting in 15 minutes',
        v_event.title || (CASE WHEN v_event.location IS NOT NULL THEN ' at ' || v_event.location ELSE '' END),
        jsonb_build_object(
          'event_id', v_event.id,
          'trip_id', v_event.trip_id,
          'start_time', v_event.start_time
        )
      );
    END IF;
  END LOOP;
  
  RETURN v_sent_count;
END;
$$;

COMMENT ON FUNCTION schedule_calendar_reminders IS 'Scheduled function to send calendar event reminders';

-- Create cron job (requires pg_cron extension)
-- Uncomment if pg_cron is enabled:
-- SELECT cron.schedule(
--   'calendar-reminders',
--   '*/5 * * * *',  -- Every 5 minutes
--   'SELECT schedule_calendar_reminders();'
-- );

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notification_history
  SET 
    read = TRUE,
    read_at = NOW()
  WHERE id = p_notification_id;
  
  RETURN FOUND;
END;
$$;

-- Mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notification_history
  SET 
    read = TRUE,
    read_at = NOW()
  WHERE user_id = p_user_id AND read = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Clean up old notifications (30+ days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM notification_history
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own preferences
CREATE POLICY notification_preferences_select_own ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notification_preferences_insert_own ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY notification_preferences_update_own ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only read their own notification history
CREATE POLICY notification_history_select_own ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notification_history_update_own ON notification_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can manage their own push tokens
CREATE POLICY push_tokens_all_own ON push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 9. INITIAL DATA
-- ============================================================================

-- Create default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- COMPLETE! ✅
-- ============================================================================

COMMENT ON SCHEMA public IS 'Chravel Notifications System - Complete infrastructure for iOS/Android/Web push notifications';
