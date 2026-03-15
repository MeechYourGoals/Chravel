-- Migration: Admin message deletion capability
-- Previously only message authors could delete/update their own messages.
-- Admins need the ability to delete offensive or inappropriate content.

-- ==========================================
-- STEP 1: Admin deletion for trip_chat_messages
-- ==========================================

-- Allow trip admins/owners to soft-delete any message in their trip
-- This adds to (not replaces) the existing "Users can update their own messages" policy
CREATE POLICY "Admins can soft-delete any trip message"
ON public.trip_chat_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_chat_messages.trip_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'organizer', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_chat_messages.trip_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'organizer', 'owner')
  )
);

-- ==========================================
-- STEP 2: Admin deletion for channel_messages
-- ==========================================

-- Allow trip admins to soft-delete any channel message in their trip
CREATE POLICY "Admins can soft-delete any channel message"
ON public.channel_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_channels tc
    JOIN public.trip_members tm ON tm.trip_id = tc.trip_id
    WHERE tc.id = channel_messages.channel_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'organizer', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_channels tc
    JOIN public.trip_members tm ON tm.trip_id = tc.trip_id
    WHERE tc.id = channel_messages.channel_id
    AND tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'organizer', 'owner')
  )
);
