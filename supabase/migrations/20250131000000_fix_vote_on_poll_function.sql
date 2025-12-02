-- Fix vote_on_poll function to use 'votes' instead of 'voteCount'
-- The frontend code creates polls with 'votes' field, but the function was expecting 'voteCount'
-- Also fixes handling of null version and improves error messages

CREATE OR REPLACE FUNCTION public.vote_on_poll(
  p_poll_id uuid, 
  p_option_id text, 
  p_user_id uuid, 
  p_current_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  poll_version INTEGER;
  current_options JSONB;
  updated_options JSONB;
  option_obj JSONB;
  voters JSONB;
  current_votes INTEGER;
  user_id_text TEXT;
  option_found BOOLEAN := FALSE;
BEGIN
  -- Fetch poll data
  SELECT version, options INTO poll_version, current_options 
  FROM trip_polls WHERE id = p_poll_id;
  
  -- Handle null version (for polls created before version was added)
  IF poll_version IS NULL THEN
    poll_version := 1;
  END IF;
  
  -- Version check for optimistic locking
  IF poll_version != p_current_version THEN
    RAISE EXCEPTION 'Poll has been modified by another user. Please refresh and try again.';
  END IF;
  
  -- Convert user_id to text for comparison
  user_id_text := p_user_id::text;
  
  updated_options := current_options;
  
  -- Find and update the target option
  FOR i IN 0..jsonb_array_length(current_options) - 1
  LOOP
    option_obj := current_options -> i;
    
    IF option_obj ->> 'id' = p_option_id THEN
      option_found := TRUE;
      voters := COALESCE(option_obj -> 'voters', '[]'::jsonb);
      
      -- Check if user already voted on this specific option
      IF jsonb_typeof(voters) = 'array' AND voters @> jsonb_build_array(user_id_text) THEN
        RAISE EXCEPTION 'User has already voted on this option.';
      END IF;
      
      -- Add user to voters array
      voters := voters || jsonb_build_array(user_id_text);
      option_obj := jsonb_set(option_obj, '{voters}', voters);
      
      -- Handle both 'votes' and 'voteCount' for backward compatibility
      -- Prefer 'votes' as that's what the frontend uses
      IF option_obj ? 'votes' THEN
        current_votes := COALESCE((option_obj ->> 'votes')::integer, 0);
        option_obj := jsonb_set(option_obj, '{votes}', to_jsonb(current_votes + 1));
      ELSIF option_obj ? 'voteCount' THEN
        current_votes := COALESCE((option_obj ->> 'voteCount')::integer, 0);
        option_obj := jsonb_set(option_obj, '{votes}', to_jsonb(current_votes + 1));
        -- Remove old voteCount field
        option_obj := option_obj - 'voteCount';
      ELSE
        -- If neither exists, create 'votes' field
        option_obj := jsonb_set(option_obj, '{votes}', to_jsonb(1));
      END IF;
      
      updated_options := jsonb_set(updated_options, ARRAY[i::text], option_obj);
      EXIT;
    END IF;
  END LOOP;
  
  IF NOT option_found THEN
    RAISE EXCEPTION 'Option not found in poll.';
  END IF;
  
  -- Update the poll
  UPDATE trip_polls SET 
    options = updated_options,
    total_votes = total_votes + 1,
    version = COALESCE(version, 1) + 1,
    updated_at = NOW()
  WHERE id = p_poll_id;
  
  RETURN updated_options;
END;
$$;
