import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { supabase as defaultSupabase } from './supabase.js';
import {
  PACKAGES,
  getPackageById,
  isWithinSaleWindow,
  resolvePackageFromPayment,
  resolvePackageFromVoucherCode,
  formatPhone,
  detectMobileMoneyProvider,
  isValidRouterIdentifier
} from './campusnet/catalog.js';

dotenv.config();

export { PACKAGES, formatPhone, detectMobileMoneyProvider, isWithinSaleWindow };

const router = express.Router();

// Known legacy/default keys that MUST be rejected (Fail-Closed Security Policy 1.2 & 2.3)
const FORBIDDEN_DEFAULT_SECRETS = new Set([
  'makoyocart_sync_secret_2026',
  'campusnet_secret_admin_2026',
  'default_hookbunker_secret',
  'local_job_secret_key',
  'changeme',
  'default'
]);

function isAllowedSecretValue(secret) {
  if (!secret || typeof secret !== 'string') return false;
  const trimmed = secret.replace(/^Bearer\s+/i, '').trim();
  if (trimmed.length < 12) return false;
  if (FORBIDDEN_DEFAULT_SECRETS.has(trimmed)) return false;
  return true;
}

function matchesConfiguredSecret(providedRaw, configuredRaw) {
  if (!isAllowedSecretValue(configuredRaw)) return false;
  if (!providedRaw || typeof providedRaw !== 'string') return false;
  const provided = providedRaw.replace(/^Bearer\s+/i, '').trim();
  if (!isAllowedSecretValue(provided)) return false;
  const configured = configuredRaw.replace(/^Bearer\s+/i, '').trim();
  return provided === configured;
}

// Testable dependency container (defaults to live production clients; fails closed on unset secrets)
let deps = {
  supabase: defaultSupabase,
  axios: axios,
  now: () => new Date(),
  getPaystackSecretKey: () => process.env.PAYSTACK_SECRET_KEY || null,
  getRouterSyncKey: () => process.env.ROUTER_SYNC_KEY || null,
  getAdminApiKey: () => process.env.ADMIN_API_KEY || null,
  getWebhookSecrets: () => [process.env.HOOKBUNKER_SECRET].filter(isAllowedSecretValue)
};

export function setCampusNetTestDeps(overrides = {}) {
  deps = { ...deps, ...overrides };
}

export function resetCampusNetInternalState() {
  recentStkByPhone.clear();
  lastPaystackPollByRef.clear();
  pendingRouterCommands.length = 0;
  inFlightVoucherClaims.clear();
  cachedOverview = null;
  lastOverviewFetch = 0;
}

// In-memory state for throttling, duplicate STK guard, atomic claim locking, and remote router command queue
const recentStkByPhone = new Map(); // phone -> { reference, timestamp, packageId, amount, provider }
const lastPaystackPollByRef = new Map(); // reference -> timestamp
const pendingRouterCommands = []; // [{ id, command, created_at }]
const inFlightVoucherClaims = new Set(); // candidate voucher IDs currently being claimed in-process

export function queueRouterCommand(command) {
  if (!command || typeof command !== 'string') return null;
  const entry = {
    id: `CMD_${Date.now()}_${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
    command: command.trim(),
    created_at: deps.now().toISOString()
  };
  pendingRouterCommands.push(entry);
  return entry;
}

// Helper: Generate readable voucher code (e.g. M12H_AB34K) & 6-digit numeric PIN
function generateVoucherCode(prefix) {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `${prefix}_${suffix}`;
}

function generateNumericPin() {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * Background Voucher Pool Auto-Top-Up
 * Ensures no package ever runs dry during peak hostel traffic.
 */
export async function ensureVoucherPoolStock(packageId, minThreshold = 25, topUpCount = 50) {
  const pkg = getPackageById(packageId);
  if (!pkg) return { toppedUp: 0 };

  try {
    const { count, error } = await deps.supabase
      .from('campusnet_vouchers')
      .select('*', { count: 'exact', head: true })
      .eq('package_id', pkg.id)
      .eq('status', 'available');

    if (error || (count !== null && count >= minThreshold)) {
      return { available: count || 0, toppedUp: 0 };
    }

    const batch = [];
    for (let i = 0; i < topUpCount; i++) {
      batch.push({
        code: generateVoucherCode(pkg.prefix),
        password: generateNumericPin(),
        package_id: pkg.id,
        duration_hours: pkg.duration_hours,
        amount: pkg.amount,
        status: 'available'
      });
    }

    const { data: inserted } = await deps.supabase
      .from('campusnet_vouchers')
      .insert(batch)
      .select();

    const addedCount = Array.isArray(inserted) ? inserted.length : 0;
    return { available: (count || 0) + addedCount, toppedUp: addedCount };
  } catch (err) {
    console.warn('[CampusNet Auto-TopUp Notice]', err.message);
    return { toppedUp: 0 };
  }
}

// ─── GET /api/campusnet/packages ───────────────────────────────────────────────
router.get('/packages', (_req, res) => {
  const now = deps.now();
  const enrichedPackages = PACKAGES.map((pkg) => {
    const windowState = isWithinSaleWindow(pkg, now);
    return {
      ...pkg,
      available_now: windowState.open,
      sale_window_reason: windowState.reason || null
    };
  });

  res.json({
    success: true,
    brand: 'Makoyocart Ventures Wifi',
    registration: 'BN-WLSP9KP9',
    speed_mbps: 50,
    networks: [
      { id: 'mpesa', name: 'Safaricom M-Pesa', prefixes: ['070-072', '074', '0757-0759', '0768-0769', '079', '011'] },
      { id: 'atl', name: 'Airtel Money', prefixes: ['073', '0750-0756', '078', '010'] }
    ],
    packages: enrichedPackages
  });
});

// ─── POST /api/campusnet/promo/verify (Disabled: Zero Free/Discounted Internet) ─
router.post('/promo/verify', (_req, res) => {
  return res.status(410).json({
    valid: false,
    error: 'Promotional discount codes are disabled. Standard package rates apply.'
  });
});

// ─── POST /api/campusnet/pay/stk ───────────────────────────────────────────────
// Dispatches M-Pesa ('mpesa') or Airtel Money ('atl') STK push via Paystack Charge API.
// Enforces Night Owl sale window, duplicate-prompt guard, and awaits Paystack response.
router.post('/pay/stk', async (req, res) => {
  const { phone, mac_address, ip_address, package_id, provider, resend } = req.body || {};

  if (!phone || !package_id) {
    return res.status(400).json({ error: 'Phone number and package selection are required.' });
  }

  const { clean: cleanPhone, formatted: formattedPhone, valid: isValidPhone } = formatPhone(phone);
  if (!isValidPhone) {
    return res.status(400).json({
      error: 'Invalid Kenyan phone number. Enter a valid 10-digit Safaricom (07XX/011X) or Airtel (073X/078X/010X) number.'
    });
  }

  const pkg = getPackageById(package_id);
  if (!pkg) {
    return res.status(404).json({ error: 'Selected Wi-Fi package does not exist.' });
  }

  // Enforce Night Owl 6PM -> 6AM EAT sale window (Requirement 1.5 & 2.4)
  const now = deps.now();
  const windowState = isWithinSaleWindow(pkg, now);
  if (!windowState.open) {
    return res.status(400).json({
      success: false,
      code: 'SALE_WINDOW_CLOSED',
      error: windowState.reason
    });
  }

  const netInfo = detectMobileMoneyProvider(cleanPhone, provider);
  const finalAmount = pkg.amount; // Strictly enforced from server catalog; zero client overrides
  const clientMac = (mac_address && mac_address !== '$(mac)') ? String(mac_address).trim() : '00:00:00:00:00:00';
  const clientIp = (ip_address && ip_address !== '$(ip)') ? String(ip_address).trim() : '10.10.0.10';

  // Duplicate-Prompt Guard (within 10 seconds for same phone + package unless explicit resend)
  const nowMs = now.getTime();
  const prevStk = recentStkByPhone.get(cleanPhone);
  if (!resend && prevStk && prevStk.packageId === pkg.id && (nowMs - prevStk.timestamp) < 10000) {
    return res.json({
      success: true,
      deduplicated: true,
      reference: prevStk.reference,
      phone: cleanPhone,
      amount: finalAmount,
      provider: prevStk.provider,
      provider_label: prevStk.providerLabel,
      message: `${prevStk.providerLabel} PIN prompt already sent to ${cleanPhone}. Check your phone screen.`
    });
  }

  const reference = `CN_${nowMs}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  try {
    // 1. Insert pending transaction in Supabase
    const { error: txErr } = await deps.supabase.from('campusnet_transactions').insert({
      reference,
      phone: cleanPhone,
      mac_address: clientMac,
      package_id: pkg.id,
      amount: finalAmount,
      status: 'pending',
      paystack_reference: null
    });

    if (txErr) {
      console.warn('[CampusNet] DB transaction insert warning:', txErr.message);
    }

    const paystackKey = deps.getPaystackSecretKey();
    let displayText = `We sent a ${netInfo.label} PIN prompt to ${cleanPhone}. Enter your PIN to connect.`;

    // 2. Dispatch Paystack Mobile Money Charge & await acceptance (with 1 automatic retry on transient network error)
    if (paystackKey && !paystackKey.startsWith('sk_test_placeholder')) {
      const paystackPayload = {
        email: `wifi+${cleanPhone}@makoyocart.com`,
        amount: Math.round(finalAmount * 100), // KES cents
        currency: 'KES',
        reference,
        channels: ['mobile_money'],
        mobile_money: {
          phone: formattedPhone,
          provider: netInfo.provider // 'mpesa' or 'atl'
        },
        metadata: {
          phone: cleanPhone,
          mac_address: clientMac,
          ip_address: clientIp,
          package_id: pkg.id,
          provider: netInfo.provider,
          venture: 'Makoyocart Ventures Wifi'
        }
      };

      let paystackRes = null;
      let lastChargeErr = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          paystackRes = await deps.axios.post('https://api.paystack.co/charge', paystackPayload, {
            headers: {
              Authorization: `Bearer ${paystackKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          });
          lastChargeErr = null;
          break;
        } catch (err) {
          lastChargeErr = err;
          const status = err.response?.status;
          // Do not retry 4xx validation/provider rejections
          if (status && status >= 400 && status < 500) break;
        }
      }

      if (lastChargeErr) {
        const errData = lastChargeErr.response?.data;
        const chargeStatus = errData?.data?.status;
        const rawMsg = errData?.data?.gateway_response || errData?.message || lastChargeErr.message || '';
        console.warn(`[CampusNet STK Rejected] Phone:${cleanPhone} Provider:${netInfo.provider} Status:${chargeStatus} Msg:${rawMsg}`);

        await deps.supabase
          .from('campusnet_transactions')
          .update({ status: 'failed' })
          .eq('reference', reference);

        return res.status(400).json({
          success: false,
          error: `Could not trigger ${netInfo.label} prompt on ${cleanPhone}. Please unlock your phone screen, close any open USSD popup, verify your number is registered on ${netInfo.label}, and tap Try Again.`,
          provider: netInfo.provider,
          provider_label: netInfo.label,
          detail: rawMsg
        });
      }

      const pBody = paystackRes?.data;
      const pData = pBody?.data || {};
      if (pBody?.status === false || pData.status === 'failed') {
        await deps.supabase
          .from('campusnet_transactions')
          .update({ status: 'failed' })
          .eq('reference', reference);

        return res.status(400).json({
          success: false,
          error: pData.gateway_response || pBody?.message || `Could not initiate ${netInfo.label} prompt. Please try again.`,
          provider: netInfo.provider,
          provider_label: netInfo.label
        });
      }

      if (pData.display_text) {
        displayText = pData.display_text;
      }
    }

    recentStkByPhone.set(cleanPhone, {
      reference,
      timestamp: nowMs,
      packageId: pkg.id,
      amount: finalAmount,
      provider: netInfo.provider,
      providerLabel: netInfo.label
    });

    return res.json({
      success: true,
      reference,
      phone: cleanPhone,
      amount: finalAmount,
      package_id: pkg.id,
      package_name: pkg.name,
      provider: netInfo.provider,
      provider_label: netInfo.label,
      display_text: displayText,
      message: `${netInfo.label} prompt sent to ${cleanPhone}. Enter your PIN to connect.`
    });
  } catch (error) {
    console.error('[CampusNet STK Error]', error.message);
    return res.status(500).json({ error: 'Failed to initiate mobile money prompt. Please try again.' });
  }
});

/**
 * Atomically claims an available voucher and activates the student's session.
 * - 100% Idempotent on `reference` (never burns 2 vouchers if webhook + polling race).
 * - Atomic candidate claim loop + in-process claim lock prevents two simultaneous payers from getting the same code.
 * - Strictly continuous wall-clock validity (`now + duration_hours`).
 * - Records paid amount truthfully.
 */
export async function activateVoucherForTransaction({
  reference,
  phone,
  macAddress,
  packageId,
  paidAmountKes = null,
  mpesaReceipt,
  paystackId
}) {
  const { clean: cleanPhone } = formatPhone(phone);
  const clientMac = (macAddress && macAddress !== '$(mac)') ? String(macAddress).trim() : '00:00:00:00:00:00';
  const pkg = getPackageById(packageId);
  if (!pkg) {
    throw new Error(`Invalid packageId: ${packageId}`);
  }
  const durationHours = pkg.duration_hours;
  const recordedAmount = paidAmountKes !== null && paidAmountKes !== undefined ? Number(paidAmountKes) : pkg.amount;

  // 1. Idempotency check by transaction reference
  if (reference) {
    const { data: existingTx } = await deps.supabase
      .from('campusnet_transactions')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (existingTx && existingTx.status === 'completed' && existingTx.voucher_code) {
      const { data: existingVoucher } = await deps.supabase
        .from('campusnet_vouchers')
        .select('*')
        .eq('code', existingTx.voucher_code)
        .maybeSingle();

      if (existingVoucher) {
        return {
          voucherCode: existingVoucher.code,
          voucherPassword: existingVoucher.password,
          validUntil: existingVoucher.expires_at,
          package: getPackageById(existingTx.package_id) || pkg,
          idempotent: true
        };
      }
    }
  }

  const now = deps.now();
  const validUntil = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
  let voucherCode = null;
  let voucherPassword = null;

  // 2. Atomic claim from available pool (fetch up to 25 candidates & claim with in-process lock + DB status='available' guard)
  for (let round = 0; round < 3 && !voucherCode; round++) {
    const { data: candidates } = await deps.supabase
      .from('campusnet_vouchers')
      .select('*')
      .eq('package_id', pkg.id)
      .eq('status', 'available')
      .limit(25);

    if (!Array.isArray(candidates) || candidates.length === 0) break;

    for (const candidate of candidates) {
      if (inFlightVoucherClaims.has(candidate.id)) continue;
      inFlightVoucherClaims.add(candidate.id);
      try {
        const { data: claimedRows, error: claimErr } = await deps.supabase
          .from('campusnet_vouchers')
          .update({
            status: 'assigned',
            amount: recordedAmount,
            assigned_phone: cleanPhone || null,
            assigned_mac: clientMac,
            activated_at: now.toISOString(),
            expires_at: validUntil.toISOString()
          })
          .eq('id', candidate.id)
          .eq('status', 'available')
          .select();

        const claimed = Array.isArray(claimedRows) ? claimedRows[0] : claimedRows;
        if (!claimErr && claimed && claimed.code) {
          voucherCode = claimed.code;
          voucherPassword = claimed.password;
          break;
        }
      } finally {
        inFlightVoucherClaims.delete(candidate.id);
      }
    }
  }

  // Fallback if pool is completely empty
  if (!voucherCode) {
    voucherCode = generateVoucherCode(pkg.prefix);
    voucherPassword = generateNumericPin();

    await deps.supabase.from('campusnet_vouchers').insert({
      code: voucherCode,
      password: voucherPassword,
      package_id: pkg.id,
      duration_hours: durationHours,
      amount: recordedAmount,
      status: 'assigned',
      assigned_phone: cleanPhone || null,
      assigned_mac: clientMac,
      activated_at: now.toISOString(),
      expires_at: validUntil.toISOString()
    });
  }

  // Non-blocking background check to keep pool stocked
  ensureVoucherPoolStock(pkg.id, 25, 50).catch(() => {});

  // 3. Mark transaction completed with exact paid amount
  if (reference) {
    await deps.supabase
      .from('campusnet_transactions')
      .update({
        status: 'completed',
        paystack_reference: paystackId ? String(paystackId) : null,
        mpesa_receipt: mpesaReceipt || null,
        voucher_code: voucherCode,
        package_id: pkg.id,
        amount: recordedAmount
      })
      .eq('reference', reference);
  }

  // 4. Upsert active phone session (with remaining time stacking if extending an active pass)
  let sessionVoucherCode = voucherCode;
  let sessionVoucherPassword = voucherPassword;
  let sessionValidUntil = validUntil;

  if (cleanPhone && cleanPhone.length === 12) {
    try {
      const { data: existingSession } = await deps.supabase
        .from('campusnet_sessions')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingSession && existingSession.valid_until) {
        const existingExpiry = new Date(existingSession.valid_until);
        if (existingExpiry > now) {
          const stackedDate = new Date(existingExpiry.getTime() + durationHours * 3600 * 1000);
          if (existingExpiry > validUntil && existingSession.voucher_code) {
            sessionVoucherCode = existingSession.voucher_code;
            sessionVoucherPassword = existingSession.voucher_password || voucherPassword;
            sessionValidUntil = stackedDate;
          } else {
            sessionVoucherCode = voucherCode;
            sessionVoucherPassword = voucherPassword;
            sessionValidUntil = stackedDate;
          }
          await deps.supabase
            .from('campusnet_vouchers')
            .update({ expires_at: sessionValidUntil.toISOString() })
            .eq('code', sessionVoucherCode);
        }
      }
    } catch (sErr) {
      console.warn('[CampusNet Session Check Notice]', sErr.message);
    }

    await deps.supabase.from('campusnet_sessions').upsert(
      {
        phone: cleanPhone,
        mac_address: clientMac,
        voucher_code: sessionVoucherCode,
        voucher_password: sessionVoucherPassword,
        valid_until: sessionValidUntil.toISOString()
      },
      { onConflict: 'phone' }
    );
  }

  return {
    voucherCode: sessionVoucherCode,
    voucherPassword: sessionVoucherPassword,
    validUntil: sessionValidUntil.toISOString(),
    package: pkg,
    paidAmountKes: recordedAmount
  };
}

// ─── POST /api/campusnet/webhook ──────────────────────────────────────────────
// Requirement 1.3: Only HMAC / configured env secret / Paystack-verify;
// package comes strictly from DB tx, NEVER guessed from amount.
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const hookbunkerSecret = req.headers['x-hookbunker-secret'];
  const paystackKey = deps.getPaystackSecretKey();
  const validSecrets = deps.getWebhookSecrets ? deps.getWebhookSecrets() : [];

  let isVerified = false;
  let verifiedPaystackData = null;

  // 1. Direct Paystack HMAC-SHA512 check
  if (signature && req.rawBody && paystackKey) {
    const hash = crypto
      .createHmac('sha512', paystackKey)
      .update(req.rawBody)
      .digest('hex');
    if (hash === signature) {
      isVerified = true;
    }
  }

  // 2. Non-default configured HookBunker secret
  if (!isVerified && hookbunkerSecret && isAllowedSecretValue(hookbunkerSecret)) {
    if (validSecrets.some((sec) => matchesConfiguredSecret(hookbunkerSecret, sec))) {
      isVerified = true;
    }
  }

  const event = req.body || {};
  const data = event.data || {};
  const reference = data.reference;

  // 3. Authoritative Paystack API verification fallback (only if signature header wasn't a forged signature)
  if (!isVerified && !signature && !hookbunkerSecret && reference && paystackKey && !paystackKey.startsWith('sk_test_placeholder')) {
    try {
      const pVerify = await deps.axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: { Authorization: `Bearer ${paystackKey}` },
          timeout: 5000
        }
      );
      if (pVerify.data?.data?.status === 'success') {
        isVerified = true;
        verifiedPaystackData = pVerify.data.data;
      }
    } catch (pErr) {
      console.warn(`[CampusNet Webhook] Verify fallback failed for ${reference}:`, pErr.message);
    }
  }

  if (!isVerified) {
    return res.status(400).json({ error: 'Invalid webhook signature or verification failed.' });
  }

  if (event.event === 'charge.success') {
    const effectiveData = verifiedPaystackData || data;
    const paidAmt = Math.round(Number(effectiveData.amount || 0) / 100);
    if (paidAmt < 10) {
      return res.status(400).json({ error: 'Insufficient paid amount.' });
    }

    if (!reference) {
      return res.status(400).json({ error: 'Missing transaction reference.' });
    }

    const { data: existingTx } = await deps.supabase
      .from('campusnet_transactions')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (!existingTx || !existingTx.package_id) {
      return res.status(400).json({ error: 'Transaction not found in database; package cannot be guessed from amount.' });
    }

    const resolvedPkg = resolvePackageFromPayment({
      packageId: existingTx.package_id,
      paidAmountKes: paidAmt
    });

    if (!resolvedPkg) {
      return res.status(400).json({ error: 'Paid amount is less than required package price.' });
    }

    const phone = existingTx.phone;
    const macAddress = existingTx.mac_address || '00:00:00:00:00:00';

    try {
      await activateVoucherForTransaction({
        reference,
        phone,
        macAddress,
        packageId: resolvedPkg.id,
        paidAmountKes: paidAmt,
        mpesaReceipt: effectiveData.gateway_response || effectiveData.reference,
        paystackId: effectiveData.id ? String(effectiveData.id) : null
      });
    } catch (err) {
      console.error('[CampusNet Webhook Activation Error]', err);
      return res.status(500).json({ error: 'Failed to activate voucher.' });
    }
  }

  return res.status(200).json({ status: 'ok', received: true });
});

// ─── GET /api/campusnet/pay/status/:reference ─────────────────────────────────
router.get('/pay/status/:reference', async (req, res) => {
  const { reference } = req.params;

  try {
    const { data: tx } = await deps.supabase
      .from('campusnet_transactions')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (tx && tx.status === 'completed' && tx.voucher_code) {
      const { data: voucher } = await deps.supabase
        .from('campusnet_vouchers')
        .select('*')
        .eq('code', tx.voucher_code)
        .maybeSingle();

      const now = deps.now();
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
        password: voucher?.password || tx.voucher_code,
        voucher_code: tx.voucher_code,
        voucher_password: voucher?.password || tx.voucher_code,
        package_id: tx.package_id,
        valid_until: voucher?.expires_at,
        amount: tx.amount
      });
    }

    if (tx && tx.status === 'failed') {
      return res.json({
        status: 'failed',
        error: 'Mobile money prompt failed or was cancelled. Please try again.'
      });
    }

    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    // Throttled active verification against Paystack (max once every 4.5s per reference)
    const paystackKey = deps.getPaystackSecretKey();
    const nowMs = deps.now().getTime();
    const lastPoll = lastPaystackPollByRef.get(reference) || 0;

    if (paystackKey && !paystackKey.startsWith('sk_test_placeholder') && (nowMs - lastPoll >= 4500)) {
      lastPaystackPollByRef.set(reference, nowMs);
      try {
        const pVerify = await deps.axios.get(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          {
            headers: { Authorization: `Bearer ${paystackKey}` },
            timeout: 4500
          }
        );

        const pData = pVerify.data?.data;
        if (pData && pData.status === 'success') {
          const paidAmt = Math.round(Number(pData.amount || 0) / 100);
          const resolvedPkg = resolvePackageFromPayment({
            packageId: tx.package_id,
            paidAmountKes: paidAmt
          });

          if (resolvedPkg) {
            const activation = await activateVoucherForTransaction({
              reference,
              phone: tx.phone,
              macAddress: tx.mac_address || '00:00:00:00:00:00',
              packageId: resolvedPkg.id,
              paidAmountKes: paidAmt,
              mpesaReceipt: pData.gateway_response || pData.reference,
              paystackId: pData.id ? String(pData.id) : null
            });

            return res.json({
              status: 'completed',
              username: activation.voucherCode,
              password: activation.voucherPassword,
              voucher_code: activation.voucherCode,
              voucher_password: activation.voucherPassword,
              package_id: activation.package.id,
              package_name: activation.package.name,
              valid_until: activation.validUntil,
              amount: paidAmt
            });
          }
        }
      } catch (_pErr) {
        // Still awaiting user PIN
      }
    }

    return res.json({
      status: 'pending',
      amount: tx.amount || 0
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// ─── POST /api/campusnet/session/restore ───────────────────────────────────────
router.post('/session/restore', async (req, res) => {
  const { phone, new_mac, code } = req.body || {};
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const { clean: cleanPhone, valid: isValidPhone } = formatPhone(phone);
  if (!isValidPhone) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Kenyan phone number (07XX or 01XX).' });
  }

  try {
    let { data: session, error } = await deps.supabase
      .from('campusnet_sessions')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    const clientMac = (new_mac && new_mac !== '$(mac)') ? String(new_mac).trim() : '';
    const now = deps.now();

    if (error || !session || new Date(session.valid_until) <= now) {
      // Self-healing fallback: check for an unexpired paid voucher assigned to this phone
      const { data: fallbackVoucher } = await deps.supabase
        .from('campusnet_vouchers')
        .select('*')
        .eq('assigned_phone', cleanPhone)
        .eq('status', 'assigned')
        .gt('expires_at', now.toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackVoucher) {
        session = {
          phone: cleanPhone,
          mac_address: clientMac || fallbackVoucher.assigned_mac || '00:00:00:00:00:00',
          voucher_code: fallbackVoucher.code,
          voucher_password: fallbackVoucher.password,
          valid_until: fallbackVoucher.expires_at
        };
        await deps.supabase.from('campusnet_sessions').upsert(session, { onConflict: 'phone' });
      } else {
        if (session) {
          await deps.supabase.from('campusnet_sessions').delete().eq('phone', cleanPhone);
        }
        return res.status(404).json({
          error: 'No active Wi-Fi pass found for this phone number. Please select a pass below to connect.'
        });
      }
    }

    if (code) {
      const cleanCode = String(code).trim().toUpperCase();
      if (
        session.voucher_code.toUpperCase() !== cleanCode &&
        !session.voucher_code.toUpperCase().includes(cleanCode)
      ) {
        return res.status(403).json({ error: 'Voucher code does not match this session.' });
      }
    }

    if (clientMac) {
      await deps.supabase
        .from('campusnet_sessions')
        .update({ mac_address: clientMac })
        .eq('phone', cleanPhone);
    }

    const pkg = resolvePackageFromVoucherCode(session.voucher_code);

    return res.json({
      success: true,
      username: session.voucher_code,
      password: session.voucher_password,
      package_id: pkg.id,
      package_name: pkg.name,
      valid_until: session.valid_until
    });
  } catch (err) {
    return res.status(500).json({ error: 'Session restore error' });
  }
});

// ─── GET /api/campusnet/session/status ────────────────────────────────────────
router.get('/session/status', async (req, res) => {
  const mac = (req.query.mac || '').trim();
  const username = (req.query.username || '').trim();
  const phone = (req.query.phone || '').trim();

  try {
    let query = deps.supabase.from('campusnet_sessions').select('*');

    if (username && username !== '$(username)' && !username.startsWith('$(')) {
      query = query.eq('voucher_code', username);
    } else if (phone) {
      const { clean: cleanPhone } = formatPhone(phone);
      if (!cleanPhone) {
        return res.json({ active: false, source: 'database', message: 'Invalid phone number' });
      }
      query = query.eq('phone', cleanPhone);
    } else if (mac && mac !== '$(mac)' && !mac.startsWith('$(') && mac !== '00:00:00:00:00:00') {
      query = query.eq('mac_address', mac);
    } else {
      return res.json({
        active: false,
        source: 'none',
        message: 'No session identifier provided'
      });
    }

    const { data: session, error } = await query
      .order('valid_until', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !session) {
      return res.json({
        active: false,
        source: 'database',
        message: 'No active session found'
      });
    }

    const validUntil = new Date(session.valid_until);
    const now = deps.now();
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

    const pkg = resolvePackageFromVoucherCode(session.voucher_code);

    return res.json({
      active: isActive,
      source: 'database',
      username: isActive ? session.voucher_code : undefined,
      password: isActive ? session.voucher_password : undefined,
      voucher_code: session.voucher_code,
      package_name: pkg.name,
      package_id: pkg.id,
      amount_paid: pkg.amount,
      phone_masked: session.phone ? `${session.phone.slice(0, 4)}****${session.phone.slice(-3)}` : null,
      valid_until: session.valid_until,
      time_left: timeLeftStr,
      seconds_remaining: Math.max(0, Math.floor(msRemaining / 1000))
    });
  } catch (err) {
    return res.json({
      active: false,
      source: 'error',
      message: 'Could not query session status'
    });
  }
});

// ─── POST /api/campusnet/pay/verify-code ───────────────────────────────────────
// Manual fallback when STK callback is delayed or student enters voucher/receipt code.
// Strictly blocks cross-user replay: requires phone + code and verifies phone ownership.
router.post('/pay/verify-code', async (req, res) => {
  const { code, phone, mac_address } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();

  if (cleanCode.length < 6) {
    return res.status(400).json({ error: 'Please enter a valid transaction reference, M-Pesa/Airtel receipt code, or voucher code.' });
  }

  const { clean: cleanPhone, valid: isValidPhone } = formatPhone(phone);
  if (!isValidPhone) {
    return res.status(400).json({ error: 'Please enter the 10-digit phone number that made the payment.' });
  }

  const clientMac = (mac_address && mac_address !== '$(mac)') ? String(mac_address).trim() : '00:00:00:00:00:00';
  const now = deps.now();

  try {
    // 0. Direct Active Voucher Code Login (e.g. M1H_XXXXX or M24H_XXXXX already assigned & unexpired)
    if (/^M(1H|3H|12H|24H|3D|7D|30D)_[A-Z0-9]{4,8}$/.test(cleanCode)) {
      const { data: directVoucher } = await deps.supabase
        .from('campusnet_vouchers')
        .select('*')
        .eq('code', cleanCode)
        .eq('status', 'assigned')
        .maybeSingle();

      if (directVoucher) {
        if (!directVoucher.assigned_phone || directVoucher.assigned_phone !== cleanPhone) {
          return res.status(403).json({ error: 'This voucher belongs to a different phone number.' });
        }
        const exp = new Date(directVoucher.expires_at || 0);
        if (now >= exp) {
          return res.status(400).json({ error: 'This voucher has already expired. Please purchase a new pass.' });
        }
        const pkg = getPackageById(directVoucher.package_id) || PACKAGES[0];
        return res.json({
          success: true,
          username: directVoucher.code,
          password: directVoucher.password,
          package_id: pkg.id,
          package_name: pkg.name,
          valid_until: directVoucher.expires_at
        });
      }
    }

    // 1. Check if code was already completed in campusnet_transactions
    const { data: alreadyUsedTx } = await deps.supabase
      .from('campusnet_transactions')
      .select('*')
      .or(`reference.eq.${cleanCode},mpesa_receipt.eq.${cleanCode},paystack_reference.eq.${cleanCode}`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (alreadyUsedTx) {
      // Strictly block cross-user replay
      if (!alreadyUsedTx.phone || alreadyUsedTx.phone !== cleanPhone) {
        return res.status(403).json({
          error: 'This transaction code belongs to another phone number.'
        });
      }

      if (alreadyUsedTx.voucher_code) {
        const { data: voucher } = await deps.supabase
          .from('campusnet_vouchers')
          .select('*')
          .eq('code', alreadyUsedTx.voucher_code)
          .maybeSingle();

        if (voucher) {
          const expiresAt = new Date(voucher.expires_at || 0);
          if (voucher.status === 'expired' || now >= expiresAt) {
            return res.status(400).json({
              error: 'This transaction code has already been used and its pass has expired. Please purchase a new pass.'
            });
          }

          const pkg = getPackageById(voucher.package_id) || PACKAGES[0];
          return res.json({
            success: true,
            username: voucher.code,
            password: voucher.password,
            package_id: pkg.id,
            package_name: pkg.name,
            valid_until: voucher.expires_at,
            message: 'Active pass restored within your paid time window.'
          });
        }
      }

      return res.status(400).json({
        error: 'This transaction code has already been redeemed and has expired.'
      });
    }

    // 2. Check pending transaction by reference or phone
    let targetTx = null;
    if (cleanCode.startsWith('CN_')) {
      const { data: txByRef } = await deps.supabase
        .from('campusnet_transactions')
        .select('*')
        .eq('reference', cleanCode)
        .eq('status', 'pending')
        .maybeSingle();
      if (txByRef) targetTx = txByRef;
    }

    if (targetTx && targetTx.phone && targetTx.phone !== cleanPhone) {
      return res.status(403).json({
        error: 'This transaction reference belongs to a different phone number.'
      });
    }

    const paystackKey = deps.getPaystackSecretKey();
    let paystackVerifiedData = null;

    if (targetTx && paystackKey && !paystackKey.startsWith('sk_test_placeholder')) {
      try {
        const pVerify = await deps.axios.get(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(targetTx.reference)}`,
          {
            headers: { Authorization: `Bearer ${paystackKey}` },
            timeout: 4500
          }
        );
        if (pVerify.data?.data?.status === 'success') {
          paystackVerifiedData = pVerify.data.data;
        }
      } catch (_err) {}
    }

    if (!paystackVerifiedData && paystackKey && !paystackKey.startsWith('sk_test_placeholder')) {
      try {
        const pVerify = await deps.axios.get(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanCode)}`,
          {
            headers: { Authorization: `Bearer ${paystackKey}` },
            timeout: 4500
          }
        );
        if (pVerify.data?.data?.status === 'success') {
          paystackVerifiedData = pVerify.data.data;
        }
      } catch (_err) {}

      // Strict receipt lookup: ONLY match exact reference or receipt code in gateway_response (NEVER match on phone alone!)
      if (!paystackVerifiedData) {
        try {
          const pList = await deps.axios.get('https://api.paystack.co/transaction?perPage=50', {
            headers: { Authorization: `Bearer ${paystackKey}` },
            timeout: 5000
          });
          const recentList = pList.data?.data || [];
          const matchedTx = recentList.find((tx) => {
            if (tx.status !== 'success') return false;
            const refMatch = tx.reference?.toUpperCase() === cleanCode;
            const gatewayMatch = tx.gateway_response?.toUpperCase().includes(cleanCode);
            const receiptMatch = String(tx.receipt_number || '').toUpperCase() === cleanCode;
            return refMatch || gatewayMatch || receiptMatch;
          });
          if (matchedTx) {
            paystackVerifiedData = matchedTx;
          }
        } catch (listErr) {
          console.warn('[Verify-Code Receipt Lookup Notice]', listErr.message);
        }
      }
    }

    if (!paystackVerifiedData) {
      return res.status(400).json({
        error: 'Payment not found or not yet completed. Please complete the PIN prompt on your phone or purchase a new pass.'
      });
    }

    const txPhone = formatPhone(
      targetTx?.phone ||
        paystackVerifiedData.metadata?.phone ||
        paystackVerifiedData.customer?.phone ||
        (paystackVerifiedData.customer?.email?.includes('wifi+')
          ? paystackVerifiedData.customer.email.replace('wifi+', '').split('@')[0]
          : '')
    ).clean;

    if (!txPhone || txPhone !== cleanPhone) {
      return res.status(403).json({
        error: 'This payment receipt belongs to a different phone number.'
      });
    }

    // Look up DB tx if Paystack matched by receipt code
    if (!targetTx && paystackVerifiedData.reference) {
      const { data: dbTx } = await deps.supabase
        .from('campusnet_transactions')
        .select('*')
        .eq('reference', paystackVerifiedData.reference)
        .maybeSingle();
      if (dbTx) {
        if (dbTx.status === 'completed') {
          return res.status(400).json({ error: 'This payment receipt has already been redeemed.' });
        }
        targetTx = dbTx;
      }
    }

    const paidAmount = Math.round(Number(paystackVerifiedData.amount || 0) / 100);
    const matchedPkg = resolvePackageFromPayment({
      packageId: targetTx?.package_id || paystackVerifiedData.metadata?.package_id,
      paidAmountKes: paidAmount
    });

    if (!matchedPkg) {
      return res.status(400).json({ error: 'Verified payment does not match a valid package or amount.' });
    }

    const paidAt = new Date(paystackVerifiedData.paid_at || paystackVerifiedData.created_at || now);
    const msSincePayment = now.getTime() - paidAt.getTime();
    const pkgDurationMs = matchedPkg.duration_hours * 60 * 60 * 1000;

    if (msSincePayment > pkgDurationMs) {
      return res.status(400).json({
        error: 'This payment has already expired based on its transaction time. Please purchase a new Wi-Fi pass.'
      });
    }

    const effectiveReference = targetTx?.reference || paystackVerifiedData.reference || `VERIFY_${cleanCode}`;
    const effectiveMac =
      clientMac && clientMac !== '00:00:00:00:00:00'
        ? clientMac
        : targetTx?.mac_address || '00:00:00:00:00:00';

    const activated = await activateVoucherForTransaction({
      reference: effectiveReference,
      phone: cleanPhone,
      macAddress: effectiveMac,
      packageId: matchedPkg.id,
      paidAmountKes: paidAmount,
      mpesaReceipt: cleanCode,
      paystackId: paystackVerifiedData.id ? String(paystackVerifiedData.id) : null
    });

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

// ─── GET /api/campusnet/sync (+ /sync/live & /sync/pool) ──────────────────────
// Outbound MikroTik L009 Pull-Sync & Remote Command API (Works through Safaricom CGNAT).
// Emits ONLY strictly validated RouterOS lines (`isValidRouterIdentifier`).
async function handleRouterSync(req, res, forcedMode = null) {
  const token = req.query.token || req.headers['x-router-token'];
  const expectedKey = deps.getRouterSyncKey();
  if (!matchesConfiguredSecret(token, expectedKey)) {
    return res.status(401).send('# Unauthorized router sync token\n');
  }

  const mode = (forcedMode || req.query.mode || 'all').toLowerCase();
  const now = deps.now();
  const nowIso = now.toISOString();

  try {
    let rsc = `# Makoyocart Ventures Wifi - L009 Automated Cloud Sync (${nowIso})\n`;

    if (mode === 'live' || mode === 'all') {
      // 1. Ensure active sessions exist in /ip hotspot user with validated identifiers (no limit-uptime so wall-clock rules)
      const { data: activeVouchers } = await deps.supabase
        .from('campusnet_vouchers')
        .select('code, password, package_id, expires_at')
        .eq('status', 'assigned')
        .gt('expires_at', nowIso)
        .limit(200);

      if (Array.isArray(activeVouchers) && activeVouchers.length > 0) {
        rsc += '# --- Active Paid Sessions ---\n';
        for (const v of activeVouchers) {
          const pkg = getPackageById(v.package_id) || resolvePackageFromVoucherCode(v.code);
          if (
            isValidRouterIdentifier(v.code, 'code') &&
            isValidRouterIdentifier(v.password, 'password') &&
            isValidRouterIdentifier(pkg.id, 'profile')
          ) {
            rsc += `:do { /ip hotspot user add name="${v.code}" password="${v.password}" profile="${pkg.id}" comment="ACTIVE-PAID" } on-error={}\n`;
          }
        }
      }

      // 2. Disconnect & remove expired assigned vouchers so no student gets free internet past wall-clock expiry
      const { data: expiredVouchers } = await deps.supabase
        .from('campusnet_vouchers')
        .select('id, code')
        .eq('status', 'assigned')
        .lte('expires_at', nowIso)
        .limit(100);

      if (Array.isArray(expiredVouchers) && expiredVouchers.length > 0) {
        rsc += '# --- Expired Session Cleanup ---\n';
        const expiredIds = [];
        for (const ev of expiredVouchers) {
          if (isValidRouterIdentifier(ev.code, 'code')) {
            rsc += `:do { /ip hotspot active remove [find user="${ev.code}"] } on-error={}\n`;
            rsc += `:do { /ip hotspot cookie remove [find user="${ev.code}"] } on-error={}\n`;
            rsc += `:do { /ip hotspot mac-cookie remove [find user="${ev.code}"] } on-error={}\n`;
            rsc += `:do { /ip hotspot user remove [find name="${ev.code}"] } on-error={}\n`;
          }
          if (ev.id) expiredIds.push(ev.id);
        }
        if (expiredIds.length > 0) {
          await deps.supabase
            .from('campusnet_vouchers')
            .update({ status: 'expired' })
            .in('id', expiredIds);
        }
      }

      // 3. Drain queued remote admin commands (validated single-line commands only)
      if (pendingRouterCommands.length > 0) {
        rsc += '# --- Queued Admin Commands ---\n';
        while (pendingRouterCommands.length > 0) {
          const item = pendingRouterCommands.shift();
          const safeCmd = String(item.command || '').replace(/[\r\n]+/g, ' ').trim();
          if (safeCmd) {
            rsc += `:do { ${safeCmd} } on-error={}\n`;
          }
        }
      }
    }

    if (mode === 'pool' || mode === 'all') {
      const { data: poolVouchers } = await deps.supabase
        .from('campusnet_vouchers')
        .select('code, password, package_id')
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(200);

      if (Array.isArray(poolVouchers) && poolVouchers.length > 0) {
        rsc += '# --- Available Pool Vouchers ---\n';
        for (const v of poolVouchers) {
          const pkg = getPackageById(v.package_id) || resolvePackageFromVoucherCode(v.code);
          if (
            isValidRouterIdentifier(v.code, 'code') &&
            isValidRouterIdentifier(v.password, 'password') &&
            isValidRouterIdentifier(pkg.id, 'profile')
          ) {
            rsc += `:do { /ip hotspot user add name="${v.code}" password="${v.password}" profile="${pkg.id}" comment="DB-Pool" } on-error={}\n`;
          }
        }
      }
    }

    return res.type('text/plain').send(rsc);
  } catch (err) {
    return res.status(500).send('# Sync generation error\n');
  }
}

router.get('/sync', (req, res) => handleRouterSync(req, res, null));
router.get('/sync/live', (req, res) => handleRouterSync(req, res, 'live'));
router.get('/sync/pool', (req, res) => handleRouterSync(req, res, 'pool'));

// ─── Admin Authentication Middleware (Fails Closed on Missing/Default Secrets) ─
const authenticateAdmin = async (req, res, next) => {
  const token = req.query.key || req.headers['authorization'] || req.headers['x-router-token'] || '';
  const syncKey = deps.getRouterSyncKey();
  const adminKey = deps.getAdminApiKey();

  if (matchesConfiguredSecret(token, syncKey) || matchesConfiguredSecret(token, adminKey)) {
    return next();
  }

  if (typeof token === 'string' && token.startsWith('Bearer ')) {
    const jwt = token.slice(7).trim();
    if (!FORBIDDEN_DEFAULT_SECRETS.has(jwt) && jwt.split('.').length === 3) {
      try {
        const { data: { user }, error } = await deps.supabase.auth.getUser(jwt);
        if (!error && user) {
          const adminEmails = [
            'duncanmakoyo@gmail.com',
            'makoyoduncan@gmail.com',
            'duncan@duncanmakoyo.com',
            'duncanmakoyo30@gmail.com',
            'duncan@duncanmakoyo30.com'
          ];
          if (adminEmails.includes(user.email?.toLowerCase())) {
            req.adminUser = user;
            return next();
          }
        }
      } catch (_e) {}
    }
  }

  return res.status(401).json({ error: 'Unauthorized' });
};

// ─── GET /api/campusnet/stats ─────────────────────────────────────────────────
router.get('/stats', authenticateAdmin, async (_req, res) => {
  try {
    const { count: availableVouchers } = await deps.supabase
      .from('campusnet_vouchers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available');

    const { count: activeSessions } = await deps.supabase
      .from('campusnet_sessions')
      .select('*', { count: 'exact', head: true })
      .gt('valid_until', deps.now().toISOString());

    const { data: txs } = await deps.supabase
      .from('campusnet_transactions')
      .select('amount, paystack_reference, created_at')
      .eq('status', 'completed');

    let totalRevenue = 0;
    let paystackVerifiedRevenue = 0;
    (txs || []).forEach((t) => {
      const amt = Number(t.amount || 0);
      totalRevenue += amt;
      if (t.paystack_reference) paystackVerifiedRevenue += amt;
    });

    return res.json({
      success: true,
      brand: 'Makoyocart Ventures Wifi',
      registration: 'BN-WLSP9KP9',
      available_vouchers: availableVouchers || 0,
      active_sessions: activeSessions || 0,
      total_revenue_kes: totalRevenue,
      paystack_verified_revenue_kes: paystackVerifiedRevenue,
      total_transactions_count: (txs || []).length,
      transactions_count: (txs || []).length
    });
  } catch (err) {
    return res.status(500).json({ error: 'Stats error' });
  }
});

// ─── Automated Database Pruner (72h Retention for Auditability) ───────────────
export const pruneExpiredRecords = async () => {
  try {
    const now = deps.now();
    const retention72h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

    const { count: prunedSessions } = await deps.supabase
      .from('campusnet_sessions')
      .delete({ count: 'exact' })
      .lt('valid_until', retention72h);

    const { count: prunedVouchers } = await deps.supabase
      .from('campusnet_vouchers')
      .delete({ count: 'exact' })
      .in('status', ['assigned', 'expired'])
      .lt('expires_at', retention72h);

    const { count: prunedAbandoned } = await deps.supabase
      .from('campusnet_transactions')
      .delete({ count: 'exact' })
      .in('status', ['pending', 'failed'])
      .lt('created_at', retention72h);

    return {
      success: true,
      retention_hours: 72,
      cutoff_iso: retention72h,
      pruned_sessions: prunedSessions || 0,
      pruned_vouchers: prunedVouchers || 0,
      pruned_abandoned_txs: prunedAbandoned || 0,
      timestamp: now.toISOString()
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

router.post('/admin/prune', authenticateAdmin, async (_req, res) => {
  const result = await pruneExpiredRecords();
  return res.json(result);
});

setInterval(pruneExpiredRecords, 6 * 60 * 60 * 1000).unref?.();

// ─── POST /api/campusnet/admin/router-command (Remote L009 Control API) ───────
router.post('/admin/router-command', authenticateAdmin, (req, res) => {
  const { command } = req.body || {};
  if (!command || typeof command !== 'string' || command.trim().length < 3) {
    return res.status(400).json({ error: 'Valid RouterOS command string is required.' });
  }
  const queued = queueRouterCommand(command);
  return res.json({
    success: true,
    message: 'RouterOS command queued. L009 will execute it on next sync heartbeat (within 2 minutes).',
    queued_command: queued,
    queue_length: pendingRouterCommands.length
  });
});

// ─── GET /api/campusnet/admin/overview ─────────────────────────────────────────
let cachedOverview = null;
let lastOverviewFetch = 0;
const OVERVIEW_CACHE_TTL_MS = 30000;

router.get('/admin/overview', authenticateAdmin, async (req, res) => {
  try {
    const now = deps.now();
    const nowTime = now.getTime();
    const isForce = req.query.force === 'true';

    if (!isForce && cachedOverview && (nowTime - lastOverviewFetch < OVERVIEW_CACHE_TTL_MS)) {
      return res.json(cachedOverview);
    }

    const nowIso = now.toISOString();

    const { data: sessions } = await deps.supabase
      .from('campusnet_sessions')
      .select('*')
      .order('valid_until', { ascending: false })
      .limit(100);

    const { data: vouchers } = await deps.supabase
      .from('campusnet_vouchers')
      .select('package_id, status')
      .eq('status', 'available');

    const sixtyDaysAgo = new Date(nowTime - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data: txs } = await deps.supabase
      .from('campusnet_transactions')
      .select('id, phone, amount, package_id, created_at, status, mpesa_receipt, voucher_code, paystack_reference')
      .in('status', ['completed', 'SUCCESS'])
      .gte('created_at', sixtyDaysAgo)
      .order('created_at', { ascending: false });

    const voucherStock = {
      pkg_1h: 0,
      pkg_3h: 0,
      pkg_12h: 0,
      pkg_24h: 0,
      pkg_3d: 0,
      pkg_7d: 0,
      pkg_30d: 0,
      total_available: 0
    };
    (vouchers || []).forEach((v) => {
      if (v.status === 'available') {
        voucherStock.total_available++;
        if (voucherStock[v.package_id] !== undefined) {
          voucherStock[v.package_id]++;
        }
      }
    });

    const eatOffset = 3 * 60 * 60 * 1000;
    const nowEat = new Date(now.getTime() + eatOffset);
    const todayEatStr = nowEat.toISOString().slice(0, 10);

    const dayOfWeek = nowEat.getUTCDay();
    const diffToMon = (dayOfWeek + 6) % 7;
    const weekStartEat = new Date(nowEat);
    weekStartEat.setUTCDate(weekStartEat.getUTCDate() - diffToMon);
    weekStartEat.setUTCHours(0, 0, 0, 0);

    const monthStartEat = new Date(Date.UTC(nowEat.getUTCFullYear(), nowEat.getUTCMonth(), 1, 0, 0, 0));

    const timeBreakdowns = {
      today: { gross_kes: 0, net_kes: 0, fee_kes: 0, count: 0 },
      week: { gross_kes: 0, net_kes: 0, fee_kes: 0, count: 0 },
      month: { gross_kes: 0, net_kes: 0, fee_kes: 0, count: 0 },
      all: { gross_kes: 0, net_kes: 0, fee_kes: 0, count: 0 }
    };

    let todayRevenue = 0;
    let todayTxCount = 0;
    let totalRevenue = 0;
    let paystackVerifiedRevenue = 0;
    const customersSet = new Set();

    (txs || []).forEach((t) => {
      const amt = Number(t.amount || 0);
      if (amt <= 0) return;
      totalRevenue += amt;
      if (t.phone) customersSet.add(t.phone);
      if (t.paystack_reference) paystackVerifiedRevenue += amt;

      const tEat = new Date(new Date(t.created_at).getTime() + eatOffset);
      const tEatStr = tEat.toISOString().slice(0, 10);

      timeBreakdowns.all.gross_kes += amt;
      timeBreakdowns.all.count++;

      if (tEatStr === todayEatStr) {
        todayRevenue += amt;
        todayTxCount++;
        timeBreakdowns.today.gross_kes += amt;
        timeBreakdowns.today.count++;
      }
      if (tEat >= weekStartEat) {
        timeBreakdowns.week.gross_kes += amt;
        timeBreakdowns.week.count++;
      }
      if (tEat >= monthStartEat) {
        timeBreakdowns.month.gross_kes += amt;
        timeBreakdowns.month.count++;
      }
    });

    for (const k of ['today', 'week', 'month', 'all']) {
      timeBreakdowns[k].net_kes = Math.round(timeBreakdowns[k].gross_kes * 0.985);
      timeBreakdowns[k].fee_kes = Math.round(timeBreakdowns[k].gross_kes * 0.015);
    }

    const formattedSessions = (sessions || []).map((s) => {
      const validUntil = new Date(s.valid_until);
      const msLeft = validUntil.getTime() - now.getTime();
      const isActive = msLeft > 0;

      let timeLeftStr = 'Expired';
      if (isActive) {
        const totalSec = Math.floor(msLeft / 1000);
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        if (hours >= 24) {
          const days = Math.floor(hours / 24);
          const remHours = hours % 24;
          timeLeftStr = `${days}d ${remHours}h left`;
        } else {
          timeLeftStr = `${hours}h ${mins}m left`;
        }
      }

      const pkg = resolvePackageFromVoucherCode(s.voucher_code);
      const { clean: cleanPhone, local: localPhone } = formatPhone(s.phone);

      return {
        ...s,
        phone: cleanPhone,
        local_phone: localPhone,
        is_active: isActive,
        ms_left: msLeft,
        time_left_str: timeLeftStr,
        package_name: pkg.name,
        tel_link: `tel:${localPhone}`,
        whatsapp_link: `https://wa.me/${cleanPhone}`
      };
    });

    const activeSessionsCount = formattedSessions.filter((s) => s.is_active).length;

    const payload = {
      success: true,
      stats: {
        active_sessions_count: activeSessionsCount,
        total_sessions_count: formattedSessions.length,
        available_vouchers_count: voucherStock.total_available,
        vouchers_by_package: voucherStock,
        today_revenue_kes: todayRevenue,
        today_transactions_count: todayTxCount,
        total_revenue_kes: totalRevenue,
        wifi_today_revenue_kes: todayRevenue,
        wifi_today_transactions_count: todayTxCount,
        wifi_total_revenue_kes: totalRevenue,
        wifi_transactions_count: timeBreakdowns.all.count,
        estimated_wifi_fee_kes: Math.round(totalRevenue * 0.015),
        estimated_wifi_net_revenue_kes: Math.round(totalRevenue * 0.985),
        paystack_wifi_revenue_kes: totalRevenue,
        paystack_verified_revenue_kes: paystackVerifiedRevenue,
        total_transactions_count: timeBreakdowns.all.count,
        estimated_paystack_fee_kes: Math.round(totalRevenue * 0.015),
        estimated_net_revenue_kes: Math.round(totalRevenue * 0.985),
        total_customers_count: customersSet.size,
        unclaimed_rewards_count: 0,
        time_breakdowns: timeBreakdowns
      },
      sessions: formattedSessions,
      loyalty: [],
      packages: PACKAGES,
      timestamp: nowIso
    };

    cachedOverview = payload;
    lastOverviewFetch = nowTime;
    return res.json(payload);
  } catch (err) {
    console.error('[CampusNet Admin Overview Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/campusnet/admin/manual-activate ────────────────────────────────
router.post('/admin/manual-activate', authenticateAdmin, async (req, res) => {
  const { phone, package_id, note } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });
  const { clean: cleanPhone, valid } = formatPhone(phone);
  if (!valid) return res.status(400).json({ error: 'Invalid Kenyan phone number' });

  const pkg = getPackageById(package_id || 'pkg_24h') || getPackageById('pkg_24h');

  try {
    const activation = await activateVoucherForTransaction({
      reference: `HOTLINE_${deps.now().getTime()}_${cleanPhone.slice(-4)}`,
      phone: cleanPhone,
      macAddress: '00:00:00:00:00:00',
      packageId: pkg.id,
      paidAmountKes: pkg.amount,
      mpesaReceipt: note || 'HOTLINE_MANUAL_DISPATCH',
      paystackId: null
    });

    return res.json({
      success: true,
      message: `Successfully granted ${pkg.name} to ${cleanPhone}`,
      ...activation
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Disabled Free-Internet & Legacy Endpoints (Fail Closed 410) ──────────────
export async function getLoyaltyProfile(phone) {
  const { clean: cleanPhone, valid } = formatPhone(phone);
  return {
    valid,
    phone: cleanPhone,
    stamps: 0,
    unclaimedRewards: 0,
    hasUnclaimedReward: false,
    error: 'Free loyalty passes are disabled.'
  };
}

router.all(['/loyalty/redeem', '/admin/claim-reward', '/admin/setup-db', '/referrals/verify'], (_req, res) => {
  return res.status(410).json({
    success: false,
    valid: false,
    error: 'Free reward passes, referrals, and promotional seeding are disabled.'
  });
});

router.get(['/loyalty/status/:phone', '/loyalty/:phone'], (_req, res) => {
  return res.status(410).json({
    success: false,
    valid: false,
    error: 'Loyalty free passes are disabled.'
  });
});

router.get('/promos', (_req, res) => {
  return res.json({ success: true, promos: [] });
});

export default router;
