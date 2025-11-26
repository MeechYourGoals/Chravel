-- Add message_type column to trip_chat_messages for broadcast support
ALTER TABLE trip_chat_messages 
ADD COLUMN message_type TEXT DEFAULT 'text' 
CHECK (message_type IN ('text', 'broadcast', 'payment', 'system'));