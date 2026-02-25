-- Security Hardening: Chat, Media, and Channels
-- Date: 2026-02-24
-- Purpose:
-- 1. Secure `trip-media` bucket (Public Read IDOR).
-- 2. Secure `chat-media` bucket (Channel Isolation).
-- 3. Add channel isolation to `trip_media_index`, `trip_files`, `trip_link_index`.
-- 4. Server-side Rate Limiting for Chat.
-- 5. Input Validation & Anti-Spoofing for Chat.

-- ============================================
-- SECTION 1: Secure `trip-media` Bucket
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Trip members can view trip media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload trip media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own trip media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own trip media" ON storage.objects;
DROP POLICY IF EXISTS "Public access to trip cover images for social sharing" ON storage.objects;

-- Create new policies
-- 1. Public Read for Covers ONLY
CREATE POLICY "Public can view trip covers"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'trip-media'
  AND (storage.foldername(name))[1] = 'trip-covers'
);

-- 2. Trip Members can view other media in their trip
CREATE POLICY "Trip members can view trip media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'trip-media'
  AND (storage.foldername(name))[1] != 'trip-covers'
  AND EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);

-- 3. Trip Members can upload to their trip
CREATE POLICY "Trip members can upload trip media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trip-media'
  AND (storage.foldername(name))[1] != 'trip-covers'
  AND EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);

-- 4. Users can update/delete their own uploads
CREATE POLICY "Users can manage own trip media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'trip-media'
  AND owner = auth.uid()
);

CREATE POLICY "Users can delete own trip media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trip-media'
  AND owner = auth.uid()
);

-- ============================================
-- SECTION 2: Secure `chat-media` Bucket (Channel Isolation)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Trip members can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Trip members can view chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat media" ON storage.objects;

-- 1. Upload: Allow trip members to upload (Path: <tripId>/<userId>/<clientMessageId>/<filename>)
CREATE POLICY "Trip members can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);

-- 2. View: Allow if:
--    a) User is owner (uploaded it) OR
--    b) User has access to the message (via channel check)
CREATE POLICY "Trip members can view chat media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (
    -- Case A: User is the uploader (owner)
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    -- Case B: Message exists and user has access to it (including channel check)
    EXISTS (
      SELECT 1 FROM trip_chat_messages msg
      WHERE msg.client_message_id::text = (storage.foldername(name))[3]
      AND msg.trip_id::text = (storage.foldername(name))[1]
      AND (
        -- Main chat: Check trip membership
        (msg.channel_id IS NULL AND EXISTS (
          SELECT 1 FROM trip_members tm
          WHERE tm.trip_id = msg.trip_id
          AND tm.user_id = auth.uid()
        ))
        OR
        -- Channel chat: Check channel access
        (msg.channel_id IS NOT NULL AND can_access_channel(auth.uid(), msg.channel_id))
      )
    )
  )
);

-- 3. Delete: Owner only
CREATE POLICY "Users can delete own chat media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- ============================================
-- SECTION 3: Channel Isolation for Media Gallery
-- ============================================

-- Ensure helper function exists (re-definition for safety)
CREATE OR REPLACE FUNCTION public.can_access_channel(
  _user_id UUID,
  _channel_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check 1: User has a role that grants channel access via channel_role_access
    SELECT 1
    FROM public.trip_channels tc
    INNER JOIN public.channel_role_access cra ON cra.channel_id = tc.id
    INNER JOIN public.user_trip_roles utr
      ON utr.trip_id = tc.trip_id
      AND utr.role_id = cra.role_id
      AND utr.user_id = _user_id
    WHERE tc.id = _channel_id
  )
  OR EXISTS (
    -- Check 2: User is a trip admin
    SELECT 1
    FROM public.trip_channels tc
    INNER JOIN public.trip_admins ta
      ON ta.trip_id = tc.trip_id
      AND ta.user_id = _user_id
    WHERE tc.id = _channel_id
  )
  OR EXISTS (
    -- Check 3: User is the trip creator
    SELECT 1
    FROM public.trip_channels tc
    INNER JOIN public.trips t
      ON t.id = tc.trip_id
      AND t.created_by = _user_id
    WHERE tc.id = _channel_id
  )
  OR EXISTS (
    -- Check 4: User is an explicit channel member
    SELECT 1
    FROM public.channel_members cm
    WHERE cm.channel_id = _channel_id
      AND cm.user_id = _user_id
  )
$$;

-- Add channel_id to media tables
ALTER TABLE trip_media_index ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES trip_channels(id) ON DELETE CASCADE;
ALTER TABLE trip_files ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES trip_channels(id) ON DELETE CASCADE;
ALTER TABLE trip_link_index ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES trip_channels(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trip_media_index_channel ON trip_media_index(channel_id);
CREATE INDEX IF NOT EXISTS idx_trip_files_channel ON trip_files(channel_id);
CREATE INDEX IF NOT EXISTS idx_trip_link_index_channel ON trip_link_index(channel_id);

-- Update RLS Policies
-- Note: We drop and recreate to ensure correctness

-- trip_media_index
DROP POLICY IF EXISTS "Users can view media in their trips" ON trip_media_index;
CREATE POLICY "Users can view media in their trips" ON trip_media_index
FOR SELECT USING (
  trip_id IN (
    SELECT id FROM trips WHERE
    EXISTS (SELECT 1 FROM trip_members tm WHERE tm.trip_id = trips.id AND tm.user_id = auth.uid())
  )
  AND (
    channel_id IS NULL OR can_access_channel(auth.uid(), channel_id)
  )
);

-- trip_files
DROP POLICY IF EXISTS "Users can view files in their trips" ON trip_files;
CREATE POLICY "Users can view files in their trips" ON trip_files
FOR SELECT USING (
  trip_id IN (
    SELECT id FROM trips WHERE
    EXISTS (SELECT 1 FROM trip_members tm WHERE tm.trip_id = trips.id AND tm.user_id = auth.uid())
  )
  AND (
    channel_id IS NULL OR can_access_channel(auth.uid(), channel_id)
  )
);

-- trip_link_index
DROP POLICY IF EXISTS "Users can view links in their trips" ON trip_link_index;
CREATE POLICY "Users can view links in their trips" ON trip_link_index
FOR SELECT USING (
  trip_id IN (
    SELECT id FROM trips WHERE
    EXISTS (SELECT 1 FROM trip_members tm WHERE tm.trip_id = trips.id AND tm.user_id = auth.uid())
  )
  AND (
    channel_id IS NULL OR can_access_channel(auth.uid(), channel_id)
  )
);

-- ============================================
-- SECTION 4: Server-Side Rate Limiting
-- ============================================

CREATE OR REPLACE FUNCTION check_chat_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  message_count INT;
  max_messages INT := 60; -- 60 messages per minute
  window_interval INTERVAL := '1 minute';
  user_role TEXT;
BEGIN
  -- Get user role from JWT
  user_role := (auth.jwt() ->> 'role');

  -- Skip for service role or admins/system
  IF auth.uid() IS NULL OR user_role = 'service_role' OR user_role = 'supabase_admin' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO message_count
  FROM trip_chat_messages
  WHERE user_id = auth.uid()
  AND created_at > NOW() - window_interval;

  IF message_count >= max_messages THEN
    RAISE EXCEPTION 'Rate limit exceeded: You can only send % messages per minute.', max_messages;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_chat_rate_limit_trigger ON trip_chat_messages;
CREATE TRIGGER check_chat_rate_limit_trigger
  BEFORE INSERT ON trip_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION check_chat_rate_limit();

-- ============================================
-- SECTION 5: Input Validation & Anti-Spoofing
-- ============================================

CREATE OR REPLACE FUNCTION validate_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Anti-Spoofing: Prevent users from setting 'system' or 'assistant' types
  -- Allow if explicitly authorized (e.g. system triggers) or if user is admin/service_role
  -- But for now, just block 'system'/'assistant' from INSERT by normal users
  IF NEW.message_type IN ('system', 'assistant') THEN
     -- Check if user is actually authorized (e.g. is this a user-initiated insert?)
     -- We assume user-initiated inserts come with auth.uid() set to the user.
     -- System inserts usually come from Edge Functions (service_role).
     -- RLS prevents impersonation of user_id.
     -- So if auth.uid() matches NEW.user_id, it's a user message.
     -- We downgrade it to 'text' or raise error.
     -- Let's raise error for security.
     RAISE EXCEPTION 'Invalid message type: Users cannot send system or assistant messages.';
  END IF;

  -- 2. Link Preview Validation (XSS Prevention)
  IF NEW.link_preview IS NOT NULL AND NEW.link_preview->>'url' IS NOT NULL THEN
    IF NOT (NEW.link_preview->>'url' ~* '^https?://') THEN
      -- Invalid URL protocol (could be javascript: or data:)
      NEW.link_preview = jsonb_set(NEW.link_preview, '{url}', '""');
    END IF;
  END IF;

  -- 3. Media URL Validation
  IF NEW.media_url IS NOT NULL THEN
     IF NOT (NEW.media_url ~* '^https?://' OR NEW.media_url ~* '^storage/') THEN
       NEW.media_url = NULL;
     END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_chat_message_trigger ON trip_chat_messages;
CREATE TRIGGER validate_chat_message_trigger
  BEFORE INSERT ON trip_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_chat_message();
