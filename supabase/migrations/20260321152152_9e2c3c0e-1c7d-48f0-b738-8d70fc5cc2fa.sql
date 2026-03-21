-- Fix search_path on newly created functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.set_reaction_trip_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trip_id IS NULL THEN
    SELECT trip_id INTO NEW.trip_id
    FROM public.trip_chat_messages
    WHERE id = NEW.message_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';