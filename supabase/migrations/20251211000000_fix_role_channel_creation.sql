-- Fix auto_create_channel_for_role to populate channel_role_access
CREATE OR REPLACE FUNCTION public.auto_create_channel_for_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_channel_id UUID;
BEGIN
  -- 1. Create the channel
  INSERT INTO public.trip_channels (
    trip_id, 
    channel_name, 
    channel_slug,
    required_role_id, -- Keep for backward compatibility
    is_private,
    created_by
  )
  VALUES (
    NEW.trip_id, 
    NEW.role_name,
    lower(replace(NEW.role_name, ' ', '-')),
    NEW.id, 
    true,
    NEW.created_by
  )
  ON CONFLICT (trip_id, channel_slug) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO new_channel_id;
  
  -- 2. Grant access via channel_role_access
  IF new_channel_id IS NOT NULL THEN
    INSERT INTO public.channel_role_access (channel_id, role_id)
    VALUES (new_channel_id, NEW.id)
    ON CONFLICT (channel_id, role_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Allow secondary roles to grant channel access
CREATE OR REPLACE FUNCTION public.can_access_channel(
  _user_id UUID,
  _channel_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_channels tc
    INNER JOIN public.channel_role_access cra ON cra.channel_id = tc.id
    INNER JOIN public.user_trip_roles utr
      ON utr.trip_id = tc.trip_id
      AND utr.role_id = cra.role_id
      AND utr.user_id = _user_id
      -- REMOVED: AND utr.is_primary = true
    WHERE tc.id = _channel_id
  )
$$;

-- Backfill missing channel_role_access entries
INSERT INTO public.channel_role_access (channel_id, role_id)
SELECT id, required_role_id
FROM public.trip_channels
WHERE required_role_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.channel_role_access cra 
  WHERE cra.channel_id = trip_channels.id 
  AND cra.role_id = trip_channels.required_role_id
);
