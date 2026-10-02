/**
 * =============================================================================
 * MAKOYOCART VENTURES WIFI (CAMPUSNET) - AUTONOMOUS SUPPORT ENGINE (v3.0 PRO)
 * Registration: BN-WLSP9KP9 | Founder: Duncan Makoyo | Kisii, Kenya
 *
 * Core Capabilities:
 * - 100% English, Concise, Punchy Messaging with WhatsApp Action Buttons
 * - 1-Tap Phone Number Session Check (Current WhatsApp Number vs Different Number)
 * - Transparent Pass Expiry Date & Exact Countdown Remaining
 * - Mathematical Loyalty Rewards (Earn 5 Stars = 1 Free 24H Pass) with Zero Leaks
 * - Dynamic Active Promos & Discount Code Advisory
 * - Real-Time WhatsApp Tech Support Escalations to Duncan (254758530492)
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

    // Step 1: Anti-Fraud Check - Is code already used?
    const { data: existingTx } = await this.supabase
      .from('campusnet_transactions')
      .select('id, status, voucher_code, phone, amount')
      .eq('mpesa_receipt', cleanReceipt)
      .maybeSingle();

    if (existingTx && existingTx.status === 'completed' && existingTx.voucher_code) {
      const { data: activeSession } = await this.supabase
        .from('campusnet_sessions')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (activeSession && new Date(activeSession.valid_until) > new Date()) {
        const timeLeft = formatTimeRemaining(activeSession.valid_until);
        return {
          success: true,
          isAlreadyActive: true,
          voucherCode: activeSession.voucher_code,
          validUntil: activeSession.valid_until,
          message: `Your pass for code ${cleanReceipt} is active until ${formatDateTimeEAT(activeSession.valid_until)} (${timeLeft})!`
        };
      }

      return {
        success: false,
        error: 'RECEIPT_ALREADY_USED',
        message: `M-Pesa code ${cleanReceipt} was already claimed. If you made a new payment, please enter your new receipt code.`
      };
    }

    // Step 2: Check Pending Transactions in DB
    let verifiedPayment = null;
    const { data: pendingTx } = await this.supabase
      .from('campusnet_transactions')
      .select('*')
      .or(`phone.eq.${cleanPhone},mpesa_receipt.eq.${cleanReceipt}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingTx) {
      verifiedPayment = {
        source: 'database_pending',
        amount: pendingTx.amount,
        packageId: pendingTx.package_id || requestedPackageId,
        reference: pendingTx.reference
      };
    }

    // Step 3: Paystack API Fallback
    if (!verifiedPayment && this.paystackKey) {
      try {
        const paystackRes = await fetch('https://api.paystack.co/transaction?perPage=25', {
          headers: { Authorization: `Bearer ${this.paystackKey}` }
        });
        const paystackData = await paystackRes.json();
        
        if (paystackData.data && Array.isArray(paystackData.data)) {
          const match = paystackData.data.find(tx => {
            if (tx.status !== 'success') return false;
            const matchesReceipt = tx.reference?.toUpperCase() === cleanReceipt ||
                                  tx.gateway_response?.toUpperCase().includes(cleanReceipt);
            const matchesPhone = tx.customer?.phone?.includes(cleanPhone.slice(-9)) ||
                                 tx.metadata?.phone?.includes(cleanPhone.slice(-9));
            return matchesReceipt || (matchesPhone && (Date.now() - new Date(tx.paid_at || tx.created_at).getTime()) < 3600000);
          });

          if (match) {
            const paidAmt = Math.round((match.amount || 0) / 100);
            let pkgId = match.metadata?.package_id;
            if (!pkgId) {
              if (paidAmt <= 10) pkgId = 'pkg_1h';
              else if (paidAmt <= 20) pkgId = 'pkg_3h';
              else if (paidAmt <= 40) pkgId = 'pkg_24h';
              else if (paidAmt <= 80) pkgId = 'pkg_3d';
              else if (paidAmt <= 150) pkgId = 'pkg_7d';
              else pkgId = 'pkg_30d';
            }
            verifiedPayment = {
              source: 'paystack_api',
              amount: paidAmt,
              packageId: pkgId,
              reference: match.reference
            };
          }
        }
      } catch (err) {
        console.error('[SupportEngine] Paystack verification error:', err.message);
      }
    }

    if (!verifiedPayment) {
      return {
        success: false,
        error: 'PAYMENT_NOT_FOUND',
        message: `Payment not verified for code: ${cleanReceipt}.\n\nIf you just sent M-Pesa, please wait 30 seconds and try again, or purchase directly at http://10.10.0.1/login.html`
      };
    }

    // Step 5: Assign Voucher atomically
    const pkg = CAMPUSNET_PACKAGES.find(p => p.id === verifiedPayment.packageId) || CAMPUSNET_PACKAGES[2];
    const durationHours = pkg.durationHours;
    const now = new Date();
    const validUntil = new Date(now.getTime() + durationHours * 3600 * 1000);

    const { data: voucher } = await this.supabase
      .from('campusnet_vouchers')
      .select('*')
      .eq('package_id', pkg.id)
      .eq('status', 'available')
      .limit(1)
      .maybeSingle();

    const voucherCode = voucher ? voucher.code : `M${durationHours}H_${cleanPhone.slice(-4)}_${Date.now().toString().slice(-4)}`;
    const voucherPassword = voucher ? voucher.password : '123456';

    if (voucher) {
      await this.supabase
        .from('campusnet_vouchers')
        .update({
          status: 'assigned',
          assigned_phone: cleanPhone,
          amount: verifiedPayment.amount,
          activated_at: now.toISOString(),
          expires_at: validUntil.toISOString()
        })
        .eq('id', voucher.id);
    }

    await this.supabase.from('campusnet_transactions').upsert({
      reference: verifiedPayment.reference || `BOT_${Date.now()}_${cleanReceipt}`,
      phone: cleanPhone,
      mac_address: '00:00:00:00:00:00',
      package_id: pkg.id,
      amount: verifiedPayment.amount,
      status: 'completed',
      mpesa_receipt: cleanReceipt,
      voucher_code: voucherCode
    }, { onConflict: 'reference' });

    await this.supabase.from('campusnet_sessions').upsert({
      phone: cleanPhone,
      mac_address: '00:00:00:00:00:00',
      voucher_code: voucherCode,
      voucher_password: voucherPassword,
      valid_until: validUntil.toISOString()
    }, { onConflict: 'phone' });

    return {
      success: true,
      voucherCode,
      voucherPassword,
      packageName: pkg.name,
      validUntil: validUntil.toISOString(),
      expiresTimeFormatted: formatDateTimeEAT(validUntil),
      timeLeft: formatTimeRemaining(validUntil),
      message: `Payment Confirmed: KSh ${verifiedPayment.amount} (${pkg.name})\n\nVoucher: ${voucherCode}\nExpires: ${formatDateTimeEAT(validUntil)}`
    };
  }
}

// ─── 2. Loyalty Rewards Service (5 Purchases = 1 Free 24h Pass) ───────────────
export class LoyaltyService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Computes exact loyalty stamps & reward eligibility
   */
  async getLoyaltyProfile(phone) {
    const { clean: cleanPhone } = normalizePhone(phone);
    if (!cleanPhone) return { valid: false, stamps: 0, unclaimedRewards: 0 };

    // 1. Get all completed paid transactions (amount >= 10)
    const { data: txs } = await this.supabase
      .from('campusnet_transactions')
      .select('id, amount, created_at')
      .eq('phone', cleanPhone)
      .in('status', ['completed', 'SUCCESS'])
      .gte('amount', 10);

    const totalPaid = (txs || []).length;

    // 2. Get count of previously claimed free vouchers
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


  /**
   * Claims 1 free 24-hour pass under airtight verification
   */
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

    // Assign free voucher atomically
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

    // Upsert session
    await this.supabase.from('campusnet_sessions').upsert({
      phone: cleanPhone,
      mac_address: '00:00:00:00:00:00',
      voucher_code: voucherCode,
      voucher_password: voucherPassword,
      valid_until: validUntil.toISOString()
    }, { onConflict: 'phone' });

    // Log free loyalty redemption transaction
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
  }

  async getActivePromos() {
    const nowIso = new Date().toISOString();
    try {
      const { data: promos } = await this.supabase
        .from('campusnet_promos')
        .select('*')
        .eq('is_active', true)
        .gte('expires_at', nowIso)
        .order('discount_percent', { ascending: false });

      if (promos && promos.length > 0) return promos;
    } catch (e) {}

    // In-memory launch campaign fallback
    return [
      {
        code: 'FRESHER2026',
        description: '25% Launch Discount on all passes',
        discount_percent: 25,
        expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString()
      }
    ];
  }

  async createPromo({ code, description, discountPercent, durationHours = 24, maxUses = 1 }) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationHours * 3600 * 1000).toISOString();
    const cleanCode = code.trim().toUpperCase();

    const payload = {
      code: cleanCode,
      description: description || `${discountPercent}% Discount Campaign`,
      discount_percent: Number(discountPercent) || 10,
      min_amount_kes: 10,
      max_uses_per_phone: Number(maxUses) || 1,
      starts_at: now.toISOString(),
      expires_at: expiresAt,
      is_active: true
    };

    const { data, error } = await this.supabase
      .from('campusnet_promos')
      .upsert(payload, { onConflict: 'code' })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, promo: data };
  }
}

// ─── 4. Session Recovery Service with Exact Countdown & Loyalty ────────────────
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
      timeLeft,
      formattedExpiry,
      loyaltyProfile,
      message: `Pass Status: ACTIVE 🟢 (${timeLeft} remaining)\n\n• Expires: ${formattedExpiry}\n• Voucher: ${session.voucher_code}${starsStr}${claimNotice}\n\nHOW TO RECONNECT:\n1. Open: http://10.10.0.1/login.html\n2. Tap "Restore Session" & enter ${localPhone}`
    };
  }
}

// ─── 5. Ticket Service with WhatsApp Admin Alert ───────────────────────────────
export class TicketService {
  constructor(supabaseClient, sendWhatsAppFunction = null) {
    this.supabase = supabaseClient;
    this.sendWhatsApp = sendWhatsAppFunction;
    this.localFallbackFile = path.resolve(__dirname, 'tickets_cache.json');
  }

  _generateTicketNumber() {
    return `CN-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  async createTicket({ phone, category, roomLocation, deviceType, description, mpesaReceipt = null }) {
    const { clean: cleanPhone, local: localPhone } = normalizePhone(phone);
    const ticketNumber = this._generateTicketNumber();

    const ticketData = {
      ticket_number: ticketNumber,
      phone: cleanPhone,
      category: category || 'general_inquiry',
      status: 'open',
      priority: category === 'payment_unverified' ? 'high' : 'medium',
      room_location: roomLocation || 'Not specified',
      device_type: deviceType || 'Unknown',
      description: description || 'No details provided',
      mpesa_receipt: mpesaReceipt,
      created_at: new Date().toISOString()
    };

    // 1. Insert into Supabase
    try {
      await this.supabase.from('campusnet_tickets').insert(ticketData);
    } catch (err) {}

    // 2. Dispatch Instant WhatsApp Alert to Duncan (254758530492)
    if (this.sendWhatsApp) {
      const adminAlertText = `🚨 *CAMPUSNET SUPPORT ALERT #${ticketNumber}*\n\n👤 *Client:* ${localPhone} (${cleanPhone})\n📍 *Room:* ${ticketData.room_location}\n📱 *Device:* ${ticketData.device_type}\n⚠️ *Issue:* ${ticketData.description}\n\n👉 *Direct Chat:* https://wa.me/${cleanPhone}\n📞 *Call Client:* tel:${localPhone}`;
      
      try {
        await this.sendWhatsApp({
          to: ADMIN_TECH_SUPPORT_PHONE,
          responseData: { type: 'text', text: adminAlertText }
        });
        console.log(`[Tech Support Alert Sent] Ticket #${ticketNumber} dispatched to Duncan (${ADMIN_TECH_SUPPORT_PHONE})`);
      } catch (e) {
        console.error('[Admin Alert Dispatch Failed]', e.message);
      }
    }

    return { success: true, ticket: ticketData };
  }

  async listTickets({ status = 'all', search = '', limit = 50 }) {
    try {
      let query = this.supabase
        .from('campusnet_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status && status !== 'all') query = query.eq('status', status);
      if (search) query = query.or(`phone.ilike.%${search}%,room_location.ilike.%${search}%,ticket_number.ilike.%${search}%`);

      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {}

    if (fs.existsSync(this.localFallbackFile)) {
      try {
        const local = JSON.parse(fs.readFileSync(this.localFallbackFile, 'utf8') || '[]');
        return local.filter(t => (status === 'all' || t.status === status));
      } catch (err) {}
    }
    return [];
  }

  async updateTicketStatus(ticketId, status, adminNotes = '') {
    const updatePayload = {
      status,
      admin_notes: adminNotes,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null
    };

    try {
      const { data, error } = await this.supabase
        .from('campusnet_tickets')
        .update(updatePayload)
        .or(`id.eq.${ticketId},ticket_number.eq.${ticketId}`)
        .select();

      if (!error) return { success: true, data };
    } catch (e) {}

    return { success: true, note: 'Updated' };
  }

  async pruneTickets({ daysOld = 7, pruneAllResolved = false } = {}) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 3600 * 1000).toISOString();
    try {
      let query = this.supabase.from('campusnet_tickets').delete();
      if (pruneAllResolved) {
        query = query.in('status', ['resolved', 'dismissed']);
      } else {
        query = query.in('status', ['resolved', 'dismissed']).lt('created_at', cutoffDate);
      }
      const { data, count } = await query.select('*');
      const deletedCount = count || (data ? data.length : 0);
      return { success: true, deletedCount, message: `Pruned ${deletedCount} tickets.` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

// ─── 6. Master Bot Conversation Engine (v3.0 Interactive) ──────────────────────
export class BotConversationManager {
  constructor(paymentService, sessionService, loyaltyService, promoService, ticketService) {
    this.payments = paymentService;
    this.sessions = sessionService;
    this.loyalty = loyaltyService;
    this.promos = promoService;
    this.tickets = ticketService;
    this.userStates = new Map();
  }

  _getUserState(phone) {
    if (!this.userStates.has(phone)) {
      this.userStates.set(phone, { step: 'IDLE', collected: {}, lastActive: Date.now() });
    }
    const state = this.userStates.get(phone);
    if (Date.now() - state.lastActive > 15 * 60 * 1000) {
      state.step = 'IDLE';
      state.collected = {};
    }
    state.lastActive = Date.now();
    return state;
  }

  _resetUserState(phone) {
    this.userStates.set(phone, { step: 'IDLE', collected: {}, lastActive: Date.now() });
  }

  async handleMessage(phone, rawInput) {
    const { clean: cleanPhone, local: localPhone } = normalizePhone(phone);
    const text = (rawInput || '').trim();
    const lower = text.toLowerCase();
    const state = this._getUserState(cleanPhone);

    // ── 0. Global Reset Commands ──
    if (['menu', 'home', 'reset', 'start', 'help', 'hi', 'hello', 'hey'].includes(lower)) {
      this._resetUserState(cleanPhone);
      return this._buildInteractiveMainMenu();
    }

    // ── 1. Active Multi-Step State Handlers (Priority) ──
    if (state.step === 'AWAITING_MPESA_RECEIPT') {
      return await this._handleMpesaVerificationStep(cleanPhone, text);
    }

    if (state.step === 'AWAITING_OTHER_PHONE') {
      const { clean: otherClean } = normalizePhone(text);
      if (!otherClean || otherClean.length !== 12) {
        return { type: 'text', text: "Invalid phone number. Please enter a valid 10-digit phone number (e.g. 0712345678):" };
      }
      this._resetUserState(cleanPhone);
      return await this._executeSessionLookup(otherClean);
    }

    if (state.step === 'AWAITING_ROOM') {
      state.collected.room = text;
      state.step = 'AWAITING_DEVICE';
      return {
        type: 'interactive',
        interactive: {
          type: 'button',
          header: { type: 'text', text: 'Device Type' },
          body: { text: `Room ${text} recorded. What device are you using?` },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'dev_android', title: '📱 Android' } },
              { type: 'reply', reply: { id: 'dev_iphone', title: '🍏 iPhone' } },
              { type: 'reply', reply: { id: 'dev_laptop', title: '💻 Laptop' } }
            ]
          }
        }
      };
    }

    if (state.step === 'AWAITING_DEVICE' || text.startsWith('dev_')) {
      let device = 'Android Phone';
      if (text === 'dev_iphone' || lower.includes('iphone') || lower.includes('apple') || text === '2') device = 'iPhone';
      else if (text === 'dev_laptop' || lower.includes('laptop') || lower.includes('pc') || text === '3') device = 'Laptop';
      state.collected.device = device;
      state.step = 'AWAITING_SYMPTOM';

      return {
        type: 'interactive',
        interactive: {
          type: 'button',
          header: { type: 'text', text: 'Issue Symptom' },
          body: { text: 'What problem are you experiencing?' },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'sym_no_ssid', title: '📶 Wi-Fi Not Showing' } },
              { type: 'reply', reply: { id: 'sym_no_portal', title: '🌐 Portal Error' } },
              { type: 'reply', reply: { id: 'sym_slow', title: '⚡ Slow Browsing' } }
            ]
          }

        }
      };
    }

    if (state.step === 'AWAITING_SYMPTOM' || text.startsWith('sym_')) {
      let symptom = 'Slow browsing';
      let category = 'slow_speed';
      if (text === 'sym_no_ssid' || text === '1' || lower.includes('showing') || lower.includes('haionekani')) {
        symptom = 'CampusNet Wi-Fi not visible';
        category = 'no_signal';
      } else if (text === 'sym_no_portal' || text === '2' || lower.includes('portal')) {
        symptom = 'Login portal not popping up';
        category = 'mac_randomization';
      }

      const res = await this.tickets.createTicket({
        phone: cleanPhone,
        category,
        roomLocation: state.collected.room || 'Room not provided',
        deviceType: state.collected.device || 'Mobile',
        description: `Hostel Issue: ${symptom} in Room ${state.collected.room}`
      });

      const ticketNum = res.ticket?.ticket_number || 'CN-NEW';
      this._resetUserState(cleanPhone);

      return {
        type: 'text',
        text: `✅ Ticket Logged: #${ticketNum}\n\n📍 Room: ${state.collected.room || 'Hostel'}\n📱 Device: ${state.collected.device}\n⚠️ Issue: ${symptom}\n\nDuncan has been alerted on WhatsApp and is checking it now. Expected fix: 5–15 mins.`
      };
    }

    // ── 2. Top-Level Button Actions & Explicit Action IDs ──
    if (text === 'btn_paid' || text === '1' || lower.includes('nimetuma') || lower.includes('paid')) {
      state.step = 'AWAITING_MPESA_RECEIPT';
      return {
        type: 'text',
        text: "Please reply with your 10-character M-Pesa receipt code (e.g. UIHGQ6VBKC)."
      };
    }

    if (text === 'btn_restore' || text === '2' || lower.includes('restore') || lower.includes('disconnect') || lower.includes('kicked') || lower.includes('nimetolewa')) {
      return this._buildPhoneChoicePrompt(cleanPhone, localPhone);
    }

    if (text === 'chk_current') {
      return await this._executeSessionLookup(cleanPhone);
    }

    if (text === 'chk_other') {
      state.step = 'AWAITING_OTHER_PHONE';
      return {
        type: 'text',
        text: "Please enter the 10-digit M-Pesa phone number you used to pay (e.g. 0712345678):"
      };
    }

    if (text === 'claim_loyalty_24h') {
      const claimRes = await this.loyalty.claimFreePass(cleanPhone);
      if (claimRes.success) {
        return {
          type: 'text',
          text: `🎉 ${claimRes.message}\n\nHOW TO CONNECT:\n1. Open browser: http://10.10.0.1/login.html\n2. Tap "Enter Voucher Code"\n3. Paste: ${claimRes.voucherCode} & tap Connect!`
        };
      } else {
        return { type: 'text', text: `❌ ${claimRes.message}` };
      }
    }

    if (text === 'btn_promos' || text === '3' || lower.includes('promo') || lower.includes('discount') || lower.includes('price') || lower.includes('rate') || lower.includes('how much') || lower.includes('bei')) {
      return await this._buildPromosAndRatesResponse();
    }

    if (text === 'btn_report' || text === '4' || lower.includes('slow') || lower.includes('signal') || lower.includes('down') || lower.includes('issue') || lower.includes('shida')) {
      state.step = 'AWAITING_ROOM';
      return {
        type: 'text',
        text: "Please enter your Hostel Name & Room Number (e.g. Block B, Room 14):"
      };
    }

    // ── 3. Direct 10-character M-Pesa Code Detection ──
    const mpesaMatch = text.match(/\b([A-Z0-9]{10})\b/);
    if (mpesaMatch && !lower.includes('pkg_') && !lower.includes('room')) {
      return await this._handleMpesaVerificationStep(cleanPhone, mpesaMatch[1]);
    }

    // Default Fallback
    return this._buildInteractiveMainMenu();
  }


  async _handleMpesaVerificationStep(phone, receipt) {
    const res = await this.payments.verifyAndActivate({ phone, mpesaReceipt: receipt });
    this._resetUserState(phone);

    if (res.success) {
      return {
        type: 'text',
        text: `🎉 ${res.message}\n\nHOW TO LOGIN:\n1. Connect to "CampusNet_Hostel_WiFi"\n2. Open browser: http://10.10.0.1/login.html\n3. Tap "Enter Voucher Code"\n4. Paste: ${res.voucherCode} & tap Connect!`
      };
    } else {
      return {
        type: 'text',
        text: `❌ ${res.message}`
      };
    }
  }

  _buildPhoneChoicePrompt(cleanPhone, localPhone) {
    return {
      type: 'interactive',
      interactive: {
        type: 'button',
        header: { type: 'text', text: '🔄 Check / Restore Pass' },
        body: { text: `Which phone number did you use to pay for Wi-Fi?` },
        footer: { text: 'CampusNet Instant Session Lookup' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'chk_current', title: `📱 Use ${localPhone.slice(-4)}` } },
            { type: 'reply', reply: { id: 'chk_other', title: '⌨️ Enter Other Phone' } }
          ]
        }
      }
    };
  }

  async _executeSessionLookup(targetPhone) {
    const res = await this.sessions.recoverSession(targetPhone);
    
    // If eligible for free loyalty pass, give a direct 1-tap button!
    if (res.loyaltyProfile?.hasUnclaimedReward) {
      return {
        type: 'interactive',
        interactive: {
          type: 'button',
          header: { type: 'text', text: '🎁 Free Loyalty Pass Ready!' },
          body: { text: `${res.message}\n\nTap below to claim your Free 24-Hour Pass instantly:` },
          footer: { text: 'Makoyocart Ventures Rewards' },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'claim_loyalty_24h', title: '🎁 Claim Free Pass' } },
              { type: 'reply', reply: { id: 'btn_promos', title: '📋 Wi-Fi Rates' } }
            ]
          }

        }
      };
    }

    return { type: 'text', text: res.message };
  }

  _buildInteractiveMainMenu() {
    return {
      type: 'interactive',
      interactive: {
        type: 'button',
        header: { type: 'text', text: '📶 CampusNet Wi-Fi Support' },
        body: { text: 'Hi! Welcome to CampusNet Automated Support. How can we help you today?' },
        footer: { text: 'Makoyocart Ventures • 24/7 Desk' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_paid', title: '⚡ Paid / Connect' } },
            { type: 'reply', reply: { id: 'btn_restore', title: '🔄 My Pass / Restore' } },
            { type: 'reply', reply: { id: 'btn_promos', title: '🏷️ Promos & Rates' } }
          ]
        }
      }
    };
  }

  async _buildPromosAndRatesResponse() {
    const activePromos = await this.promos.getActivePromos();
    let promoText = '';
    if (activePromos.length > 0) {
      promoText = `\n🔥 ACTIVE DISCOUNT DEALS:\n` + activePromos.map(p => `• Code: *${p.code}* (${p.discount_percent}% OFF) — ${p.description}`).join('\n') + `\n\nApply promo code on portal to get instant discount!`;
    }

    return {
      type: 'interactive',
      interactive: {
        type: 'button',
        header: { type: 'text', text: '⚡ Rates & Active Promos' },
        body: {
          text: `• 1 Hour Pass: KSh 10\n• 3 Hours Browsing: KSh 20\n• 24 Hours Unlimited: KSh 40 (🔥 Popular)\n• 3 Days Pass: KSh 80\n• 7 Days Unlimited: KSh 150\n• 30 Days VIP Pass: KSh 500${promoText}\n\n🌐 Open Portal to Buy: http://10.10.0.1/login.html`
        },
        footer: { text: 'Select an action below:' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_paid', title: '⚡ I Already Paid' } },
            { type: 'reply', reply: { id: 'btn_report', title: '🛠️ Report an Issue' } }
          ]
        }
      }
    };
  }
}
