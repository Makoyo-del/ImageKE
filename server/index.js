import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';

dotenv.config();

// ─── Startup Validation ───────────────────────────────────────────────────────
if (!process.env.PAYSTACK_SECRET_KEY) {
  console.error('FATAL: PAYSTACK_SECRET_KEY is not set. Server cannot start.');
  process.exit(1);
}

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, Render health checks)
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
// IMPORTANT: The webhook endpoint needs the raw body buffer for HMAC verification.
// We capture the raw body before JSON parsing, then use it in the webhook route.
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

const paystackHeaders = {
  Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
};

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Initialize Payment ───────────────────────────────────────────────────────
// The frontend sends the human KES amount (e.g. 49).
// We convert to kobo (×100) before forwarding to Paystack.
// The frontend PaystackPop.setup() also multiplies by 100 independently.
app.post('/api/initialize-payment', async (req, res) => {
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
// Called by the frontend after the PaystackPop callback fires.
app.get('/api/verify-payment/:reference', async (req, res) => {
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
      return res.status(402).json({
        error: 'Payment not confirmed.',
        status: txStatus,
      });
    }

    res.json(response.data);
  } catch (error) {
    const detail = error.response?.data?.message || error.message;
    console.error('[Paystack verify error]', detail);
    res.status(502).json({ error: 'Failed to verify payment. Please contact support.' });
  }
});

// ─── Paystack Webhook ─────────────────────────────────────────────────────────
// Paystack POSTs to this URL when a payment is finalised server-side.
//
// How to register this URL in Paystack Dashboard:
//   1. Log in → Settings → API Keys & Webhooks
//   2. Paste:  https://imageke-api.onrender.com/api/paystack/webhook
//   3. Save. Paystack will send a test event — respond with 200.
//
// Security: We verify the X-Paystack-Signature header using HMAC-SHA512
// with your secret key. Requests that fail verification are rejected (401).
//
// Currently logs the event. Wire up your DB or fulfilment logic here.
app.post('/api/paystack/webhook', (req, res) => {
  // Step 1: Verify the signature
  const signature = req.headers['x-paystack-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing Paystack signature.' });
  }

  const expectedSig = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(req.rawBody)
    .digest('hex');

  if (signature !== expectedSig) {
    console.warn('[Webhook] Signature mismatch — possible spoofed request.');
    return res.status(401).json({ error: 'Invalid signature.' });
  }

  // Step 2: Acknowledge receipt immediately (Paystack retries if it doesn't get 200 fast)
  res.status(200).json({ received: true });

  // Step 3: Process the event asynchronously after responding
  const event = req.body;
  console.log('[Webhook] Event received:', event.event, '| Ref:', event.data?.reference);

  if (event.event === 'charge.success') {
    const { reference, amount, customer, metadata } = event.data;
    // amount is in kobo — divide by 100 for KES
    console.log(
      `[Webhook] charge.success — ref: ${reference}, KES: ${amount / 100}, email: ${customer?.email}, preset: ${metadata?.preset}`
    );
    // TODO: If you add a database later, mark this reference as paid here.
    // e.g.: db.markPaid(reference, customer.email, metadata.preset);
  }
});

// ─── 404 Catch-all ────────────────────────────────────────────────────────────
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
