-- Secure Payments & Wallet Migration
--
-- 1. Rate Limiting: Prevent abuse of payment method creation/updates.
-- 2. User Payment Methods: Allow trip co-members to view wallets (for payments), restrict edits to owner.
-- 3. Trip Payment Messages: Restrict visibility in Pro/Event trips to involved parties only.
-- 4. Payment Splits: Align visibility with messages.

-- =====================================================
-- 1. RATE LIMITING
-- =====================================================

-- Ensure rate_limits table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Secure rate_limits table (only accessible via Security Definer functions)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Function to check rate limits via trigger
CREATE OR REPLACE FUNCTION public.check_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_limit integer := 10; -- Default limit: 10 operations
  v_window interval := interval '1 hour'; -- Default window: 1 hour
  v_count integer;
BEGIN
  -- Construct key based on table and user
  v_key := TG_TABLE_NAME || ':write:' || auth.uid();

  -- Clean up expired entries (lazy cleanup)
  DELETE FROM public.rate_limits WHERE expires_at < now();

  -- Check/Insert/Update
  INSERT INTO public.rate_limits (key, count, expires_at)
  VALUES (v_key, 1, now() + v_window)
  ON CONFLICT (key) DO UPDATE
  SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  IF v_count > v_limit THEN
    RAISE EXCEPTION 'Rate limit exceeded for %. Please try again later.', TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply rate limit trigger to user_payment_methods
DROP TRIGGER IF EXISTS trigger_rate_limit_payment_methods ON public.user_payment_methods;
CREATE TRIGGER trigger_rate_limit_payment_methods
  BEFORE INSERT OR UPDATE ON public.user_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.check_rate_limit();

-- Apply rate limit trigger to trip_payment_messages (creation only)
DROP TRIGGER IF EXISTS trigger_rate_limit_payment_messages ON public.trip_payment_messages;
CREATE TRIGGER trigger_rate_limit_payment_messages
  BEFORE INSERT ON public.trip_payment_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_rate_limit();


-- =====================================================
-- 2. USER PAYMENT METHODS (Travel Wallet)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own payment methods" ON public.user_payment_methods;
DROP POLICY IF EXISTS "Trip members can view others payment methods" ON public.user_payment_methods;

-- Policy: Owners can manage (CRUD) their own methods
CREATE POLICY "Users can manage their own payment methods"
ON public.user_payment_methods
FOR ALL
USING (auth.uid() = user_id);

-- Policy: Trip co-members can view payment methods (to facilitate payments)
-- This allows view access IF the requester shares AT LEAST ONE trip with the target user.
CREATE POLICY "Trip members can view others payment methods"
ON public.user_payment_methods
FOR SELECT
USING (
  auth.uid() = user_id -- Can always view own
  OR EXISTS (
    SELECT 1
    FROM public.trip_members tm1
    JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = auth.uid()
    AND tm2.user_id = public.user_payment_methods.user_id
  )
);


-- =====================================================
-- 3. TRIP PAYMENT MESSAGES
-- =====================================================

-- Helper function to break RLS recursion between messages and splits
CREATE OR REPLACE FUNCTION public.is_payment_debtor(_payment_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.payment_splits
    WHERE payment_message_id = _payment_id
    AND debtor_user_id = _user_id
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Trip members can view payment messages" ON public.trip_payment_messages;
DROP POLICY IF EXISTS "Trip members can create payment messages" ON public.trip_payment_messages;
DROP POLICY IF EXISTS "Payment creators can update their messages" ON public.trip_payment_messages;

-- Policy: View Access
-- Consumer Trips: All members can view.
-- Pro/Event Trips: Only Creator, Debtor (via splits), or Admin/Finance can view.
CREATE POLICY "Trip members can view payment messages"
ON public.trip_payment_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    JOIN public.trips t ON t.id = tm.trip_id
    WHERE tm.trip_id = public.trip_payment_messages.trip_id
    AND tm.user_id = auth.uid()
    AND (
      -- Consumer Trip: All members can view
      t.trip_type = 'consumer'
      OR (
        -- Pro/Event Trip: Restricted access
        t.trip_type IN ('pro', 'event') AND (
          public.trip_payment_messages.created_by = auth.uid() -- Creator
          OR public.is_payment_debtor(public.trip_payment_messages.id, auth.uid()) -- Debtor (via secure function)
          OR EXISTS (
            -- Trip Admin (Direct)
            SELECT 1 FROM public.trip_admins ta
            WHERE ta.trip_id = t.id
            AND ta.user_id = auth.uid()
          )
          OR EXISTS (
            -- Role with 'payments.can_view' permission
            SELECT 1 FROM public.user_trip_roles utr
            JOIN public.trip_roles tr ON utr.role_id = tr.id
            WHERE utr.user_id = auth.uid()
            AND utr.trip_id = public.trip_payment_messages.trip_id
            AND (tr.feature_permissions->'payments'->>'can_view')::boolean = true
          )
        )
      )
    )
  )
);

-- Policy: Create (Insert)
-- Only trip members can create
CREATE POLICY "Trip members can create payment messages"
ON public.trip_payment_messages
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = trip_id
    AND tm.user_id = auth.uid()
  )
);

-- Policy: Update
-- Only creator can update
CREATE POLICY "Payment creators can update their messages"
ON public.trip_payment_messages
FOR UPDATE
USING (auth.uid() = created_by);


-- =====================================================
-- 4. PAYMENT SPLITS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Trip members can view payment splits" ON public.payment_splits;
DROP POLICY IF EXISTS "Debtors can update their own payment splits" ON public.payment_splits;

-- Policy: View Access (Aligned with Messages)
CREATE POLICY "Trip members can view payment splits"
ON public.payment_splits
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trip_payment_messages tpm
    WHERE tpm.id = public.payment_splits.payment_message_id
    AND (
      -- If user can see the parent message, they can see the split
      -- (This recursively uses the policy on trip_payment_messages, which now uses is_payment_debtor to avoid cycles)
      true
    )
  )
);

-- Only debtors can update (e.g. mark as settled/paid)
CREATE POLICY "Debtors can update their own payment splits"
ON public.payment_splits
FOR UPDATE
USING (auth.uid() = debtor_user_id);
