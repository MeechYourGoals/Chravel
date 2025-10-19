-- Add personal accommodations table for users to set their individual lodging
CREATE TABLE user_accommodations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  accommodation_name VARCHAR(255) NOT NULL,
  address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  check_in DATE,
  check_out DATE,
  accommodation_type VARCHAR(50) DEFAULT 'hotel', -- hotel, airbnb, hostel, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one accommodation per user per trip
  UNIQUE(trip_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_user_accommodations_trip_id ON user_accommodations(trip_id);
CREATE INDEX idx_user_accommodations_user_id ON user_accommodations(user_id);
CREATE INDEX idx_user_accommodations_location ON user_accommodations(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add RLS policies
ALTER TABLE user_accommodations ENABLE ROW LEVEL SECURITY;

-- Users can view accommodations for trips they're part of
CREATE POLICY "Users can view accommodations for their trips" ON user_accommodations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = user_accommodations.trip_id 
      AND trips.id IN (
        SELECT trip_id FROM trip_participants 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can manage their own accommodations
CREATE POLICY "Users can manage their own accommodations" ON user_accommodations
  FOR ALL USING (user_id = auth.uid());

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_accommodations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_accommodations_updated_at
  BEFORE UPDATE ON user_accommodations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_accommodations_updated_at();
