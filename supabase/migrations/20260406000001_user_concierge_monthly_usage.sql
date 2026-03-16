-- Migration: Per-user monthly AI concierge usage tracking
-- Adds a global monthly cap across all trips for cost control

CREATE TABLE IF NOT EXISTS user_concierge_monthly_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: 'YYYY-MM'
  query_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

-- RLS: Users can only see/update their own usage
ALTER TABLE user_concierge_monthly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monthly usage"
  ON user_concierge_monthly_usage FOR SELECT
  USING (auth.uid() = user_id);

-- RPC to atomically increment and check monthly user quota
CREATE OR REPLACE FUNCTION increment_user_concierge_monthly_usage(
  p_user_id UUID,
  p_monthly_limit INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month TEXT;
  v_count INT;
BEGIN
  v_month := to_char(now(), 'YYYY-MM');

  -- Upsert: increment or create row
  INSERT INTO user_concierge_monthly_usage (user_id, month, query_count)
  VALUES (p_user_id, v_month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET query_count = user_concierge_monthly_usage.query_count + 1
  RETURNING query_count INTO v_count;

  -- Check limit (0 or negative = unlimited)
  IF p_monthly_limit > 0 AND v_count > p_monthly_limit THEN
    -- Roll back the increment
    UPDATE user_concierge_monthly_usage
       SET query_count = query_count - 1
     WHERE user_id = p_user_id AND month = v_month;

    RETURN jsonb_build_object(
      'status', 'limit_reached',
      'used', v_count - 1,
      'limit', p_monthly_limit
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'incremented',
    'used', v_count,
    'limit', p_monthly_limit
  );
END;
$$;

-- RPC to get current monthly usage for a user
CREATE OR REPLACE FUNCTION get_user_concierge_monthly_usage(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT query_count INTO v_count
    FROM user_concierge_monthly_usage
   WHERE user_id = p_user_id
     AND month = to_char(now(), 'YYYY-MM');

  RETURN COALESCE(v_count, 0);
END;
$$;
