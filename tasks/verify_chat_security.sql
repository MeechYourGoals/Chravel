-- Verification Script for Chat Security
-- Run this in Supabase SQL Editor or psql to verify the security fixes.

BEGIN;

-- 1. Setup Test Data
INSERT INTO auth.users (id, email) VALUES
  ('user1-uuid', 'user1@example.com'),
  ('user2-uuid', 'user2@example.com'),
  ('attacker-uuid', 'attacker@example.com');

INSERT INTO public.trips (id, name, created_by) VALUES
  ('trip1-uuid', 'Test Trip', 'user1-uuid');

INSERT INTO public.trip_members (trip_id, user_id, role) VALUES
  ('trip1-uuid', 'user1-uuid', 'owner'),
  ('trip1-uuid', 'user2-uuid', 'member');

-- Attacker is NOT a member

-- 2. Verify Rate Limiting
-- User1 sends 61 messages (should fail on 61st)
DO $$
DECLARE
  i INT;
BEGIN
  FOR i IN 1..61 LOOP
    BEGIN
      INSERT INTO public.trip_chat_messages (trip_id, user_id, content, author_name)
      VALUES ('trip1-uuid', 'user1-uuid', 'msg ' || i, 'User 1');

      IF i = 61 THEN
        RAISE EXCEPTION 'Rate limit failed to trigger';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM LIKE '%Rate limit exceeded%' THEN
        RAISE NOTICE 'Rate limit triggered successfully at message %', i;
      ELSE
        RAISE;
      END IF;
    END;
  END LOOP;
END $$;

-- 3. Verify Anti-Spoofing (System Message)
DO $$
BEGIN
  INSERT INTO public.trip_chat_messages (trip_id, user_id, content, author_name, message_type)
  VALUES ('trip1-uuid', 'user1-uuid', 'Fake System Msg', 'System', 'system');
  RAISE EXCEPTION 'Anti-spoofing failed: Allowed system message';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%Invalid message type%' THEN
    RAISE NOTICE 'Anti-spoofing triggered successfully';
  ELSE
    RAISE;
  END IF;
END $$;

-- 4. Verify XSS Protection (Link Preview)
DO $$
BEGIN
  INSERT INTO public.trip_chat_messages (trip_id, user_id, content, author_name, link_preview)
  VALUES ('trip1-uuid', 'user1-uuid', 'Bad Link', 'User 1', '{"url": "javascript:alert(1)"}');

  -- Check if URL was sanitized
  IF EXISTS (
    SELECT 1 FROM public.trip_chat_messages
    WHERE content = 'Bad Link' AND (link_preview->>'url') = ''
  ) THEN
    RAISE NOTICE 'XSS protection triggered successfully (URL cleared)';
  ELSE
    RAISE EXCEPTION 'XSS protection failed: URL not sanitized';
  END IF;
END $$;

-- 5. Verify Channel Isolation (Media)
-- Create a channel
INSERT INTO public.trip_channels (id, trip_id, name, slug, channel_type, created_by)
VALUES ('channel1-uuid', 'trip1-uuid', 'Secret Channel', 'secret', 'custom', 'user1-uuid');

-- User2 is NOT in channel

-- Insert media with channel_id
INSERT INTO public.trip_media_index (trip_id, media_type, media_url, channel_id, uploaded_by)
VALUES ('trip1-uuid', 'photo', 'http://secret.jpg', 'channel1-uuid', 'user1-uuid');

-- Verify User2 cannot see it
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user2-uuid';
SET request.jwt.claim.role = 'authenticated';

IF EXISTS (SELECT 1 FROM public.trip_media_index WHERE media_url = 'http://secret.jpg') THEN
  RAISE EXCEPTION 'Channel isolation failed: Non-member can see media';
ELSE
  RAISE NOTICE 'Channel isolation verified successfully';
END IF;

ROLLBACK; -- Clean up
