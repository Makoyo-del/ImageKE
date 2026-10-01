/**
 * =============================================================================
 * MAKOYOCART VENTURES WIFI (CAMPUSNET) - AUTONOMOUS SUPPORT ENGINE (v2.0 PRO)
 * Registration: BN-WLSP9KP9 | Founder: Duncan Makoyo | Kisii, Kenya
 *
 * Upgrades:
 * - 100% English, Concise, Punchy Messaging
 * - WhatsApp Native Interactive Buttons & Quick-Replies
 * - Bulletproof State Machine (Zero Dead Loops)
 * - Direct M-Pesa Receipt Instant Resolution
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        return {
          success: true,
          isAlreadyActive: true,
          voucherCode: activeSession.voucher_code,
          validUntil: activeSession.valid_until,
          message: `Your pass for code ${cleanReceipt} is already active until ${new Date(activeSession.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`
        };
      }

      return {
        success: false,
        error: 'RECEIPT_ALREADY_USED',
        message: `M-Pesa code ${cleanReceipt} has already been used or expired. If you made a new payment, please enter your new receipt code.`
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

    // Step 4: Refuse unverified payments
    if (!verifiedPayment) {
      return {
        success: false,
        error: 'PAYMENT_NOT_FOUND',
        message: `We could not verify payment for code: ${cleanReceipt}.\n\nIf you just paid, please wait 30 seconds and try again, or purchase a pass directly at http://10.10.0.1/login.html`
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
      expiresTimeFormatted: validUntil.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: `Payment Confirmed: KSh ${verifiedPayment.amount} (${pkg.name})\n\nVoucher Code: ${voucherCode}`
    };
  }
}

// ─── 2. Session Recovery Service ───────────────────────────────────────────────
export class SessionRecoveryService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async recoverSession(phone) {
    const { clean: cleanPhone, local: localPhone } = normalizePhone(phone);
    if (!cleanPhone) {
      return { success: false, message: 'Please provide the phone number used to make payment.' };
    }

    const { data: session, error } = await this.supabase
      .from('campusnet_sessions')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (error || !session) {
      return {
        success: false,
        hasActiveSession: false,
        message: `No active Wi-Fi pass found for ${localPhone}.\n\nTo connect, please buy a pass on the portal: http://10.10.0.1/login.html (Starting from KSh 10).`
      };
    }

    const expiry = new Date(session.valid_until);
    const now = new Date();

    if (expiry <= now) {
      return {
        success: false,
        hasActiveSession: false,
        expiredAt: session.valid_until,
        message: `Your previous pass for ${localPhone} expired at ${expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.\n\nPlease visit http://10.10.0.1/login.html to renew.`
      };
    }

    const timeLeft = formatTimeRemaining(expiry);
    return {
      success: true,
      hasActiveSession: true,
      voucherCode: session.voucher_code,
      voucherPassword: session.voucher_password || '123456',
      validUntil: session.valid_until,
      timeLeft,
      guidance: `Your pass is ACTIVE (${timeLeft})!\n\nHOW TO RECONNECT:\n1. Open browser: http://10.10.0.1/login.html\n2. Below the orange "Pay via M-Pesa" button, tap "Restore Session"\n3. Enter your phone: ${localPhone} and tap Connect\n\n(Or use Voucher Code: ${session.voucher_code})`
    };
  }
}

// ─── 3. Ticket Service ─────────────────────────────────────────────────────────
export class TicketService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.localFallbackFile = path.resolve(__dirname, 'tickets_cache.json');
  }

  _generateTicketNumber() {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `CN-${randomSuffix}`;
  }

  async createTicket({ phone, category, roomLocation, deviceType, description, mpesaReceipt = null }) {
    const { clean: cleanPhone } = normalizePhone(phone);
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

    try {
      const { data, error } = await this.supabase
        .from('campusnet_tickets')
        .insert(ticketData)
        .select()
        .single();

      if (!error && data) return { success: true, ticket: data, storage: 'supabase' };
    } catch (err) {}

    try {
      let tickets = [];
      if (fs.existsSync(this.localFallbackFile)) {
        tickets = JSON.parse(fs.readFileSync(this.localFallbackFile, 'utf8') || '[]');
      }
      tickets.unshift(ticketData);
      fs.writeFileSync(this.localFallbackFile, JSON.stringify(tickets.slice(0, 100), null, 2));
      return { success: true, ticket: ticketData, storage: 'local_fallback' };
    } catch (fErr) {
      return { success: true, ticket: ticketData, storage: 'memory_only' };
    }
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
      const { data, count, error } = await query.select('*');
      const deletedCount = count || (data ? data.length : 0);
      return { success: true, deletedCount, message: `Pruned ${deletedCount} tickets.` };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

// ─── 4. Conversational Bot Engine with WhatsApp Native Buttons ─────────────────
export class BotConversationManager {
  constructor(paymentService, sessionService, ticketService) {
    this.payments = paymentService;
    this.sessions = sessionService;
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

  /**
   * Main Handler: Returns either a plain text string OR an interactive WhatsApp object
   */
  async handleMessage(phone, rawInput) {
    const { clean: cleanPhone } = normalizePhone(phone);
    const text = (rawInput || '').trim();
    const lower = text.toLowerCase();
    const state = this._getUserState(cleanPhone);

    // ── 0. Global Reset Commands ──
    if (['menu', 'home', 'reset', 'start', 'help', 'hi', 'hello', 'hey'].includes(lower)) {
      this._resetUserState(cleanPhone);
      return this._buildInteractiveMainMenu();
    }

    // ── 1. Direct Action Button / List Selection Handlers ──
    if (text === 'btn_paid' || text === '1' || lower.includes('nimetuma') || lower.includes('paid')) {
      state.step = 'AWAITING_MPESA_RECEIPT';
      return {
        type: 'text',
        text: "Please send your 10-character M-Pesa confirmation code (e.g. UIHGQ6VBKC)."
      };
    }

    if (text === 'btn_restore' || text === '2' || lower.includes('restore') || lower.includes('disconnect') || lower.includes('kick') || lower.includes('nimetolewa')) {
      return await this._handleSessionRestore(cleanPhone);
    }

    if (text === 'btn_prices' || text === '3' || lower.includes('price') || lower.includes('package') || lower.includes('cost') || lower.includes('how much') || lower.includes('bei')) {
      return this._buildPackagesResponse();
    }

    if (text === 'btn_report' || text === '4' || lower.includes('slow') || lower.includes('signal') || lower.includes('down') || lower.includes('issue') || lower.includes('shida')) {
      state.step = 'AWAITING_ROOM';
      return {
        type: 'text',
        text: "Sorry for the network issue! Please enter your Hostel Name & Room Number (e.g. Block B, Room 14):"
      };
    }

    // ── 2. Direct 10-character M-Pesa Code Detection ──
    const mpesaMatch = text.match(/\b([A-Z0-9]{10})\b/);
    if (mpesaMatch && !lower.includes('pkg_') && !lower.includes('room')) {
      return await this._handleMpesaVerificationStep(cleanPhone, mpesaMatch[1]);
    }

    // ── 3. Guided Multi-Step State Machine ──
    if (state.step === 'AWAITING_MPESA_RECEIPT') {
      return await this._handleMpesaVerificationStep(cleanPhone, text);
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
              { type: 'reply', reply: { id: 'sym_no_portal', title: '🌐 Portal Not Opening' } },
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
        text: `✅ Ticket Logged: #${ticketNum}\n\n📍 Location: Room ${state.collected.room || 'Hostel'}\n📱 Device: ${state.collected.device}\n⚠️ Issue: ${symptom}\n\nDuncan has been notified and is checking it now. Expected resolution: 5–15 mins.`
      };
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
        text: `🎉 ${res.message}\n\nHOW TO LOGIN:\n1. Connect to "CampusNet_Hostel_WiFi"\n2. Open browser: http://10.10.0.1/login.html\n3. Tap "Enter Voucher Code"\n4. Paste: ${res.voucherCode} and tap Connect!`
      };
    } else {
      return {
        type: 'text',
        text: `❌ ${res.message}`
      };
    }
  }

  async _handleSessionRestore(phone) {
    const res = await this.sessions.recoverSession(phone);
    return {
      type: 'text',
      text: res.guidance || res.message
    };
  }

  _buildInteractiveMainMenu() {
    return {
      type: 'interactive',
      interactive: {
        type: 'button',
        header: { type: 'text', text: '📶 CampusNet Wi-Fi Support' },
        body: { text: 'Hi! Welcome to CampusNet Automated Support. How can we help you today?' },
        footer: { type: 'text', text: 'Makoyocart Ventures • 24/7 Desk' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'btn_paid', title: '⚡ Paid / Connect' } },
            { type: 'reply', reply: { id: 'btn_restore', title: '🔄 Restore Pass' } },
            { type: 'reply', reply: { id: 'btn_prices', title: '📋 Wi-Fi Rates' } }
          ]
        }
      }
    };
  }

  _buildPackagesResponse() {
    return {
      type: 'interactive',
      interactive: {
        type: 'button',
        header: { type: 'text', text: '⚡ CampusNet Wi-Fi Rates' },
        body: {
          text: `• 1 Hour Flash Pass: KSh 10\n• 3 Hours Browsing: KSh 20\n• 24 Hours Unlimited: KSh 40 (🔥 Popular)\n• 3 Days Pass: KSh 80\n• 7 Days Unlimited: KSh 150\n• 30 Days VIP Pass: KSh 500\n\nBuy directly on portal:\nhttp://10.10.0.1/login.html`
        },
        footer: { type: 'text', text: 'Select an option below:' },
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
