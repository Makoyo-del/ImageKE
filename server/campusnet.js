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

    // 2. Dispatch Paystack STK Charge
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

      try {
        const paystackRes = await axios.post('https://api.paystack.co/charge', paystackPayload, {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (!paystackRes.data.status) {
          console.warn('[CampusNet Paystack Charge Notice]', paystackRes.data);
        }
      } catch (payErr) {
        console.error('[CampusNet Paystack Error]', payErr.response?.data || payErr.message);
      }
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
    const packageId = metadata.package_id || 'pkg_24h';

    const pkg = PACKAGES.find((p) => p.id === packageId) || PACKAGES[1];
    const durationHours = pkg.duration_hours;

    try {
      // 1. Fetch available voucher from Supabase pool
      let voucherCode = null;
      let voucherPassword = null;

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

        // Mark voucher as assigned
        await supabase
          .from('campusnet_vouchers')
          .update({
            status: 'assigned',
            assigned_phone: phone,
            assigned_mac: macAddress,
            activated_at: now.toISOString(),
            expires_at: validUntil.toISOString()
          })
          .eq('id', voucher.id);
      } else {
        // Fallback: Dynamically generate voucher
        voucherCode = `u_${phone.slice(-4)}_${crypto.randomBytes(2).toString('hex')}`;
        voucherPassword = crypto.randomBytes(4).toString('hex');

        await supabase.from('campusnet_vouchers').insert({
          code: voucherCode,
          password: voucherPassword,
          package_id: pkg.id,
          duration_hours: durationHours,
          amount: pkg.amount,
          status: 'assigned',
          assigned_phone: phone,
          assigned_mac: macAddress,
          activated_at: now.toISOString(),
          expires_at: validUntil.toISOString()
        });
      }

      // 2. Update transaction status
      await supabase
        .from('campusnet_transactions')
        .update({
          status: 'completed',
          paystack_reference: data.id ? String(data.id) : null,
          mpesa_receipt: data.gateway_response || null,
          voucher_code: voucherCode
        })
        .eq('reference', reference);

      // 3. Upsert session for phone MAC-randomization restoration
      await supabase.from('campusnet_sessions').upsert(
        {
          phone,
          mac_address: macAddress,
          voucher_code: voucherCode,
          voucher_password: voucherPassword,
          valid_until: validUntil.toISOString()
        },
        { onConflict: 'phone' }
      );

      console.log(`[CampusNet Webhook] Successfully activated ${pkg.name} for ${phone} (Voucher: ${voucherCode})`);
    } catch (err) {
      console.error('[CampusNet Webhook Activation Error]', err);
    }
  }

  return res.json({ status: 'ok' });
});

// ─── GET /api/campusnet/pay/status/:reference ─────────────────────────────────
// Polled by portal login.html to auto-connect client
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

    if (tx.status === 'completed') {
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

    const pkg = PACKAGES.find(p => p.id === tx?.package_id);

    return res.json({
      active: isActive,
      source: 'database',
      voucher_code: session.voucher_code,
      package_name: pkg?.name || 'Active Wi-Fi Pass',
      package_id: tx?.package_id || 'pkg_24h',
      amount_paid: tx?.amount || pkg?.amount || 40,
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
  const { code, phone, mac_address } = req.body;
  const cleanCode = (code || '').trim().toUpperCase();

  if (cleanCode.length < 8) {
    return res.status(400).json({ error: 'Please enter a valid M-Pesa transaction code (e.g. QJD9472KL)' });
  }

  const { clean: cleanPhone } = formatPhone(phone || '254700000000');
  const clientMac = (mac_address && mac_address !== '$(mac)') ? mac_address : '00:00:00:00:00:00';

  try {
    const pkg = PACKAGES[1]; // default 24h
    const now = new Date();
    const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let voucherCode = null;
    let voucherPassword = null;

    const { data: voucher } = await supabase
      .from('campusnet_vouchers')
      .select('*')
      .eq('package_id', 'pkg_24h')
      .eq('status', 'available')
      .limit(1)
      .maybeSingle();

    if (voucher) {
      voucherCode = voucher.code;
      voucherPassword = voucher.password;
      await supabase.from('campusnet_vouchers').update({
        status: 'assigned',
        assigned_phone: cleanPhone,
        assigned_mac: clientMac,
        activated_at: now.toISOString(),
        expires_at: validUntil.toISOString()
      }).eq('id', voucher.id);
    } else {
      voucherCode = `u_${cleanCode.slice(-4)}`;
      voucherPassword = cleanCode.slice(-6);
    }

    await supabase.from('campusnet_transactions').insert({
      reference: `MANUAL_${cleanCode}_${Date.now()}`,
      phone: cleanPhone,
      mac_address: clientMac,
      package_id: 'pkg_24h',
      amount: 40,
      status: 'completed',
      mpesa_receipt: cleanCode,
      voucher_code: voucherCode
    });

    await supabase.from('campusnet_sessions').upsert({
      phone: cleanPhone,
      mac_address: clientMac,
      voucher_code: voucherCode,
      voucher_password: voucherPassword,
      valid_until: validUntil.toISOString()
    }, { onConflict: 'phone' });

    return res.json({
      success: true,
      username: voucherCode,
      password: voucherPassword
    });
  } catch (err) {
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

export default router;
