-- Add broadcast message support to channel_messages
ALTER TABLE channel_messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'regular' CHECK (message_type IN ('regular', 'broadcast'));
ALTER TABLE channel_messages ADD COLUMN IF NOT EXISTS broadcast_category TEXT CHECK (broadcast_category IN ('chill', 'logistics', 'urgent'));
ALTER TABLE channel_messages ADD COLUMN IF NOT EXISTS broadcast_priority TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_channel_messages_type ON channel_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_channel_messages_created ON channel_messages(channel_id, created_at DESC);