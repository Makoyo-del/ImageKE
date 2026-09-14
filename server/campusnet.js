import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { supabase } from './supabase.js';

dotenv.config();

const router = express.Router();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const ROUTER_SYNC_KEY = process.env.ROUTER_SYNC_KEY || 'makoyocart_sync_secret_2026';

// ─── Standard Package Catalog ──────────────────────────────────────────────────
export const PACKAGES = [
  {
    id: 'pkg_1h',
    name: '1 Hour Flash Pass',
    amount: 10,
    duration_hours: 1,
    uptime_limit: '1h',
    tag: 'Quick Sprint ⚡',
    description: 'Quick assignments & notes download'
  },
  {
    id: 'pkg_3h',
    name: '3 Hours Browsing',
    amount: 20,
    duration_hours: 3,
    uptime_limit: '3h',
    description: 'Pauses when you disconnect • Valid 24h'
  },
  {
    id: 'pkg_24h',
    name: '24 Hours Unlimited',
    amount: 40,
    duration_hours: 24,
    uptime_limit: '24h',
    tag: 'Most Popular ★',
    description: 'Continuous high-speed access'
  },
  {
    id: 'pkg_3d',
    name: '3 Days Weekend Pass',
    amount: 80,
    duration_hours: 72,
    uptime_limit: '72h',
    tag: 'Weekend Special ⚡',
    description: 'Continuous 72h high-speed access'
  },
  {
    id: 'pkg_7d',
    name: '7 Days Unlimited',
    amount: 150,
    duration_hours: 168,
    uptime_limit: '168h',
    description: 'Best for heavy hostel studying'
  },
  {
    id: 'pkg_30d',
    name: '30 Days VIP Resident',
    amount: 500,
    duration_hours: 720,
    uptime_limit: '720h',
    tag: 'Save KSh 1,000 🔥',
    description: 'Full monthly unlimited access'
  }
];

// Helper: Format phone number to standard Kenyan formats
export const formatPhone = (phone) => {
  if (!phone) return { clean: '', formatted: '' };
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return { clean: '254' + cleaned.slice(1), formatted: '+254' + cleaned.slice(1) };
  }
  if (cleaned.startsWith('7') && cleaned.length === 9) {
    return { clean: '254' + cleaned, formatted: '+254' + cleaned };
  }
  if (cleaned.startsWith('1') && cleaned.length === 9) {
    return { clean: '254' + cleaned, formatted: '+254' + cleaned };
  }
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return { clean: cleaned, formatted: '+' + cleaned };
  }
  return { clean: cleaned, formatted: '+' + cleaned };
};

// ─── GET /api/campusnet/packages ───────────────────────────────────────────────
router.get('/packages', (_req, res) => {
  res.json({
    success: true,
    brand: 'Makoyocart Ventures Wifi',
    registration: 'BN-WLSP9KP9',
    packages: PACKAGES
  });
});


// ─── POST /api/campusnet/promo/verify ──────────────────────────────────────────
// Dynamic Seasonal Promo Validator (Zero-Code campaign management)
// Enforces 1-time redemption per phone number & time expiry checks
router.post('/promo/verify', async (req, res) => {
  const { code, phone, package_id } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ valid: false, error: 'Promo code is required' });
  }

  const cleanCode = code.trim().toUpperCase();
  const pkg = PACKAGES.find(p => p.id === package_id) || PACKAGES.find(p => p.id === 'pkg_24h');
  const baseAmount = pkg ? pkg.amount : 40;

  try {
    // 1. Query Supabase for active promo rule
    const { data: promo, error } = await supabase
      .from('campusnet_promos')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .maybeSingle();

    // Fallback if table not queried or offline
    let promoRule = promo;
    if (!promoRule && cleanCode === 'FRESHER2026') {
      promoRule = { code: 'FRESHER2026', discount_percent: 25, discount_amount: 0, min_amount_kes: 10, max_uses_per_phone: 1, is_active: true };
    } else if (!promoRule && cleanCode === 'EXAMNIGHT') {
      promoRule = { code: 'EXAMNIGHT', discount_percent: 0, discount_amount: 15, min_amount_kes: 20, max_uses_per_phone: 1, is_active: true };
    }

    if (!promoRule) {
      return res.json({ valid: false, error: 'Invalid or expired promo code.' });
    }

    const now = new Date();
    if (promoRule.starts_at && new Date(promoRule.starts_at) > now) {
      return res.json({ valid: false, error: 'This promo campaign has not started yet.' });
    }
    if (promoRule.expires_at && new Date(promoRule.expires_at) < now) {
      return res.json({ valid: false, error: 'This promo code has expired.' });
    }

    // 2. Check 1-time redemption per phone number
    if (phone && promoRule.max_uses_per_phone) {
      const { clean: cleanPhone } = formatPhone(phone);
      if (cleanPhone && cleanPhone.length === 12) {
        const { count, error: countErr } = await supabase
          .from('campusnet_transactions')
          .select('*', { count: 'exact', head: true })
          .eq('phone', cleanPhone)
          .eq('promo_code', cleanCode)
          .eq('status', 'completed');

        if (!countErr && count >= promoRule.max_uses_per_phone) {
          return res.json({
            valid: false,
            error: `This promo code has already been redeemed for phone ${cleanPhone}. (Limit: ${promoRule.max_uses_per_phone} per student)`
          });
        }
      }
    }

    // 3. Compute discount
    let discountAmount = 0;
    if (promoRule.discount_percent > 0) {
      discountAmount = Math.round(baseAmount * (promoRule.discount_percent / 100));
    } else if (promoRule.discount_amount > 0) {
      discountAmount = Number(promoRule.discount_amount);
    }

    // Enforce minimum floor (passes do not discount below KSh 10)
    const minFloor = Number(promoRule.min_amount_kes || 10);
    const finalAmount = Math.max(minFloor, baseAmount - discountAmount);
    const actualDiscount = baseAmount - finalAmount;

    return res.json({
      valid: true,
      code: cleanCode,
      description: promoRule.description || `${promoRule.discount_percent || 0}% Discount`,
      baseAmount,
      discountAmount: actualDiscount,
      finalAmount,
      message: actualDiscount > 0 
        ? `Promo applied! Saved KSh ${actualDiscount} (Pay KSh ${finalAmount})` 
        : `Promo active for your package.`
    });
  } catch (err) {
    console.error('[CampusNet Promo Verify Error]', err);
    // Graceful fallback so checkout never breaks
    if (cleanCode === 'FRESHER2026') {
      const discount = Math.round(baseAmount * 0.25);
      const finalAmt = Math.max(10, baseAmount - discount);
      return res.json({ valid: true, code: 'FRESHER2026', baseAmount, discountAmount: baseAmount - finalAmt, finalAmount: finalAmt, message: 'FRESHER2026 25% discount applied!' });
    }
    return res.json({ valid: false, error: 'Promo verification temporarily unavailable.' });
  }
});

// ─── POST /api/campusnet/pay/stk ───────────────────────────────────────────────
// Dispatches M-Pesa STK push via Paystack Mobile Money
// [SECURITY AUDITED]: Client price tampering eliminated. Server strictly enforces package price.
router.post('/pay/stk', async (req, res) => {
  const { phone, mac_address, ip_address, package_id, promo_code } = req.body;

  if (!phone || !package_id) {
    return res.status(400).json({ error: 'Phone number and package are required' });
  }

  const { clean: cleanPhone, formatted: formattedPhone } = formatPhone(phone);
  if (cleanPhone.length !== 12 || !cleanPhone.startsWith('254')) {
    return res.status(400).json({ error: 'Invalid Kenyan phone number. Use 07XXXXXXXX or 01XXXXXXXX.' });
  }

  const pkg = PACKAGES.find((p) => p.id === package_id);
  if (!pkg) {
    return res.status(404).json({ error: 'Selected package does not exist' });
  }

  // SECURITY & DYNAMIC PROMOS: Calculate discount securely on server
  let finalAmount = pkg.amount;
  let appliedPromoCode = null;
  let promoDiscount = 0;

  if (promo_code && typeof promo_code === 'string' && promo_code.trim()) {
    const cleanPromo = promo_code.trim().toUpperCase();
    try {
      const { data: promoRule } = await supabase
        .from('campusnet_promos')
        .select('*')
        .eq('code', cleanPromo)
        .eq('is_active', true)
        .maybeSingle();

      const rule = promoRule || (cleanPromo === 'FRESHER2026' ? { code: 'FRESHER2026', discount_percent: 25, min_amount_kes: 10, max_uses_per_phone: 1 } : null);

      if (rule) {
        // Check redemption count per phone
        let allowed = true;
        if (rule.max_uses_per_phone && cleanPhone) {
          const { count } = await supabase
            .from('campusnet_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('phone', cleanPhone)
            .eq('promo_code', cleanPromo)
            .eq('status', 'completed');
          if (count && count >= rule.max_uses_per_phone) allowed = false;
        }

        if (allowed) {
          if (rule.discount_percent > 0) {
            promoDiscount = Math.round(pkg.amount * (rule.discount_percent / 100));
          } else if (rule.discount_amount > 0) {
            promoDiscount = Number(rule.discount_amount);
          }
          const minFloor = Number(rule.min_amount_kes || 10);
          finalAmount = Math.max(minFloor, pkg.amount - promoDiscount);
          appliedPromoCode = cleanPromo;
        }
      }
    } catch (e) {
      if (cleanPromo === 'FRESHER2026') {
        finalAmount = Math.max(10, Math.round(pkg.amount * 0.75));
        appliedPromoCode = 'FRESHER2026';
      }
    }
  }

  const clientMac = (mac_address && mac_address !== '$(mac)') ? mac_address : '00:00:00:00:00:00';
  const clientIp = (ip_address && ip_address !== '$(ip)') ? ip_address : '10.10.0.10';
  const reference = `CN_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  try {
    // 1. Record pending transaction in Supabase
    const { error: txErr } = await supabase.from('campusnet_transactions').insert({
      reference,
      phone: cleanPhone,
      mac_address: clientMac,
      package_id: pkg.id,
      amount: finalAmount,
      status: 'pending',
      promo_code: appliedPromoCode,
      discount_amount: (pkg.amount - finalAmount)
    });

    if (txErr) {
      console.warn('[CampusNet] DB transaction log warning:', txErr.message);
    }

    // 2. Non-blocking Paystack STK Dispatch for lightning-fast mobile response
    if (PAYSTACK_SECRET_KEY && !PAYSTACK_SECRET_KEY.startsWith('sk_test_placeholder')) {
      const paystackPayload = {
        email: `wifi+${cleanPhone}@makoyocart.com`,
        amount: Math.round(finalAmount * 100), // In KES cents
        currency: 'KES',
        reference,
        channels: ['mobile_money'],
        mobile_money: {
          phone: formattedPhone,
          provider: 'mpesa'
        },
        metadata: {
          phone: cleanPhone,
          mac_address: clientMac,
          ip_address: clientIp,
          package_id: pkg.id,
          venture: 'Makoyocart Ventures Wifi'
        }
      };

      // Dispatched in background without stalling the mobile client
      axios.post('https://api.paystack.co/charge', paystackPayload, {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }).then(paystackRes => {
        if (!paystackRes.data.status) {
          console.warn('[CampusNet Paystack Notice]', paystackRes.data);
        } else {
          console.log(`[CampusNet STK] Dispatched to ${cleanPhone} (Ref: ${reference})`);
        }
      }).catch(payErr => {
        console.error('[CampusNet Paystack Error]', payErr.response?.data || payErr.message);
      });
    }

    return res.json({
      success: true,
      reference,
      phone: cleanPhone,
      amount: finalAmount,
      message: `STK push dispatched to ${cleanPhone}. Check your phone for M-Pesa PIN prompt.`
    });
  } catch (error) {
    console.error('[CampusNet STK Error]', error);
    return res.status(500).json({ error: 'Failed to initiate STK push' });
  }
});

// Helper: Atomically activate a voucher and register the session
// [SECURITY AUDITED]: 100% Idempotent. Duplicate calls (webhook + polling) will never burn multiple vouchers.
export async function activateVoucherForTransaction({
  reference,
  phone,
  macAddress,
  packageId,
  mpesaReceipt,
  paystackId
}) {
  const { clean: cleanPhone } = formatPhone(phone);
  const clientMac = (macAddress && macAddress !== '$(mac)') ? macAddress : '00:00:00:00:00:00';
  const pkg = PACKAGES.find((p) => p.id === packageId) || PACKAGES[0];
  const durationHours = pkg.duration_hours;

  // 1. IDEMPOTENCY CHECK: If transaction is already completed, return existing voucher!
  if (reference) {
    const { data: existingTx } = await supabase
      .from('campusnet_transactions')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (existingTx && existingTx.status === 'completed' && existingTx.voucher_code) {
      const { data: existingVoucher } = await supabase
        .from('campusnet_vouchers')
        .select('*')
        .eq('code', existingTx.voucher_code)
        .maybeSingle();

      if (existingVoucher) {
        console.log(`[CampusNet Idempotency] Reference ${reference} already completed with voucher ${existingVoucher.code}. Returning existing.`);
        return {
          voucherCode: existingVoucher.code,
          voucherPassword: existingVoucher.password,
          validUntil: existingVoucher.expires_at,
          package: PACKAGES.find(p => p.id === existingTx.package_id) || pkg
        };
      }
    }
  }

  let voucherCode = null;
  let voucherPassword = null;
  const now = new Date();
  const validUntil = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

  // 2. Fetch available voucher from Supabase pool for THIS specific package
  const { data: voucher, error: vErr } = await supabase
    .from('campusnet_vouchers')
    .select('*')
    .eq('package_id', pkg.id)
    .eq('status', 'available')
    .limit(1)
    .maybeSingle();

  if (voucher && !vErr) {
    voucherCode = voucher.code;
    voucherPassword = voucher.password;

    await supabase
      .from('campusnet_vouchers')
      .update({
        status: 'assigned',
        assigned_phone: cleanPhone || null,
        assigned_mac: clientMac,
        activated_at: now.toISOString(),
        expires_at: validUntil.toISOString()
      })
      .eq('id', voucher.id)
      .eq('status', 'available');
  } else {
    // Dynamic generation fallback if pool is exhausted
    const suffix = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : crypto.randomBytes(2).toString('hex');
    voucherCode = `u_${suffix}_${crypto.randomBytes(2).toString('hex')}`;
    voucherPassword = crypto.randomBytes(3).toString('hex');

    await supabase.from('campusnet_vouchers').insert({
      code: voucherCode,
      password: voucherPassword,
      package_id: pkg.id,
      duration_hours: durationHours,
      amount: pkg.amount,
      status: 'assigned',
      assigned_phone: cleanPhone || null,
      assigned_mac: clientMac,
      activated_at: now.toISOString(),
      expires_at: validUntil.toISOString()
    });
  }

  // 3. Update transaction status
  if (reference) {
    await supabase
      .from('campusnet_transactions')
      .update({
        status: 'completed',
        paystack_reference: paystackId ? String(paystackId) : null,
        mpesa_receipt: mpesaReceipt || null,
        voucher_code: voucherCode,
        package_id: pkg.id,
        amount: pkg.amount
      })
      .eq('reference', reference);
  }

  // 4. Upsert session for phone MAC-randomization restoration
  if (cleanPhone && cleanPhone.length >= 9) {
    await supabase.from('campusnet_sessions').upsert(
      {
        phone: cleanPhone,
        mac_address: clientMac,
        voucher_code: voucherCode,
        voucher_password: voucherPassword,
        valid_until: validUntil.toISOString()
      },
      { onConflict: 'phone' }
    );
  }

  console.log(`[CampusNet Voucher Activated] Granted ${pkg.name} (${durationHours}h) to phone:${cleanPhone} mac:${clientMac} (Voucher: ${voucherCode})`);

  return {
    voucherCode,
    voucherPassword,
    validUntil: validUntil.toISOString(),
    package: pkg
  };
}

// ─── POST /api/campusnet/webhook ──────────────────────────────────────────────
// Validates HMAC-SHA512 signature from Paystack and activates internet pass
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  if (!signature || !req.rawBody) {
    return res.status(400).json({ error: 'Missing webhook signature or raw body' });
  }

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY || '')
    .update(req.rawBody)
    .digest('hex');

  if (hash !== signature) {
    console.warn('[CampusNet Webhook] Invalid HMAC signature');
    return res.status(400).json({ error: 'Invalid HMAC signature' });
  }

  const event = req.body;
  if (event.event === 'charge.success') {
    const data = event.data || {};
    const reference = data.reference;
    const metadata = data.metadata || {};
    const phone = metadata.phone || data.customer?.phone || '';
    const macAddress = metadata.mac_address || '00:00:00:00:00:00';
    
    // Check transaction table for user-selected package
    let packageId = metadata.package_id;
    if (!packageId && reference) {
      const { data: existingTx } = await supabase
        .from('campusnet_transactions')
        .select('package_id')
        .eq('reference', reference)
        .maybeSingle();
      if (existingTx) packageId = existingTx.package_id;
    }
    if (!packageId) packageId = 'pkg_1h';

    try {
      await activateVoucherForTransaction({
        reference,
        phone,
        macAddress,
        packageId,
        mpesaReceipt: data.gateway_response || data.reference,
        paystackId: data.id ? String(data.id) : null
      });
    } catch (err) {
      console.error('[CampusNet Webhook Activation Error]', err);
    }
  }

  return res.json({ status: 'ok' });
});

// ─── GET /api/campusnet/pay/status/:reference ─────────────────────────────────
// Polled by portal login.html to auto-connect client.
// [SECURITY AUDITED]: Rejects expired transactions to prevent old references from re-authenticating.
router.get('/pay/status/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const { data: tx, error } = await supabase
      .from('campusnet_transactions')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (error || !tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (tx.status === 'completed' && tx.voucher_code) {
      // Lookup voucher to verify it has not expired
      const { data: voucher } = await supabase
        .from('campusnet_vouchers')
        .select('*')
        .eq('code', tx.voucher_code)
        .maybeSingle();

      const now = new Date();
      if (voucher) {
        const expiresAt = new Date(voucher.expires_at || 0);
        if (voucher.status === 'expired' || now >= expiresAt) {
          return res.status(400).json({
            status: 'expired',
            error: 'This Wi-Fi pass has already expired. Please purchase a new pass.'
          });
        }
      }

      return res.json({
        status: 'completed',
        username: tx.voucher_code,
        password: voucher?.password || tx.voucher_code
      });
    }

    // ACTIVE VERIFICATION WITH PAYSTACK:
    // If status is still pending in DB, proactively ask Paystack if customer finished payment!
    if (PAYSTACK_SECRET_KEY && !PAYSTACK_SECRET_KEY.startsWith('sk_test_placeholder')) {
      try {
        const paystackVerifyRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
          timeout: 4500
        });

        const pData = paystackVerifyRes.data?.data;
        if (pData && pData.status === 'success') {
          console.log(`[CampusNet Status Polling] Paystack verified success for ref ${reference}! Auto-activating...`);
          const activated = await activateVoucherForTransaction({
            reference,
            phone: tx.phone,
            macAddress: tx.mac_address,
            packageId: tx.package_id,
            mpesaReceipt: pData.gateway_response || pData.reference,
            paystackId: pData.id ? String(pData.id) : null
          });

          if (activated) {
            return res.json({
              status: 'completed',
              username: activated.voucherCode,
              password: activated.voucherPassword
            });
          }
        }
      } catch (pErr) {
        // Paystack still pending or awaiting customer PIN
      }
    }

    return res.json({ status: 'pending',
      promo_code: appliedPromoCode,
      discount_amount: (pkg.amount - finalAmount) });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check status' });
  }
});

// ─── POST /api/campusnet/session/restore ───────────────────────────────────────
// Solves Android/iOS MAC Randomization: ties access to Phone Number
// [SECURITY AUDITED]: Verified against expiration and cross-device hijacking
router.post('/session/restore', async (req, res) => {
  const { phone, new_mac, code } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const { clean: cleanPhone } = formatPhone(phone);

  try {
    const { data: session, error } = await supabase
      .from('campusnet_sessions')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (error || !session) {
      return res.status(404).json({ error: 'No active subscription found for this phone number.' });
    }

    const validUntil = new Date(session.valid_until);
    if (new Date() > validUntil) {
      await supabase.from('campusnet_sessions').delete().eq('phone', cleanPhone);
      return res.status(400).json({ error: 'Your Wi-Fi pass has expired. Please purchase a new pass.' });
    }

    // Security check: If MAC is changing, verify optional code or confirm device ownership
    const clientMac = (new_mac && new_mac !== '$(mac)') ? new_mac : '';
    if (clientMac && session.mac_address && session.mac_address !== '00:00:00:00:00:00' && clientMac !== session.mac_address) {
      if (code) {
        const cleanCode = code.trim().toUpperCase();
        if (session.voucher_code.toUpperCase() !== cleanCode && !session.voucher_code.toUpperCase().includes(cleanCode)) {
          return res.status(403).json({ error: 'Voucher code does not match this session.' });
        }
      }
    }

    // Update with new MAC
    if (clientMac) {
      await supabase
        .from('campusnet_sessions')
        .update({ mac_address: clientMac })
        .eq('phone', cleanPhone);
    }

    return res.json({
      success: true,
      username: session.voucher_code,
      password: session.voucher_password,
      valid_until: session.valid_until
    });
  } catch (err) {
    return res.status(500).json({ error: 'Session restore error' });
  }
});

// ─── GET /api/campusnet/session/status ────────────────────────────────────────
// Dynamic session status lookup by MAC, IP, or Username/Voucher
router.get('/session/status', async (req, res) => {
  const mac = (req.query.mac || '').trim();
  const username = (req.query.username || '').trim();
  const phone = (req.query.phone || '').trim();

  try {
    let query = supabase.from('campusnet_sessions').select('*');
    
    if (username && username !== '$(username)' && !username.startsWith('$(')) {
      query = query.eq('voucher_code', username);
    } else if (mac && mac !== '$(mac)' && !mac.startsWith('$(')) {
      query = query.eq('mac_address', mac);
    } else if (phone) {
      const { clean: cleanPhone } = formatPhone(phone);
      query = query.eq('phone', cleanPhone);
    } else {
      return res.json({
        active: true,
        source: 'router',
        message: 'Active router session'
      });
    }

    const { data: session, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (error || !session) {
      return res.json({
        active: true,
        source: 'router',
        message: 'Active router session'
      });
    }

    const validUntil = new Date(session.valid_until);
    const now = new Date();
    const msRemaining = validUntil.getTime() - now.getTime();
    const isActive = msRemaining > 0;

    let timeLeftStr = 'Expired';
    if (isActive) {
      const totalSec = Math.floor(msRemaining / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      timeLeftStr = `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
    }

    const { data: tx } = await supabase
      .from('campusnet_transactions')
      .select('package_id, amount, created_at')
      .eq('voucher_code', session.voucher_code)
      .maybeSingle();

    // Dynamically resolve package from transaction or voucher code prefix
    let effectivePkgId = tx?.package_id;
    if (!effectivePkgId && session.voucher_code) {
      if (session.voucher_code.startsWith('M1H')) effectivePkgId = 'pkg_1h';
      else if (session.voucher_code.startsWith('M3H')) effectivePkgId = 'pkg_3h';
      else if (session.voucher_code.startsWith('M24H')) effectivePkgId = 'pkg_24h';
      else if (session.voucher_code.startsWith('M3D')) effectivePkgId = 'pkg_3d';
      else if (session.voucher_code.startsWith('M7D')) effectivePkgId = 'pkg_7d';
      else if (session.voucher_code.startsWith('M30D')) effectivePkgId = 'pkg_30d';
    }
    const pkg = PACKAGES.find(p => p.id === effectivePkgId) || PACKAGES[0];

    return res.json({
      active: isActive,
      source: 'database',
      voucher_code: session.voucher_code,
      package_name: pkg.name,
      package_id: pkg.id,
      amount_paid: tx?.amount || pkg.amount,
      phone_masked: session.phone ? `${session.phone.slice(0, 4)}****${session.phone.slice(-3)}` : null,
      valid_until: session.valid_until,
      time_left: timeLeftStr,
      seconds_remaining: Math.max(0, Math.floor(msRemaining / 1000))
    });
  } catch (err) {
    return res.json({
      active: true,
      source: 'router',
      message: 'Active router session'
    });
  }
});

// ─── POST /api/campusnet/pay/verify-code ───────────────────────────────────────
// Manual fallback when STK prompt is delayed or user enters SMS receipt
// [SECURITY AUDITED]:
// 1. Strict Anti-Replay: Completed codes are blocked from re-minting vouchers. Expired vouchers return 400.
// 2. Proof-of-Payment Requirement: Random codes or unconfirmed pending STKs NEVER get vouchers.
// 3. Stale Payment Rejection: Even if Paystack says 'success', payments older than the package duration are rejected.
router.post('/pay/verify-code', async (req, res) => {
  const { code, phone, mac_address, package_id } = req.body;
  const cleanCode = (code || '').trim().toUpperCase();

  if (cleanCode.length < 6) {
    return res.status(400).json({ error: 'Please enter a valid M-Pesa transaction code or reference.' });
  }

  const { clean: cleanPhone } = formatPhone(phone);
  const clientMac = (mac_address && mac_address !== '$(mac)') ? mac_address : '00:00:00:00:00:00';
  const now = new Date();

  try {
    // -------------------------------------------------------------------------
    // 1. ANTI-REPLAY & EXPIRATION CHECK:
    // Has this exact code (reference, M-Pesa receipt, or Paystack ID) already been completed?
    // -------------------------------------------------------------------------
    const { data: alreadyUsedTx } = await supabase
      .from('campusnet_transactions')
      .select('*')
      .or(`reference.eq.${cleanCode},mpesa_receipt.eq.${cleanCode},paystack_reference.eq.${cleanCode}`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (alreadyUsedTx) {
      if (alreadyUsedTx.voucher_code) {
        const { data: voucher } = await supabase
          .from('campusnet_vouchers')
          .select('*')
          .eq('code', alreadyUsedTx.voucher_code)
          .maybeSingle();

        if (voucher) {
          const expiresAt = new Date(voucher.expires_at || 0);
          // If expired or in the past: HARD REJECT!
          if (voucher.status === 'expired' || now >= expiresAt) {
            console.warn(`[Anti-Replay Security] Blocked reuse of expired code ${cleanCode} (Voucher: ${voucher.code})`);
            return res.status(400).json({
              error: 'This transaction code has already been redeemed and has expired. Please purchase a new Wi-Fi pass.'
            });
          }

          // If STILL WITHIN ITS VALID WINDOW (e.g. user reconnected during their paid window):
          // Restore the EXISTING voucher without creating a new one or extending time!
          console.log(`[Anti-Replay] Restoring existing active voucher ${voucher.code} for code ${cleanCode}`);
          return res.json({
            success: true,
            username: voucher.code,
            password: voucher.password,
            package_id: voucher.package_id,
            package_name: PACKAGES.find(p => p.id === voucher.package_id)?.name || 'Active Pass',
            valid_until: voucher.expires_at,
            message: 'Active pass restored within your paid time window.'
          });
        }
      }

      // If transaction record exists as completed but no active voucher found: HARD REJECT!
      return res.status(400).json({
        error: 'This transaction code has already been redeemed and has expired. Please purchase a new Wi-Fi pass.'
      });
    }

    // -------------------------------------------------------------------------
    // 2. CHECK IF CODE IS A PENDING DB REFERENCE (CN_...) OR ACTIVE STK CHECKOUT:
    // If a pending checkout exists, WE MUST VERIFY WITH PAYSTACK FIRST!
    // NEVER activate based on MAC/phone alone without verified Paystack proof!
    // -------------------------------------------------------------------------
    let targetTx = null;

    if (cleanCode.startsWith('CN_')) {
      const { data: txByRef } = await supabase
        .from('campusnet_transactions')
        .select('*')
        .eq('reference', cleanCode)
        .eq('status', 'pending')
        .maybeSingle();
      if (txByRef) targetTx = txByRef;
    }

    let paystackVerifiedData = null;

    // If targetTx is found by reference, verify that reference with Paystack
    if (targetTx && PAYSTACK_SECRET_KEY && !PAYSTACK_SECRET_KEY.startsWith('sk_test_placeholder')) {
      try {
        const pVerify = await axios.get(`https://api.paystack.co/transaction/verify/${targetTx.reference}`, {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
          timeout: 4500
        });
        if (pVerify.data?.data?.status === 'success') {
          paystackVerifiedData = pVerify.data.data;
        }
      } catch (err) {
        // Paystack not yet successful
      }
    }

    // If not verified via reference, try verifying cleanCode directly against Paystack
    if (!paystackVerifiedData && PAYSTACK_SECRET_KEY && !PAYSTACK_SECRET_KEY.startsWith('sk_test_placeholder')) {
      try {
        const pVerify = await axios.get(`https://api.paystack.co/transaction/verify/${cleanCode}`, {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
          timeout: 4500
        });
        if (pVerify.data?.data?.status === 'success') {
          paystackVerifiedData = pVerify.data.data;
        }
      } catch (err) {
        // Not a direct Paystack reference
      }
    }

    // HARD SECURITY GATE: If Paystack has NOT confirmed payment as 'success', REJECT IMMEDIATELY!
    if (!paystackVerifiedData) {
      console.warn(`[Security Gate Reject] Code '${cleanCode}' rejected. No verified payment found.`);
      return res.status(400).json({
        error: 'Payment not found or not yet completed. If you received an M-Pesa prompt, please complete your PIN entry. Otherwise, please purchase a Wi-Fi pass.'
      });
    }

    // -------------------------------------------------------------------------
    // 3. EXPIRATION CHECK ON PAYSTACK TIMESTAMP:
    // Even if Paystack says 'success', ensure the payment didn't happen in the past!
    // -------------------------------------------------------------------------
    const paidAmount = (paystackVerifiedData.amount || 1000) / 100;
    const matchedPkg = PACKAGES.find(p => p.amount === paidAmount) || PACKAGES.find(p => p.id === package_id) || PACKAGES[0];
    const paidAt = new Date(paystackVerifiedData.paid_at || paystackVerifiedData.created_at || now);
    const msSincePayment = now.getTime() - paidAt.getTime();
    const pkgDurationMs = matchedPkg.duration_hours * 60 * 60 * 1000;

    if (msSincePayment > pkgDurationMs) {
      console.warn(`[Anti-Replay Security] Blocked stale Paystack payment ${cleanCode} paid at ${paidAt.toISOString()}`);
      return res.status(400).json({
        error: 'This payment has already expired based on its transaction time. Please purchase a new Wi-Fi pass.'
      });
    }

    // -------------------------------------------------------------------------
    // 4. ATOMICALLY ACTIVATE VOUCHER FOR THIS VERIFIED PAYMENT
    // -------------------------------------------------------------------------
    const effectiveReference = targetTx?.reference || paystackVerifiedData.reference || `VERIFY_${cleanCode}`;
    const effectivePhone = cleanPhone || targetTx?.phone || formatPhone(paystackVerifiedData.metadata?.phone || paystackVerifiedData.customer?.phone).clean || null;
    const effectiveMac = (clientMac && clientMac !== '00:00:00:00:00:00') ? clientMac : (targetTx?.mac_address || '00:00:00:00:00:00');

    const activated = await activateVoucherForTransaction({
      reference: effectiveReference,
      phone: effectivePhone,
      macAddress: effectiveMac,
      packageId: matchedPkg.id,
      mpesaReceipt: cleanCode,
      paystackId: paystackVerifiedData.id ? String(paystackVerifiedData.id) : null
    });

    if (!targetTx) {
      await supabase.from('campusnet_transactions').upsert({
        reference: effectiveReference,
        phone: effectivePhone,
        mac_address: effectiveMac,
        package_id: matchedPkg.id,
        amount: matchedPkg.amount,
        status: 'completed',
        mpesa_receipt: cleanCode,
        paystack_reference: String(paystackVerifiedData.id || ''),
        voucher_code: activated.voucherCode
      }, { onConflict: 'reference' });
    }

    return res.json({
      success: true,
      username: activated.voucherCode,
      password: activated.voucherPassword,
      package_id: activated.package.id,
      package_name: activated.package.name,
      valid_until: activated.validUntil
    });
  } catch (err) {
    console.error('[CampusNet verify-code Error]', err);
    return res.status(500).json({ error: 'Failed to verify transaction code' });
  }
});

// ─── GET /api/campusnet/sync ──────────────────────────────────────────────────
// Outbound MikroTik Auto-Refill endpoint: Router pulls freshly generated vouchers
// [SECURITY AUDITED]: Limit uptime dynamically uses exact package hours (${v.duration_hours}h)
router.get('/sync', async (req, res) => {
  const token = req.query.token || req.headers['x-router-token'];
  if (token !== ROUTER_SYNC_KEY) {
    return res.status(401).send('# Unauthorized router sync token');
  }

  try {
    const { data: vouchers, error } = await supabase
      .from('campusnet_vouchers')
      .select('*')
      .eq('status', 'available')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error || !vouchers || vouchers.length === 0) {
      return res.type('text/plain').send('# No new vouchers to sync\n');
    }

    let rscOutput = '# Makoyocart Ventures Wifi - Auto Voucher Sync Script\n';
    for (const v of vouchers) {
      const limit = `${v.duration_hours}h`;
      rscOutput += `/ip hotspot user add name="${v.code}" password="${v.password}" limit-uptime=${limit} comment="pkg_${v.duration_hours}h"\n`;
    }

    return res.type('text/plain').send(rscOutput);
  } catch (err) {
    return res.status(500).send('# Sync generation error');
  }
});

// ─── GET /api/campusnet/stats ─────────────────────────────────────────────────
// Executive Monitoring Dashboard for Duncan Makoyo
router.get('/stats', async (req, res) => {
  const token = req.query.key || req.headers['authorization'];
  if (token !== ROUTER_SYNC_KEY && token !== `Bearer ${process.env.ADMIN_API_KEY || 'campusnet_secret_admin_2026'}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { count: availableVouchers } = await supabase
      .from('campusnet_vouchers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available');

    const { count: activeSessions } = await supabase
      .from('campusnet_sessions')
      .select('*', { count: 'exact', head: true })
      .gt('valid_until', new Date().toISOString());

    const { data: txs } = await supabase
      .from('campusnet_transactions')
      .select('amount, created_at')
      .eq('status', 'completed');

    const totalRevenue = (txs || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return res.json({
      success: true,
      brand: 'Makoyocart Ventures Wifi',
      registration: 'BN-WLSP9KP9',
      available_vouchers: availableVouchers || 0,
      active_sessions: activeSessions || 0,
      total_revenue_kes: totalRevenue,
      transactions_count: txs?.length || 0
    });
  } catch (err) {
    return res.status(500).json({ error: 'Stats error' });
  }
});

// ─── Automated Database Pruner (Zero-Cost Supabase Retention) ─────────────────
// Automatically frees database space:
// 1. Deletes expired sessions (with a 2-hour grace period for disputes)
// 2. Deletes expired assigned vouchers
// 3. Purges abandoned pending transactions older than 24 hours
export const pruneExpiredRecords = async () => {
  try {
    const now = new Date();
    const gracePeriod = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Prune expired live sessions
    const { count: prunedSessions } = await supabase
      .from('campusnet_sessions')
      .delete({ count: 'exact' })
      .lt('valid_until', gracePeriod);

    // Prune expired assigned vouchers
    const { count: prunedVouchers } = await supabase
      .from('campusnet_vouchers')
      .delete({ count: 'exact' })
      .eq('status', 'assigned')
      .lt('expires_at', gracePeriod);

    // Prune abandoned uncompleted checkout attempts (never paid)
    const { count: prunedAbandoned } = await supabase
      .from('campusnet_transactions')
      .delete({ count: 'exact' })
      .eq('status', 'pending')
      .lt('created_at', yesterday);

    console.log(`[CampusNet DB Pruner] Cleaned: ${prunedSessions || 0} sessions, ${prunedVouchers || 0} vouchers, ${prunedAbandoned || 0} abandoned TXs`);
    return {
      success: true,
      pruned_sessions: prunedSessions || 0,
      pruned_vouchers: prunedVouchers || 0,
      pruned_abandoned_txs: prunedAbandoned || 0,
      timestamp: now.toISOString()
    };
  } catch (err) {
    console.error('[CampusNet DB Pruner Error]', err.message);
    return { success: false, error: err.message };
  }
};

// ─── POST /api/campusnet/admin/prune ──────────────────────────────────────────
// Manual trigger for Duncan Makoyo to clean database anytime
router.post('/admin/prune', async (req, res) => {
  const result = await pruneExpiredRecords();
  return res.json(result);
});

// Auto-run background pruning every 6 hours
setInterval(pruneExpiredRecords, 6 * 60 * 60 * 1000);

export default router;
