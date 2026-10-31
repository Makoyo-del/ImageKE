import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'node:dns';
try {
  dns.setDefaultResultOrder('ipv4first');
  const _origLookup = dns.lookup;
  dns.lookup = function (hostname, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = { family: 4 };
    } else if (typeof options === 'object') {
      options = { ...options, family: 4 };
    } else if (typeof options === 'number') {
      options = { family: 4 };
    }
    return _origLookup.call(this, hostname, options, callback);
  };
} catch (e) {
  console.warn('[dns] IPv4 enforcement setup failed:', e.message);
}
import { mountShopBot } from './shopbot/mount.js';
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
import digitalStoreRouter from './digitalStore.js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

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
      const isLocalCaptive = /^https?:\/\/(10\.10\.\d+\.\d+|192\.168\.\d+\.\d+|campusnet\.local)(:\d+)?$/.test(origin || '');
      if (!origin || allowedOrigins.includes(origin) || isLocalCaptive) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Router-Token'],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(
  express.json({
    limit: '8mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl === '/api/paystack/webhook' || req.originalUrl === '/api/campusnet/webhook' || req.originalUrl === '/api/rider/webhook' || req.originalUrl.startsWith('/api/store/webhook') || req.originalUrl.startsWith('/api/shopbot')) {
        req.rawBody = buf;
      }
    },
  })
);

// ─── Essential Router Mounts ──────────────────────────────────────────────────
// 1. HookBunker Webhook Proxy (Processes M-Pesa STK callbacks & developer logs)
// Static product images for WhatsApp & store
app.use('/products', express.static(path.join(__dirname, 'public/products'), { maxAge: '7d' }));

app.use('/api/hookbunker', hookBunkerRouter);

// 2. CampusNet Wi-Fi (Makoyocart Ventures captive portal & sessions)
app.use('/api/campusnet', campusNetRouter);

// 3. Academy / Internal Admin Auth (Mentor dashboard & private management)
app.use('/api/academy', academyRouter);

// 4. Digital Assets Store (Zero-Trust Checkout & Dual Fulfillment)
app.use('/api/store', digitalStoreRouter);

// 5. WhatsApp Commerce Bot (Autonomous Catalog, STK Checkout & pg-boss Queue)
await mountShopBot(app);

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
export async function sendEmail({ to, subject, html, text, from }) {
  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = from || process.env.RESEND_FROM_EMAIL || 'Duncan Makoyo <duncan@duncanmakoyo.com>';
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

// ─── Paystack Webhook Handler (Dual-Route Redundancy) ─────────────────────────
// Automatically routes directly to CampusNet Webhook handler to guarantee instant voucher activation
app.post('/api/paystack/webhook', (req, res, next) => {
  req.url = '/webhook';
  return campusNetRouter(req, res, next);
});


// ─── Shopify Catalog Audit Inbound Lead Webhook ─────────────────────────────
// Receives forwarded lead submissions from Hostinger audit landing pages (tracker.php)
// Dispatches instant 24/7 email notifications to Duncan via Resend API
app.post(['/lead-webhook', '/api/lead-webhook'], async (req, res) => {
  const { store, name, email, choice, note, ip, user_agent, referrer, timestamp } = req.body || {};

  if (!store || !email) {
    return res.status(400).json({ status: 'error', message: 'Missing store or email parameter.' });
  }

  const cleanName = (name && typeof name === 'string') ? name.trim() : 'Anonymous Merchant';
  const cleanEmail = (email && typeof email === 'string') ? email.trim() : '';
  const cleanStore = (store && typeof store === 'string') ? store.trim() : 'Unknown Store';
  const cleanChoice = choice === 'full_upgrade' ? 'Full Catalog Upgrade ($395–$550)' : 'Push 5 Free Samples to Drafts ($0)';
  const cleanNote = (note && typeof note === 'string') ? note.trim() : 'None provided';
  const auditUrl = `https://duncanmakoyo.com/audits/${cleanStore}/`;

  console.log(`[Lead Webhook] Inbound lead from ${cleanStore}: ${cleanName} (${cleanEmail}) - ${cleanChoice}`);

  const notificationHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0B281C; color: #FAF7F2; border: 1px solid #164e33; border-radius: 16px; overflow: hidden; padding: 32px 24px;">
      <div style="border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 16px; margin-bottom: 20px;">
        <span style="background: #B8F36A; color: #0B281C; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">
          ⚡ NEW SHOPIFY AUDIT LEAD
        </span>
        <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 12px 0 4px; line-height: 1.2;">
          ${cleanName} requested ${cleanChoice}
        </h1>
        <p style="color: #A7E3BD; font-size: 13px; margin: 0;">
          Store: <strong>${cleanStore}</strong> • Generated via Catalog X-Ray Proof-of-Work
        </p>
      </div>

      <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #A7E3BD; width: 130px; font-weight: 600;">Store Slug:</td>
            <td style="padding: 6px 0; color: #FFFFFF; font-weight: bold;">${cleanStore}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #A7E3BD; font-weight: 600;">Prospect Name:</td>
            <td style="padding: 6px 0; color: #FFFFFF; font-weight: bold;">${cleanName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #A7E3BD; font-weight: 600;">Prospect Email:</td>
            <td style="padding: 6px 0;"><a href="mailto:${cleanEmail}" style="color: #B8F36A; font-weight: bold; text-decoration: underline;">${cleanEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #A7E3BD; font-weight: 600;">Selected Tier:</td>
            <td style="padding: 6px 0; color: #B8F36A; font-weight: bold;">${cleanChoice}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #A7E3BD; font-weight: 600; vertical-align: top;">Merchant Note:</td>
            <td style="padding: 6px 0; color: #FFFFFF; line-height: 1.5;">${cleanNote}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #A7E3BD; font-weight: 600;">Audit Link:</td>
            <td style="padding: 6px 0;"><a href="${auditUrl}" style="color: #B8F36A; text-decoration: underline;">${auditUrl}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #A7E3BD; font-weight: 600;">Timestamp:</td>
            <td style="padding: 6px 0; color: #889988;">${timestamp || new Date().toISOString()}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #A7E3BD; font-weight: 600;">IP Address:</td>
            <td style="padding: 6px 0; color: #889988;">${ip || '—'}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="mailto:${cleanEmail}?subject=Re:%20Shopify%20Catalog%20Upgrade%20for%20${encodeURIComponent(cleanStore)}&body=Hey%20${encodeURIComponent(cleanName)},%0D%0A%0D%0AI%20received%20your%20request%20on%20your%20catalog%20audit%20report.%20"
           style="background: #B8F36A; color: #0B281C; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; padding: 14px 28px; border-radius: 12px; text-decoration: none; display: inline-block;">
          Reply to ${cleanName} Directly →
        </a>
      </div>
    </div>
  `;

  try {
    const emailResult = await sendEmail({
      to: ['duncan@duncanmakoyo.com', 'duncanmakoyo@gmail.com'],
      from: 'Shopify Catalog Lead <duncan@duncanmakoyo.com>',
      subject: `🚨 [Shopify Lead] ${cleanStore} — ${cleanName} (${cleanChoice})`,
      html: notificationHtml,
      text: `New Inbound Lead from ${cleanStore}:\nName: ${cleanName}\nEmail: ${cleanEmail}\nChoice: ${cleanChoice}\nNote: ${cleanNote}\nAudit URL: ${auditUrl}\nTimestamp: ${timestamp || new Date().toISOString()}`
    });

    return res.status(200).json({
      status: 'ok',
      store: cleanStore,
      email: cleanEmail,
      notified: emailResult.success,
      message: 'Lead received and notification dispatched.'
    });
  } catch (err) {
    console.error('[lead-webhook error]', err.message);
    return res.status(500).json({ status: 'error', message: 'Failed to process lead notification.' });
  }
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
