-- Add notification preferences structure to profiles
UPDATE public.profiles
SET notification_settings = jsonb_build_object(
  'email_enabled', true,
  'push_enabled', true,
  'trip_updates', true,
  'chat_messages', false,
  'calendar_reminders', true,
  'payment_requests', true,
  'task_assignments', true,
  'broadcasts', true,
  'rsvp_updates', true,
  'event_reminders', true
)
WHERE notification_settings IS NULL OR notification_settings = '{}'::jsonb;

-- Create helper function to check if user should receive notification
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
  v_settings JSONB;
  v_enabled BOOLEAN;
BEGIN
  -- Get user's notification settings
  SELECT notification_settings INTO v_settings
  FROM profiles
  WHERE user_id = p_user_id;
  
  -- Default to true if no settings found
  IF v_settings IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if notification type is enabled
  v_enabled := COALESCE((v_settings ->> p_notification_type)::boolean, true);
  
  RETURN v_enabled;
END;
$$;

-- Create function to send notification only if user preferences allow
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_ids UUID[],
  p_trip_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    -- Only send if user preferences allow this notification type
    IF should_send_notification(v_user_id, p_type) THEN
      INSERT INTO notifications (user_id, trip_id, type, title, message, metadata)
      VALUES (v_user_id, p_trip_id, p_type, p_title, p_message, p_metadata);
    END IF;
  END LOOP;
END;
$$;

-- Add trip_id column to notifications if it doesn't exist
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS trip_id UUID;