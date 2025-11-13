-- ============================================================
-- PRO TRIP JOIN APPROVAL SYSTEM
-- Database functions, RLS policies, and notification system
-- ============================================================

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS: Users can update their own notifications
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Helper function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _title TEXT,
  _message TEXT DEFAULT '',
  _type TEXT DEFAULT 'info',
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (_user_id, _title, _message, _type, _metadata)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- ============================================================
-- APPROVE JOIN REQUEST FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req RECORD;
  trip_data RECORD;
  requester_profile RECORD;
  result JSONB;
BEGIN
  -- Fetch the join request
  SELECT * INTO req 
  FROM public.trip_join_requests 
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Join request not found'
    );
  END IF;

  -- Check if already processed
  IF req.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'This request has already been ' || req.status
    );
  END IF;

  -- Verify caller is admin or trip creator
  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;
  
  IF NOT (
    trip_data.created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = req.trip_id AND user_id = auth.uid()
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Only trip admins can approve join requests'
    );
  END IF;

  -- Update request status
  UPDATE public.trip_join_requests
  SET 
    status = 'approved',
    resolved_at = now(),
    resolved_by = auth.uid()
  WHERE id = _request_id;

  -- Add user to trip_members
  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (req.trip_id, req.user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Get requester profile for notification
  SELECT display_name INTO requester_profile
  FROM public.profiles
  WHERE user_id = req.user_id;

  -- Send notification to requester
  PERFORM public.create_notification(
    req.user_id,
    '✅ Join Request Approved',
    'Your request to join "' || trip_data.name || '" has been approved!',
    'success',
    jsonb_build_object(
      'trip_id', req.trip_id,
      'trip_name', trip_data.name,
      'action', 'join_approved'
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'User added to trip successfully',
    'trip_id', req.trip_id,
    'user_id', req.user_id
  );
END;
$$;

-- ============================================================
-- REJECT JOIN REQUEST FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_join_request(_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req RECORD;
  trip_data RECORD;
  result JSONB;
BEGIN
  -- Fetch the join request
  SELECT * INTO req 
  FROM public.trip_join_requests 
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Join request not found'
    );
  END IF;

  -- Check if already processed
  IF req.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'This request has already been ' || req.status
    );
  END IF;

  -- Verify caller is admin or trip creator
  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;
  
  IF NOT (
    trip_data.created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = req.trip_id AND user_id = auth.uid()
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Only trip admins can reject join requests'
    );
  END IF;

  -- Update request status
  UPDATE public.trip_join_requests
  SET 
    status = 'rejected',
    resolved_at = now(),
    resolved_by = auth.uid()
  WHERE id = _request_id;

  -- Send notification to requester
  PERFORM public.create_notification(
    req.user_id,
    'Join Request Update',
    'Your request to join "' || trip_data.name || '" was not approved at this time.',
    'info',
    jsonb_build_object(
      'trip_id', req.trip_id,
      'trip_name', trip_data.name,
      'action', 'join_rejected'
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Join request rejected',
    'trip_id', req.trip_id,
    'user_id', req.user_id
  );
END;
$$;

-- ============================================================
-- Enhanced RLS for trip_join_requests
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own join requests" ON public.trip_join_requests;
DROP POLICY IF EXISTS "Trip admins can view all requests" ON public.trip_join_requests;
DROP POLICY IF EXISTS "Trip admins can update requests" ON public.trip_join_requests;

-- Users can view their own join requests
CREATE POLICY "Users can view their own join requests"
ON public.trip_join_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Trip creators and admins can view all requests for their trips
CREATE POLICY "Trip admins can view all requests"
ON public.trip_join_requests
FOR SELECT
TO authenticated
USING (
  trip_id IN (
    SELECT id FROM public.trips WHERE created_by = auth.uid()
  ) OR
  trip_id IN (
    SELECT trip_id FROM public.trip_admins WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to insert join requests
CREATE POLICY "Authenticated users can create join requests"
ON public.trip_join_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Only admins can update (approve/reject) requests via functions
-- Direct updates not allowed - must use approve/reject functions

-- Add realtime publication for trip_join_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_join_requests;

-- Add realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;