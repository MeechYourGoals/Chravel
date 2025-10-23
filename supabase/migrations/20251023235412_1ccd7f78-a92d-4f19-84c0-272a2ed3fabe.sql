-- Add app_role column to profiles table for subscription tier tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS app_role TEXT DEFAULT 'consumer';

-- Create concierge_usage table for tracking AI query usage
CREATE TABLE IF NOT EXISTS concierge_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL, -- 'event', 'trip', etc.
  context_id TEXT NOT NULL,
  query_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on concierge_usage
ALTER TABLE concierge_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own concierge usage"
  ON concierge_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert their own concierge usage"
  ON concierge_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_concierge_usage_user_date 
  ON concierge_usage(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_concierge_usage_context 
  ON concierge_usage(user_id, context_type, context_id, created_at DESC);