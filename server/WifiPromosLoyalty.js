/**
 * =============================================================================
 * MAKOYOCART VENTURES WIFI (CAMPUSNET) - PROMOS & LOYALTY ENGINE
 * Registration: BN-WLSP9KP9 | Founder: Duncan Makoyo | Kisii, Kenya
 *
 * Capabilities:
 * - Mathematical Loyalty Rewards (Earn 5 Stars = 1 Free 24H Pass)
 * - Dynamic Active Promos & Discount Code Advisory
 * - Session Recovery & Pass Status Polling
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ADMIN_TECH_SUPPORT_PHONE = '254758530492';

export const CAMPUSNET_PACKAGES = [
  { id: 'pkg_1h', name: '1 Hour Flash Pass', amount: 10, durationHours: 1, tag: '⚡ Quick Sprint' },
  { id: 'pkg_3h', name: '3 Hours Browsing', amount: 20, durationHours: 3, tag: '⏱️ Pauses on disconnect' },
  { id: 'pkg_24h', name: '24 Hours Unlimited', amount: 40, durationHours: 24, tag: '🔥 Most Popular' },
  { id: 'pkg_3d', name: '3 Days Pass', amount: 80, durationHours: 72, tag: '🎉 Weekend Special' },
  { id: 'pkg_7d', name: '7 Days Unlimited', amount: 150, durationHours: 168, tag: '📚 Exam Week' },
  { id: 'pkg_30d', name: '30 Days VIP Pass', amount: 500, durationHours: 720, tag: '👑 Full Month' }
];

export function normalizePhone(rawPhone) {
  if (!rawPhone) return { clean: '', e164: '', local: '' };
  const digits = rawPhone.replace(/\D/g, '');
  let clean = digits;
  if (digits.startsWith('0') && digits.length === 10) {
    clean = '254' + digits.slice(1);
  } else if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) {
    clean = '254' + digits;
  }
  return {
    clean,
    e164: '+' + clean,
    local: clean.startsWith('254') ? '0' + clean.slice(3) : clean
  };
}

export function formatTimeRemaining(expiryDate) {
  const ms = new Date(expiryDate).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h left`;
  }
  return `${hours}h ${mins}m left`;
}

export function formatDateTimeEAT(dateInput) {
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// ─── 1. Payment Verification & Activation Service ──────────────────────────────
export class PaymentVerificationService {
  constructor(supabaseClient, paystackSecretKey) {
    this.supabase = supabaseClient;
    this.paystackKey = paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
  }

  async verifyAndActivate({ phone, mpesaReceipt, requestedPackageId = 'pkg_24h' }) {
    const { clean: cleanPhone } = normalizePhone(phone);
    const cleanReceipt = (mpesaReceipt || '').trim().toUpperCase();

    if (!cleanPhone) {
      return { success: false, error: 'INVALID_PHONE', message: 'Please provide a valid phone number.' };
    }
    if (!cleanReceipt || cleanReceipt.length < 8) {
      return { success: false, error: 'INVALID_RECEIPT', message: 'Please provide a valid 10-character M-Pesa receipt code (e.g. UIHGQ6VBKC).' };
    }

    const { data: existingTx } = await this.supabase
      .from('campusnet_transactions')
      .select('id, status, voucher_code, phone, amount')
      .eq('mpesa_receipt', cleanReceipt)
      .maybeSingle();

    if (existingTx && existingTx.status === 'completed') {
      const { data: session } = await this.supabase
        .from('campusnet_sessions')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      const validUntil = session?.valid_until || new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      return {
        success: true,
        alreadyProcessed: true,
        voucherCode: existingTx.voucher_code || session?.voucher_code || 'ACTIVE',
        voucherPassword: session?.voucher_password || '123456',
        validUntil,
        expiresTimeFormatted: formatDateTimeEAT(validUntil),
        timeLeft: formatTimeRemaining(validUntil),
        message: `Your pass was previously activated!\n\nVoucher: ${existingTx.voucher_code || session?.voucher_code}\nExpires: ${formatDateTimeEAT(validUntil)}`
      };
    }

    return {
      success: false,
      error: 'TRANSACTION_NOT_CONFIRMED',
      message: `Receipt ${cleanReceipt} not verified yet. Please ensure payment was successful.`
    };
  }
}

// ─── 2. Loyalty Rewards Service (5 Purchases = 1 Free 24h Pass) ───────────────
export class LoyaltyService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async getLoyaltyProfile(phone) {
    const { clean: cleanPhone } = normalizePhone(phone);
    if (!cleanPhone) return { valid: false, stamps: 0, unclaimedRewards: 0 };

    const { data: txs } = await this.supabase
      .from('campusnet_transactions')
      .select('id, amount, created_at')
      .eq('phone', cleanPhone)
      .in('status', ['completed', 'SUCCESS'])
      .gte('amount', 10);

    const totalPaid = (txs || []).length;

    const { data: freeVouchers } = await this.supabase
      .from('campusnet_vouchers')
      .select('id')
      .eq('assigned_phone', cleanPhone)
      .eq('amount', 0);

    const claimedCount = (freeVouchers || []).length;
    const stampsRequired = 5;
    const totalEarned24h = Math.floor(totalPaid / stampsRequired);
    const unclaimedRewards = Math.max(0, totalEarned24h - claimedCount);
    const currentStamps = unclaimedRewards > 0 ? 5 : (totalPaid % stampsRequired);

    return {
      valid: true,
      phone: cleanPhone,
      totalPurchases: totalPaid,
      stamps: currentStamps,
      unclaimedRewards,
      hasUnclaimedReward: unclaimedRewards > 0,
      stampsProgressBar: '★'.repeat(currentStamps) + '☆'.repeat(stampsRequired - currentStamps),
      totalPaidPurchases: totalPaid,
      starsEarned: currentStamps,
      formula: '5_paid_purchases_equals_1_free_pass'
    };
  }

  async calculateLoyalty(phone) {
    return await this.getLoyaltyProfile(phone);
  }

  async claimFreePass(phone) {
    const { clean: cleanPhone } = normalizePhone(phone);
    const profile = await this.getLoyaltyProfile(cleanPhone);

    if (!profile.valid || profile.unclaimedRewards <= 0) {
      return {
        success: false,
        error: 'NOT_ELIGIBLE',
        message: `You currently have ${profile.stamps}/5 stars (${profile.stampsProgressBar}). Buy ${5 - profile.stamps} more pass${(5 - profile.stamps) > 1 ? 'es' : ''} to unlock a Free 24-Hour Pass!`
      };
    }

    const durationHours = 24;
    const now = new Date();
    const validUntil = new Date(now.getTime() + durationHours * 3600 * 1000);

    const { data: voucher } = await this.supabase
      .from('campusnet_vouchers')
      .select('*')
      .eq('package_id', 'pkg_24h')
      .eq('status', 'available')
      .limit(1)
      .maybeSingle();

    const voucherCode = voucher ? voucher.code : `LOYALTY_${cleanPhone.slice(-4)}_${Date.now().toString().slice(-4)}`;
    const voucherPassword = voucher ? voucher.password : '123456';

    if (voucher) {
      await this.supabase
        .from('campusnet_vouchers')
        .update({
          status: 'assigned',
          assigned_phone: cleanPhone,
          amount: 0,
          activated_at: now.toISOString(),
          expires_at: validUntil.toISOString()
        })
        .eq('id', voucher.id);
    } else {
      await this.supabase.from('campusnet_vouchers').insert({
        code: voucherCode,
        password: voucherPassword,
        package_id: 'pkg_24h',
        duration_hours: durationHours,
        amount: 0,
        status: 'assigned',
        assigned_phone: cleanPhone,
        activated_at: now.toISOString(),
        expires_at: validUntil.toISOString()
      });
    }

    await this.supabase.from('campusnet_sessions').upsert({
      phone: cleanPhone,
      mac_address: '00:00:00:00:00:00',
      voucher_code: voucherCode,
      voucher_password: voucherPassword,
      valid_until: validUntil.toISOString()
    }, { onConflict: 'phone' });

    await this.supabase.from('campusnet_transactions').insert({
      reference: `REWARD_${Date.now()}_${cleanPhone.slice(-4)}`,
      phone: cleanPhone,
      mac_address: '00:00:00:00:00:00',
      package_id: 'pkg_24h',
      amount: 0,
      status: 'completed',
      mpesa_receipt: 'REWARD_LOYALTY_FREE_24H',
      voucher_code: voucherCode
    });

    return {
      success: true,
      voucherCode,
      voucherPassword,
      validUntil: validUntil.toISOString(),
      expiresTimeFormatted: formatDateTimeEAT(validUntil),
      message: `🎉 CONGRATULATIONS! Your Free 24-Hour Pass has been activated!\n\nVoucher: ${voucherCode}\nValid until: ${formatDateTimeEAT(validUntil)}`
    };
  }
}

// ─── 3. Active Promos Service ──────────────────────────────────────────────────
export class PromoService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.jsonPath = path.resolve(__dirname, 'data/campusnet_promos.json');
  }

  _readLocalPromos() {
    try {
      if (fs.existsSync(this.jsonPath)) {
        const raw = fs.readFileSync(this.jsonPath, 'utf8');
        return JSON.parse(raw) || [];
      }
    } catch (e) {
      console.warn('[PromoService] Failed to read local promos JSON:', e.message);
    }
    return [];
  }

  _writeLocalPromos(promos) {
    try {
      const dir = path.dirname(this.jsonPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.jsonPath, JSON.stringify(promos, null, 2), 'utf8');
    } catch (e) {
      console.warn('[PromoService] Failed to write local promos JSON:', e.message);
    }
  }

  async getActivePromos() {
    const nowIso = new Date().toISOString();
    const nowTime = Date.now();

    try {
      const { data: promos, error } = await this.supabase
        .from('campusnet_promos')
        .select('*')
        .eq('is_active', true)
        .gte('expires_at', nowIso)
        .order('discount_percent', { ascending: false });

      if (!error && Array.isArray(promos) && promos.length > 0) {
        this._writeLocalPromos(promos);
        return promos;
      }
    } catch (e) {}

    const local = this._readLocalPromos();
    return local.filter(p => {
      if (!p.is_active) return false;
      if (p.expires_at && new Date(p.expires_at).getTime() < nowTime) return false;
      return true;
    });
  }

  async getPromoByCode(code) {
    if (!code || typeof code !== 'string') return null;
    const clean = code.trim().toUpperCase();
    const nowTime = Date.now();

    try {
      const { data: promo, error } = await this.supabase
        .from('campusnet_promos')
        .select('*')
        .eq('code', clean)
        .eq('is_active', true)
        .maybeSingle();

      if (!error && promo) {
        if (!promo.expires_at || new Date(promo.expires_at).getTime() >= nowTime) {
          return promo;
        }
      }
    } catch (e) {}

    const local = this._readLocalPromos();
    const match = local.find(p => p.code === clean && p.is_active);
    if (match) {
      if (!match.expires_at || new Date(match.expires_at).getTime() >= nowTime) {
        return match;
      }
    }

    return null;
  }

  async createPromo({ code, description, discountPercent, discountAmount = 0, durationHours = 24, maxUses = 1 }) {
    if (!code) return { success: false, error: 'Promo code is required.' };
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (Number(durationHours) || 24) * 3600 * 1000).toISOString();
    const cleanCode = code.trim().toUpperCase();

    const payload = {
      id: 'promo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      code: cleanCode,
      description: description || `${discountPercent || 10}% Discount Special`,
      discount_percent: Number(discountPercent) || 0,
      discount_amount: Number(discountAmount) || 0,
      min_amount_kes: 10,
      max_uses_per_phone: Number(maxUses) || 1,
      starts_at: now.toISOString(),
      expires_at: expiresAt,
      is_active: true,
      created_at: now.toISOString()
    };

    const local = this._readLocalPromos();
    const existingIdx = local.findIndex(p => p.code === cleanCode);
    if (existingIdx !== -1) {
      local[existingIdx] = { ...local[existingIdx], ...payload, id: local[existingIdx].id };
    } else {
      local.unshift(payload);
    }
    this._writeLocalPromos(local);

    try {
      const { data, error } = await this.supabase
        .from('campusnet_promos')
        .upsert(payload, { onConflict: 'code' })
        .select()
        .maybeSingle();
      if (!error && data) {
        return { success: true, promo: data };
      }
    } catch (err) {
      console.warn('[PromoService] Supabase promo sync notice:', err.message);
    }

    return { success: true, promo: payload };
  }

  async listAllPromos() {
    let supaPromos = [];
    try {
      const { data, error } = await this.supabase
        .from('campusnet_promos')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        supaPromos = data;
      }
    } catch (e) {}

    const localPromos = this._readLocalPromos();
    const map = new Map();
    localPromos.forEach(p => map.set(p.code, p));
    supaPromos.forEach(p => map.set(p.code, p));

    return Array.from(map.values());
  }

  async togglePromo(promoIdOrCode, isActive) {
    const local = this._readLocalPromos();
    const item = local.find(p => p.id === promoIdOrCode || p.code === promoIdOrCode);
    if (item) {
      item.is_active = !!isActive;
      this._writeLocalPromos(local);
    }

    try {
      await this.supabase
        .from('campusnet_promos')
        .update({ is_active: !!isActive })
        .or(`id.eq.${promoIdOrCode},code.eq.${promoIdOrCode}`);
    } catch (err) {}

    return { success: true, updated: true, is_active: !!isActive };
  }

  async deletePromo(promoIdOrCode) {
    let local = this._readLocalPromos();
    local = local.filter(p => p.id !== promoIdOrCode && p.code !== promoIdOrCode);
    this._writeLocalPromos(local);

    try {
      await this.supabase
        .from('campusnet_promos')
        .delete()
        .or(`id.eq.${promoIdOrCode},code.eq.${promoIdOrCode}`);
    } catch (err) {}

    return { success: true, deleted: true };
  }
}

// ─── 4. Session Recovery Service ───────────────────────────────────────────────
export class SessionRecoveryService {
  constructor(supabaseClient, loyaltyService = null) {
    this.supabase = supabaseClient;
    this.loyalty = loyaltyService;
  }

  async recoverSession(phone) {
    const { clean: cleanPhone, local: localPhone } = normalizePhone(phone);
    if (!cleanPhone) {
      return { success: false, message: 'Please provide the phone number used to make payment.' };
    }

    const sessionResPromise = this.supabase.from('campusnet_sessions').select('*').eq('phone', cleanPhone).maybeSingle();
    const loyaltyPromise = (this.loyalty && typeof this.loyalty.getLoyaltyProfile === 'function')
      ? this.loyalty.getLoyaltyProfile(cleanPhone)
      : Promise.resolve({ valid: false, stamps: 0, unclaimedRewards: 0, hasUnclaimedReward: false, stampsProgressBar: '☆☆☆☆☆' });

    const [sessionRes, loyaltyProfile] = await Promise.all([sessionResPromise, loyaltyPromise]);

    const session = sessionRes.data;
    const now = new Date();
    const isActive = session && new Date(session.valid_until) > now;

    const starsStr = loyaltyProfile.valid ? `\n⭐ Loyalty Stars: ${loyaltyProfile.stamps}/5 (${loyaltyProfile.stampsProgressBar})` : '';
    const claimNotice = loyaltyProfile.hasUnclaimedReward ? `\n🎁 You have an UNCLAIMED Free 24h Pass!` : '';

    if (!session || !isActive) {
      const expiredText = session ? ` (Expired at ${formatDateTimeEAT(session.valid_until)})` : '';
      return {
        success: false,
        hasActiveSession: false,
        loyaltyProfile,
        message: `No active Wi-Fi pass found for ${localPhone}${expiredText}.${starsStr}${claimNotice}\n\nTo connect, buy a pass at http://10.10.0.1/login.html`
      };
    }

    const expiryDate = new Date(session.valid_until);
    const timeLeft = formatTimeRemaining(expiryDate);
    const formattedExpiry = formatDateTimeEAT(expiryDate);

    return {
      success: true,
      hasActiveSession: true,
      voucherCode: session.voucher_code,
      voucherPassword: session.voucher_password || '123456',
      validUntil: session.valid_until,
      expiresTimeFormatted: formattedExpiry,
      timeLeft,
      loyaltyProfile,
      message: `Active Wi-Fi Session Found:\n\n📱 Line: ${localPhone}\n🎟️ Voucher: ${session.voucher_code}\n🔑 PIN: ${session.voucher_password || '123456'}\n⏳ Expires: ${formattedExpiry} (${timeLeft})${starsStr}${claimNotice}`
    };
  }
}
