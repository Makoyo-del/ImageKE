import express from 'express';
import { supabase, supabaseAnon } from './supabase.js';
import axios from 'axios';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// ─── Rate Limiter for Academy API ─────────────────────────────────────────────
const academyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Strict Rate Limiter for Auth endpoints (Login & Register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 login/register requests per IP in 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login or registration attempts. Please try again in 15 minutes.' },
});

router.use(academyLimiter);

// ─── Middleware: Authenticate User via Supabase JWT ───────────────────────────
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

// ─── Resend/SMTP Email Helper ──────────────────────────────────────────────────
async function sendEmail({ to, subject, html }) {
  // Option 1: Resend API
  if (process.env.RESEND_API_KEY) {
    const fromAddress = process.env.ACADEMY_EMAIL_FROM || 'duncan@duncanmakoyo.com';
    try {
      await axios.post(
        'https://api.resend.com/emails',
        {
          from: `Duncan Makoyo Academy <${fromAddress}>`,
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
      console.log(`[Academy Email] Sent via Resend to ${to}`);
      return;
    } catch (err) {
      console.error('[Academy Email Resend Error]', err.response?.data || err.message);
    }
  }

  // Option 2: SMTP / nodemailer (if configured)
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
        from: `"Duncan Makoyo Academy" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`[Academy Email] Sent via SMTP to ${to}`);
      return;
    } catch (err) {
      console.error('[Academy Email SMTP Error]', err.message);
    }
  }

  // Fallback: Console Log
  console.warn('[Academy Email Warning] No email service configured. Logged to console.');
  console.log(`[EMAIL FALLBACK] TO: ${to} | SUBJECT: ${subject}`);
}

// ─── Route: Register Academy Account (Backend-controlled, no Supabase email) ──
// Using admin API so Supabase does NOT send its own branded email.
// We send our own Academy-branded welcome email via Resend instead.
router.post('/register', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  const trimmedEmail = typeof email === 'string' ? email.trim() : '';
  const trimmedPassword = typeof password === 'string' ? password : '';

  if (!trimmedEmail || trimmedEmail.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({ error: 'A valid email address is required (max 255 characters).' });
  }
  if (!trimmedPassword || trimmedPassword.length < 8 || trimmedPassword.length > 72) {
    return res.status(400).json({ error: 'Password must be between 8 and 72 characters.' });
  }

  try {
    // Create user via Admin API — email_confirm: true skips Supabase's own email
    const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
      email: trimmedEmail.toLowerCase(),
      password: trimmedPassword,
      email_confirm: true, // Mark as confirmed — we handle our own email
      user_metadata: { product: 'academy' },
    });

    if (createErr) {
      // Supabase returns "User already registered" for duplicate emails
      if (createErr.message?.toLowerCase().includes('already registered') ||
          createErr.message?.toLowerCase().includes('already exists')) {
        return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      }
      console.error('[Academy Register Error]', createErr.message);
      return res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }

    // 1. Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // 2. Update profiles table with verification data and academy access
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        academy_email_verified: false,
        academy_verification_token: verificationToken,
        academy_verification_expires: expiresAt,
        academy_access: true
      })
      .eq('id', userData.user.id);

    if (profileErr) {
      console.error('[Academy Register Profile Update Error]', profileErr.message);
      // Non-critical, let registration pass, they can verify by resending on login
    }

    const academyDashboardUrl = process.env.ACADEMY_DASHBOARD_URL || 'https://duncanmakoyo.com/#/academy/dashboard';
    const verifyLink = `${academyDashboardUrl.split('#')[0]}?verify_token=${verificationToken}#/academy`;

    await sendEmail({
      to: email.trim().toLowerCase(),
      subject: 'Verify Your Career Academy Email',
      html: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111111; background: #F4F4EE; border: 2px solid #111111; overflow: hidden; padding: 0;">
          <div style="background: #111111; padding: 24px 32px; border-bottom: 2px solid #111111;">
            <h2 style="color: #F4F4EE; margin: 0; font-size: 1.4rem; font-family: Georgia, serif; font-weight: 700;">Career Academy</h2>
            <p style="color: #D61A3C; margin: 6px 0 0; font-family: Arial, sans-serif; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;">// Confirm Registration</p>
          </div>
          <div style="padding: 32px; line-height: 1.7; font-size: 0.95rem; font-family: Arial, sans-serif;">
            <p style="margin-top: 0; font-weight: 800; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.05em; color: #111111;">Welcome aboard,</p>
            <p style="color: #333333; margin-bottom: 24px;">Your <strong>Duncan Makoyo Career Academy</strong> account has been created for <strong>${email}</strong>. To complete registration, please verify your email address by clicking the button below.</p>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${verifyLink}" target="_blank"
                style="display: inline-block; background: #D61A3C; color: #ffffff; padding: 12px 32px; border: 2px solid #111111; font-weight: 800; text-decoration: none; font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase;">
                Verify Email Address
              </a>
            </div>

            <p style="color: #555555; font-size: 0.85rem;">Once verified, you will see the enrollment options for the <strong>6-Week AI &amp; Data Career Accelerator</strong>. This link is valid for 24 hours.</p>

            <div style="margin-top: 32px; padding-top: 20px; border-top: 2px solid #111111;">
              <p style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #111111; text-transform: uppercase; letter-spacing: 0.05em;">Duncan Makoyo</p>
              <p style="margin: 4px 0 0; font-size: 0.75rem; color: #D61A3C; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Tech Consultant &amp; Career Mentor</p>
            </div>
          </div>
        </div>`,
    });

    console.log(`[Academy Register] Account created for ${email}`);
    res.json({ success: true, message: 'Account created. Please check your inbox to verify your email.' });
  } catch (err) {
    console.error('[Academy Register Unexpected Error]', err.message);
    res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
});

// ─── Route: Login Academy Account (Backend-evaluated) ───────────────────────
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  const trimmedEmail = typeof email === 'string' ? email.trim() : '';
  const trimmedPassword = typeof password === 'string' ? password : '';

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!trimmedPassword) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  try {
    // Authenticate user credentials via supabaseAnon
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: trimmedEmail.toLowerCase(),
      password: trimmedPassword,
    });

    if (error) {
      console.warn('[Academy Login Fail]', trimmedEmail, error.message);
      let msg = error.message;
      if (msg.toLowerCase().includes('invalid login credentials')) {
        msg = 'Incorrect email or password. Please verify your credentials.';
      }
      return res.status(401).json({ error: msg });
    }

    // Verify user has academy_access set to true in profiles
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('academy_access')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile || !profile.academy_access) {
      console.warn('[Academy Login Forbidden - No Access]', trimmedEmail);
      return res.status(403).json({ error: 'Access denied. This account does not have Academy access.' });
    }

    res.json({ success: true, session: data.session });
  } catch (err) {
    console.error('[Academy Login Unexpected Error]', err.message);
    res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
});

// ─── Route: Verify Custom Email Token ─────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Verification token is required.' });
  }

  try {
    // Find profile by token and check expiration
    const { data: profile, error: findErr } = await supabase
      .from('profiles')
      .select('id, email, academy_verification_expires')
      .eq('academy_verification_token', token)
      .maybeSingle();

    if (findErr || !profile) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    const expiresAt = new Date(profile.academy_verification_expires).getTime();
    if (Date.now() > expiresAt) {
      return res.status(400).json({ error: 'Verification token has expired. Please log in to request a new link.' });
    }

    // Update profile to verified
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        academy_email_verified: true,
        academy_verification_token: null,
        academy_verification_expires: null
      })
      .eq('id', profile.id);

    if (updateErr) {
      return res.status(500).json({ error: 'Failed to verify email address.' });
    }

    res.json({ success: true, email: profile.email });
  } catch (err) {
    console.error('[Verify Email Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Route: Resend Verification Email ────────────────────────────────────────
router.post('/resend-verification', authenticateUser, async (req, res) => {
  const email = req.user.email;
  const userId = req.user.id;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('academy_email_verified')
      .eq('id', userId)
      .single();

    if (profile?.academy_email_verified) {
      return res.status(400).json({ error: 'Email address is already verified.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('profiles')
      .update({
        academy_verification_token: verificationToken,
        academy_verification_expires: expiresAt
      })
      .eq('id', userId);

    const academyDashboardUrl = process.env.ACADEMY_DASHBOARD_URL || 'https://duncanmakoyo.com/#/academy/dashboard';
    const verifyLink = `${academyDashboardUrl.split('#')[0]}?verify_token=${verificationToken}#/academy`;

    await sendEmail({
      to: email,
      subject: 'Verify Your Academy Email Address',
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111111; background: #F4F4EE; border: 2px solid #111111; overflow: hidden; padding: 0;">
          <div style="background: #111111; padding: 24px 32px; border-bottom: 2px solid #111111;">
            <h2 style="color: #F4F4EE; margin: 0; font-size: 1.4rem; font-family: Georgia, serif; font-weight: 700;">Career Academy</h2>
            <p style="color: #D61A3C; margin: 6px 0 0; font-family: Arial, sans-serif; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;">// Verify Your Email</p>
          </div>
          <div style="padding: 32px; line-height: 1.7; font-size: 0.95rem; font-family: Arial, sans-serif;">
            <p style="margin-top: 0; font-weight: 800; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.05em; color: #111111;">Hi there,</p>
            <p style="color: #333333; margin-bottom: 24px;">Please confirm your email address to complete registration and unlock your Duncan Makoyo Career Academy portal.</p>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${verifyLink}" target="_blank"
                style="display: inline-block; background: #D61A3C; color: #ffffff; padding: 12px 32px; border: 2px solid #111111; font-weight: 800; text-decoration: none; font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #555555; font-size: 0.85rem;">This link is valid for 24 hours. If you did not request this, you can safely ignore this email.</p>
          </div>
        </div>
      `
    });

    res.json({ success: true, message: 'Verification email sent.' });
  } catch (err) {
    console.error('[Resend Verification Error]', err.message);
    res.status(500).json({ error: 'Failed to resend verification email.' });
  }
});

// ─── Route: Update Live Call Details (Mentor Only) ───────────────────────────
router.post('/mentor/meeting', authenticateUser, async (req, res) => {
  const { link, time } = req.body;
  const userId = req.user.id;

  const trimmedLink = typeof link === 'string' ? link.trim() : '';
  const trimmedTime = typeof time === 'string' ? time.trim() : '';

  if (!trimmedLink) {
    return res.status(400).json({ error: 'Google Meet link is required.' });
  }
  if (!trimmedTime) {
    return res.status(400).json({ error: 'Session time / schedule is required.' });
  }

  // Validate URL format
  let isValidUrl = false;
  try {
    const urlObj = new URL(trimmedLink);
    isValidUrl = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (e) {
    isValidUrl = false;
  }

  if (!isValidUrl) {
    return res.status(400).json({ error: 'Please enter a valid URL (e.g., https://meet.google.com/abc-defg-hij).' });
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || profile.role !== 'mentor') {
      return res.status(403).json({ error: 'Forbidden: Mentor only route.' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        meeting_link: trimmedLink,
        meeting_time: trimmedTime,
      })
      .eq('id', userId);

    if (error) {
      console.error('[Mentor Update Meeting Error]', error.message);
      return res.status(500).json({ error: 'Failed to update meeting details.' });
    }

    res.json({ success: true, link: trimmedLink, time: trimmedTime });
  } catch (err) {
    console.error('[Mentor Meeting Router Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Route: Get Dashboard Data ────────────────────────────────────────────────
router.get('/dashboard', authenticateUser, async (req, res) => {
  const email = req.user.email;
  const userId = req.user.id;

  const adminEmails = ['duncanmakoyo@gmail.com', 'makoyoduncan@gmail.com'];
  const isAdmin = adminEmails.includes(email.toLowerCase());

  try {
    // 1. Get or create student/mentor profile
    let { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role, academy_status, academy_access, academy_email_verified, academy_expires_at, meeting_link, meeting_time')
      .eq('id', userId)
      .single();

    if (profileErr || !profile) {
      // Auto-insert profile row if missing (set default active role for admins)
      const defaultRole = isAdmin ? 'mentor' : 'student';
      const defaultStatus = isAdmin ? 'active' : 'inactive';
      const { data: newProfile, error: insertErr } = await supabase
        .from('profiles')
        .insert({ 
          id: userId, 
          email, 
          role: defaultRole, 
          academy_status: defaultStatus,
          academy_access: isAdmin,
          hookbunker_access: isAdmin,
          academy_email_verified: isAdmin
        })
        .select('role, academy_status, academy_access, academy_email_verified, academy_expires_at, meeting_link, meeting_time')
        .single();

      if (insertErr) {
        console.error('[Dashboard Error] Failed to create user profile:', insertErr);
        return res.status(500).json({ error: 'Failed to retrieve profile.' });
      }
      profile = newProfile;
    } else if (isAdmin && (profile.role !== 'mentor' || profile.academy_status !== 'active' || !profile.academy_access)) {
      // Auto-upgrade existing admin if they don't have mentor/active/academy status yet
      const { data: updatedProfile, error: updErr } = await supabase
        .from('profiles')
        .update({ 
          role: 'mentor', 
          academy_status: 'active',
          academy_access: true,
          hookbunker_access: true,
          academy_email_verified: true
        })
        .eq('id', userId)
        .select('role, academy_status, academy_access, academy_email_verified, academy_expires_at, meeting_link, meeting_time')
        .single();
      if (!updErr && updatedProfile) {
        profile = updatedProfile;
      }
    }

    // Check plan expiration for students
    if (profile.role === 'student' && profile.academy_expires_at && new Date() > new Date(profile.academy_expires_at)) {
      const { error: expErr } = await supabase
        .from('profiles')
        .update({ academy_status: 'inactive' })
        .eq('id', userId);
      if (!expErr) {
        profile.academy_status = 'inactive';
      }
    }

    const { role, academy_status, academy_email_verified } = profile;

    // 2. Return data depending on role
    if (role === 'mentor') {
      // Mentor view: all students, submissions, and broadcasts
      const { data: students, error: stdErr } = await supabase
        .from('profiles')
        .select('id, email, academy_status, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      const { data: deliverables, error: delErr } = await supabase
        .from('academy_deliverables')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: broadcasts, error: brdErr } = await supabase
        .from('academy_broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (stdErr || delErr || brdErr) {
        return res.status(500).json({ error: 'Failed to retrieve mentor dashboard data.' });
      }

      return res.json({
        role: 'mentor',
        data: {
          students: students || [],
          deliverables: deliverables || [],
          broadcasts: broadcasts || [],
          meeting: {
            link: profile.meeting_link || '',
            time: profile.meeting_time || '',
          }
        },
      });
    } else {
      // Student view

      // Gating 1: Email verification (admins bypass)
      if (!academy_email_verified) {
        return res.json({
          role: 'student',
          status: 'unverified',
          data: { email }
        });
      }

      // Gating 2: Payment status
      if (academy_status !== 'active') {
        return res.json({
          role: 'student',
          status: 'inactive',
          data: { email },
        });
      }

      // Fetch active student specific data
      const { data: deliverables, error: delErr } = await supabase
        .from('academy_deliverables')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false });

      const { data: broadcasts, error: brdErr } = await supabase
        .from('academy_broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (delErr || brdErr) {
        return res.status(500).json({ error: 'Failed to retrieve student dashboard data.' });
      }

      // Retrieve the meeting details from the mentor profile
      const { data: mentorProfile } = await supabase
        .from('profiles')
        .select('meeting_link, meeting_time')
        .eq('role', 'mentor')
        .maybeSingle();

      return res.json({
        role: 'student',
        status: 'active',
        data: {
          deliverables: deliverables || [],
          broadcasts: broadcasts || [],
          meeting: {
            link: mentorProfile?.meeting_link || '',
            time: mentorProfile?.meeting_time || '',
          }
        },
      });
    }
  } catch (err) {
    console.error('[Academy Dashboard GET Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Route: Submit Deliverable (Student) ──────────────────────────────────────
// ─── Route: Verify Academy Payment & Activate Status ──────────────────────────
router.post('/verify-payment', authenticateUser, async (req, res) => {
  const { reference } = req.body;
  const userId = req.user.id;

  if (!reference || !/^[a-zA-Z0-9_-]+$/.test(reference)) {
    return res.status(400).json({ error: 'Invalid payment reference.' });
  }

  try {
    // 1. Check for duplicate reference usage to prevent replay attacks
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_payment_reference, email')
      .eq('id', userId)
      .single();

    if (profile?.last_payment_reference === reference) {
      return res.status(409).json({ error: 'This payment reference has already been used.' });
    }

    // 2. Call Paystack API to verify the transaction
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return res.status(500).json({ error: 'Paystack is not configured on the server.' });
    }

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

    // 3. Verify timestamp (within 24 hours)
    if (txData?.paid_at) {
      const paidAt = new Date(txData.paid_at).getTime();
      if (Math.abs(Date.now() - paidAt) > 24 * 60 * 60 * 1000) {
        return res.status(403).json({ error: 'Payment reference expired. Verification must happen within 24 hours.' });
      }
    }

    // 4. Verify transaction amount matches pricing
    const amountPaid = txData?.amount / 100; // kobo -> KES
    const type = txData?.metadata?.type;
    const pkg = txData?.metadata?.package;

    if (type !== 'academy_subscription') {
      return res.status(400).json({ error: 'Transaction is not for an Academy subscription.' });
    }

    const expectedAmount = pkg === 'membership' ? 1500 : 10000;
    if (amountPaid < expectedAmount) {
      return res.status(400).json({ error: 'Paid amount is less than package pricing.' });
    }

    // 5. Update profile status and expiration in database
    const expiresAt = pkg === 'membership'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      : null; // Lifetime for cohort

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        academy_status: 'active',
        academy_access: true,
        academy_email_verified: true,
        academy_expires_at: expiresAt,
        last_payment_reference: reference,
      })
      .eq('id', userId);

    if (updateErr) {
      console.error('[Verify Payment Database Error]', updateErr.message);
      return res.status(500).json({ error: 'Failed to update student profile.' });
    }

    // 6. Send automated onboarding email with secure WhatsApp Community link
    const whatsappCommunityLink = process.env.ACADEMY_WHATSAPP_LINK || 'https://chat.whatsapp.com/mock-academy-link';
    const academyDashboardUrl = process.env.ACADEMY_DASHBOARD_URL || 'https://duncanmakoyo.com/#/academy/dashboard';
    
    const emailHtml = `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111111; background: #F4F4EE; border: 2px solid #111111; overflow: hidden; padding: 0;">
        <div style="background: #111111; padding: 32px; border-bottom: 2px solid #111111;">
          <h2 style="color: #F4F4EE; margin: 0; font-size: 1.5rem; font-family: Georgia, serif; font-weight: 700;">Welcome to the Accelerator!</h2>
          <p style="color: #D61A3C; margin: 6px 0 0; font-family: Arial, sans-serif; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;">// Academy Access Activated</p>
        </div>
        <div style="padding: 32px; line-height: 1.7; font-size: 0.95rem; font-family: Arial, sans-serif;">
          <p style="margin-top: 0; margin-bottom: 16px; font-weight: 800; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.05em; color: #111111;">Hi there,</p>
          <p style="margin-bottom: 20px; color: #333333;">Congratulations! Your payment for the <strong>AI &amp; Data Career Accelerator</strong> has been confirmed, and your academy dashboard is now unlocked.</p>
          
          <div style="background: #FFFFFF; border: 2px solid #111111; padding: 20px; margin-bottom: 24px; text-align: center;">
            <p style="margin: 0 0 12px; font-weight: 800; color: #111111; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em;">Step 1: Join the Paid WhatsApp Community</p>
            <p style="margin: 0 0 16px; font-size: 0.85rem; color: #555555;">Click the button below to join the members-only WhatsApp group for direct chat, support, and announcements.</p>
            <a href="${whatsappCommunityLink}" target="_blank" style="display: inline-block; background: #25D366; color: #FFFFFF; padding: 10px 24px; border: 2px solid #111111; font-weight: 800; text-decoration: none; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em;">Join WhatsApp Community →</a>
          </div>

          <p style="margin-bottom: 12px; font-weight: 800; color: #111111; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem;">Step 2: Access Your Dashboard</p>
          <p style="margin-bottom: 24px; color: #333333;">Log in to your account at <a href="${academyDashboardUrl}" style="color: #D61A3C; font-weight: 700; text-decoration: none;">your dashboard</a> to view your active Sprints, download templates, and submit your weekly deliverables for review.</p>

          <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #111111;">
            <p style="margin: 0; font-size: 0.95rem; font-weight: 800; color: #111111; text-transform: uppercase; letter-spacing: 0.05em;">Duncan Makoyo</p>
            <p style="margin: 4px 0; font-size: 0.75rem; color: #D61A3C; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Tech Consultant &amp; Mentor</p>
          </div>
        </div>
      </div>
    `;

    await sendEmail({
      to: profile?.email || req.user.email,
      subject: 'Welcome to the AI & Data Career Accelerator!',
      html: emailHtml,
    });

    res.json({ success: true, status: 'active' });
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    console.error('[Verify Academy Payment Error]', detail, err.response?.data);
    res.status(502).json({ error: `Failed to verify payment reference: ${detail}` });
  }
});

router.post('/submit-deliverable', authenticateUser, async (req, res) => {
  const { module_id, link, notes } = req.body;
  const userId = req.user.id;

  if (!module_id || !link || typeof link !== 'string' || !/^https?:\/\//i.test(link)) {
    return res.status(400).json({ error: 'A valid URL link is required.' });
  }

  try {
    // Verify user is an active student
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('academy_status')
      .eq('id', userId)
      .single();

    if (profileErr || !profile || profile.academy_status !== 'active') {
      return res.status(403).json({ error: 'Access denied: Must be an active student.' });
    }

    const { data, error } = await supabase
      .from('academy_deliverables')
      .insert({
        student_id: userId,
        module_id,
        link,
        notes: notes || '',
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Submit Deliverable Error]', error.message);
      return res.status(500).json({ error: 'Failed to submit deliverable.' });
    }

    // Email alert to mentor
    await sendEmail({
      to: 'duncan@duncanmakoyo.com',
      subject: `[Academy Submission] ${req.user.email} submitted ${module_id}`,
      html: `<p>A student has submitted a new deliverable for review:</p>
             <p><strong>Student:</strong> ${req.user.email}</p>
             <p><strong>Module:</strong> ${module_id}</p>
             <p><strong>Link:</strong> <a href="${link}">${link}</a></p>
             <p><strong>Notes:</strong> ${notes || 'None'}</p>`
    });

    res.json(data);
  } catch (err) {
    console.error('[Submit Deliverable Router Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Route: Submit Feedback / Feature Request (Student) ───────────────────────
router.post('/feedback', authenticateUser, async (req, res) => {
  const { type, message } = req.body;
  const userId = req.user.id;

  if (!type || !['feedback', 'feature_request'].includes(type) || !message || message.trim().length < 5) {
    return res.status(400).json({ error: 'Valid type and message are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('academy_feedback')
      .insert({
        student_id: userId,
        type,
        message,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Submit Feedback Error]', error.message);
      return res.status(500).json({ error: 'Failed to save feedback.' });
    }

    // Email to mentor
    const subjectLabel = type === 'feature_request' ? 'Feature Request' : 'Feedback';
    await sendEmail({
      to: 'duncan@duncanmakoyo.com',
      subject: `[Academy] New ${subjectLabel} from ${req.user.email}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <h2>New ${subjectLabel} Received</h2>
              <p><strong>User:</strong> ${req.user.email}</p>
              <p><strong>Submission details:</strong></p>
              <blockquote style="border-left:4px solid #14B8A6;padding-left:1rem;font-style:italic">
                ${message.replace(/\n/g, '<br/>')}
              </blockquote>
             </div>`
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[Feedback Router Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Route: Mentor Grade/Review Student Submission ────────────────────────────
router.post('/mentor/review', authenticateUser, async (req, res) => {
  const { deliverable_id, feedback, status } = req.body;
  const userId = req.user.id;

  if (!deliverable_id || !status || !['pending', 'reviewed'].includes(status) || !feedback) {
    return res.status(400).json({ error: 'Deliverable ID, feedback, and status are required.' });
  }

  try {
    // 1. Verify user is mentor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || profile.role !== 'mentor') {
      return res.status(403).json({ error: 'Forbidden: Mentor only route.' });
    }

    // 2. Update deliverable
    const { data: deliverable, error: delErr } = await supabase
      .from('academy_deliverables')
      .update({
        status,
        feedback,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', deliverable_id)
      .select('*')
      .single();

    if (delErr || !deliverable) {
      console.error('[Mentor Review Update Error]', delErr?.message);
      return res.status(500).json({ error: 'Failed to update deliverable.' });
    }

    // 3. Find student email to send notification
    const { data: student } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', deliverable.student_id)
      .single();

    if (student) {
      const academyDashboardUrl = process.env.ACADEMY_DASHBOARD_URL || 'https://duncanmakoyo.com/#/academy/dashboard';
      await sendEmail({
        to: student.email,
        subject: `[Academy Feedback] Your submission for ${deliverable.module_id} has been reviewed!`,
        html: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111111; background: #F4F4EE; border: 2px solid #111111; padding: 32px; line-height: 1.7;">
                <h2 style="color: #111111; font-family: Georgia, serif; border-bottom: 2px solid #111111; padding-bottom: 0.5rem; font-weight: 700;">Your submission is reviewed</h2>
                <p style="font-family: Arial, sans-serif;">Hi there,</p>
                <p style="font-family: Arial, sans-serif;">Duncan has reviewed your deliverable for <strong>${deliverable.module_id}</strong>.</p>
                <p style="font-family: Arial, sans-serif; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem; margin-bottom: 0.5rem;">Feedback:</p>
                <div style="background: #FFFFFF; padding: 1.5rem; border-left: 4px solid #D61A3C; margin: 1.5rem 0; border: 2px solid #111111; border-left: 4px solid #D61A3C; font-family: Arial, sans-serif;">
                  ${feedback.replace(/\n/g, '<br/>')}
                </div>
                <p style="font-family: Arial, sans-serif;">Go to your <a href="${academyDashboardUrl}" style="color: #D61A3C; font-weight: 700; text-decoration: none;">your dashboard</a> to view this and submit the next module.</p>
               </div>`
      });
    }

    res.json(deliverable);
  } catch (err) {
    console.error('[Mentor Review Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Route: Mentor Broadcast Announcement (Save & Email Students) ────────────
router.post('/mentor/broadcast', authenticateUser, async (req, res) => {
  const { subject, content } = req.body;
  const userId = req.user.id;

  if (!subject || !content || subject.trim().length < 3 || content.trim().length < 5) {
    return res.status(400).json({ error: 'Subject and content are required.' });
  }

  try {
    // 1. Verify user is mentor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || profile.role !== 'mentor') {
      return res.status(403).json({ error: 'Forbidden: Mentor only route.' });
    }

    // 2. Insert into broadcasts table
    const { data: broadcast, error: brdErr } = await supabase
      .from('academy_broadcasts')
      .insert({
        mentor_id: userId,
        subject,
        content,
      })
      .select('*')
      .single();

    if (brdErr) {
      console.error('[Mentor Broadcast insert error]', brdErr.message);
      return res.status(500).json({ error: 'Failed to save announcement.' });
    }

    // 3. Fetch all active students
    const { data: activeStudents, error: stdErr } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'student')
      .eq('academy_access', true)
      .eq('academy_status', 'active');

    if (stdErr) {
      console.error('[Mentor Broadcast students retrieval error]', stdErr.message);
      return res.status(500).json({ error: 'Failed to retrieve active student list.' });
    }

    // 4. Send emails to all active students in parallel using Resend
    if (activeStudents && activeStudents.length > 0) {
      const academyDashboardUrl = process.env.ACADEMY_DASHBOARD_URL || 'https://duncanmakoyo.com/#/academy/dashboard';
      const emailPromises = activeStudents.map(student => {
        return sendEmail({
          to: student.email,
          subject: `[Academy Announcement] ${subject}`,
          html: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111111; background: #F4F4EE; border: 2px solid #111111; padding: 32px; line-height: 1.7;">
                  <h2 style="color: #111111; font-family: Georgia, serif; border-bottom: 2px solid #111111; padding-bottom: 0.5rem; font-weight: 700;">${subject}</h2>
                  <p style="font-family: Arial, sans-serif; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem;">Dear Student,</p>
                  <p style="font-family: Arial, sans-serif;">Duncan Makoyo has posted a new announcement to the Mentorship portal:</p>
                  <div style="background: #FFFFFF; padding: 1.5rem; border-left: 4px solid #D61A3C; margin: 1.5rem 0; border: 2px solid #111111; border-left: 4px solid #D61A3C; font-family: Arial, sans-serif; white-space: pre-line">
                    ${content}
                  </div>
                  <p style="font-family: Arial, sans-serif;">Visit your Academy dashboard at <a href="${academyDashboardUrl}" style="color: #D61A3C; font-weight: 700; text-decoration: none;">your dashboard</a> to view or respond.</p>
                  <hr style="border: none; border-top: 2px solid #111111; margin: 2rem 0"/>
                  <p style="font-size: 0.75rem; color: #D61A3C; font-family: Arial, sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Duncan Makoyo Career Academy &amp; Mentorship</p>
                 </div>`
        });
      });
      await Promise.all(emailPromises);
    }

    res.json(broadcast);
  } catch (err) {
    console.error('[Mentor Broadcast Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Route: Mentor Message Single Student (Send Email) ─────────────────────────
router.post('/mentor/message-student', authenticateUser, async (req, res) => {
  const { student_email, subject, content } = req.body;
  const userId = req.user.id;

  if (!student_email || !subject || !content || subject.trim().length < 3 || content.trim().length < 5) {
    return res.status(400).json({ error: 'Student email, subject, and content are required.' });
  }

  try {
    // 1. Verify user is mentor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || profile.role !== 'mentor') {
      return res.status(403).json({ error: 'Forbidden: Mentor only route.' });
    }

    // 2. Verify recipient is a student
    const { data: student } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', student_email)
      .single();

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // 3. Send email to the student
    const academyDashboardUrl = process.env.ACADEMY_DASHBOARD_URL || 'https://duncanmakoyo.com/#/academy/dashboard';
    await sendEmail({
      to: student.email,
      subject: `[Academy Message] ${subject}`,
      html: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #111111; background: #F4F4EE; border: 2px solid #111111; padding: 32px; line-height: 1.7;">
              <h2 style="color: #111111; font-family: Georgia, serif; border-bottom: 2px solid #111111; padding-bottom: 0.5rem; font-weight: 700;">${subject}</h2>
              <p style="font-family: Arial, sans-serif; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.85rem;">Hello,</p>
              <p style="font-family: Arial, sans-serif;">Duncan Makoyo has sent you a direct message regarding your progress in the Academy:</p>
              <div style="background: #FFFFFF; padding: 1.5rem; border-left: 4px solid #D61A3C; margin: 1.5rem 0; border: 2px solid #111111; border-left: 4px solid #D61A3C; font-family: Arial, sans-serif; white-space: pre-line">
                ${content}
              </div>
              <p style="font-family: Arial, sans-serif;">Go to your <a href="${academyDashboardUrl}" style="color: #D61A3C; font-weight: 700; text-decoration: none;">Academy Dashboard</a> to continue your sprints.</p>
              <hr style="border: none; border-top: 2px solid #111111; margin: 2rem 0"/>
              <p style="font-size: 0.75rem; color: #D61A3C; font-family: Arial, sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Duncan Makoyo Career Academy &amp; Mentorship</p>
             </div>`
    });

    res.json({ success: true, message: 'Message sent to student successfully.' });
  } catch (err) {
    console.error('[Mentor Message Student Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Mentor Route: Create Rider ───────────────────────────────────────────────
router.post('/mentor/create-rider', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const { name, phone, email, password } = req.body;

  if (!name || !phone || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // 1. Verify user is mentor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || profile.role !== 'mentor') {
      return res.status(403).json({ error: 'Forbidden: Mentor only route.' });
    }

    // 2. Create user via Admin API
    const { data: userData, error: createErr } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: { role: 'rider' },
    });

    if (createErr) {
      return res.status(400).json({ error: createErr.message });
    }

    // 3. Add to riders table
    const { error: insertErr } = await supabase
      .from('riders')
      .insert({
        id: userData.user.id,
        name: name,
        phone: phone,
        email: email.toLowerCase(),
      });

    if (insertErr) {
      return res.status(500).json({ error: 'Failed to add rider to database.' });
    }

    // 4. Update role in profiles table to 'rider' (since trigger defaults to 'student')
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ role: 'rider' })
      .eq('id', userData.user.id);

    if (profileErr) {
      console.error('[Mentor Create Rider Profile Update Error]', profileErr.message);
    }

    res.json({ success: true, message: 'Rider created successfully.' });
  } catch (err) {
    console.error('[Mentor Create Rider Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Mentor Route: Change Rider Password ──────────────────────────────────────
router.post('/mentor/change-rider-password', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const { riderId, newPassword } = req.body;

  if (!riderId || !newPassword) {
    return res.status(400).json({ error: 'Rider ID and new password are required.' });
  }

  try {
    // 1. Verify user is mentor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || profile.role !== 'mentor') {
      return res.status(403).json({ error: 'Forbidden: Mentor only route.' });
    }

    // 2. Update password via Admin API
    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      riderId,
      { password: newPassword }
    );

    if (updateErr) {
      return res.status(400).json({ error: updateErr.message });
    }

    res.json({ success: true, message: 'Rider password updated successfully.' });
  } catch (err) {
    console.error('[Mentor Change Rider Password Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Email Helper for Resend ─────────────────────────────────────────────────────
async function sendTemplateEmail({ to, templateName, fileUrl }) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'duncan@duncanmakoyo.com';

  if (!resendKey || resendKey.includes('placeholder')) {
    console.warn('[Resend] API key not configured. Skipping email.');
    return;
  }

  try {
    await axios.post(
      'https://api.resend.com/emails',
      {
        from: `Duncan Makoyo Vault <${fromAddress}>`,
        to,
        subject: `Your Premium ATS Resume Template: ${templateName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
            <h2 style="color: #D12630; border-bottom: 2px solid #111; padding-bottom: 10px;">The ATS Resume Vault</h2>
            <p>Hi there,</p>
            <p>Thank you for your purchase! Your premium ATS-optimized resume template <strong>"${templateName}"</strong> is ready.</p>
            <p>You can download it directly using the link below:</p>
            <div style="margin: 30px 0;">
              <a href="${fileUrl}" style="background-color: #D12630; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; font-size: 16px;">Download .DOCX Template</a>
            </div>
            <p style="font-size: 14px; color: #555;">If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${fileUrl}">${fileUrl}</a></p>
            <p style="margin-top: 40px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 20px;">
              Duncan Makoyo Career Strategy &copy; ${new Date().getFullYear()}
            </p>
          </div>
        `,
      },
      {
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`[Template Email] Sent successfully to ${to}`);
  } catch (err) {
    console.error('[Template Email Error]', err.response?.data || err.message);
  }
}

// ─── Resume Templates Endpoints ──────────────────────────────────────────────

// GET all templates (public)
router.get('/templates', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resume_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Get Templates Error]', error.message);
      return res.status(500).json({ error: 'Failed to fetch templates.' });
    }
    res.json(data);
  } catch (err) {
    console.error('[Get Templates Router Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST purchase template (verify Paystack + send email)
router.post('/templates/purchase', async (req, res) => {
  const { reference, email, templateId } = req.body;

  if (!reference || !email || !templateId) {
    return res.status(400).json({ error: 'Missing required fields: reference, email, or templateId.' });
  }

  try {
    // 1. Verify transaction with Paystack
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      return res.status(500).json({ error: 'Payment gateway not configured.' });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackKey}` } }
    );

    const txData = response.data?.data;
    if (txData?.status !== 'success') {
      return res.status(402).json({ error: 'Payment not confirmed.', status: txData?.status });
    }

    // Security check: Match templateId with metadata if present
    const metaTemplateId = txData.metadata?.template_id;
    if (metaTemplateId && String(metaTemplateId) !== String(templateId)) {
      return res.status(400).json({ error: 'Security validation failed: Template mismatch.' });
    }

    // 2. Fetch template details
    const { data: template, error } = await supabase
      .from('resume_templates')
      .select('name, file_url')
      .eq('id', templateId)
      .single();

    if (error || !template || !template.file_url) {
      return res.status(404).json({ error: 'Template file not found in database.' });
    }

    // 3. Send Email via Resend
    await sendTemplateEmail({
      to: email,
      templateName: template.name,
      fileUrl: template.file_url
    });

    // 4. Return success and the file URL for immediate download
    res.json({
      success: true,
      file_url: template.file_url,
      message: 'Payment verified. Email sent.'
    });

  } catch (error) {
    const detail = error.response?.data?.message || error.message;
    console.error('[Paystack template verify error]', detail);
    res.status(502).json({ error: 'Failed to verify payment or send email.' });
  }
});

// POST create/upload new template (mentor only)
router.post('/mentor/templates', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const { name, description, is_free, price_kes, price_usd, category, optimized_companies, file_name, file_data_base64, preview_image_base64, preview_image_name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Template name is required.' });
  }

  try {
    // 1. Verify user is mentor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || profile.role !== 'mentor') {
      return res.status(403).json({ error: 'Forbidden: Mentor only route.' });
    }

    let fileUrl = null;
    let previewUrl = null;

    // 2. Upload file if provided
    if (file_data_base64 && file_name) {
      const fileBuffer = Buffer.from(file_data_base64, 'base64');
      const cleanFileName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniquePath = `templates/${crypto.randomUUID()}_${cleanFileName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('resume-templates')
        .upload(uniquePath, fileBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true
        });

      if (uploadErr) {
        console.error('[Upload Template File Error]', uploadErr.message);
        return res.status(500).json({ error: 'Failed to upload template file.' });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('resume-templates')
        .getPublicUrl(uniquePath);

      fileUrl = publicUrl;
    }

    // 2.5 Upload preview image if provided
    if (preview_image_base64 && preview_image_name) {
      const previewBuffer = Buffer.from(preview_image_base64, 'base64');
      const cleanImageName = preview_image_name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueImgPath = `previews/${crypto.randomUUID()}_${cleanImageName}`;

      // Detect MIME type naively by extension
      let contentType = 'image/jpeg';
      if (cleanImageName.toLowerCase().endsWith('.png')) contentType = 'image/png';
      else if (cleanImageName.toLowerCase().endsWith('.webp')) contentType = 'image/webp';

      const { error: imgUploadErr } = await supabase.storage
        .from('resume-templates')
        .upload(uniqueImgPath, previewBuffer, {
          contentType,
          upsert: true
        });

      if (imgUploadErr) {
        console.error('[Upload Preview Image Error]', imgUploadErr.message);
      } else {
        const { data: { publicUrl: pUrl } } = supabase.storage
          .from('resume-templates')
          .getPublicUrl(uniqueImgPath);
        previewUrl = pUrl;
      }
    }

    // 3. Insert metadata into database
    const { data, error } = await supabase
      .from('resume_templates')
      .insert({
        name,
        description: description || '',
        is_free: is_free === undefined ? true : !!is_free,
        price_kes: price_kes ? Number(price_kes) : 0,
        price_usd: price_usd ? Number(price_usd) : 0,
        file_url: fileUrl,
        preview_url: previewUrl,
        category: category || 'General',
        optimized_companies: Array.isArray(optimized_companies) ? optimized_companies : []
      })
      .select('*')
      .single();

    if (error) {
      console.error('[Create Template Error]', error.message);
      return res.status(500).json({ error: 'Failed to create template.' });
    }

    res.json(data);
  } catch (err) {
    console.error('[Create Template Router Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT update template metadata (mentor only)
router.put('/mentor/templates/:id', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, description, is_free, price_kes, price_usd, category, optimized_companies, file_name, file_data_base64, preview_image_base64, preview_image_name } = req.body;

  try {
    // 1. Verify user is mentor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || profile.role !== 'mentor') {
      return res.status(403).json({ error: 'Forbidden: Mentor only route.' });
    }

    // 2. Fetch existing template
    const { data: existing, error: fetchErr } = await supabase
      .from('resume_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    let fileUrl = existing.file_url;
    let previewUrl = existing.preview_url;

    // 3. Upload new file if provided
    if (file_data_base64 && file_name) {
      const fileBuffer = Buffer.from(file_data_base64, 'base64');
      const cleanFileName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniquePath = `templates/${crypto.randomUUID()}_${cleanFileName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('resume-templates')
        .upload(uniquePath, fileBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true
        });

      if (uploadErr) {
        console.error('[Update Template File Error]', uploadErr.message);
        return res.status(500).json({ error: 'Failed to upload new template file.' });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('resume-templates')
        .getPublicUrl(uniquePath);

      // Clean up old file from storage if it exists
      if (existing.file_url) {
        try {
          const oldPath = existing.file_url.split('/storage/v1/object/public/resume-templates/')[1];
          if (oldPath) {
            await supabase.storage.from('resume-templates').remove([oldPath]);
          }
        } catch (delErr) {
          console.error('[Clean Old File Warning]', delErr.message);
        }
      }

      fileUrl = publicUrl;
    }

    // 3.5 Upload preview image if provided
    if (preview_image_base64 && preview_image_name) {
      const previewBuffer = Buffer.from(preview_image_base64, 'base64');
      const cleanImageName = preview_image_name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueImgPath = `previews/${crypto.randomUUID()}_${cleanImageName}`;

      let contentType = 'image/jpeg';
      if (cleanImageName.toLowerCase().endsWith('.png')) contentType = 'image/png';
      else if (cleanImageName.toLowerCase().endsWith('.webp')) contentType = 'image/webp';

      const { error: imgUploadErr } = await supabase.storage
        .from('resume-templates')
        .upload(uniqueImgPath, previewBuffer, {
          contentType,
          upsert: true
        });

      if (imgUploadErr) {
        console.error('[Upload Preview Image Error]', imgUploadErr.message);
      } else {
        const { data: { publicUrl: pUrl } } = supabase.storage
          .from('resume-templates')
          .getPublicUrl(uniqueImgPath);

        // Clean up old preview if exists
        if (existing.preview_url) {
          try {
            const oldImgPath = existing.preview_url.split('/storage/v1/object/public/resume-templates/')[1];
            if (oldImgPath) {
              await supabase.storage.from('resume-templates').remove([oldImgPath]);
            }
          } catch (delErr) {
            console.error('[Clean Old Preview Warning]', delErr.message);
          }
        }

        previewUrl = pUrl;
      }
    }

    // 4. Update metadata in database
    const { data, error } = await supabase
      .from('resume_templates')
      .update({
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        is_free: is_free !== undefined ? !!is_free : existing.is_free,
        price_kes: price_kes !== undefined ? Number(price_kes) : existing.price_kes,
        price_usd: price_usd !== undefined ? Number(price_usd) : existing.price_usd,
        file_url: fileUrl,
        preview_url: previewUrl,
        category: category || existing.category,
        optimized_companies: Array.isArray(optimized_companies) ? optimized_companies : existing.optimized_companies
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[Update Template Error]', error.message);
      return res.status(500).json({ error: 'Failed to update template.' });
    }

    res.json(data);
  } catch (err) {
    console.error('[Update Template Router Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE template (mentor only)
router.delete('/mentor/templates/:id', authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    // 1. Verify user is mentor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile || profile.role !== 'mentor') {
      return res.status(403).json({ error: 'Forbidden: Mentor only route.' });
    }

    // 2. Fetch existing template
    const { data: existing, error: fetchErr } = await supabase
      .from('resume_templates')
      .select('file_url')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    // 3. Delete file from storage
    if (existing.file_url) {
      try {
        const oldPath = existing.file_url.split('/storage/v1/object/public/resume-templates/')[1];
        if (oldPath) {
          await supabase.storage.from('resume-templates').remove([oldPath]);
        }
      } catch (delErr) {
        console.error('[Delete File Warning]', delErr.message);
      }
    }

    // 4. Delete row from database
    const { error } = await supabase
      .from('resume_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Delete Template Error]', error.message);
      return res.status(500).json({ error: 'Failed to delete template.' });
    }

    res.json({ success: true, message: 'Template deleted successfully.' });
  } catch (err) {
    console.error('[Delete Template Router Error]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
