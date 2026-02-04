-- Create web_push_subscriptions table for Web Push API subscriptions
CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  device_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  failed_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT web_push_subscriptions_user_endpoint_key UNIQUE (user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
ON public.web_push_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
ON public.web_push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
ON public.web_push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
ON public.web_push_subscriptions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user_id ON public.web_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_active ON public.web_push_subscriptions(is_active) WHERE is_active = true;

-- Add trigger for updated_at
CREATE TRIGGER update_web_push_subscriptions_updated_at
  BEFORE UPDATE ON public.web_push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();