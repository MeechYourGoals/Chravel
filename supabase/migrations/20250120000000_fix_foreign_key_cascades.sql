-- CRITICAL FIX: Add foreign key cascade rules to prevent orphaned records
-- This migration ensures data integrity when parent entities are deleted

-- Trip Members: Cascade delete when trip is deleted
ALTER TABLE public.trip_members
DROP CONSTRAINT IF EXISTS trip_members_trip_id_fkey;

ALTER TABLE public.trip_members
ADD CONSTRAINT trip_members_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- Payment Splits: Cascade delete when payment message is deleted
ALTER TABLE public.payment_splits
DROP CONSTRAINT IF EXISTS payment_splits_payment_message_id_fkey;

ALTER TABLE public.payment_splits
ADD CONSTRAINT payment_splits_payment_message_id_fkey
FOREIGN KEY (payment_message_id) REFERENCES public.trip_payment_messages(id) ON DELETE CASCADE;

-- Trip Events: Cascade delete when trip is deleted
ALTER TABLE public.trip_events
DROP CONSTRAINT IF EXISTS trip_events_trip_id_fkey;

ALTER TABLE public.trip_events
ADD CONSTRAINT trip_events_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- Trip Invites: Cascade delete when trip is deleted
ALTER TABLE public.trip_invites
DROP CONSTRAINT IF EXISTS trip_invites_trip_id_fkey;

ALTER TABLE public.trip_invites
ADD CONSTRAINT trip_invites_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- Trip Chat Messages: Cascade delete when trip is deleted
ALTER TABLE public.trip_chat_messages
DROP CONSTRAINT IF EXISTS trip_chat_messages_trip_id_fkey;

ALTER TABLE public.trip_chat_messages
ADD CONSTRAINT trip_chat_messages_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- Trip Media Index: Cascade delete when trip is deleted
ALTER TABLE public.trip_media_index
DROP CONSTRAINT IF EXISTS trip_media_index_trip_id_fkey;

ALTER TABLE public.trip_media_index
ADD CONSTRAINT trip_media_index_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- Trip Files: Cascade delete when trip is deleted
ALTER TABLE public.trip_files
DROP CONSTRAINT IF EXISTS trip_files_trip_id_fkey;

ALTER TABLE public.trip_files
ADD CONSTRAINT trip_files_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- Trip Link Index: Cascade delete when trip is deleted
ALTER TABLE public.trip_link_index
DROP CONSTRAINT IF EXISTS trip_link_index_trip_id_fkey;

ALTER TABLE public.trip_link_index
ADD CONSTRAINT trip_link_index_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- Payment Audit Log: Set NULL when payment message is deleted (preserve audit trail)
ALTER TABLE public.payment_audit_log
DROP CONSTRAINT IF EXISTS payment_audit_log_payment_message_id_fkey;

ALTER TABLE public.payment_audit_log
ADD CONSTRAINT payment_audit_log_payment_message_id_fkey
FOREIGN KEY (payment_message_id) REFERENCES public.trip_payment_messages(id) ON DELETE SET NULL;

-- Trip Payment Messages: Cascade delete when trip is deleted
ALTER TABLE public.trip_payment_messages
DROP CONSTRAINT IF EXISTS trip_payment_messages_trip_id_fkey;

ALTER TABLE public.trip_payment_messages
ADD CONSTRAINT trip_payment_messages_trip_id_fkey
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- HIGH PRIORITY FIX: Handle orphaned payment splits when member is removed
-- Create trigger to mark splits as settled when member is removed
CREATE OR REPLACE FUNCTION public.cleanup_payment_splits_on_member_removal()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all unsettled splits for removed member as settled with special method
  UPDATE public.payment_splits
  SET 
    is_settled = true,
    settled_at = NOW(),
    settlement_method = 'member_removed',
    updated_at = NOW()
  WHERE debtor_user_id = OLD.user_id
    AND trip_id = OLD.trip_id
    AND is_settled = false;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_cleanup_payment_splits_on_member_removal ON public.trip_members;

CREATE TRIGGER trigger_cleanup_payment_splits_on_member_removal
AFTER DELETE ON public.trip_members
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_payment_splits_on_member_removal();

COMMENT ON FUNCTION public.cleanup_payment_splits_on_member_removal() IS 
'Automatically marks payment splits as settled when a trip member is removed to prevent orphaned records';
