
-- Create event_lineup_members table for persisting lineup data
CREATE TABLE IF NOT EXISTS public.event_lineup_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id text NOT NULL,
  name text NOT NULL,
  title text,
  company text,
  bio text,
  avatar_url text,
  performer_type text DEFAULT 'speaker',
  created_by uuid REFERENCES public.profiles(user_id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_lineup_members ENABLE ROW LEVEL SECURITY;

-- RLS: Trip members can view lineup
CREATE POLICY "Event members can view lineup"
  ON public.event_lineup_members FOR SELECT
  USING (public.is_trip_member(auth.uid(), event_id));

-- RLS: Trip admins can insert lineup members
CREATE POLICY "Event admins can insert lineup"
  ON public.event_lineup_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = event_lineup_members.event_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.trip_admins
      WHERE trip_admins.trip_id = event_lineup_members.event_id
      AND trip_admins.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trips
      WHERE trips.id = event_lineup_members.event_id
      AND trips.created_by = auth.uid())
  );

-- RLS: Trip admins can update lineup members
CREATE POLICY "Event admins can update lineup"
  ON public.event_lineup_members FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = event_lineup_members.event_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.trip_admins
      WHERE trip_admins.trip_id = event_lineup_members.event_id
      AND trip_admins.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trips
      WHERE trips.id = event_lineup_members.event_id
      AND trips.created_by = auth.uid())
  );

-- RLS: Trip admins can delete lineup members
CREATE POLICY "Event admins can delete lineup"
  ON public.event_lineup_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.trip_members
      WHERE trip_members.trip_id = event_lineup_members.event_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.trip_admins
      WHERE trip_admins.trip_id = event_lineup_members.event_id
      AND trip_admins.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.trips
      WHERE trips.id = event_lineup_members.event_id
      AND trips.created_by = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_event_lineup_members_updated_at
  BEFORE UPDATE ON public.event_lineup_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
