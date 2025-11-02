-- Create user_accommodations table for personal accommodations
CREATE TABLE IF NOT EXISTS public.user_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accommodation_name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accommodation_type TEXT DEFAULT 'hotel' CHECK (accommodation_type IN ('hotel', 'airbnb', 'hostel', 'apartment', 'resort', 'other')),
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (trip_id, user_id)
);

-- Enable RLS
ALTER TABLE public.user_accommodations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own accommodations
CREATE POLICY "user_accommodations_select_own"
  ON public.user_accommodations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_accommodations_insert_own"
  ON public.user_accommodations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_accommodations_update_own"
  ON public.user_accommodations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_accommodations_delete_own"
  ON public.user_accommodations FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_accommodations_trip ON public.user_accommodations(trip_id);
CREATE INDEX idx_user_accommodations_user ON public.user_accommodations(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_accommodations_updated_at
  BEFORE UPDATE ON public.user_accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();