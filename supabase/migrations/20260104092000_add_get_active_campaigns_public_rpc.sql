-- Public RPC to fetch active campaigns without exposing private campaign details.
-- This function performs optional targeting-based filtering server-side, while returning
-- only the safe fields from public.campaigns_public.

CREATE OR REPLACE FUNCTION public.get_active_campaigns_public(
  p_interests TEXT[] DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_trip_type TEXT DEFAULT NULL
)
RETURNS SETOF public.campaigns_public
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.*
  FROM public.campaigns_public cp
  LEFT JOIN public.campaign_targeting ct
    ON ct.campaign_id = cp.campaign_id
  WHERE
    cp.status = 'active'
    AND (cp.start_date IS NULL OR cp.start_date <= NOW())
    AND (cp.end_date IS NULL OR cp.end_date >= NOW())
    AND (
      p_interests IS NULL
      OR ct.interests IS NULL
      OR ct.interests = '{}'
      OR ct.interests && p_interests
    )
    AND (
      p_location IS NULL
      OR ct.locations IS NULL
      OR ct.locations = '{}'
      OR p_location = ANY(ct.locations)
    )
    AND (
      p_trip_type IS NULL
      OR ct.trip_types IS NULL
      OR ct.trip_types = '{}'
      OR p_trip_type = ANY(ct.trip_types)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_active_campaigns_public(TEXT[], TEXT, TEXT) TO anon, authenticated;

