-- Add system message columns to trip_chat_messages
ALTER TABLE trip_chat_messages 
ADD COLUMN IF NOT EXISTS system_event_type TEXT NULL,
ADD COLUMN IF NOT EXISTS payload JSONB NULL;

-- Add composite index for efficient system message queries
CREATE INDEX IF NOT EXISTS idx_trip_messages_system_events 
ON trip_chat_messages(trip_id, message_type, created_at DESC) 
WHERE message_type = 'system';

-- Comment on new columns
COMMENT ON COLUMN trip_chat_messages.system_event_type IS 'Type of system event: member_joined, trip_base_camp_updated, etc.';
COMMENT ON COLUMN trip_chat_messages.payload IS 'JSON payload with structured data for the system event';