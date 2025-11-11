-- Create ai_conversations table for storing AI chat history
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  conversation_type TEXT DEFAULT 'chat' CHECK (conversation_type IN ('chat', 'sentiment', 'review', 'audio', 'image')),
  model_used TEXT DEFAULT 'sonar',
  tokens_used INTEGER,
  response_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on ai_conversations
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_conversations
CREATE POLICY "Users can view conversations from their trips" ON public.ai_conversations
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      OR id IN (
        SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert conversations for their trips" ON public.ai_conversations
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      OR id IN (
        SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for performance
CREATE INDEX idx_ai_conversations_trip_id ON public.ai_conversations(trip_id);
CREATE INDEX idx_ai_conversations_created_at ON public.ai_conversations(created_at);
CREATE INDEX idx_ai_conversations_conversation_type ON public.ai_conversations(conversation_type);

-- Create trigger for updated_at column
CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get conversation history for a trip
CREATE OR REPLACE FUNCTION get_trip_conversation_history(trip_uuid UUID, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_message TEXT,
  ai_response TEXT,
  conversation_type TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.user_message,
    c.ai_response,
    c.conversation_type,
    c.created_at
  FROM public.ai_conversations c
  WHERE c.trip_id = trip_uuid
  ORDER BY c.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;