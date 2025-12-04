-- =====================================================
-- FIX ALL SECURITY DEFINER FUNCTIONS - Add search_path
-- Date: 2025-01-19
-- Description: Adds SET search_path = public to all 48 vulnerable functions
-- =====================================================

-- =====================================================
-- UPDATE TRIGGER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_trips()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_trip_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_event_rsvps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_trip_roles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_trip_channels()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_kb_documents()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- ROLE AND PERMISSION CHECK FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id 
      AND organization_id = _org_id 
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id 
      AND organization_id = _org_id 
      AND role IN ('owner', 'admin')
      AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_trip_admin(_user_id uuid, _trip_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_admins
    WHERE user_id = _user_id AND trip_id = _trip_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_ids(_user_id uuid, _trip_id text)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role_id
  FROM public.user_trip_roles
  WHERE user_id = _user_id AND trip_id = _trip_id
$$;

CREATE OR REPLACE FUNCTION public.can_access_channel(_user_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_channels tc
    INNER JOIN public.channel_role_access cra ON cra.channel_id = tc.id
    INNER JOIN public.user_trip_roles utr
      ON utr.trip_id = tc.trip_id
      AND utr.role_id = cra.role_id
      AND utr.user_id = _user_id
      AND utr.is_primary = true
    WHERE tc.id = _channel_id
  )
$$;

CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _trip_id text, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_admins
    WHERE user_id = _user_id
      AND trip_id = _trip_id
      AND (permissions->>_permission)::boolean = true
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_primary_role(_user_id uuid, _trip_id text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role_id
  FROM public.user_trip_roles
  WHERE user_id = _user_id
    AND trip_id = _trip_id
    AND is_primary = true
  LIMIT 1
$$;

-- =====================================================
-- INITIALIZATION AND SETUP FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.initialize_trip_privacy_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trip_privacy_configs (
    trip_id, 
    privacy_mode, 
    ai_access_enabled, 
    created_by
  ) VALUES (
    NEW.id,
    COALESCE(NEW.privacy_mode, 'standard'),
    COALESCE(NEW.ai_access_enabled, true),
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_trip_membership(p_trip_id text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    membership_exists boolean := false;
    is_consumer_trip boolean := false;
BEGIN
    is_consumer_trip := p_trip_id IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12');
    
    IF NOT is_consumer_trip THEN
        RETURN false;
    END IF;
    
    SELECT EXISTS(
        SELECT 1 FROM trip_members 
        WHERE trip_id = p_trip_id AND user_id = p_user_id
    ) INTO membership_exists;
    
    IF NOT membership_exists THEN
        INSERT INTO trip_members (trip_id, user_id, role)
        VALUES (p_trip_id, p_user_id, 'member')
        ON CONFLICT (trip_id, user_id) DO NOTHING;
        RETURN true;
    END IF;
    
    RETURN membership_exists;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_process_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.file_type IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                        'application/msword', 'text/plain', 'image/jpeg', 'image/png', 'image/jpg') THEN
    NEW.processing_status := 'queued';
    RAISE NOTICE 'Document queued for processing: %, file_id: %', NEW.file_name, NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_org_owner_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_user_id UUID;
BEGIN
  SELECT user_id INTO creator_user_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    seat_id,
    status
  ) VALUES (
    NEW.id,
    creator_user_id,
    'owner',
    'seat-001',
    'active'
  );

  UPDATE public.organizations
  SET seats_used = 1
  WHERE id = NEW.id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (creator_user_id, 'pro')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_pro_trip_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trip_type IN ('pro', 'event') THEN
    INSERT INTO public.trip_admins (
      trip_id,
      user_id,
      granted_by,
      permissions
    ) VALUES (
      NEW.id,
      NEW.created_by,
      NEW.created_by,
      jsonb_build_object(
        'can_manage_roles', true,
        'can_manage_channels', true,
        'can_designate_admins', true
      )
    )
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_pro_trip_to_org()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id uuid;
BEGIN
  IF NEW.trip_type IN ('pro', 'event') THEN
    SELECT organization_id INTO user_org_id
    FROM organization_members
    WHERE user_id = NEW.created_by
      AND status = 'active'
      AND role IN ('owner', 'admin')
    ORDER BY joined_at ASC
    LIMIT 1;
    
    IF user_org_id IS NOT NULL THEN
      INSERT INTO pro_trip_organizations (trip_id, organization_id, created_by)
      VALUES (NEW.id, user_org_id, NEW.created_by)
      ON CONFLICT (trip_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_create_channel_for_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trip_channels (
    trip_id, 
    channel_name, 
    channel_slug,
    required_role_id, 
    is_private,
    created_by
  )
  VALUES (
    NEW.trip_id, 
    NEW.role_name,
    lower(replace(NEW.role_name, ' ', '-')),
    NEW.id, 
    true,
    NEW.created_by
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_archive_channel_on_role_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trip_channels
  SET is_archived = TRUE, updated_at = now()
  WHERE required_role_id = OLD.id;
  
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO security_audit_log (user_id, action, table_name, record_id, metadata)
    VALUES (NEW.user_id, 'role_granted', 'user_roles', NEW.id, jsonb_build_object('role', NEW.role));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO security_audit_log (user_id, action, table_name, record_id, metadata)
    VALUES (OLD.user_id, 'role_revoked', 'user_roles', OLD.id, jsonb_build_object('role', OLD.role));
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- BUSINESS LOGIC FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_visible_profile_fields(profile_user_id uuid, requesting_user_id uuid)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, bio text, email text, phone text, first_name text, last_name text, show_email boolean, show_phone boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    CASE WHEN p.show_email = true OR p.user_id = requesting_user_id THEN p.email ELSE NULL END,
    CASE WHEN p.show_phone = true OR p.user_id = requesting_user_id THEN p.phone ELSE NULL END,
    p.first_name,
    p.last_name,
    p.show_email,
    p.show_phone
  FROM profiles p
  WHERE p.user_id = profile_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_event_with_conflict_check(
  p_trip_id text, 
  p_title text, 
  p_description text, 
  p_location text, 
  p_start_time timestamp with time zone, 
  p_end_time timestamp with time zone, 
  p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM trip_events
  WHERE trip_id = p_trip_id
    AND (
      (start_time <= p_start_time AND (end_time IS NULL OR end_time > p_start_time))
      OR
      (start_time < p_end_time AND (end_time IS NULL OR end_time >= p_end_time))
      OR
      (start_time >= p_start_time AND (end_time IS NULL OR end_time <= p_end_time))
    );
    
  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Time conflict detected. There is already an event scheduled during this time.';
  END IF;
  
  INSERT INTO trip_events (
    trip_id, title, description, location, start_time, end_time, created_by
  ) VALUES (
    p_trip_id, p_title, p_description, p_location, p_start_time, p_end_time, p_created_by
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.should_send_notification(p_user_id uuid, p_notification_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings JSONB;
  v_enabled BOOLEAN;
BEGIN
  SELECT notification_settings INTO v_settings
  FROM profiles
  WHERE user_id = p_user_id;
  
  IF v_settings IS NULL THEN
    RETURN true;
  END IF;
  
  v_enabled := COALESCE((v_settings ->> p_notification_type)::boolean, true);
  
  RETURN v_enabled;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_payment_with_splits(
  p_trip_id text, 
  p_amount numeric, 
  p_currency text, 
  p_description text, 
  p_split_count integer, 
  p_split_participants jsonb, 
  p_payment_methods jsonb, 
  p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_id UUID;
  participant UUID;
  split_amount NUMERIC;
BEGIN
  split_amount := p_amount / p_split_count;
  
  INSERT INTO trip_payment_messages (
    trip_id, amount, currency, description, split_count,
    split_participants, payment_methods, created_by
  ) VALUES (
    p_trip_id, p_amount, p_currency, p_description, p_split_count,
    p_split_participants, p_payment_methods, p_created_by
  ) RETURNING id INTO payment_id;
  
  FOR participant IN SELECT jsonb_array_elements_text(p_split_participants)::UUID
  LOOP
    INSERT INTO payment_splits (
      payment_message_id, debtor_user_id, amount_owed
    ) VALUES (
      payment_id, participant, split_amount
    );
  END LOOP;
  
  RETURN payment_id;
END;
$$;

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
  task_version INTEGER;
BEGIN
  SELECT version INTO task_version FROM trip_tasks WHERE id = p_task_id;
  
  IF task_version != p_current_version THEN
    RAISE EXCEPTION 'Task has been modified by another user. Please refresh and try again.';
  END IF;
  
  INSERT INTO task_status (task_id, user_id, completed, completed_at)
  VALUES (p_task_id, p_user_id, p_completed, CASE WHEN p_completed THEN NOW() ELSE NULL END)
  ON CONFLICT (task_id, user_id) 
  DO UPDATE SET 
    completed = p_completed,
    completed_at = CASE WHEN p_completed THEN NOW() ELSE NULL END;
    
  UPDATE trip_tasks SET 
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_task_id;
  
  RETURN TRUE;
END;
$$;

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
BEGIN
  SELECT version, options INTO poll_version, current_options 
  FROM trip_polls WHERE id = p_poll_id;
  
  IF poll_version != p_current_version THEN
    RAISE EXCEPTION 'Poll has been modified by another user. Please refresh and try again.';
  END IF;
  
  updated_options := current_options;
  
  FOR i IN 0..jsonb_array_length(current_options) - 1
  LOOP
    option_obj := current_options -> i;
    
    IF option_obj ->> 'id' = p_option_id THEN
      voters := COALESCE(option_obj -> 'voters', '[]'::jsonb);
      
      IF voters ? p_user_id::text THEN
        RAISE EXCEPTION 'User has already voted on this option.';
      END IF;
      
      voters := voters || jsonb_build_array(p_user_id::text);
      option_obj := jsonb_set(option_obj, '{voters}', voters);
      option_obj := jsonb_set(option_obj, '{voteCount}', 
        to_jsonb((option_obj ->> 'voteCount')::integer + 1));
      
      updated_options := jsonb_set(updated_options, ARRAY[i::text], option_obj);
      EXIT;
    END IF;
  END LOOP;
  
  UPDATE trip_polls SET 
    options = updated_options,
    total_votes = total_votes + 1,
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_poll_id;
  
  RETURN updated_options;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_payment_with_splits_v2(
  p_trip_id text, 
  p_amount numeric, 
  p_currency text, 
  p_description text, 
  p_split_count integer, 
  p_split_participants jsonb, 
  p_payment_methods jsonb, 
  p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_id uuid;
  participant uuid;
  split_amount numeric;
  invalid_user_id uuid;
BEGIN
  -- CRITICAL FIX: Validate all split participants are trip members
  SELECT user_id INTO invalid_user_id
  FROM (
    SELECT jsonb_array_elements_text(p_split_participants)::uuid AS user_id
  ) AS participants
  WHERE user_id NOT IN (
    SELECT user_id FROM trip_members WHERE trip_id = p_trip_id
  )
  LIMIT 1;
  
  IF invalid_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'User % is not a trip member. All split participants must be members of the trip.', invalid_user_id;
  END IF;
  
  split_amount := p_amount / p_split_count;
  
  INSERT INTO trip_payment_messages (
    trip_id, amount, currency, description, split_count,
    split_participants, payment_methods, created_by
  ) VALUES (
    p_trip_id, p_amount, p_currency, p_description, p_split_count,
    p_split_participants, p_payment_methods, p_created_by
  ) RETURNING id INTO payment_id;
  
  FOR participant IN SELECT jsonb_array_elements_text(p_split_participants)::uuid
  LOOP
    INSERT INTO payment_splits (
      payment_message_id, debtor_user_id, amount_owed
    ) VALUES (
      payment_id, participant, split_amount
    );
  END LOOP;
  
  INSERT INTO payment_audit_log (payment_message_id, action, actor_user_id, metadata)
  VALUES (payment_id, 'created', p_created_by, jsonb_build_object('amount', p_amount, 'currency', p_currency));
  
  RETURN payment_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Payment creation failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_events_in_user_tz(p_trip_id text, p_user_id uuid)
RETURNS TABLE(
  id uuid, 
  trip_id text, 
  title text, 
  description text, 
  location text, 
  start_time timestamp with time zone, 
  end_time timestamp with time zone, 
  event_category text, 
  created_by uuid, 
  user_local_start text, 
  user_local_end text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    e.id,
    e.trip_id,
    e.title,
    e.description,
    e.location,
    e.start_time,
    e.end_time,
    e.event_category,
    e.created_by,
    to_char(e.start_time AT TIME ZONE COALESCE(p.timezone, 'UTC'), 'YYYY-MM-DD HH24:MI:SS') as user_local_start,
    to_char(e.end_time AT TIME ZONE COALESCE(p.timezone, 'UTC'), 'YYYY-MM-DD HH24:MI:SS') as user_local_end
  FROM trip_events e
  CROSS JOIN profiles p
  WHERE e.trip_id = p_trip_id
    AND p.user_id = p_user_id
  ORDER BY e.start_time ASC;
$$;

CREATE OR REPLACE FUNCTION public.match_trip_embeddings(
  query_embedding vector, 
  trip_id_input text, 
  match_threshold double precision DEFAULT 0.7, 
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid, 
  source_type text, 
  source_id uuid, 
  content_text text, 
  similarity double precision, 
  metadata jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    id,
    source_type,
    source_id,
    content_text,
    1 - (trip_embeddings.embedding <=> query_embedding) AS similarity,
    metadata
  FROM trip_embeddings
  WHERE trip_id = trip_id_input
    AND embedding IS NOT NULL
    AND 1 - (trip_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.update_trip_basecamp_with_version(
  p_trip_id text, 
  p_current_version integer, 
  p_name text, 
  p_address text, 
  p_latitude double precision, 
  p_longitude double precision, 
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
BEGIN
  SELECT basecamp_version INTO v_current_version
  FROM trips
  WHERE id = p_trip_id
  FOR UPDATE;
  
  IF v_current_version != p_current_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'conflict', true,
      'current_version', v_current_version,
      'message', 'Basecamp was modified by another user'
    );
  END IF;
  
  v_new_version := v_current_version + 1;
  
  UPDATE trips SET
    basecamp_name = p_name,
    basecamp_address = p_address,
    basecamp_latitude = p_latitude,
    basecamp_longitude = p_longitude,
    basecamp_version = v_new_version,
    updated_at = NOW()
  WHERE id = p_trip_id;
  
  BEGIN
    PERFORM log_basecamp_change(
      p_trip_id,
      p_user_id,
      'trip',
      'updated',
      NULL, NULL, NULL, NULL,
      p_name, p_address, p_latitude, p_longitude
    );
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_version', v_new_version
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_expired_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trip_invites
  SET is_active = FALSE, updated_at = now()
  WHERE expires_at < now() 
  AND is_active = TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_ids uuid[], 
  p_trip_id uuid, 
  p_type text, 
  p_title text, 
  p_message text, 
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    IF should_send_notification(v_user_id, p_type) THEN
      INSERT INTO notifications (user_id, trip_id, type, title, message, metadata)
      VALUES (v_user_id, p_trip_id, p_type, p_title, p_message, p_metadata);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.hybrid_search_trip_context(
  p_trip_id text, 
  p_query_text text, 
  p_query_embedding vector, 
  p_match_threshold double precision DEFAULT 0.6, 
  p_match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid, 
  source_type text, 
  source_id uuid, 
  content_text text, 
  similarity double precision, 
  metadata jsonb, 
  rank double precision, 
  search_type text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT 
      te.id,
      te.source_type,
      te.source_id,
      te.content_text,
      1 - (te.embedding <=> p_query_embedding) AS similarity,
      te.metadata,
      0.7 AS weight,
      'vector'::text AS search_type
    FROM trip_embeddings te
    WHERE te.trip_id = p_trip_id
      AND te.embedding IS NOT NULL
      AND 1 - (te.embedding <=> p_query_embedding) > p_match_threshold
    ORDER BY similarity DESC
    LIMIT p_match_count
  ),
  keyword_results AS (
    SELECT 
      kd.id,
      kd.source AS source_type,
      kd.source_id,
      kc.content AS content_text,
      0.0 AS similarity,
      kd.metadata,
      0.3 AS weight,
      'keyword'::text AS search_type
    FROM kb_chunks kc
    JOIN kb_documents kd ON kd.id = kc.doc_id
    WHERE kd.trip_id = p_trip_id
      AND kc.content_tsv @@ plainto_tsquery('english', p_query_text)
    ORDER BY ts_rank(kc.content_tsv, plainto_tsquery('english', p_query_text)) DESC
    LIMIT p_match_count / 2
  ),
  combined AS (
    SELECT *, vector_results.similarity * vector_results.weight AS rank
    FROM vector_results
    UNION ALL
    SELECT *, keyword_results.weight AS rank
    FROM keyword_results
  )
  SELECT 
    combined.id,
    combined.source_type,
    combined.source_id,
    combined.content_text,
    combined.similarity,
    combined.metadata,
    combined.rank,
    combined.search_type
  FROM combined
  ORDER BY rank DESC, similarity DESC
  LIMIT p_match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_join_request(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  trip_data RECORD;
  requester_profile RECORD;
  result JSONB;
BEGIN
  SELECT * INTO req 
  FROM public.trip_join_requests 
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Join request not found'
    );
  END IF;

  IF req.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'This request has already been ' || req.status
    );
  END IF;

  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;
  
  IF NOT (
    trip_data.created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = req.trip_id AND user_id = auth.uid()
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Only trip admins can approve join requests'
    );
  END IF;

  UPDATE public.trip_join_requests
  SET 
    status = 'approved',
    resolved_at = now(),
    resolved_by = auth.uid()
  WHERE id = _request_id;

  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (req.trip_id, req.user_id, 'member')
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  SELECT display_name INTO requester_profile
  FROM public.profiles
  WHERE user_id = req.user_id;

  PERFORM public.create_notification(
    req.user_id,
    '✅ Join Request Approved',
    'Your request to join "' || trip_data.name || '" has been approved!',
    'success',
    jsonb_build_object(
      'trip_id', req.trip_id,
      'trip_name', trip_data.name,
      'action', 'join_approved'
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'User added to trip successfully',
    'trip_id', req.trip_id,
    'user_id', req.user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_join_request(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
  trip_data RECORD;
  result JSONB;
BEGIN
  SELECT * INTO req 
  FROM public.trip_join_requests 
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Join request not found'
    );
  END IF;

  IF req.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'This request has already been ' || req.status
    );
  END IF;

  SELECT * INTO trip_data FROM public.trips WHERE id = req.trip_id;
  
  IF NOT (
    trip_data.created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = req.trip_id AND user_id = auth.uid()
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Only trip admins can reject join requests'
    );
  END IF;

  UPDATE public.trip_join_requests
  SET 
    status = 'rejected',
    resolved_at = now(),
    resolved_by = auth.uid()
  WHERE id = _request_id;

  PERFORM public.create_notification(
    req.user_id,
    'Join Request Update',
    'Your request to join "' || trip_data.name || '" was not approved at this time.',
    'info',
    jsonb_build_object(
      'trip_id', req.trip_id,
      'trip_name', trip_data.name,
      'action', 'join_rejected'
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Join request rejected',
    'trip_id', req.trip_id,
    'user_id', req.user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid, 
  _title text, 
  _message text DEFAULT ''::text, 
  _type text DEFAULT 'info'::text, 
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (_user_id, _title, _message, _type, _metadata)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_campaign_stat(p_campaign_id uuid, p_stat_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE p_stat_type
    WHEN 'impression' THEN
      UPDATE public.campaigns 
      SET impressions = impressions + 1 
      WHERE id = p_campaign_id;
    WHEN 'click' THEN
      UPDATE public.campaigns 
      SET clicks = clicks + 1 
      WHERE id = p_campaign_id;
    WHEN 'conversion' THEN
      UPDATE public.campaigns 
      SET conversions = conversions + 1 
      WHERE id = p_campaign_id;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_to_admin(_trip_id text, _target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trip_data RECORD;
BEGIN
  SELECT * INTO trip_data FROM public.trips WHERE id = _trip_id;
  
  IF NOT (
    trip_data.created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = _trip_id 
      AND user_id = auth.uid()
      AND (permissions->>'can_designate_admins')::boolean = true
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only admins with permission can promote users'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = _trip_id AND user_id = _target_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User must be a trip member first'
    );
  END IF;

  INSERT INTO public.trip_admins (
    trip_id, 
    user_id, 
    granted_by, 
    permissions
  )
  VALUES (
    _trip_id, 
    _target_user_id, 
    auth.uid(), 
    jsonb_build_object(
      'can_manage_roles', true,
      'can_manage_channels', true,
      'can_designate_admins', false
    )
  )
  ON CONFLICT (trip_id, user_id) 
  DO UPDATE SET 
    permissions = EXCLUDED.permissions,
    granted_by = EXCLUDED.granted_by;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User promoted to admin successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.demote_from_admin(_trip_id text, _target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trip_data RECORD;
BEGIN
  SELECT * INTO trip_data FROM public.trips WHERE id = _trip_id;
  
  IF NOT (
    trip_data.created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = _trip_id 
      AND user_id = auth.uid()
      AND (permissions->>'can_designate_admins')::boolean = true
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only admins with permission can demote users'
    );
  END IF;

  IF trip_data.created_by = _target_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cannot demote trip creator'
    );
  END IF;

  DELETE FROM public.trip_admins
  WHERE trip_id = _trip_id AND user_id = _target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User demoted successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_trip_role(
  _trip_id text, 
  _role_name text, 
  _permission_level permission_level DEFAULT 'edit'::permission_level, 
  _feature_permissions jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_id UUID;
  default_permissions JSONB;
BEGIN
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = _trip_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = _trip_id 
      AND user_id = auth.uid()
      AND (permissions->>'can_manage_roles')::boolean = true
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only admins can create roles'
    );
  END IF;

  default_permissions := COALESCE(
    _feature_permissions,
    jsonb_build_object(
      'media', jsonb_build_object(
        'can_view', true,
        'can_upload', true,
        'can_delete_own', true,
        'can_delete_any', false
      ),
      'tasks', jsonb_build_object(
        'can_view', true,
        'can_create', true,
        'can_assign', false,
        'can_complete', true,
        'can_delete', false
      ),
      'calendar', jsonb_build_object(
        'can_view', true,
        'can_create_events', true,
        'can_edit_events', false,
        'can_delete_events', false
      ),
      'channels', jsonb_build_object(
        'can_view', true,
        'can_post', true,
        'can_edit_messages', false,
        'can_delete_messages', false,
        'can_manage_members', false
      ),
      'payments', jsonb_build_object(
        'can_view', true,
        'can_create', false,
        'can_approve', false
      )
    )
  );

  INSERT INTO public.trip_roles (
    trip_id, 
    role_name, 
    permission_level, 
    feature_permissions, 
    created_by
  )
  VALUES (
    _trip_id, 
    _role_name, 
    _permission_level, 
    default_permissions, 
    auth.uid()
  )
  RETURNING id INTO role_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role created successfully',
    'role_id', role_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_trip_role(_role_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_data RECORD;
BEGIN
  SELECT * INTO role_data FROM public.trip_roles WHERE id = _role_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Role not found'
    );
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = role_data.trip_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = role_data.trip_id 
      AND user_id = auth.uid()
      AND (permissions->>'can_manage_roles')::boolean = true
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only admins can delete roles'
    );
  END IF;

  DELETE FROM public.trip_roles WHERE id = _role_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role deleted successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_user_to_role(
  _trip_id text, 
  _user_id uuid, 
  _role_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = _trip_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = _trip_id 
      AND user_id = auth.uid()
      AND (permissions->>'can_manage_roles')::boolean = true
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only admins can assign roles'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_id = _trip_id AND user_id = _user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User must be a trip member'
    );
  END IF;

  INSERT INTO public.user_trip_roles (
    trip_id, 
    user_id, 
    role_id, 
    is_primary,
    assigned_by
  )
  VALUES (
    _trip_id, 
    _user_id, 
    _role_id, 
    true,
    auth.uid()
  )
  ON CONFLICT (trip_id, user_id, role_id) 
  DO UPDATE SET 
    is_primary = true,
    assigned_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role assigned successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_user_from_role(
  _trip_id text, 
  _user_id uuid, 
  _role_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = _trip_id AND created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.trip_admins 
      WHERE trip_id = _trip_id 
      AND user_id = auth.uid()
      AND (permissions->>'can_manage_roles')::boolean = true
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only admins can remove roles'
    );
  END IF;

  DELETE FROM public.user_trip_roles
  WHERE trip_id = _trip_id 
  AND user_id = _user_id 
  AND role_id = _role_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role removed successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_calendar_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_creator_name TEXT;
BEGIN
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  SELECT COALESCE(
    display_name,
    first_name || ' ' || last_name,
    email
  ) INTO v_creator_name
  FROM profiles
  WHERE user_id = NEW.created_by;
  
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.created_by;
  
  IF v_member_ids IS NOT NULL AND array_length(v_member_ids, 1) > 0 THEN
    PERFORM send_notification(
      v_member_ids,
      NEW.trip_id::UUID,
      'calendar',
      '📅 New event: ' || NEW.title,
      COALESCE(v_creator_name, 'Someone') || ' added a new event' || 
        CASE WHEN NEW.start_time IS NOT NULL 
          THEN ' on ' || to_char(NEW.start_time, 'Mon DD, YYYY at HH:MI AM')
          ELSE ''
        END ||
        CASE WHEN NEW.location IS NOT NULL 
          THEN ' at ' || NEW.location
          ELSE ''
        END,
      jsonb_build_object(
        'event_id', NEW.id,
        'trip_id', NEW.trip_id,
        'start_time', NEW.start_time,
        'location', NEW.location,
        'action', 'event_created'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_sender_name TEXT;
BEGIN
  IF NEW.is_deleted = TRUE THEN
    RETURN NEW;
  END IF;
  
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  SELECT COALESCE(
    display_name,
    first_name || ' ' || last_name,
    email
  ) INTO v_sender_name
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.user_id;
  
  IF v_member_ids IS NOT NULL AND array_length(v_member_ids, 1) > 0 THEN
    PERFORM send_notification(
      v_member_ids,
      NEW.trip_id::UUID,
      'chat',
      '💬 ' || COALESCE(v_sender_name, 'Someone') || ' in ' || v_trip_name,
      SUBSTRING(NEW.content, 1, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
      jsonb_build_object(
        'message_id', NEW.id,
        'trip_id', NEW.trip_id,
        'sender_id', NEW.user_id,
        'trip_name', v_trip_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_creator_name TEXT;
  v_title_prefix TEXT;
BEGIN
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  SELECT COALESCE(
    display_name,
    first_name || ' ' || last_name,
    email
  ) INTO v_creator_name
  FROM profiles
  WHERE user_id = NEW.created_by;
  
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.created_by;
  
  v_title_prefix := CASE 
    WHEN NEW.priority = 'urgent' THEN '🚨 URGENT: '
    WHEN NEW.priority = 'high' THEN '⚠️ '
    ELSE '📢 '
  END;
  
  IF v_member_ids IS NOT NULL AND array_length(v_member_ids, 1) > 0 THEN
    PERFORM send_notification(
      v_member_ids,
      NEW.trip_id::UUID,
      'broadcast',
      v_title_prefix || COALESCE(v_creator_name, 'Someone') || ' sent a broadcast',
      SUBSTRING(NEW.message, 1, 100) || CASE WHEN LENGTH(NEW.message) > 100 THEN '...' ELSE '' END,
      jsonb_build_object(
        'broadcast_id', NEW.id,
        'trip_id', NEW.trip_id,
        'priority', COALESCE(NEW.priority, 'normal'),
        'trip_name', v_trip_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;