-- ============================================================================
-- SMS Delivery Architecture: queueing, reminders, and entitlement enforcement
-- ============================================================================

-- 1) Normalize notification preference shape/defaults
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS chat_messages BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS broadcasts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS calendar_events BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS payments BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS tasks BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS polls BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS join_requests BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS trip_invites BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS basecamp_updates BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quiet_start TEXT DEFAULT '22:00',
ADD COLUMN IF NOT EXISTS quiet_end TEXT DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

ALTER TABLE public.notification_preferences
ALTER COLUMN push_enabled SET DEFAULT TRUE,
ALTER COLUMN email_enabled SET DEFAULT FALSE,
ALTER COLUMN sms_enabled SET DEFAULT FALSE,
ALTER COLUMN chat_messages SET DEFAULT FALSE,
ALTER COLUMN broadcasts SET DEFAULT TRUE,
ALTER COLUMN calendar_events SET DEFAULT TRUE,
ALTER COLUMN payments SET DEFAULT TRUE,
ALTER COLUMN tasks SET DEFAULT TRUE,
ALTER COLUMN polls SET DEFAULT TRUE,
ALTER COLUMN join_requests SET DEFAULT TRUE,
ALTER COLUMN trip_invites SET DEFAULT TRUE,
ALTER COLUMN basecamp_updates SET DEFAULT TRUE,
ALTER COLUMN quiet_hours_enabled SET DEFAULT FALSE,
ALTER COLUMN quiet_start SET DEFAULT '22:00',
ALTER COLUMN quiet_end SET DEFAULT '08:00',
ALTER COLUMN timezone SET DEFAULT 'America/Los_Angeles';

-- 2) Per-notification delivery tracking
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('push', 'email', 'sms')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider_message_id TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(notification_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status_attempt
ON public.notification_deliveries(status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_recipient
ON public.notification_deliveries(recipient_user_id, created_at DESC);

-- 3) SMS compliance preference table (optional strict opt-in layer)
CREATE TABLE IF NOT EXISTS public.sms_opt_in (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL CHECK (phone_e164 ~ '^\+[1-9]\d{6,14}$'),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  opted_in BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Calendar reminders (exactly one reminder per event/user)
CREATE TABLE IF NOT EXISTS public.calendar_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.trip_events(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('3h', '1h', '15m')),
  reminder_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, recipient_user_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_reminders_due
ON public.calendar_reminders(reminder_at, sent_at)
WHERE sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_reminders_user
ON public.calendar_reminders(recipient_user_id, reminder_at DESC);

-- 5) Updated-at trigger helper for new tables
CREATE OR REPLACE FUNCTION public.set_notification_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notification_deliveries_updated_at ON public.notification_deliveries;
CREATE TRIGGER trigger_notification_deliveries_updated_at
  BEFORE UPDATE ON public.notification_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_notification_updated_at();

DROP TRIGGER IF EXISTS trigger_sms_opt_in_updated_at ON public.sms_opt_in;
CREATE TRIGGER trigger_sms_opt_in_updated_at
  BEFORE UPDATE ON public.sms_opt_in
  FOR EACH ROW
  EXECUTE FUNCTION public.set_notification_updated_at();

DROP TRIGGER IF EXISTS trigger_calendar_reminders_updated_at ON public.calendar_reminders;
CREATE TRIGGER trigger_calendar_reminders_updated_at
  BEFORE UPDATE ON public.calendar_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_notification_updated_at();

-- 6) SMS premium entitlement hard gate (server enforced)
CREATE OR REPLACE FUNCTION public.is_user_sms_entitled(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_status TEXT;
  v_period_end TIMESTAMPTZ;
  v_profile_status TEXT;
  v_profile_product TEXT;
BEGIN
  -- Super-admin / enterprise admin bypass
  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role::TEXT IN ('enterprise_admin', 'super_admin')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Primary source: user_entitlements
  SELECT plan, status, current_period_end
  INTO v_plan, v_status, v_period_end
  FROM public.user_entitlements
  WHERE user_id = p_user_id
  ORDER BY updated_at DESC
  LIMIT 1;

  IF FOUND
    AND v_status IN ('active', 'trialing')
    AND v_plan IN ('frequent-chraveler', 'pro-starter', 'pro-growth', 'pro-enterprise')
    AND (v_period_end IS NULL OR v_period_end > NOW()) THEN
    RETURN TRUE;
  END IF;

  -- Backward-compatible fallback from profile fields
  SELECT subscription_status, subscription_product_id
  INTO v_profile_status, v_profile_product
  FROM public.profiles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF FOUND
    AND v_profile_status = 'active'
    AND (
      COALESCE(v_profile_product, '') ILIKE '%frequent%'
      OR COALESCE(v_profile_product, '') ILIKE '%pro%'
      OR COALESCE(v_profile_product, '') ILIKE '%enterprise%'
    ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_sms_entitlement_on_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.sms_enabled, FALSE) = TRUE AND NOT public.is_user_sms_entitled(NEW.user_id) THEN
    NEW.sms_enabled := FALSE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_sms_entitlement ON public.notification_preferences;
CREATE TRIGGER trigger_enforce_sms_entitlement
  BEFORE INSERT OR UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_sms_entitlement_on_preferences();

-- Enforce immediately for users who lost entitlement
UPDATE public.notification_preferences
SET sms_enabled = FALSE,
    updated_at = NOW()
WHERE COALESCE(sms_enabled, FALSE) = TRUE
  AND NOT public.is_user_sms_entitled(user_id);

-- 7) Queue per-channel deliveries whenever a notification is created
CREATE OR REPLACE FUNCTION public.queue_notification_deliveries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_deliveries (
    notification_id,
    recipient_user_id,
    channel,
    status,
    next_attempt_at
  )
  VALUES
    (NEW.id, NEW.user_id, 'push', 'queued', COALESCE(NEW.created_at, NOW())),
    (NEW.id, NEW.user_id, 'email', 'queued', COALESCE(NEW.created_at, NOW())),
    (NEW.id, NEW.user_id, 'sms', 'queued', COALESCE(NEW.created_at, NOW()))
  ON CONFLICT (notification_id, channel) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_queue_notification_deliveries ON public.notifications;
CREATE TRIGGER trigger_queue_notification_deliveries
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_notification_deliveries();

-- 8) Reminder policy function
CREATE OR REPLACE FUNCTION public.compute_calendar_reminder_schedule(
  p_event_start TIMESTAMPTZ,
  p_reference TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(reminder_at TIMESTAMPTZ, reminder_type TEXT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_event_start IS NULL OR p_event_start <= p_reference THEN
    RETURN;
  END IF;

  IF (p_event_start - p_reference) >= INTERVAL '3 hours' THEN
    reminder_at := p_event_start - INTERVAL '3 hours';
    reminder_type := '3h';
  ELSIF (p_event_start - p_reference) >= INTERVAL '1 hour' THEN
    reminder_at := p_event_start - INTERVAL '1 hour';
    reminder_type := '1h';
  ELSE
    reminder_at := GREATEST(p_event_start - INTERVAL '15 minutes', p_reference);
    reminder_type := '15m';
  END IF;

  RETURN NEXT;
END;
$$;

-- 9) Keep calendar_reminders synchronized with trip_events
CREATE OR REPLACE FUNCTION public.sync_event_calendar_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_member RECORD;
BEGIN
  IF NEW.start_time IS NULL
     OR NEW.start_time <= NOW()
     OR COALESCE(NEW.include_in_itinerary, TRUE) = FALSE THEN
    DELETE FROM public.calendar_reminders
    WHERE event_id = NEW.id
      AND sent_at IS NULL;
    RETURN NEW;
  END IF;

  SELECT * INTO v_schedule
  FROM public.compute_calendar_reminder_schedule(NEW.start_time, NOW());

  IF v_schedule.reminder_at IS NULL THEN
    DELETE FROM public.calendar_reminders
    WHERE event_id = NEW.id
      AND sent_at IS NULL;
    RETURN NEW;
  END IF;

  FOR v_member IN
    SELECT user_id
    FROM public.trip_members
    WHERE trip_id = NEW.trip_id
  LOOP
    INSERT INTO public.calendar_reminders (
      event_id,
      trip_id,
      recipient_user_id,
      reminder_type,
      reminder_at
    )
    VALUES (
      NEW.id,
      NEW.trip_id,
      v_member.user_id,
      v_schedule.reminder_type,
      v_schedule.reminder_at
    )
    ON CONFLICT (event_id, recipient_user_id)
    DO UPDATE SET
      reminder_type = EXCLUDED.reminder_type,
      reminder_at = EXCLUDED.reminder_at,
      updated_at = NOW()
    WHERE public.calendar_reminders.sent_at IS NULL;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_event_calendar_reminders ON public.trip_events;
CREATE TRIGGER trigger_sync_event_calendar_reminders
  AFTER INSERT OR UPDATE OF start_time, include_in_itinerary, trip_id
  ON public.trip_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_event_calendar_reminders();

-- 10) Keep reminders in sync when members are added/removed
CREATE OR REPLACE FUNCTION public.sync_member_calendar_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_schedule RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.calendar_reminders
    WHERE trip_id = OLD.trip_id
      AND recipient_user_id = OLD.user_id
      AND sent_at IS NULL;
    RETURN OLD;
  END IF;

  FOR v_event IN
    SELECT id, trip_id, start_time, include_in_itinerary
    FROM public.trip_events
    WHERE trip_id = NEW.trip_id
      AND start_time > NOW()
      AND COALESCE(include_in_itinerary, TRUE) = TRUE
  LOOP
    SELECT * INTO v_schedule
    FROM public.compute_calendar_reminder_schedule(v_event.start_time, NOW());

    IF v_schedule.reminder_at IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.calendar_reminders (
      event_id,
      trip_id,
      recipient_user_id,
      reminder_type,
      reminder_at
    )
    VALUES (
      v_event.id,
      v_event.trip_id,
      NEW.user_id,
      v_schedule.reminder_type,
      v_schedule.reminder_at
    )
    ON CONFLICT (event_id, recipient_user_id)
    DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_member_calendar_reminders_insert ON public.trip_members;
CREATE TRIGGER trigger_sync_member_calendar_reminders_insert
  AFTER INSERT ON public.trip_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_member_calendar_reminders();

DROP TRIGGER IF EXISTS trigger_sync_member_calendar_reminders_delete ON public.trip_members;
CREATE TRIGGER trigger_sync_member_calendar_reminders_delete
  AFTER DELETE ON public.trip_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_member_calendar_reminders();

-- 11) Backfill reminders for existing future events
INSERT INTO public.calendar_reminders (
  event_id,
  trip_id,
  recipient_user_id,
  reminder_type,
  reminder_at
)
SELECT
  e.id,
  e.trip_id,
  tm.user_id,
  CASE
    WHEN (e.start_time - NOW()) >= INTERVAL '3 hours' THEN '3h'
    WHEN (e.start_time - NOW()) >= INTERVAL '1 hour' THEN '1h'
    ELSE '15m'
  END AS reminder_type,
  CASE
    WHEN (e.start_time - NOW()) >= INTERVAL '3 hours' THEN e.start_time - INTERVAL '3 hours'
    WHEN (e.start_time - NOW()) >= INTERVAL '1 hour' THEN e.start_time - INTERVAL '1 hour'
    ELSE GREATEST(e.start_time - INTERVAL '15 minutes', NOW())
  END AS reminder_at
FROM public.trip_events e
JOIN public.trip_members tm ON tm.trip_id = e.trip_id
WHERE e.start_time > NOW()
  AND COALESCE(e.include_in_itinerary, TRUE) = TRUE
ON CONFLICT (event_id, recipient_user_id) DO NOTHING;

-- 12) RLS for new tables
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_opt_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification deliveries" ON public.notification_deliveries;
CREATE POLICY "Users can view own notification deliveries"
ON public.notification_deliveries
FOR SELECT
USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage notification deliveries" ON public.notification_deliveries;
CREATE POLICY "Service role can manage notification deliveries"
ON public.notification_deliveries
FOR ALL
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can manage own sms opt in" ON public.sms_opt_in;
CREATE POLICY "Users can manage own sms opt in"
ON public.sms_opt_in
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage sms opt in" ON public.sms_opt_in;
CREATE POLICY "Service role can manage sms opt in"
ON public.sms_opt_in
FOR ALL
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can view own calendar reminders" ON public.calendar_reminders;
CREATE POLICY "Users can view own calendar reminders"
ON public.calendar_reminders
FOR SELECT
USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage calendar reminders" ON public.calendar_reminders;
CREATE POLICY "Service role can manage calendar reminders"
ON public.calendar_reminders
FOR ALL
USING (auth.role() = 'service_role');

-- 13) Schedule reminder and delivery dispatch jobs (if pg_cron + pg_net available)
DO $$
DECLARE
  v_has_cron BOOLEAN;
  v_has_http_post BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'cron' AND p.proname = 'schedule'
  ) INTO v_has_cron;

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'net' AND p.proname = 'http_post'
  ) INTO v_has_http_post;

  IF v_has_cron AND v_has_http_post THEN
    BEGIN
      PERFORM cron.unschedule('chravel-event-reminders');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    BEGIN
      PERFORM cron.unschedule('chravel-dispatch-notification-deliveries');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'chravel-event-reminders',
      '*/5 * * * *',
      $job$
      SELECT net.http_post(
        url := 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/event-reminders',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{}'::jsonb
      );
      $job$
    );

    PERFORM cron.schedule(
      'chravel-dispatch-notification-deliveries',
      '* * * * *',
      $job$
      SELECT net.http_post(
        url := 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/dispatch-notification-deliveries',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{}'::jsonb
      );
      $job$
    );
  ELSE
    RAISE NOTICE 'Skipping cron registration. Configure event-reminders and dispatch-notification-deliveries schedules manually.';
  END IF;
END;
$$;
