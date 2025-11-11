-- Add recurring event support and busy/free time blocking
-- Migration: Add recurring events and busy/free time features

-- Add recurring event columns to trip_events
ALTER TABLE trip_events
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT, -- RRULE format (e.g., "FREQ=DAILY;INTERVAL=1;COUNT=7")
ADD COLUMN IF NOT EXISTS recurrence_exceptions JSONB DEFAULT '[]'::jsonb, -- Array of exception dates
ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES trip_events(id) ON DELETE CASCADE, -- For recurring series
ADD COLUMN IF NOT EXISTS is_busy BOOLEAN DEFAULT true, -- true = busy, false = free/tentative
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'busy' CHECK (availability_status IN ('busy', 'free', 'tentative'));

-- Add index for recurring event queries
CREATE INDEX IF NOT EXISTS idx_trip_events_parent_event_id ON trip_events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_trip_events_recurrence ON trip_events(trip_id, recurrence_rule) WHERE recurrence_rule IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trip_events_availability ON trip_events(trip_id, availability_status, start_time);

-- Update create_event_with_conflict_check to handle recurring events and busy/free
CREATE OR REPLACE FUNCTION create_event_with_conflict_check(
  p_trip_id TEXT,
  p_title TEXT,
  p_description TEXT,
  p_location TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_created_by UUID,
  p_recurrence_rule TEXT DEFAULT NULL,
  p_is_busy BOOLEAN DEFAULT true,
  p_availability_status TEXT DEFAULT 'busy'
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
  conflict_count INTEGER;
BEGIN
  -- Only check conflicts for busy events (free/tentative don't block)
  IF p_is_busy AND p_availability_status = 'busy' THEN
    -- Check for overlapping busy events
    SELECT COUNT(*) INTO conflict_count
    FROM trip_events
    WHERE trip_id = p_trip_id
      AND is_busy = true
      AND availability_status = 'busy'
      AND (
        (start_time <= p_start_time AND (end_time IS NULL OR end_time > p_start_time))
        OR
        (start_time < p_end_time AND (end_time IS NULL OR end_time >= p_end_time))
        OR
        (start_time >= p_start_time AND (end_time IS NULL OR end_time <= p_end_time))
      );
      
    IF conflict_count > 0 THEN
      RAISE EXCEPTION 'Time conflict detected. There is already a busy event scheduled during this time.';
    END IF;
  END IF;
  
  -- Create the event
  INSERT INTO trip_events (
    trip_id, title, description, location, start_time, end_time, 
    created_by, recurrence_rule, is_busy, availability_status
  ) VALUES (
    p_trip_id, p_title, p_description, p_location, p_start_time, p_end_time, 
    p_created_by, p_recurrence_rule, p_is_busy, p_availability_status
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to expand recurring events for a date range
CREATE OR REPLACE FUNCTION expand_recurring_events(
  p_trip_id TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  id uuid,
  trip_id text,
  title text,
  description text,
  location text,
  start_time timestamptz,
  end_time timestamptz,
  event_category text,
  created_by uuid,
  recurrence_rule text,
  parent_event_id uuid,
  is_busy boolean,
  availability_status text
) AS $$
DECLARE
  base_event RECORD;
  occurrence_date TIMESTAMPTZ;
  duration INTERVAL;
  freq TEXT;
  interval_val INTEGER;
  count_val INTEGER;
  until_date TIMESTAMPTZ;
  byday TEXT[];
  bymonthday INTEGER[];
  exception_dates DATE[];
BEGIN
  -- Get all base events (non-recurring and parent recurring events)
  FOR base_event IN 
    SELECT * FROM trip_events
    WHERE trip_id = p_trip_id
      AND (
        recurrence_rule IS NULL
        OR parent_event_id IS NULL
      )
      AND start_time <= p_end_date
  LOOP
    duration := COALESCE(base_event.end_time - base_event.start_time, INTERVAL '1 hour');
    
    -- If not recurring, return as-is
    IF base_event.recurrence_rule IS NULL THEN
      IF base_event.start_time >= p_start_date AND base_event.start_time <= p_end_date THEN
        RETURN QUERY SELECT 
          base_event.id,
          base_event.trip_id,
          base_event.title,
          base_event.description,
          base_event.location,
          base_event.start_time,
          base_event.end_time,
          base_event.event_category,
          base_event.created_by,
          base_event.recurrence_rule,
          base_event.parent_event_id,
          base_event.is_busy,
          base_event.availability_status;
      END IF;
    ELSE
      -- Parse RRULE (simplified - handles FREQ, INTERVAL, COUNT, UNTIL, BYDAY)
      -- Note: Full RRULE parsing would require a more complex implementation
      -- This is a simplified version for common cases
      
      -- For now, return the parent event and let the application handle expansion
      -- Full RRULE parsing should be done in application code or with a library
      RETURN QUERY SELECT 
        base_event.id,
        base_event.trip_id,
        base_event.title,
        base_event.description,
        base_event.location,
        base_event.start_time,
        base_event.end_time,
        base_event.event_category,
        base_event.created_by,
        base_event.recurrence_rule,
        base_event.parent_event_id,
        base_event.is_busy,
        base_event.availability_status;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Update get_events_in_user_tz to include recurring and availability fields
CREATE OR REPLACE FUNCTION get_events_in_user_tz(p_trip_id text, p_user_id uuid)
RETURNS TABLE (
  id uuid,
  trip_id text,
  title text,
  description text,
  location text,
  start_time timestamptz,
  end_time timestamptz,
  event_category text,
  created_by uuid,
  user_local_start text,
  user_local_end text,
  recurrence_rule text,
  parent_event_id uuid,
  is_busy boolean,
  availability_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id,
    e.trip_id,
    e.title,
    e.description,
    e.location,
    e.start_time,
    e.end_time,
    e.event_category,
    e.created_by,
    to_char(e.start_time AT TIME ZONE COALESCE(p.timezone, 'UTC'), 'YYYY-MM-DD HH24:MI:SS') as user_local_start,
    to_char(e.end_time AT TIME ZONE COALESCE(p.timezone, 'UTC'), 'YYYY-MM-DD HH24:MI:SS') as user_local_end,
    e.recurrence_rule,
    e.parent_event_id,
    e.is_busy,
    e.availability_status
  FROM trip_events e
  CROSS JOIN profiles p
  WHERE e.trip_id = p_trip_id
    AND p.user_id = p_user_id
  ORDER BY e.start_time ASC;
$$;
