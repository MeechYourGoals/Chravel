-- Stage B: Shared Mutation Surface Hardening
-- B2: Poll option freeze after first vote
-- B3: Unified activity log with triggers
-- B4: AI confirmation pending buffer

-- ============================================================
-- B2: Poll option freeze — prevent option modification after voting begins
-- ============================================================

ALTER TABLE trip_polls ADD COLUMN IF NOT EXISTS options_locked_at TIMESTAMPTZ DEFAULT NULL;

-- Trigger: automatically lock options when first vote arrives
CREATE OR REPLACE FUNCTION public.lock_poll_options_on_vote()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_votes > 0 AND OLD.total_votes = 0 AND OLD.options_locked_at IS NULL THEN
    NEW.options_locked_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_poll_options ON trip_polls;
CREATE TRIGGER trg_lock_poll_options
  BEFORE UPDATE ON trip_polls
  FOR EACH ROW
  WHEN (OLD.total_votes = 0 AND NEW.total_votes > 0)
  EXECUTE FUNCTION public.lock_poll_options_on_vote();

-- ============================================================
-- B3: Unified activity log
-- ============================================================

CREATE TABLE IF NOT EXISTS trip_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID,
  action TEXT NOT NULL,         -- 'create', 'update', 'delete', 'vote', 'set', 'clear'
  object_type TEXT NOT NULL,    -- 'task', 'poll', 'calendar_event', 'basecamp', 'link'
  object_id TEXT,               -- UUID of affected row (nullable for basecamp)
  source_type TEXT DEFAULT 'manual',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_trip ON trip_activity_log(trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_object ON trip_activity_log(object_type, object_id);

ALTER TABLE trip_activity_log ENABLE ROW LEVEL SECURITY;

-- Trip members can read activity for their trips
DO $$ BEGIN
  CREATE POLICY "Trip members can view activity"
    ON trip_activity_log FOR SELECT
    USING (public.is_trip_member(trip_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow inserts from triggers (SECURITY DEFINER functions) and authenticated users
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert activity"
    ON trip_activity_log FOR INSERT
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Task activity trigger
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO trip_activity_log(trip_id, user_id, action, object_type, object_id, source_type)
    VALUES (
      NEW.trip_id,
      CASE WHEN NEW.creator_id ~ '^[0-9a-f]{8}-' THEN NEW.creator_id::uuid ELSE NULL END,
      'create',
      'task',
      NEW.id::text,
      COALESCE(NEW.source_type, 'manual')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO trip_activity_log(trip_id, user_id, action, object_type, object_id, metadata)
    VALUES (
      NEW.trip_id,
      auth.uid(),
      'update',
      'task',
      NEW.id::text,
      jsonb_build_object('version', NEW.version)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO trip_activity_log(trip_id, user_id, action, object_type, object_id)
    VALUES (OLD.trip_id, auth.uid(), 'delete', 'task', OLD.id::text);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_task_activity ON trip_tasks;
CREATE TRIGGER trg_task_activity
  AFTER INSERT OR UPDATE OR DELETE ON trip_tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();

-- Poll activity trigger
CREATE OR REPLACE FUNCTION public.log_poll_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO trip_activity_log(trip_id, user_id, action, object_type, object_id, source_type)
    VALUES (
      NEW.trip_id,
      CASE WHEN NEW.created_by ~ '^[0-9a-f]{8}-' THEN NEW.created_by::uuid ELSE NULL END,
      'create',
      'poll',
      NEW.id::text,
      COALESCE(NEW.source_type, 'manual')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log status changes and votes, not every field change
    IF OLD.status != NEW.status OR OLD.total_votes != NEW.total_votes THEN
      INSERT INTO trip_activity_log(trip_id, user_id, action, object_type, object_id, metadata)
      VALUES (
        NEW.trip_id,
        auth.uid(),
        CASE
          WHEN OLD.status != NEW.status THEN 'update'
          WHEN OLD.total_votes != NEW.total_votes THEN 'vote'
          ELSE 'update'
        END,
        'poll',
        NEW.id::text,
        jsonb_build_object('status', NEW.status, 'total_votes', NEW.total_votes)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO trip_activity_log(trip_id, user_id, action, object_type, object_id)
    VALUES (OLD.trip_id, auth.uid(), 'delete', 'poll', OLD.id::text);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_poll_activity ON trip_polls;
CREATE TRIGGER trg_poll_activity
  AFTER INSERT OR UPDATE OR DELETE ON trip_polls
  FOR EACH ROW EXECUTE FUNCTION public.log_poll_activity();

-- Calendar event activity trigger
CREATE OR REPLACE FUNCTION public.log_event_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO trip_activity_log(trip_id, user_id, action, object_type, object_id, source_type)
    VALUES (
      NEW.trip_id,
      CASE WHEN NEW.created_by ~ '^[0-9a-f]{8}-' THEN NEW.created_by::uuid ELSE NULL END,
      'create',
      'calendar_event',
      NEW.id::text,
      COALESCE(NEW.source_type, 'manual')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO trip_activity_log(trip_id, user_id, action, object_type, object_id, metadata)
    VALUES (
      NEW.trip_id,
      auth.uid(),
      'update',
      'calendar_event',
      NEW.id::text,
      jsonb_build_object('version', NEW.version)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO trip_activity_log(trip_id, user_id, action, object_type, object_id)
    VALUES (OLD.trip_id, auth.uid(), 'delete', 'calendar_event', OLD.id::text);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_event_activity ON trip_events;
CREATE TRIGGER trg_event_activity
  AFTER INSERT OR UPDATE OR DELETE ON trip_events
  FOR EACH ROW EXECUTE FUNCTION public.log_event_activity();

-- Link activity trigger
CREATE OR REPLACE FUNCTION public.log_link_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO trip_activity_log(trip_id, user_id, action, object_type, object_id)
    VALUES (
      NEW.trip_id,
      CASE WHEN NEW.added_by ~ '^[0-9a-f]{8}-' THEN NEW.added_by::uuid ELSE NULL END,
      'create',
      'link',
      NEW.id::text
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO trip_activity_log(trip_id, user_id, action, object_type, object_id)
    VALUES (OLD.trip_id, auth.uid(), 'delete', 'link', OLD.id::text);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_link_activity ON trip_links;
CREATE TRIGGER trg_link_activity
  AFTER INSERT OR DELETE ON trip_links
  FOR EACH ROW EXECUTE FUNCTION public.log_link_activity();

-- ============================================================
-- B4: AI confirmation pending buffer
-- ============================================================

CREATE TABLE IF NOT EXISTS trip_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tool_name TEXT NOT NULL,
  tool_call_id TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  source_type TEXT DEFAULT 'ai_concierge',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

-- Idempotency: prevent duplicate pending actions for the same tool call
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_tool_call
  ON trip_pending_actions(trip_id, tool_call_id) WHERE tool_call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pending_trip_status
  ON trip_pending_actions(trip_id, status);

ALTER TABLE trip_pending_actions ENABLE ROW LEVEL SECURITY;

-- Trip members can view pending actions for their trips
DO $$ BEGIN
  CREATE POLICY "Trip members can view pending actions"
    ON trip_pending_actions FOR SELECT
    USING (public.is_trip_member(trip_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The user who initiated the action (or any trip member) can manage it
DO $$ BEGIN
  CREATE POLICY "Trip members can manage pending actions"
    ON trip_pending_actions FOR ALL
    USING (public.is_trip_member(trip_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
