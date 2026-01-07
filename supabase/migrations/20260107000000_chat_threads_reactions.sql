-- Migration: Add message reactions table and enhance threading support
-- Author: Claude AI
-- Date: 2026-01-07
-- Purpose: Enable realtime reactions and threaded replies for trip chat

-- ============================================================================
-- 1. MESSAGE REACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES trip_chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'love', 'dislike', 'important')),
  created_at timestamptz DEFAULT now(),

  -- Unique constraint: one reaction type per user per message
  UNIQUE(message_id, user_id, reaction_type)
);

-- Index for fast lookup of reactions by message
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id
ON message_reactions(message_id);

-- Index for finding all reactions by a user
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id
ON message_reactions(user_id);

-- ============================================================================
-- 2. RLS POLICIES FOR MESSAGE REACTIONS
-- ============================================================================

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Trip members can view reactions on messages in their trips
CREATE POLICY "Trip members can view message reactions"
ON message_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM trip_chat_messages tcm
    JOIN trip_members tm ON tm.trip_id = tcm.trip_id
    WHERE tcm.id = message_reactions.message_id
    AND tm.user_id = auth.uid()
  )
);

-- Users can add reactions to messages in their trips
CREATE POLICY "Trip members can add reactions"
ON message_reactions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM trip_chat_messages tcm
    JOIN trip_members tm ON tm.trip_id = tcm.trip_id
    WHERE tcm.id = message_reactions.message_id
    AND tm.user_id = auth.uid()
  )
);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
ON message_reactions FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- 3. ENABLE REALTIME FOR REACTIONS
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;

-- ============================================================================
-- 4. THREAD REPLY COUNT (DENORMALIZED FOR PERFORMANCE)
-- ============================================================================

-- Add reply_count column to track thread size without COUNT query
ALTER TABLE trip_chat_messages
ADD COLUMN IF NOT EXISTS reply_count integer DEFAULT 0;

-- Function to update reply count when replies are added/removed
CREATE OR REPLACE FUNCTION update_message_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reply_to_id IS NOT NULL THEN
    UPDATE trip_chat_messages
    SET reply_count = reply_count + 1
    WHERE id = NEW.reply_to_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true AND NEW.reply_to_id IS NOT NULL THEN
    UPDATE trip_chat_messages
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = NEW.reply_to_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for reply count updates
DROP TRIGGER IF EXISTS trigger_update_reply_count ON trip_chat_messages;
CREATE TRIGGER trigger_update_reply_count
AFTER INSERT OR UPDATE OF is_deleted ON trip_chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_message_reply_count();

-- ============================================================================
-- 5. INDEX FOR THREAD QUERIES
-- ============================================================================

-- Fast lookup of replies to a message
CREATE INDEX IF NOT EXISTS idx_trip_chat_messages_reply_to
ON trip_chat_messages(reply_to_id)
WHERE reply_to_id IS NOT NULL;

-- ============================================================================
-- 6. REACTION COUNTS VIEW (AGGREGATED)
-- ============================================================================

-- View for aggregated reaction counts per message (for efficient fetching)
CREATE OR REPLACE VIEW message_reaction_counts AS
SELECT
  message_id,
  reaction_type,
  COUNT(*) as count,
  array_agg(user_id) as user_ids
FROM message_reactions
GROUP BY message_id, reaction_type;

-- Grant access to authenticated users
GRANT SELECT ON message_reaction_counts TO authenticated;
