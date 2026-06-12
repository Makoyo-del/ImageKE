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
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

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

const paystackHeaders = {
  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
};

// Track server start time for uptime reporting
const SERVER_START = Date.now();

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

    // crypto.timingSafeEqual requires same-length buffers
    try {
      const secretBuf   = Buffer.from(PING_SECRET);
      const providedBuf = Buffer.alloc(secretBuf.length);
      Buffer.from(provided).copy(providedBuf);
      const match = crypto.timingSafeEqual(secretBuf, providedBuf);
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
  const { email, amount, metadata } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 100000) {
    return res.status(400).json({ error: 'Amount must be a positive number in KES.' });
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

    const txStatus = response.data?.data?.status;
    if (txStatus !== 'success') {
      return res.status(402).json({ error: 'Payment not confirmed.', status: txStatus });
    }
    res.json(response.data);
  } catch (error) {
    const detail = error.response?.data?.message || error.message;
    console.error('[Paystack verify error]', detail);
    res.status(502).json({ error: 'Failed to verify payment. Please contact support.' });
  }
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

  if (signature !== expectedSig) {
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
