-- Migration: Enable message_reactions for channel messages
-- Purpose: Drop FK constraint on message_id (which only allowed trip_chat_messages IDs)
-- and add RLS policies so channel members can also use reactions.
-- RLS already gates all access; the FK was redundant.

-- 1. Drop the FK constraint referencing trip_chat_messages
ALTER TABLE message_reactions
DROP CONSTRAINT IF EXISTS message_reactions_message_id_fkey;

-- 2. Add RLS policies for channel message reactions
-- Channel members can view reactions on messages in their channels
CREATE POLICY "Channel members can view channel message reactions"
ON message_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM channel_messages cm
    JOIN channel_members cmem ON cmem.channel_id = cm.channel_id
    WHERE cm.id = message_reactions.message_id
    AND cmem.user_id = auth.uid()
  )
);

-- Channel members can add reactions to messages in their channels
CREATE POLICY "Channel members can add channel reactions"
ON message_reactions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM channel_messages cm
    JOIN channel_members cmem ON cmem.channel_id = cm.channel_id
    WHERE cm.id = message_reactions.message_id
    AND cmem.user_id = auth.uid()
  )
);

-- Note: The existing "Users can remove own reactions" DELETE policy
-- already covers channel reactions (it only checks user_id = auth.uid()).
