-- Fix PUBLIC_READ_RECEIPTS: restrict read receipt visibility
-- Problem: "Users can view read receipts" used USING (true), allowing any authenticated user
-- to view read receipts across all trips/channels.
--
-- Goal: Only allow viewing/creating/deleting read receipts for messages the user can access
-- via existing RLS on `trip_chat_messages` and `channel_messages`.

BEGIN;

-- Replace permissive SELECT policy with access-scoped policy.
DROP POLICY IF EXISTS "Users can view read receipts" ON public.message_read_receipts;
CREATE POLICY "Users can view read receipts"
  ON public.message_read_receipts
  FOR SELECT
  TO authenticated
  USING (
    (
      message_type = 'trip'
      AND EXISTS (
        SELECT 1
        FROM public.trip_chat_messages tcm
        WHERE tcm.id = message_id
      )
    )
    OR (
      message_type = 'channel'
      AND EXISTS (
        SELECT 1
        FROM public.channel_messages cm
        WHERE cm.id = message_id
      )
    )
  );

-- Tighten INSERT so users can only mark messages they can access.
DROP POLICY IF EXISTS "Users can create own read receipts" ON public.message_read_receipts;
CREATE POLICY "Users can create own read receipts"
  ON public.message_read_receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (
        message_type = 'trip'
        AND EXISTS (
          SELECT 1
          FROM public.trip_chat_messages tcm
          WHERE tcm.id = message_id
        )
      )
      OR (
        message_type = 'channel'
        AND EXISTS (
          SELECT 1
          FROM public.channel_messages cm
          WHERE cm.id = message_id
        )
      )
    )
  );

-- Tighten DELETE similarly (still only own receipts).
DROP POLICY IF EXISTS "Users can delete own read receipts" ON public.message_read_receipts;
CREATE POLICY "Users can delete own read receipts"
  ON public.message_read_receipts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (
      (
        message_type = 'trip'
        AND EXISTS (
          SELECT 1
          FROM public.trip_chat_messages tcm
          WHERE tcm.id = message_id
        )
      )
      OR (
        message_type = 'channel'
        AND EXISTS (
          SELECT 1
          FROM public.channel_messages cm
          WHERE cm.id = message_id
        )
      )
    )
  );

COMMIT;
