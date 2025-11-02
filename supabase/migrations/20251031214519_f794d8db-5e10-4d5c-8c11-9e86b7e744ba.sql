-- Phase 4: Create trigger function and triggers for automatic embedding refresh

-- Create trigger function to queue embedding refresh when trip data changes
CREATE OR REPLACE FUNCTION queue_embedding_refresh()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  source_type_name TEXT;
BEGIN
  -- Determine source type from table name
  source_type_name := CASE TG_TABLE_NAME
    WHEN 'trip_chat_messages' THEN 'chat'
    WHEN 'trip_tasks' THEN 'task'
    WHEN 'trip_polls' THEN 'poll'
    WHEN 'trip_payment_messages' THEN 'payment'
    WHEN 'broadcasts' THEN 'broadcast'
    WHEN 'trip_events' THEN 'calendar'
    WHEN 'trip_links' THEN 'link'
    WHEN 'trip_files' THEN 'file'
    ELSE 'unknown'
  END;

  -- Call edge function asynchronously to generate embeddings
  PERFORM extensions.net.http_post(
    url := 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/generate-embeddings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptaml5ZWtteHdzeGtmbnF3eWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjEwMDgsImV4cCI6MjA2OTQ5NzAwOH0.SAas0HWvteb9TbYNJFDf8Itt8mIsDtKOK6QwBcwINhI'
    ),
    body := jsonb_build_object(
      'tripId', NEW.trip_id,
      'sourceType', source_type_name
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert/update
    RAISE WARNING 'Failed to queue embedding refresh: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create triggers for each table
DROP TRIGGER IF EXISTS refresh_chat_embeddings ON trip_chat_messages;
CREATE TRIGGER refresh_chat_embeddings
  AFTER INSERT ON trip_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_refresh();

DROP TRIGGER IF EXISTS refresh_task_embeddings ON trip_tasks;
CREATE TRIGGER refresh_task_embeddings
  AFTER INSERT OR UPDATE ON trip_tasks
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_refresh();

DROP TRIGGER IF EXISTS refresh_poll_embeddings ON trip_polls;
CREATE TRIGGER refresh_poll_embeddings
  AFTER INSERT OR UPDATE ON trip_polls
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_refresh();

DROP TRIGGER IF EXISTS refresh_payment_embeddings ON trip_payment_messages;
CREATE TRIGGER refresh_payment_embeddings
  AFTER INSERT ON trip_payment_messages
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_refresh();

DROP TRIGGER IF EXISTS refresh_broadcast_embeddings ON broadcasts;
CREATE TRIGGER refresh_broadcast_embeddings
  AFTER INSERT ON broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_refresh();

DROP TRIGGER IF EXISTS refresh_calendar_embeddings ON trip_events;
CREATE TRIGGER refresh_calendar_embeddings
  AFTER INSERT OR UPDATE ON trip_events
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_refresh();

DROP TRIGGER IF EXISTS refresh_link_embeddings ON trip_links;
CREATE TRIGGER refresh_link_embeddings
  AFTER INSERT ON trip_links
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_refresh();

DROP TRIGGER IF EXISTS refresh_file_embeddings ON trip_files;
CREATE TRIGGER refresh_file_embeddings
  AFTER INSERT ON trip_files
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_refresh();

COMMENT ON FUNCTION queue_embedding_refresh IS 'Automatically triggers embedding generation when trip data changes';