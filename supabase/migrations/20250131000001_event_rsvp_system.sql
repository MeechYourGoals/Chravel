-- Event RSVP and Registration System Migration
-- 
-- This migration creates the event_rsvps table for managing attendee registrations,
-- RSVP status tracking, capacity enforcement, waitlist management, and check-in functionality.
--
-- Related to: Events (Pro/Enterprise Feature) MVP enhancement
-- See: src/hooks/useEventRSVP.ts

-- ==========================================
-- STEP 1: Create event_rsvps table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not-answered' CHECK (status IN ('going', 'maybe', 'not-going', 'not-answered', 'waitlist')),
  rsvped_at TIMESTAMPTZ DEFAULT NOW(),
  ticket_qr_code TEXT,
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  waitlist_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- ==========================================
-- STEP 2: Add capacity and registration fields to trips table
-- ==========================================

-- Add capacity field if it doesn't exist (for events)
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- Add registration_status field if it doesn't exist
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'open' CHECK (registration_status IN ('open', 'closed', 'waitlist'));

-- ==========================================
-- STEP 3: Enable RLS
-- ==========================================

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 4: RLS Policies
-- ==========================================

-- Users can view their own RSVP
CREATE POLICY "Users can view their own RSVP"
ON public.event_rsvps
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Event organizers/admins can view all RSVPs for their events
CREATE POLICY "Event organizers can view all RSVPs"
ON public.event_rsvps
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trip_admins ta
    WHERE ta.trip_id = event_rsvps.event_id
      AND ta.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.trip_members tm
    WHERE tm.trip_id = event_rsvps.event_id
      AND tm.user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- Users can create/update their own RSVP
CREATE POLICY "Users can manage their own RSVP"
ON public.event_rsvps
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Event organizers can update check-in status
CREATE POLICY "Event organizers can update check-in"
ON public.event_rsvps
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trip_admins ta
    WHERE ta.trip_id = event_rsvps.event_id
      AND ta.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.trip_admins ta
    WHERE ta.trip_id = event_rsvps.event_id
      AND ta.user_id = auth.uid()
  )
);

-- ==========================================
-- STEP 5: Helper Functions
-- ==========================================

-- Function to check if event has capacity available
CREATE OR REPLACE FUNCTION public.event_has_capacity(_event_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT capacity FROM trips WHERE id = _event_id AND trip_type = 'event'),
    0
  ) > (
    SELECT COUNT(*)
    FROM event_rsvps
    WHERE event_id = _event_id
      AND status = 'going'
  );
$$;

-- Function to get event capacity info
CREATE OR REPLACE FUNCTION public.get_event_capacity(_event_id TEXT)
RETURNS TABLE (
  total INTEGER,
  current INTEGER,
  available INTEGER,
  waitlist_count INTEGER,
  is_full BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT capacity FROM trips WHERE id = _event_id), 0)::INTEGER as total,
    (SELECT COUNT(*) FROM event_rsvps WHERE event_id = _event_id AND status = 'going')::INTEGER as current,
    GREATEST(0, COALESCE((SELECT capacity FROM trips WHERE id = _event_id), 0) - (SELECT COUNT(*) FROM event_rsvps WHERE event_id = _event_id AND status = 'going'))::INTEGER as available,
    (SELECT COUNT(*) FROM event_rsvps WHERE event_id = _event_id AND status = 'waitlist')::INTEGER as waitlist_count,
    (SELECT COUNT(*) FROM event_rsvps WHERE event_id = _event_id AND status = 'going') >= COALESCE((SELECT capacity FROM trips WHERE id = _event_id), 0) as is_full;
$$;

-- Function to check in attendee (organizers only)
CREATE OR REPLACE FUNCTION public.check_in_attendee(_rsvp_id UUID, _checked_in_by UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_id TEXT;
BEGIN
  -- Get event_id from RSVP
  SELECT event_id INTO _event_id
  FROM event_rsvps
  WHERE id = _rsvp_id;

  -- Verify user is event organizer/admin
  IF NOT EXISTS (
    SELECT 1
    FROM trip_admins
    WHERE trip_id = _event_id
      AND user_id = _checked_in_by
  ) THEN
    RAISE EXCEPTION 'User is not authorized to check in attendees';
  END IF;

  -- Update check-in status
  UPDATE event_rsvps
  SET checked_in = true,
      checked_in_at = NOW()
  WHERE id = _rsvp_id;

  RETURN TRUE;
END;
$$;

-- ==========================================
-- STEP 6: Indexes for Performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON public.event_rsvps(event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_checked_in ON public.event_rsvps(event_id, checked_in);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_waitlist ON public.event_rsvps(event_id, waitlist_position) WHERE status = 'waitlist';

-- ==========================================
-- STEP 7: Triggers
-- ==========================================

-- Update updated_at timestamp
CREATE TRIGGER update_event_rsvps_updated_at
BEFORE UPDATE ON public.event_rsvps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- STEP 8: Comments
-- ==========================================

COMMENT ON TABLE public.event_rsvps IS 'Manages RSVP/registration system for Events including capacity enforcement, waitlist, and check-in';
COMMENT ON COLUMN public.event_rsvps.status IS 'RSVP status: going, maybe, not-going, not-answered, or waitlist';
COMMENT ON COLUMN public.event_rsvps.ticket_qr_code IS 'QR code data for ticket verification';
COMMENT ON COLUMN public.event_rsvps.waitlist_position IS 'Position in waitlist if event is full';
