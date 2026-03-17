-- Enforce product scaling rule: event main-chat "everyone" is only valid for <=50 attendees.

CREATE OR REPLACE FUNCTION public.can_post_to_trip_chat(
  _user_id UUID,
  _trip_id TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH trip_ctx AS (
    SELECT
      t.id,
      t.chat_mode,
      t.trip_type,
      tm.role,
      (
        SELECT COUNT(*)
        FROM public.trip_members tm_count
        WHERE tm_count.trip_id = t.id
      ) AS attendee_count
    FROM public.trips t
    JOIN public.trip_members tm ON tm.trip_id = t.id AND tm.user_id = _user_id
    WHERE t.id = _trip_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM trip_ctx
    WHERE
      (
        -- For large events (>50), hard-stop attendee free-for-all chat
        (trip_type = 'event' AND attendee_count > 50 AND role IN ('admin', 'organizer', 'owner'))
        -- everyone mode allowed for non-event and small-event main chats
        OR (
          (trip_type IS DISTINCT FROM 'event' OR attendee_count <= 50)
          AND chat_mode = 'everyone'
        )
        -- restricted modes allow only admins
        OR (chat_mode = 'admin_only' AND role IN ('admin', 'organizer', 'owner'))
        OR (chat_mode = 'broadcasts' AND role IN ('admin', 'organizer', 'owner'))
        -- null mode (legacy/consumer trips)
        OR chat_mode IS NULL
      )
  )
$$;

COMMENT ON FUNCTION public.can_post_to_trip_chat IS
'Checks if a user is allowed to post to a trip main chat. For events with >50 attendees, attendee posting is blocked even if chat_mode is everyone; admins can still post.';

CREATE OR REPLACE FUNCTION public.enforce_event_chat_mode_size_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attendee_count INTEGER;
BEGIN
  IF NEW.trip_type = 'event' AND NEW.chat_mode = 'everyone' THEN
    SELECT COUNT(*) INTO attendee_count FROM public.trip_members WHERE trip_id = NEW.id;
    IF attendee_count > 50 THEN
      RAISE EXCEPTION 'everyone chat mode is only allowed for events with 50 attendees or fewer';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_event_chat_mode_size_limit_on_trips ON public.trips;
CREATE TRIGGER enforce_event_chat_mode_size_limit_on_trips
BEFORE INSERT OR UPDATE OF chat_mode, trip_type
ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.enforce_event_chat_mode_size_limit();
