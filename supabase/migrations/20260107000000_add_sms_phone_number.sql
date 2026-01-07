-- Add SMS phone number field to notification_preferences
-- This allows users to specify a phone number for SMS notifications
-- without requiring phone-based authentication

-- Add the sms_phone_number column
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS sms_phone_number TEXT;

-- Add a comment documenting the field
COMMENT ON COLUMN public.notification_preferences.sms_phone_number IS 
  'Phone number for SMS notifications. Only used when sms_enabled is true. Stored in E.164 format (e.g., +15551234567).';

-- Create a function to validate phone numbers (optional, basic format check)
CREATE OR REPLACE FUNCTION public.validate_phone_number(phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Allow NULL (SMS disabled)
  IF phone IS NULL THEN
    RETURN true;
  END IF;
  
  -- Basic E.164 format check: +{country}{number}, 10-15 digits total
  -- Allows formats like +15551234567 or 5551234567
  RETURN phone ~ '^\+?[1-9]\d{9,14}$';
END;
$$;

-- Add a check constraint to ensure valid phone number format
ALTER TABLE public.notification_preferences
ADD CONSTRAINT valid_sms_phone_number 
CHECK (validate_phone_number(sms_phone_number));

-- Update the should_send_notification function to also check for SMS phone number
CREATE OR REPLACE FUNCTION public.should_send_notification(
  p_user_id uuid, 
  p_notification_type text,
  p_channel text DEFAULT 'push'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs RECORD;
  v_type_enabled BOOLEAN;
  v_channel_enabled BOOLEAN;
BEGIN
  -- Get user's notification preferences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences, default to enabled for push/email, disabled for SMS
  IF NOT FOUND THEN
    IF p_channel = 'sms' THEN
      RETURN false; -- SMS requires explicit opt-in with phone number
    END IF;
    RETURN true;
  END IF;
  
  -- Check channel-specific settings
  CASE p_channel
    WHEN 'push' THEN v_channel_enabled := v_prefs.push_enabled;
    WHEN 'email' THEN v_channel_enabled := v_prefs.email_enabled;
    WHEN 'sms' THEN 
      -- SMS requires both the preference to be enabled AND a phone number on file
      v_channel_enabled := v_prefs.sms_enabled AND v_prefs.sms_phone_number IS NOT NULL;
    ELSE v_channel_enabled := true;
  END CASE;
  
  -- If channel is disabled, no need to check notification type
  IF NOT v_channel_enabled THEN
    RETURN false;
  END IF;
  
  -- Check specific notification type
  CASE p_notification_type
    WHEN 'broadcasts' THEN v_type_enabled := v_prefs.broadcasts;
    WHEN 'chat_messages', 'messages' THEN v_type_enabled := v_prefs.chat_messages;
    WHEN 'tasks' THEN v_type_enabled := v_prefs.tasks;
    WHEN 'payments' THEN v_type_enabled := v_prefs.payments;
    WHEN 'calendar', 'calendar_events' THEN v_type_enabled := v_prefs.calendar_events;
    WHEN 'polls' THEN v_type_enabled := v_prefs.polls;
    WHEN 'join_requests' THEN v_type_enabled := v_prefs.join_requests;
    WHEN 'trip_invites' THEN v_type_enabled := v_prefs.trip_invites;
    WHEN 'basecamp_updates' THEN v_type_enabled := v_prefs.basecamp_updates;
    ELSE v_type_enabled := true;
  END CASE;
  
  RETURN COALESCE(v_type_enabled, true);
END;
$$;

COMMENT ON FUNCTION public.should_send_notification(uuid, text, text) IS 
  'Checks if a notification should be sent based on user preferences, notification type, and delivery channel.';
