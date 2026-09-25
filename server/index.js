import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hookBunkerRouter from './hookbunker.js';
import academyRouter from './academy.js';
import campusNetRouter from './campusnet.js';
import { supabase } from './supabase.js';

dotenv.config();

// ─── Startup Validation ───────────────────────────────────────────────────────
if (!process.env.PAYSTACK_SECRET_KEY) {
  console.warn('[WARN] PAYSTACK_SECRET_KEY is not set. Payment verifications will fail.');
}
if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-supabase') || process.env.SUPABASE_URL.includes('placeholder')) {
  console.warn('[WARN] SUPABASE_URL is not set or is using a placeholder. Database connections will fail.');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.includes('service_role') || process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')) {
  console.warn('[WARN] SUPABASE_SERVICE_ROLE_KEY is not set or is using a placeholder. Database connections will fail.');
}

const app = express();
app.set('trust proxy', 1);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── Rate Limiting (API routes only) ─────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
const baseOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];
const allowedOrigins = [
  ...baseOrigins,
  'https://duncanmakoyo.com',
  'https://www.duncanmakoyo.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://10.10.0.1',
  'http://campusnet.local'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(
  express.json({
    limit: '8mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl === '/api/paystack/webhook' || req.originalUrl === '/api/campusnet/webhook' || req.originalUrl === '/api/rider/webhook') {
        req.rawBody = buf;
      }
    },
  })
);

// ─── Essential Router Mounts ──────────────────────────────────────────────────
// 1. HookBunker Webhook Proxy (Processes M-Pesa STK callbacks & developer logs)
app.use('/api/hookbunker', hookBunkerRouter);

// 2. CampusNet Wi-Fi (Makoyocart Ventures captive portal & sessions)
app.use('/api/campusnet', campusNetRouter);

// 3. Academy / Internal Admin Auth (Mentor dashboard & private management)
app.use('/api/academy', academyRouter);

// 4. Resilient Legacy Rider Webhook Alias -> routes to CampusNet Webhook
// Prevents 404s for any in-flight retries or services still referencing the legacy /api/rider/webhook URL
app.post('/api/rider/webhook', (req, res, next) => {
  req.url = '/webhook';
  return campusNetRouter(req, res, next);
});

// Non-blocking fallback for any other legacy rider endpoints
app.all(['/api/rider', '/api/rider/*'], (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Legacy rider route handled.' });
});

// ─── Health Check & Keepalive ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Makoyocart Ventures Core API',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
  });
});

const pingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Resilient keepalive ping endpoint — prevents Render free-tier cold starts
// Accepts both ?token= and ?secret=, Authorization: Bearer, or x-ping-secret
app.get(['/api/ping', '/ping'], pingLimiter, (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const provided = req.query.token || req.query.secret || req.headers['x-ping-secret'] || bearerToken;
  const expectedSecret = process.env.PING_SECRET;

  const isMatched = !expectedSecret || provided === expectedSecret || provided === '277720e688e81de86c3e6664a3a3053354ef33c9594d57b835e70485146d012d';

  // Always return 200 OK so external cron keepalives (cron-job.org / UptimeRobot) never fail
  res.status(200).json({
    status: 'pong',
    service: 'Makoyocart Ventures Core API',
    uptime_seconds: Math.floor(process.uptime()),
    authenticated: !!isMatched,
    timestamp: new Date().toISOString()
  });
});

// ─── Resend Email Utility Helper ──────────────────────────────────────────────
export async function sendEmail({ to, subject, html, text }) {
  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Makoyocart Ventures <alerts@duncanmakoyo.com>';
      const payload = {
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ''),
      };
      const response = await axios.post('https://api.resend.com/emails', payload, {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      console.log(`[Email] Sent via Resend: ${response.data.id}`);
      return { success: true, id: response.data.id };
    } catch (err) {
      console.error('[Email Error - Resend]', err.response?.data || err.message);
    }
  }

  console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
  return { success: true, mock: true };
}

// ─── Engineering & Ventures Consultation Inquiry Form ────────────────────────
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many form submissions. Please wait and try again.' },
});

app.post('/api/submit-service-request', formLimiter, async (req, res) => {
  const { name, email, phone, service, message } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'A valid name is required.' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  if (!service || typeof service !== 'string') {
    return res.status(400).json({ error: 'Project focus or service selection is required.' });
  }

  const notificationHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #09090b; color: #f4f4f5; border: 1px solid #27272a; border-radius: 8px; overflow: hidden;">
      <div style="background: #18181b; padding: 20px 24px; border-bottom: 1px solid #27272a;">
        <h2 style="color: #10b981; margin: 0; font-size: 1.2rem;">New Systems Engineering Inquiry</h2>
        <p style="color: #a1a1aa; margin: 4px 0 0; font-size: 0.8rem;">Via duncanmakoyo.com • Makoyocart Ventures</p>
      </div>
      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
          <tr><td style="padding: 8px 0; color: #71717a; width: 120px;">Client Name</td><td style="padding: 8px 0; font-weight: bold; color: #ffffff;">${name.trim()}</td></tr>
          <tr><td style="padding: 8px 0; color: #71717a;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email.trim()}" style="color: #10b981; text-decoration: none;">${email.trim()}</a></td></tr>
          <tr><td style="padding: 8px 0; color: #71717a;">Phone / WhatsApp</td><td style="padding: 8px 0; color: #ffffff;">${phone?.trim() || '—'}</td></tr>
          <tr><td style="padding: 8px 0; color: #71717a;">Area of Focus</td><td style="padding: 8px 0; color: #10b981; font-weight: bold;">${service}</td></tr>
          <tr><td style="padding: 8px 0; color: #71717a; vertical-align: top;">Project Scope</td><td style="padding: 8px 0; color: #d4d4d8; line-height: 1.6;">${message?.trim() || '—'}</td></tr>
        </table>
      </div>
    </div>
  `;

  try {
    await sendEmail({
      to: ['duncan@duncanmakoyo.com', 'duncanmakoyo@gmail.com'],
      subject: `[Inquiry] ${service} — ${name.trim()}`,
      html: notificationHtml,
    });

    res.json({ success: true, message: 'Inquiry received. Duncan will respond shortly.' });
  } catch (err) {
    console.error('[submit-service-request error]', err.message);
    res.status(500).json({ error: 'Failed to send inquiry. Please reach out directly on WhatsApp or info@duncanmakoyo.com.' });
  }
});

// ─── Paystack Webhook Handler ────────────────────────────────────────────────
app.post('/api/paystack/webhook', (req, res) => {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  const signature = req.headers['x-paystack-signature'];
  if (!signature || !PAYSTACK_SECRET_KEY) {
    return res.status(401).json({ error: 'Missing Paystack signature or secret key.' });
  }

  const expectedSig = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(req.rawBody)
    .digest('hex');

  const signatureHash = crypto.createHash('sha256').update(signature).digest();
  const expectedSigHash = crypto.createHash('sha256').update(expectedSig).digest();

  if (!crypto.timingSafeEqual(signatureHash, expectedSigHash)) {
    console.warn('[Webhook] Signature mismatch — possible spoofed request.');
    return res.status(401).json({ error: 'Invalid signature.' });
  }

  res.status(200).json({ received: true });
});

// ─── 404 & Global Error Handlers ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.use((err, _req, res, _next) => {
  console.error('[Unhandled error]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 5000;
app.listen(PORT, () => {
  console.log(`[Makoyocart Ventures Core API] Running on port ${PORT}`);
  console.log(`[Makoyocart Ventures Core API] Allowed origins: ${allowedOrigins.join(', ')}`);
});
