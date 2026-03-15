-- Migration: Restrict admin soft-delete to deleted_at column only
-- PROBLEM: The admin UPDATE policies in 20260315000002 grant full UPDATE access
-- to all columns. An admin could modify content, user_id, sender_id, etc.
-- Postgres RLS WITH CHECK cannot reference OLD values, so we use BEFORE UPDATE
-- triggers to enforce that non-authors can only modify deleted_at.

-- ==========================================
-- STEP 1: Trigger for trip_chat_messages
-- ==========================================

CREATE OR REPLACE FUNCTION public.enforce_admin_soft_delete_only_trip_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the updater IS the message author, allow any update (edit, delete, etc.)
  IF auth.uid() = OLD.user_id THEN
    RETURN NEW;
  END IF;

  -- Non-author (admin) updates: only allow deleted_at to change.
  -- Reset all other mutable columns to their original values.
  NEW.content := OLD.content;
  NEW.author_name := OLD.author_name;
  NEW.user_id := OLD.user_id;
  NEW.message_type := OLD.message_type;
  NEW.media_url := OLD.media_url;
  NEW.media_type := OLD.media_type;
  NEW.link_preview := OLD.link_preview;
  NEW.attachments := OLD.attachments;
  NEW.payload := OLD.payload;
  NEW.sentiment := OLD.sentiment;
  NEW.privacy_mode := OLD.privacy_mode;
  NEW.privacy_encrypted := OLD.privacy_encrypted;
  NEW.reply_to_id := OLD.reply_to_id;
  NEW.mentioned_user_ids := OLD.mentioned_user_ids;
  NEW.system_event_type := OLD.system_event_type;
  NEW.thread_id := OLD.thread_id;
  NEW.trip_id := OLD.trip_id;
  NEW.channel_id := OLD.channel_id;
  NEW.client_message_id := OLD.client_message_id;
  NEW.created_at := OLD.created_at;
  -- Allow: deleted_at, is_deleted, updated_at, edited_at (timestamp tracking)

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_soft_delete_trip_chat_trigger ON trip_chat_messages;
CREATE TRIGGER enforce_admin_soft_delete_trip_chat_trigger
  BEFORE UPDATE ON trip_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION enforce_admin_soft_delete_only_trip_chat();

-- ==========================================
-- STEP 2: Trigger for channel_messages
-- ==========================================

CREATE OR REPLACE FUNCTION public.enforce_admin_soft_delete_only_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the updater IS the message author, allow any update
  IF auth.uid() = OLD.sender_id THEN
    RETURN NEW;
  END IF;

  -- Non-author (admin) updates: only allow deleted_at to change.
  NEW.content := OLD.content;
  NEW.sender_id := OLD.sender_id;
  NEW.channel_id := OLD.channel_id;
  NEW.message_type := OLD.message_type;
  NEW.metadata := OLD.metadata;
  NEW.broadcast_category := OLD.broadcast_category;
  NEW.broadcast_priority := OLD.broadcast_priority;
  NEW.created_at := OLD.created_at;
  -- Allow: deleted_at, edited_at (timestamp tracking)

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_soft_delete_channel_trigger ON channel_messages;
CREATE TRIGGER enforce_admin_soft_delete_channel_trigger
  BEFORE UPDATE ON channel_messages
  FOR EACH ROW
  EXECUTE FUNCTION enforce_admin_soft_delete_only_channel();
