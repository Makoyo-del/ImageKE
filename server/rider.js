import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { supabase } from './supabase.js';

dotenv.config();

const router = express.Router();
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Helper: Format phone number to Paystack expectation (2547XXXXXXXX)
const formatPhoneForPaystack = (phone) => {
  let cleaned = phone.replace(/\D/g, ''); // strip non-numeric
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned;
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '254' + cleaned.slice(1);
  }
  if (cleaned.length === 9) {
    return '254' + cleaned;
  }
  return cleaned;
};

// Helper: Ensure user is a rider
const verifyRider = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  // Check if they are in the riders table
  const { data: rider, error: riderErr } = await supabase
    .from('riders')
    .select('id')
    .eq('id', user.id)
    .single();

  if (riderErr || !rider) {
    return res.status(403).json({ error: 'Not authorized as rider' });
  }

  req.user = user;
  next();
};


// ─── POST /api/rider/charge ───
// Initiates an STK Push via Paystack Mobile Money
router.post('/charge', verifyRider, async (req, res) => {
  const { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ error: 'Phone and amount are required' });
  }

  const formattedPhone = formatPhoneForPaystack(phone);

  try {
    // Generate a unique reference
    const reference = `RIDER_${req.user.id}_${Date.now()}`;

    // 1. Log the pending transaction
    const { data: collection, error: dbError } = await supabase
      .from('fare_collections')
      .insert({
        rider_id: req.user.id,
        amount: amount,
        payment_method: 'mpesa',
        status: 'pending',
        passenger_phone: formattedPhone,
        paystack_reference: reference
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Call Paystack Charge API
    // Amount is in KES, Paystack expects subunit (multiply by 100)
    const paystackPayload = {
      email: `duncan@duncanmakoyo.com`, // Default appended email for Paystack
      amount: Math.round(amount * 100),
      currency: 'KES',
      reference: reference,
      mobile_money: {
        phone: formattedPhone,
        provider: 'mpesa'
      }
    };

    const response = await axios.post('https://api.paystack.co/charge', paystackPayload, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, data: response.data, collection });
  } catch (error) {
    console.error('Paystack Charge Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initiate charge', details: error.response?.data });
  }
});


// ─── POST /api/rider/cash ───
// Manually records a cash payment
router.post('/cash', verifyRider, async (req, res) => {
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  try {
    const { data: collection, error } = await supabase
      .from('fare_collections')
      .insert({
        rider_id: req.user.id,
        amount: amount,
        payment_method: 'cash',
        status: 'success'
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, collection });
  } catch (error) {
    console.error('Cash Record Error:', error);
    res.status(500).json({ error: 'Failed to record cash payment' });
  }
});


// ─── POST /api/rider/webhook ───
// Paystack webhook listener
router.post('/webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const rawBody = req.rawBody; // Must be set by express.json middleware in index.js

  if (!signature || !rawBody) {
    return res.status(400).send('Missing signature or raw body');
  }

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');

  if (hash !== signature) {
    return res.status(400).send('Invalid signature');
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const reference = event.data.reference;

    if (reference.startsWith('RIDER_')) {
      // Update fare_collections
      await supabase
        .from('fare_collections')
        .update({ status: 'success' })
        .eq('paystack_reference', reference);
    }
  } else if (event.event === 'charge.failed') {
      const reference = event.data.reference;
      if (reference.startsWith('RIDER_')) {
        await supabase
          .from('fare_collections')
          .update({ status: 'failed' })
          .eq('paystack_reference', reference);
      }
  }

  res.sendStatus(200);
});

export default router;
