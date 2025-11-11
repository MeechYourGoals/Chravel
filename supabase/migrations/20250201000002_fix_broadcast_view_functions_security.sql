-- Security Fix: Switch broadcast view functions to SECURITY INVOKER
-- Fixes: mark_broadcast_viewed and get_broadcast_read_count
-- Issue: SECURITY DEFINER functions bypass RLS and allow any authenticated user
--        to mark/view read receipts for broadcasts they don't belong to
-- Solution: Use SECURITY INVOKER so RLS policies on broadcast_views table apply
--           This ensures only trip members can mark views and see read counts

-- Fix mark_broadcast_viewed: Use SECURITY INVOKER so RLS policies apply
CREATE OR REPLACE FUNCTION public.mark_broadcast_viewed(broadcast_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- The INSERT into broadcast_views will be protected by RLS policy which checks:
  -- 1. auth.uid() = user_id (user can only mark their own views)
  -- 2. User is an active trip member (via EXISTS check joining broadcasts -> trip_members)
  -- If user is not a trip member, RLS will block the INSERT and raise an error
  -- The ON CONFLICT DO UPDATE is protected by the UPDATE RLS policy with the same checks
  INSERT INTO public.broadcast_views (broadcast_id, user_id, viewed_at)
  VALUES (broadcast_uuid, v_user_id, now())
  ON CONFLICT (broadcast_id, user_id) 
  DO UPDATE SET viewed_at = now();
END;
$$;

-- Fix get_broadcast_read_count: Use SECURITY INVOKER so RLS policies apply
CREATE OR REPLACE FUNCTION public.get_broadcast_read_count(broadcast_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_trip_id TEXT;
  read_count INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Get the trip_id for this broadcast and verify user is a member
  -- This prevents information leakage: non-members get an error, not a count of 0
  SELECT b.trip_id INTO v_trip_id
  FROM public.broadcasts b
  WHERE b.id = broadcast_uuid;

  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'Broadcast not found';
  END IF;

  -- Validate user is an active member of the trip
  IF NOT EXISTS (
    SELECT 1
    FROM public.trip_members tm
    WHERE tm.trip_id = v_trip_id
      AND tm.user_id = v_user_id
      AND tm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'User is not a member of this trip';
  END IF;

  -- RLS policy on broadcast_views SELECT will filter results to only show
  -- read receipts for broadcasts in trips the user belongs to
  -- Since we've already validated membership, this will return the full count
  SELECT COUNT(*) INTO read_count
  FROM public.broadcast_views
  WHERE broadcast_id = broadcast_uuid;
  
  RETURN read_count;
END;
$$;

-- Strengthen RLS policies to also check active status (defense in depth)
-- Update INSERT policy to require active membership
DROP POLICY IF EXISTS "Users can create broadcast views" ON public.broadcast_views;
CREATE POLICY "Users can create broadcast views"
ON public.broadcast_views
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM broadcasts b
    JOIN trip_members tm ON tm.trip_id = b.trip_id
    WHERE b.id = broadcast_views.broadcast_id 
    AND tm.user_id = auth.uid()
    AND tm.status = 'active'
  )
);

-- Update SELECT policy to require active membership for read receipts
DROP POLICY IF EXISTS "Trip members can view broadcast read receipts" ON public.broadcast_views;
CREATE POLICY "Trip members can view broadcast read receipts"
ON public.broadcast_views
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM broadcasts b
    JOIN trip_members tm ON tm.trip_id = b.trip_id
    WHERE b.id = broadcast_views.broadcast_id 
    AND tm.user_id = auth.uid()
    AND tm.status = 'active'
  )
);

-- Add UPDATE policy to allow refreshing view timestamps (required for ON CONFLICT DO UPDATE)
-- Users can only update their own view records if they're active trip members
DROP POLICY IF EXISTS "Users can update their own broadcast views" ON public.broadcast_views;
CREATE POLICY "Users can update their own broadcast views"
ON public.broadcast_views
FOR UPDATE
USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM broadcasts b
    JOIN trip_members tm ON tm.trip_id = b.trip_id
    WHERE b.id = broadcast_views.broadcast_id 
    AND tm.user_id = auth.uid()
    AND tm.status = 'active'
  )
)
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM broadcasts b
    JOIN trip_members tm ON tm.trip_id = b.trip_id
    WHERE b.id = broadcast_views.broadcast_id 
    AND tm.user_id = auth.uid()
    AND tm.status = 'active'
  )
);

-- Add comments documenting the security fix
COMMENT ON FUNCTION public.mark_broadcast_viewed(UUID) IS 
'Marks a broadcast as viewed. Uses SECURITY INVOKER so RLS policies enforce trip membership. Only active trip members can mark views for broadcasts in their trips.';

COMMENT ON FUNCTION public.get_broadcast_read_count(UUID) IS 
'Returns read receipt count for a broadcast. Uses SECURITY INVOKER so RLS policies enforce trip membership. Only active trip members can view read counts for broadcasts in their trips.';
