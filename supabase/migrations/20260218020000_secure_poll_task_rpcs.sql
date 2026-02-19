-- Harden poll + task RPCs for auth, membership, and edge-case correctness.

-- Secure task toggle with explicit auth + membership checks.
CREATE OR REPLACE FUNCTION public.toggle_task_status(
  p_task_id uuid,
  p_user_id uuid,
  p_completed boolean,
  p_current_version integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.trip_tasks%ROWTYPE;
  v_assignment_count integer;
  v_is_assigned boolean;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized task update request';
  END IF;

  SELECT *
  INTO v_task
  FROM public.trip_tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_task.version <> p_current_version THEN
    RAISE EXCEPTION 'Task has been modified by another user. Please refresh and try again.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.trip_members tm
    WHERE tm.trip_id = v_task.trip_id
      AND tm.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You must be a trip member to update tasks';
  END IF;

  SELECT COUNT(*)::int INTO v_assignment_count
  FROM public.task_assignments ta
  WHERE ta.task_id = p_task_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.task_assignments ta
    WHERE ta.task_id = p_task_id
      AND ta.user_id = p_user_id
  ) INTO v_is_assigned;

  IF v_assignment_count > 0 AND NOT v_is_assigned AND v_task.creator_id <> p_user_id THEN
    RAISE EXCEPTION 'Only assigned members can complete this task';
  END IF;

  INSERT INTO public.task_status (task_id, user_id, completed, completed_at)
  VALUES (
    p_task_id,
    p_user_id,
    p_completed,
    CASE WHEN p_completed THEN now() ELSE NULL END
  )
  ON CONFLICT (task_id, user_id)
  DO UPDATE SET
    completed = EXCLUDED.completed,
    completed_at = EXCLUDED.completed_at;

  UPDATE public.trip_tasks
  SET version = version + 1,
      updated_at = now()
  WHERE id = p_task_id;

  RETURN TRUE;
END;
$$;

-- Secure single-option voting with membership, status, deadline, and vote-rule checks.
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
  v_poll public.trip_polls%ROWTYPE;
  v_options jsonb;
  v_idx integer;
  v_option jsonb;
  v_found boolean := false;
  v_voters jsonb;
  v_already_voted_any boolean := false;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized vote request';
  END IF;

  SELECT *
  INTO v_poll
  FROM public.trip_polls
  WHERE id = p_poll_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = v_poll.trip_id
      AND tm.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You must be a trip member to vote';
  END IF;

  IF v_poll.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'This poll is closed';
  END IF;

  IF v_poll.deadline_at IS NOT NULL AND v_poll.deadline_at <= now() THEN
    RAISE EXCEPTION 'Voting deadline has passed';
  END IF;

  IF p_current_version IS NOT NULL AND v_poll.version IS NOT NULL AND p_current_version <> v_poll.version THEN
    RAISE EXCEPTION 'Poll has been modified by another user. Please refresh and try again.';
  END IF;

  v_options := COALESCE(v_poll.options::jsonb, '[]'::jsonb);

  -- Determine if user has voted on any option.
  FOR v_idx IN 0..GREATEST(jsonb_array_length(v_options) - 1, 0) LOOP
    v_option := v_options -> v_idx;
    v_voters := COALESCE(v_option -> 'voters', '[]'::jsonb);
    IF v_voters ? p_user_id::text THEN
      v_already_voted_any := true;
      EXIT;
    END IF;
  END LOOP;

  IF v_already_voted_any AND COALESCE(v_poll.allow_vote_change, true) = false THEN
    RAISE EXCEPTION 'Vote changes are not allowed for this poll';
  END IF;

  IF v_already_voted_any AND COALESCE(v_poll.allow_multiple, false) = false THEN
    RAISE EXCEPTION 'This poll only allows one option per voter';
  END IF;

  FOR v_idx IN 0..GREATEST(jsonb_array_length(v_options) - 1, 0) LOOP
    v_option := v_options -> v_idx;
    IF v_option ->> 'id' = p_option_id THEN
      v_found := true;
      v_voters := COALESCE(v_option -> 'voters', '[]'::jsonb);

      IF v_voters ? p_user_id::text THEN
        RETURN;
      END IF;

      v_option := jsonb_set(
        v_option,
        '{votes}',
        to_jsonb(COALESCE((v_option ->> 'votes')::integer, (v_option ->> 'voteCount')::integer, 0) + 1)
      );

      IF NOT COALESCE(v_poll.is_anonymous, false) THEN
        v_option := jsonb_set(v_option, '{voters}', v_voters || to_jsonb(p_user_id::text));
      END IF;

      v_option := v_option - 'voteCount';
      v_options := jsonb_set(v_options, ARRAY[v_idx::text], v_option);
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_found THEN
    RAISE EXCEPTION 'Option not found in poll';
  END IF;

  UPDATE public.trip_polls
  SET options = v_options,
      total_votes = COALESCE(total_votes, 0) + 1,
      version = COALESCE(version, 0) + 1,
      updated_at = now()
  WHERE id = p_poll_id;
END;
$$;

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
  v_poll public.trip_polls%ROWTYPE;
  v_options jsonb;
  v_idx integer;
  v_option jsonb;
  v_voters jsonb;
  v_removed integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized vote removal request';
  END IF;

  SELECT *
  INTO v_poll
  FROM public.trip_polls
  WHERE id = p_poll_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = v_poll.trip_id
      AND tm.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You must be a trip member to update votes';
  END IF;

  IF COALESCE(v_poll.allow_vote_change, true) = false THEN
    RAISE EXCEPTION 'Vote changes are not allowed for this poll';
  END IF;

  v_options := COALESCE(v_poll.options::jsonb, '[]'::jsonb);

  FOR v_idx IN 0..GREATEST(jsonb_array_length(v_options) - 1, 0) LOOP
    v_option := v_options -> v_idx;
    v_voters := COALESCE(v_option -> 'voters', '[]'::jsonb);

    IF v_voters ? p_user_id::text THEN
      v_voters := (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM jsonb_array_elements(v_voters) elem
        WHERE elem::text <> ('"' || p_user_id::text || '"')
      );

      v_option := jsonb_set(
        v_option,
        '{votes}',
        to_jsonb(GREATEST(COALESCE((v_option ->> 'votes')::integer, (v_option ->> 'voteCount')::integer, 0) - 1, 0))
      );
      v_option := jsonb_set(v_option, '{voters}', v_voters);
      v_option := v_option - 'voteCount';
      v_options := jsonb_set(v_options, ARRAY[v_idx::text], v_option);
      v_removed := v_removed + 1;
    END IF;
  END LOOP;

  UPDATE public.trip_polls
  SET options = v_options,
      total_votes = GREATEST(COALESCE(total_votes, 0) - v_removed, 0),
      version = COALESCE(version, 0) + 1,
      updated_at = now()
  WHERE id = p_poll_id;
END;
$$;

-- Batch vote path: enforce same constraints and write once for concurrency efficiency.
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
  v_poll public.trip_polls%ROWTYPE;
  v_options jsonb;
  v_idx integer;
  v_option jsonb;
  v_voters jsonb;
  v_option_id text;
  v_selected_count integer;
  v_user_votes integer := 0;
  v_vote_delta integer := 0;
  v_matched boolean;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized vote request';
  END IF;

  IF p_option_ids IS NULL OR array_length(p_option_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one option must be selected';
  END IF;

  SELECT *
  INTO v_poll
  FROM public.trip_polls
  WHERE id = p_poll_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = v_poll.trip_id
      AND tm.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'You must be a trip member to vote';
  END IF;

  IF v_poll.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'This poll is closed';
  END IF;

  IF v_poll.deadline_at IS NOT NULL AND v_poll.deadline_at <= now() THEN
    RAISE EXCEPTION 'Voting deadline has passed';
  END IF;

  IF p_current_version IS NOT NULL AND v_poll.version IS NOT NULL AND p_current_version <> v_poll.version THEN
    RAISE EXCEPTION 'Poll has been modified by another user. Please refresh and try again.';
  END IF;

  v_selected_count := array_length(p_option_ids, 1);
  IF v_selected_count > 1 AND COALESCE(v_poll.allow_multiple, false) = false THEN
    RAISE EXCEPTION 'This poll only allows one option per voter';
  END IF;

  v_options := COALESCE(v_poll.options::jsonb, '[]'::jsonb);

  -- Count prior votes by this user.
  FOR v_idx IN 0..GREATEST(jsonb_array_length(v_options) - 1, 0) LOOP
    v_option := v_options -> v_idx;
    v_voters := COALESCE(v_option -> 'voters', '[]'::jsonb);
    IF v_voters ? p_user_id::text THEN
      v_user_votes := v_user_votes + 1;
    END IF;
  END LOOP;

  IF v_user_votes > 0 AND COALESCE(v_poll.allow_vote_change, true) = false THEN
    RAISE EXCEPTION 'Vote changes are not allowed for this poll';
  END IF;

  IF v_user_votes > 0 AND COALESCE(v_poll.allow_multiple, false) = false THEN
    RAISE EXCEPTION 'This poll only allows one option per voter';
  END IF;

  FOREACH v_option_id IN ARRAY p_option_ids LOOP
    v_matched := false;

    FOR v_idx IN 0..GREATEST(jsonb_array_length(v_options) - 1, 0) LOOP
      v_option := v_options -> v_idx;

      IF v_option ->> 'id' = v_option_id THEN
        v_matched := true;
        v_voters := COALESCE(v_option -> 'voters', '[]'::jsonb);

        IF NOT (v_voters ? p_user_id::text) THEN
          v_option := jsonb_set(
            v_option,
            '{votes}',
            to_jsonb(COALESCE((v_option ->> 'votes')::integer, (v_option ->> 'voteCount')::integer, 0) + 1)
          );

          IF NOT COALESCE(v_poll.is_anonymous, false) THEN
            v_option := jsonb_set(v_option, '{voters}', v_voters || to_jsonb(p_user_id::text));
          END IF;

          v_option := v_option - 'voteCount';
          v_options := jsonb_set(v_options, ARRAY[v_idx::text], v_option);
          v_vote_delta := v_vote_delta + 1;
        END IF;

        EXIT;
      END IF;
    END LOOP;

    IF NOT v_matched THEN
      RAISE EXCEPTION 'Option not found in poll';
    END IF;
  END LOOP;

  IF v_vote_delta = 0 THEN
    RETURN;
  END IF;

  UPDATE public.trip_polls
  SET options = v_options,
      total_votes = COALESCE(total_votes, 0) + v_vote_delta,
      version = COALESCE(version, 0) + 1,
      updated_at = now()
  WHERE id = p_poll_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_task_status(uuid, uuid, boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_on_poll(uuid, text, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_vote_from_poll(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_on_poll_batch(uuid, text[], uuid, integer) TO authenticated;
