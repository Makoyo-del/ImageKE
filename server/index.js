import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

// ─── Startup Validation ───────────────────────────────────────────────────────
if (!process.env.PAYSTACK_SECRET_KEY) {
  console.error('FATAL: PAYSTACK_SECRET_KEY is not set. Server cannot start.');
  process.exit(1);
}
if (!process.env.PING_SECRET) {
  console.warn('[WARN] PING_SECRET is not set. The /api/ping endpoint will be UNPROTECTED. Set it in your environment variables.');
}
if (!process.env.TOKEN_SECRET) {
  console.warn('[WARN] TOKEN_SECRET is not set. Subscriptions will use a default signing key and invalidate if the server restarts.');
}

const app = express();
app.set('trust proxy', 1); // Required for rate limiting behind Render's load balancer

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── Rate Limiting (API routes only) ─────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Frontend is hosted on Hostinger (cross-origin). ALLOWED_ORIGINS must include
// your Hostinger domain, e.g.: https://imageke.com,https://www.imageke.com
const baseOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];
const allowedOrigins = [...baseOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// Captures raw body before JSON parsing — required for Paystack webhook HMAC.
app.use(
  express.json({
    limit: '50kb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ─── Constants ────────────────────────────────────────────────────────────────
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PING_SECRET = process.env.PING_SECRET || null;
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'fallback_secret_key_for_signing_tokens';

const paystackHeaders = {
  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
};

// Track server start time for uptime reporting
const SERVER_START = Date.now();

// ─── Token Signing Helpers ───────────────────────────────────────────────────
function generateSubscriptionToken(email, durationDays = 30) {
  const payload = {
    email,
    type: 'subscription',
    expiresAt: Date.now() + durationDays * 24 * 60 * 60 * 1000,
  };
  const payloadStr = JSON.stringify(payload);
  const base64Payload = Buffer.from(payloadStr).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(base64Payload)
    .digest('base64url');
    
  return `${base64Payload}.${signature}`;
}

function verifySubscriptionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  
  const [base64Payload, signature] = parts;
  
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(base64Payload)
    .digest('base64url');
    
  const signatureHash = crypto.createHash('sha256').update(signature).digest();
  const expectedSigHash = crypto.createHash('sha256').update(expectedSig).digest();
  
  if (!crypto.timingSafeEqual(signatureHash, expectedSigHash)) {
    return null;
  }
  
  try {
    const payloadStr = Buffer.from(base64Payload, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);
    
    if (payload.expiresAt < Date.now()) {
      return null; // Expired
    }
    
    return payload;
  } catch {
    return null;
  }
}

// ─── Rate Limiter: Ping (separate from payment limiter) ───────────────────────
const pingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 pings per window — cron every 5 min = 3/hr, well within limit
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many ping requests.' },
});

// ─── Health Check (public — no auth required) ────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Secure Ping / Keep-Alive Endpoint ───────────────────────────────────────
// Used by an external cron job (e.g., cron-job.org, UptimeRobot, GitHub Actions)
// to prevent the Render free-tier service from sleeping after 15 min of inactivity.
//
// Authentication: pass the PING_SECRET via one of:
//   1. Header:        Authorization: Bearer <PING_SECRET>
//   2. Query param:   GET /api/ping?token=<PING_SECRET>
//
// If PING_SECRET is not set in env, the endpoint responds but logs a warning.
// Set up your cron to call this every 10–12 minutes.
app.get('/api/ping', pingLimiter, (req, res) => {
  // ── Auth check ─────────────────────────────────────────────────────────────
  if (PING_SECRET) {
    const authHeader = req.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const queryToken  = req.query.token || null;
    const provided    = bearerToken || queryToken;

    // Constant-time comparison to prevent timing attacks
    if (!provided) {
      return res.status(401).json({ error: 'Unauthorized. Provide token via Authorization header or ?token= query.' });
    }

    try {
      // Use double-SHA256 comparison to safely compare arbitrary-length secrets without leaking length or prefix-matching
      const secretHash   = crypto.createHash('sha256').update(PING_SECRET).digest();
      const providedHash = crypto.createHash('sha256').update(provided).digest();
      const match = crypto.timingSafeEqual(secretHash, providedHash);
      if (!match) {
        return res.status(403).json({ error: 'Forbidden. Invalid token.' });
      }
    } catch {
      return res.status(403).json({ error: 'Forbidden. Invalid token.' });
    }
  }

  // ── Healthy response ───────────────────────────────────────────────────────
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START) / 1000);
  const mem = process.memoryUsage();

  console.log(`[Ping] keep-alive hit at ${new Date().toISOString()} — uptime: ${uptimeSeconds}s`);

  res.json({
    status:    'alive',
    timestamp: new Date().toISOString(),
    uptime_s:  uptimeSeconds,
    uptime_h:  (uptimeSeconds / 3600).toFixed(2),
    memory: {
      rss_mb:        (mem.rss        / 1024 / 1024).toFixed(1),
      heap_used_mb:  (mem.heapUsed   / 1024 / 1024).toFixed(1),
      heap_total_mb: (mem.heapTotal  / 1024 / 1024).toFixed(1),
    },
    service: 'imageke-api',
  });
});

// ─── Initialize Payment ───────────────────────────────────────────────────────
app.post('/api/initialize-payment', apiLimiter, async (req, res) => {
  const { email, metadata } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  // Enforce pricing server-side based on type and tool to prevent client-side editing/tampering
  let amount = 49; // Default photo price
  const type = metadata?.type;
  if (type === 'creator_subscription') {
    amount = 499;
  } else if (type === 'video_download') {
    const tool = metadata?.tool;
    const videoPricing = {
      aspect: 99,
      compress: 79,
      watermark: 79,
      audio: 49,
      frames: 99
    };
    if (tool && videoPricing[tool]) {
      amount = videoPricing[tool];
    } else {
      amount = 99; // Default video fallback
    }
  } else if (type === 'career_service') {
    const pkgId = metadata?.package;
    const careerPricing = {
      essential: 1500,
      professional: 3500,
      executive: 6000
    };
    if (pkgId && careerPricing[pkgId]) {
      amount = careerPricing[pkgId];
    } else {
      return res.status(400).json({ error: 'Invalid career service package.' });
    }
  } else {
    // Default fallback or photo_download
    amount = 49;
  }

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: Math.round(amount * 100), // KES → kobo
        currency: 'KES',
        metadata: metadata || {},
      },
      { headers: paystackHeaders }
    );
    res.json(response.data);
  } catch (error) {
    const detail = error.response?.data?.message || error.message;
    console.error('[Paystack init error]', detail);
    res.status(502).json({ error: 'Failed to initialize payment. Please try again.' });
  }
});

// ─── Verify Payment ───────────────────────────────────────────────────────────
app.get('/api/verify-payment/:reference', apiLimiter, async (req, res) => {
  const { reference } = req.params;

  if (!reference || !/^[a-zA-Z0-9_-]+$/.test(reference)) {
    return res.status(400).json({ error: 'Invalid payment reference.' });
  }

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: paystackHeaders }
    );

    const txData = response.data?.data;
    const txStatus = txData?.status;
    if (txStatus !== 'success') {
      return res.status(402).json({ error: 'Payment not confirmed.', status: txStatus });
    }

    // Check transaction timestamp to prevent reference reuse (within 30 minutes)
    const paidAtStr = txData?.paid_at;
    if (paidAtStr) {
      const paidAt = new Date(paidAtStr).getTime();
      const diffMs = Date.now() - paidAt;
      if (Math.abs(diffMs) > 30 * 60 * 1000) {
        return res.status(403).json({ 
          error: 'Payment reference expired. Verification must happen within 30 minutes of payment.' 
        });
      }
    }

    const amountPaid = txData?.amount / 100; // kobo/cents → KES
    const email = txData?.customer?.email;

    // Issue subscription token if amount covers the monthly plan (KES 499)
    let token = null;
    if (amountPaid >= 499 && email) {
      token = generateSubscriptionToken(email, 30);
    }

    res.json({
      status: 'success',
      data: txData,
      token: token,
    });
  } catch (error) {
    const detail = error.response?.data?.message || error.message;
    console.error('[Paystack verify error]', detail);
    res.status(502).json({ error: 'Failed to verify payment. Please contact support.' });
  }
});

// ─── Verify Subscription Token ───────────────────────────────────────────────
app.post('/api/verify-subscription-token', apiLimiter, (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required.' });
  }

  const payload = verifySubscriptionToken(token);
  if (!payload) {
    return res.json({ valid: false });
  }

  res.json({
    valid: true,
    email: payload.email,
    expiresAt: payload.expiresAt,
    expiresAtISO: new Date(payload.expiresAt).toISOString(),
  });
});

// ─── Paystack Webhook ─────────────────────────────────────────────────────────
// Register in Paystack Dashboard → Settings → API Keys & Webhooks:
//   https://imageke-api.onrender.com/api/paystack/webhook
app.post('/api/paystack/webhook', (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  if (!signature) return res.status(401).json({ error: 'Missing Paystack signature.' });

  const expectedSig = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(req.rawBody)
    .digest('hex');

  // Constant-time comparison using double-SHA256 to prevent timing attacks
  const signatureHash = crypto.createHash('sha256').update(signature).digest();
  const expectedSigHash = crypto.createHash('sha256').update(expectedSig).digest();

  if (!crypto.timingSafeEqual(signatureHash, expectedSigHash)) {
    console.warn('[Webhook] Signature mismatch — possible spoofed request.');
    return res.status(401).json({ error: 'Invalid signature.' });
  }

  res.status(200).json({ received: true });

  const event = req.body;
  if (event.event === 'charge.success') {
    const { reference, amount, customer, metadata } = event.data;
    console.log(
      `[Webhook] charge.success — ref: ${reference}, KES: ${amount / 100}, email: ${customer?.email}, preset: ${metadata?.preset}`
    );
  }
});

// ─── Email Helper ─────────────────────────────────────────────────────────────
// Priority: RESEND_API_KEY (Render native) → SMTP (nodemailer) → console log
async function sendEmail({ to, subject, html }) {
  // ── Option 1: Resend (Render native integration) ─────────────────────
  if (process.env.RESEND_API_KEY) {
    const fromAddress = process.env.EMAIL_FROM || 'noreply@duncanmakoyo.com';
    const response = await axios.post(
      'https://api.resend.com/emails',
      { from: `Duncan Makoyo <${fromAddress}>`, to, subject, html },
      { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    if (response.data?.id) {
      console.log(`[Email] Sent via Resend: ${response.data.id}`);
    }
    return;
  }

  // ── Option 2: SMTP (Gmail App Password or any SMTP) ────────────────
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const { default: nodemailer } = await import('nodemailer');
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000, // 10 seconds connection timeout
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    await transporter.sendMail({
      from: `"Duncan Makoyo" <${process.env.SMTP_USER}>`,
      to, subject, html,
    });
    console.log(`[Email] Sent via SMTP to ${to}`);
    return;
  }

  // ── Fallback: console log only (no credentials set) ────────────────
  console.warn('[Email] No email credentials set (RESEND_API_KEY or SMTP_USER/SMTP_PASS).');
  console.log(`[Email fallback] TO: ${to} | SUBJECT: ${subject}`);
}

// ─── Service Request Endpoint ─────────────────────────────────────────────────
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many form submissions. Please wait and try again.' },
});

app.post('/api/submit-service-request', formLimiter, async (req, res) => {
  const { name, email, phone, service, message, wantAudit } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'A valid name is required.' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (!service || typeof service !== 'string') {
    return res.status(400).json({ error: 'Service selection is required.' });
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0F172A;padding:24px 32px;border-radius:12px 12px 0 0">
        <h2 style="color:#14B8A6;margin:0;font-size:1.2rem">New Service Request</h2>
        <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:0.875rem">Via DuncanMakoyo.com</p>
      </div>
      <div style="background:#F8FAFC;padding:32px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A;width:140px">Name</td><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#334155">${name.trim()}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A">Email</td><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#334155"><a href="mailto:${email.trim()}" style="color:#14B8A6">${email.trim()}</a></td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A">Phone</td><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#334155">${phone?.trim() || '—'}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A">Service</td><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#14B8A6;font-weight:700">${service}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A">Free Audit?</td><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#334155">${wantAudit ? '✅ Yes — wants free CV audit' : 'No'}</td></tr>
          <tr><td style="padding:10px 0;font-weight:700;color:#0F172A;vertical-align:top">Message</td><td style="padding:10px 0;color:#334155;line-height:1.6">${message?.trim() || '—'}</td></tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#fff;border:1px solid #E2E8F0;border-radius:8px">
          <p style="margin:0;font-size:0.8rem;color:#64748B">Reply directly to this email to respond to <strong>${name.trim()}</strong>.</p>
        </div>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: 'duncan@duncanmakoyo.com',
      subject: `[Service Request] ${service} — ${name.trim()}`,
      html,
    });
    res.json({ success: true, message: 'Request received. Duncan will be in touch within 24 hours.' });
  } catch (err) {
    console.error('[submit-service-request error]', err.message);
    res.status(500).json({ error: 'Failed to send request. Please contact Duncan directly at info@duncanmakoyo.com.' });
  }
});

// ─── Career Package Order Notification ───────────────────────────────────────
app.post('/api/notify-service-order', apiLimiter, async (req, res) => {
  const { email, package: pkg, price, reference } = req.body;
  if (!email || !pkg || !price || !reference) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#0F172A;padding:24px 32px;border-radius:12px 12px 0 0">
        <h2 style="color:#10B981;margin:0;font-size:1.2rem">✅ New Career Package Payment</h2>
        <p style="color:rgba(255,255,255,0.6);margin:4px 0 0;font-size:0.875rem">Payment confirmed via Paystack</p>
      </div>
      <div style="background:#F8FAFC;padding:32px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A;width:140px">Client Email</td><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#14B8A6"><a href="mailto:${email}" style="color:#14B8A6">${email}</a></td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A">Package</td><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#10B981;font-weight:700">${pkg}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A">Amount Paid</td><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:700">KES ${Number(price).toLocaleString()}</td></tr>
          <tr><td style="padding:10px 0;font-weight:700;color:#0F172A">Reference</td><td style="padding:10px 0;color:#64748B;font-size:0.85rem">${reference}</td></tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px">
          <p style="margin:0;font-weight:700;color:#065F46">Action Required: Contact this client within 24 hours to begin their ${pkg} package.</p>
        </div>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: 'duncan@duncanmakoyo.com',
      subject: `[PAID] ${pkg} Package — KES ${Number(price).toLocaleString()} — ${email}`,
      html,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[notify-service-order error]', err.message);
    // Non-critical — payment already verified, don't fail the client
    res.json({ success: true, warning: 'Email notification failed but payment was confirmed.' });
  }
});

// ─── Pricing update for career service payments ─────────────────────────────────────
// (handled inside initialize-payment — see existing pricing block)

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Unhandled error]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 5000;
app.listen(PORT, () => {
  console.log(`[ImageKE API] Running on port ${PORT}`);
  console.log(`[ImageKE API] Allowed origins: ${allowedOrigins.join(', ')}`);
});
