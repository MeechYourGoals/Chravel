-- Drop existing vote_on_poll function and recreate with proper handling
DROP FUNCTION IF EXISTS public.vote_on_poll(uuid, text, uuid, integer);

-- Recreate vote_on_poll function
CREATE OR REPLACE FUNCTION public.vote_on_poll(
  p_poll_id uuid,
  p_option_id text,
  p_user_id uuid,
  p_current_version integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_poll_data RECORD;
  v_options jsonb;
  v_option_found boolean := false;
  v_i integer;
  v_option jsonb;
  v_voters jsonb;
  v_current_votes integer;
BEGIN
  -- Get current poll data with lock
  SELECT id, options, version, allow_multiple, allow_vote_change, is_anonymous, total_votes
  INTO v_poll_data
  FROM trip_polls
  WHERE id = p_poll_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  -- Handle version check (null = no version control)
  IF p_current_version IS NOT NULL AND v_poll_data.version IS NOT NULL AND p_current_version != v_poll_data.version THEN
    RAISE EXCEPTION 'Poll has been modified by another user. Please refresh and try again.';
  END IF;

  v_options := v_poll_data.options;

  -- Find and update the option
  FOR v_i IN 0..jsonb_array_length(v_options) - 1 LOOP
    v_option := v_options->v_i;
    
    IF v_option->>'id' = p_option_id THEN
      v_option_found := true;
      
      -- Get voters array
      v_voters := COALESCE(v_option->'voters', '[]'::jsonb);
      
      -- Check if user already voted on this option
      IF v_voters ? p_user_id::text THEN
        RETURN;
      END IF;
      
      -- Get current votes (handle both field names)
      v_current_votes := COALESCE(
        (v_option->>'votes')::integer,
        (v_option->>'voteCount')::integer,
        0
      );
      
      -- Add vote
      v_option := jsonb_set(v_option, '{votes}', to_jsonb(v_current_votes + 1));
      
      -- Add voter (unless anonymous)
      IF NOT COALESCE(v_poll_data.is_anonymous, false) THEN
        v_voters := v_voters || to_jsonb(p_user_id::text);
        v_option := jsonb_set(v_option, '{voters}', v_voters);
      END IF;
      
      -- Remove voteCount if exists
      v_option := v_option - 'voteCount';
      
      v_options := jsonb_set(v_options, ARRAY[v_i::text], v_option);
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_option_found THEN
    RAISE EXCEPTION 'Option not found in poll';
  END IF;

  UPDATE trip_polls
  SET 
    options = v_options,
    total_votes = COALESCE(total_votes, 0) + 1,
    version = COALESCE(version, 0) + 1,
    updated_at = now()
  WHERE id = p_poll_id;
END;
$$;

-- Create remove_vote_from_poll function
CREATE OR REPLACE FUNCTION public.remove_vote_from_poll(
  p_poll_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_poll_data RECORD;
  v_options jsonb;
  v_i integer;
  v_option jsonb;
  v_voters jsonb;
  v_current_votes integer;
  v_votes_removed integer := 0;
BEGIN
  SELECT id, options, allow_vote_change, total_votes
  INTO v_poll_data
  FROM trip_polls
  WHERE id = p_poll_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  IF NOT COALESCE(v_poll_data.allow_vote_change, true) THEN
    RAISE EXCEPTION 'Vote changes are not allowed for this poll';
  END IF;

  v_options := v_poll_data.options;

  FOR v_i IN 0..jsonb_array_length(v_options) - 1 LOOP
    v_option := v_options->v_i;
    v_voters := COALESCE(v_option->'voters', '[]'::jsonb);
    
    IF v_voters ? p_user_id::text THEN
      v_voters := (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements(v_voters) elem
        WHERE elem::text != ('"' || p_user_id::text || '"')
      );
      
      v_current_votes := COALESCE(
        (v_option->>'votes')::integer,
        (v_option->>'voteCount')::integer,
        0
      );
      v_option := jsonb_set(v_option, '{votes}', to_jsonb(GREATEST(v_current_votes - 1, 0)));
      v_option := jsonb_set(v_option, '{voters}', v_voters);
      v_option := v_option - 'voteCount';
      
      v_options := jsonb_set(v_options, ARRAY[v_i::text], v_option);
      v_votes_removed := v_votes_removed + 1;
    END IF;
  END LOOP;

  UPDATE trip_polls
  SET 
    options = v_options,
    total_votes = GREATEST(COALESCE(total_votes, 0) - v_votes_removed, 0),
    version = COALESCE(version, 0) + 1,
    updated_at = now()
  WHERE id = p_poll_id;
END;
$$;