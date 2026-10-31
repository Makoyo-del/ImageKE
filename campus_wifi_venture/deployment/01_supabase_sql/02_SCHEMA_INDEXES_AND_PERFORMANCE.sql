-- =============================================================================
-- STEP 2: PERFORMANCE INDEXES & QUERY ACCELERATION
-- Execution Order: 2 of 4
-- Target: Supabase SQL Editor (Project: aiyglunfwsolqsujyfsz)
-- Safety: Non-destructive DDL (`CREATE INDEX IF NOT EXISTS`).
--         Does NOT modify existing data, schema columns, or table locks.
--         Safe to execute repeatedly (Idempotent).
-- Prerequisites: Step 1 executed and reviewed.
-- Purpose: Accelerates RouterOS `/sync/live` (querying assigned vouchers by expiry)
--          and captive portal status polling (querying receipt and valid_until).
-- Expected Result: `Success. No rows returned.`
-- =============================================================================

-- 1. Index on vouchers (status, expires_at) for sub-millisecond RouterOS /sync/live queries
CREATE INDEX IF NOT EXISTS idx_campusnet_vouchers_status_expires
ON public.campusnet_vouchers (status, expires_at)
WHERE status = 'assigned';

-- 2. Index on vouchers (package_id, status) for atomic pool claims
CREATE INDEX IF NOT EXISTS idx_campusnet_vouchers_pkg_status_avail
ON public.campusnet_vouchers (package_id, status)
WHERE status = 'available';

-- 3. Index on transactions (reference, status) for payment status polling
CREATE INDEX IF NOT EXISTS idx_campusnet_transactions_ref_status
ON public.campusnet_transactions (reference, status);

-- 4. Index on transactions (mpesa_receipt) for manual SMS code verification
CREATE INDEX IF NOT EXISTS idx_campusnet_transactions_receipt
ON public.campusnet_transactions (mpesa_receipt)
WHERE mpesa_receipt IS NOT NULL;

-- 5. Index on active sessions (valid_until) for portal 1-tap reconnect checks
CREATE INDEX IF NOT EXISTS idx_campusnet_sessions_valid_until
ON public.campusnet_sessions (valid_until);

-- =============================================================================
-- VERIFICATION QUERY (Run immediately after executing above commands)
-- =============================================================================
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('campusnet_vouchers', 'campusnet_transactions', 'campusnet_sessions')
  AND indexname LIKE 'idx_campusnet_%'
ORDER BY tablename, indexname;

