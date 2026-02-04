-- ============================================================================
-- SMS Infrastructure Migration
-- Adds sms_phone_number column and notification_logs table for full SMS support
-- ============================================================================

-- 1. Add sms_phone_number column to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS sms_phone_number TEXT;

-- 2. Add E.164 format constraint for phone numbers
ALTER TABLE public.notification_preferences
ADD CONSTRAINT valid_phone_number_format 
CHECK (
  sms_phone_number IS NULL OR 
  sms_phone_number ~ '^\+[1-9]\d{6,14}$'
);

-- 3. Add rate limiting columns
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS sms_sent_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sms_reset_date DATE DEFAULT CURRENT_DATE;

-- 4. Create notification_logs table for SMS delivery tracking
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('push', 'email', 'sms', 'batch')),
  title TEXT NOT NULL,
  body TEXT,
  recipient TEXT, -- phone number or email
  data JSONB DEFAULT '{}'::jsonb,
  external_id TEXT, -- Twilio SID or other external reference
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'rate_limited')),
  error_message TEXT,
  success INTEGER DEFAULT 0,
  failure INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON public.notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);

-- 6. Enable RLS on notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for notification_logs
-- Users can view their own logs
CREATE POLICY "Users can view own notification logs"
ON public.notification_logs FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert/update (edge functions use service role)
CREATE POLICY "Service role can manage notification logs"
ON public.notification_logs FOR ALL
USING (auth.role() = 'service_role');

-- 8. Function to check and enforce SMS rate limits
CREATE OR REPLACE FUNCTION public.check_sms_rate_limit(p_user_id UUID, p_daily_limit INTEGER DEFAULT 10)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefs RECORD;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get user's current SMS count
  SELECT sms_sent_today, last_sms_reset_date
  INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no record found or needs reset
  IF NOT FOUND THEN
    RETURN QUERY SELECT true, p_daily_limit, (v_today + 1)::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Reset counter if it's a new day
  IF v_prefs.last_sms_reset_date < v_today THEN
    UPDATE notification_preferences
    SET sms_sent_today = 0, last_sms_reset_date = v_today
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT true, p_daily_limit, (v_today + 1)::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Check if under limit
  IF v_prefs.sms_sent_today < p_daily_limit THEN
    RETURN QUERY SELECT true, (p_daily_limit - v_prefs.sms_sent_today - 1)::INTEGER, (v_today + 1)::TIMESTAMPTZ;
  ELSE
    RETURN QUERY SELECT false, 0::INTEGER, (v_today + 1)::TIMESTAMPTZ;
  END IF;
END;
$$;

-- 9. Function to increment SMS counter
CREATE OR REPLACE FUNCTION public.increment_sms_counter(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE notification_preferences
  SET 
    sms_sent_today = COALESCE(sms_sent_today, 0) + 1,
    last_sms_reset_date = CURRENT_DATE
  WHERE user_id = p_user_id;
END;
$$;