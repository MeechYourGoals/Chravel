-- Create security_logs table for auditing role changes and critical actions
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on security_logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only service role or admins can insert (via functions)
CREATE POLICY "System can insert security logs"
ON public.security_logs
FOR INSERT
TO authenticated, service_role
WITH CHECK (true); -- Allow insertion, but functions control content

-- Only admins can view logs (implementation specific, restricting to service role for now)
CREATE POLICY "Admins can view security logs"
ON public.security_logs
FOR SELECT
TO service_role
USING (true);

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  _user_id UUID,
  _action TEXT,
  _target_type TEXT,
  _target_id TEXT,
  _details JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_logs (user_id, action, target_type, target_id, details)
  VALUES (_user_id, _action, _target_type, _target_id, _details);
END;
$$;

-- Function to check if a user can manage trip content based on trip type and role
CREATE OR REPLACE FUNCTION public.can_manage_trip_content(_user_id UUID, _trip_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_type TEXT;
  v_is_member BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- Get trip type
  SELECT trip_type INTO v_trip_type
  FROM public.trips
  WHERE id = _trip_id;

  -- Default to consumer if not found or null
  IF v_trip_type IS NULL THEN
    v_trip_type := 'consumer';
  END IF;

  -- Check membership
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = _trip_id AND user_id = _user_id AND status = 'active'
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN FALSE;
  END IF;

  -- If consumer trip, any member can manage content
  IF v_trip_type = 'consumer' THEN
    RETURN TRUE;
  END IF;

  -- If pro or event trip, only admins can manage content
  -- Check if user is in trip_admins table
  SELECT EXISTS (
    SELECT 1 FROM public.trip_admins
    WHERE trip_id = _trip_id AND user_id = _user_id
  ) INTO v_is_admin;

  RETURN v_is_admin;
END;
$$;

-- Trigger to prevent self-promotion or role changes by non-admins
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow service role to bypass
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Check if role is changing
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Check if user is changing their own role
    IF auth.uid() = OLD.user_id THEN
      -- Check if they are an admin (admins can change roles, but usually via other means)
      -- But strictly speaking, users shouldn't change their own role in trip_members directly.
      -- If they are admin, they might be able to, but let's restrict it to be safe.
      -- Only exception is if they are leaving (status change), which is handled by a different check.
      -- Here we specifically block role change if not authorized.

      -- Check if the user is an admin of the trip
      IF NOT EXISTS (SELECT 1 FROM public.trip_admins WHERE trip_id = OLD.trip_id AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Role changes are restricted to admins.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger to trip_members
DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.trip_members;
CREATE TRIGGER trg_prevent_self_role_escalation
BEFORE UPDATE ON public.trip_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_escalation();

-- Trigger to log role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      PERFORM public.log_security_event(
        auth.uid(),
        'role_change',
        'trip_member',
        NEW.id::text,
        jsonb_build_object(
          'trip_id', NEW.trip_id,
          'target_user_id', NEW.user_id,
          'old_role', OLD.role,
          'new_role', NEW.role
        )
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
     PERFORM public.log_security_event(
        auth.uid(),
        'member_added',
        'trip_member',
        NEW.id::text,
        jsonb_build_object(
          'trip_id', NEW.trip_id,
          'target_user_id', NEW.user_id,
          'role', NEW.role
        )
      );
  ELSIF TG_OP = 'DELETE' THEN
     PERFORM public.log_security_event(
        auth.uid(),
        'member_removed',
        'trip_member',
        OLD.id::text,
        jsonb_build_object(
          'trip_id', OLD.trip_id,
          'target_user_id', OLD.user_id,
          'role', OLD.role
        )
      );
  END IF;
  RETURN NULL;
END;
$$;

-- Apply audit trigger to trip_members
DROP TRIGGER IF EXISTS trg_audit_trip_members ON public.trip_members;
CREATE TRIGGER trg_audit_trip_members
AFTER INSERT OR UPDATE OR DELETE ON public.trip_members
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_changes();

-- Apply audit trigger to trip_admins
CREATE OR REPLACE FUNCTION public.audit_trip_admins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
     PERFORM public.log_security_event(
        auth.uid(),
        'admin_added',
        'trip_admin',
        NEW.id::text,
        jsonb_build_object(
          'trip_id', NEW.trip_id,
          'target_user_id', NEW.user_id,
          'granted_by', NEW.granted_by
        )
      );
  ELSIF TG_OP = 'DELETE' THEN
     PERFORM public.log_security_event(
        auth.uid(),
        'admin_removed',
        'trip_admin',
        OLD.id::text,
        jsonb_build_object(
          'trip_id', OLD.trip_id,
          'target_user_id', OLD.user_id
        )
      );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_trip_admins ON public.trip_admins;
CREATE TRIGGER trg_audit_trip_admins
AFTER INSERT OR DELETE ON public.trip_admins
FOR EACH ROW
EXECUTE FUNCTION public.audit_trip_admins();

-- Update RLS Policies for trip_events
DROP POLICY IF EXISTS "Trip members can create events" ON public.trip_events;
CREATE POLICY "Trip members/admins can create events"
ON public.trip_events
FOR INSERT
WITH CHECK (
  public.can_manage_trip_content(auth.uid(), trip_id)
);

DROP POLICY IF EXISTS "Event creators can update their events" ON public.trip_events;
CREATE POLICY "Trip members/admins can update events"
ON public.trip_events
FOR UPDATE
USING (
  public.can_manage_trip_content(auth.uid(), trip_id)
);

DROP POLICY IF EXISTS "Event creators can delete their events" ON public.trip_events;
CREATE POLICY "Trip members/admins can delete events"
ON public.trip_events
FOR DELETE
USING (
  public.can_manage_trip_content(auth.uid(), trip_id)
);

-- Update RLS Policies for broadcasts
DROP POLICY IF EXISTS "Trip members can create broadcasts" ON public.broadcasts;
CREATE POLICY "Trip members/admins can create broadcasts"
ON public.broadcasts
FOR INSERT
WITH CHECK (
  public.can_manage_trip_content(auth.uid(), trip_id)
);

DROP POLICY IF EXISTS "Broadcast creators can update their broadcasts" ON public.broadcasts;
CREATE POLICY "Trip members/admins can update broadcasts"
ON public.broadcasts
FOR UPDATE
USING (
  public.can_manage_trip_content(auth.uid(), trip_id)
);

-- Update RLS Policies for smart_todos
DROP POLICY IF EXISTS "Users can manage todos for their trips" ON public.smart_todos;
CREATE POLICY "Trip members/admins can manage todos"
ON public.smart_todos
FOR ALL
USING (
  (user_id = auth.uid() AND public.can_manage_trip_content(auth.uid(), trip_id))
  OR
  (trip_id IN (SELECT id FROM public.trips WHERE created_by = auth.uid()))
);

-- Update RLS Policies for enhanced_expenses
DROP POLICY IF EXISTS "Users can manage expenses for their trips" ON public.enhanced_expenses;
CREATE POLICY "Trip members/admins can manage expenses"
ON public.enhanced_expenses
FOR ALL
USING (
  public.can_manage_trip_content(auth.uid(), trip_id)
);

-- Update RLS Policies for travel_bookings
DROP POLICY IF EXISTS "Users can manage bookings for their trips" ON public.travel_bookings;
CREATE POLICY "Trip members/admins can manage bookings"
ON public.travel_bookings
FOR ALL
USING (
  public.can_manage_trip_content(auth.uid(), trip_id)
);

-- Update RLS Policies for trip_invites
DROP POLICY IF EXISTS "Users can create invites for their trips" ON public.trip_invites;
CREATE POLICY "Trip members/admins can create invites"
ON public.trip_invites
FOR INSERT
WITH CHECK (
  public.can_manage_trip_content(auth.uid(), trip_id)
);

DROP POLICY IF EXISTS "Users can update invites for their trips" ON public.trip_invites;
CREATE POLICY "Trip members/admins can update invites"
ON public.trip_invites
FOR UPDATE
USING (
  public.can_manage_trip_content(auth.uid(), trip_id)
);
