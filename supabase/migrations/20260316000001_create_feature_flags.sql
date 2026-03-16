-- Feature Flags Table
-- Runtime feature flags that can be toggled without redeployment.
-- Kill switches for incident containment (< 1 min disable time).
--
-- Usage:
--   SELECT enabled FROM public.feature_flags WHERE key = 'ai_concierge';
--   UPDATE public.feature_flags SET enabled = false WHERE key = 'voice_live';

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER NOT NULL DEFAULT 100
    CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read flags (no auth required for fast client-side reads)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feature_flags' AND policyname = 'Anyone can read feature flags'
  ) THEN
    CREATE POLICY "Anyone can read feature flags"
      ON public.feature_flags FOR SELECT
      USING (true);
  END IF;
END $$;

-- Only service role can modify (admin operations only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feature_flags' AND policyname = 'Service role can manage flags'
  ) THEN
    CREATE POLICY "Service role can manage flags"
      ON public.feature_flags FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Auto-update timestamp on change
CREATE OR REPLACE FUNCTION public.update_feature_flag_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feature_flag_timestamp();

-- Seed critical kill switches
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('ai_concierge', true, 'AI Concierge feature — disable to stop all AI queries'),
  ('voice_live', true, 'Gemini Live voice mode — disable to stop voice sessions'),
  ('stripe_payments', true, 'Stripe payment processing — disable to hide payment UI'),
  ('push_notifications', true, 'Web push notifications — disable to stop push delivery'),
  ('demo_mode', false, 'Demo/mock mode — enable to use mock data for testing')
ON CONFLICT (key) DO NOTHING;
