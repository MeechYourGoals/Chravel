-- ============================================================================
-- Web Push Subscriptions Table
-- ============================================================================
-- Stores Web Push API subscription objects for browser push notifications.
-- These are separate from FCM/APNs tokens and follow the Web Push Protocol.
--
-- Web Push subscriptions contain:
-- - endpoint: The push service URL
-- - keys: ECDH public key and auth secret for message encryption
--
-- @see https://web.dev/push-notifications-subscribing-a-user/
-- ============================================================================

-- Create web_push_subscriptions table
CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User association
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Web Push subscription data
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,  -- Public key for message encryption (base64url)
    auth_key TEXT NOT NULL,     -- Auth secret for message authentication (base64url)
    
    -- Metadata
    user_agent TEXT,            -- Browser/device info for debugging
    device_name TEXT,           -- User-friendly device name
    
    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT now(),
    failed_count INTEGER DEFAULT 0,  -- Count of failed delivery attempts
    last_error TEXT,                  -- Last error message for debugging
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Unique constraint: one subscription per endpoint per user
    CONSTRAINT unique_user_endpoint UNIQUE (user_id, endpoint)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user_id 
    ON public.web_push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user_active 
    ON public.web_push_subscriptions(user_id, is_active) 
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_endpoint 
    ON public.web_push_subscriptions(endpoint);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_web_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_web_push_subscriptions_updated_at 
    ON public.web_push_subscriptions;

CREATE TRIGGER trigger_web_push_subscriptions_updated_at
    BEFORE UPDATE ON public.web_push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_web_push_subscriptions_updated_at();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
    ON public.web_push_subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own subscriptions
CREATE POLICY "Users can create own subscriptions"
    ON public.web_push_subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
    ON public.web_push_subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
    ON public.web_push_subscriptions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can access all subscriptions (for Edge Functions)
-- Note: Service role bypasses RLS by default

-- ============================================================================
-- Notification Types Enum (for reference in notification_queue)
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
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
        );
    END IF;
END $$;

-- ============================================================================
-- Notification Queue Table (for scheduled/deferred notifications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification content
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon TEXT,
    badge TEXT,
    image TEXT,
    
    -- Action data
    data JSONB DEFAULT '{}'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,  -- Array of {action, title, icon}
    
    -- Associated entities
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
    message_id UUID,
    event_id UUID,
    payment_id UUID,
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for notification queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_pending 
    ON public.notification_queue(user_id, status, scheduled_for) 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled 
    ON public.notification_queue(scheduled_for) 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_queue_trip 
    ON public.notification_queue(trip_id) 
    WHERE trip_id IS NOT NULL;

-- Enable RLS on notification_queue
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own notification queue
CREATE POLICY "Users can view own notifications"
    ON public.notification_queue
    FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get active web push subscriptions for a user
CREATE OR REPLACE FUNCTION get_user_web_push_subscriptions(target_user_id UUID)
RETURNS TABLE (
    id UUID,
    endpoint TEXT,
    p256dh_key TEXT,
    auth_key TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wps.id,
        wps.endpoint,
        wps.p256dh_key,
        wps.auth_key
    FROM public.web_push_subscriptions wps
    WHERE wps.user_id = target_user_id
      AND wps.is_active = true
      AND wps.failed_count < 3;  -- Skip subscriptions that have failed too many times
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active subscriptions for multiple users (e.g., trip members)
CREATE OR REPLACE FUNCTION get_users_web_push_subscriptions(target_user_ids UUID[])
RETURNS TABLE (
    id UUID,
    user_id UUID,
    endpoint TEXT,
    p256dh_key TEXT,
    auth_key TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wps.id,
        wps.user_id,
        wps.endpoint,
        wps.p256dh_key,
        wps.auth_key
    FROM public.web_push_subscriptions wps
    WHERE wps.user_id = ANY(target_user_ids)
      AND wps.is_active = true
      AND wps.failed_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark subscription as failed
CREATE OR REPLACE FUNCTION mark_web_push_subscription_failed(
    subscription_id UUID,
    error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE public.web_push_subscriptions
    SET 
        failed_count = failed_count + 1,
        last_error = error_message,
        is_active = CASE WHEN failed_count >= 2 THEN false ELSE is_active END
    WHERE id = subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record successful push
CREATE OR REPLACE FUNCTION mark_web_push_subscription_success(subscription_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.web_push_subscriptions
    SET 
        last_used_at = now(),
        failed_count = 0,
        last_error = NULL
    WHERE id = subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.web_push_subscriptions IS 
    'Stores Web Push API subscription objects for browser push notifications. Each subscription represents a browser/device that can receive push messages.';

COMMENT ON COLUMN public.web_push_subscriptions.endpoint IS 
    'The push service URL that accepts encrypted push messages';

COMMENT ON COLUMN public.web_push_subscriptions.p256dh_key IS 
    'Base64url-encoded P-256 ECDH public key for message encryption';

COMMENT ON COLUMN public.web_push_subscriptions.auth_key IS 
    'Base64url-encoded authentication secret for message authentication';

COMMENT ON COLUMN public.web_push_subscriptions.failed_count IS 
    'Number of consecutive failed delivery attempts. Subscription is deactivated after 3 failures.';

COMMENT ON TABLE public.notification_queue IS 
    'Queue for scheduled and pending push notifications. Used for deferred delivery and trip reminders.';
