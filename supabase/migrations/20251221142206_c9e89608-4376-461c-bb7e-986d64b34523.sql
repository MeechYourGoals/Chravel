-- Create function for auto-updating updated_at (only if not exists via OR REPLACE)
CREATE OR REPLACE FUNCTION public.update_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trip_member_preferences table for per-trip overrides
CREATE TABLE public.trip_member_preferences (
  trip_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_system_messages boolean NOT NULL DEFAULT true,
  system_message_categories jsonb NOT NULL DEFAULT '{
    "member": true,
    "basecamp": true,
    "uploads": true,
    "polls": true,
    "calendar": true,
    "tasks": false,
    "payments": false
  }'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, user_id)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_trip_member_preferences_user ON public.trip_member_preferences(user_id);
CREATE INDEX idx_trip_member_preferences_trip ON public.trip_member_preferences(trip_id);

-- Enable RLS on trip_member_preferences
ALTER TABLE public.trip_member_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own trip-specific preferences
CREATE POLICY "Users can view own trip preferences"
  ON public.trip_member_preferences FOR SELECT
  USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.trip_members tm 
      WHERE tm.trip_id = trip_member_preferences.trip_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own trip preferences"
  ON public.trip_member_preferences FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.trip_members tm 
      WHERE tm.trip_id = trip_member_preferences.trip_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own trip preferences"
  ON public.trip_member_preferences FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.trip_members tm 
      WHERE tm.trip_id = trip_member_preferences.trip_id 
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own trip preferences"
  ON public.trip_member_preferences FOR DELETE
  USING (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.trip_members tm 
      WHERE tm.trip_id = trip_member_preferences.trip_id 
      AND tm.user_id = auth.uid()
    )
  );

-- Create trigger for trip_member_preferences
CREATE TRIGGER update_trip_member_preferences_updated_at
  BEFORE UPDATE ON public.trip_member_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_preferences_updated_at();