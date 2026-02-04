-- ============================================================================
-- Notification Analytics & Logging Tables
-- ============================================================================
-- Tracks notification delivery, failures, and user interactions for analytics.
-- Used by the admin panel to monitor push notification health.
-- ============================================================================

-- ============================================================================
-- Notification Delivery Logs
-- ============================================================================
-- Logs every notification send attempt with status and error details

CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Target info
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES public.web_push_subscriptions(id) ON DELETE SET NULL,
    
    -- Notification content (for debugging)
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    
    -- Delivery status
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'expired')),
    error_code TEXT,
    error_message TEXT,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    
    -- Response from push service
    push_service_response JSONB,
    
    -- Associated entities
    trip_id UUID,
    message_id UUID,
    
    -- Request metadata
    request_id UUID DEFAULT gen_random_uuid(), -- For correlating batch sends
    platform TEXT CHECK (platform IN ('web', 'ios', 'android')),
    
    -- TTL tracking
    ttl_seconds INTEGER,
    expires_at TIMESTAMPTZ
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_user 
    ON public.notification_delivery_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_status 
    ON public.notification_delivery_logs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_created 
    ON public.notification_delivery_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_logs_request 
    ON public.notification_delivery_logs(request_id);

-- ============================================================================
-- Notification Interactions (Click tracking)
-- ============================================================================
-- Tracks when users interact with notifications

CREATE TABLE IF NOT EXISTS public.notification_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to delivery log
    delivery_log_id UUID REFERENCES public.notification_delivery_logs(id) ON DELETE CASCADE,
    
    -- User info
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Interaction type
    action TEXT NOT NULL CHECK (action IN (
        'clicked',      -- User clicked/tapped notification
        'dismissed',    -- User dismissed without clicking
        'action_click', -- User clicked an action button
        'view'          -- Notification was shown (foreground)
    )),
    action_id TEXT,     -- Which action button was clicked (e.g., 'reply', 'view')
    
    -- Context
    notification_type TEXT,
    trip_id UUID,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Device info
    platform TEXT,
    user_agent TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_interactions_user 
    ON public.notification_interactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_interactions_delivery 
    ON public.notification_interactions(delivery_log_id);

CREATE INDEX IF NOT EXISTS idx_notification_interactions_action 
    ON public.notification_interactions(action, created_at DESC);

-- ============================================================================
-- Notification Analytics Aggregates (Materialized for performance)
-- ============================================================================
-- Pre-computed daily statistics for dashboard

CREATE TABLE IF NOT EXISTS public.notification_analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Date (truncated to day)
    date DATE NOT NULL,
    
    -- Counts
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_dismissed INTEGER DEFAULT 0,
    
    -- By type
    chat_message_sent INTEGER DEFAULT 0,
    chat_message_clicked INTEGER DEFAULT 0,
    itinerary_update_sent INTEGER DEFAULT 0,
    itinerary_update_clicked INTEGER DEFAULT 0,
    payment_request_sent INTEGER DEFAULT 0,
    payment_request_clicked INTEGER DEFAULT 0,
    trip_reminder_sent INTEGER DEFAULT 0,
    trip_reminder_clicked INTEGER DEFAULT 0,
    
    -- By platform
    web_sent INTEGER DEFAULT 0,
    web_delivered INTEGER DEFAULT 0,
    ios_sent INTEGER DEFAULT 0,
    ios_delivered INTEGER DEFAULT 0,
    android_sent INTEGER DEFAULT 0,
    android_delivered INTEGER DEFAULT 0,
    
    -- Rates (computed)
    delivery_rate DECIMAL(5,2),     -- delivered / sent * 100
    click_through_rate DECIMAL(5,2), -- clicked / delivered * 100
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(date)
);

-- Index for date lookups
CREATE INDEX IF NOT EXISTS idx_notification_analytics_daily_date 
    ON public.notification_analytics_daily(date DESC);

-- ============================================================================
-- Test Notifications Table (for admin testing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_test_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who sent the test
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Target
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_trip_id UUID,
    target_type TEXT CHECK (target_type IN ('self', 'user', 'trip')),
    
    -- Notification details
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    
    -- Results
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'partial', 'failed')),
    subscriptions_targeted INTEGER DEFAULT 0,
    successful_sends INTEGER DEFAULT 0,
    failed_sends INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Index
CREATE INDEX IF NOT EXISTS idx_notification_test_log_admin 
    ON public.notification_test_log(admin_user_id, created_at DESC);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Delivery logs - admins only (via service role or super admin check)
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage delivery logs"
    ON public.notification_delivery_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Interactions - users can view their own
ALTER TABLE public.notification_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions"
    ON public.notification_interactions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage interactions"
    ON public.notification_interactions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Analytics - read-only for authenticated users
ALTER TABLE public.notification_analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view analytics"
    ON public.notification_analytics_daily
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Test log - admins can see their own tests
ALTER TABLE public.notification_test_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view own test logs"
    ON public.notification_test_log
    FOR SELECT
    USING (auth.uid() = admin_user_id);

CREATE POLICY "Admins can create test logs"
    ON public.notification_test_log
    FOR INSERT
    WITH CHECK (auth.uid() = admin_user_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Log a notification send attempt
CREATE OR REPLACE FUNCTION log_notification_send(
    p_user_id UUID,
    p_subscription_id UUID,
    p_notification_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_status TEXT,
    p_platform TEXT DEFAULT 'web',
    p_trip_id UUID DEFAULT NULL,
    p_request_id UUID DEFAULT NULL,
    p_error_code TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.notification_delivery_logs (
        user_id,
        subscription_id,
        notification_type,
        title,
        body,
        status,
        platform,
        trip_id,
        request_id,
        error_code,
        error_message,
        sent_at
    )
    VALUES (
        p_user_id,
        p_subscription_id,
        p_notification_type,
        p_title,
        p_body,
        p_status,
        p_platform,
        p_trip_id,
        COALESCE(p_request_id, gen_random_uuid()),
        p_error_code,
        p_error_message,
        CASE WHEN p_status = 'sent' THEN now() ELSE NULL END
    )
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log a notification interaction
CREATE OR REPLACE FUNCTION log_notification_interaction(
    p_user_id UUID,
    p_delivery_log_id UUID,
    p_action TEXT,
    p_action_id TEXT DEFAULT NULL,
    p_notification_type TEXT DEFAULT NULL,
    p_trip_id UUID DEFAULT NULL,
    p_platform TEXT DEFAULT 'web',
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    interaction_id UUID;
BEGIN
    INSERT INTO public.notification_interactions (
        user_id,
        delivery_log_id,
        action,
        action_id,
        notification_type,
        trip_id,
        platform,
        user_agent
    )
    VALUES (
        p_user_id,
        p_delivery_log_id,
        p_action,
        p_action_id,
        p_notification_type,
        p_trip_id,
        p_platform,
        p_user_agent
    )
    RETURNING id INTO interaction_id;
    
    RETURN interaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get notification statistics for a date range
CREATE OR REPLACE FUNCTION get_notification_stats(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_sent BIGINT,
    total_delivered BIGINT,
    total_failed BIGINT,
    total_clicked BIGINT,
    delivery_rate DECIMAL(5,2),
    click_through_rate DECIMAL(5,2),
    avg_daily_sent DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(nad.total_sent), 0)::BIGINT,
        COALESCE(SUM(nad.total_delivered), 0)::BIGINT,
        COALESCE(SUM(nad.total_failed), 0)::BIGINT,
        COALESCE(SUM(nad.total_clicked), 0)::BIGINT,
        CASE 
            WHEN SUM(nad.total_sent) > 0 
            THEN ROUND(SUM(nad.total_delivered)::DECIMAL / SUM(nad.total_sent) * 100, 2)
            ELSE 0 
        END,
        CASE 
            WHEN SUM(nad.total_delivered) > 0 
            THEN ROUND(SUM(nad.total_clicked)::DECIMAL / SUM(nad.total_delivered) * 100, 2)
            ELSE 0 
        END,
        ROUND(COALESCE(SUM(nad.total_sent), 0)::DECIMAL / GREATEST(1, p_end_date - p_start_date), 2)
    FROM public.notification_analytics_daily nad
    WHERE nad.date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aggregate daily analytics (run via cron or Edge Function)
CREATE OR REPLACE FUNCTION aggregate_notification_analytics(
    p_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day'
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.notification_analytics_daily (
        date,
        total_sent,
        total_delivered,
        total_failed,
        total_clicked,
        total_dismissed,
        web_sent,
        web_delivered,
        ios_sent,
        ios_delivered,
        android_sent,
        android_delivered,
        delivery_rate,
        click_through_rate
    )
    SELECT
        p_date,
        COUNT(*) FILTER (WHERE status IN ('sent', 'delivered')),
        COUNT(*) FILTER (WHERE status = 'delivered'),
        COUNT(*) FILTER (WHERE status = 'failed'),
        (SELECT COUNT(*) FROM notification_interactions WHERE action = 'clicked' AND created_at::DATE = p_date),
        (SELECT COUNT(*) FROM notification_interactions WHERE action = 'dismissed' AND created_at::DATE = p_date),
        COUNT(*) FILTER (WHERE platform = 'web' AND status IN ('sent', 'delivered')),
        COUNT(*) FILTER (WHERE platform = 'web' AND status = 'delivered'),
        COUNT(*) FILTER (WHERE platform = 'ios' AND status IN ('sent', 'delivered')),
        COUNT(*) FILTER (WHERE platform = 'ios' AND status = 'delivered'),
        COUNT(*) FILTER (WHERE platform = 'android' AND status IN ('sent', 'delivered')),
        COUNT(*) FILTER (WHERE platform = 'android' AND status = 'delivered'),
        CASE 
            WHEN COUNT(*) FILTER (WHERE status IN ('sent', 'delivered')) > 0 
            THEN ROUND(COUNT(*) FILTER (WHERE status = 'delivered')::DECIMAL / 
                       COUNT(*) FILTER (WHERE status IN ('sent', 'delivered')) * 100, 2)
            ELSE 0 
        END,
        CASE 
            WHEN COUNT(*) FILTER (WHERE status = 'delivered') > 0 
            THEN ROUND((SELECT COUNT(*) FROM notification_interactions WHERE action = 'clicked' AND created_at::DATE = p_date)::DECIMAL / 
                       COUNT(*) FILTER (WHERE status = 'delivered') * 100, 2)
            ELSE 0 
        END
    FROM public.notification_delivery_logs
    WHERE created_at::DATE = p_date
    ON CONFLICT (date) DO UPDATE SET
        total_sent = EXCLUDED.total_sent,
        total_delivered = EXCLUDED.total_delivered,
        total_failed = EXCLUDED.total_failed,
        total_clicked = EXCLUDED.total_clicked,
        total_dismissed = EXCLUDED.total_dismissed,
        web_sent = EXCLUDED.web_sent,
        web_delivered = EXCLUDED.web_delivered,
        ios_sent = EXCLUDED.ios_sent,
        ios_delivered = EXCLUDED.ios_delivered,
        android_sent = EXCLUDED.android_sent,
        android_delivered = EXCLUDED.android_delivered,
        delivery_rate = EXCLUDED.delivery_rate,
        click_through_rate = EXCLUDED.click_through_rate,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.notification_delivery_logs IS 
    'Logs every push notification send attempt with status, errors, and timing.';

COMMENT ON TABLE public.notification_interactions IS 
    'Tracks user interactions with notifications (clicks, dismisses, action buttons).';

COMMENT ON TABLE public.notification_analytics_daily IS 
    'Pre-aggregated daily notification statistics for dashboard performance.';

COMMENT ON TABLE public.notification_test_log IS 
    'Logs admin test notification sends for debugging.';
