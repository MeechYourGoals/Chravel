
-- App settings key-value store for configurable values (voice IDs, feature flags, etc.)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Authenticated users can read app_settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon to read as well (edge functions use service role, but client may need it)
CREATE POLICY "Anon users can read app_settings"
  ON public.app_settings
  FOR SELECT
  TO anon
  USING (true);

-- Seed TTS voice configuration
INSERT INTO public.app_settings (key, value, description) VALUES
  ('tts_primary_voice_id', '1SM7GgM6IMuvQlz2BwM3', 'ElevenLabs primary voice ID (Mark)'),
  ('tts_fallback_voice_id', 'nPczCjzI2devNBz1zQrb', 'ElevenLabs fallback voice ID (Brian - free-tier safe)'),
  ('tts_model_id', 'eleven_multilingual_v2', 'ElevenLabs TTS model')
ON CONFLICT (key) DO NOTHING;
