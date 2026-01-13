-- Create function to automatically add trip creator as admin member
CREATE OR REPLACE FUNCTION public.ensure_creator_is_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert creator as admin member if not already exists
  INSERT INTO public.trip_members (trip_id, user_id, role, created_at)
  VALUES (NEW.id, NEW.created_by, 'admin', NOW())
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on trips table
DROP TRIGGER IF EXISTS trigger_ensure_creator_is_member ON public.trips;
CREATE TRIGGER trigger_ensure_creator_is_member
AFTER INSERT ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.ensure_creator_is_member();

-- Also fix existing trips that are missing their creator in trip_members
INSERT INTO public.trip_members (trip_id, user_id, role, created_at)
SELECT t.id, t.created_by, 'admin', t.created_at
FROM trips t
WHERE NOT EXISTS (
  SELECT 1 FROM trip_members tm 
  WHERE tm.trip_id = t.id AND tm.user_id = t.created_by
)
AND t.created_by IS NOT NULL
ON CONFLICT (trip_id, user_id) DO NOTHING;