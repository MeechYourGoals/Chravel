-- Add version column to trips table for optimistic locking
ALTER TABLE trips ADD COLUMN IF NOT EXISTS basecamp_version INTEGER DEFAULT 1;

-- Create index for faster version lookups
CREATE INDEX IF NOT EXISTS idx_trips_basecamp_version ON trips(id, basecamp_version);

-- RPC function for versioned basecamp update
CREATE OR REPLACE FUNCTION update_trip_basecamp_with_version(
  p_trip_id TEXT,
  p_current_version INTEGER,
  p_name TEXT,
  p_address TEXT,
  p_latitude FLOAT,
  p_longitude FLOAT,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
BEGIN
  -- Lock row and get current version
  SELECT basecamp_version INTO v_current_version
  FROM trips
  WHERE id = p_trip_id
  FOR UPDATE;
  
  -- Check version match
  IF v_current_version != p_current_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'conflict', true,
      'current_version', v_current_version,
      'message', 'Basecamp was modified by another user'
    );
  END IF;
  
  -- Update with version increment
  v_new_version := v_current_version + 1;
  
  UPDATE trips SET
    basecamp_name = p_name,
    basecamp_address = p_address,
    basecamp_latitude = p_latitude,
    basecamp_longitude = p_longitude,
    basecamp_version = v_new_version,
    updated_at = NOW()
  WHERE id = p_trip_id;
  
  -- Log change to history if function exists
  BEGIN
    PERFORM log_basecamp_change(
      p_trip_id,
      p_user_id,
      'trip',
      'updated',
      NULL, NULL, NULL, NULL,
      p_name, p_address, p_latitude, p_longitude
    );
  EXCEPTION
    WHEN undefined_function THEN
      -- Function doesn't exist, skip logging
      NULL;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_version', v_new_version
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;