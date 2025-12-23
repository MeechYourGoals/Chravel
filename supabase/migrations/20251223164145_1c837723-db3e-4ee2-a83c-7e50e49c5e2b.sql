-- Add disabled_at column to push_device_tokens for managing invalid/revoked tokens
ALTER TABLE public.push_device_tokens 
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for efficient lookup of active tokens
CREATE INDEX IF NOT EXISTS idx_push_device_tokens_active 
ON public.push_device_tokens(user_id) 
WHERE disabled_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN public.push_device_tokens.disabled_at IS 'Set when token is invalid/revoked. NULL means active.';