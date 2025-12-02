-- Security improvements and auto-create channel trigger

-- 1. Create trigger to auto-create private channel when a role is created
CREATE OR REPLACE FUNCTION public.auto_create_channel_for_new_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a private channel for the new role
  INSERT INTO public.trip_channels (
    trip_id,
    channel_name,
    channel_slug,
    required_role_id,
    is_private,
    created_by,
    description
  ) VALUES (
    NEW.trip_id,
    NEW.role_name,
    lower(regexp_replace(NEW.role_name, '[^a-zA-Z0-9]+', '-', 'g')),
    NEW.id,
    true,
    NEW.created_by,
    'Private channel for ' || NEW.role_name
  );

  -- Grant access to the role via channel_role_access
  INSERT INTO public.channel_role_access (channel_id, role_id)
  SELECT tc.id, NEW.id
  FROM public.trip_channels tc
  WHERE tc.required_role_id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail if channel creation fails
    RAISE WARNING 'Failed to auto-create channel for role %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_auto_create_channel_for_role ON public.trip_roles;
CREATE TRIGGER trigger_auto_create_channel_for_role
  AFTER INSERT ON public.trip_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_channel_for_new_role();

-- 2. Update OTP expiry to recommended 5 minutes (300 seconds)
-- Note: This requires Supabase dashboard access, documenting here for manual application

-- 3. Add index on channel_messages for sender profile joins
CREATE INDEX IF NOT EXISTS idx_channel_messages_sender_id ON public.channel_messages(sender_id);

-- 4. Create function to get channels for admins (all channels regardless of role)
CREATE OR REPLACE FUNCTION public.get_admin_accessible_channels(_trip_id text, _user_id uuid)
RETURNS TABLE (
  id uuid,
  trip_id text,
  channel_name text,
  channel_slug text,
  description text,
  required_role_id uuid,
  is_private boolean,
  is_archived boolean,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  member_count bigint
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.trip_admins 
    WHERE trip_admins.trip_id = _trip_id AND user_id = _user_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    tc.id,
    tc.trip_id,
    tc.channel_name,
    tc.channel_slug,
    tc.description,
    tc.required_role_id,
    tc.is_private,
    tc.is_archived,
    tc.created_by,
    tc.created_at,
    tc.updated_at,
    (SELECT COUNT(*) FROM public.channel_role_access cra 
     INNER JOIN public.user_trip_roles utr ON utr.role_id = cra.role_id 
     WHERE cra.channel_id = tc.id) as member_count
  FROM public.trip_channels tc
  WHERE tc.trip_id = _trip_id AND tc.is_archived = false
  ORDER BY tc.created_at;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;