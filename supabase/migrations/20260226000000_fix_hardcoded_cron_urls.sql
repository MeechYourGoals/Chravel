-- ============================================================================
-- Fix Hardcoded Supabase Project URL in Cron Jobs
-- This migration ensures that cron jobs use a dynamic project reference
-- rather than a hardcoded one, facilitating multi-environment deployments.
-- ============================================================================

DO $$
DECLARE
  -- Attempt to get the project reference from database settings
  -- This can be set via: ALTER DATABASE postgres SET "app.settings.supabase_project_ref" = 'your-project-ref';
  v_project_ref TEXT := current_setting('app.settings.supabase_project_ref', true);
  v_dispatch_secret TEXT := current_setting('app.settings.notification_dispatch_secret', true);
  v_has_cron BOOLEAN;
  v_has_http_post BOOLEAN;
BEGIN
  -- Check if required extensions are available
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'cron' AND p.proname = 'schedule'
  ) INTO v_has_cron;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'net' AND p.proname = 'http_post'
  ) INTO v_has_http_post;

  IF v_has_cron AND v_has_http_post THEN
    -- If project_ref is not set, we'll try to use the one from the most recent refinement
    -- but we warn that it should be set properly.
    IF v_project_ref IS NULL OR v_project_ref = '' THEN
      v_project_ref := 'jmjiyekmxwsxkfnqwyaa'; -- Current known project ref as fallback
      RAISE WARNING 'app.settings.supabase_project_ref is not set. Falling back to default: %', v_project_ref;
    END IF;

    -- Unschedule existing jobs to ensure we apply the latest configuration
    BEGIN
      PERFORM cron.unschedule('chravel-event-reminders');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      PERFORM cron.unschedule('chravel-dispatch-notification-deliveries');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Schedule Event Reminders (every 5 minutes)
    PERFORM cron.schedule(
      'chravel-event-reminders',
      '*/5 * * * *',
      format($job$
      SELECT net.http_post(
        url := 'https://%s.supabase.co/functions/v1/event-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', format('Bearer %s', current_setting('app.settings.service_role_key', true))
        ),
        body := '{}'::jsonb
      );
      $job$, v_project_ref)
    );

    -- Schedule Notification Dispatch (every minute)
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
      $job$, v_project_ref, COALESCE(v_dispatch_secret, ''))
    );

    RAISE NOTICE 'Cron jobs successfully rescheduled with project_ref: %', v_project_ref;
  ELSE
    RAISE NOTICE 'Skipping cron registration: pg_cron or pg_net extensions not found.';
  END IF;
END $$;
