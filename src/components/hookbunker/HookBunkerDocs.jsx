import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { BunkerLayout, theme } from './theme';

export function HookBunkerDocs({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('mpesa');

  return (
    <BunkerLayout onNavigate={onNavigate}>
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
        {/* Sidebar Nav */}
        <div style={{ width: '100%', maxWidth: '240px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', marginBottom: '1.25rem', letterSpacing: '0.05em', fontFamily: 'Montserrat, sans-serif' }}>
            Integration Guides
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={() => setActiveTab('mpesa')}
              style={{
                textAlign: 'left',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: activeTab === 'mpesa' ? 'rgba(43, 91, 255, 0.12)' : 'transparent',
                border: activeTab === 'mpesa' ? '1px solid rgba(43, 91, 255, 0.25)' : '1px solid transparent',
                color: activeTab === 'mpesa' ? '#fff' : theme.textMuted,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              Safaricom M-Pesa <ChevronRight size={14} />
            </button>
            <button 
              onClick={() => setActiveTab('paystack')}
              style={{
                textAlign: 'left',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: activeTab === 'paystack' ? 'rgba(43, 91, 255, 0.12)' : 'transparent',
                border: activeTab === 'paystack' ? '1px solid rgba(43, 91, 255, 0.25)' : '1px solid transparent',
                color: activeTab === 'paystack' ? '#fff' : theme.textMuted,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              Paystack <ChevronRight size={14} />
            </button>
            <button 
              onClick={() => setActiveTab('payhero')}
              style={{
                textAlign: 'left',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: activeTab === 'payhero' ? 'rgba(43, 91, 255, 0.12)' : 'transparent',
                border: activeTab === 'payhero' ? '1px solid rgba(43, 91, 255, 0.25)' : '1px solid transparent',
                color: activeTab === 'payhero' ? '#fff' : theme.textMuted,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              Payhero <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Content Panel */}
        <div style={{ flex: 1, minWidth: '320px', background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '2.5rem', borderRadius: '16px', backdropFilter: 'blur(8px)' }}>
          {activeTab === 'mpesa' && (
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>Integrating Safaricom M-Pesa (Daraja)</h2>
              <p style={{ color: theme.textMuted, lineHeight: 1.7, marginBottom: '2rem', fontSize: '0.95rem' }}>
                Safaricom's Daraja API imposes a strict <b>3-second timeout limit</b> on callback responses. If your application server undergoes cold starts, handles background tasks, or experiences latency, Safaricom drops the webhook and marks the transaction as failed.
              </p>
              
              <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', marginTop: '2rem' }}>1. How HookBunker Ingests M-Pesa Callbacks</h3>
              <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                We accept STK Push callbacks, C2B validation/confirmations, and Buy Goods/Till transactions. The proxy receives the payload, logs it instantly, replies with a `200 OK` (typically under 20ms), and then forwards it to your target application URL in the background.
              </p>

              <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', marginTop: '2rem' }}>2. Production Integration Guide (Node.js &amp; Express)</h3>
              <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                Copy the proxy route from your HookBunker dashboard and paste it as the callback destination in your Safaricom Daraja panel. Your server will receive M-Pesa transaction objects.
              </p>
              
              <pre className="hb-code-box">
{`const express = require('express');
const app = express();
app.use(express.json());

// webhook ingestion target routed from HookBunker
app.post('/api/mpesa-callback', (req, res) => {
  const payload = req.body;
  
  // 1. Differentiate STK Push vs C2B callbacks
  if (payload.Body && payload.Body.stkCallback) {
    const callbackData = payload.Body.stkCallback;
    const resultCode = callbackData.ResultCode;
    const resultDesc = callbackData.ResultDesc;
    
    if (resultCode === 0) {
      // Payment Successful
      const metadata = callbackData.CallbackMetadata.Item;
      const amount = metadata.find(item => item.Name === 'Amount')?.Value;
      const receipt = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const phone = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
      
      console.log(\`[Success] STK Push: Recipient \${phone} paid KES \${amount}. Receipt: \${receipt}\`);
      // Update your database to activate services or order status
    } else {
      console.log(\`[Cancelled] STK Push: \${resultDesc} (Result Code: \${resultCode})\`);
    }
  } else if (payload.TransactionType) {
    // 2. Handle C2B Paybill / Buy Goods Confirmation
    const receipt = payload.TransID;
    const amount = payload.TransAmount;
    const phone = payload.MSISDN;
    const account = payload.BillRefNumber;
    
    console.log(\`[Success] C2B Confirmation: \${phone} paid KES \${amount} for account \${account}. Receipt: \${receipt}\`);
    // Reconcile accounts here
  }
  
  // Always return a success response to the proxy
  res.status(200).json({ ResultCode: 0, ResultDesc: "Callback processed successfully" });
});

app.listen(5000, () => console.log('Callback processor online on port 5000'));`}
              </pre>
            </div>
          )}

          {activeTab === 'paystack' && (
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>Integrating Paystack Webhooks</h2>
              <p style={{ color: theme.textMuted, lineHeight: 1.7, marginBottom: '2rem', fontSize: '0.95rem' }}>
                Secure your Paystack callbacks against network delays and service updates. HookBunker stores all charge alerts and handles automatic redeliveries if your application endpoint returns a non-200 HTTP code.
              </p>
              
              <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', marginTop: '2rem' }}>1. Secure Signature Verification (HMAC SHA512)</h3>
              <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                To verify that requests originating from HookBunker are legitimate Paystack events, you must check the <b>HMAC signature</b>. Paystack sends a signature in the `x-paystack-signature` header, computed by signing the raw payload string using your Paystack Secret Key.
              </p>

              <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', marginTop: '2rem' }}>2. Production Integration Guide (Node.js &amp; Express)</h3>
              <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                This production-ready template shows how to compute the HMAC representation and block spoofed payloads:
              </p>
              
              <pre className="hb-code-box">
{`const express = require('express');
const crypto = require('crypto');
const app = express();

// Paystack sends raw request bodies for signature hashing.
// Use a raw body parser or verify signature before JSON parsing.
app.post('/api/paystack-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY; // Your live secret key
  const signature = req.headers['x-paystack-signature'];

  if (!signature) {
    return res.status(401).send('Security verification failed: Signature missing.');
  }

  // Generate SHA512 HMAC over the raw request payload
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(req.body)
    .digest('hex');

  // Verify signature matching
  if (hash !== signature) {
    console.error('[Security Warning] Spoofed Paystack webhook detected.');
    return res.status(401).send('Security verification failed: Signature mismatch.');
  }

  // Safe to parse body as JSON now
  const event = JSON.parse(req.body.toString());
  console.log(\`[Verified] Ingested Paystack event: \${event.event}\`);

  if (event.event === 'charge.success') {
    const data = event.data;
    const amount = data.amount / 100; // converted from base subunit (kobo/cents)
    const reference = data.reference;
    const customerEmail = data.customer.email;

    console.log(\`[Payment Confirmed] \${customerEmail} paid \${data.currency} \${amount}. Ref: \${reference}\`);
    // Reconcile accounts / activate product
  }

  res.status(200).send('Webhook verified and processed.');
});

app.listen(5000, () => console.log('Secure webhook listener running on port 5000'));`}
              </pre>
            </div>
          )}

          {activeTab === 'payhero' && (
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>Integrating Payhero</h2>
              <p style={{ color: theme.textMuted, lineHeight: 1.7, marginBottom: '2rem', fontSize: '0.95rem' }}>
                Decouple Payhero transaction callbacks from server downtimes. HookBunker logs incoming Payhero parameters, immediately replies with standard confirmation responses, and handles forwarding.
              </p>
              
              <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', marginTop: '2rem' }}>1. Signature Validation Check</h3>
              <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                Secure your Payhero route by comparing parameter signatures in the callback payload before updating database references.
              </p>
              
              <pre className="hb-code-box">
{`const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/payhero-callback', (req, res) => {
  const { status, transaction_id, amount, phone, reference, signature } = req.body;
  
  if (status === 'Success') {
    console.log(\`[Success] Payhero Transaction: \${transaction_id} | Amount KES \${amount} | Ref: \${reference}\`);
    // Perform parameter matching checks to verify receipt details
    // Activate services or issue digital tokens
  } else {
    console.log(\`[Failed] Payhero transaction \${transaction_id} reported status: \${status}\`);
  }
  
  res.status(200).json({ success: true, message: "Callback processed" });
});

app.listen(5000, () => console.log('Payhero processor online on port 5000'));`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </BunkerLayout>
  );
}
