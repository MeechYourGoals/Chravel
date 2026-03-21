-- Migration 1: Add trip_id to message_read_receipts (TEXT to match trip_chat_messages.trip_id)
ALTER TABLE public.message_read_receipts
  ADD COLUMN IF NOT EXISTS trip_id text;

UPDATE public.message_read_receipts mrr
SET trip_id = tcm.trip_id
FROM public.trip_chat_messages tcm
WHERE mrr.message_id = tcm.id
  AND mrr.trip_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_trip_id
  ON public.message_read_receipts (trip_id);

CREATE INDEX IF NOT EXISTS idx_message_read_receipts_trip_user
  ON public.message_read_receipts (trip_id, user_id);

-- Migration 3: Broadcast trigger for chat messages
CREATE OR REPLACE FUNCTION public.broadcast_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO realtime.messages (topic, extension, payload, event, private)
  VALUES (
    'chat_broadcast:' || NEW.trip_id::text,
    'broadcast',
    jsonb_build_object(
      'id', NEW.id,
      'trip_id', NEW.trip_id,
      'content', NEW.content,
      'author_name', NEW.author_name,
      'user_id', NEW.user_id,
      'created_at', NEW.created_at,
      'updated_at', NEW.updated_at,
      'message_type', NEW.message_type,
      'media_type', NEW.media_type,
      'media_url', NEW.media_url,
      'privacy_mode', NEW.privacy_mode,
      'privacy_encrypted', NEW.privacy_encrypted,
      'client_message_id', NEW.client_message_id,
      'reply_to_id', NEW.reply_to_id,
      'link_preview', NEW.link_preview,
      'is_edited', NEW.is_edited,
      'is_deleted', NEW.is_deleted
    ),
    'new_message',
    true
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'broadcast_chat_message trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_broadcast_chat_message ON public.trip_chat_messages;
CREATE TRIGGER trg_broadcast_chat_message
  AFTER INSERT ON public.trip_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_chat_message();