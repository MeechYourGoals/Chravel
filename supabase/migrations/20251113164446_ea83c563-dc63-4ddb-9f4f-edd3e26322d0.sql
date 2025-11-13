-- Auto-assign trip creator as admin for Pro/Event trips
CREATE OR REPLACE FUNCTION public.initialize_pro_trip_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only for pro/event trips
  IF NEW.trip_type IN ('pro', 'event') THEN
    -- Create admin entry with full permissions
    INSERT INTO public.trip_admins (
      trip_id,
      user_id,
      granted_by,
      permissions
    ) VALUES (
      NEW.id,
      NEW.created_by,
      NEW.created_by,
      jsonb_build_object(
        'can_manage_roles', true,
        'can_manage_channels', true,
        'can_designate_admins', true
      )
    )
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign admin
DROP TRIGGER IF EXISTS initialize_pro_trip_admin_trigger ON public.trips;
CREATE TRIGGER initialize_pro_trip_admin_trigger
  AFTER INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_pro_trip_admin();