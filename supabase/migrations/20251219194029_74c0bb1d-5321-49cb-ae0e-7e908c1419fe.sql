-- Add client_message_id column for optimistic updates and deduplication
ALTER TABLE trip_chat_messages 
ADD COLUMN IF NOT EXISTS client_message_id uuid;

-- Add unique partial index for deduplication (prevents duplicate messages on retry)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_chat_messages_client_dedupe 
ON trip_chat_messages (trip_id, client_message_id) 
WHERE client_message_id IS NOT NULL;

-- Add index for faster queries on trip_id + created_at
CREATE INDEX IF NOT EXISTS idx_trip_chat_messages_trip_created 
ON trip_chat_messages (trip_id, created_at DESC);

-- Create private bucket for chat media (private = requires signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media', 
  'chat-media', 
  false,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
    'video/mp4', 'video/quicktime', 'video/webm',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
) ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Trip members can upload chat media to their trip folder
-- Path format: <tripId>/<userId>/<clientMessageId>/<filename>
CREATE POLICY "Trip members can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media' 
  AND EXISTS (
    SELECT 1 FROM trip_members 
    WHERE trip_id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);

-- RLS Policy: Trip members can view chat media from their trips
CREATE POLICY "Trip members can view chat media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM trip_members 
    WHERE trip_id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);

-- RLS Policy: Users can delete their own chat media (path includes user_id as second folder)
CREATE POLICY "Users can delete own chat media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);