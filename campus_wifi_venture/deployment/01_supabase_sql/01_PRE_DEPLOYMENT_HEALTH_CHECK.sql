-- =============================================================================
-- STEP 1: PRE-DEPLOYMENT HEALTH & ACTIVE STUDENT AUDIT (READ-ONLY)
-- Execution Order: 1 of 4
-- Target: Supabase SQL Editor (Project: aiyglunfwsolqsujyfsz)
-- Safety: 100% READ-ONLY. Makes ZERO modifications. Safe to run repeatedly.
-- Prerequisites: None.
-- Expected Result:
--   - Query 1: Active student count with unexpired sessions (MUST BE PRESERVED).
--   - Query 2: Current available pool voucher counts by package.
--   - Query 3: Recent completed transactions (verifying payment continuity).
-- =============================================================================

-- 1. Currently active student sessions (THESE MUST REMAIN UNTOUCHED)
SELECT
    COUNT(*) AS total_active_sessions,
    MIN(valid_until) AS earliest_active_expiry,
    MAX(valid_until) AS latest_active_expiry
FROM public.campusnet_sessions
WHERE valid_until > NOW();

-- 2. Inspect active student details (names, vouchers, expires)
SELECT
    phone,
    voucher_code,
    valid_until,
    created_at
FROM public.campusnet_sessions
WHERE valid_until > NOW()
ORDER BY valid_until ASC;

-- 3. Current available pool vouchers in database before restocking
SELECT
    package_id,
    COUNT(*) AS available_count,
    MIN(amount) AS min_price_kes,
    MAX(amount) AS max_price_kes
FROM public.campusnet_vouchers
WHERE status = 'available'
GROUP BY package_id
ORDER BY package_id;

-- 4. Verify transaction integrity (last 10 completed payments)
SELECT
    reference,
    phone,
    package_id,
    amount,
    status,
    mpesa_receipt,
    voucher_code,
    created_at
FROM public.campusnet_transactions
WHERE status = 'completed'
ORDER BY created_at DESC
LIMIT 10;

