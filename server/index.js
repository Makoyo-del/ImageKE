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
// Enforce limit of 8mb for resume uploads.
app.use(
  express.json({
    limit: '8mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl === '/api/paystack/webhook') {
        req.rawBody = buf;
      }
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

// ─── Pricing Helper ─────────────────────────────────────────────────────────────
function getExpectedAmount(metadata) {
  let amount = 49; // Default photo price
  const type = metadata?.type;
  const currency = metadata?.currency || 'KES';
  
  if (type === 'creator_subscription') {
    amount = 499;
  } else if (type === 'batch_download') {
    amount = 4; // 4 shillings for batch compression
  } else if (type === 'video_download') {
    const tool = metadata?.tool;
    const videoPricing = {
      aspect: 99,
      compress: 79,
      watermark: 79,
      audio: 49,
      frames: 99
    };
    amount = (tool && videoPricing[tool]) ? videoPricing[tool] : 99;
  } else if (type === 'career_service') {
    const pkgId = metadata?.package;
    if (currency === 'USD') {
      const careerPricingUSD = {
        essential: 12,
        professional: 28,
        executive: 48
      };
      if (pkgId && careerPricingUSD[pkgId]) {
        amount = careerPricingUSD[pkgId];
      } else {
        return null;
      }
    } else {
      const careerPricingKES = {
        essential: 1500,
        professional: 3500,
        executive: 6000
      };
      if (pkgId && careerPricingKES[pkgId]) {
        amount = careerPricingKES[pkgId];
      } else {
        return null;
      }
    }
  } else {
    // Default fallback or photo_download
    amount = 49;
  }
  
  return amount;
}

// ─── Initialize Payment ───────────────────────────────────────────────────────
app.post('/api/initialize-payment', apiLimiter, async (req, res) => {
  const { email, metadata } = req.body;
  const currency = metadata?.currency || 'KES';

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  // Enforce pricing server-side based on type and tool to prevent client-side editing/tampering
  const expectedAmount = getExpectedAmount(metadata);
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
    const email = txData?.customer?.email;
    const metadata = txData?.metadata;

    // VERY SECURE: Validate that the paid amount actually matches the expected pricing for this product
    const expectedAmount = getExpectedAmount(metadata);
    if (expectedAmount === null || amountPaid < expectedAmount) {
      console.error(`[Security Warning] Payment amount mismatch. Paid: ${amountPaid}, Expected: ${expectedAmount}`);
      return res.status(400).json({ 
        error: 'Security validation failed: Payment amount does not match the requested service price.', 
        status: 'failed' 
      });
    }

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

CRITICAL INSTRUCTION ON TRUTHFULNESS:
All boolean evaluation flags (e.g., hasPhoto, hasDOB, hasMaritalStatus, hasIDNumber, hasFullAddress, isLikelyScanned, multiColumnRisk, hasTables, hasGraphics, hasTextBoxes, hasCreativeHeadings, hasSpecialBullets, isOverTwoPages, hasColoredTextOrBg, usesStarMethod, hasMetrics, boldsFirstWords, boldsMetrics, grammarCapitalizationAndPeriods, rawAsterisksFound) MUST be 100% truthful based strictly on what is present in the document. Do not guess, speculate, or make false inferences. If a feature or risk is not clearly and explicitly present, set its flag to false.

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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json'
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

    // Send auto-acknowledgement email to the client
    try {
      const clientHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 32px; border-bottom: 3px solid #14B8A6;">
            <h2 style="color: #FFFFFF; margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Request Received</h2>
            <p style="color: #A5F3FC; margin: 6px 0 0; font-size: 0.875rem; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">Via duncanmakoyo.com</p>
          </div>
          <!-- Body -->
          <div style="padding: 32px; line-height: 1.7; font-size: 0.95rem;">
            <p style="margin-top: 0; margin-bottom: 16px; font-weight: 600; font-size: 1.05rem;">Hi ${name.trim()},</p>
            <p style="margin-bottom: 20px; color: #475569;">Thanks for reaching out! I've successfully received your inquiry for <strong>${service}</strong>.</p>
            <p style="margin-bottom: 24px; color: #475569;">I am reviewing your details and will get back to you within 24 hours to discuss how we can work together. If you have any immediate files or context to share (like your current resume or target job descriptions), feel free to reply directly to this email.</p>
            
            <!-- Details Box -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
              <h3 style="margin: 0 0 12px; font-size: 0.9rem; color: #0F172A; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Your Request Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                <tr>
                  <td style="color: #64748B; padding: 6px 0; width: 120px; font-weight: 500;">Service:</td>
                  <td style="font-weight: 700; color: #0F172A; padding: 6px 0;">${service}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0; font-weight: 500;">Free CV Audit:</td>
                  <td style="font-weight: 700; color: #14B8A6; padding: 6px 0;">${wantAudit ? '✅ Requested' : 'No'}</td>
                </tr>
              </table>
            </div>

            <!-- Signature Section -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 1rem; font-weight: 700; color: #0F172A;">Duncan Makoyo</p>
              <p style="margin: 4px 0 16px; font-size: 0.85rem; color: #4F46E5; font-weight: 600; letter-spacing: 0.02em;">
                Tech Consultant &nbsp;|&nbsp; Resume Writer &nbsp;|&nbsp; Digital Marketing Strategist
              </p>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 0.825rem; color: #475569; line-height: 1.6;">
                <tr>
                  <td style="padding: 2px 0;"><strong>Email:</strong> <a href="mailto:info@duncanmakoyo.com" style="color: #14B8A6; text-decoration: none; font-weight: 600;">info@duncanmakoyo.com</a></td>
                  <td style="padding: 2px 0; padding-left: 20px;"><strong>Web:</strong> <a href="https://duncanmakoyo.com" style="color: #14B8A6; text-decoration: none; font-weight: 600;">duncanmakoyo.com</a></td>
                </tr>
                <tr>
                  <td style="padding: 2px 0;"><strong>LinkedIn:</strong> <a href="https://linkedin.com/in/duncan-makoyo" style="color: #14B8A6; text-decoration: none; font-weight: 600;">linkedin.com/in/duncan-makoyo</a></td>
                  <td style="padding: 2px 0; padding-left: 20px;">&nbsp;</td>
                </tr>
              </table>
              
              <div style="margin-top: 16px; padding: 10px 14px; background: #F8FAFC; border-left: 3px solid #14B8A6; border-radius: 0 8px 8px 0; font-size: 0.775rem; color: #1E293B; font-style: italic; line-height: 1.4;">
                ✦ Helped 10+ professionals get hired & earn promotions &nbsp;|&nbsp; Helping brands communicate better.
              </div>
            </div>

          </div>
        </div>
      `;
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
      const clientHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 32px; border-bottom: 3px solid #10B981;">
            <h2 style="color: #FFFFFF; margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Payment Confirmed</h2>
            <p style="color: #A7F3D0; margin: 6px 0 0; font-size: 0.875rem; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">Order Receipt</p>
          </div>
          <!-- Body -->
          <div style="padding: 32px; line-height: 1.7; font-size: 0.95rem;">
            <p style="margin-top: 0; margin-bottom: 16px; font-weight: 600; font-size: 1.05rem;">Hi there,</p>
            <p style="margin-bottom: 20px; color: #475569;">Thank you for choosing my career consulting services. Your payment of <strong>${currSymbol}${Number(price).toLocaleString()}</strong> for the <strong>${pkg}</strong> package has been successfully verified.</p>
            
            <p style="margin-bottom: 12px; font-weight: 700; color: #0F172A;">What happens next?</p>
            <ul style="margin: 0 0 24px; padding-left: 20px; color: #475569;">
              <li style="margin-bottom: 8px;">I will personally reach out to you at this email address within 24 hours to schedule our kick-off or request your current details.</li>
              <li style="margin-bottom: 8px;">If you want to get started immediately, simply reply directly to this email with your current CV, target job titles/descriptions, or specific career goals.</li>
            </ul>
            
            <!-- Details Box -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
              <h3 style="margin: 0 0 12px; font-size: 0.9rem; color: #0F172A; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Order Details</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
                <tr>
                  <td style="color: #64748B; padding: 6px 0; width: 120px; font-weight: 500;">Package:</td>
                  <td style="font-weight: 700; color: #0F172A; padding: 6px 0;">${pkg} Package</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0; font-weight: 500;">Amount:</td>
                  <td style="font-weight: 700; color: #10B981; padding: 6px 0;">${currSymbol}${Number(price).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #64748B; padding: 6px 0; font-weight: 500;">Reference:</td>
                  <td style="color: #64748B; padding: 6px 0; font-size: 0.8rem;">${reference}</td>
                </tr>
              </table>
            </div>

            <!-- Signature Section -->
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0; font-size: 1rem; font-weight: 700; color: #0F172A;">Duncan Makoyo</p>
              <p style="margin: 4px 0 16px; font-size: 0.85rem; color: #4F46E5; font-weight: 600; letter-spacing: 0.02em;">
                Tech Consultant &nbsp;|&nbsp; Resume Writer &nbsp;|&nbsp; Digital Marketing Strategist
              </p>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 0.825rem; color: #475569; line-height: 1.6;">
                <tr>
                  <td style="padding: 2px 0;"><strong>Email:</strong> <a href="mailto:info@duncanmakoyo.com" style="color: #14B8A6; text-decoration: none; font-weight: 600;">info@duncanmakoyo.com</a></td>
                  <td style="padding: 2px 0; padding-left: 20px;"><strong>Web:</strong> <a href="https://duncanmakoyo.com" style="color: #14B8A6; text-decoration: none; font-weight: 600;">duncanmakoyo.com</a></td>
                </tr>
                <tr>
                  <td style="padding: 2px 0;"><strong>LinkedIn:</strong> <a href="https://linkedin.com/in/duncan-makoyo" style="color: #14B8A6; text-decoration: none; font-weight: 600;">linkedin.com/in/duncan-makoyo</a></td>
                  <td style="padding: 2px 0; padding-left: 20px;">&nbsp;</td>
                </tr>
              </table>
              
              <div style="margin-top: 16px; padding: 10px 14px; background: #F8FAFC; border-left: 3px solid #14B8A6; border-radius: 0 8px 8px 0; font-size: 0.775rem; color: #1E293B; font-style: italic; line-height: 1.4;">
                ✦ Helped 10+ professionals get hired & earn promotions &nbsp;|&nbsp; Helping brands communicate better.
              </div>
            </div>

          </div>
        </div>
      `;
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
