-- Enable real-time for trip_chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE trip_chat_messages;

-- Ensure REPLICA IDENTITY for full row data on updates
ALTER TABLE trip_chat_messages REPLICA IDENTITY FULL;