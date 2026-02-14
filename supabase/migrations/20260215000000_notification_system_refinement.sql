-- ============================================================================
-- Notification System Refinement: Enums, Security, and Observability
-- ============================================================================

-- 1) Create DB-level Enum types for better data integrity
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        CREATE TYPE public.notification_channel AS ENUM ('push', 'email', 'sms');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_delivery_status') THEN
        CREATE TYPE public.notification_delivery_status AS ENUM ('queued', 'sent', 'failed', 'skipped');
    END IF;
END $$;

-- 2) Update notification_deliveries table to use Enums
ALTER TABLE public.notification_deliveries
DROP CONSTRAINT IF EXISTS notification_deliveries_channel_check,
DROP CONSTRAINT IF EXISTS notification_deliveries_status_check;

-- Convert columns to use the new ENUM types
-- Note: This assumes existing data matches the enum values
ALTER TABLE public.notification_deliveries
ALTER COLUMN channel TYPE public.notification_channel USING channel::public.notification_channel,
ALTER COLUMN status TYPE public.notification_delivery_status USING status::public.notification_delivery_status;

-- 3) Update notifications table to use notification_type enum if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type' AND data_type = 'text') THEN

        -- Attempt to convert type to enum, falling back to 'broadcast' for unknown types
        -- This is safer than a direct cast if there's non-conforming data
        ALTER TABLE public.notifications
        ALTER COLUMN type TYPE public.notification_type
        USING (
            CASE
                WHEN type IN ('chat_message', 'itinerary_update', 'payment_request', 'payment_split', 'trip_reminder', 'trip_invite', 'poll_vote', 'task_assigned', 'broadcast', 'mention')
                THEN type::public.notification_type
                ELSE 'broadcast'::public.notification_type
            END
        );
    END IF;
END $$;

-- 4) Harden Dispatcher Security and Dynamic URLs in Cron Jobs
-- We use a variable for the project reference to make it easier to change.
-- For production, set 'app.settings.supabase_project_ref' and 'app.settings.notification_dispatch_secret'
-- using ALTER DATABASE postgres SET "app.settings.supabase_project_ref" = 'your-project-ref';
DO $$
DECLARE
  v_project_ref TEXT := COALESCE(
    current_setting('app.settings.supabase_project_ref', true),
    'jmjiyekmxwsxkfnqwyaa'
  );
  v_has_cron BOOLEAN;
  v_has_http_post BOOLEAN;
  v_dispatch_secret TEXT := COALESCE(current_setting('app.settings.notification_dispatch_secret', true), '');
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'cron' AND p.proname = 'schedule'
  ) INTO v_has_cron;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'net' AND p.proname = 'http_post'
  ) INTO v_has_http_post;

  IF v_has_cron AND v_has_http_post THEN
    -- Unschedule existing jobs safely
    BEGIN
      PERFORM cron.unschedule('chravel-event-reminders');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      PERFORM cron.unschedule('chravel-dispatch-notification-deliveries');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Reschedule with security headers and project-specific URLs
    PERFORM cron.schedule(
      'chravel-event-reminders',
      '*/5 * * * *',
      format($job$
      SELECT net.http_post(
        url := 'https://%s.supabase.co/functions/v1/event-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-notification-secret', %L
        ),
        body := '{}'::jsonb
      );
      $job$, v_project_ref, v_dispatch_secret)
    );

    PERFORM cron.schedule(
      'chravel-dispatch-notification-deliveries',
      '* * * * *',
      format($job$
      SELECT net.http_post(
        url := 'https://%s.supabase.co/functions/v1/dispatch-notification-deliveries',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-notification-secret', %L
        ),
        body := '{}'::jsonb
      );
      $job$, v_project_ref, v_dispatch_secret)
    );
  END IF;
END $$;

-- 5) Richer observability dashboards/queries for failed deliveries
CREATE OR REPLACE VIEW public.notification_delivery_stats AS
SELECT
  channel,
  status,
  count(*) as delivery_count,
  min(created_at) as first_delivery_at,
  max(created_at) as last_delivery_at,
  round(avg(attempts), 2) as avg_attempts
FROM public.notification_deliveries
GROUP BY channel, status;

CREATE OR REPLACE VIEW public.failed_deliveries_summary AS
SELECT
  nd.id as delivery_id,
  nd.notification_id,
  nd.recipient_user_id,
  u.email as recipient_email,
  nd.channel,
  nd.error,
  nd.attempts,
  nd.next_attempt_at,
  nd.updated_at as last_attempt_at,
  n.title,
  n.type as notification_type
FROM public.notification_deliveries nd
JOIN public.notifications n ON n.id = nd.notification_id
JOIN auth.users u ON u.id = nd.recipient_user_id
WHERE nd.status = 'failed'
ORDER BY nd.updated_at DESC;

-- 6) Helper Functions for Testing
-- These are used by the smoke test script to verify the pipeline.

CREATE OR REPLACE FUNCTION public.get_first_user_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users LIMIT 1;
$$;

-- Function for a quick smoke test of the notification pipeline
CREATE OR REPLACE FUNCTION public.smoke_test_notification(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notif_id UUID;
BEGIN
  -- 1. Create a test notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    metadata
  )
  VALUES (
    p_user_id,
    'Smoke Test Notification',
    'If you see this and delivery rows exist, the pipeline is working.',
    'broadcast',
    jsonb_build_object('is_smoke_test', true)
  )
  RETURNING id INTO v_notif_id;

  -- The trigger trigger_queue_notification_deliveries should have created
  -- rows in notification_deliveries automatically.

  RETURN v_notif_id;
END;
$$;
