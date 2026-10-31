-- =============================================================================
-- STEP 4: POST-DEPLOYMENT VERIFICATION & INTEGRITY PROOF (READ-ONLY)
-- Execution Order: 4 of 4
-- Target: Supabase SQL Editor (Project: aiyglunfwsolqsujyfsz)
-- Safety: 100% READ-ONLY. Safe to execute at any time.
-- Prerequisites:
--   - Steps 1, 2, and 3 executed.
--   - Router L009 seeded with `18_SEED_VOUCHERS_L009.rsc`.
--   - Voucher batch committed via `node scripts/restock_vouchers_v2.mjs --commit`.
-- Expected Result:
--   - Test 1: Active student sessions preserved 100% (count >= pre-deployment count).
--   - Test 2: Pool stock counts meet or exceed targets across ALL 7 packages.
--   - Test 3: Zero duplicate voucher codes in database.
--   - Test 4: Zero orphaned assigned vouchers.
-- =============================================================================

-- TEST 1: Verify all active students remain connected and unexpired
SELECT
    COUNT(*) AS preserved_active_sessions,
    MIN(valid_until) AS next_expiry,
    MAX(valid_until) AS latest_expiry
FROM public.campusnet_sessions
WHERE valid_until > NOW();

-- TEST 2: Verify pool stock counts and exact Option A pricing across all 7 packages
SELECT
    package_id,
    COUNT(*) AS total_available_stock,
    amount AS unit_price_kes,
    duration_hours AS validity_hours
FROM public.campusnet_vouchers
WHERE status = 'available'
GROUP BY package_id, amount, duration_hours
ORDER BY amount ASC;

-- Expected Stock Checklist:
-- pkg_1h:  >= 150 vouchers at KSh 10 (1h)
-- pkg_3h:  >= 100 vouchers at KSh 20 (3h)
-- pkg_12h: >= 150 vouchers at KSh 30 (12h)
-- pkg_24h: >= 150 vouchers at KSh 50 (24h)
-- pkg_3d:  >= 80  vouchers at KSh 100 (72h)
-- pkg_7d:  >= 60  vouchers at KSh 180 (168h)
-- pkg_30d: >= 30  vouchers at KSh 500 (720h)

-- TEST 3: Zero duplicate voucher codes (MUST RETURN 0 ROWS)
SELECT
    code,
    COUNT(*) AS duplicate_count
FROM public.campusnet_vouchers
GROUP BY code
HAVING COUNT(*) > 1;

-- TEST 4: Zero orphaned assigned vouchers (all assigned vouchers must have a valid phone or MAC)
SELECT
    id,
    code,
    package_id,
    assigned_phone,
    assigned_mac,
    activated_at,
    expires_at
FROM public.campusnet_vouchers
WHERE status = 'assigned'
  AND (assigned_phone IS NULL OR assigned_phone = '')
  AND (assigned_mac IS NULL OR assigned_mac = '00:00:00:00:00:00');

