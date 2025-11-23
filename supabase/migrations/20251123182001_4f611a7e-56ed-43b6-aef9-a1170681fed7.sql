-- Add missing fields to trip_polls for enhanced poll features
ALTER TABLE trip_polls
  ADD COLUMN IF NOT EXISTS allow_multiple BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_vote_change BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id);

-- Create index for efficient deadline queries
CREATE INDEX IF NOT EXISTS idx_trip_polls_deadline 
  ON trip_polls(deadline_at) 
  WHERE status = 'active';

-- Add comment explaining the new fields
COMMENT ON COLUMN trip_polls.allow_multiple IS 'If true, users can select multiple options';
COMMENT ON COLUMN trip_polls.is_anonymous IS 'If true, voter identities are hidden';
COMMENT ON COLUMN trip_polls.allow_vote_change IS 'If true, users can change their votes';
COMMENT ON COLUMN trip_polls.deadline_at IS 'Optional deadline after which voting is disabled';
COMMENT ON COLUMN trip_polls.closed_at IS 'Timestamp when poll was manually closed';
COMMENT ON COLUMN trip_polls.closed_by IS 'User who closed the poll';