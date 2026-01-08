-- Fix message_read_receipts security - restrict to trip/channel members only

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view read receipts" ON public.message_read_receipts;

-- Create a secure SELECT policy that restricts access to trip/channel members
CREATE POLICY "Users can view read receipts for accessible messages"
ON public.message_read_receipts
FOR SELECT
TO authenticated
USING (
  -- User can see their own read receipts
  auth.uid() = user_id
  OR
  -- User can see read receipts for trip messages they're a member of
  (
    message_type = 'trip'
    AND EXISTS (
      SELECT 1
      FROM trip_chat_messages tcm
      JOIN trip_members tm ON tm.trip_id = tcm.trip_id
      WHERE tcm.id = message_read_receipts.message_id
        AND tm.user_id = auth.uid()
    )
  )
  OR
  -- User can see read receipts for channel messages they have access to
  (
    message_type = 'channel'
    AND EXISTS (
      SELECT 1
      FROM channel_messages cm
      JOIN channel_members chm ON chm.channel_id = cm.channel_id
      WHERE cm.id = message_read_receipts.message_id
        AND chm.user_id = auth.uid()
    )
  )
);