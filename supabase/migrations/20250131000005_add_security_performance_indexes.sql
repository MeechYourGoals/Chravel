-- =====================================================
-- SECURITY & PERFORMANCE INDEXES
-- Created: 2025-01-31
-- Purpose: Add missing indexes for DoS prevention and query optimization
--          Addresses security audit findings for slow query vulnerabilities
-- =====================================================

-- =====================================================
-- 1. Chat messages by trip (used frequently)
-- High-impact query pattern: SELECT * FROM trip_chat_messages 
--                            WHERE trip_id = ? ORDER BY created_at DESC
-- =====================================================
-- Note: idx_trip_chat_messages_trip_created already exists from 20251006041739
-- This ensures it exists with optimal ordering
CREATE INDEX IF NOT EXISTS idx_trip_chat_messages_trip_created 
ON trip_chat_messages(trip_id, created_at DESC);

-- =====================================================
-- 2. Trip members lookup (used in every RLS policy)
-- Critical for RLS performance: EXISTS checks on trip_members
-- Pattern: SELECT 1 FROM trip_members WHERE user_id = ? AND trip_id = ?
-- =====================================================
-- Note: idx_trip_members_trip_user exists (trip_id, user_id) from 20250813001710
-- Add reverse index for user-first lookups (common in RLS policies)
CREATE INDEX IF NOT EXISTS idx_trip_members_user_trip 
ON trip_members(user_id, trip_id);

-- =====================================================
-- 3. File processing status (used in document-processor)
-- Optimized partial index for queued/processing files only
-- Pattern: SELECT * FROM trip_files 
--          WHERE trip_id = ? AND processing_status IN ('queued', 'processing')
-- =====================================================
-- Note: idx_trip_files_trip_id_status exists from 20251107001035
-- Add optimized partial index for active processing queries
CREATE INDEX IF NOT EXISTS idx_trip_files_processing 
ON trip_files(trip_id, processing_status) 
WHERE processing_status IN ('queued', 'processing');

-- =====================================================
-- 4. Payment balances calculation
-- Optimize balance queries by debtor and settlement status
-- Pattern: SELECT * FROM payment_splits 
--          WHERE debtor_user_id = ? AND is_settled = false
-- =====================================================
-- Note: idx_payment_splits_debtor_settled exists from 20251016221037
-- Ensure it exists with optimal column order
CREATE INDEX IF NOT EXISTS idx_payment_splits_debtor 
ON payment_splits(debtor_user_id, is_settled);

-- =====================================================
-- DOCUMENTATION COMMENTS
-- =====================================================

COMMENT ON INDEX idx_trip_chat_messages_trip_created IS 
'Optimizes frequent chat message queries by trip in reverse chronological order. 
Prevents DoS via slow queries on high-traffic chat tables.';

COMMENT ON INDEX idx_trip_members_user_trip IS 
'Critical for RLS policy performance. Used in EXISTS checks for trip membership validation.
Reverse order from idx_trip_members_trip_user for user-first lookups.';

COMMENT ON INDEX idx_trip_files_processing IS 
'Partial index optimizing document processor queries for active processing files only.
Reduces index size and improves query performance for queued/processing status checks.';

COMMENT ON INDEX idx_payment_splits_debtor IS 
'Optimizes payment balance calculations by debtor and settlement status.
Prevents slow queries when calculating user balances across multiple trips.';
