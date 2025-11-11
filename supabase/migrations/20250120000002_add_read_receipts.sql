-- Add read receipts table for message read status tracking
CREATE TABLE IF NOT EXISTS public.message_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES trip_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trip_id TEXT NOT NULL,
  UNIQUE(message_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_read_status_message_id ON message_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON message_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_trip_id ON message_read_status(trip_id);

-- Enable RLS
ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view read receipts for messages in trips they're members of
CREATE POLICY "Users can view read receipts in their trips"
ON message_read_status FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = message_read_status.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy: Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
ON message_read_status FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = message_read_status.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE message_read_status;
