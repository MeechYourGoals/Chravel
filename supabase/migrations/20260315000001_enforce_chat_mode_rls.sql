-- Migration: Enforce chat_mode in RLS policies
-- CRITICAL: chat_mode was stored on trips table but NEVER enforced server-side.
-- Any trip member could INSERT messages regardless of chat_mode setting.
-- This migration closes that authorization gap.

-- ==========================================
-- STEP 1: Helper function for chat_mode enforcement
-- ==========================================

-- Security-definer function to check if a user is allowed to post
-- given the trip's current chat_mode setting.
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
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    JOIN public.trip_members tm ON tm.trip_id = t.id AND tm.user_id = _user_id
    WHERE t.id = _trip_id
    AND (
      -- Mode: everyone — any trip member can post
      t.chat_mode = 'everyone'
      -- Mode: admin_only — only admins/organizers/owners
      OR (t.chat_mode = 'admin_only' AND tm.role IN ('admin', 'organizer', 'owner'))
      -- Mode: broadcasts — only admins/organizers/owners can post (broadcast messages)
      OR (t.chat_mode = 'broadcasts' AND tm.role IN ('admin', 'organizer', 'owner'))
      -- No chat_mode set (consumer trips, legacy) — any member can post
      OR t.chat_mode IS NULL
    )
  )
$$;

COMMENT ON FUNCTION public.can_post_to_trip_chat IS
'Checks if a user is allowed to post to a trip''s main chat based on trips.chat_mode. Returns true for consumer trips (chat_mode IS NULL), and enforces admin-only/broadcasts restrictions for events.';

-- ==========================================
-- STEP 2: Replace trip_chat_messages INSERT policies
-- ==========================================

-- Drop ALL existing INSERT policies on trip_chat_messages
-- These allowed any member to post regardless of chat_mode
DROP POLICY IF EXISTS "Users can insert messages to main chat of trips they are members of" ON public.trip_chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to channels they are members of" ON public.trip_chat_messages;
DROP POLICY IF EXISTS "Users send messages as themselves only" ON public.trip_chat_messages;
DROP POLICY IF EXISTS "Trip members can send messages" ON public.trip_chat_messages;
DROP POLICY IF EXISTS "Authenticated can insert trip_chat_messages" ON public.trip_chat_messages;
DROP POLICY IF EXISTS "Users can insert trip_chat_messages" ON public.trip_chat_messages;

-- New INSERT policy for main chat messages (channel_id IS NULL)
-- Enforces: anti-spoofing + trip membership + chat_mode
CREATE POLICY "Members can post to main chat respecting chat_mode"
ON public.trip_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  channel_id IS NULL
  AND auth.uid() = user_id
  AND can_post_to_trip_chat(auth.uid(), trip_id)
);

-- New INSERT policy for channel messages via trip_chat_messages table
-- (Channels have their own access model, chat_mode does not restrict channel posting)
CREATE POLICY "Channel members can post to trip channels"
ON public.trip_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  channel_id IS NOT NULL
  AND auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.trip_channel_members tcm
    WHERE tcm.channel_id = trip_chat_messages.channel_id
    AND tcm.user_id = auth.uid()
  )
);

-- ==========================================
-- STEP 3: Helper function for media upload enforcement
-- ==========================================

CREATE OR REPLACE FUNCTION public.can_upload_media_to_trip(
  _user_id UUID,
  _trip_id TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trips t
    JOIN public.trip_members tm ON tm.trip_id = t.id AND tm.user_id = _user_id
    WHERE t.id = _trip_id
    AND (
      -- Mode: everyone — any trip member can upload
      t.media_upload_mode = 'everyone'
      -- Mode: admin_only — only admins/organizers/owners
      OR (t.media_upload_mode = 'admin_only' AND tm.role IN ('admin', 'organizer', 'owner'))
      -- No mode set (consumer/pro trips, legacy) — any member can upload
      OR t.media_upload_mode IS NULL
    )
  )
$$;

COMMENT ON FUNCTION public.can_upload_media_to_trip IS
'Checks if a user is allowed to upload media to a trip based on trips.media_upload_mode.';

-- ==========================================
-- STEP 4: Add index for chat_mode lookups
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_trips_chat_mode ON public.trips(id, chat_mode);
