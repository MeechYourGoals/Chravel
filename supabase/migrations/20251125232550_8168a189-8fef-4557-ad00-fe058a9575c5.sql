-- Create trip_personal_basecamps table for persistent personal basecamp locations
CREATE TABLE trip_personal_basecamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  address text NOT NULL,
  latitude double precision,
  longitude double precision,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

-- Enable RLS
ALTER TABLE trip_personal_basecamps ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can manage their own personal basecamps
CREATE POLICY "Users can manage their own personal basecamps"
  ON trip_personal_basecamps FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for efficient lookups
CREATE INDEX idx_trip_personal_basecamps_trip_user ON trip_personal_basecamps(trip_id, user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_trip_personal_basecamps_updated_at
  BEFORE UPDATE ON trip_personal_basecamps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();