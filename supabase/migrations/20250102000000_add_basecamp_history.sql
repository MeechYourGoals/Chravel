-- Create basecamp_change_history table for audit logging
-- Tracks all changes to trip basecamps and personal basecamps

CREATE TABLE IF NOT EXISTS public.basecamp_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  basecamp_type TEXT NOT NULL CHECK (basecamp_type IN ('trip', 'personal')),
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  
  -- Previous values (null for created)
  previous_name TEXT,
  previous_address TEXT,
  previous_latitude DOUBLE PRECISION,
  previous_longitude DOUBLE PRECISION,
  
  -- New values (null for deleted)
  new_name TEXT,
  new_address TEXT,
  new_latitude DOUBLE PRECISION,
  new_longitude DOUBLE PRECISION,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_basecamp_history_trip_id ON public.basecamp_change_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_basecamp_history_user_id ON public.basecamp_change_history(user_id);
CREATE INDEX IF NOT EXISTS idx_basecamp_history_type ON public.basecamp_change_history(basecamp_type);
CREATE INDEX IF NOT EXISTS idx_basecamp_history_created_at ON public.basecamp_change_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.basecamp_change_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can read history for trips they're members of
-- (This assumes you have a trip_members table - adjust based on your schema)
CREATE POLICY "basecamp_history_select_trip_members"
  ON public.basecamp_change_history
  FOR SELECT
  USING (
    -- Allow if user is the creator of the trip
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE trips.id = basecamp_change_history.trip_id 
      AND trips.creator_id = auth.uid()
    )
    OR
    -- Allow if user made the change
    user_id = auth.uid()
    OR
    -- Allow if user is a member of the trip (adjust based on your membership schema)
    EXISTS (
      SELECT 1 FROM public.trip_personal_basecamps
      WHERE trip_personal_basecamps.trip_id = basecamp_change_history.trip_id
      AND trip_personal_basecamps.user_id = auth.uid()
    )
  );

-- Function to log basecamp changes
CREATE OR REPLACE FUNCTION public.log_basecamp_change(
  p_trip_id TEXT,
  p_user_id UUID,
  p_basecamp_type TEXT,
  p_action TEXT,
  p_previous_name TEXT DEFAULT NULL,
  p_previous_address TEXT DEFAULT NULL,
  p_previous_latitude DOUBLE PRECISION DEFAULT NULL,
  p_previous_longitude DOUBLE PRECISION DEFAULT NULL,
  p_new_name TEXT DEFAULT NULL,
  p_new_address TEXT DEFAULT NULL,
  p_new_latitude DOUBLE PRECISION DEFAULT NULL,
  p_new_longitude DOUBLE PRECISION DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO public.basecamp_change_history (
    trip_id,
    user_id,
    basecamp_type,
    action,
    previous_name,
    previous_address,
    previous_latitude,
    previous_longitude,
    new_name,
    new_address,
    new_latitude,
    new_longitude
  ) VALUES (
    p_trip_id,
    p_user_id,
    p_basecamp_type,
    p_action,
    p_previous_name,
    p_previous_address,
    p_previous_latitude,
    p_previous_longitude,
    p_new_name,
    p_new_address,
    p_new_latitude,
    p_new_longitude
  )
  RETURNING id INTO v_history_id;
  
  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
