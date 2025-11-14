-- Fix search_path for all security definer functions to prevent security issues
-- This addresses the Function Search Path Mutable warnings from the linter

-- Fix notify_on_calendar_event
CREATE OR REPLACE FUNCTION public.notify_on_calendar_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_creator_name TEXT;
BEGIN
  -- Get trip details
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  -- Get creator's name
  SELECT COALESCE(
    display_name,
    first_name || ' ' || last_name,
    email
  ) INTO v_creator_name
  FROM profiles
  WHERE user_id = NEW.created_by;
  
  -- Get all trip members except creator
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.created_by;
  
  -- Send notification to all trip members
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
$function$;

-- Fix notify_on_chat_message
CREATE OR REPLACE FUNCTION public.notify_on_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_sender_name TEXT;
BEGIN
  -- Skip if message is deleted
  IF NEW.is_deleted = TRUE THEN
    RETURN NEW;
  END IF;
  
  -- Get trip details
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  -- Get sender's name
  SELECT COALESCE(
    display_name,
    first_name || ' ' || last_name,
    email
  ) INTO v_sender_name
  FROM profiles
  WHERE user_id = NEW.user_id;
  
  -- Get all trip members except sender
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.user_id;
  
  -- Send notification (will be filtered by user preferences - defaults to OFF)
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
$function$;

-- Fix notify_on_broadcast
CREATE OR REPLACE FUNCTION public.notify_on_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_trip_name TEXT;
  v_member_ids UUID[];
  v_creator_name TEXT;
  v_title_prefix TEXT;
BEGIN
  -- Get trip details
  SELECT name INTO v_trip_name FROM trips WHERE id = NEW.trip_id;
  
  -- Get creator's name
  SELECT COALESCE(
    display_name,
    first_name || ' ' || last_name,
    email
  ) INTO v_creator_name
  FROM profiles
  WHERE user_id = NEW.created_by;
  
  -- Get all trip members except broadcaster
  SELECT ARRAY_AGG(user_id) INTO v_member_ids
  FROM trip_members
  WHERE trip_id = NEW.trip_id AND user_id != NEW.created_by;
  
  -- Set title prefix based on priority
  v_title_prefix := CASE 
    WHEN NEW.priority = 'urgent' THEN '🚨 URGENT: '
    WHEN NEW.priority = 'high' THEN '⚠️ '
    ELSE '📢 '
  END;
  
  -- Send notification
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
$function$;

-- Fix update_updated_at_trip_roles
CREATE OR REPLACE FUNCTION public.update_updated_at_trip_roles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix update_updated_at_trip_channels
CREATE OR REPLACE FUNCTION public.update_updated_at_trip_channels()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix increment_campaign_stat
CREATE OR REPLACE FUNCTION public.increment_campaign_stat(p_campaign_id uuid, p_stat_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix create_notification
CREATE OR REPLACE FUNCTION public.create_notification(_user_id uuid, _title text, _message text DEFAULT ''::text, _type text DEFAULT 'info'::text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (_user_id, _title, _message, _type, _metadata)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

-- Fix log_role_change
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix update_updated_at_kb_documents
CREATE OR REPLACE FUNCTION public.update_updated_at_kb_documents()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Comment explaining the security fix
COMMENT ON FUNCTION public.notify_on_calendar_event IS 'Trigger function for calendar event notifications - search_path set to public for security';
COMMENT ON FUNCTION public.notify_on_chat_message IS 'Trigger function for chat message notifications - search_path set to public for security';
COMMENT ON FUNCTION public.notify_on_broadcast IS 'Trigger function for broadcast notifications - search_path set to public for security';
