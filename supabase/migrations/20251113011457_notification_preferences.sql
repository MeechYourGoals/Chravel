-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification channels
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,

  -- Notification categories
  chat_messages BOOLEAN DEFAULT false,
  mentions_only BOOLEAN DEFAULT true,
  broadcasts BOOLEAN DEFAULT true,
  tasks BOOLEAN DEFAULT true,
  payments BOOLEAN DEFAULT true,
  calendar_reminders BOOLEAN DEFAULT true,
  trip_invites BOOLEAN DEFAULT true,
  join_requests BOOLEAN DEFAULT true,

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_start TEXT DEFAULT '22:00',
  quiet_end TEXT DEFAULT '08:00',
  timezone TEXT DEFAULT 'UTC',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
