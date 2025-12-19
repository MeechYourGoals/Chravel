-- ============================================================================
-- Trip chat: system-generated membership activity messages
-- Goal: Persist + broadcast system messages when a user joins a trip (and optionally when the trip is created / user leaves)
--
-- Contract:
-- - trip_chat_messages.message_type = 'system'
-- - content = "<DisplayName> joined the trip" (or "created the trip")
-- - user_id = NULL (system sender)
-- - attachments = []
-- - Must flow through existing Realtime INSERT subscriptions
-- - Must be idempotent for "joined/created" events (no duplicates on retries)
-- ============================================================================

-- 1) Add columns to support idempotency and future system event types
ALTER TABLE public.trip_chat_messages
  ADD COLUMN IF NOT EXISTS system_event text,
  ADD COLUMN IF NOT EXISTS system_subject_user_id uuid;

COMMENT ON COLUMN public.trip_chat_messages.system_event IS 'System message event key (e.g. member_joined, trip_created, member_left). Used for idempotency + analytics.';
COMMENT ON COLUMN public.trip_chat_messages.system_subject_user_id IS 'The user this system message is about (e.g. member who joined/left).';

-- 2) Enforce idempotency for join/created events (one per user per trip)
--    NOTE: We intentionally do NOT include member_left here so repeated leave/join cycles can still be represented.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tcm_unique_system_membership_events
  ON public.trip_chat_messages (trip_id, system_event, system_subject_user_id)
  WHERE message_type = 'system'
    AND system_subject_user_id IS NOT NULL
    AND system_event IN ('member_joined', 'trip_created');

-- 3) Trigger: on membership INSERT -> create a system message
CREATE OR REPLACE FUNCTION public.create_trip_membership_system_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_trip_creator_id uuid;
  v_event text;
  v_content text;
BEGIN
  -- Resolve display name (fall back safely)
  SELECT COALESCE(
    NULLIF(p.display_name, ''),
    NULLIF(BTRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
    NULLIF(p.email, ''),
    'Someone'
  )
  INTO v_display_name
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id
  LIMIT 1;

  -- Determine whether this membership corresponds to trip creation
  SELECT t.created_by
  INTO v_trip_creator_id
  FROM public.trips t
  WHERE t.id = NEW.trip_id
  LIMIT 1;

  IF v_trip_creator_id IS NOT NULL AND NEW.user_id = v_trip_creator_id THEN
    v_event := 'trip_created';
    v_content := v_display_name || ' created the trip';
  ELSE
    v_event := 'member_joined';
    v_content := v_display_name || ' joined the trip';
  END IF;

  -- Insert system message (idempotent via unique index; safe for retries)
  INSERT INTO public.trip_chat_messages (
    trip_id,
    content,
    author_name,
    user_id,
    message_type,
    attachments,
    is_deleted,
    is_edited,
    system_event,
    system_subject_user_id
  ) VALUES (
    NEW.trip_id,
    v_content,
    'System',
    NULL,
    'system',
    '[]'::jsonb,
    FALSE,
    FALSE,
    v_event,
    NEW.user_id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_trip_membership_system_message_insert ON public.trip_members;
CREATE TRIGGER trigger_trip_membership_system_message_insert
AFTER INSERT ON public.trip_members
FOR EACH ROW
EXECUTE FUNCTION public.create_trip_membership_system_message();

COMMENT ON FUNCTION public.create_trip_membership_system_message() IS 'Creates a system chat message when a user becomes a trip member (joined/created).';

-- 4) OPTIONAL (intentionally not enabled here):
-- "left the trip" messages on membership removal.
--
-- We are NOT enabling a DELETE trigger by default because there are legitimate
-- bulk-deletion flows (e.g. deleting old archived trips) that remove memberships
-- and would unintentionally spam system messages right before teardown.

-- 5) Avoid push notifications for system messages (they should still appear in chat via realtime)
-- Existing notification trigger may send on any trip_chat_messages insert; we exclude message_type='system'.
DROP TRIGGER IF EXISTS trigger_notify_chat_message ON public.trip_chat_messages;
CREATE TRIGGER trigger_notify_chat_message
AFTER INSERT ON public.trip_chat_messages
FOR EACH ROW
WHEN (
  (NEW.is_deleted = FALSE OR NEW.is_deleted IS NULL)
  AND (NEW.message_type IS DISTINCT FROM 'system')
)
EXECUTE FUNCTION public.notify_on_chat_message();

