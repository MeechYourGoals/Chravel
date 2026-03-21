
-- Create the message_reactions table for chat message reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  trip_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view reactions for trips they belong to
CREATE POLICY "Trip members can view reactions"
  ON public.message_reactions FOR SELECT
  TO authenticated
  USING (
    public.is_trip_member(auth.uid(), trip_id)
  );

-- RLS: Authenticated users can insert their own reactions
CREATE POLICY "Users can insert own reactions"
  ON public.message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_trip_member(auth.uid(), trip_id)
  );

-- RLS: Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON public.message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_trip_id ON public.message_reactions(trip_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);

-- Now apply the trigger from migration 2 (set_reaction_trip_id already exists)
CREATE TRIGGER trg_set_reaction_trip_id
  BEFORE INSERT ON public.message_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_reaction_trip_id();
