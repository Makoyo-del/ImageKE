import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hookBunkerRouter from './hookbunker.js';
import academyRouter from './academy.js';
import workshopRouter, { sendConfirmationEmail } from './workshop.js';
import riderRouter from './rider.js';
import { supabase } from './supabase.js';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config();

// ─── Startup Validation ───────────────────────────────────────────────────────
if (!process.env.PAYSTACK_SECRET_KEY) {
  console.warn('[WARN] PAYSTACK_SECRET_KEY is not set. Career package and Academy payments will fail.');
}
if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your-supabase') || process.env.SUPABASE_URL.includes('placeholder')) {
  console.warn('[WARN] SUPABASE_URL is not set or is using a placeholder. Database connections will fail.');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.includes('service_role') || process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')) {
  console.warn('[WARN] SUPABASE_SERVICE_ROLE_KEY is not set or is using a placeholder. Database connections will fail.');
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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// Captures raw body before JSON parsing — required for Paystack webhook HMAC.
// Enforce limit of 8mb for resume uploads.
app.use(
  express.json({
    limit: '8mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl === '/api/paystack/webhook' || req.originalUrl === '/api/rider/webhook') {
        req.rawBody = buf;
      }
    },
  })
);

// ─── HookBunker Mount ─────────────────────────────────────────────────────────
app.use('/api/hookbunker', hookBunkerRouter);

// ─── Academy Mount ────────────────────────────────────────────────────────────
app.use('/api/academy', academyRouter);

// ─── Workshop Mount ───────────────────────────────────────────────────────────
app.use('/api/workshop', workshopRouter);

// ─── Rider Mount ──────────────────────────────────────────────────────────────
app.use('/api/rider', riderRouter);

// ─── Health Check (for UptimeRobot / monitoring) ──────────────────────────────
// Ping this endpoint every 5 minutes from UptimeRobot to:
//   1. Detect downtime instantly and get alerted
//   2. Keep Render from spinning down the service on free/starter tier
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'HookBunker API',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
  });
});

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

// ─── Pricing Helper ──────────────────────────────────────────────────────────
// Only paid products: career packages, academy, workshop, ATS report.
// Photo/video/batch tools are FREE — do not add them here.
async function getExpectedAmount(metadata) {
  const type = metadata?.type;
  const currency = metadata?.currency || 'KES';

  if (type === 'resume_template') {
    const templateId = metadata?.template_id;
    if (!templateId) return null;
    try {
      const { data, error } = await supabase
        .from('resume_templates')
        .select('is_free, price_kes, price_usd')
        .eq('id', templateId)
        .single();
      if (error || !data) return null;
      if (data.is_free) return 0;
      return currency === 'USD' ? Number(data.price_usd) : Number(data.price_kes);
    } catch (e) {
      console.error('[Pricing DB Fetch Error]', e.message);
      return null;
    }
  }

  if (type === 'career_service') {
    const pkgId = metadata?.package;
    if (currency === 'USD') {
      const careerPricingUSD = { essential: 20, executive: 75 };
      return careerPricingUSD[pkgId] ?? null;
    } else {
      const careerPricingKES = { essential: 2500, executive: 9500 };
      return careerPricingKES[pkgId] ?? null;
    }
  }

  if (type === 'academy_subscription') {
    const pkgId = metadata?.package;
    const academyPricing = { cohort: 10000, membership: 1500 };
    return academyPricing[pkgId] ?? null;
  }

  if (type === 'workshop_registration') {
    const ticketType = metadata?.ticket_type;
    return ticketType === 'early_bird' ? 1000 : 1500;
  }

  if (type === 'ats_report') {
    return 99;
  }

  if (type === 'ats_blueprint') {
    return 999;
  }

  // Reject unknown or free-tool payment types
  return null;
}

// ─── Initialize Payment ───────────────────────────────────────────────────────
app.post('/api/initialize-payment', apiLimiter, async (req, res) => {
  const { email, metadata } = req.body;
  const currency = metadata?.currency || 'KES';

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  // Enforce pricing server-side based on type and tool to prevent client-side editing/tampering
  const expectedAmount = await getExpectedAmount(metadata);
  if (expectedAmount === null) {
    return res.status(400).json({ error: 'Invalid service package.' });
  }

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: Math.round(expectedAmount * 100), // KES → kobo, USD → cents
        currency,
        metadata: metadata || {},
      },
      { headers: paystackHeaders }
    );
    res.json(response.data);
  } catch (error) {
    const detail = error.response?.data?.message || error.message;
    console.error('[Paystack init error]', detail);
    // Forward the exact error (like minimum amount limits) so the frontend sees it instead of a generic message
    res.status(502).json({ error: detail || 'Failed to initialize payment. Please try again.' });
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
    const metadata = txData?.metadata;

    // Server-side amount validation: reject if type is unknown or amount is insufficient
    const expectedAmount = await getExpectedAmount(metadata);
    if (expectedAmount === null || amountPaid < expectedAmount) {
      console.error(`[Security] Payment amount mismatch. Paid: ${amountPaid}, Expected: ${expectedAmount}, Type: ${metadata?.type}`);
      return res.status(400).json({
        error: 'Security validation failed: Payment amount does not match the expected service price.',
        status: 'failed'
      });
    }

    res.json({
      status: 'success',
      data: txData,
    });
  } catch (error) {
    const detail = error.response?.data?.message || error.message;
    console.error('[Paystack verify error]', detail);
    res.status(502).json({ error: 'Failed to verify payment. Please contact support.' });
  }
});

// ─── Secure Paid Template Download Proxy ──────────────────────────────────────
app.get('/api/download-template/:reference', apiLimiter, async (req, res) => {
  const { reference } = req.params;

  if (!reference || !/^[a-zA-Z0-9_-]+$/.test(reference)) {
    return res.status(400).json({ error: 'Invalid payment reference.' });
  }

  try {
    // 1. Verify transaction with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: paystackHeaders }
    );

    const txData = response.data?.data;
    const txStatus = txData?.status;
    if (txStatus !== 'success') {
      return res.status(402).json({ error: 'Payment not confirmed.', status: txStatus });
    }

    // 2. Extract template ID from Paystack transaction metadata
    const templateId = txData.metadata?.template_id;
    if (!templateId) {
      return res.status(400).json({ error: 'Invalid transaction metadata.' });
    }

    // 3. Fetch template file URL and name from Supabase
    const { data: template, error } = await supabase
      .from('resume_templates')
      .select('file_url, name')
      .eq('id', templateId)
      .single();

    if (error || !template || !template.file_url) {
      console.error('[Download Proxy DB Error]', error?.message || 'Template file not found.');
      return res.status(404).json({ error: 'Template file not found.' });
    }

    // 4. Download file from storage bucket and pipe it to response
    const fileRes = await axios.get(template.file_url, { responseType: 'stream' });
    
    // Set headers to trigger direct browser download
    const cleanFileName = template.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFileName}.docx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    fileRes.data.pipe(res);
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    console.error('[Download proxy error]', detail);
    res.status(500).json({ error: 'Failed to process template download.' });
  }
});

// ─── [REMOVED] Verify Subscription Token ─────────────────────────────────────
// Subscription tokens were used for the former Creator Plan (video tool paywall).
// Photo/video tools are now free. This endpoint is intentionally removed.
// Career packages, Academy, and HookBunker use Paystack verify-payment instead.

// ─── Generate ATS Report & Personalised Copy ──────────────────────────────────
const OWNER_EMAILS = [
  'duncanmakoyo@gmail.com',
  'makoyoduncan@gmail.com',
  'duncan@duncanmakoyo.com',
  'info@duncanmakoyo.com'
];

app.post('/api/generate-ats-report', apiLimiter, async (req, res) => {
  const { email, reference, candidateName, score, metrics } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  const isOwner = OWNER_EMAILS.includes(email.toLowerCase());

  // 1. Validate payment if not owner
  if (!isOwner) {
    if (!reference || typeof reference !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(reference)) {
      return res.status(400).json({ error: 'Invalid payment reference.' });
    }

    try {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: paystackHeaders }
      );

      const txData = response.data?.data;
      if (txData?.status !== 'success') {
        return res.status(402).json({ error: 'Payment not confirmed.', status: txData?.status });
      }

      // Check transaction timestamp (within 30 minutes)
      const paidAtStr = txData?.paid_at;
      if (paidAtStr) {
        const paidAt = new Date(paidAtStr).getTime();
        if (Math.abs(Date.now() - paidAt) > 30 * 60 * 1000) {
          return res.status(403).json({ error: 'Payment reference expired. Verification must happen within 30 minutes.' });
        }
      }

      const amountPaid = txData?.amount / 100; // kobo -> KES
      const expectedAmount = 99;
      if (amountPaid < expectedAmount) {
        return res.status(400).json({ error: 'Security validation failed: Paid amount does not match the requested service price.' });
      }

      const type = txData?.metadata?.type;
      if (type !== 'ats_report') {
        return res.status(400).json({ error: 'Security validation failed: Payment was not for an ATS report.' });
      }

      // Multiuser Security: Verify that the customer email matches the requested email
      const paidEmail = txData?.customer?.email;
      if (!paidEmail || paidEmail.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ error: 'Security validation failed: Payment customer email does not match the requested email.' });
      }
    } catch (error) {
      console.error('[Paystack verification failed for report]', error.response?.data?.message || error.message);
      return res.status(502).json({ error: 'Failed to verify payment reference.' });
    }
  }

  // 2. Call Gemini to write the personalized strategic review
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY is not configured on the server.');
    return res.status(500).json({ error: 'Gemini service is not configured on the server.' });
  }

  const issuesListStr = Array.isArray(metrics?.issues) ? metrics.issues.map(i => `- ${i}`).join('\n') : 'general formatting and keyword gaps';
  const missingSectionsStr = Array.isArray(metrics?.missingSections) ? metrics.missingSections.join(', ') : 'none';

  const systemPrompt = `You are an elite career consultant and executive resume writer. Your assistant Duncan Makoyo helps professionals rewrite resumes, pass ATS filters, and land high-paying roles.
Write a highly personalized, compelling, and professional strategic advice pitch (150-200 words) for the candidate ${candidateName || 'Candidate'}.
The candidate just ran their resume through our ATS Simulator and received an ATS score of ${score || 0}%.

Their specific issues are:
${issuesListStr}
Missing sections: ${missingSectionsStr}

Objectives of the pitch:
1. Speak directly to ${candidateName || 'Candidate'} in an encouraging, authoritative, yet urgent tone.
2. Acknowledge that the ATS score of ${score || 0}% shows specific technical gaps, but emphasize that the real value lies in the human strategic positioning. A resume is a marketing document, not a historical list.
3. Convince them that they are leaving money on the table by applying with their current resume.
4. Persuade them to book a professional CV rewrite and career consulting session with Duncan Makoyo by emailing info@duncanmakoyo.com or messaging on WhatsApp at +254 794 877 125 to unlock interviews and land promotions.
5. Do NOT mention "AI", "Gemini", "Google", "LLM", or "machine learning" in your pitch. Avoid phrases like "our simulator". Treat this as a human audit review.
6. Provide plain text, well-structured paragraphs, without markdown lists or asterisks. Make it look like a personal note written by Duncan's team.`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000
      }
    );

    const candidate = response.data?.candidates?.[0];
    const pitch = candidate?.content?.parts?.[0]?.text;

    if (!pitch) {
      throw new Error('Gemini returned an empty pitch.');
    }

    res.json({ success: true, pitch });
  } catch (error) {
    console.error('[Gemini error in generate-ats-report]', error.response?.data?.error?.message || error.message);
    res.status(502).json({ error: 'Failed to generate personalized strategic advice.' });
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
      `[Webhook] charge.success — ref: ${reference}, KES: ${amount / 100}, email: ${customer?.email}, type: ${metadata?.type}`
    );

    if (metadata?.type === 'workshop_registration') {
      (async () => {
        try {
          const { supabase } = await import('./supabase.js');
          const { data: registration, error: dbErr } = await supabase
            .from('workshop_registrations')
            .select('*')
            .eq('payment_reference', reference)
            .maybeSingle();

          if (dbErr || !registration) {
            console.error(`[Webhook Error] Registration record not found for ref ${reference}`);
          } else if (registration.payment_status !== 'paid') {
            const { error: updateErr } = await supabase
              .from('workshop_registrations')
              .update({ payment_status: 'paid' })
              .eq('payment_reference', reference);

            if (updateErr) {
              console.error(`[Webhook Error] Failed to update registration for ref ${reference}`, updateErr.message);
            } else {
              const updatedReg = { ...registration, payment_status: 'paid' };
              await sendConfirmationEmail(updatedReg);
              console.log(`[Webhook Success] Confirmed workshop seat for ${registration.email}`);
            }
          }
        } catch (err) {
          console.error('[Webhook Workshop Processing Error]', err.message);
        }
      })();
    } else if (metadata?.type === 'career_service' || metadata?.type === 'ats_blueprint') {
      // Auto-provision Academy access for high-ticket buyers
      (async () => {
        try {
          const emailToProvision = customer?.email?.trim()?.toLowerCase();
          if (!emailToProvision) return;
          
          const { supabase, supabaseAnon } = await import('./supabase.js');
          
          // Check if user already exists
          const { data: existingUser, error: checkErr } = await supabaseAnon.auth.signInWithOtp({
             email: emailToProvision,
             options: { shouldCreateUser: false }
          });
          
          // Generate token
          const verificationToken = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

          let userId = null;

          if (checkErr && checkErr.message.includes('Signups not allowed')) {
            // User does not exist, create them
            const { data: userData, error: signupErr } = await supabaseAnon.auth.signUp({
              email: emailToProvision,
              password: crypto.randomBytes(16).toString('hex'), // Random temp password
              options: {
                data: {
                  full_name: customer?.first_name ? `${customer.first_name} ${customer.last_name || ''}`.trim() : emailToProvision.split('@')[0],
                }
              }
            });
            if (signupErr) {
               console.error('[Webhook Academy Provisioning Error] Signup failed:', signupErr.message);
               return;
            }
            userId = userData.user.id;
          } else {
             // We can't directly get the user ID from OTP check easily without admin privileges,
             // so we'll rely on the profiles table matching the email instead.
             const { data: existingProfile } = await supabase
               .from('profiles')
               .select('id')
               .eq('email', emailToProvision)
               .maybeSingle();
             
             if (existingProfile) {
                userId = existingProfile.id;
             }
          }

          if (userId) {
            // Update profile
            await supabase
              .from('profiles')
              .update({
                academy_verification_token: verificationToken,
                academy_verification_expires: expiresAt,
                academy_access: true
              })
              .eq('id', userId);

            const academyDashboardUrl = process.env.ACADEMY_DASHBOARD_URL || 'https://duncanmakoyo.com/#/academy/dashboard';
            const verifyLink = `${academyDashboardUrl.split('#')[0]}?verify_token=${verificationToken}#/academy`;

            await sendEmail({
              to: emailToProvision,
              subject: 'Bonus: Your Career Academy Access',
              html: `
                <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111111; background: #F4F4EE; border: 2px solid #111111; overflow: hidden; padding: 0;">
                  <div style="background: #111111; padding: 24px 32px; border-bottom: 2px solid #111111;">
                    <h2 style="color: #F4F4EE; margin: 0; font-size: 1.4rem; font-family: Georgia, serif; font-weight: 700;">Career Academy</h2>
                    <p style="color: #D61A3C; margin: 6px 0 0; font-family: Arial, sans-serif; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;">// Bonus Access Unlocked</p>
                  </div>
                  <div style="padding: 32px; line-height: 1.7; font-size: 0.95rem; font-family: Arial, sans-serif;">
                    <p style="margin-top: 0; font-weight: 800; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.05em; color: #111111;">Hello,</p>
                    <p style="color: #333333; margin-bottom: 24px;">As part of your recent career service purchase, you've been granted complimentary access to the <strong>Duncan Makoyo Career Academy</strong>. Please verify your email to unlock your resources.</p>
        
                    <div style="text-align: center; margin: 28px 0;">
                      <a href="${verifyLink}" target="_blank"
                        style="display: inline-block; background: #D61A3C; color: #ffffff; padding: 12px 32px; border: 2px solid #111111; font-weight: 800; text-decoration: none; font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase;">
                        Verify &amp; Access Academy
                      </a>
                    </div>
        
                    <div style="margin-top: 32px; padding-top: 20px; border-top: 2px solid #111111;">
                      <p style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #111111; text-transform: uppercase; letter-spacing: 0.05em;">Duncan Makoyo</p>
                      <p style="margin: 4px 0 0; font-size: 0.75rem; color: #D61A3C; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Tech Consultant &amp; Career Mentor</p>
                    </div>
                  </div>
                </div>
              `,
            });
            console.log(`[Webhook Success] Provisioned Academy access for ${emailToProvision}`);
          }
        } catch (err) {
          console.error('[Webhook Academy Provisioning Error]', err.message);
        }
      })();
    }
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
      tls: {
        rejectUnauthorized: false, // bypass SSL certificate verification issues common in shared hosts
      },
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

// ─── Gemini System Prompt and Parser Proxy ──────────────────────────────────
const GEMINI_SYSTEM_PROMPT = `
You are an advanced proprietary ATS Simulator Engine (V2). Your objective is to parse the uploaded resume and evaluate it against professional resume-writing standards.

CRITICAL RULES FOR RECOMMENDATIONS & TERMINOLOGY:
1. Do NOT mention "Gemini", "Google", "AI", "LLM", or any specific machine learning model name in your analysis or recommendations. Treat yourself as a proprietary "ATS Simulator Engine".
2. All recommendations must be formulated in a constructive, client-facing tone as if written by an elite career consultant.
3. Evaluate the resume strictly against the following Resume Quality Rules:

RESUME QUALITY RULES:
1. Typography & Design:
   - Preferred fonts are clean, standard sans-serif (e.g., Calibri, Arial, Montserrat, Open Sans).
   - Simple, clean layouts. Colors should be strictly black text on white background. No colored headers, gray subtitles, or tint accents.
   - Layout tables must be avoided (they confuse ATS parsers).
   - No visual/design clutter (no icons, skill progress bars, star ratings, pie charts, or floating text boxes).
   - Page count: Professional/executive resumes should strictly be under a 2-page cap.
   - Compiling margins should be compact (around 0.4in to 0.5in).
   - No decorative bullet symbols (use standard circular bullets or plain hyphens).
2. Structure & Organization:
   - Sections should be organized in this order:
     1. Contact Information
     2. Professional Summary
     3. Key Achievements
     4. Core Skills
     5. Professional Experience
     6. Education
     7. Interests
     8. Referees
   - Standard headings should be uppercase (e.g., PROFESSIONAL SUMMARY, CORE SKILLS, PROFESSIONAL EXPERIENCE, EDUCATION, CERTIFICATIONS, LANGUAGES, KEY ACHIEVEMENTS, REFEREES). Avoid creative headings like "My Journey".
3. Contact Details & Privacy Rules:
   - Contact line should be separated by pipes (" | ").
   - No profile photo/headshot (this is a major ATS bias and parsing risk). IMPORTANT: Set "hasPhoto" to true ONLY if you explicitly see a visual photographic headshot/profile picture of a person's face. Do NOT flag text headers, blank margins, colored sidebar containers, decorative icons, avatars, or logos as a photo. If not 100% certain, assume false.
   - No personal identifiers: Date of birth (DOB), age, gender, marital status, National ID, or passport numbers (these are privacy and bias risks!). Only set "hasDOB", "hasMaritalStatus", and "hasIDNumber" to true if you see explicit text stating these.
   - No full physical address. City and Country is acceptable (e.g., "London, UK", "Nairobi, Kenya", "Lagos, Nigeria", "New York, USA", "Dubai, UAE"). Street-level address details are not acceptable.
   - Include LinkedIn URL if provided. LinkedIn URLs may appear as linkedin.com/in/name (personal profile), linkedin.com/company/name, or linkedin.com/school/name. A missing LinkedIn URL is NOT a critical or warning issue — set it to null and do not penalise the candidate. LinkedIn is not universally used across all industries and regions.
4. Content & STAR Method (Critical):
   - Every experience bullet point must follow the STAR method: Action Verb + Specific Task + Quantifiable Result. No generic responsibilities list.
   - Bold the first 3-5 words of every bullet point in the experience section.
   - Bold key statistics and metrics (e.g., "% Growth", "$ ARR", "Time saved", transaction counts, audit scores) inside paragraphs and bullets.
   - Ensure there are NO raw asterisks in the copy (e.g., USSD channels must be written as "USSD 247#" or "USSD channel 247#" instead of "*247#").
   - Punctuation & Grammar: Every bullet point/item must start with a capital letter and end with a clean full stop (period).
   - Referees: If references are listed, they should include the supervisor's name, title, and direct phone.

CRITICAL INSTRUCTION ON TRUTHFULNESS & DETERMINISM:
All boolean evaluation flags (e.g., hasPhoto, hasDOB, hasMaritalStatus, hasIDNumber, hasFullAddress, isLikelyScanned, multiColumnRisk, hasTables, hasGraphics, hasTextBoxes, hasCreativeHeadings, hasSpecialBullets, isOverTwoPages, hasColoredTextOrBg, usesStarMethod, hasMetrics, boldsFirstWords, boldsMetrics, grammarCapitalizationAndPeriods, rawAsterisksFound) MUST be 100% truthful based strictly on what is present in the document. Do not guess, speculate, or make false inferences. If a feature or risk is not clearly and explicitly present, set its flag to false.
You must perform an objective, strict, and consistent evaluation. The same resume content must always receive the exact same boolean flags and identified lists. Do not fluctuate your evaluation criteria between runs. Be very conservative: if a quality criterion (such as STAR method, metrics, standard uppercase headers, or formatting) is not fully met, strictly set its positive evaluation to false, and strictly flag the risk/issue.

You must parse the document and return a JSON object with the following schema:
{
  "contact": {
    "name": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "linkedin": "string or null",
    "location": "string or null",
    "hasPhoto": boolean,
    "hasDOB": boolean,
    "hasMaritalStatus": boolean,
    "hasIDNumber": boolean,
    "hasFullAddress": boolean
  },
  "sections": {
    "summary": boolean,
    "experience": boolean,
    "education": boolean,
    "skills": boolean,
    "certifications": boolean,
    "languages": boolean,
    "achievements": boolean,
    "references": boolean
  },
  "formatting": {
    "isLikelyScanned": boolean,
    "multiColumnRisk": boolean,
    "hasTables": boolean,
    "hasGraphics": boolean,
    "hasTextBoxes": boolean,
    "hasHeaderFooterContact": boolean,
    "hasCreativeHeadings": boolean,
    "hasSpecialBullets": boolean,
    "pageCountEstimate": number,
    "isOverTwoPages": boolean,
    "hasColoredTextOrBg": boolean
  },
  "skills": ["string"],
  "jobTitles": ["string"],
  "yearsExp": "string",
  "hasAchievements": boolean,
  "experienceEvaluation": {
    "usesStarMethod": boolean,
    "hasMetrics": boolean,
    "boldsFirstWords": boolean,
    "boldsMetrics": boolean,
    "grammarCapitalizationAndPeriods": boolean,
    "rawAsterisksFound": boolean
  },
  "recommendations": [
    {
      "type": "critical",
      "text": "string"
    }
  ]
}
`;

const parserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                  // 30 parses per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many resume reviews. Please wait a few minutes and try again.' },
});

app.post('/api/analyze-resume', parserLimiter, async (req, res) => {
  const { text, fileBase64, fileType, extractedLinks } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('[Resume Parser Proxy] Error: GEMINI_API_KEY is not configured on the server.');
    return res.status(500).json({ error: 'ATS Simulator Engine is not configured on the server.' });
  }

  // ── Input size guard (prevents memory exhaustion under concurrent load) ─────
  // base64-encoded PDF can be up to ~10MB; extracted DOCX text is typically under 1MB
  const MAX_BASE64_BYTES = 12 * 1024 * 1024; // 12MB of base64 characters
  const MAX_TEXT_BYTES = 500 * 1024;          // 500KB of plain text
  if (fileBase64 && fileBase64.length > MAX_BASE64_BYTES) {
    return res.status(413).json({ error: 'Document is too large to process. Please upload a file under 8MB.' });
  }
  if (text && text.length > MAX_TEXT_BYTES) {
    return res.status(413).json({ error: 'Extracted text is too large. Please upload a shorter document.' });
  }

  // ── Link sanitation: only forward valid HTTP URLs, cap list at 50 entries ──
  const safeLinks = Array.isArray(extractedLinks)
    ? extractedLinks
        .filter(l => typeof l === 'string' && /^https?:\/\//i.test(l))
        .slice(0, 50)
    : [];

  try {
    let parts = [
      { text: GEMINI_SYSTEM_PROMPT }
    ];

    if (fileBase64 && fileType === 'pdf') {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: fileBase64
        }
      });

      let promptText = 'Please analyze the uploaded PDF resume according to the system instructions.';
      if (safeLinks.length > 0) {
        promptText += `\n\nCRITICAL CONTEXT — UNDERLYING HYPERLINKS:\nThe document parsing engine extracted the following interactive hyperlinks embedded in the document's metadata/relationships/code:\n${safeLinks.map(l => `- ${l}`).join('\n')}\nUse this list to resolve any hidden/underlying links (e.g. if a link points to a LinkedIn profile, consider the LinkedIn URL detected even if only anchor text like 'LinkedIn' is visible in the resume body, and do not warn the user about it being missing or not formatted as a full URL).`;
      }
      parts.push({ text: promptText });

    } else if (text) {
      let promptText = `Here is the extracted text of the resume:\n\n${text}\n\nPlease analyze it using the instructions.`;
      if (safeLinks.length > 0) {
        promptText += `\n\nCRITICAL CONTEXT — UNDERLYING HYPERLINKS:\nThe document parsing engine extracted the following interactive hyperlinks embedded in the document's metadata/relationships/code:\n${safeLinks.map(l => `- ${l}`).join('\n')}\nUse this list to resolve any hidden/underlying links (e.g. if a link points to a LinkedIn profile, consider the LinkedIn URL detected even if only anchor text like 'LinkedIn' is visible in the resume body, and do not warn the user about it being missing or not formatted as a full URL).`;
      }
      parts.push({ text: promptText });
    } else {
      return res.status(400).json({ error: 'Missing resume text or document.' });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.0
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000 // 25s timeout
      }
    );

    const candidate = response.data?.candidates?.[0];
    const responseText = candidate?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Empty response from parser engine.');
    }

    // Try parsing to validate it is valid JSON
    const parsed = JSON.parse(responseText);
    res.json(parsed);
  } catch (error) {
    const detail = error.response?.data?.error?.message || error.message;
    console.error('[Resume Parser Proxy Error]', detail);
    res.status(502).json({ error: 'ATS Simulator Engine failed to parse the document.' });
  }
});

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

  const html = `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; border: 2px solid #111111; background: #F4F4EE; padding: 0;">
      <div style="background: #111111; padding: 24px 32px; border-bottom: 2px solid #111111;">
        <h2 style="color: #F4F4EE; margin: 0; font-size: 1.3rem; font-family: Georgia, serif;">New Service Request</h2>
        <p style="color: #D61A3C; margin: 4px 0 0; font-family: Arial, sans-serif; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;">// Via DuncanMakoyo.com</p>
      </div>
      <div style="background: #F4F4EE; padding: 32px; font-family: Arial, sans-serif;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
          <tr><td style="padding: 10px 0; border-bottom: 2px solid #111111; font-weight: 800; color: #111111; width: 140px; text-transform: uppercase; letter-spacing: 0.05em;">Name</td><td style="padding: 10px 0; border-bottom: 2px solid #111111; color: #111111;">${name.trim()}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 2px solid #111111; font-weight: 800; color: #111111; text-transform: uppercase; letter-spacing: 0.05em;">Email</td><td style="padding: 10px 0; border-bottom: 2px solid #111111; color: #111111;"><a href="mailto:${email.trim()}" style="color: #D61A3C; text-decoration: none; font-weight: 700;">${email.trim()}</a></td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 2px solid #111111; font-weight: 800; color: #111111; text-transform: uppercase; letter-spacing: 0.05em;">Phone</td><td style="padding: 10px 0; border-bottom: 2px solid #111111; color: #111111;">${phone?.trim() || '—'}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 2px solid #111111; font-weight: 800; color: #111111; text-transform: uppercase; letter-spacing: 0.05em;">Service</td><td style="padding: 10px 0; border-bottom: 2px solid #111111; color: #D61A3C; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">${service}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 2px solid #111111; font-weight: 800; color: #111111; text-transform: uppercase; letter-spacing: 0.05em;">Free CV Audit?</td><td style="padding: 10px 0; border-bottom: 2px solid #111111; color: #111111;">${wantAudit ? 'YES — wants free CV audit' : 'No'}</td></tr>
          <tr><td style="padding: 10px 0; font-weight: 800; color: #111111; vertical-align: top; text-transform: uppercase; letter-spacing: 0.05em;">Message</td><td style="padding: 10px 0; color: #333333; line-height: 1.6;">${message?.trim() || '—'}</td></tr>
        </table>
        <div style="margin-top: 24px; padding: 16px; background: #FFFFFF; border: 2px solid #111111;">
          <p style="margin: 0; font-size: 0.75rem; color: #555555; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Reply directly to this email to respond to <strong>${name.trim()}</strong>.</p>
        </div>
      </div>
    </div>`;

  try {
    await sendEmail({
      to: 'duncan@duncanmakoyo.com',
      subject: `[Service Request] ${service} — ${name.trim()}`,
      html,
    });

    // Send auto-acknowledgement email to the client
    try {
      const clientHtml = `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111111; background: #F4F4EE; border: 2px solid #111111; overflow: hidden; padding: 0;">
          <!-- Header -->
          <div style="background: #111111; padding: 32px; border-bottom: 2px solid #111111;">
            <h2 style="color: #F4F4EE; margin: 0; font-size: 1.5rem; font-family: Georgia, serif; font-weight: 700;">Request Received</h2>
            <p style="color: #D61A3C; margin: 6px 0 0; font-family: Arial, sans-serif; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;">// Via duncanmakoyo.com</p>
          </div>
          <!-- Body -->
          <div style="padding: 32px; line-height: 1.7; font-size: 0.95rem; font-family: Arial, sans-serif;">
            <p style="margin-top: 0; margin-bottom: 16px; font-weight: 800; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.05em; color: #111111;">Hi ${name.trim()},</p>
            <p style="margin-bottom: 20px; color: #333333;">Thanks for reaching out! I've successfully received your inquiry for <strong>${service}</strong>.</p>
            <p style="margin-bottom: 24px; color: #333333;">I am reviewing your details and will get back to you within 24 hours to discuss how we can work together. If you have any immediate files or context to share (like your current resume or target job descriptions), feel free to reply directly to this email.</p>
            
            <!-- Details Box -->
            <div style="background: #FFFFFF; border: 2px solid #111111; padding: 20px; margin-bottom: 32px;">
              <h3 style="margin: 0 0 12px; font-size: 0.8rem; color: #111111; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800;">Your Request Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                <tr>
                  <td style="color: #555555; padding: 6px 0; width: 140px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Service:</td>
                  <td style="font-weight: 800; color: #111111; padding: 6px 0;">${service}</td>
                </tr>
                <tr>
                  <td style="color: #555555; padding: 6px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Free CV Audit:</td>
                  <td style="font-weight: 800; color: #D61A3C; padding: 6px 0;">${wantAudit ? 'Requested' : 'No'}</td>
                </tr>
              </table>
            </div>
 
            <!-- Signature Section -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #111111;">
              <p style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #111111; text-transform: uppercase; letter-spacing: 0.05em;">Duncan Makoyo</p>
              <p style="margin: 4px 0 16px; font-size: 0.75rem; color: #D61A3C; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
                Tech Consultant · Resume Writer · Digital Strategist
              </p>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; color: #555555; line-height: 1.6;">
                <tr>
                  <td style="padding: 2px 0;"><strong>Email:</strong> <a href="mailto:info@duncanmakoyo.com" style="color: #D61A3C; text-decoration: none; font-weight: 700;">info@duncanmakoyo.com</a></td>
                  <td style="padding: 2px 0; padding-left: 20px;"><strong>Web:</strong> <a href="https://duncanmakoyo.com" style="color: #D61A3C; text-decoration: none; font-weight: 700;">duncanmakoyo.com</a></td>
                </tr>
                <tr>
                  <td style="padding: 2px 0;"><strong>LinkedIn:</strong> <a href="https://linkedin.com/in/duncan-makoyo" style="color: #D61A3C; text-decoration: none; font-weight: 700;">linkedin.com/in/duncan-makoyo</a></td>
                  <td style="padding: 2px 0; padding-left: 20px;">&nbsp;</td>
                </tr>
              </table>
              
              <div style="margin-top: 16px; padding: 12px; background: #FFFFFF; border: 2px solid #111111; border-left: 4px solid #D61A3C; font-size: 0.75rem; color: #111111; font-style: italic; line-height: 1.4;">
                ✦ Helped 10+ professionals get hired &amp; earn promotions · Helping brands communicate better.
              </div>
            </div>
 
          </div>
        </div>`;
      await sendEmail({
        to: email.trim(),
        subject: `Request Received: ${service} — Duncan Makoyo`,
        html: clientHtml,
      });
    } catch (clientErr) {
      console.warn('[submit-service-request client email error]', clientErr.message);
    }

    res.json({ success: true, message: 'Request received. Duncan will be in touch within 24 hours.' });
  } catch (err) {
    console.error('[submit-service-request error]', err.message);
    res.status(500).json({ error: 'Failed to send request. Please contact Duncan directly at info@duncanmakoyo.com.' });
  }
});

// ─── SMTP Diagnostic Test Endpoint ───────────────────────────────────────────
app.get('/api/test-smtp', async (req, res) => {
  try {
    const { default: nodemailer } = await import('nodemailer');
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      return res.status(400).json({ error: 'SMTP credentials not configured in environment.' });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log(`[SMTP Test] Verifying host: ${host}, port: ${port}...`);
    await transporter.verify();
    res.json({
      status: 'success',
      message: 'SMTP connection verified successfully!',
      config: { host, port, secure: port === 465, user }
    });
  } catch (error) {
    console.error('[SMTP Test Error]', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      code: error.code,
      command: error.command,
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: parseInt(process.env.SMTP_PORT, 10) === 465,
        user: process.env.SMTP_USER
      }
    });
  }
});

app.post('/api/notify-service-order', apiLimiter, async (req, res) => {
  const { email, package: pkg, price, reference, currency } = req.body;
  if (!email || !pkg || !price || !reference) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const isUSD = currency === 'USD';
  const currLabel = isUSD ? 'USD' : 'KES';
  const currSymbol = isUSD ? '$' : 'KES ';

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
          <tr><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;font-weight:700;color:#0F172A">Amount Paid</td><td style="padding:10px 0;border-bottom:1px solid #E2E8F0;color:#0F172A;font-weight:700">${currSymbol}${Number(price).toLocaleString()} (${currLabel})</td></tr>
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
      subject: `[PAID] ${pkg} Package — ${currSymbol}${Number(price).toLocaleString()} — ${email}`,
      html,
    });

    // Send payment confirmation receipt email to the client
    try {
      const clientHtml = `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111111; background: #F4F4EE; border: 2px solid #111111; overflow: hidden; padding: 0;">
          <!-- Header -->
          <div style="background: #111111; padding: 32px; border-bottom: 2px solid #111111;">
            <h2 style="color: #F4F4EE; margin: 0; font-size: 1.5rem; font-family: Georgia, serif; font-weight: 700;">Payment Confirmed</h2>
            <p style="color: #D61A3C; margin: 6px 0 0; font-family: Arial, sans-serif; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;">// Order Receipt</p>
          </div>
          <!-- Body -->
          <div style="padding: 32px; line-height: 1.7; font-size: 0.95rem; font-family: Arial, sans-serif;">
            <p style="margin-top: 0; margin-bottom: 16px; font-weight: 800; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.05em; color: #111111;">Hi there,</p>
            <p style="margin-bottom: 20px; color: #333333;">Thank you for choosing my career consulting services. Your payment of <strong>${currSymbol}${Number(price).toLocaleString()}</strong> for the <strong>${pkg}</strong> package has been successfully verified.</p>
            
            <p style="margin-bottom: 12px; font-weight: 800; color: #111111; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem;">What happens next?</p>
            <ul style="margin: 0 0 24px; padding-left: 20px; color: #333333; line-height: 1.6;">
              <li style="margin-bottom: 8px;">I will personally reach out to you at this email address within 24 hours to schedule our kick-off or request your current details.</li>
              <li style="margin-bottom: 8px;">If you want to get started immediately, simply reply directly to this email with your current CV, target job titles/descriptions, or specific career goals.</li>
            </ul>
            
            <!-- Details Box -->
            <div style="background: #FFFFFF; border: 2px solid #111111; padding: 20px; margin-bottom: 32px;">
              <h3 style="margin: 0 0 12px; font-size: 0.8rem; color: #111111; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800;">Order Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                <tr>
                  <td style="color: #555555; padding: 6px 0; width: 120px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Package:</td>
                  <td style="font-weight: 800; color: #111111; padding: 6px 0;">${pkg} Package</td>
                </tr>
                <tr>
                  <td style="color: #555555; padding: 6px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Amount:</td>
                  <td style="font-weight: 800; color: #D61A3C; padding: 6px 0;">${currSymbol}${Number(price).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #555555; padding: 6px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Reference:</td>
                  <td style="color: #555555; padding: 6px 0; font-size: 0.8rem;">${reference}</td>
                </tr>
              </table>
            </div>
 
            <!-- Signature Section -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #111111;">
              <p style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #111111; text-transform: uppercase; letter-spacing: 0.05em;">Duncan Makoyo</p>
              <p style="margin: 4px 0 16px; font-size: 0.75rem; color: #D61A3C; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
                Tech Consultant · Resume Writer · Digital Strategist
              </p>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; color: #555555; line-height: 1.6;">
                <tr>
                  <td style="padding: 2px 0;"><strong>Email:</strong> <a href="mailto:info@duncanmakoyo.com" style="color: #D61A3C; text-decoration: none; font-weight: 700;">info@duncanmakoyo.com</a></td>
                  <td style="padding: 2px 0; padding-left: 20px;"><strong>Web:</strong> <a href="https://duncanmakoyo.com" style="color: #D61A3C; text-decoration: none; font-weight: 700;">duncanmakoyo.com</a></td>
                </tr>
                <tr>
                  <td style="padding: 2px 0;"><strong>LinkedIn:</strong> <a href="https://linkedin.com/in/duncan-makoyo" style="color: #D61A3C; text-decoration: none; font-weight: 700;">linkedin.com/in/duncan-makoyo</a></td>
                  <td style="padding: 2px 0; padding-left: 20px;">&nbsp;</td>
                </tr>
              </table>
              
              <div style="margin-top: 16px; padding: 12px; background: #FFFFFF; border: 2px solid #111111; border-left: 4px solid #D61A3C; font-size: 0.75rem; color: #111111; font-style: italic; line-height: 1.4;">
                ✦ Helped 10+ professionals get hired &amp; earn promotions · Helping brands communicate better.
              </div>
            </div>
 
          </div>
        </div>`;
      await sendEmail({
        to: email.trim().toLowerCase(),
        subject: `Confirmation: Your Career Package is Confirmed! — Duncan Makoyo`,
        html: clientHtml,
      });
    } catch (clientErr) {
      console.warn('[notify-service-order client email error]', clientErr.message);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[notify-service-order error]', err.message);
    // Non-critical — payment already verified, don't fail the client
    res.json({ success: true, warning: 'Email notification failed but payment was confirmed.' });
  }
});

// ─── Pricing update for career service payments ─────────────────────────────────────
// (handled inside initialize-payment — see existing pricing block)

// ─── LinkedIn Recruiter Scorecard Endpoints ─────────────────────────────────────
const LINKEDIN_SCORECARD_SYSTEM_PROMPT = `You are an elite Executive Recruiter and Headhunter who uses LinkedIn Recruiter's Boolean search engine to source candidates. Your task is to evaluate how discoverable a candidate's LinkedIn profile is when a recruiter runs a Boolean search for their target job title.

HOW RECRUITERS ACTUALLY FIND CANDIDATES (your lens):
Recruiters type Boolean queries like: "Senior Relationship Manager" AND ("portfolio management" OR "credit analysis") AND ("KCB" OR "Equity Bank"). LinkedIn's algorithm ranks profiles based on keyword density in Headline, About, Skills, Experience titles, and Education. Profiles missing these exact terms are invisible even if the candidate is qualified.

CRITICAL RULES FOR TRUTHFULNESS & VALUE:
1. Be 100% TRUTHFUL, ACCURATE, and CONSTRUCTIVE. Diagnose only real gaps.
2. DO NOT invent false problems or manufacture issues to push sales. If a profile is strong, say so clearly and give a high score.
3. If the profile inputs are clear, keyword-rich, and well-structured for the target role, award a HIGH score (78-96%) and affirm the candidate.
4. If genuine recruiter search gaps exist (missing exact-match keywords, vague headline, absent metrics), accurately outline them.
5. Award scores in the 35-55 range ONLY if the profile is genuinely sparse, incoherent, or completely misaligned with the target role.
6. Never mention "Gemini", "Google", "AI", "LLM", or "machine learning". Identify yourself only as the "LinkedIn Recruiter POV Diagnostic Engine".
7. Respond ONLY in valid JSON. No markdown, no commentary outside JSON.

SCORING METHODOLOGY:
- Headline Keyword Match (0-30 pts): Does the headline contain the exact target title or close synonyms?
- About Section Depth (0-25 pts): Does the summary mention measurable outcomes, industry terms, seniority signals?
- Implied Skills & Experience Depth (0-25 pts): Based on roles and terminology used, do the skills align with the target title's typical Boolean search terms?
- Profile Completeness Signals (0-20 pts): Are there quantifiable achievements, named employers, clear career trajectory?

JSON SCHEMA (return exactly this structure, all fields required):
{
  "visibilityScore": 72,
  "percentileRank": 58,
  "verdictTitle": "Moderate Visibility — Detectable But Outranked",
  "verdictSummary": "Concise, truthful 2-3 sentence diagnosis of the recruiter search visibility situation for this candidate and target role.",
  "missingKeywords": ["exact keyword 1", "exact keyword 2", "exact keyword 3", "exact keyword 4", "exact keyword 5"],
  "recruiterSearchGaps": [
    "Specific, actionable gap #1 based on actual profile content",
    "Specific, actionable gap #2 based on actual profile content",
    "Specific, actionable gap #3 based on actual profile content"
  ],
  "headlineFix": "High-converting professional headline rewrite using the exact target title and relevant industry keywords",
  "isStrongProfile": false
}`;

app.post('/api/linkedin/analyze', apiLimiter, async (req, res) => {
  try {
    // pdfBase64: raw PDF bytes encoded as base64 (from frontend FileReader)
    // pdfText: plain text already extracted (legacy / direct text path)
    // headline + about: manual text entry path
    const { targetTitle, pdfBase64, pdfFileName, pdfText, headline, about } = req.body;

    if (!targetTitle || (!pdfBase64 && !pdfText && !headline && !about)) {
      return res.status(400).json({ error: 'Please provide a target job title and your LinkedIn profile content.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[LinkedIn Scorecard] GEMINI_API_KEY is missing on server.');
      return res.status(500).json({ error: 'Scorecard engine is temporarily unavailable.' });
    }

    // ─── Extract text from PDF if base64 was provided ──────────────────────
    let resolvedProfileText = pdfText || null;
    if (pdfBase64 && !resolvedProfileText) {
      try {
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        const parsed = await pdfParse(pdfBuffer);
        resolvedProfileText = parsed.text?.trim();
        console.log(`[LinkedIn Scorecard] PDF parsed: ${pdfFileName || 'unknown'}, chars: ${resolvedProfileText?.length || 0}`);
      } catch (pdfErr) {
        console.warn('[LinkedIn Scorecard] PDF parse failed, falling back to empty text:', pdfErr.message);
        resolvedProfileText = '';
      }
    }

    // Build the candidate profile block for the AI
    const profileBlock = resolvedProfileText
      ? `LINKEDIN PROFILE CONTENT (Extracted from PDF Export):\n${resolvedProfileText.slice(0, 6000)}`
      : `Headline: ${headline || 'Not provided'}\nAbout Section: ${about || 'Not provided'}`;

    const promptText = `TARGET JOB TITLE THE CANDIDATE IS PURSUING: ${targetTitle}\n\n${profileBlock}\n\nUsing your Boolean recruiter search engine lens, evaluate this candidate's LinkedIn search visibility for the target role. Return strictly valid JSON per your schema.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [
            { text: LINKEDIN_SCORECARD_SYSTEM_PROMPT },
            { text: promptText }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const aiCandidate = response.data?.candidates?.[0];
    const responseText = aiCandidate?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('Empty response from AI engine');
    }

    const parsed = JSON.parse(responseText);
    res.json({ success: true, ...parsed });
  } catch (err) {
    console.error('[LinkedIn Scorecard Error]', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to analyze LinkedIn profile. Please check inputs and try again.' });
  }
});

app.post('/api/linkedin/lead', async (req, res) => {
  try {
    const { name, email, phone, timeline, targetTitle, visibilityScore, missingKeywords, headlineFix } = req.body;

    if (!name || !email || !targetTitle) {
      return res.status(400).json({ error: 'Name, email, and target title are required.' });
    }

    // 1. Persist to Supabase if configured
    if (supabase) {
      try {
        await supabase.from('linkedin_leads').insert([{
          name,
          email: email.trim().toLowerCase(),
          phone: phone || null,
          target_job_title: targetTitle,
          visibility_score: visibilityScore || 0,
          timeline_urgency: timeline || 'Immediate',
          missing_keywords: missingKeywords || [],
          headline_fix: headlineFix || null,
          status: 'NEW_LEAD'
        }]);
      } catch (dbErr) {
        console.warn('[LinkedIn Lead DB Insert Warning]', dbErr.message);
      }
    }

    // 2. Dispatch notification email to owner (duncanmakoyo@gmail.com)
    const ownerEmailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: #F4F4EE; color: #111111;">
        <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 2px solid #111111; padding: 24px;">
          <h2 style="color: #D61A3C; margin-top: 0; text-transform: uppercase; letter-spacing: 0.08em;">NEW LINKEDIN SCORECARD LEAD</h2>
          <p style="font-size: 1rem; line-height: 1.5;">A new prospect just completed the LinkedIn Recruiter POV Audit on your website.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #111111;">
            <tr style="background: #111111; color: #FFFFFF;"><th style="padding: 10px; text-align: left;">Field</th><th style="padding: 10px; text-align: left;">Details</th></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${name}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Phone / WhatsApp:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${phone || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Target Role:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${targetTitle}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Input Method:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">PDF Extract / Manual Text</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Visibility Score:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd; font-weight: bold; color: #D61A3C;">${visibilityScore}/100</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Hiring Timeline:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${timeline || 'Not specified'}</td></tr>
          </table>

          <div style="background: #F4F4EE; padding: 15px; border-left: 4px solid #D61A3C; margin-top: 15px;">
            <p style="margin: 0; font-weight: bold; font-size: 0.85rem;">Generated Headline Rewrite:</p>
            <p style="margin: 5px 0 0; font-style: italic;">"${headlineFix || 'N/A'}"</p>
          </div>

          <div style="margin-top: 25px; text-align: center;">
            <a href="https://wa.me/${(phone || '').replace(/[^0-9]/g, '')}?text=Hi%20${encodeURIComponent(name)},%20I%20saw%20your%20LinkedIn%20Scorecard%20audit%20for%20${encodeURIComponent(targetTitle)}..." 
               style="display: inline-block; background: #25D366; color: #FFFFFF; padding: 12px 24px; font-weight: bold; text-decoration: none; border: 2px solid #111111;">
               Contact Lead on WhatsApp →
            </a>
          </div>
        </div>
      </div>
    `;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        await axios.post(
          'https://api.resend.com/emails',
          {
            from: `Duncan Makoyo Web <duncan@duncanmakoyo.com>`,
            to: ['duncanmakoyo@gmail.com', 'makoyoduncan@gmail.com'],
            subject: `[LinkedIn Lead] ${name} — ${targetTitle} | Score: ${visibilityScore}/100`,
            html: ownerEmailHtml
          },
          { headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' } }
        );
      } catch (emailErr) {
        console.error('[LinkedIn Lead Email Error]', emailErr.message);
      }
    }

    res.json({ success: true, message: 'Lead captured successfully.' });
  } catch (err) {
    console.error('[LinkedIn Lead Error]', err.message);
    res.status(500).json({ error: 'Failed to record lead.' });
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
