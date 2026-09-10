-- =============================================================================
-- MAKOYOCART VENTURES WIFI (CAMPUSNET) DATABASE SCHEMA & SEED MIGRATION
-- Registration: BN-WLSP9KP9 | Business: Makoyocart Ventures Wifi
-- Includes: 1 Hour (KSh 10), 3 Hours (KSh 20), 24 Hours (KSh 40), 7 Days (KSh 150), 30 Days (KSh 500)
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

-- 4. Seed Initial 150 Production Vouchers (Including 1-Hour Passes)
INSERT INTO public.campusnet_vouchers (code, password, package_id, duration_hours, amount, status) VALUES
('M1H_HSELZ', '594012', 'pkg_1h', 1, 10, 'available'),
('M1H_MJ3ZF', '749241', 'pkg_1h', 1, 10, 'available'),
('M1H_QY5P9', '879892', 'pkg_1h', 1, 10, 'available'),
('M1H_6TWAD', '646327', 'pkg_1h', 1, 10, 'available'),
('M1H_EXR8Q', '884066', 'pkg_1h', 1, 10, 'available'),
('M1H_QRWH6', '883543', 'pkg_1h', 1, 10, 'available'),
('M1H_MJJTU', '204335', 'pkg_1h', 1, 10, 'available'),
('M1H_E97WW', '270888', 'pkg_1h', 1, 10, 'available'),
('M1H_GBZDZ', '335731', 'pkg_1h', 1, 10, 'available'),
('M1H_8RYQR', '259596', 'pkg_1h', 1, 10, 'available'),
('M1H_K2VMV', '005601', 'pkg_1h', 1, 10, 'available'),
('M1H_8VELX', '372414', 'pkg_1h', 1, 10, 'available'),
('M1H_VZTVF', '441035', 'pkg_1h', 1, 10, 'available'),
('M1H_A5JMA', '216764', 'pkg_1h', 1, 10, 'available'),
('M1H_HYRJY', '450719', 'pkg_1h', 1, 10, 'available'),
('M1H_4KK7Z', '468502', 'pkg_1h', 1, 10, 'available'),
('M1H_SXNWM', '899662', 'pkg_1h', 1, 10, 'available'),
('M1H_D56DL', '845306', 'pkg_1h', 1, 10, 'available'),
('M1H_ZARZ4', '742544', 'pkg_1h', 1, 10, 'available'),
('M1H_U3S3K', '101422', 'pkg_1h', 1, 10, 'available'),
('M1H_MX4AC', '928716', 'pkg_1h', 1, 10, 'available'),
('M1H_43Q5F', '053501', 'pkg_1h', 1, 10, 'available'),
('M1H_5REST', '342646', 'pkg_1h', 1, 10, 'available'),
('M1H_FC3ZT', '078652', 'pkg_1h', 1, 10, 'available'),
('M1H_ZVNHB', '019704', 'pkg_1h', 1, 10, 'available'),
('M1H_R25NS', '112618', 'pkg_1h', 1, 10, 'available'),
('M1H_THK78', '017795', 'pkg_1h', 1, 10, 'available'),
('M1H_SSFLK', '475962', 'pkg_1h', 1, 10, 'available'),
('M1H_HC94D', '572992', 'pkg_1h', 1, 10, 'available'),
('M1H_ABQUG', '011927', 'pkg_1h', 1, 10, 'available'),
('M1H_ZHKBK', '642713', 'pkg_1h', 1, 10, 'available'),
('M1H_E5XWV', '974488', 'pkg_1h', 1, 10, 'available'),
('M1H_8NDBV', '927060', 'pkg_1h', 1, 10, 'available'),
('M1H_JS47H', '905891', 'pkg_1h', 1, 10, 'available'),
('M1H_C5E2V', '743822', 'pkg_1h', 1, 10, 'available'),
('M1H_7BMUC', '416877', 'pkg_1h', 1, 10, 'available'),
('M1H_4FK9U', '797127', 'pkg_1h', 1, 10, 'available'),
('M1H_W77W9', '867063', 'pkg_1h', 1, 10, 'available'),
('M1H_SY8T7', '991322', 'pkg_1h', 1, 10, 'available'),
('M1H_7V6RZ', '984690', 'pkg_1h', 1, 10, 'available'),
('M3H_HHTQE', '218178', 'pkg_3h', 3, 20, 'available'),
('M3H_8K3T4', '741896', 'pkg_3h', 3, 20, 'available'),
('M3H_K8WRV', '610672', 'pkg_3h', 3, 20, 'available'),
('M3H_3TXVU', '846359', 'pkg_3h', 3, 20, 'available'),
('M3H_37W2A', '933712', 'pkg_3h', 3, 20, 'available'),
('M3H_HE7SU', '841166', 'pkg_3h', 3, 20, 'available'),
('M3H_L88LY', '909974', 'pkg_3h', 3, 20, 'available'),
('M3H_GA8N5', '393214', 'pkg_3h', 3, 20, 'available'),
('M3H_FLRW2', '507025', 'pkg_3h', 3, 20, 'available'),
('M3H_LWA55', '174346', 'pkg_3h', 3, 20, 'available'),
('M3H_8YSLD', '565327', 'pkg_3h', 3, 20, 'available'),
('M3H_CH7WG', '291388', 'pkg_3h', 3, 20, 'available'),
('M3H_34M9P', '357552', 'pkg_3h', 3, 20, 'available'),
('M3H_EVEME', '623659', 'pkg_3h', 3, 20, 'available'),
('M3H_GX93F', '735888', 'pkg_3h', 3, 20, 'available'),
('M3H_LWJ5T', '151648', 'pkg_3h', 3, 20, 'available'),
('M3H_EU69Y', '945603', 'pkg_3h', 3, 20, 'available'),
('M3H_8VTYB', '158912', 'pkg_3h', 3, 20, 'available'),
('M3H_D7JU2', '575074', 'pkg_3h', 3, 20, 'available'),
('M3H_8EQKR', '873360', 'pkg_3h', 3, 20, 'available'),
('M3H_XEK6E', '555737', 'pkg_3h', 3, 20, 'available'),
('M3H_FKNLN', '223215', 'pkg_3h', 3, 20, 'available'),
('M3H_56TPB', '065610', 'pkg_3h', 3, 20, 'available'),
('M3H_XSD93', '881055', 'pkg_3h', 3, 20, 'available'),
('M3H_Z5LTC', '510060', 'pkg_3h', 3, 20, 'available'),
('M3H_E9JAF', '680591', 'pkg_3h', 3, 20, 'available'),
('M3H_H4FLP', '576758', 'pkg_3h', 3, 20, 'available'),
('M3H_B78KL', '623007', 'pkg_3h', 3, 20, 'available'),
('M3H_J33S5', '859369', 'pkg_3h', 3, 20, 'available'),
('M3H_WPKSS', '411250', 'pkg_3h', 3, 20, 'available'),
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
('M24H_WVLKR', '668667', 'pkg_24h', 24, 40, 'available'),
('M24H_DDZAF', '878421', 'pkg_24h', 24, 40, 'available'),
('M24H_JNG3E', '140072', 'pkg_24h', 24, 40, 'available'),
('M24H_DY6WU', '074307', 'pkg_24h', 24, 40, 'available'),
('M24H_2L4YB', '353066', 'pkg_24h', 24, 40, 'available'),
('M24H_ETNFW', '232538', 'pkg_24h', 24, 40, 'available'),
('M24H_YN9P6', '774818', 'pkg_24h', 24, 40, 'available'),
('M24H_BS55X', '182681', 'pkg_24h', 24, 40, 'available'),
('M24H_CMFST', '222518', 'pkg_24h', 24, 40, 'available'),
('M24H_LBAV9', '285516', 'pkg_24h', 24, 40, 'available'),
('M24H_8DMR6', '082216', 'pkg_24h', 24, 40, 'available'),
('M24H_3V5NP', '915194', 'pkg_24h', 24, 40, 'available'),
('M24H_QEB6X', '084957', 'pkg_24h', 24, 40, 'available'),
('M24H_Z4QYP', '552862', 'pkg_24h', 24, 40, 'available'),
('M24H_9DKZP', '890832', 'pkg_24h', 24, 40, 'available'),
('M24H_YTGT2', '843724', 'pkg_24h', 24, 40, 'available'),
('M24H_DHNYH', '144397', 'pkg_24h', 24, 40, 'available'),
('M24H_SQJAU', '147147', 'pkg_24h', 24, 40, 'available'),
('M24H_2396A', '076575', 'pkg_24h', 24, 40, 'available'),
('M24H_XETLW', '765658', 'pkg_24h', 24, 40, 'available'),
('M24H_TFAC6', '037561', 'pkg_24h', 24, 40, 'available'),
('M24H_8VNHR', '355463', 'pkg_24h', 24, 40, 'available'),
('M24H_9PEVP', '028229', 'pkg_24h', 24, 40, 'available'),
('M24H_K3PJK', '615747', 'pkg_24h', 24, 40, 'available'),
('M24H_5TNRC', '127702', 'pkg_24h', 24, 40, 'available'),
('M24H_N66E9', '587561', 'pkg_24h', 24, 40, 'available'),
('M24H_8CR8T', '533036', 'pkg_24h', 24, 40, 'available'),
('M24H_QF2AV', '688606', 'pkg_24h', 24, 40, 'available'),
('M24H_NUTNC', '457124', 'pkg_24h', 24, 40, 'available'),
('M24H_BT6YS', '249732', 'pkg_24h', 24, 40, 'available'),
('M24H_WUGPD', '857153', 'pkg_24h', 24, 40, 'available'),
('M24H_DRBW3', '108151', 'pkg_24h', 24, 40, 'available'),
('M24H_MCMYB', '747375', 'pkg_24h', 24, 40, 'available'),
('M24H_7N2Q2', '566951', 'pkg_24h', 24, 40, 'available'),
('M24H_TZ5TC', '109013', 'pkg_24h', 24, 40, 'available'),
('M24H_SQ9KH', '453999', 'pkg_24h', 24, 40, 'available'),
('M24H_5VL7F', '617429', 'pkg_24h', 24, 40, 'available'),
('M24H_REAYG', '643821', 'pkg_24h', 24, 40, 'available'),
('M24H_3NWG6', '861741', 'pkg_24h', 24, 40, 'available'),
('M24H_QYGFV', '976120', 'pkg_24h', 24, 40, 'available'),
('M7D_M3N96', '070894', 'pkg_7d', 168, 150, 'available'),
('M7D_8JNAK', '044448', 'pkg_7d', 168, 150, 'available'),
('M7D_A23VJ', '844144', 'pkg_7d', 168, 150, 'available'),
('M7D_T7G63', '728745', 'pkg_7d', 168, 150, 'available'),
('M7D_HPUJ8', '190668', 'pkg_7d', 168, 150, 'available'),
('M7D_BK274', '950569', 'pkg_7d', 168, 150, 'available'),
('M7D_T8PP3', '533955', 'pkg_7d', 168, 150, 'available'),
('M7D_3S8NS', '587296', 'pkg_7d', 168, 150, 'available'),
('M7D_33XN6', '352035', 'pkg_7d', 168, 150, 'available'),
('M7D_WFV2F', '706687', 'pkg_7d', 168, 150, 'available'),
('M7D_4QSVC', '182839', 'pkg_7d', 168, 150, 'available'),
('M7D_S8LLD', '789717', 'pkg_7d', 168, 150, 'available'),
('M7D_KZRC7', '381689', 'pkg_7d', 168, 150, 'available'),
('M7D_Z66DU', '066987', 'pkg_7d', 168, 150, 'available'),
('M7D_WFJN2', '500680', 'pkg_7d', 168, 150, 'available'),
('M7D_FEQE5', '298033', 'pkg_7d', 168, 150, 'available'),
('M7D_FHP4A', '987658', 'pkg_7d', 168, 150, 'available'),
('M7D_MQDZ8', '881034', 'pkg_7d', 168, 150, 'available'),
('M7D_SQWR7', '842724', 'pkg_7d', 168, 150, 'available'),
('M7D_G6LTF', '587916', 'pkg_7d', 168, 150, 'available'),
('M30D_EFKY6', '283109', 'pkg_30d', 720, 500, 'available'),
('M30D_YDPPX', '035108', 'pkg_30d', 720, 500, 'available'),
('M30D_4PE79', '301370', 'pkg_30d', 720, 500, 'available'),
('M30D_BZBSM', '125344', 'pkg_30d', 720, 500, 'available'),
('M30D_RQKF5', '530321', 'pkg_30d', 720, 500, 'available'),
('M30D_J3LGR', '043255', 'pkg_30d', 720, 500, 'available'),
('M30D_J7FLP', '063834', 'pkg_30d', 720, 500, 'available'),
('M30D_CTVBZ', '890906', 'pkg_30d', 720, 500, 'available'),
('M30D_5R7G3', '116866', 'pkg_30d', 720, 500, 'available'),
('M30D_J3WFB', '851891', 'pkg_30d', 720, 500, 'available')
ON CONFLICT (code) DO NOTHING;
