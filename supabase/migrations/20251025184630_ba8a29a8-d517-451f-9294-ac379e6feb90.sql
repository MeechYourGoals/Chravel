-- Add confirmation status to payment splits
ALTER TABLE payment_splits 
ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'none' CHECK (confirmation_status IN ('none', 'pending', 'confirmed'));

ALTER TABLE payment_splits 
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id);

ALTER TABLE payment_splits 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Create index for querying pending confirmations
CREATE INDEX IF NOT EXISTS idx_payment_splits_confirmation 
ON payment_splits(confirmation_status, debtor_user_id) 
WHERE confirmation_status = 'pending';