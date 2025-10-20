-- Create user_accommodations table for personal accommodation addresses
CREATE TABLE public.user_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'My Stay',
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_id TEXT, -- Google Places API place_id
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (trip_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_accommodations_trip_id ON user_accommodations(trip_id);
CREATE INDEX idx_user_accommodations_user_id ON user_accommodations(user_id);
CREATE INDEX idx_user_accommodations_place_id ON user_accommodations(place_id);

-- Enable RLS
ALTER TABLE public.user_accommodations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see and manage their own accommodations
CREATE POLICY "Users can view their own accommodations"
  ON public.user_accommodations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accommodations"
  ON public.user_accommodations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accommodations"
  ON public.user_accommodations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accommodations"
  ON public.user_accommodations FOR DELETE
  USING (auth.uid() = user_id);

-- Create RPC function to get daily concierge usage for rate limiting
CREATE OR REPLACE FUNCTION get_daily_concierge_usage(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  usage_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO usage_count
  FROM concierge_usage
  WHERE user_id = user_uuid
    AND created_at >= CURRENT_DATE;
  
  RETURN COALESCE(usage_count, 0);
END;
$$;
