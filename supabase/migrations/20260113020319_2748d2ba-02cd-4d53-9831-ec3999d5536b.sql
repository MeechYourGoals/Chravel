-- Add missing columns to trip_join_requests that the edge function expects
ALTER TABLE public.trip_join_requests 
ADD COLUMN IF NOT EXISTS requester_name text,
ADD COLUMN IF NOT EXISTS requester_email text,
ADD COLUMN IF NOT EXISTS requester_avatar_url text;

-- Add index for admin queries on pending requests
CREATE INDEX IF NOT EXISTS idx_trip_join_requests_trip_status 
ON public.trip_join_requests(trip_id, status) 
WHERE status = 'pending';

-- Comment for documentation
COMMENT ON COLUMN public.trip_join_requests.requester_name IS 'Captured at request time for display even if profile is missing';
COMMENT ON COLUMN public.trip_join_requests.requester_email IS 'Captured at request time for display even if profile is missing';
COMMENT ON COLUMN public.trip_join_requests.requester_avatar_url IS 'Captured at request time for display even if profile is missing';