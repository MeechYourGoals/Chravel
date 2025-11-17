-- Migration: Add message read receipts table
-- Description: Tracks which users have read which messages
-- Version: 001
-- Date: 2025-11-17

-- Create message_read_receipts table
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('channel', 'trip')),
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure a user can only mark a message as read once
  UNIQUE(message_id, user_id, message_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_read_receipts_message_id ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user_id ON message_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_message_type ON message_read_receipts(message_type);
CREATE INDEX IF NOT EXISTS idx_read_receipts_read_at ON message_read_receipts(read_at DESC);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_read_receipts_lookup
  ON message_read_receipts(message_id, message_type, user_id);

-- Enable Row Level Security
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all receipts for messages they have access to
CREATE POLICY "Users can view read receipts"
  ON message_read_receipts
  FOR SELECT
  USING (true);

-- Policy: Users can only create their own read receipts
CREATE POLICY "Users can create own read receipts"
  ON message_read_receipts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own read receipts
CREATE POLICY "Users can delete own read receipts"
  ON message_read_receipts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE message_read_receipts IS 'Tracks which users have read which messages for read receipt functionality';
COMMENT ON COLUMN message_read_receipts.message_type IS 'Type of message: channel (for channel_messages) or trip (for trip-level messages)';