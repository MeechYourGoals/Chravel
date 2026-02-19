-- Adds atomic-ish batch voting entrypoint for multi-select polls to reduce client roundtrips.
-- This wraps existing vote_on_poll logic so constraints/version checks remain centralized.

CREATE OR REPLACE FUNCTION public.vote_on_poll_batch(
  p_poll_id uuid,
  p_option_ids text[],
  p_user_id uuid,
  p_current_version integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_option_id text;
BEGIN
  IF p_option_ids IS NULL OR array_length(p_option_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one option must be selected';
  END IF;

  FOREACH v_option_id IN ARRAY p_option_ids LOOP
    PERFORM public.vote_on_poll(
      p_poll_id := p_poll_id,
      p_option_id := v_option_id,
      p_user_id := p_user_id,
      p_current_version := p_current_version
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vote_on_poll_batch(uuid, text[], uuid, integer) TO authenticated;
