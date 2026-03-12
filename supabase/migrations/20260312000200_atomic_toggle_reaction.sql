-- Migration: Atomic toggle_reaction RPC function
-- Purpose: Replace read-then-write pattern with row-level locked atomic operation
-- to eliminate race conditions on concurrent reaction toggles.

CREATE OR REPLACE FUNCTION toggle_reaction(
  p_message_id uuid,
  p_user_id uuid,
  p_reaction_type text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_type text;
BEGIN
  -- Verify caller is the claimed user
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'unauthorized: caller does not match p_user_id';
  END IF;

  -- Validate reaction type
  IF p_reaction_type NOT IN (
    'like', 'love', 'laugh', 'wow', 'sad', 'angry',
    'clap', 'party', 'question', 'dislike', 'important'
  ) THEN
    RAISE EXCEPTION 'unsupported reaction type: %', p_reaction_type;
  END IF;

  -- Verify caller has access to the message (trip member OR channel member)
  IF NOT EXISTS (
    -- Trip chat message: user must be a trip member
    SELECT 1
    FROM trip_chat_messages tcm
    JOIN trip_members tm ON tm.trip_id = tcm.trip_id
    WHERE tcm.id = p_message_id
    AND tm.user_id = p_user_id
  ) AND NOT EXISTS (
    -- Channel message: user must be a channel member
    SELECT 1
    FROM channel_messages cm
    JOIN channel_members cmem ON cmem.channel_id = cm.channel_id
    WHERE cm.id = p_message_id
    AND cmem.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'forbidden: user does not have access to this message';
  END IF;

  -- Row-level lock serializes concurrent requests for the same (message_id, user_id)
  SELECT reaction_type INTO existing_type
  FROM message_reactions
  WHERE message_id = p_message_id AND user_id = p_user_id
  FOR UPDATE;

  IF existing_type = p_reaction_type THEN
    -- Same reaction: toggle off (remove)
    DELETE FROM message_reactions
    WHERE message_id = p_message_id AND user_id = p_user_id;
    RETURN 'removed';
  ELSIF existing_type IS NOT NULL THEN
    -- Different reaction: switch type
    UPDATE message_reactions
    SET reaction_type = p_reaction_type, created_at = now()
    WHERE message_id = p_message_id AND user_id = p_user_id;
    RETURN 'changed';
  ELSE
    -- No existing reaction: add new
    INSERT INTO message_reactions (message_id, user_id, reaction_type)
    VALUES (p_message_id, p_user_id, p_reaction_type);
    RETURN 'added';
  END IF;
END;
$$;
