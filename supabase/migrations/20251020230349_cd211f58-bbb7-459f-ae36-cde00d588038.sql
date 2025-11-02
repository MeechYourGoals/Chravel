-- Phase 1: Channels System with RBAC Foundation

-- Trip admins table (who can manage roles and channels)
CREATE TABLE IF NOT EXISTS public.trip_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- Custom roles per trip (dynamic, not hardcoded)
CREATE TABLE IF NOT EXISTS public.trip_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, role_name)
);

-- User role assignments (many-to-many, supports multi-role)
CREATE TABLE IF NOT EXISTS public.user_trip_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES trip_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id, role_id)
);

-- Channels linked to roles
CREATE TABLE IF NOT EXISTS public.trip_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL,
  channel_slug TEXT NOT NULL,
  description TEXT,
  required_role_id UUID REFERENCES trip_roles(id) ON DELETE CASCADE,
  is_private BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  UNIQUE(trip_id, channel_slug)
);

-- Channel messages
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES trip_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Channel membership tracking with read receipts
CREATE TABLE IF NOT EXISTS public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES trip_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT FALSE,
  UNIQUE(channel_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.trip_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trip_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is trip admin
CREATE OR REPLACE FUNCTION public.is_trip_admin(_user_id UUID, _trip_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_admins
    WHERE user_id = _user_id AND trip_id = _trip_id
  )
$$;

-- Security definer function to get user's role IDs for a trip
CREATE OR REPLACE FUNCTION public.get_user_role_ids(_user_id UUID, _trip_id TEXT)
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role_id
  FROM public.user_trip_roles
  WHERE user_id = _user_id AND trip_id = _trip_id
$$;

-- Security definer function to check if user can access a channel
CREATE OR REPLACE FUNCTION public.can_access_channel(_user_id UUID, _channel_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_channels tc
    INNER JOIN public.user_trip_roles utr 
      ON utr.trip_id = tc.trip_id 
      AND utr.role_id = tc.required_role_id
      AND utr.user_id = _user_id
    WHERE tc.id = _channel_id
  )
$$;

-- RLS Policies for trip_admins
CREATE POLICY "Trip admins can manage admins"
ON public.trip_admins
FOR ALL
TO authenticated
USING (is_trip_admin(auth.uid(), trip_id));

CREATE POLICY "Trip members can view admins"
ON public.trip_admins
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM trip_members tm
  WHERE tm.trip_id = trip_admins.trip_id AND tm.user_id = auth.uid()
));

-- RLS Policies for trip_roles
CREATE POLICY "Admins can manage roles"
ON public.trip_roles
FOR ALL
TO authenticated
USING (is_trip_admin(auth.uid(), trip_id))
WITH CHECK (is_trip_admin(auth.uid(), trip_id));

CREATE POLICY "Trip members can view roles"
ON public.trip_roles
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM trip_members tm
  WHERE tm.trip_id = trip_roles.trip_id AND tm.user_id = auth.uid()
));

-- RLS Policies for user_trip_roles
CREATE POLICY "Admins can manage role assignments"
ON public.user_trip_roles
FOR ALL
TO authenticated
USING (is_trip_admin(auth.uid(), trip_id))
WITH CHECK (is_trip_admin(auth.uid(), trip_id));

CREATE POLICY "Users can view their own roles"
ON public.user_trip_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Trip members can view all role assignments"
ON public.user_trip_roles
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM trip_members tm
  WHERE tm.trip_id = user_trip_roles.trip_id AND tm.user_id = auth.uid()
));

-- RLS Policies for trip_channels
CREATE POLICY "Admins can manage channels"
ON public.trip_channels
FOR ALL
TO authenticated
USING (is_trip_admin(auth.uid(), trip_id))
WITH CHECK (is_trip_admin(auth.uid(), trip_id));

CREATE POLICY "Users can view accessible channels"
ON public.trip_channels
FOR SELECT
TO authenticated
USING (can_access_channel(auth.uid(), id));

-- RLS Policies for channel_messages
CREATE POLICY "Users can send messages to their channels"
ON public.channel_messages
FOR INSERT
TO authenticated
WITH CHECK (can_access_channel(auth.uid(), channel_id) AND sender_id = auth.uid());

CREATE POLICY "Users can view messages in their channels"
ON public.channel_messages
FOR SELECT
TO authenticated
USING (can_access_channel(auth.uid(), channel_id));

CREATE POLICY "Users can update their own messages"
ON public.channel_messages
FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
ON public.channel_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

-- RLS Policies for channel_members
CREATE POLICY "Users can view channel membership"
ON public.channel_members
FOR SELECT
TO authenticated
USING (can_access_channel(auth.uid(), channel_id));

CREATE POLICY "System can manage channel membership"
ON public.channel_members
FOR ALL
TO authenticated
USING (is_trip_admin(auth.uid(), (SELECT trip_id FROM trip_channels WHERE id = channel_id)))
WITH CHECK (is_trip_admin(auth.uid(), (SELECT trip_id FROM trip_channels WHERE id = channel_id)));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_trip_roles()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trip_roles_updated_at
BEFORE UPDATE ON public.trip_roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_trip_roles();

CREATE OR REPLACE FUNCTION update_updated_at_trip_channels()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trip_channels_updated_at
BEFORE UPDATE ON public.trip_channels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_trip_channels();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_admins_trip_user ON public.trip_admins(trip_id, user_id);
CREATE INDEX IF NOT EXISTS idx_trip_roles_trip ON public.trip_roles(trip_id);
CREATE INDEX IF NOT EXISTS idx_user_trip_roles_user_trip ON public.user_trip_roles(user_id, trip_id);
CREATE INDEX IF NOT EXISTS idx_user_trip_roles_role ON public.user_trip_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_trip_channels_trip ON public.trip_channels(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_channels_role ON public.trip_channels(required_role_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON public.channel_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members(user_id);