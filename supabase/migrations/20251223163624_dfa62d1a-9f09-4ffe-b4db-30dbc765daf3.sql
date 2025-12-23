-- Create push_device_tokens table for storing device push notification tokens
CREATE TABLE public.push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_id TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Index for fast user lookup
CREATE INDEX idx_push_device_tokens_user ON public.push_device_tokens(user_id);

-- Enable RLS
ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own device tokens
CREATE POLICY "Users can view their own device tokens"
ON public.push_device_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own device tokens
CREATE POLICY "Users can insert their own device tokens"
ON public.push_device_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own device tokens
CREATE POLICY "Users can update their own device tokens"
ON public.push_device_tokens
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own device tokens
CREATE POLICY "Users can delete their own device tokens"
ON public.push_device_tokens
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_push_device_tokens_updated_at
  BEFORE UPDATE ON public.push_device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();