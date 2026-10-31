-- =============================================================================
-- STEP 3: ALIGN EXISTING AVAILABLE POOL VOUCHERS TO OPTION A PRICING
-- Execution Order: 3 of 4
-- Target: Supabase SQL Editor (Project: aiyglunfwsolqsujyfsz)
-- Safety: Updates ONLY rows where `status = 'available'`.
--         Leaves all `assigned`, active, or completed vouchers UNTOUCHED.
--         Safe to execute repeatedly (Idempotent).
-- Prerequisites: Step 1 and Step 2 executed.
-- Purpose: Aligns legacy voucher amounts (e.g. 24h was KSh 40, 7d was KSh 150)
--          to locked Option A pricing (24h=50, 7d=180, 3d=100, etc.) for unassigned pool vouchers.
-- Expected Result: Number of rows updated per package.
-- =============================================================================

BEGIN;

-- 1. 1 Hour Flash Pass -> KSh 10 (1h)
UPDATE public.campusnet_vouchers
SET amount = 10, duration_hours = 1
WHERE package_id = 'pkg_1h' AND status = 'available';

-- 2. 3 Hours Study Sprint -> KSh 20 (3h)
UPDATE public.campusnet_vouchers
SET amount = 20, duration_hours = 3
WHERE package_id = 'pkg_3h' AND status = 'available';

-- 3. 12 Hours Night Owl -> KSh 30 (12h)
UPDATE public.campusnet_vouchers
SET amount = 30, duration_hours = 12
WHERE package_id = 'pkg_12h' AND status = 'available';

-- 4. 24 Hours Unlimited -> KSh 50 (24h)
UPDATE public.campusnet_vouchers
SET amount = 50, duration_hours = 24
WHERE package_id = 'pkg_24h' AND status = 'available';

-- 5. 3 Days Mega Pack -> KSh 100 (72h)
UPDATE public.campusnet_vouchers
SET amount = 100, duration_hours = 72
WHERE package_id = 'pkg_3d' AND status = 'available';

-- 6. 7 Days Mega Pack -> KSh 180 (168h)
UPDATE public.campusnet_vouchers
SET amount = 180, duration_hours = 168
WHERE package_id = 'pkg_7d' AND status = 'available';

-- 7. 30 Days VIP Resident -> KSh 500 (720h)
UPDATE public.campusnet_vouchers
SET amount = 500, duration_hours = 720
WHERE package_id = 'pkg_30d' AND status = 'available';

COMMIT;

-- =============================================================================
-- VERIFICATION QUERY (Run immediately after executing above commands)
-- Every available package must match the canonical Option A price exactly.
-- =============================================================================
SELECT
    package_id,
    COUNT(*) AS pool_count,
    amount AS unit_price_kes,
    duration_hours AS validity_hours
FROM public.campusnet_vouchers
WHERE status = 'available'
GROUP BY package_id, amount, duration_hours
ORDER BY amount ASC;
