-- AI Concierge Usage Tracking
-- 
-- DEPENDENCY: This system works with existing tables for trips, messages, calendar, etc.
-- For channel-aware AI features, first apply: 20250120000001_add_channels_system.sql
--
-- This migration creates usage tracking for AI Concierge queries to support:
-- - Freemium model with query limits
-- - Pro/Enterprise unlimited access
-- - Analytics and optimization

-- Create concierge_usage table for tracking AI query usage
CREATE TABLE public.concierge_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  response_tokens INTEGER NOT NULL DEFAULT 0,
  model_used TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_concierge_usage_user_date ON concierge_usage(user_id, created_at);
CREATE INDEX idx_concierge_usage_trip ON concierge_usage(trip_id);
CREATE INDEX idx_concierge_usage_created_at ON concierge_usage(created_at);

-- Enable Row Level Security
ALTER TABLE public.concierge_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own usage"
  ON public.concierge_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage"
  ON public.concierge_usage FOR INSERT
  WITH CHECK (true);

-- Create function to get daily usage count for a user
CREATE OR REPLACE FUNCTION get_daily_concierge_usage(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM concierge_usage
    WHERE user_id = user_uuid
    AND DATE(created_at) = target_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to check if user has exceeded daily limit
CREATE OR REPLACE FUNCTION has_exceeded_concierge_limit(user_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_daily_concierge_usage(user_uuid) >= limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant necessary permissions
GRANT SELECT ON concierge_usage TO authenticated;
GRANT INSERT ON concierge_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_concierge_usage TO authenticated;
GRANT EXECUTE ON FUNCTION has_exceeded_concierge_limit TO authenticated;
