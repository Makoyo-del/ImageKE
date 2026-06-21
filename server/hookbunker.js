import express from 'express';
import { supabase } from './supabase.js';
import axios from 'axios';
import crypto from 'crypto';

const router = express.Router();

// Middleware: Authenticate user using Supabase JWT
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
};

// Resend Email Helper (Self-contained to ensure reliability)
const sendEmail = async ({ to, subject, html }) => {
  if (process.env.RESEND_API_KEY) {
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'alerts@duncanmakoyo.com';
    try {
      await axios.post(
        'https://api.resend.com/emails',
        {
          from: `HookBunker <${fromAddress}>`,
          to,
          subject,
          html,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`[HookBunker Alert] Email sent to ${to}`);
    } catch (err) {
      console.error('[HookBunker Alert Email Error]', err.response?.data || err.message);
    }
  } else {
    console.warn('[HookBunker Alert Warning] RESEND_API_KEY not configured. Email logged to console.');
    console.log(`[EMAIL LOG] TO: ${to} | SUBJECT: ${subject}`);
  }
};

// Helper: Extract transaction parameters
const parsePayload = (payload, gateway) => {
  let transaction_code = null;
  let amount = null;
  let phone = null;
  let email = null;
  let payment_method = null;
  let currency = null;

  try {
    if (gateway === 'mpesa') {
      currency = 'KES';
      const stkCallback = payload.Body?.stkCallback;
      if (stkCallback) {
        transaction_code = stkCallback.CheckoutRequestID;
        payment_method = 'mpesa_stk';
        if (stkCallback.ResultCode === 0) {
          const items = stkCallback.CallbackMetadata?.Item || [];
          const amountItem = items.find(i => i.Name === 'Amount');
          const phoneItem = items.find(i => i.Name === 'PhoneNumber');
          const mpesaReceipt = items.find(i => i.Name === 'MpesaReceiptNumber');
          
          if (amountItem) amount = amountItem.Value;
          if (phoneItem) phone = phoneItem.Value;
          if (mpesaReceipt) transaction_code = mpesaReceipt.Value;
        }
      } else {
        transaction_code = payload.TransID || payload.CheckoutRequestID || null;
        amount = payload.TransAmount || null;
        phone = payload.MSISDN || null;
        
        const txType = payload.TransactionType ? String(payload.TransactionType).toLowerCase() : '';
        if (txType.includes('bill')) {
          payment_method = 'mpesa_paybill';
        } else if (txType.includes('goods') || txType.includes('till')) {
          payment_method = 'mpesa_till';
        } else {
          payment_method = 'mpesa';
        }
      }
    } else if (gateway === 'paystack') {
      const data = payload.data;
      if (data) {
        transaction_code = data.reference;
        amount = data.amount ? data.amount / 100 : null;
        phone = data.customer?.phone || null;
        email = data.customer?.email || null;
        payment_method = data.channel || 'card';
        // Extract actual currency from Paystack payload (KES, NGN, USD, GHS, ZAR, etc.)
        currency = data.currency || 'KES';
      }
    } else if (gateway === 'payhero') {
      currency = 'KES'; // Payhero is Kenya-only
      transaction_code = payload.reference || payload.transaction_id || null;
      amount = payload.amount || null;
      phone = payload.phone || payload.phone_number || null;
      email = payload.email || payload.customer_email || null;
      
      const channel = payload.payment_channel || payload.channel || '';
      const method = payload.payment_method || payload.method || '';
      if (channel.toUpperCase() === 'MPESA') {
        if (method.toUpperCase().includes('PAYBILL')) {
          payment_method = 'mpesa_paybill';
        } else if (method.toUpperCase().includes('BUY') || method.toUpperCase().includes('TILL')) {
          payment_method = 'mpesa_till';
        } else if (method.toUpperCase().includes('STK') || method.toUpperCase().includes('PUSH')) {
          payment_method = 'mpesa_stk';
        } else {
          payment_method = 'mpesa';
        }
      } else {
        payment_method = channel.toLowerCase() || 'payhero';
      }
    } else {
      transaction_code = payload.reference || payload.id || payload.transaction_id || null;
      amount = payload.amount || null;
      phone = payload.phone || payload.customer_phone || null;
      email = payload.email || payload.customer_email || null;
      payment_method = payload.payment_method || payload.method || payload.channel || 'generic';
    }
  } catch (e) {
    console.error('[Payload Parse Error]', e.message);
  }

  return { transaction_code, amount, phone, email, payment_method, currency };
};

// Helper: Async Webhook Forwarding Job
const forwardWebhookAsync = async (webhookId, targetUrl, payload, customHeaders = {}) => {
  const attempt_number = 1;
  const startTime = Date.now();
  let response_status = null;
  let response_body = null;
  let error_message = null;
  let status = 'failed';

  try {
    const response = await axios.post(targetUrl, payload, {
      headers: { 
        'Content-Type': 'application/json',
        ...customHeaders
      },
      timeout: 8000,
    });
    response_status = response.status;
    response_body = typeof response.data === 'object' ? JSON.stringify(response.data) : String(response.data);
    
    if (response.status >= 200 && response.status < 300) {
      status = 'success';
    } else {
      status = 'failed';
    }
  } catch (err) {
    error_message = err.message;
    if (err.response) {
      response_status = err.response.status;
      response_body = typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : String(err.response.data);
    }
  }

  const duration_ms = Date.now() - startTime;

  await supabase.from('deliveries').insert({
    webhook_id: webhookId,
    attempt_number,
    response_status,
    response_body: response_body ? response_body.substring(0, 1000) : null,
    error_message,
    duration_ms,
  });

  await supabase.from('webhooks').update({ status }).eq('id', webhookId);

  if (status === 'failed') {
    const { data: webhook } = await supabase.from('webhooks').select('*, projects(*)').eq('id', webhookId).maybeSingle();
    if (webhook && webhook.projects) {
      const { data: profile } = await supabase.from('profiles').select('email').eq('id', webhook.projects.user_id).maybeSingle();
      if (profile) {
        await sendEmail({
          to: profile.email,
          subject: `[HookBunker] Delivery Failed for Project: ${webhook.projects.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px; background: #0F172A; color: #F8FAFC;">
              <h2 style="color: #EF4444; margin-top: 0;">Webhook Delivery Failed</h2>
              <p>Your project <strong>${webhook.projects.name}</strong> failed to process an incoming payment webhook callback.</p>
              
              <div style="background: #1E293B; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr><td style="color: #94A3B8; padding: 4px 0; width: 120px;">Target URL:</td><td style="font-family: monospace; color: #38BDF8;">${targetUrl}</td></tr>
                  <tr><td style="color: #94A3B8; padding: 4px 0;">Status:</td><td style="color: #F87171; font-weight: bold;">${response_status || 'Network Error'}</td></tr>
                  <tr><td style="color: #94A3B8; padding: 4px 0;">Error:</td><td style="color: #F87171;">${error_message || 'HTTP Error Code'}</td></tr>
                  <tr><td style="color: #94A3B8; padding: 4px 0;">Transaction Ref:</td><td style="font-family: monospace; color: #34D399;">${webhook.transaction_code || '—'}</td></tr>
                </table>
              </div>
              
              <p>HookBunker will automatically retry this delivery according to your plan schedule. You can inspect logs or manually trigger a retry in your dashboard.</p>
              
              <div style="margin-top: 30px; text-align: center;">
                <a href="${process.env.HOOKBUNKER_DASHBOARD_URL || 'https://duncanmakoyo.com/#/hookbunker/dashboard'}" style="background: #10B981; color: #0F172A; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
              </div>
            </div>
          `,
        });
      }
    }
  }
};

// ─── ENDPOINTS ───

// Webhook Ingestion endpoint (public proxy URL)
router.post('/webhooks/:apiKey', async (req, res) => {
  const { apiKey } = req.params;
  const payload = req.body;

  try {
    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('*')
      .eq('api_key', apiKey)
      .maybeSingle();

    if (projError || !project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    if (!project.active) {
      return res.status(403).json({ error: 'Project is inactive.' });
    }

    const gateway = req.query.gateway || (payload.Body?.stkCallback ? 'mpesa' : payload.reference ? 'payhero' : payload.event ? 'paystack' : 'generic');
    const { transaction_code, amount, phone, email, payment_method, currency } = parsePayload(payload, gateway);

    // Extract signature and validation headers to forward
    const forwardHeaders = {};
    for (const [key, val] of Object.entries(req.headers)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.startsWith('x-') || lowerKey === 'authorization') {
        forwardHeaders[key] = val;
      }
    }

    const { data: webhook, error: webError } = await supabase
      .from('webhooks')
      .insert({
        project_id: project.id,
        gateway,
        payload,
        status: 'pending',
        transaction_code,
        amount,
        phone,
        email,
        payment_method,
        currency,
        headers: forwardHeaders,
      })
      .select()
      .single();

    if (webError || !webhook) {
      console.error('[Ingestion Error] Failed to write to DB:', webError);
      return res.status(500).json({ error: 'Database write failed.' });
    }

    res.status(200).json({ status: 'received', id: webhook.id });

    forwardWebhookAsync(webhook.id, project.target_url, payload, forwardHeaders);

  } catch (err) {
    console.error('[Ingestion Crash]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Retry Worker: Triggered via cron-job.org (supports both GET and POST for convenience)
router.all('/jobs/process-retries', async (req, res) => {
  const token = req.query.token || req.headers.authorization?.slice(7);
  const expectedToken = process.env.PING_SECRET || 'local_job_secret_key';

  if (token !== expectedToken) {
    return res.status(403).json({ error: 'Forbidden.' });
  }

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*, projects(*)')
      .eq('status', 'failed')
      .gt('created_at', yesterday);

    if (error) throw error;

    let processedCount = 0;

    for (const webhook of webhooks) {
      const { count, error: countError } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('webhook_id', webhook.id);

      if (countError) continue;

      const maxRetries = 5;
      if (count >= maxRetries) {
        await supabase.from('webhooks').update({ status: 'failed_max_retries' }).eq('id', webhook.id);
        continue;
      }

      processedCount++;
      forwardWebhookAsync(webhook.id, webhook.projects.target_url, webhook.payload, webhook.headers || {});
    }

    res.json({ processed: processedCount });
  } catch (err) {
    console.error('[Retry Job Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Project Listing
router.get('/projects', authenticateUser, async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Project Creation
router.post('/projects', authenticateUser, async (req, res) => {
  // Accept both snake_case (target_url) and camelCase (targetUrl) from the frontend
  const { name } = req.body;
  const target_url = req.body.target_url || req.body.targetUrl;
  if (!name || !target_url) {
    return res.status(400).json({ error: 'Name and target URL are required.' });
  }

  try {
    // 1. Fetch user's profile to get subscription tier
    let { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', req.user.id)
      .maybeSingle();

    if (profError) {
      return res.status(500).json({ error: 'Failed to retrieve subscription profile.' });
    }

    if (!profile) {
      // Auto-create missing profile row
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({ id: req.user.id, email: req.user.email, subscription_tier: 'free', subscription_status: 'active' })
        .select('subscription_tier')
        .maybeSingle();

      if (createError || !newProfile) {
        console.error('Failed to create profile dynamically:', createError?.message);
        return res.status(500).json({ error: 'Failed to initialize subscription profile.' });
      }
      profile = newProfile;
    }

    const tier = profile.subscription_tier || 'free';

    // 2. Fetch user's current project count
    const { count, error: countError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (countError) {
      return res.status(500).json({ error: 'Failed to check project limit.' });
    }

    // 3. Enforce subscription tier project limit constraints
    if (tier === 'free' && count >= 1) {
      return res.status(403).json({ error: 'Free tier is limited to 1 active project. Please upgrade to Team or Business plan to create more.' });
    }
    if (tier === 'team' && count >= 5) {
      return res.status(403).json({ error: 'Team tier is limited to 5 active projects. Please upgrade to Business plan for unlimited projects.' });
    }

    const api_key = crypto.randomBytes(24).toString('hex');

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: req.user.id,
        name,
        target_url,
        api_key,
        active: true,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error('[Project Creation Limit Check Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Project Update (name + target URL)
router.put('/projects/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const target_url = req.body.target_url || req.body.targetUrl;

  if (!name || !target_url) {
    return res.status(400).json({ error: 'Name and target URL are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .update({ name: name.trim(), target_url: target_url.trim() })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Project not found.' });

    res.json(data);
  } catch (err) {
    console.error('[Project Update Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Project Deletion
router.delete('/projects/:id', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  if (data.length === 0) return res.status(404).json({ error: 'Project not found.' });

  res.json({ success: true, message: 'Project deleted successfully.' });
});

// Toggle Project Active Status (Enforces tier limits)
router.patch('/projects/:id/toggle', authenticateUser, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch the project
    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (projError || !project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // 2. Fetch profile to check limits
    let { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', req.user.id)
      .maybeSingle();

    if (profError) {
      return res.status(500).json({ error: 'Failed to retrieve profile.' });
    }

    if (!profile) {
      // Auto-create missing profile row
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({ id: req.user.id, email: req.user.email, subscription_tier: 'free', subscription_status: 'active' })
        .select('subscription_tier')
        .maybeSingle();

      if (createError || !newProfile) {
        console.error('Failed to create profile dynamically:', createError?.message);
        return res.status(500).json({ error: 'Failed to initialize profile.' });
      }
      profile = newProfile;
    }

    const tier = profile.subscription_tier || 'free';
    const limits = { free: 1, team: 5, business: Infinity };
    const limit = limits[tier] || 1;

    // 3. If turning ON, check limits
    if (!project.active) {
      const { count, error: countError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .eq('active', true);

      if (countError) {
        return res.status(500).json({ error: 'Failed to check active project count.' });
      }

      if (count >= limit) {
        return res.status(403).json({ 
          error: `Cannot activate project. Your ${tier.toUpperCase()} tier limit is ${limit} active project(s). Please deactivate an existing project first or upgrade your plan.` 
        });
      }
    }

    // 4. Update the project status
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({ active: !project.active })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json(updatedProject);
  } catch (err) {
    console.error('[Project Toggle Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Project logs
router.get('/projects/:id/logs', authenticateUser, async (req, res) => {
  const { id } = req.params;
  
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (!project) return res.status(404).json({ error: 'Project not found.' });

  const { data: logs, error } = await supabase
    .from('webhooks')
    .select('*, deliveries(*)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });

  // Backend is the source of truth for currency fallbacks
  const enrichedLogs = logs.map(log => ({
    ...log,
    currency: log.currency || (log.gateway === 'mpesa' ? 'KES' : log.gateway === 'payhero' ? 'KES' : 'KES')
  }));

  res.json(enrichedLogs);
});

// Manual retry of single webhook
router.post('/webhooks/:webhookId/retry', authenticateUser, async (req, res) => {
  const { webhookId } = req.params;

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .select('*, projects(*)')
    .eq('id', webhookId)
    .maybeSingle();

  if (error || !webhook) return res.status(404).json({ error: 'Webhook not found.' });
  if (webhook.projects.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  await supabase.from('webhooks').update({ status: 'pending' }).eq('id', webhookId);

  forwardWebhookAsync(webhook.id, webhook.projects.target_url, webhook.payload, webhook.headers || {});

  res.json({ success: true, message: 'Retry initiated.' });
});

// Submit Feedback or Feature Request (Optionally Authenticated)
router.post('/feedback', async (req, res) => {
  const { type, rating, title, content } = req.body;
  if (!type || !content) {
    return res.status(400).json({ error: 'Type and content are required.' });
  }

  let userId = null;
  let email = 'anonymous';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        email = user.email;
      }
    } catch (e) {
      // Fallback
    }
  }

  try {
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        type,
        rating,
        title,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    await sendEmail({
      to: 'duncan@duncanmakoyo.com',
      subject: `[HookBunker] New ${type === 'feature_request' ? 'Feature Request' : type === 'routine_rating' ? `Rating (${rating} Stars)` : 'General Feedback'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px; background: #0F172A; color: #F8FAFC;">
          <h2 style="color: #10B981; margin-top: 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 10px;">
            ${type === 'feature_request' ? 'Feature Request' : 'Product Feedback'}
          </h2>
          <p><strong>From:</strong> ${email}</p>
          ${rating ? `<p><strong>Rating:</strong> ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)</p>` : ''}
          ${title ? `<p><strong>Title:</strong> ${title}</p>` : ''}
          <div style="background: #1E293B; padding: 15px; border-radius: 6px; margin: 20px 0; font-style: italic; line-height: 1.6;">
            "${content}"
          </div>
          <p style="font-size: 12px; color: #94A3B8;">Submitted on ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[Feedback Submission Error]', err.message);
    res.status(500).json({ error: 'Failed to submit feedback.' });
  }
});

// Verify Subscription Payment and Upgrade Profile
router.post('/verify-subscription', authenticateUser, async (req, res) => {
  const { reference } = req.body;
  if (!reference || !/^[a-zA-Z0-9_-]+$/.test(reference)) {
    return res.status(400).json({ error: 'Invalid or missing payment reference.' });
  }

  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const txData = response.data?.data;
    if (txData?.status !== 'success') {
      return res.status(400).json({ error: 'Payment not confirmed by Paystack.', status: txData?.status });
    }

    // Verify transaction timestamp to prevent reference reuse (within 30 minutes)
    if (txData?.paid_at) {
      const paidAt = new Date(txData.paid_at).getTime();
      if (Math.abs(Date.now() - paidAt) > 30 * 60 * 1000) {
        return res.status(403).json({ error: 'Payment reference expired. Verification must happen within 30 minutes.' });
      }
    }

    const { type, tier, userId } = txData.metadata || {};
    if (type !== 'hookbunker_subscription' || userId !== req.user.id) {
      return res.status(400).json({ error: 'Security validation failed: Invalid transaction metadata.' });
    }

    // STRICT SERVER-SIDE PRICING VALIDATION (to prevent developer manipulation of plans)
    const amountPaid = txData.amount / 100; // in cents/kobo -> base currency
    const currency = txData.currency ? String(txData.currency).toUpperCase() : 'KES';
    
    const pricing = {
      team: { USD: 26, KES: 3400 },
      business: { USD: 89, KES: 11500 }
    };

    const planPrices = pricing[tier];
    if (!planPrices) {
      return res.status(400).json({ error: 'Security validation failed: Invalid subscription plan tier.' });
    }

    const expectedAmount = planPrices[currency];

    if (!expectedAmount || amountPaid < expectedAmount) {
      console.error(`[Security Warning] Subscription payment mismatch. Paid: ${amountPaid} ${currency}, Expected: ${expectedAmount || 'none'} ${currency}`);
      return res.status(400).json({ 
        error: `Security validation failed: Payment of ${amountPaid} ${currency} does not match the subscription plan price.`, 
        status: 'failed' 
      });
    }

    // Upgrade profile tier in database (using upsert to avoid missing profile errors)
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: req.user.id,
        email: req.user.email,
        subscription_tier: tier,
        subscription_status: 'active',
        paystack_customer_code: txData.customer?.customer_code || null,
        paystack_subscription_code: txData.subscription || null,
      })
      .select()
      .maybeSingle();

    if (updateError) throw updateError;

    // Send emails asynchronously (fire-and-forget, with error logging)
    const tierFeatures = tier === 'team' 
      ? 'Up to 5 active projects, 25,000 webhooks / month, 14 days retention, 5-minute retry intervals, and Slack + Email alerts.'
      : 'Unlimited active projects, 150,000 webhooks / month, 30 days retention, 1-minute retry intervals, priority queue execution, custom payload filtering, and Slack + SMS + Email alerts.';

    // Developer Receipt Email (plain text/styled without emojis)
    sendEmail({
      to: req.user.email,
      subject: `[HookBunker] Subscription Confirmed - Upgraded to ${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px; background: #0F172A; color: #F8FAFC;">
          <h2 style="color: #10B981; margin-top: 0; border-bottom: 1px solid #1E293B; padding-bottom: 10px;">Subscription Confirmed</h2>
          <p>Thank you for upgrading your HookBunker account! Your subscription is now active.</p>
          
          <div style="background: #1E293B; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="color: #38BDF8; margin-top: 0; font-size: 16px;">Plan Details: ${tier.charAt(0).toUpperCase() + tier.slice(1)}</h3>
            <p style="font-size: 14px; line-height: 1.5; color: #E2E8F0;">
              <strong>Included features:</strong> ${tierFeatures}
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 15px; border-top: 1px solid #334155; padding-top: 10px;">
              <tr><td style="color: #94A3B8; padding: 6px 0;">Transaction Reference:</td><td style="font-family: monospace; color: #34D399; text-align: right;">${reference}</td></tr>
              <tr><td style="color: #94A3B8; padding: 6px 0;">Amount Paid:</td><td style="color: #F8FAFC; font-weight: bold; text-align: right;">${amountPaid} ${currency}</td></tr>
            </table>
          </div>
          
          <p>Your new limits are applied immediately to all your projects.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${process.env.HOOKBUNKER_DASHBOARD_URL || 'https://duncanmakoyo.com/#/hookbunker/dashboard'}" style="background: #10B981; color: #0F172A; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Developer Console</a>
          </div>
        </div>
      `
    }).catch(e => console.error('[Billing Receipt Email Failed]', e));

    // Admin Growth Alert Email (plain text/styled without emojis)
    sendEmail({
      to: 'duncan@duncanmakoyo.com',
      subject: `[HookBunker Growth Alert] New ${tier.charAt(0).toUpperCase() + tier.slice(1)} Subscription Active`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px; background: #0F172A; color: #F8FAFC;">
          <h2 style="color: #10B981; margin-top: 0; border-bottom: 1px solid #1E293B; padding-bottom: 10px;">New Subscription Registered</h2>
          <p>A user has successfully upgraded their subscription plan.</p>
          
          <div style="background: #1E293B; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="color: #94A3B8; padding: 6px 0; width: 150px;">User Email:</td><td style="color: #F8FAFC; font-weight: bold;">${req.user.email}</td></tr>
              <tr><td style="color: #94A3B8; padding: 6px 0;">Plan Tier:</td><td style="color: #38BDF8; font-weight: bold;">${tier.toUpperCase()}</td></tr>
              <tr><td style="color: #94A3B8; padding: 6px 0;">Paid Amount:</td><td style="color: #34D399; font-weight: bold;">${amountPaid} ${currency}</td></tr>
              <tr><td style="color: #94A3B8; padding: 6px 0;">Reference:</td><td style="font-family: monospace; color: #94A3B8;">${reference}</td></tr>
            </table>
          </div>
          
          <p style="font-size: 12px; color: #94A3B8;">Recorded on ${new Date().toISOString()}</p>
        </div>
      `
    }).catch(e => console.error('[Billing Admin Alert Email Failed]', e));

    res.json({ success: true, profile: updatedProfile });
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error('[Subscription Verification Error]', msg);
    res.status(502).json({ error: 'Failed to verify subscription payment. Please contact support.' });
  }
});

// Helper: Enforce active project limits on downgrade (deactivates extra projects, keeping the oldest active)
const enforceProjectLimits = async (userId, tier) => {
  const limits = {
    free: 1,
    team: 5,
    business: Infinity
  };

  const limit = limits[tier] || 1;
  if (limit === Infinity) return;

  try {
    // Fetch user's projects ordered by created_at (keep oldest projects active)
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, active, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error || !projects) return;

    // Count currently active projects
    const currentlyActive = projects.filter(p => p.active);

    if (currentlyActive.length > limit) {
      // Sort active projects by created_at (keep oldest active)
      const sortedActive = [...currentlyActive].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      const toKeepActive = sortedActive.slice(0, limit);
      const toDeactivate = sortedActive.slice(limit);

      const deactivateIds = toDeactivate.map(p => p.id);

      // Only deactivate the excess projects — do NOT force-activate already-suspended projects
      await supabase
        .from('projects')
        .update({ active: false })
        .in('id', deactivateIds);

      console.log(`[Limits Enforced] User ${userId} downgraded to ${tier}. Deactivated ${toDeactivate.length} excess project(s).`);
    }
  } catch (err) {
    console.error('[Error Enforcing Project Limits]', err.message);
  }
};

// HookBunker's own Paystack billing webhook receiver (tracks billing cycles & renewals)
router.post('/billing/paystack-webhook', async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  if (!signature) {
    return res.status(400).json({ error: 'Missing Paystack signature.' });
  }

  // Validate request signature with secret key
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto
    .createHmac('sha512', paystackSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== signature) {
    console.error('[Billing Webhook Security Warning] Invalid Paystack signature.');
    return res.status(400).json({ error: 'Invalid signature.' });
  }

  const { event, data } = req.body;
  console.log(`[Billing Webhook] Received Paystack event: ${event}`);

  try {
    if (event === 'subscription.create' || event === 'subscription.enable') {
      const customerEmail = data.customer?.email;
      const subCode = data.subscription_code;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', customerEmail)
        .maybeSingle();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            paystack_subscription_code: subCode,
          })
          .eq('id', profile.id);
          
        console.log(`[Billing Webhook] Subscription active for ${customerEmail}`);
      }
    } 
    else if (event === 'subscription.disable') {
      const subCode = data.subscription_code;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('paystack_subscription_code', subCode)
        .maybeSingle();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'inactive',
            paystack_subscription_code: null,
          })
          .eq('id', profile.id);

        console.log(`[Billing Webhook] Subscription disabled. Downgraded ${profile.email} to free.`);

        // Enforce project limits immediately on downgrade
        await enforceProjectLimits(profile.id, 'free');

        // Email developer about the cancellation/downgrade
        sendEmail({
          to: profile.email,
          subject: '[HookBunker] Subscription Cancelled',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px; background: #0F172A; color: #F8FAFC;">
              <h2 style="color: #EF4444; margin-top: 0; border-bottom: 1px solid #1E293B; padding-bottom: 10px;">Subscription Cancelled</h2>
              <p>Your premium HookBunker subscription has been disabled. Your account has reverted to the <strong>Developer (Free)</strong> tier limits. Additional active projects have been suspended.</p>
              <p>If this was unintentional, you can re-upgrade at any time from your console dashboard.</p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="${process.env.HOOKBUNKER_DASHBOARD_URL || 'https://duncanmakoyo.com/#/hookbunker/dashboard'}" style="background: #10B981; color: #0F172A; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Billing Panel</a>
              </div>
            </div>
          `
        }).catch(e => console.error('[Billing Webhook Email Error]', e));
      }
    }
    else if (event === 'invoice.payment_failed') {
      const subCode = data.subscription_code;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('paystack_subscription_code', subCode)
        .maybeSingle();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('id', profile.id);

        console.log(`[Billing Webhook] Subscription renewal payment failed for ${profile.email}`);

        // Email developer about failed payment
        sendEmail({
          to: profile.email,
          subject: '[HookBunker] Payment Failed - Renewal Unsuccessful',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px; background: #0F172A; color: #F8FAFC;">
              <h2 style="color: #F59E0B; margin-top: 0; border-bottom: 1px solid #1E293B; padding-bottom: 10px;">Renewal Payment Failed</h2>
              <p>We were unable to process your subscription renewal payment for HookBunker.</p>
              <p>Please update your billing card details on Paystack to avoid plan disruption and downgrades.</p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="${process.env.HOOKBUNKER_DASHBOARD_URL || 'https://duncanmakoyo.com/#/hookbunker/dashboard'}" style="background: #10B981; color: #0F172A; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; display: inline-block;">Update Payment Details</a>
              </div>
            </div>
          `
        }).catch(e => console.error('[Billing Webhook Email Error]', e));
      }
    }
    else if (event === 'invoice.payment_successful' && data.subscription_code) {
      const subCode = data.subscription_code;
      const amountPaid = data.amount / 100;
      const currency = data.currency;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('paystack_subscription_code', subCode)
        .maybeSingle();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
          })
          .eq('id', profile.id);

        console.log(`[Billing Webhook] Subscription renewed successfully for ${profile.email}`);

        // Send a periodic renewal receipt
        sendEmail({
          to: profile.email,
          subject: `[HookBunker] Subscription Renewed - Receipt for ${profile.subscription_tier.toUpperCase()}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E2E8F0; border-radius: 8px; background: #0F172A; color: #F8FAFC;">
              <h2 style="color: #10B981; margin-top: 0; border-bottom: 1px solid #1E293B; padding-bottom: 10px;">Subscription Renewed</h2>
              <p>Your recurring subscription renewal payment has been successfully processed. Thank you for your continued support!</p>
              
              <div style="background: #1E293B; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h3 style="color: #38BDF8; margin-top: 0; font-size: 16px;">Invoice Details</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr><td style="color: #94A3B8; padding: 6px 0;">Billing Plan:</td><td style="color: #F8FAFC; font-weight: bold; text-align: right;">${profile.subscription_tier.toUpperCase()}</td></tr>
                  <tr><td style="color: #94A3B8; padding: 6px 0;">Amount Charged:</td><td style="color: #34D399; font-weight: bold; text-align: right;">${amountPaid} ${currency}</td></tr>
                  <tr><td style="color: #94A3B8; padding: 6px 0;">Subscription ID:</td><td style="font-family: monospace; color: #94A3B8; text-align: right;">${subCode}</td></tr>
                </table>
              </div>
            </div>
          `
        }).catch(e => console.error('[Billing Webhook Email Error]', e));
      }
    }

    res.json({ status: 'processed' });
  } catch (err) {
    console.error('[Billing Webhook Error]', err.message);
    res.status(500).json({ error: 'Internal server error processing webhook.' });
  }
});

export default router;
