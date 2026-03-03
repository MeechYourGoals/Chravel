-- TTS usage tracking table for ElevenLabs rate limiting.
-- Tracks daily request counts per user.
CREATE TABLE IF NOT EXISTS public.tts_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

-- RLS: users can only read/write their own rows.
ALTER TABLE public.tts_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own TTS usage"
  ON public.tts_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own TTS usage"
  ON public.tts_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own TTS usage"
  ON public.tts_usage FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role needs access for the edge function (runs as service_role via RPC).
-- The edge function authenticates the user via JWT and then calls this RPC.

-- RPC function to atomically increment TTS usage (upsert pattern).
CREATE OR REPLACE FUNCTION public.increment_tts_usage(p_user_id uuid, p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tts_usage (user_id, usage_date, request_count, updated_at)
  VALUES (p_user_id, p_date, 1, now())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    request_count = tts_usage.request_count + 1,
    updated_at = now();
END;
$$;
