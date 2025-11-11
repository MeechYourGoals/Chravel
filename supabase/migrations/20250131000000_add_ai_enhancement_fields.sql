-- Add AI enhancement fields to concierge_usage table
-- Supports complexity tracking, model selection analytics, and quality metrics

-- Add complexity_score column (0-1, where 1 is most complex)
ALTER TABLE concierge_usage 
ADD COLUMN IF NOT EXISTS complexity_score NUMERIC(3,2);

-- Add used_pro_model flag (true if Gemini Pro was used, false for Flash)
ALTER TABLE concierge_usage 
ADD COLUMN IF NOT EXISTS used_pro_model BOOLEAN DEFAULT false;

-- Add index for complexity analysis queries
CREATE INDEX IF NOT EXISTS idx_concierge_usage_complexity 
ON concierge_usage(complexity_score, used_pro_model, created_at DESC);

-- Add index for model usage analytics
CREATE INDEX IF NOT EXISTS idx_concierge_usage_model 
ON concierge_usage(model_used, created_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN concierge_usage.complexity_score IS 'Query complexity score (0-1) used for smart model routing';
COMMENT ON COLUMN concierge_usage.used_pro_model IS 'Whether Gemini Pro model was used (vs Flash)';
