-- Identity Snapshot Strategy: store sender display name at message creation time
-- so names survive account deletion and are stable across name changes.

-- 1. Add snapshot columns to trip_chat_messages
ALTER TABLE public.trip_chat_messages
  ADD COLUMN IF NOT EXISTS sender_display_name TEXT,
  ADD COLUMN IF NOT EXISTS sender_avatar_url TEXT;

-- 2. Backfill sender_display_name from profiles for existing messages
-- Uses author_name as final fallback (already stored at send time).
UPDATE public.trip_chat_messages m
SET sender_display_name = COALESCE(
  p.display_name,
  TRIM(CONCAT_WS(' ', p.first_name, p.last_name)),
  m.author_name
),
sender_avatar_url = p.avatar_url
FROM public.profiles p
WHERE m.user_id = p.user_id
  AND m.sender_display_name IS NULL;

-- For messages whose user no longer has a profile, copy author_name
UPDATE public.trip_chat_messages
SET sender_display_name = author_name
WHERE sender_display_name IS NULL AND author_name IS NOT NULL;

-- 3. Display name change tracking on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS display_name_change_count INT DEFAULT 0;

-- 4. Update profiles_public view to include first_name / last_name
-- (already included per migration 20251230220000, this is a safety re-create)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  p.id,
  p.user_id,
  p.display_name,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.bio,
  p.created_at,
  p.updated_at
FROM public.profiles p;

GRANT SELECT ON public.profiles_public TO authenticated;

-- 5. Rate-limit trigger: max 2 display_name changes per 30 days
CREATE OR REPLACE FUNCTION public.enforce_display_name_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only act when display_name actually changed
  IF OLD.display_name IS DISTINCT FROM NEW.display_name THEN
    -- Check if last change was within 30 days and count >= 2
    IF OLD.display_name_change_count >= 2
       AND OLD.display_name_updated_at IS NOT NULL
       AND OLD.display_name_updated_at > NOW() - INTERVAL '30 days' THEN
      RAISE EXCEPTION 'Display name can only be changed twice every 30 days.';
    END IF;

    -- Reset counter if window has passed
    IF OLD.display_name_updated_at IS NULL
       OR OLD.display_name_updated_at <= NOW() - INTERVAL '30 days' THEN
      NEW.display_name_change_count := 1;
    ELSE
      NEW.display_name_change_count := COALESCE(OLD.display_name_change_count, 0) + 1;
    END IF;

    NEW.display_name_updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_display_name_rate_limit ON public.profiles;
CREATE TRIGGER trg_display_name_rate_limit
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_display_name_rate_limit();
