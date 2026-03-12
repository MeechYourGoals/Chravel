-- Expand supported reaction types and enforce one reaction per user/message.

ALTER TABLE message_reactions
DROP CONSTRAINT IF EXISTS message_reactions_reaction_type_check;

ALTER TABLE message_reactions
ADD CONSTRAINT message_reactions_reaction_type_check
CHECK (
  reaction_type IN (
    'like',
    'love',
    'laugh',
    'wow',
    'sad',
    'angry',
    'clap',
    'party',
    'question',
    'dislike',
    'important'
  )
);

DROP INDEX IF EXISTS idx_message_reactions_unique_message_user;
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_reactions_unique_message_user
ON message_reactions(message_id, user_id);
