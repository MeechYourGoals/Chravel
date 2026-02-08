-- Drop the ambiguous 2-arg version of should_send_notification
-- The 3-arg version with DEFAULT 'push' already handles all 2-arg calls identically
DROP FUNCTION IF EXISTS should_send_notification(uuid, text);