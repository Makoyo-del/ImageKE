import express from 'express';
import { supabase } from './supabase.js';
import axios from 'axios';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const workshopLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Oops! We are getting too many requests. Please try again in a few minutes.' },
});

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 registrations per IP per 15 minutes
  message: { error: 'You have made too many registration attempts. Please try again later.' },
});

router.use(workshopLimiter);

// ─── Middleware: Authenticate Mentor ──────────────────────────────────────────
const authenticateMentor = async (req, res, next) => {
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

    // Check if the user is a mentor in profiles
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile || profile.role !== 'mentor') {
      return res.status(403).json({ error: 'Forbidden: Mentor access required.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
};

// ─── Email Helper ─────────────────────────────────────────────────────────────
async function sendEmail({ to, subject, html, scheduledAt }) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || 'duncan@duncanmakoyo.com';

  if (resendKey) {
    try {
      const payload = {
        from: `Duncan Makoyo Workshops <${fromAddress}>`,
        to,
        subject,
        html,
      };
      // Resend scheduled delivery — only add field when a future time is provided
      if (scheduledAt) {
        payload.scheduled_at = scheduledAt;
      }
      await axios.post(
        'https://api.resend.com/emails',
        payload,
        {
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`[Workshop Email] Sent via Resend to ${to}${scheduledAt ? ` (scheduled: ${scheduledAt})` : ''}`);
      return;
    } catch (err) {
      console.error('[Workshop Email Resend Error]', err.response?.data || err.message);
    }
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const { default: nodemailer } = await import('nodemailer');
      const port = parseInt(process.env.SMTP_PORT, 10) || 587;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false },
      });
      await transporter.sendMail({
        from: `"Duncan Makoyo Workshops" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`[Workshop Email] Sent via SMTP to ${to}`);
      return;
    } catch (err) {
      console.error('[Workshop Email SMTP Error]', err.message);
    }
  }

  console.warn('[Workshop Email Warning] No email service configured. Logged to console.');
  console.log(`[EMAIL FALLBACK] TO: ${to} | SUBJECT: ${subject}`);
}


// ─── Route: Get Remaining Early Bird Seats ─────────────────────────────────────
router.get('/early-bird-count', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('workshop_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('ticket_type', 'early_bird')
      .eq('payment_status', 'paid');

    if (error) {
      console.error('[Early Bird Count Error]', error.message);
      return res.status(500).json({ error: 'We could not check seat availability right now.' });
    }

    const maxEarlyBird = 20;
    const remaining = Math.max(0, maxEarlyBird - (count || 0));

    res.json({ success: true, count: count || 0, remaining });
  } catch (err) {
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
});

// ─── Route: Initialize Registration & Payment ──────────────────────────────────
router.post('/initialize', registrationLimiter, async (req, res) => {
  const { full_name, email, phone, ticket_type } = req.body;

  const trimmedName = typeof full_name === 'string' ? full_name.trim() : '';
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
  let requestedTicket = ticket_type === 'early_bird' ? 'early_bird' : 'regular';

  if (!trimmedName) {
    return res.status(400).json({ error: 'Please enter your full name.' });
  }
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!trimmedPhone || trimmedPhone.length < 8) {
    return res.status(400).json({ error: 'Please enter a valid phone number.' });
  }

  try {
    // 1. Double check early bird seat count
    const { count, error: countErr } = await supabase
      .from('workshop_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('ticket_type', 'early_bird')
      .eq('payment_status', 'paid');

    if (countErr) {
      return res.status(500).json({ error: 'We could not verify seat availability at this moment.' });
    }

    const earlyBirdCount = count || 0;
    if (requestedTicket === 'early_bird' && earlyBirdCount >= 20) {
      // Early bird seats are sold out! Force regular ticket.
      requestedTicket = 'regular';
    }

    const priceKES = requestedTicket === 'early_bird' ? 1000 : 1500;
    const reference = `WS-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // 2. Save pending registration record
    const { error: insertErr } = await supabase
      .from('workshop_registrations')
      .insert({
        full_name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        ticket_type: requestedTicket,
        amount_paid: priceKES,
        payment_reference: reference,
        payment_status: 'pending',
      });

    if (insertErr) {
      console.error('[Workshop Insert Pending Error]', insertErr.message);
      return res.status(500).json({ error: 'We could not record your registration. Please try again.' });
    }

    // 3. Initialize Paystack checkout
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return res.status(500).json({ error: 'Our payment system is currently unavailable.' });
    }

    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: trimmedEmail,
        amount: Math.round(priceKES * 100), // convert to kobo
        currency: 'KES',
        reference: reference,
        metadata: {

          type: 'workshop_registration',
          ticket_type: requestedTicket,
          full_name: trimmedName,
          phone: trimmedPhone,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(paystackResponse.data);
  } catch (err) {
    console.error('[Workshop Initialize Payment Error]', err.response?.data || err.message);
    res.status(502).json({ error: 'We could not start the payment process. Please try again.' });
  }
});

// ─── Route: Verify Workshop Payment ───────────────────────────────────────────
router.post('/verify', async (req, res) => {
  const { reference } = req.body;

  if (!reference || !/^WS-[0-9a-zA-Z_-]+$/.test(reference)) {
    return res.status(400).json({ error: 'The payment reference is invalid.' });
  }

  try {
    // 1. Get registration from database
    const { data: registration, error: dbErr } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('payment_reference', reference)
      .maybeSingle();

    if (dbErr || !registration) {
      return res.status(404).json({ error: 'We could not find your registration records. Please try again.' });
    }

    if (registration.payment_status === 'paid') {
      return res.json({ success: true, status: 'paid', data: registration });
    }

    // 2. Call Paystack to verify
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const paystackRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const txData = paystackRes.data?.data;
    if (txData?.status !== 'success') {
      return res.status(400).json({ error: 'Your payment has not been confirmed yet. Please wait a moment or contact support.', status: txData?.status });
    }

    const amountPaid = txData.amount / 100;
    if (amountPaid < registration.amount_paid) {
      return res.status(400).json({ error: 'The payment amount does not match the ticket price.' });
    }

    // 3. Confirm in database
    const { error: updateErr } = await supabase
      .from('workshop_registrations')
      .update({ payment_status: 'paid' })
      .eq('payment_reference', reference);

    if (updateErr) {
      console.error('[Workshop DB Confirm Error]', updateErr.message);
      return res.status(500).json({ error: 'Payment was successful, but we could not update your seat. Please contact support.' });
    }

    // 4. Send Confirmation Email with templates/resources
    await sendConfirmationEmail(registration);

    res.json({ success: true, status: 'paid' });
  } catch (err) {
    console.error('[Workshop Verify Error]', err.response?.data || err.message);
    res.status(502).json({ error: 'We could not verify your payment. Please contact support.' });
  }
});

// ─── Route: Verify Workshop Join Link (Gateway) ──────────────────────────────
router.post('/join-link', async (req, res) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  try {
    const { data: registration, error: dbErr } = await supabase
      .from('workshop_registrations')
      .select('payment_status')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (dbErr || !registration) {
      return res.status(404).json({ error: 'We could not find a ticket for this email address. Please register first.' });
    }

    if (registration.payment_status !== 'paid') {
      return res.status(403).json({ error: 'This email is registered, but the ticket is not paid. Please complete your payment.' });
    }

    // Give them the actual link
    const meetLink = process.env.WORKSHOP_MEETING_LINK || 'https://meet.google.com/gof-rfcr-hno';
    return res.json({ success: true, link: meetLink });

  } catch (err) {
    console.error('[Workshop Join Link Error]', err.message);
    return res.status(500).json({ error: 'An unexpected error occurred while verifying your access.' });
  }
});

// ─── Route: Mentor List Registrations ──────────────────────────────────────────
router.get('/mentor/registrations', authenticateMentor, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workshop_registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to retrieve registrations.' });
    }

    res.json({ success: true, registrations: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Route: Mentor Update Attendance ──────────────────────────────────────────
router.post('/mentor/update-attendance', authenticateMentor, async (req, res) => {
  const { id, attendance_status } = req.body;

  if (!id || !['absent', 'attended'].includes(attendance_status)) {
    return res.status(400).json({ error: 'Invalid parameters.' });
  }

  try {
    const { error } = await supabase
      .from('workshop_registrations')
      .update({ attendance_status })
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to update attendance status.' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Route: Mentor Send Certificate ───────────────────────────────────────────
router.post('/mentor/send-certificate', authenticateMentor, async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Registration ID is required.' });
  }

  try {
    const { data: registration, error: dbErr } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('id', id)
      .single();

    if (dbErr || !registration) {
      return res.status(404).json({ error: 'Registrant not found.' });
    }

    // Send styled certificate email
    await sendCertificateEmail(registration);

    // Update state
    await supabase
      .from('workshop_registrations')
      .update({ certificate_sent: true })
      .eq('id', id);

    res.json({ success: true, message: 'Certificate email dispatched.' });
  } catch (err) {
    console.error('[Send Certificate Error]', err.message);
    res.status(500).json({ error: 'Failed to send certificate.' });
  }
});

// ─── Helper: Send Confirmation Email ─────────────────────────────────────────
export async function sendConfirmationEmail(registration) {
  const gatewayLink = `https://duncanmakoyo.com/#/workshop/join?email=${encodeURIComponent(registration.email)}`;
  const whatsappGroupLink = process.env.WORKSHOP_WHATSAPP_LINK || 'https://chat.whatsapp.com/HhehXfi5reR4RzXOHh3rdo';
  const sessionDate = process.env.WORKSHOP_SESSION_DATE || 'Saturday, 18th July 2026';
  const sessionTime = process.env.WORKSHOP_SESSION_TIME || '2:00 PM EAT';

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 32px; border-bottom: 3px solid #14B8A6;">
        <h2 style="color: #FFFFFF; margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Seat Confirmed! 🚀</h2>
        <p style="color: #5EEAD4; margin: 6px 0 0; font-size: 0.85rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">AI Job Seeker Live Workshop</p>
      </div>
      <div style="padding: 32px; line-height: 1.7; font-size: 0.95rem;">
        <p style="margin-top: 0; font-weight: 600; font-size: 1.05rem;">Hi ${registration.full_name},</p>
        <p style="color: #475569; margin-bottom: 24px;">Your payment of <strong>KES ${registration.amount_paid}</strong> has been verified. You have successfully locked in your seat for the upcoming cohort of the AI Job Seeker Workshop.</p>

        <!-- Google Meet Details -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 10px; color: #0F172A; font-size: 0.95rem;">📅 Event Schedule & Join Link</h4>
          <p style="margin: 0 0 12px; font-size: 0.875rem; color: #475569;">
            <strong>Duration:</strong> 2 Hours Live Training<br/>
            <strong>Platform:</strong> Google Meet<br/>
            <strong>Session Time:</strong> ${sessionDate} at ${sessionTime}
          </p>
          <a href="${gatewayLink}" target="_blank"
            style="display: inline-block; background: #0F172A; color: #ffffff; padding: 10px 20px; border-radius: 6px; font-weight: 700; text-decoration: none; font-size: 0.85rem;">
            Verify Seat & Join Workshop →
          </a>
        </div>

        <!-- WhatsApp Group Onboarding -->
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0 0 8px; font-weight: 700; color: #166534; font-size: 0.95rem;">📱 Step 2: Join the WhatsApp Group</p>
          <p style="margin: 0 0 12px; font-size: 0.85rem; color: #166534;">Join the cohort group for slides, prompts sheets, and workshop notifications.</p>
          <a href="${whatsappGroupLink}" target="_blank"
            style="display: inline-block; background: #22C55E; color: #FFFFFF; padding: 8px 20px; border-radius: 6px; font-weight: 700; text-decoration: none; font-size: 0.85rem;">
            Join WhatsApp Group →
          </a>
        </div>

        <!-- Resources Box -->
        <h4 style="margin: 28px 0 10px; color: #0F172A; font-size: 0.95rem; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">🎁 Your Takeaway Resources</h4>
        <p style="color: #475569; font-size: 0.875rem; margin-bottom: 16px;">Your complete workshop toolkit (including the ATS Master CV Template, AI Prompt Library, and Job Description Matching framework) will be shared directly inside the cohort WhatsApp group as we approach the live session. Make sure you join the group so you don't miss them!</p>

        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
          <p style="margin: 0; font-size: 1rem; font-weight: 700; color: #0F172A;">Duncan Makoyo</p>
          <p style="margin: 4px 0 0; font-size: 0.85rem; color: #4F46E5; font-weight: 600;">Tech Consultant & Career Mentor</p>
        </div>
      </div>
    </div>
  `;

  // Send primary confirmation email
  await sendEmail({
    to: registration.email,
    subject: 'Seat Confirmed: AI Job Seeker Live Workshop!',
    html: emailHtml,
  });

  // Schedule automated reminder emails (Resend-only feature)
  const now = new Date();

  // 1. Schedule 24h reminder (July 17, 2026 09:00:00 EAT -> UTC is 06:00:00)
  const reminder24hTime = new Date('2026-07-17T06:00:00Z');
  if (now < reminder24hTime) {
    await sendEmail({
      to: registration.email,
      subject: 'Reminder: AI Job Seeker Workshop is Tomorrow! 📅',
      html: getReminderEmailHtml(registration, 'tomorrow'),
      scheduledAt: '2026-07-17T06:00:00.000Z'
    });
  }

  // 2. Schedule 1h reminder (July 18, 2026 13:00:00 EAT -> UTC is 10:00:00)
  const reminder1hTime = new Date('2026-07-18T10:00:00Z');
  if (now < reminder1hTime) {
    await sendEmail({
      to: registration.email,
      subject: 'Starting in 1 Hour: Join the AI Job Seeker Live Session! ⏰',
      html: getReminderEmailHtml(registration, '1hour'),
      scheduledAt: '2026-07-18T10:00:00.000Z'
    });
  }
}

// ─── Helper: Generate Reminder Email Body ─────────────────────────────────────
function getReminderEmailHtml(registration, type) {
  const gatewayLink = `https://duncanmakoyo.com/#/workshop/join?email=${encodeURIComponent(registration.email)}`;
  const whatsappGroupLink = process.env.WORKSHOP_WHATSAPP_LINK || 'https://chat.whatsapp.com/HhehXfi5reR4RzXOHh3rdo';
  const sessionDate = process.env.WORKSHOP_SESSION_DATE || 'Saturday, 18th July 2026';
  const sessionTime = process.env.WORKSHOP_SESSION_TIME || '2:00 PM EAT';

  const introText = type === 'tomorrow'
    ? `This is a friendly reminder that the <strong>AI Job Seeker Live Workshop</strong> is happening <strong>tomorrow, ${sessionDate}</strong>.`
    : `We are starting in exactly <strong>1 hour</strong>! Please get ready and click the link below to join the call.`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 32px; border-bottom: 3px solid #14B8A6;">
        <h2 style="color: #FFFFFF; margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Workshop Reminder ⏰</h2>
        <p style="color: #5EEAD4; margin: 6px 0 0; font-size: 0.85rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">AI Job Seeker Live Workshop</p>
      </div>
      <div style="padding: 32px; line-height: 1.7; font-size: 0.95rem;">
        <p style="margin-top: 0; font-weight: 600; font-size: 1.05rem;">Dear ${registration.full_name},</p>
        <p style="color: #475569; margin-bottom: 24px;">${introText}</p>

        <!-- Google Meet Details -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 10px; color: #0F172A; font-size: 0.95rem;">📅 Event Join Details</h4>
          <p style="margin: 0 0 12px; font-size: 0.875rem; color: #475569;">
            <strong>Duration:</strong> 2 Hours Live Training<br/>
            <strong>Platform:</strong> Google Meet<br/>
            <strong>Session Time:</strong> ${sessionDate} at ${sessionTime}
          </p>
          <a href="${gatewayLink}" target="_blank"
            style="display: inline-block; background: #14B8A6; color: #ffffff; padding: 10px 20px; border-radius: 6px; font-weight: 700; text-decoration: none; font-size: 0.85rem;">
            Verify Seat & Join Call →
          </a>
        </div>

        <!-- WhatsApp Reminder -->
        <p style="color: #475569; margin-bottom: 16px;">If you haven't joined the cohort WhatsApp group yet, please do so to receive the prompt sheets and session slides: <a href="${whatsappGroupLink}" style="color: #14B8A6; font-weight: 600; text-decoration: none;">Join WhatsApp Community →</a></p>

        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
          <p style="margin: 0; font-size: 1rem; font-weight: 700; color: #0F172A;">Duncan Makoyo</p>
          <p style="margin: 4px 0 0; font-size: 0.85rem; color: #4F46E5; font-weight: 600;">Tech Consultant & Career Mentor</p>
        </div>
      </div>
    </div>
  `;
}

// ─── Helper: Send Access Email (Resend links if lost) ─────────────────────────
async function sendCertificateEmail(registration) {
  const googleMeetLink = process.env.WORKSHOP_MEETING_LINK || 'https://meet.google.com/gof-rfcr-hno';
  const whatsappGroupLink = process.env.WORKSHOP_WHATSAPP_LINK || 'https://chat.whatsapp.com/HhehXfi5reR4RzXOHh3rdo';
  const sessionDate = process.env.WORKSHOP_SESSION_DATE || 'Saturday, 18th July 2026';
  const sessionTime = process.env.WORKSHOP_SESSION_TIME || '2:00 PM EAT';

  const emailHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1E293B; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 32px; border-bottom: 3px solid #14B8A6;">
        <h2 style="color: #FFFFFF; margin: 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em;">Workshop Access Details 🚀</h2>
        <p style="color: #5EEAD4; margin: 6px 0 0; font-size: 0.85rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">AI Job Seeker Live Workshop</p>
      </div>
      <div style="padding: 32px; line-height: 1.7; font-size: 0.95rem;">
        <p style="margin-top: 0; font-weight: 600; font-size: 1.05rem;">Dear ${registration.full_name},</p>
        <p style="color: #475569; margin-bottom: 24px;">Here are your access details, calendar invitation, and WhatsApp cohort links for the upcoming AI Job Seeker Workshop.</p>

        <!-- Google Meet Details -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 10px; color: #0F172A; font-size: 0.95rem;">📅 Event Schedule & Join Link</h4>
          <p style="margin: 0 0 12px; font-size: 0.875rem; color: #475569;">
            <strong>Duration:</strong> 2 Hours Live Training<br/>
            <strong>Platform:</strong> Google Meet<br/>
            <strong>Session Time:</strong> ${sessionDate} at ${sessionTime}
          </p>
          <a href="${googleMeetLink}" target="_blank"
            style="display: inline-block; background: #0F172A; color: #ffffff; padding: 10px 20px; border-radius: 6px; font-weight: 700; text-decoration: none; font-size: 0.85rem;">
            Join Google Meet Call →
          </a>
        </div>

        <!-- WhatsApp Group Onboarding -->
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0 0 8px; font-weight: 700; color: #166534; font-size: 0.95rem;">📱 Step 2: Join the WhatsApp Group</p>
          <p style="margin: 0 0 12px; font-size: 0.85rem; color: #166534;">Join the cohort group for slides, prompts sheets, and workshop notifications.</p>
          <a href="${whatsappGroupLink}" target="_blank"
            style="display: inline-block; background: #22C55E; color: #FFFFFF; padding: 8px 20px; border-radius: 6px; font-weight: 700; text-decoration: none; font-size: 0.85rem;">
            Join WhatsApp Group →
          </a>
        </div>

        <p style="color: #64748B; font-size: 0.875rem;">Your downloadable workshop toolkit (including the ATS Master CV Template, AI Prompt Library, and Job Description Matching framework) will be shared directly inside the cohort WhatsApp group as we approach the live session.</p>

        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
          <p style="margin: 0; font-size: 1rem; font-weight: 700; color: #0F172A;">Duncan Makoyo</p>
          <p style="margin: 4px 0 0; font-size: 0.85rem; color: #4F46E5; font-weight: 600;">Tech Consultant & Career Mentor</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: registration.email,
    subject: 'Access Details: AI Job Seeker Live Workshop!',
    html: emailHtml,
  });
}


export default router;
