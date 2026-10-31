/**
 * =============================================================================
 * MAKOYOCART VENTURES WIFI (CAMPUSNET) - SINGLE-SOURCE CATALOG & NETWORK ENGINE
 * Registration: BN-WLSP9KP9 | Founder: Duncan Makoyo | Kisii, Kenya
 *
 * Rules Enforced:
 * 1. Option A Pricing + Mode 1 (12-Hour Night Owl 6PM-6AM Pass at KSh 30).
 * 2. Zero Pausing: All packages run continuous wall-clock validity from payment.
 * 3. Night Owl Sale Window: Sold strictly 6:00 PM -> 6:00 AM EAT (saleWindow).
 * 4. Zero Free Internet: Every session must map to a verified paid transaction (>= KSh 10).
 * 5. Dual Mobile Money Support: Safaricom M-Pesa ('mpesa') + Airtel Money ('atl').
 * =============================================================================
 */

export const PACKAGES = [
  {
    id: 'pkg_1h',
    prefix: 'M1H',
    name: '1 Hour Flash Pass',
    amount: 10,
    duration_hours: 1,
    durationHours: 1,
    uptime_limit: '1h',
    tag: 'Quick Sprint ⚡',
    description: '1 hour continuous high-speed Wi-Fi from activation'
  },
  {
    id: 'pkg_3h',
    prefix: 'M3H',
    name: '3 Hours Study Sprint',
    amount: 20,
    duration_hours: 3,
    durationHours: 3,
    uptime_limit: '3h',
    tag: 'Study Sprint 📚',
    description: '3 hours continuous high-speed Wi-Fi from activation'
  },
  {
    id: 'pkg_12h',
    prefix: 'M12H',
    name: '12 Hours Night Owl',
    amount: 30,
    duration_hours: 12,
    durationHours: 12,
    uptime_limit: '12h',
    saleWindow: { startHourEat: 18, endHourEat: 6 },
    tag: '6PM–6AM Special 🌙',
    description: '12 hours continuous overnight Wi-Fi (Sold 6PM – 6AM EAT)'
  },
  {
    id: 'pkg_24h',
    prefix: 'M24H',
    name: '24 Hours Unlimited',
    amount: 50,
    duration_hours: 24,
    durationHours: 24,
    uptime_limit: '24h',
    tag: 'Most Popular 🔥',
    description: '24 hours continuous high-speed Wi-Fi from activation'
  },
  {
    id: 'pkg_3d',
    prefix: 'M3D',
    name: '3 Days Mega Pack',
    amount: 100,
    duration_hours: 72,
    durationHours: 72,
    uptime_limit: '3d',
    tag: 'Weekend Special ⚡',
    description: '3 days (72 hours) continuous high-speed Wi-Fi from activation'
  },
  {
    id: 'pkg_7d',
    prefix: 'M7D',
    name: '7 Days Mega Pack',
    amount: 180,
    duration_hours: 168,
    durationHours: 168,
    uptime_limit: '7d',
    tag: 'Best Value 🚀',
    description: '7 days (168 hours) continuous high-speed Wi-Fi from activation'
  },
  {
    id: 'pkg_30d',
    prefix: 'M30D',
    name: '30 Days VIP Resident',
    amount: 500,
    duration_hours: 720,
    durationHours: 720,
    uptime_limit: '30d',
    tag: 'VIP Monthly 👑',
    description: '30 days full month continuous high-speed Wi-Fi from activation'
  }
];

export const CAMPUSNET_PACKAGES = PACKAGES;

export const PACKAGE_BY_ID = Object.fromEntries(PACKAGES.map((p) => [p.id, p]));

export function getPackageById(packageId) {
  return PACKAGE_BY_ID[packageId] || null;
}

/**
 * Checks whether a package with a `saleWindow` (e.g. Night Owl 6PM -> 6AM EAT)
 * can be purchased at the given timestamp.
 */
export function isWithinSaleWindow(pkgOrId, nowDate = new Date()) {
  const pkg = typeof pkgOrId === 'string' ? getPackageById(pkgOrId) : pkgOrId;
  if (!pkg || !pkg.saleWindow) {
    return { open: true };
  }

  const ts = nowDate instanceof Date ? nowDate.getTime() : Number(nowDate);
  // East Africa Time (EAT) is UTC+3
  const eatDate = new Date(ts + 3 * 60 * 60 * 1000);
  const eatHour = eatDate.getUTCHours();
  const { startHourEat, endHourEat } = pkg.saleWindow;

  const isOpen =
    startHourEat > endHourEat
      ? eatHour >= startHourEat || eatHour < endHourEat
      : eatHour >= startHourEat && eatHour < endHourEat;

  if (!isOpen) {
    return {
      open: false,
      eatHour,
      reason: `${pkg.name} is only sold between 6:00 PM and 6:00 AM EAT. Please pick 1 Hour (KSh 10), 3 Hours (KSh 20), or 24 Hours (KSh 50) during daytime hours.`
    };
  }

  return { open: true, eatHour };
}

/**
 * Resolves package strictly from an explicit packageId and verifies that the paid amount
 * covers the package price. Never guesses a package from bare amount.
 */
export function resolvePackageFromPayment({ packageId, paidAmountKes }) {
  const paid = Math.round(Number(paidAmountKes || 0));
  if (paid < 10 || !packageId) return null;

  const requested = getPackageById(packageId);
  if (!requested) return null;

  if (paid < requested.amount) {
    return null;
  }

  return requested;
}

/**
 * Resolves package from a voucher code prefix (e.g. M12H_XXXXX -> pkg_12h).
 */
export function resolvePackageFromVoucherCode(voucherCode) {
  if (!voucherCode || typeof voucherCode !== 'string') return PACKAGE_BY_ID.pkg_1h;
  const upper = voucherCode.trim().toUpperCase();
  for (const pkg of PACKAGES) {
    if (upper.startsWith(pkg.prefix + '_') || upper.startsWith(pkg.prefix)) {
      return pkg;
    }
  }
  return PACKAGE_BY_ID.pkg_1h;
}

/**
 * Normalizes Kenyan phone numbers to 254XXXXXXXXX (12 digits), +254XXXXXXXXX, and 0XXXXXXXXX.
 */
export function formatPhone(phone) {
  if (!phone) return { clean: '', formatted: '', local: '', valid: false };
  const cleaned = String(phone).replace(/\D/g, '');
  let clean = cleaned;

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    clean = '254' + cleaned.slice(1);
  } else if ((cleaned.startsWith('7') || cleaned.startsWith('1')) && cleaned.length === 9) {
    clean = '254' + cleaned;
  } else if (cleaned.startsWith('2540') && cleaned.length === 13) {
    clean = '254' + cleaned.slice(4);
  }

  const valid = /^254[17]\d{8}$/.test(clean);
  return {
    clean,
    formatted: clean ? '+' + clean : '',
    local: clean.startsWith('254') ? '0' + clean.slice(3) : clean,
    valid
  };
}

/**
 * Detects whether a Kenyan number belongs to Safaricom M-Pesa ('mpesa') or Airtel Money ('atl').
 * Paystack Charge API requires provider='atl' for Airtel Money in Kenya and provider='mpesa' for Safaricom.
 */
export function detectMobileMoneyProvider(phone, explicitProvider = null) {
  if (explicitProvider && typeof explicitProvider === 'string') {
    const norm = explicitProvider.trim().toLowerCase();
    if (norm === 'atl' || norm === 'airtel' || norm === 'atl_ke' || norm === 'airtel_money') {
      return { provider: 'atl', label: 'Airtel Money', network: 'airtel' };
    }
    if (norm === 'mpesa' || norm === 'm-pesa' || norm === 'safaricom') {
      return { provider: 'mpesa', label: 'M-Pesa', network: 'safaricom' };
    }
  }

  const { clean } = formatPhone(phone);
  const prefix3 = clean.startsWith('254') ? clean.slice(3, 6) : '';
  const pNum = Number(prefix3);

  // Airtel Kenya prefixes: 0730-0739, 0750-0756, 0762, 0780-0789, 0100-0109
  const isAirtel =
    (pNum >= 730 && pNum <= 739) ||
    (pNum >= 750 && pNum <= 756) ||
    pNum === 762 ||
    (pNum >= 780 && pNum <= 789) ||
    (pNum >= 100 && pNum <= 109);

  if (isAirtel) {
    return { provider: 'atl', label: 'Airtel Money', network: 'airtel' };
  }

  return { provider: 'mpesa', label: 'M-Pesa', network: 'safaricom' };
}

/**
 * Validates voucher code / password / profile before emitting RouterOS script lines.
 */
export function isValidRouterIdentifier(value, type = 'code') {
  if (!value || typeof value !== 'string') return false;
  if (type === 'code') return /^[A-Za-z0-9_-]{3,32}$/.test(value);
  if (type === 'password') return /^[A-Za-z0-9]{4,16}$/.test(value);
  if (type === 'profile') return /^pkg_(1h|3h|12h|24h|3d|7d|30d)$/.test(value);
  return false;
}

