-- Create dismiss_join_request function for admins to remove requests (including orphaned ones)
CREATE OR REPLACE FUNCTION public.dismiss_join_request(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id uuid;
  v_requester_id uuid;
  v_user_exists boolean;
BEGIN
  -- Get request details
  SELECT trip_id, user_id INTO v_trip_id, v_requester_id
  FROM public.trip_join_requests
  WHERE id = _request_id AND status = 'pending';

  IF v_trip_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request not found or already processed');
  END IF;

  -- Verify caller is admin/creator of the trip
  IF NOT EXISTS (
    SELECT 1 FROM trips WHERE id = v_trip_id AND created_by = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = v_trip_id AND user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Only trip admins can dismiss requests');
  END IF;

  -- Check if user still exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_requester_id) INTO v_user_exists;

  -- Delete the request (dismiss = permanently remove without approve/reject)
  DELETE FROM public.trip_join_requests WHERE id = _request_id;

  -- Return success with context
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN v_user_exists THEN 'Request dismissed' ELSE 'Orphaned request removed' END,
    'cleaned_up', NOT v_user_exists
  );
END;
$$;

-- Clean up the specific orphaned Nard Tyler request
DELETE FROM public.trip_join_requests 
WHERE id = 'b0c25531-ecf8-455f-8646-fe79f14fdcaf';