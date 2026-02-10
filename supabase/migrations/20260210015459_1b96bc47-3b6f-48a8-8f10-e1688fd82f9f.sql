ALTER TABLE user_entitlements
  ADD COLUMN IF NOT EXISTS purchase_type text NOT NULL DEFAULT 'subscription'
    CHECK (purchase_type IN ('subscription', 'pass'));