-- =====================================================
-- PAYMENT SPLIT PATTERNS TABLE
-- ML-based pattern tracking for payment participant suggestions
-- Created: 2025-01-31
-- Purpose: Track historical payment split patterns to provide
--          intelligent suggestions for "who usually splits with who"
-- =====================================================

-- Create payment_split_patterns table
CREATE TABLE IF NOT EXISTS payment_split_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency integer NOT NULL DEFAULT 1,
  last_split_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one pattern per user-participant pair per trip
  CONSTRAINT unique_user_participant_trip UNIQUE (trip_id, user_id, participant_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_split_patterns_trip_user 
  ON payment_split_patterns(trip_id, user_id);

CREATE INDEX IF NOT EXISTS idx_payment_split_patterns_user_participant 
  ON payment_split_patterns(user_id, participant_id);

CREATE INDEX IF NOT EXISTS idx_payment_split_patterns_frequency 
  ON payment_split_patterns(trip_id, user_id, frequency DESC);

CREATE INDEX IF NOT EXISTS idx_payment_split_patterns_last_split 
  ON payment_split_patterns(trip_id, user_id, last_split_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE payment_split_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own patterns
CREATE POLICY "Users can read their own payment split patterns"
  ON payment_split_patterns
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own patterns
CREATE POLICY "Users can insert their own payment split patterns"
  ON payment_split_patterns
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own patterns
CREATE POLICY "Users can update their own payment split patterns"
  ON payment_split_patterns
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_split_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_payment_split_patterns_timestamp
  BEFORE UPDATE ON payment_split_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_split_patterns_updated_at();

-- Function to upsert payment split pattern (called from application)
-- This makes it easy to record patterns when payments are created
CREATE OR REPLACE FUNCTION upsert_payment_split_pattern(
  p_trip_id uuid,
  p_user_id uuid,
  p_participant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO payment_split_patterns (trip_id, user_id, participant_id, frequency, last_split_at)
  VALUES (p_trip_id, p_user_id, p_participant_id, 1, now())
  ON CONFLICT (trip_id, user_id, participant_id)
  DO UPDATE SET
    frequency = payment_split_patterns.frequency + 1,
    last_split_at = now(),
    updated_at = now();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_payment_split_pattern(uuid, uuid, uuid) TO authenticated;

-- Comment for documentation
COMMENT ON TABLE payment_split_patterns IS 'Tracks historical payment split patterns for ML-based participant suggestions';
COMMENT ON COLUMN payment_split_patterns.frequency IS 'Number of times user has split payments with this participant';
COMMENT ON COLUMN payment_split_patterns.last_split_at IS 'Timestamp of most recent payment split with this participant';
