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

// ─── POST /api/campusnet/pay/stk ───────────────────────────────────────────────
// Dispatches M-Pesa STK push via Paystack Mobile Money
router.post('/pay/stk', async (req, res) => {
  const { phone, mac_address, ip_address, package_id, amount, promo_code } = req.body;

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

  let finalAmount = Number(amount) || pkg.amount;
  if (promo_code && promo_code.trim().toUpperCase() === 'FRESHER2026') {
    finalAmount = Math.max(10, finalAmount * 0.75); // 25% discount
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
      status: 'pending'
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
  // NEVER default to 24h! Default to 1 Hour Flash Pass (pkg_1h, 10 KES)
  const pkg = PACKAGES.find((p) => p.id === packageId) || PACKAGES[0];
  const durationHours = pkg.duration_hours;

  let voucherCode = null;
  let voucherPassword = null;

  // 1. Fetch available voucher from Supabase pool for THIS specific package
  const { data: voucher, error: vErr } = await supabase
    .from('campusnet_vouchers')
    .select('*')
    .eq('package_id', pkg.id)
    .eq('status', 'available')
    .limit(1)
    .maybeSingle();

  const now = new Date();
  const validUntil = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

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
      .eq('id', voucher.id);
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

  // 2. Update transaction status
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

  // 3. Upsert session for phone MAC-randomization restoration
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
    
    // Check transaction table for user-selected package to avoid falling back to 24h
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
// Proactively verifies status with Paystack if DB is pending (no webhook delay!)
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
      // Lookup voucher password if stored
      const { data: voucher } = await supabase
        .from('campusnet_vouchers')
        .select('password')
        .eq('code', tx.voucher_code)
        .maybeSingle();

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

    return res.json({ status: 'pending' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check status' });
  }
});

// ─── POST /api/campusnet/session/restore ───────────────────────────────────────
// Solves Android/iOS MAC Randomization: ties access to Phone Number
router.post('/session/restore', async (req, res) => {
  const { phone, new_mac } = req.body;
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

    // Update with new MAC
    if (new_mac && new_mac !== '$(mac)') {
      await supabase
        .from('campusnet_sessions')
        .update({ mac_address: new_mac })
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
// Manual fallback when STK is delayed or student paid via Till/Paybill
router.post('/pay/verify-code', async (req, res) => {
  const { code, phone, mac_address, package_id } = req.body;
  const cleanCode = (code || '').trim().toUpperCase();

  if (cleanCode.length < 6) {
    return res.status(400).json({ error: 'Please enter a valid M-Pesa transaction code or reference.' });
  }

  const { clean: cleanPhone } = formatPhone(phone);
  const clientMac = (mac_address && mac_address !== '$(mac)') ? mac_address : '00:00:00:00:00:00';

  try {
    let targetTx = null;

    // 1. If user entered a Paystack reference (starts with CN_)
    if (cleanCode.startsWith('CN_')) {
      const { data: txByRef } = await supabase
        .from('campusnet_transactions')
        .select('*')
        .eq('reference', cleanCode)
        .maybeSingle();
      if (txByRef) targetTx = txByRef;
    }

    // 2. Search for recent pending transaction for this MAC or phone (within last 60 minutes)
    if (!targetTx) {
      if (clientMac && clientMac !== '00:00:00:00:00:00') {
        const { data: txByMac } = await supabase
          .from('campusnet_transactions')
          .select('*')
          .eq('mac_address', clientMac)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (txByMac) targetTx = txByMac;
      }
    }

    if (!targetTx && cleanPhone) {
      const { data: txByPhone } = await supabase
        .from('campusnet_transactions')
        .select('*')
        .eq('phone', cleanPhone)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (txByPhone) targetTx = txByPhone;
    }

    // 3. Determine the package: EXACT match from pending transaction, or requested package_id, or default to 1 HOUR (pkg_1h) - NEVER 24h!
    const effectivePackageId = targetTx?.package_id || package_id || 'pkg_1h';
    const effectivePhone = cleanPhone || targetTx?.phone || null;
    const effectiveMac = (clientMac && clientMac !== '00:00:00:00:00:00') ? clientMac : (targetTx?.mac_address || '00:00:00:00:00:00');

    // 4. Activate the voucher with exact package duration
    const activated = await activateVoucherForTransaction({
      reference: targetTx?.reference || `MANUAL_${cleanCode}_${Date.now()}`,
      phone: effectivePhone,
      macAddress: effectiveMac,
      packageId: effectivePackageId,
      mpesaReceipt: cleanCode,
      paystackId: null
    });

    // If targetTx was not found, record a manual transaction entry
    if (!targetTx) {
      const pkg = activated.package;
      await supabase.from('campusnet_transactions').insert({
        reference: `MANUAL_${cleanCode}_${Date.now()}`,
        phone: effectivePhone,
        mac_address: effectiveMac,
        package_id: pkg.id,
        amount: pkg.amount,
        status: 'completed',
        mpesa_receipt: cleanCode,
        voucher_code: activated.voucherCode
      });
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
      const limit = v.duration_hours === 3 ? '3h' : v.duration_hours === 24 ? '24h' : '168h';
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
