-- =============================================================================
-- MAKOYOCART VENTURES WIFI (CAMPUSNET) DATABASE SCHEMA & SEED MIGRATION
-- Registration: BN-WLSP9KP9 | Business: CampusNet High-Speed Wi-Fi
-- Safe, Idempotent, No Duplicate Conflicts, Strict RLS Policies
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Wi-Fi Voucher Inventory Pool Table
CREATE TABLE IF NOT EXISTS public.campusnet_vouchers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    package_id TEXT NOT NULL,
    duration_hours INTEGER NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'assigned', 'expired')),
    assigned_phone TEXT,
    assigned_mac TEXT,
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on campusnet_vouchers
ALTER TABLE public.campusnet_vouchers ENABLE ROW LEVEL SECURITY;

-- Policies for campusnet_vouchers (Service role bypasses RLS; protect public reads)
DROP POLICY IF EXISTS "Service role has full access to campusnet_vouchers" ON public.campusnet_vouchers;
CREATE POLICY "Service role has full access to campusnet_vouchers" ON public.campusnet_vouchers
    FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow public read of available voucher counts" ON public.campusnet_vouchers;
CREATE POLICY "Allow public read of available voucher counts" ON public.campusnet_vouchers
    FOR SELECT USING (status = 'available');

-- 2. Wi-Fi Transactions Log Table
CREATE TABLE IF NOT EXISTS public.campusnet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    mac_address TEXT NOT NULL,
    package_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    paystack_reference TEXT,
    mpesa_receipt TEXT,
    voucher_code TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on campusnet_transactions
ALTER TABLE public.campusnet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to campusnet_transactions" ON public.campusnet_transactions;
CREATE POLICY "Service role has full access to campusnet_transactions" ON public.campusnet_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- 3. Active Phone Sessions Table (Defeats Android/iOS MAC Randomization)
CREATE TABLE IF NOT EXISTS public.campusnet_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    mac_address TEXT NOT NULL,
    voucher_code TEXT NOT NULL,
    voucher_password TEXT NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on campusnet_sessions
ALTER TABLE public.campusnet_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to campusnet_sessions" ON public.campusnet_sessions;
CREATE POLICY "Service role has full access to campusnet_sessions" ON public.campusnet_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Indexes for lightning queries
CREATE INDEX IF NOT EXISTS idx_campusnet_vouchers_pkg_status ON public.campusnet_vouchers (package_id, status);
CREATE INDEX IF NOT EXISTS idx_campusnet_transactions_ref ON public.campusnet_transactions (reference);
CREATE INDEX IF NOT EXISTS idx_campusnet_sessions_phone ON public.campusnet_sessions (phone);

-- 4. Seed 100 Initial Production Vouchers (Idempotent ON CONFLICT DO NOTHING)
INSERT INTO public.campusnet_vouchers (code, password, package_id, duration_hours, amount, status) VALUES
('M3H_HSELZ', '594012', 'pkg_3h', 3, 20, 'available'),
('M3H_MJ3ZF', '749241', 'pkg_3h', 3, 20, 'available'),
('M3H_QY5P9', '879892', 'pkg_3h', 3, 20, 'available'),
('M3H_6TWAD', '646327', 'pkg_3h', 3, 20, 'available'),
('M3H_EXR8Q', '884066', 'pkg_3h', 3, 20, 'available'),
('M3H_QRWH6', '883543', 'pkg_3h', 3, 20, 'available'),
('M3H_MJJTU', '204335', 'pkg_3h', 3, 20, 'available'),
('M3H_E97WW', '270888', 'pkg_3h', 3, 20, 'available'),
('M3H_GBZDZ', '335731', 'pkg_3h', 3, 20, 'available'),
('M3H_8RYQR', '259596', 'pkg_3h', 3, 20, 'available'),
('M3H_K2VMV', '005601', 'pkg_3h', 3, 20, 'available'),
('M3H_8VELX', '372414', 'pkg_3h', 3, 20, 'available'),
('M3H_VZTVF', '441035', 'pkg_3h', 3, 20, 'available'),
('M3H_A5JMA', '216764', 'pkg_3h', 3, 20, 'available'),
('M3H_HYRJY', '450719', 'pkg_3h', 3, 20, 'available'),
('M3H_4KK7Z', '468502', 'pkg_3h', 3, 20, 'available'),
('M3H_SXNWM', '899662', 'pkg_3h', 3, 20, 'available'),
('M3H_D56DL', '845306', 'pkg_3h', 3, 20, 'available'),
('M3H_ZARZ4', '742544', 'pkg_3h', 3, 20, 'available'),
('M3H_U3S3K', '101422', 'pkg_3h', 3, 20, 'available'),
('M3H_MX4AC', '928716', 'pkg_3h', 3, 20, 'available'),
('M3H_43Q5F', '053501', 'pkg_3h', 3, 20, 'available'),
('M3H_5REST', '342646', 'pkg_3h', 3, 20, 'available'),
('M3H_FC3ZT', '078652', 'pkg_3h', 3, 20, 'available'),
('M3H_ZVNHB', '019704', 'pkg_3h', 3, 20, 'available'),
('M3H_R25NS', '112618', 'pkg_3h', 3, 20, 'available'),
('M3H_THK78', '017795', 'pkg_3h', 3, 20, 'available'),
('M3H_SSFLK', '475962', 'pkg_3h', 3, 20, 'available'),
('M3H_HC94D', '572992', 'pkg_3h', 3, 20, 'available'),
('M3H_ABQUG', '011927', 'pkg_3h', 3, 20, 'available'),
('M24H_ZHKBK', '642713', 'pkg_24h', 24, 40, 'available'),
('M24H_E5XWV', '974488', 'pkg_24h', 24, 40, 'available'),
('M24H_8NDBV', '927060', 'pkg_24h', 24, 40, 'available'),
('M24H_JS47H', '905891', 'pkg_24h', 24, 40, 'available'),
('M24H_C5E2V', '743822', 'pkg_24h', 24, 40, 'available'),
('M24H_7BMUC', '416877', 'pkg_24h', 24, 40, 'available'),
('M24H_4FK9U', '797127', 'pkg_24h', 24, 40, 'available'),
('M24H_W77W9', '867063', 'pkg_24h', 24, 40, 'available'),
('M24H_SY8T7', '991322', 'pkg_24h', 24, 40, 'available'),
('M24H_7V6RZ', '984690', 'pkg_24h', 24, 40, 'available'),
('M24H_HHTQE', '218178', 'pkg_24h', 24, 40, 'available'),
('M24H_8K3T4', '741896', 'pkg_24h', 24, 40, 'available'),
('M24H_K8WRV', '610672', 'pkg_24h', 24, 40, 'available'),
('M24H_3TXVU', '846359', 'pkg_24h', 24, 40, 'available'),
('M24H_37W2A', '933712', 'pkg_24h', 24, 40, 'available'),
('M24H_HE7SU', '841166', 'pkg_24h', 24, 40, 'available'),
('M24H_L88LY', '909974', 'pkg_24h', 24, 40, 'available'),
('M24H_GA8N5', '393214', 'pkg_24h', 24, 40, 'available'),
('M24H_FLRW2', '507025', 'pkg_24h', 24, 40, 'available'),
('M24H_LWA55', '174346', 'pkg_24h', 24, 40, 'available'),
('M24H_8YSLD', '565327', 'pkg_24h', 24, 40, 'available'),
('M24H_CH7WG', '291388', 'pkg_24h', 24, 40, 'available'),
('M24H_34M9P', '357552', 'pkg_24h', 24, 40, 'available'),
('M24H_EVEME', '623659', 'pkg_24h', 24, 40, 'available'),
('M24H_GX93F', '735888', 'pkg_24h', 24, 40, 'available'),
('M24H_LWJ5T', '151648', 'pkg_24h', 24, 40, 'available'),
('M24H_EU69Y', '945603', 'pkg_24h', 24, 40, 'available'),
('M24H_8VTYB', '158912', 'pkg_24h', 24, 40, 'available'),
('M24H_D7JU2', '575074', 'pkg_24h', 24, 40, 'available'),
('M24H_8EQKR', '873360', 'pkg_24h', 24, 40, 'available'),
('M24H_XEK6E', '555737', 'pkg_24h', 24, 40, 'available'),
('M24H_FKNLN', '223215', 'pkg_24h', 24, 40, 'available'),
('M24H_56TPB', '065610', 'pkg_24h', 24, 40, 'available'),
('M24H_XSD93', '881055', 'pkg_24h', 24, 40, 'available'),
('M24H_Z5LTC', '510060', 'pkg_24h', 24, 40, 'available'),
('M24H_E9JAF', '680591', 'pkg_24h', 24, 40, 'available'),
('M24H_H4FLP', '576758', 'pkg_24h', 24, 40, 'available'),
('M24H_B78KL', '623007', 'pkg_24h', 24, 40, 'available'),
('M24H_J33S5', '859369', 'pkg_24h', 24, 40, 'available'),
('M24H_WPKSS', '411250', 'pkg_24h', 24, 40, 'available'),
('M24H_KDRXX', '722817', 'pkg_24h', 24, 40, 'available'),
('M24H_UA27U', '237087', 'pkg_24h', 24, 40, 'available'),
('M24H_9RWJV', '407531', 'pkg_24h', 24, 40, 'available'),
('M24H_G2CPL', '474219', 'pkg_24h', 24, 40, 'available'),
('M24H_7DEUZ', '023603', 'pkg_24h', 24, 40, 'available'),
('M24H_AENJY', '537225', 'pkg_24h', 24, 40, 'available'),
('M24H_UY7TQ', '113620', 'pkg_24h', 24, 40, 'available'),
('M24H_X6C7T', '394877', 'pkg_24h', 24, 40, 'available'),
('M24H_83HLT', '264560', 'pkg_24h', 24, 40, 'available'),
('M24H_DD7PW', '297421', 'pkg_24h', 24, 40, 'available'),
('M7D_WVLKR', '668667', 'pkg_7d', 168, 150, 'available'),
('M7D_DDZAF', '878421', 'pkg_7d', 168, 150, 'available'),
('M7D_JNG3E', '140072', 'pkg_7d', 168, 150, 'available'),
('M7D_DY6WU', '074307', 'pkg_7d', 168, 150, 'available'),
('M7D_2L4YB', '353066', 'pkg_7d', 168, 150, 'available'),
('M7D_ETNFW', '232538', 'pkg_7d', 168, 150, 'available'),
('M7D_YN9P6', '774818', 'pkg_7d', 168, 150, 'available'),
('M7D_BS55X', '182681', 'pkg_7d', 168, 150, 'available'),
('M7D_CMFST', '222518', 'pkg_7d', 168, 150, 'available'),
('M7D_LBAV9', '285516', 'pkg_7d', 168, 150, 'available'),
('M7D_8DMR6', '082216', 'pkg_7d', 168, 150, 'available'),
('M7D_3V5NP', '915194', 'pkg_7d', 168, 150, 'available'),
('M7D_QEB6X', '084957', 'pkg_7d', 168, 150, 'available'),
('M7D_Z4QYP', '552862', 'pkg_7d', 168, 150, 'available'),
('M7D_9DKZP', '890832', 'pkg_7d', 168, 150, 'available'),
('M7D_YTGT2', '843724', 'pkg_7d', 168, 150, 'available'),
('M7D_DHNYH', '144397', 'pkg_7d', 168, 150, 'available'),
('M7D_SQJAU', '147147', 'pkg_7d', 168, 150, 'available'),
('M7D_2396A', '076575', 'pkg_7d', 168, 150, 'available'),
('M7D_XETLW', '765658', 'pkg_7d', 168, 150, 'available')
ON CONFLICT (code) DO NOTHING;
