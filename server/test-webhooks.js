import crypto from 'crypto';
import axios from 'axios';

// Paystack Test Secret Key (from user)
const PAYSTACK_SECRET = 'sk_test_159516125cd847310d709c442425ef166d09c12e';

// Choose target URL:
// Remote: 'https://imageke-api.onrender.com'
// Local: 'http://localhost:5000'
const TARGET_BASE_URL = process.argv[2] || 'https://imageke-api.onrender.com';

console.log(`Starting Paystack Webhook Simulation tests...`);
console.log(`Targeting Base URL: ${TARGET_BASE_URL}\n`);

// Helper to sign payload
function getSignature(payload, isJsonStringify = false) {
  const body = JSON.stringify(payload);
  return crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(body)
    .digest('hex');
}

// Helper to run a test case
async function runTest(name, path, payload, isJsonStringify = false) {
  const url = `${TARGET_BASE_URL}${path}`;
  const rawBody = JSON.stringify(payload);
  
  // Calculate signature
  const signature = getSignature(payload, isJsonStringify);

  console.log(`[TEST: ${name}] POSTing to ${path}`);
  try {
    const res = await axios.post(url, payload, {
      headers: {
        'x-paystack-signature': signature,
        'Content-Type': 'application/json',
      },
    });
    console.log(`  🟢 Success: Status ${res.status} | Response:`, res.data);
  } catch (err) {
    console.error(`  🔴 Failed: Status ${err.response?.status || 'Error'} | Message:`, err.response?.data || err.message);
  }
  console.log('----------------------------------------------------');
}

async function start() {
  // Test Case 1: ImageKE charge.success webhook
  const chargeSuccessPayload = {
    event: 'charge.success',
    data: {
      reference: 'ref_test_sim_' + Date.now(),
      amount: 340000,
      customer: {
        email: 'duncanmakoyo@gmail.com',
      },
      metadata: {
        preset: 'premium',
      },
    },
  };
  await runTest(
    'ImageKE Webhook (charge.success)',
    '/api/paystack/webhook',
    chargeSuccessPayload,
    false // uses rawBody on the server
  );

  // Test Case 2: HookBunker billing subscription.create webhook
  const subCreatePayload = {
    event: 'subscription.create',
    data: {
      subscription_code: 'SUB_test_code_sim_' + Math.floor(Math.random() * 100000),
      customer: {
        email: 'duncanmakoyo@gmail.com',
      },
    },
  };
  await runTest(
    'HookBunker Billing (subscription.create)',
    '/api/hookbunker/billing/paystack-webhook',
    subCreatePayload,
    true // uses JSON.stringify(req.body) on the server
  );
}

start().catch(console.error);
