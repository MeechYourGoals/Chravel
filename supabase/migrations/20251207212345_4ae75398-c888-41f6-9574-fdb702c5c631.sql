-- Add DELETE RLS policies for payment tables

-- Allow payment creators to delete their own payment messages
CREATE POLICY "Payment creators can delete their messages"
ON trip_payment_messages FOR DELETE
USING (auth.uid() = created_by);

-- Allow deletion of splits when payment is deleted (by creator)
CREATE POLICY "Payment creators can delete splits"
ON payment_splits FOR DELETE
USING (EXISTS (
  SELECT 1 FROM trip_payment_messages tpm
  WHERE tpm.id = payment_splits.payment_message_id
  AND tpm.created_by = auth.uid()
));

-- Allow payment creators to update splits for their payments (for unsettle functionality)
CREATE POLICY "Payment creators can update splits for their payments"
ON payment_splits FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM trip_payment_messages tpm
  WHERE tpm.id = payment_splits.payment_message_id
  AND tpm.created_by = auth.uid()
));

-- Allow deletion of audit logs for creator's payments
CREATE POLICY "Payment creators can delete audit logs"
ON payment_audit_log FOR DELETE
USING (EXISTS (
  SELECT 1 FROM trip_payment_messages tpm
  WHERE tpm.id = payment_audit_log.payment_message_id
  AND tpm.created_by = auth.uid()
));