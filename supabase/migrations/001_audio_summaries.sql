
-- Create audio_summaries table
CREATE TABLE IF NOT EXISTS audio_summaries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  trip_id UUID,
  source_url TEXT NOT NULL,
  transcript TEXT,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audio_usage_quota table for tracking user usage
CREATE TABLE IF NOT EXISTS audio_usage_quota (
  user_id UUID PRIMARY KEY,
  monthly_usage INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-summaries', 'audio-summaries', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for audio_summaries
ALTER TABLE audio_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audio summaries"
ON audio_summaries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audio summaries"
ON audio_summaries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audio summaries"
ON audio_summaries FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for audio_usage_quota
ALTER TABLE audio_usage_quota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quota"
ON audio_usage_quota FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own quota"
ON audio_usage_quota FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quota"
ON audio_usage_quota FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Storage policies for audio files
CREATE POLICY "Users can view their own audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-summaries' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own audio files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-summaries' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files"
ON storage.objects FOR DELETE
USING (bucket_id = 'audio-summaries' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Functions for quota management
CREATE OR REPLACE FUNCTION check_audio_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER := 0;
  quota_limit INTEGER := 6000; -- 100 minutes in seconds (default free tier)
  last_reset DATE;
BEGIN
  -- Get or create quota record
  INSERT INTO audio_usage_quota (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current usage and last reset date
  SELECT monthly_usage, last_reset_date 
  INTO current_usage, last_reset
  FROM audio_usage_quota 
  WHERE user_id = p_user_id;
  
  -- Reset usage if it's a new month
  IF last_reset IS NULL OR DATE_TRUNC('month', last_reset) < DATE_TRUNC('month', CURRENT_DATE) THEN
    UPDATE audio_usage_quota 
    SET monthly_usage = 0, last_reset_date = CURRENT_DATE
    WHERE user_id = p_user_id;
    current_usage := 0;
  END IF;
  
  -- Check if under quota
  RETURN current_usage < quota_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_audio_usage(p_user_id UUID, p_duration INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audio_usage_quota (user_id, monthly_usage, last_reset_date)
  VALUES (p_user_id, p_duration, CURRENT_DATE)
  ON CONFLICT (user_id) 
  DO UPDATE SET monthly_usage = audio_usage_quota.monthly_usage + p_duration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
