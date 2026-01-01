-- Fix ensure_creator_is_member function (remove status column reference)
CREATE OR REPLACE FUNCTION public.ensure_creator_is_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop duplicate trigger and function
DROP TRIGGER IF EXISTS auto_add_trip_creator_trigger ON public.trips;
DROP FUNCTION IF EXISTS public.auto_add_trip_creator_as_member();