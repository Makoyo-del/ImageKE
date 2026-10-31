/**
 * =============================================================================
 * MAKOYOCART VENTURES WIFI (CAMPUSNET) - SESSION RECOVERY & PAYMENT VERIFICATION
 * Registration: BN-WLSP9KP9 | Founder: Duncan Makoyo | Kisii, Kenya
 *
 * Rules Enforced:
 * - Single-source catalog imported from ./campusnet/catalog.js
 * - Zero Free Passes / Zero Hardcoded Promos (FRESHER2026 removed)
 * =============================================================================
 */

import { PACKAGES, formatPhone } from './campusnet/catalog.js';

export const ADMIN_TECH_SUPPORT_PHONE = '254794877125';

export const CAMPUSNET_PACKAGES = PACKAGES;

export function normalizePhone(rawPhone) {
  const { clean, formatted, local } = formatPhone(rawPhone);
  return {
    clean,
    e164: formatted,
    local
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

  async verifyAndActivate({ phone, mpesaReceipt }) {
    const { clean: cleanPhone } = normalizePhone(phone);
    const cleanReceipt = (mpesaReceipt || '').trim().toUpperCase();

    if (!cleanPhone) {
      return { success: false, error: 'INVALID_PHONE', message: 'Please provide a valid phone number.' };
    }
    if (!cleanReceipt || cleanReceipt.length < 8) {
      return { success: false, error: 'INVALID_RECEIPT', message: 'Please provide a valid 10-character receipt code.' };
    }

    const { data: existingTx } = await this.supabase
      .from('campusnet_transactions')
      .select('id, status, voucher_code, phone, amount')
      .eq('mpesa_receipt', cleanReceipt)
      .maybeSingle();

    if (existingTx && existingTx.status === 'completed') {
      if (existingTx.phone && existingTx.phone !== cleanPhone) {
        return {
          success: false,
          error: 'PHONE_MISMATCH',
          message: 'This receipt belongs to a different phone number.'
        };
      }

      const { data: session } = await this.supabase
        .from('campusnet_sessions')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!session || new Date(session.valid_until) <= new Date()) {
        return {
          success: false,
          error: 'SESSION_EXPIRED',
          message: 'This pass has already expired.'
        };
      }

      const validUntil = session.valid_until;
      return {
        success: true,
        alreadyProcessed: true,
        voucherCode: existingTx.voucher_code || session.voucher_code,
        voucherPassword: session.voucher_password,
        validUntil,
        expiresTimeFormatted: formatDateTimeEAT(validUntil),
        timeLeft: formatTimeRemaining(validUntil),
        message: `Your pass is active!\n\nVoucher: ${existingTx.voucher_code || session.voucher_code}\nExpires: ${formatDateTimeEAT(validUntil)}`
      };
    }

    return {
      success: false,
      error: 'TRANSACTION_NOT_CONFIRMED',
      message: `Receipt ${cleanReceipt} not verified yet. Please ensure payment was successful.`
    };
  }
}

// ─── 2. Loyalty Service (Free Passes Disabled) ────────────────────────────────
export class LoyaltyService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async getLoyaltyProfile(phone) {
    const { clean: cleanPhone } = normalizePhone(phone);
    return {
      valid: Boolean(cleanPhone),
      phone: cleanPhone,
      totalPurchases: 0,
      stamps: 0,
      unclaimedRewards: 0,
      hasUnclaimedReward: false,
      stampsProgressBar: '☆☆☆☆☆'
    };
  }

  async calculateLoyalty(phone) {
    return await this.getLoyaltyProfile(phone);
  }

  async claimFreePass(_phone) {
    return {
      success: false,
      error: 'FREE_PASSES_DISABLED',
      message: 'Free passes are disabled. Please select a paid Wi-Fi pass at http://10.10.0.1/login.html'
    };
  }
}

// ─── 3. Promo Service (Promos Disabled - Standard Rates Only) ──────────────────
export class PromoService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async getActivePromos() {
    return [];
  }

  async getPromoByCode(_code) {
    return null;
  }

  async listAllPromos() {
    return [];
  }
}

// ─── 4. Session Recovery Service ───────────────────────────────────────────────
export class SessionRecoveryService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async recoverSession(phone) {
    const { clean: cleanPhone, local: localPhone } = normalizePhone(phone);
    if (!cleanPhone) {
      return { success: false, message: 'Please provide the phone number used to make payment.' };
    }

    const { data: session } = await this.supabase
      .from('campusnet_sessions')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    const now = new Date();
    const isActive = session && new Date(session.valid_until) > now;

    if (!session || !isActive) {
      const expiredText = session ? ` (Expired at ${formatDateTimeEAT(session.valid_until)})` : '';
      return {
        success: false,
        hasActiveSession: false,
        message: `No active Wi-Fi pass found for ${localPhone}${expiredText}.\n\nTo connect, buy a pass at http://10.10.0.1/login.html`
      };
    }

    const expiryDate = new Date(session.valid_until);
    const timeLeft = formatTimeRemaining(expiryDate);
    const formattedExpiry = formatDateTimeEAT(expiryDate);

    return {
      success: true,
      hasActiveSession: true,
      voucherCode: session.voucher_code,
      voucherPassword: session.voucher_password,
      validUntil: session.valid_until,
      expiresTimeFormatted: formattedExpiry,
      timeLeft,
      message: `Active Wi-Fi Session Found:\n\n📱 Line: ${localPhone}\n🎟️ Voucher: ${session.voucher_code}\n🔑 PIN: ${session.voucher_password}\n⏳ Expires: ${formattedExpiry} (${timeLeft})`
    };
  }
}
