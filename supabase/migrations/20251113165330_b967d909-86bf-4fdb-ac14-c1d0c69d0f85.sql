-- ============================================
-- INVITE SYSTEM RLS POLICIES & TRIGGERS
-- ============================================

-- Add require_approval column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trip_invites' 
    AND column_name = 'require_approval'
  ) THEN
    ALTER TABLE public.trip_invites ADD COLUMN require_approval BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Update RLS policies for trip_invites
DROP POLICY IF EXISTS "Trip admins can manage invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Anyone can view active trip invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Users can create trip invites" ON public.trip_invites;
DROP POLICY IF EXISTS "Users can update their own trip invites" ON public.trip_invites;

-- Trip members can view active invites for their trips
CREATE POLICY "Trip members can view invites"
ON public.trip_invites
FOR SELECT
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_invites.trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Trip creators and admins can create invites
CREATE POLICY "Trip admins can create invites"
ON public.trip_invites
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id
        AND ta.user_id = auth.uid()
      )
    )
  )
);

-- Trip creators and admins can update invites
CREATE POLICY "Trip admins can update invites"
ON public.trip_invites
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id
        AND ta.user_id = auth.uid()
      )
    )
  )
);

-- Trip creators and admins can delete invites
CREATE POLICY "Trip admins can delete invites"
ON public.trip_invites
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_invites.trip_id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id
        AND ta.user_id = auth.uid()
      )
    )
  )
);

-- Anyone can view active invites by code (for joining)
CREATE POLICY "Public can view active invites by code"
ON public.trip_invites
FOR SELECT
USING (is_active = true);

-- Create function to auto-deactivate expired invites
CREATE OR REPLACE FUNCTION public.deactivate_expired_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trip_invites
  SET is_active = FALSE, updated_at = now()
  WHERE expires_at < now() 
  AND is_active = TRUE;
END;
$$;

-- Create scheduled job to run deactivation (Note: requires pg_cron extension)
-- For now, this will be called manually or via edge function
-- Future: Enable pg_cron and schedule: SELECT cron.schedule('deactivate-expired-invites', '0 * * * *', 'SELECT public.deactivate_expired_invites()');

-- Create trip_join_requests table if it doesn't exist (for approval workflow)
CREATE TABLE IF NOT EXISTS public.trip_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(trip_id, user_id)
);

-- Enable RLS on trip_join_requests
ALTER TABLE public.trip_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for trip_join_requests
CREATE POLICY "Users can view their own join requests"
ON public.trip_join_requests
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Trip admins can view join requests"
ON public.trip_join_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_join_requests.trip_id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id
        AND ta.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Trip admins can update join requests"
ON public.trip_join_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = trip_join_requests.trip_id
    AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.trip_admins ta
        WHERE ta.trip_id = t.id
        AND ta.user_id = auth.uid()
      )
    )
  )
);

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_trip_invites_code ON public.trip_invites(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trip_invites_expires ON public.trip_invites(expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trip_join_requests_status ON public.trip_join_requests(status, trip_id);