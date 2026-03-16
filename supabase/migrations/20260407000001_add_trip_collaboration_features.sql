-- Migration: Add Trip Collaboration Features
-- Date: 2025-01-XX
-- Description: Adds trip_presence table and permissions column to trip_members for enhanced collaboration

-- ============================================
-- 1. Add permissions column to trip_members
-- ============================================
-- Stores granular permissions as JSONB for each member
-- Format: { "permission_name": "level" } where level is 'none' | 'view' | 'edit' | 'admin'
ALTER TABLE trip_members
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;

-- Add comment explaining permissions structure
COMMENT ON COLUMN trip_members.permissions IS 'Granular permissions for trip members. JSONB object with permission names as keys and levels (none/view/edit/admin) as values. Example: {"edit_calendar": "edit", "manage_members": "admin"}';

-- ============================================
-- 2. Create trip_presence table
-- ============================================
-- Tracks real-time presence of users viewing/editing trips
CREATE TABLE IF NOT EXISTS trip_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_page TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one presence record per user per trip
    UNIQUE(trip_id, user_id)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_trip_presence_trip_id ON trip_presence(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_presence_user_id ON trip_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_presence_active ON trip_presence(trip_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trip_presence_last_seen ON trip_presence(last_seen);

-- Add comments
COMMENT ON TABLE trip_presence IS 'Tracks real-time presence of users viewing/editing trips. Used for "who is viewing" indicators.';
COMMENT ON COLUMN trip_presence.current_page IS 'Current page/view the user is on (e.g., "calendar", "payments", "media")';
COMMENT ON COLUMN trip_presence.is_active IS 'Whether the user is currently active. Stale entries (last_seen > 5 min) should be marked inactive.';

-- ============================================
-- 3. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE trip_presence ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view presence for trips they are members of
CREATE POLICY "Users can view presence for their trips"
    ON trip_presence
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM trip_members
            WHERE trip_members.trip_id = trip_presence.trip_id
            AND trip_members.user_id = auth.uid()
        )
    );

-- Policy: Users can insert/update their own presence
CREATE POLICY "Users can manage their own presence"
    ON trip_presence
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- 4. Create function to clean up stale presence
-- ============================================
-- Automatically marks presence as inactive if last_seen > 5 minutes
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE trip_presence
    SET is_active = false, updated_at = NOW()
    WHERE is_active = true
    AND last_seen < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Add comment
COMMENT ON FUNCTION cleanup_stale_presence() IS 'Marks presence records as inactive if last_seen is older than 5 minutes. Should be called periodically (e.g., via cron job).';

-- ============================================
-- 5. Create function to get active users for a trip
-- ============================================
CREATE OR REPLACE FUNCTION get_active_trip_users(p_trip_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    last_seen TIMESTAMPTZ,
    current_page TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tp.user_id,
        p.display_name,
        p.avatar_url,
        tp.last_seen,
        tp.current_page
    FROM trip_presence tp
    JOIN profiles p ON p.id = tp.user_id
    WHERE tp.trip_id = p_trip_id
    AND tp.is_active = true
    AND tp.last_seen > NOW() - INTERVAL '5 minutes'
    ORDER BY tp.last_seen DESC;
END;
$$;

COMMENT ON FUNCTION get_active_trip_users(UUID) IS 'Returns active users for a trip (active within last 5 minutes).';

-- ============================================
-- 6. Add trigger to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_trip_presence_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trip_presence_updated_at
    BEFORE UPDATE ON trip_presence
    FOR EACH ROW
    EXECUTE FUNCTION update_trip_presence_updated_at();

-- ============================================
-- 7. Grant necessary permissions
-- ============================================
-- Allow authenticated users to insert/update their presence
GRANT SELECT, INSERT, UPDATE ON trip_presence TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_trip_users(UUID) TO authenticated;
