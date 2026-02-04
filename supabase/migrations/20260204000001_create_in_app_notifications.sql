-- ============================================================================
-- In-App Notifications Table
-- ============================================================================
-- Stores in-app notifications as a fallback for platforms where push
-- notifications are not supported (e.g., iOS Safari).
--
-- This provides an inbox-style notification system that works everywhere.
-- ============================================================================

-- Create in_app_notifications table
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User association
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification content
    type TEXT NOT NULL CHECK (type IN (
        'chat_message',
        'itinerary_update',
        'payment_request',
        'payment_split',
        'trip_reminder',
        'trip_invite',
        'poll_vote',
        'task_assigned',
        'broadcast',
        'mention'
    )),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon TEXT,
    
    -- Associated data for routing
    data JSONB DEFAULT '{}'::jsonb,
    
    -- Read status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id 
    ON public.in_app_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_unread 
    ON public.in_app_notifications(user_id, is_read, created_at DESC) 
    WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created 
    ON public.in_app_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.in_app_notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
    ON public.in_app_notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON public.in_app_notifications
    FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can insert notifications (for Edge Functions)
-- Note: Service role bypasses RLS by default

-- ============================================================================
-- Notification Preferences Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Push notifications
    push_enabled BOOLEAN DEFAULT true,
    
    -- Email notifications  
    email_enabled BOOLEAN DEFAULT true,
    
    -- SMS notifications
    sms_enabled BOOLEAN DEFAULT false,
    sms_phone TEXT,
    
    -- In-app notifications (always enabled)
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Notification types
    trip_updates BOOLEAN DEFAULT true,
    chat_messages BOOLEAN DEFAULT true,
    calendar_reminders BOOLEAN DEFAULT true,
    payment_alerts BOOLEAN DEFAULT true,
    mentions BOOLEAN DEFAULT true,
    broadcasts BOOLEAN DEFAULT true,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_start TIME DEFAULT '22:00',
    quiet_end TIME DEFAULT '08:00',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user 
    ON public.notification_preferences(user_id);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
    ON public.notification_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own preferences
CREATE POLICY "Users can create own preferences"
    ON public.notification_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
    ON public.notification_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notification_preferences_updated_at 
    ON public.notification_preferences;

CREATE TRIGGER trigger_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to create an in-app notification
CREATE OR REPLACE FUNCTION create_in_app_notification(
    target_user_id UUID,
    notification_type TEXT,
    notification_title TEXT,
    notification_body TEXT,
    notification_data JSONB DEFAULT '{}'::jsonb,
    notification_icon TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.in_app_notifications (
        user_id,
        type,
        title,
        body,
        data,
        icon
    )
    VALUES (
        target_user_id,
        notification_type,
        notification_title,
        notification_body,
        notification_data,
        notification_icon
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notifications for multiple users
CREATE OR REPLACE FUNCTION create_bulk_in_app_notifications(
    target_user_ids UUID[],
    notification_type TEXT,
    notification_title TEXT,
    notification_body TEXT,
    notification_data JSONB DEFAULT '{}'::jsonb,
    notification_icon TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    inserted_count INTEGER;
BEGIN
    INSERT INTO public.in_app_notifications (
        user_id,
        type,
        title,
        body,
        data,
        icon
    )
    SELECT 
        unnest(target_user_ids),
        notification_type,
        notification_title,
        notification_body,
        notification_data,
        notification_icon;
    
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(target_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.in_app_notifications
        WHERE user_id = target_user_id
          AND is_read = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read for a trip
CREATE OR REPLACE FUNCTION mark_trip_notifications_read(
    target_user_id UUID,
    target_trip_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.in_app_notifications
    SET is_read = true, read_at = now()
    WHERE user_id = target_user_id
      AND is_read = false
      AND data->>'tripId' = target_trip_id::TEXT;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Auto-cleanup: Delete old read notifications (older than 30 days)
-- ============================================================================

-- This would typically be run as a scheduled job (cron)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.in_app_notifications
    WHERE is_read = true
      AND read_at < now() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Enable Realtime
-- ============================================================================

-- Enable realtime for in_app_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.in_app_notifications IS 
    'In-app notifications for the notification center. Works as a fallback when push notifications are not available.';

COMMENT ON TABLE public.notification_preferences IS 
    'User notification preferences including push, email, SMS settings and quiet hours.';
