-- Migration: Add settle_payment_split RPC with pessimistic locking
-- Prevents double-credit race condition on concurrent settlement attempts

CREATE OR REPLACE FUNCTION settle_payment_split(
  p_split_id UUID,
  p_user_id UUID,  -- kept for backwards-compat; ignored in favor of auth.uid()
  p_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_split RECORD;
  v_all_settled BOOLEAN;
  v_caller UUID;
BEGIN
  -- Always use the authenticated caller, never trust the parameter
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  -- Acquire row-level lock to prevent concurrent settlement
  SELECT id, is_settled, payment_message_id
    INTO v_split
    FROM payment_splits
   WHERE id = p_split_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'SPLIT_NOT_FOUND');
  END IF;

  IF v_split.is_settled THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_SETTLED');
  END IF;

  -- Mark the split as settled
  UPDATE payment_splits
     SET is_settled = true,
         settled_at = now(),
         settlement_method = p_method
   WHERE id = p_split_id;

  -- Insert audit log entry using authenticated caller, not parameter
  INSERT INTO payment_audit_log (payment_message_id, action, actor_user_id, details)
  VALUES (
    v_split.payment_message_id,
    'split_settled',
    v_caller,
    jsonb_build_object('split_id', p_split_id, 'method', p_method)
  );

  -- Check if all splits for this payment are now settled
  SELECT NOT EXISTS (
    SELECT 1 FROM payment_splits
     WHERE payment_message_id = v_split.payment_message_id
       AND is_settled = false
  ) INTO v_all_settled;

  -- Update parent payment's is_settled flag
  UPDATE trip_payment_messages
     SET is_settled = v_all_settled
   WHERE id = v_split.payment_message_id;

  RETURN jsonb_build_object('success', true, 'all_settled', v_all_settled);
END;
$$;
