-- Security Fix: Secure broadcast view functions from unauthorized access
-- Fixes: mark_broadcast_viewed and get_broadcast_read_count
-- Issue: SECURITY DEFINER functions bypass RLS and allow any authenticated user
--        to mark/view read receipts for broadcasts they don't belong to
-- Solution: Add explicit trip membership validation before operations

-- Fix mark_broadcast_viewed: Validate user is a member of the broadcast's trip
CREATE OR REPLACE FUNCTION public.mark_broadcast_viewed(broadcast_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id TEXT;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get the trip_id for this broadcast
  SELECT trip_id INTO v_trip_id
  FROM public.broadcasts
  WHERE id = broadcast_uuid;

  -- Verify broadcast exists
  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'Broadcast not found';
  END IF;

  -- Validate user is a member of the trip
  IF NOT EXISTS (
    SELECT 1
    FROM public.trip_members
    WHERE trip_id = v_trip_id
      AND user_id = v_user_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is not a member of this trip';
  END IF;

  -- Safe to insert/update view record
  INSERT INTO public.broadcast_views (broadcast_id, user_id, viewed_at)
  VALUES (broadcast_uuid, v_user_id, now())
  ON CONFLICT (broadcast_id, user_id) 
  DO UPDATE SET viewed_at = now();
END;
$$;

-- Fix get_broadcast_read_count: Validate user is a member of the broadcast's trip
CREATE OR REPLACE FUNCTION public.get_broadcast_read_count(broadcast_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_trip_id TEXT;
  v_user_id UUID;
  read_count INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get the trip_id for this broadcast
  SELECT trip_id INTO v_trip_id
  FROM public.broadcasts
  WHERE id = broadcast_uuid;

  -- Verify broadcast exists
  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'Broadcast not found';
  END IF;

  -- Validate user is a member of the trip
  IF NOT EXISTS (
    SELECT 1
    FROM public.trip_members
    WHERE trip_id = v_trip_id
      AND user_id = v_user_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is not a member of this trip';
  END IF;

  -- Safe to return read count
  SELECT COUNT(*) INTO read_count
  FROM public.broadcast_views
  WHERE broadcast_id = broadcast_uuid;
  
  RETURN read_count;
END;
$$;

-- Add comments documenting the security fix
COMMENT ON FUNCTION public.mark_broadcast_viewed(UUID) IS 
'Safely marks a broadcast as viewed. Validates user is an active member of the broadcast''s trip before allowing the operation.';

COMMENT ON FUNCTION public.get_broadcast_read_count(UUID) IS 
'Safely returns read receipt count for a broadcast. Validates user is an active member of the broadcast''s trip before returning data.';
