-- Create trip_personal_basecamps table for user-specific basecamps
-- This allows each user to have their own basecamp location (e.g., personal hotel)
-- separate from the shared trip basecamp (e.g., main event venue)

CREATE TABLE IF NOT EXISTS public.trip_personal_basecamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT,                    -- Optional label (e.g., "Airbnb on Lincoln Blvd")
  address TEXT,                 -- Formatted address
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one personal basecamp per user per trip
  UNIQUE(trip_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_personal_basecamps_trip_id ON public.trip_personal_basecamps(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_personal_basecamps_user_id ON public.trip_personal_basecamps(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_personal_basecamps_location ON public.trip_personal_basecamps(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Enable RLS
ALTER TABLE public.trip_personal_basecamps ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only read/write their own personal basecamps
CREATE POLICY "trip_personal_basecamps_select_own"
  ON public.trip_personal_basecamps
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "trip_personal_basecamps_insert_own"
  ON public.trip_personal_basecamps
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trip_personal_basecamps_update_own"
  ON public.trip_personal_basecamps
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trip_personal_basecamps_delete_own"
  ON public.trip_personal_basecamps
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_trip_personal_basecamps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trip_personal_basecamps_updated_at
  BEFORE UPDATE ON public.trip_personal_basecamps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trip_personal_basecamps_updated_at();
