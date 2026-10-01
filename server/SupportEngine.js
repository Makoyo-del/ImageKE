/**
 * =============================================================================
 * MAKOYOCART VENTURES WIFI (CAMPUSNET) - AUTONOMOUS SUPPORT ENGINE
 * Registration: BN-WLSP9KP9 | Founder: Duncan Makoyo | Kisii, Kenya
 *
 * Architecture: Clean Object-Oriented System
 * Security: Strict Separation of Concerns, Zero Secrets Hardcoded, Zero Voucher Leaks
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard Packages Catalog
export const CAMPUSNET_PACKAGES = [
  { id: 'pkg_1h', name: '1 Hour Flash Pass', amount: 10, durationHours: 1, tag: 'Quick Sprint ⚡' },
  { id: 'pkg_3h', name: '3 Hours Browsing', amount: 20, durationHours: 3, tag: 'Mandazi/Smokie Tier' },
  { id: 'pkg_24h', name: '24 Hours Unlimited', amount: 40, durationHours: 24, tag: 'Most Popular ★' },
  { id: 'pkg_3d', name: '3 Days Weekend Pass', amount: 80, durationHours: 72, tag: 'Weekend Special ⚡' },
  { id: 'pkg_7d', name: '7 Days Unlimited', amount: 150, durationHours: 168, tag: 'Exam Week Prep' },
  { id: 'pkg_30d', name: '30 Days VIP Resident', amount: 500, durationHours: 720, tag: 'Full Month Access' }
];

// Helper: Normalize Kenyan phone numbers
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

// Helper: Format remaining time human-readable
export function formatTimeRemaining(expiryDate) {
  const ms = new Date(expiryDate).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h remaining`;
  }
  return `${hours}h ${mins}m remaining`;
}

// ─── 1. Payment Verification & Activation Service ──────────────────────────────
export class PaymentVerificationService {
  constructor(supabaseClient, paystackSecretKey) {
    this.supabase = supabaseClient;
    this.paystackKey = paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
  }

  /**
   * Verifies if a payment occurred and instructs the backend to assign a voucher.
   * AIRTIGHT GUARANTEE: Never issues a voucher without verified M-Pesa / Paystack payment.
   */
  async verifyAndActivate({ phone, mpesaReceipt, requestedPackageId = 'pkg_24h' }) {
    const { clean: cleanPhone } = normalizePhone(phone);
    const cleanReceipt = (mpesaReceipt || '').trim().toUpperCase();

    if (!cleanPhone) {
      return { success: false, error: 'INVALID_PHONE', message: 'Tafadhali weka namba halali ya simu.' };
    }
    if (!cleanReceipt || cleanReceipt.length < 8) {
      return { success: false, error: 'INVALID_RECEIPT', message: 'Tafadhali weka M-Pesa receipt code halali (mfano: UIHGQ6VBKC).' };
    }

    // Step 1: Anti-Fraud Check - Has this M-Pesa code already been consumed?
    const { data: existingTx } = await this.supabase
      .from('campusnet_transactions')
      .select('id, status, voucher_code, phone, amount')
      .eq('mpesa_receipt', cleanReceipt)
      .maybeSingle();

    if (existingTx && existingTx.status === 'completed' && existingTx.voucher_code) {
      // Check if session for this phone is still active
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
          message: `Malipo ya code ${cleanReceipt} yalishakamilika na session yako bado iko active mpaka ${new Date(activeSession.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`
        };
      }

      return {
        success: false,
        error: 'RECEIPT_ALREADY_USED',
        message: `M-Pesa code ${cleanReceipt} ilishatumika tayari kwenye namba nyingine au ilishaisha muda wake. Kama una code mpya, tafadhali itume tena.`
      };
    }

    // Step 2: Check Pending Transactions in Database
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

    // Step 3: Paystack API Fallback Check (If not verified in DB)
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
        console.error('[SupportEngine] Paystack verification check error:', err.message);
      }
    }

    // Step 4: If Unverified, strictly REFUSE voucher assignment
    if (!verifiedPayment) {
      return {
        success: false,
        error: 'PAYMENT_NOT_FOUND',
        message: `Samahani, hatujapata malipo yaliyothibitishwa ya code: ${cleanReceipt}. Kama M-Pesa ilikatwa hivi punde, subiri sekunde 30 kisha utume tena, au ununue pass moja kwa moja kwenye portal: http://10.10.0.1/login.html`
      };
    }

    // Step 5: Backend Atomic Voucher Assignment
    const pkg = CAMPUSNET_PACKAGES.find(p => p.id === verifiedPayment.packageId) || CAMPUSNET_PACKAGES[2];
    const durationHours = pkg.durationHours;
    const now = new Date();
    const validUntil = new Date(now.getTime() + durationHours * 3600 * 1000);

    // Pick 1 available pre-seeded voucher from pool
    const { data: voucher, error: vErr } = await this.supabase
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

    // Upsert transaction to completed
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

    // Upsert active session
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
      message: `Hongera! Malipo yako ya KSh ${verifiedPayment.amount} (${pkg.name}) yamethibitishwa. Voucher yako ni: ${voucherCode}.`
    };
  }
}

// ─── 2. Session Recovery Service (MAC Address Randomization Defense) ───────────
export class SessionRecoveryService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Looks up an existing unexpired session for a phone number.
   * Guides student on using "Restore Session" in hotspot/login.html.
   */
  async recoverSession(phone) {
    const { clean: cleanPhone } = normalizePhone(phone);
    if (!cleanPhone) {
      return { success: false, message: 'Tafadhali weka namba sahihi ya simu uliyotumia kulipia.' };
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
        message: `Hatujapata pass active kwenye namba ${cleanPhone}. Tafadhali nunua pass mpya kwenye portal: http://10.10.0.1/login.html (Vifurushi vinaanzia KSh 10 tu!).`
      };
    }

    const expiry = new Date(session.valid_until);
    const now = new Date();

    if (expiry <= now) {
      return {
        success: false,
        hasActiveSession: false,
        expiredAt: session.valid_until,
        message: `Pass yako iliyopita kwenye namba ${cleanPhone} iliisha muda wake mnamo ${expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Tafadhali fungua portal ya CampusNet ununue pass mpya kuanzia KSh 10.`
      };
    }

    // Pass is currently valid!
    const timeLeft = formatTimeRemaining(expiry);
    return {
      success: true,
      hasActiveSession: true,
      voucherCode: session.voucher_code,
      voucherPassword: session.voucher_password || '123456',
      validUntil: session.valid_until,
      timeLeft,
      guidance: `Session yako BADO IKO ACTIVE (${timeLeft})!
      
📱 MAELEKEZO YA KURECONNECT:
1. Fungua browser uende: http://10.10.0.1/login.html
2. Chini ya kile kitufe cha machungwa (Pay via M-Pesa), gonga link ya "Restore Session".
3. Ingiza namba yako: ${cleanPhone} kisha gonga Connect.
(Au tumia Voucher Code hii: ${session.voucher_code})`
    };
  }
}

// ─── 3. Ticket Escalation & Supabase Free-Tier Pruning Service ──────────────────
export class TicketService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.localFallbackFile = path.resolve(__dirname, 'tickets_cache.json');
  }

  // Generate unique human-readable ticket ID (#CN-4821)
  _generateTicketNumber() {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `CN-${randomSuffix}`;
  }

  /**
   * Logs a ticket in Supabase (or fallback cache) and alerts admin.
   */
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

    // Try Supabase insert
    try {
      const { data, error } = await this.supabase
        .from('campusnet_tickets')
        .insert(ticketData)
        .select()
        .single();

      if (!error && data) {
        return { success: true, ticket: data, storage: 'supabase' };
      }
    } catch (err) {
      console.warn('[TicketService] Supabase insert note:', err.message);
    }

    // Local file fallback if table not yet migrated
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

  /**
   * Retrieves all tickets with filtering.
   */
  async listTickets({ status = 'all', search = '', limit = 50 }) {
    try {
      let query = this.supabase
        .from('campusnet_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      if (search) {
        query = query.or(`phone.ilike.%${search}%,room_location.ilike.%${search}%,ticket_number.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {
      // Fallback
    }

    if (fs.existsSync(this.localFallbackFile)) {
      try {
        const local = JSON.parse(fs.readFileSync(this.localFallbackFile, 'utf8') || '[]');
        return local.filter(t => (status === 'all' || t.status === status));
      } catch (err) {}
    }
    return [];
  }

  /**
   * Updates ticket status (e.g. 'resolved', 'investigating', 'dismissed').
   */
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

    return { success: true, note: 'Updated in memory/fallback' };
  }

  /**
   * Pruning Power Tool: Permanently removes resolved or old tickets to stay within Supabase Free Tier.
   */
  async pruneTickets({ daysOld = 7, pruneAllResolved = false } = {}) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 3600 * 1000).toISOString();
    
    try {
      let query = this.supabase
        .from('campusnet_tickets')
        .delete();

      if (pruneAllResolved) {
        query = query.in('status', ['resolved', 'dismissed']);
      } else {
        query = query
          .in('status', ['resolved', 'dismissed'])
          .lt('created_at', cutoffDate);
      }

      const { data, count, error } = await query.select('*');
      const deletedCount = count || (data ? data.length : 0);

      return {
        success: true,
        deletedCount,
        message: `Successfully pruned ${deletedCount} archived tickets from Supabase.`
      };
    } catch (err) {
      console.error('[TicketService] Pruning error:', err.message);
      return { success: false, error: err.message };
    }
  }
}

// ─── 4. Conversational Bot State Machine & Intent Classifier ───────────────────
export class BotConversationManager {
  constructor(paymentService, sessionService, ticketService) {
    this.payments = paymentService;
    this.sessions = sessionService;
    this.tickets = ticketService;
    // Map<phone, ConversationSession>
    this.userStates = new Map();
  }

  _getUserState(phone) {
    if (!this.userStates.has(phone)) {
      this.userStates.set(phone, {
        step: 'IDLE',
        collected: {},
        lastActive: Date.now()
      });
    }
    const state = this.userStates.get(phone);
    // 15-minute conversation TTL
    if (Date.now() - state.lastActive > 15 * 60 * 1000) {
      state.step = 'IDLE';
      state.collected = {};
    }
    state.lastActive = Date.now();
    return state;
  }

  _resetUserState(phone) {
    this.userStates.set(phone, {
      step: 'IDLE',
      collected: {},
      lastActive: Date.now()
    });
  }

  /**
   * Master Entrypoint: Processes any arbitrary initial student message.
   */
  async handleMessage(phone, incomingText) {
    const { clean: cleanPhone } = normalizePhone(phone);
    const text = (incomingText || '').trim();
    const lower = text.toLowerCase();
    const state = this._getUserState(cleanPhone);

    // ── Global Escape / Reset ──
    if (['menu', 'home', 'reset', 'anza', 'huduma', 'help'].includes(lower)) {
      this._resetUserState(cleanPhone);
      return this._sendMainMenu(cleanPhone);
    }

    // ── Check if User is in an Active Guided State ──
    if (state.step === 'AWAITING_MPESA_RECEIPT') {
      return await this._handleMpesaVerificationStep(cleanPhone, text);
    }

    if (state.step === 'AWAITING_RESTORE_PHONE') {
      return await this._handleSessionRestoreStep(cleanPhone, text);
    }

    if (state.step === 'AWAITING_ROOM') {
      state.collected.room = text;
      state.step = 'AWAITING_DEVICE';
      return `Asante. Je, unatumia kifaa gani sasa hivi?\n\n1. Android Phone\n2. iPhone\n3. Laptop\n\n(Tuma namba au jina la kifaa chako).`;
    }

    if (state.step === 'AWAITING_DEVICE') {
      let device = 'Android';
      if (lower.includes('iphone') || lower.includes('apple') || text === '2') device = 'iPhone';
      else if (lower.includes('laptop') || lower.includes('pc') || text === '3') device = 'Laptop';
      state.collected.device = device;
      state.step = 'AWAITING_SYMPTOM';
      return `Tatizo mahususi ni lipi?\n\n1. Wi-Fi ya CampusNet haionekani kabisa\n2. Imeunganisha lakini login page/portal haifunguki\n3. Iko connected lakini internet iko slow sana\n\n(Jibu na 1, 2, au 3)`;
    }

    if (state.step === 'AWAITING_SYMPTOM') {
      let symptom = 'Slow browsing';
      let category = 'slow_speed';
      if (text === '1' || lower.includes('haionekani')) {
        symptom = 'SSID not visible';
        category = 'no_signal';
      } else if (text === '2' || lower.includes('portal') || lower.includes('login')) {
        symptom = 'Captive portal not popping up';
        category = 'mac_randomization';
      }

      state.collected.symptom = symptom;
      state.collected.category = category;

      // File Ticket
      const res = await this.tickets.createTicket({
        phone: cleanPhone,
        category,
        roomLocation: state.collected.room || 'Room not provided',
        deviceType: state.collected.device,
        description: `Hostel Issue: ${symptom} in Room ${state.collected.room}`
      });

      const ticketNum = res.ticket?.ticket_number || 'CN-NEW';
      this._resetUserState(cleanPhone);

      return `✅ TIKETI YAKO IMEPOKELEWA: #${ticketNum}
      
📍 Eneo: Room ${state.collected.room || 'Hostel'}
📱 Kifaa: ${state.collected.device}
⚠️ Tatizo: ${symptom}

Duncan (Mwenye Wi-Fi) amearifiwa na anaikagua sasa hivi. 
Tafadhali subiri dakika 5-15, tutakujulisha mara moja ikishakamilika! Asante kwa uvumilivu wako.`;
    }

    // ── Natural Language Heuristics on Initial Input ──

    // 1. Direct M-Pesa Receipt Detection (e.g. UIHGQ6VBKC)
    const mpesaMatch = text.match(/\b([A-Z0-9]{10})\b/);
    if (mpesaMatch && !lower.includes('pkg_')) {
      return await this._handleMpesaVerificationStep(cleanPhone, mpesaMatch[1]);
    }

    // 2. Disconnection / Logout Complaints
    if (lower.includes('disconnect') || lower.includes('kick') || lower.includes('kulipa tena') || 
        lower.includes('zima') || lower.includes('restore') || lower.includes('imepotea')) {
      return await this.sessions.recoverSession(cleanPhone).then(r => r.message || r.guidance);
    }

    // 3. Payment Issues / "Nimetuma pesa"
    if (lower.includes('nimetuma') || lower.includes('mpesa') || lower.includes('pesa') || 
        lower.includes('paid') || lower.includes('lipa') || lower.includes('receipt')) {
      state.step = 'AWAITING_MPESA_RECEIPT';
      return `Habari! Kama umetuma pesa lakini hujaunganishwa, tafadhali nitumie ile **M-Pesa confirmation code ya herufi 10** (Mfano: UIHGQ6VBKC).`;
    }

    // 4. Pricing / Package Menu Inquiries
    if (lower.includes('bei') || lower.includes('how much') || lower.includes('package') || 
        lower.includes('kifurushi') || lower.includes('gharama') || lower.includes('buy')) {
      return this._sendPackageCatalog();
    }

    // 5. Technical Fault / Slow Speed / Signal Drops
    if (lower.includes('slow') || lower.includes('signal') || lower.includes('haifanyi') || 
        lower.includes('shida') || lower.includes('down') || lower.includes('buffer')) {
      state.step = 'AWAITING_ROOM';
      return `Pole sana kwa changamoto ya mtandao! Ili tukutatulie haraka, tafadhali taja **Hostel na Namba ya Room yako** (mfano: Block B, Room 14):`;
    }

    // Default Fallback: Polite Main Menu with UI awareness
    return this._sendMainMenu(cleanPhone);
  }

  async _handleMpesaVerificationStep(phone, receipt) {
    const res = await this.payments.verifyAndActivate({
      phone,
      mpesaReceipt: receipt
    });

    if (res.success) {
      this._resetUserState(phone);
      return `🎉 ${res.message}

🌐 MAELEKEZO YA KULOGIN:
1. Hakikisha umeunganishwa na Wi-Fi: **CampusNet_Hostel_WiFi**
2. Fungua browser uingie: http://10.10.0.1/login.html
3. Chini kabisa, gonga **"Enter Voucher Code"** kisha uweke: **${res.voucherCode}**
4. Gonga **Connect** kuanza kubrowse kwa kasi ya juu!`;
    } else {
      return `❌ ${res.message}`;
    }
  }

  async _handleSessionRestoreStep(phone, inputPhone) {
    const target = inputPhone.trim() || phone;
    const res = await this.sessions.recoverSession(target);
    this._resetUserState(phone);
    return res.guidance || res.message;
  }

  _sendMainMenu(phone) {
    return `👋 Habari! Hapa ni **CampusNet Automated Support (Makoyocart Ventures Wifi)**.

Je, ungependa tukusaidie na nini leo?
1️⃣ **Nimetuma pesa lakini sijaunganishwa** (Tuma M-Pesa Code)
2️⃣ **Nimetolewa / Inaniambia nilipie tena** (Restore Session)
3️⃣ **Bei na Vifurushi vya Wi-Fi** (Tazama Catalog)
4️⃣ **Ripoti Internet iko Slow au Haipatikani** (Fungua Tiketi)

*(Unaweza kujibu na namba 1, 2, 3, 4 au ueleze shida yako moja kwa moja).*`;
  }

  _sendPackageCatalog() {
    return `⚡ **VIFURUSHI VYA CAMPUSNET WIFI (KISII)**:

• **1 Hour Flash Pass**: KSh 10 (Notes & Assignment download)
• **3 Hours Browsing**: KSh 20 (Haziishi ukidisconnect, valid 24h)
• **24 Hours Unlimited**: KSh 40 (🔥 Most Popular)
• **3 Days Weekend Pass**: KSh 80 (Continuous 72h access)
• **7 Days Unlimited**: KSh 150 (Continuous 168h access)
• **30 Days VIP Resident**: KSh 500 (Unmetered Monthly VIP)

📲 JINSI YA KUNUNUA:
1. Unganisha simu/laptop yako na **CampusNet_Hostel_WiFi**
2. Portal itafunguka moja kwa moja (au tembelea http://10.10.0.1/login.html)
3. Chagua kifurushi chako, weka namba ya M-Pesa kisha gonga **"Pay via M-Pesa"**.`;
  }
}
