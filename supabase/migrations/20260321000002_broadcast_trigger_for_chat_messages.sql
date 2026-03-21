-- Server-side broadcast trigger for chat messages.
--
-- After a message is inserted into trip_chat_messages, this trigger writes to
-- `realtime.messages` which Supabase Realtime picks up via WAL and broadcasts
-- to the `chat_broadcast:{trip_id}` channel. This ensures message delivery even
-- if the sender's client disconnects immediately after INSERT.
--
-- The server-side trigger is the sole message publisher. Client-side broadcast
-- was removed to prevent forged payload injection. Clients subscribe to the
-- private broadcast channel and deduplicate by message id + client_message_id.
--
-- Phase: Messaging Architecture Review — Phase 3a

-- The function that broadcasts new chat messages via realtime.messages
CREATE OR REPLACE FUNCTION public.broadcast_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into realtime.messages for WAL-based broadcast delivery.
  -- The topic matches the channel name used by subscribeToBroadcast() in the client.
  -- Extension: private=true requires authenticated clients.
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
  -- Best-effort: if realtime.messages insert fails (e.g. table doesn't exist yet,
  -- extension not enabled), swallow the error so the original INSERT succeeds.
  WHEN OTHERS THEN
    RAISE WARNING 'broadcast_chat_message trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to trip_chat_messages (only on INSERT, not UPDATE/DELETE)
DROP TRIGGER IF EXISTS trg_broadcast_chat_message ON public.trip_chat_messages;
CREATE TRIGGER trg_broadcast_chat_message
  AFTER INSERT ON public.trip_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_chat_message();
