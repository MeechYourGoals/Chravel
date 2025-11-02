-- Channels System Migration
-- Adds role-based channels for Enterprise/Pro trips

-- Create trip_channels table
CREATE TABLE IF NOT EXISTS trip_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('role', 'custom')),
  role_filter JSONB, -- For role channels: { department: "coaches", role: "head_coach" }
  created_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_archived BOOLEAN DEFAULT false,
  
  -- Constraints
  CONSTRAINT unique_channel_slug_per_trip UNIQUE (trip_id, slug),
  CONSTRAINT role_filter_required_for_role_channels CHECK (
    (channel_type = 'role' AND role_filter IS NOT NULL) OR 
    (channel_type = 'custom' AND role_filter IS NULL)
  )
);

-- Create trip_channel_members table
CREATE TABLE IF NOT EXISTS trip_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES trip_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  role TEXT, -- Optional display role in channel
  joined_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_channel_membership UNIQUE (channel_id, user_id)
);

-- Add channel_id to trip_chat_messages
ALTER TABLE trip_chat_messages 
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES trip_channels(id) ON DELETE CASCADE;

-- Add constraint to ensure messages are either in main chat (channel_id IS NULL) or in a channel
ALTER TABLE trip_chat_messages 
ADD CONSTRAINT check_channel_consistency CHECK (
  (channel_id IS NULL) OR 
  (channel_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM trip_channels 
    WHERE id = trip_chat_messages.channel_id 
    AND trip_id = trip_chat_messages.trip_id
  ))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_channels_trip_id ON trip_channels(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_channels_slug ON trip_channels(trip_id, slug);
CREATE INDEX IF NOT EXISTS idx_trip_channel_members_channel_id ON trip_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_trip_channel_members_user_id ON trip_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_chat_messages_channel_id ON trip_chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_trip_chat_messages_trip_channel ON trip_chat_messages(trip_id, channel_id, created_at);

-- Row Level Security Policies

-- Enable RLS on new tables
ALTER TABLE trip_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_channel_members ENABLE ROW LEVEL SECURITY;

-- trip_channels policies
CREATE POLICY "Users can view channels they are members of or trip admins can view all"
ON trip_channels FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trip_channel_members tcm
    WHERE tcm.channel_id = trip_channels.id
    AND tcm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_channels.trip_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'organizer', 'owner')
  )
);

CREATE POLICY "Trip admins can create channels"
ON trip_channels FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_channels.trip_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'organizer', 'owner')
  )
);

CREATE POLICY "Trip admins can update channels"
ON trip_channels FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_channels.trip_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'organizer', 'owner')
  )
);

CREATE POLICY "Trip admins can delete channels"
ON trip_channels FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_channels.trip_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'organizer', 'owner')
  )
);

-- trip_channel_members policies
CREATE POLICY "Users can view their own memberships and channel members can view all members"
ON trip_channel_members FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM trip_channel_members tcm2
    WHERE tcm2.channel_id = trip_channel_members.channel_id
    AND tcm2.user_id = auth.uid()
  )
);

CREATE POLICY "Trip admins can manage channel memberships"
ON trip_channel_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM trip_channels tc
    JOIN trip_members tm ON tm.trip_id = tc.trip_id
    WHERE tc.id = trip_channel_members.channel_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'organizer', 'owner')
  )
);

-- Update trip_chat_messages policies to handle channels
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view messages from trips they are members of" ON trip_chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to trips they are members of" ON trip_chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON trip_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON trip_chat_messages;

-- Create new policies that handle both main chat and channels
CREATE POLICY "Users can view main chat messages from trips they are members of"
ON trip_chat_messages FOR SELECT
USING (
  channel_id IS NULL
  AND EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_chat_messages.trip_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view channel messages from channels they are members of"
ON trip_chat_messages FOR SELECT
USING (
  channel_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM trip_channel_members tcm
    WHERE tcm.channel_id = trip_chat_messages.channel_id
    AND tcm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages to main chat of trips they are members of"
ON trip_chat_messages FOR INSERT
WITH CHECK (
  channel_id IS NULL
  AND EXISTS (
    SELECT 1 FROM trip_members tm
    WHERE tm.trip_id = trip_chat_messages.trip_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages to channels they are members of"
ON trip_chat_messages FOR INSERT
WITH CHECK (
  channel_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM trip_channel_members tcm
    WHERE tcm.channel_id = trip_chat_messages.channel_id
    AND tcm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages"
ON trip_chat_messages FOR UPDATE
USING (
  user_id = auth.uid()
  AND (
    (channel_id IS NULL AND EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trip_chat_messages.trip_id
      AND tm.user_id = auth.uid()
    ))
    OR
    (channel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM trip_channel_members tcm
      WHERE tcm.channel_id = trip_chat_messages.channel_id
      AND tcm.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can delete their own messages"
ON trip_chat_messages FOR DELETE
USING (
  user_id = auth.uid()
  AND (
    (channel_id IS NULL AND EXISTS (
      SELECT 1 FROM trip_members tm
      WHERE tm.trip_id = trip_chat_messages.trip_id
      AND tm.user_id = auth.uid()
    ))
    OR
    (channel_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM trip_channel_members tcm
      WHERE tcm.channel_id = trip_chat_messages.channel_id
      AND tcm.user_id = auth.uid()
    ))
  )
);

-- Create function to auto-create role channels
CREATE OR REPLACE FUNCTION create_default_role_channels(trip_id_param TEXT)
RETURNS void AS $$
DECLARE
  role_record RECORD;
  channel_slug TEXT;
  channel_name TEXT;
BEGIN
  -- Create channels for each unique role in the trip
  FOR role_record IN 
    SELECT DISTINCT role, department
    FROM trip_members tm
    LEFT JOIN pro_trip_roster ptr ON tm.user_id = ptr.user_id AND tm.trip_id = ptr.trip_id
    WHERE tm.trip_id = trip_id_param
    AND role IS NOT NULL
    AND role != ''
  LOOP
    -- Create slug from role
    channel_slug := lower(replace(role_record.role, ' ', '-'));
    channel_name := initcap(role_record.role);
    
    -- Insert channel if it doesn't exist
    INSERT INTO trip_channels (trip_id, name, slug, channel_type, role_filter, created_by)
    SELECT 
      trip_id_param,
      channel_name,
      channel_slug,
      'role',
      jsonb_build_object('role', role_record.role, 'department', role_record.department),
      (SELECT user_id FROM trip_members WHERE trip_id = trip_id_param AND role IN ('admin', 'organizer', 'owner') LIMIT 1)
    WHERE NOT EXISTS (
      SELECT 1 FROM trip_channels 
      WHERE trip_id = trip_id_param 
      AND slug = channel_slug
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to sync channel memberships when roster changes
CREATE OR REPLACE FUNCTION sync_channel_memberships()
RETURNS TRIGGER AS $$
DECLARE
  channel_record RECORD;
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Add user to role-based channels that match their role
    FOR channel_record IN
      SELECT tc.id, tc.role_filter
      FROM trip_channels tc
      WHERE tc.trip_id = NEW.trip_id
      AND tc.channel_type = 'role'
      AND tc.role_filter->>'role' = NEW.role
    LOOP
      -- Insert membership if it doesn't exist
      INSERT INTO trip_channel_members (channel_id, user_id, role)
      VALUES (channel_record.id, NEW.user_id, NEW.role)
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    END LOOP;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    -- Remove user from all channels in this trip
    DELETE FROM trip_channel_members tcm
    WHERE tcm.user_id = OLD.user_id
    AND tcm.channel_id IN (
      SELECT id FROM trip_channels 
      WHERE trip_id = OLD.trip_id
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync memberships when trip_members changes
CREATE TRIGGER sync_channel_memberships_trigger
  AFTER INSERT OR UPDATE OR DELETE ON trip_members
  FOR EACH ROW
  EXECUTE FUNCTION sync_channel_memberships();

-- Create function to get channel permissions for a user
CREATE OR REPLACE FUNCTION get_channel_permissions(channel_id_param UUID, user_id_param UUID)
RETURNS TABLE(
  can_read BOOLEAN,
  can_write BOOLEAN,
  can_manage BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS (
      SELECT 1 FROM trip_channel_members tcm
      WHERE tcm.channel_id = channel_id_param
      AND tcm.user_id = user_id_param
    ) as can_read,
    EXISTS (
      SELECT 1 FROM trip_channel_members tcm
      WHERE tcm.channel_id = channel_id_param
      AND tcm.user_id = user_id_param
    ) as can_write,
    EXISTS (
      SELECT 1 FROM trip_channels tc
      JOIN trip_members tm ON tm.trip_id = tc.trip_id
      WHERE tc.id = channel_id_param
      AND tm.user_id = user_id_param
      AND tm.role IN ('admin', 'organizer', 'owner')
    ) as can_manage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
