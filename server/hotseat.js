import express from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import { supabase } from './supabase.js';

const router = express.Router();

// ─── Constants ────────────────────────────────────────────────────────────────
const MENTOR_EMAILS = [
  'duncanmakoyo@gmail.com',
  'makoyoduncan@gmail.com',
];

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const hotseatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
});

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this network. Please wait 15 minutes and try again.' },
});

router.use(hotseatLimiter);

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

// ─── Input Sanitization Helpers ───────────────────────────────────────────────
function sanitizeString(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '').slice(0, maxLen);
}

function isValidUUID(uuid) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch { return false; }
}

// ─── Resend Email Helper ───────────────────────────────────────────────────────
async function sendHotseatEmail({ to, subject, html, scheduledAt = null }) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'alerts@duncanmakoyo.com';

  if (!resendKey || resendKey.includes('placeholder')) {
    console.warn('[HotSeat Email] RESEND_API_KEY not configured. Email not sent:', subject);
    console.log(`[EMAIL FALLBACK] TO: ${Array.isArray(to) ? to.join(', ') : to} | SUBJECT: ${subject}`);
    return { sent: false, reason: 'no_resend_key' };
  }

  const payload = {
    from: `Duncan Makoyo - Resume Hot Seat <${fromAddress}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (scheduledAt) payload.scheduled_at = scheduledAt;

  try {
    const res = await axios.post('https://api.resend.com/emails', payload, {
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    });
    console.log(`[HotSeat Email] Sent to ${Array.isArray(to) ? to.join(', ') : to}${scheduledAt ? ` (scheduled: ${scheduledAt})` : ''}`);
    return { sent: true, id: res.data?.id };
  } catch (err) {
    console.error('[HotSeat Email Error]', err.response?.data || err.message);
    return { sent: false, reason: err.response?.data || err.message };
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────
function buildCandidateEmail({ fullName, targetRole, liveSession }) {
  const sessionBlock = liveSession
    ? `<div style="background:#F4F4EE;border-left:4px solid #D61A3C;padding:16px 20px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#D61A3C;">NEXT LIVE SESSION</p>
        <p style="margin:4px 0 0;font-size:1rem;font-weight:700;color:#111111;">${liveSession.title || 'Resume Hot Seat Live'}</p>
        <p style="margin:4px 0 0;font-size:0.9rem;color:#555;">${new Date(liveSession.live_datetime).toLocaleString('en-KE', { weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Nairobi' })} EAT</p>
        ${liveSession.stream_link ? `<p style="margin:12px 0 0;"><a href="${liveSession.stream_link}" style="color:#D61A3C;font-weight:700;">Watch Live Stream →</a></p>` : ''}
       </div>`
    : `<p style="color:#555;font-size:0.9rem;margin:16px 0;">The next live date will be announced soon — watch your email.</p>`;

  return `<div style="font-family:'Helvetica Neue',Arial,sans-serif;background:#F4F4EE;padding:32px 16px;color:#111111;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:2px solid #111111;">
    <div style="background:#111111;padding:20px 32px;">
      <span style="color:#D61A3C;font-size:1rem;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;">RESUME HOT SEAT // QUEUE CONFIRMED</span>
    </div>
    <div style="padding:32px;">
      <h2 style="font-family:Georgia,serif;font-size:1.8rem;font-weight:900;margin:0 0 16px;">You're in the Queue, <em style="color:#D61A3C;">${fullName}.</em></h2>
      <p style="font-size:1rem;line-height:1.65;color:#333;margin:0 0 20px;">Your resume has been <strong>securely received</strong>. Here is what happens next:</p>
      <div style="border:1.5px solid #E5E5E5;padding:20px;margin:20px 0;">
        <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #F0F0F0;">
          <span style="font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#D61A3C;">STEP 01 // YOUR CV IS IN THE QUEUE</span>
          <p style="margin:6px 0 0;font-size:0.9rem;color:#555;">Only 3 resumes are selected per live session. We review all submissions and pick the ones with the most instructive ATS issues.</p>
        </div>
        <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #F0F0F0;">
          <span style="font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#D61A3C;">STEP 02 // YOUR PRIVACY IS PROTECTED</span>
          <p style="margin:6px 0 0;font-size:0.9rem;color:#555;">Before going live, your phone, email, and address are manually redacted. Only your name and professional experience are visible.</p>
        </div>
        <div>
          <span style="font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#D61A3C;">STEP 03 // YOU WILL BE NOTIFIED</span>
          <p style="margin:6px 0 0;font-size:0.9rem;color:#555;">If your CV is selected, you'll get a notification before the stream. Either way, tune in — others' teardowns teach you just as much.</p>
        </div>
      </div>
      <div style="background:#F9F9F9;border:1px solid #E5E5E5;padding:16px 20px;margin:20px 0;">
        <p style="margin:0 0 4px;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#888;">YOUR SUBMISSION</p>
        <p style="margin:8px 0 0;font-size:0.9rem;color:#333;"><strong>Name:</strong> ${fullName}</p>
        <p style="margin:4px 0 0;font-size:0.9rem;color:#333;"><strong>Target Role:</strong> ${targetRole || 'General Application'}</p>
      </div>
      ${sessionBlock}
      <a href="https://duncanmakoyo.com/#/ats" style="display:inline-block;background:#D61A3C;color:#FFFFFF;padding:14px 28px;font-weight:800;text-decoration:none;font-size:0.9rem;letter-spacing:0.05em;text-transform:uppercase;border:2px solid #111111;margin-bottom:24px;">TRY FREE ATS SIMULATOR NOW →</a>
    </div>
    <div style="background:#F4F4EE;padding:16px 32px;border-top:1px solid #E5E5E5;">
      <p style="margin:0;font-size:0.8rem;color:#888;">Questions? Email <a href="mailto:info@duncanmakoyo.com" style="color:#D61A3C;">info@duncanmakoyo.com</a></p>
    </div>
  </div>
</div>`;
}

function buildSelectedEmail({ fullName, targetRole, liveSession }) {
  const sessionBlock = liveSession
    ? `<div style="background:#F4F4EE;border-left:4px solid #D61A3C;padding:16px 20px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#D61A3C;">UPCOMING LIVE TEARDOWN</p>
        <p style="margin:4px 0 0;font-size:1rem;font-weight:700;color:#111111;">${liveSession.title || 'Resume Hot Seat Live'}</p>
        <p style="margin:4px 0 0;font-size:0.9rem;color:#555;">${new Date(liveSession.live_datetime).toLocaleString('en-KE', { weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Nairobi' })} EAT</p>
        ${liveSession.stream_link ? `<p style="margin:12px 0 0;"><a href="${liveSession.stream_link}" style="color:#D61A3C;font-weight:700;">Watch Live Stream →</a></p>` : ''}
       </div>`
    : `<p style="color:#555;font-size:0.9rem;margin:16px 0;">The broadcast date will be announced shortly. Watch your inbox for live stream details.</p>`;

  return `<div style="font-family:'Helvetica Neue',Arial,sans-serif;background:#F4F4EE;padding:32px 16px;color:#111111;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:2px solid #111111;">
    <div style="background:#D61A3C;padding:20px 32px;">
      <span style="color:#FFFFFF;font-size:1rem;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;">🔥 YOUR RESUME WAS SELECTED FOR THE HOT SEAT!</span>
    </div>
    <div style="padding:32px;">
      <h2 style="font-family:Georgia,serif;font-size:1.8rem;font-weight:900;margin:0 0 16px;">Congratulations, <em style="color:#D61A3C;">${fullName}!</em></h2>
      <p style="font-size:1rem;line-height:1.65;color:#333;margin:0 0 20px;">Your resume for <strong>"${targetRole || 'General Application'}"</strong> has been selected by Duncan Makoyo for a live ATS teardown & rewrite broadcast.</p>
      
      <div style="border:1.5px solid #E5E5E5;padding:20px;margin:20px 0;">
        <span style="font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#D61A3C;">WHAT HAPPENS LIVE</span>
        <ul style="margin:12px 0 0;padding-left:20px;color:#555;font-size:0.9rem;line-height:1.6;">
          <li>Your contact details (phone, email, street address) are <strong>100% redacted</strong> prior to stream.</li>
          <li>We will parse your CV live in front of the audience to reveal why ATS software rejects it.</li>
          <li>You'll get an exact rewrite roadmap to transform your score to a 100% ATS pass rate.</li>
        </ul>
      </div>

      ${sessionBlock}

      <p style="margin:24px 0 0;font-size:0.85rem;color:#888;">Questions? Email <a href="mailto:info@duncanmakoyo.com" style="color:#D61A3C;">info@duncanmakoyo.com</a></p>
    </div>
  </div>
</div>`;
}

function buildMentorAlertEmail({ fullName, candidateEmail, targetRole, resumeUrl, fileName, submittedAt }) {
  return `<div style="font-family:'Helvetica Neue',Arial,sans-serif;background:#F4F4EE;padding:32px 16px;color:#111111;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:2px solid #111111;">
    <div style="background:#D61A3C;padding:20px 32px;">
      <span style="color:#FFFFFF;font-size:1rem;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;">NEW HOT SEAT SUBMISSION</span>
    </div>
    <div style="padding:32px;">
      <p style="font-size:1rem;color:#333;margin:0 0 24px;">A new resume has been submitted for the live teardown queue.</p>
      <table style="width:100%;border-collapse:collapse;border:1.5px solid #111111;">
        <tr style="background:#111111;color:#FFFFFF;"><th style="padding:10px 16px;text-align:left;font-size:0.8rem;text-transform:uppercase;">Field</th><th style="padding:10px 16px;text-align:left;font-size:0.8rem;text-transform:uppercase;">Details</th></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #E5E5E5;"><strong>Name</strong></td><td style="padding:10px 16px;border-bottom:1px solid #E5E5E5;">${fullName}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #E5E5E5;"><strong>Email</strong></td><td style="padding:10px 16px;border-bottom:1px solid #E5E5E5;"><a href="mailto:${candidateEmail}" style="color:#D61A3C;">${candidateEmail}</a></td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #E5E5E5;"><strong>Target Role</strong></td><td style="padding:10px 16px;border-bottom:1px solid #E5E5E5;">${targetRole || 'General Application'}</td></tr>
        <tr><td style="padding:10px 16px;border-bottom:1px solid #E5E5E5;"><strong>File</strong></td><td style="padding:10px 16px;border-bottom:1px solid #E5E5E5;">${fileName}</td></tr>
        <tr><td style="padding:10px 16px;"><strong>Submitted At</strong></td><td style="padding:10px 16px;">${new Date(submittedAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })} EAT</td></tr>
      </table>
      ${resumeUrl && !resumeUrl.includes('placeholder') ? `<div style="margin:24px 0;"><a href="${resumeUrl}" style="display:inline-block;background:#111111;color:#FFFFFF;padding:12px 24px;font-weight:800;text-decoration:none;font-size:0.85rem;text-transform:uppercase;">OPEN RESUME FILE →</a></div>` : ''}
      <p style="margin:24px 0 0;font-size:0.85rem;color:#888;">Manage all submissions from your <a href="https://duncanmakoyo.com/#/academy/dashboard" style="color:#D61A3C;">Mentor Dashboard - Hot Seat Live tab</a>.</p>
    </div>
  </div>
</div>`;
}

function buildReminderEmail({ fullName, sessionTitle, liveDatetime, streamLink, hoursUntil }) {
  const isUrgent = hoursUntil <= 1;
  const formattedDate = new Date(liveDatetime).toLocaleString('en-KE', {
    weekday:'long',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Nairobi'
  });
  return `<div style="font-family:'Helvetica Neue',Arial,sans-serif;background:#F4F4EE;padding:32px 16px;color:#111111;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:2px solid #111111;">
    <div style="background:${isUrgent ? '#D61A3C' : '#111111'};padding:20px 32px;">
      <span style="color:#FFFFFF;font-size:1rem;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;">${isUrgent ? 'WE GO LIVE IN 1 HOUR' : 'LIVE STREAM IS TOMORROW'}</span>
    </div>
    <div style="padding:32px;">
      <h2 style="font-family:Georgia,serif;font-size:1.6rem;font-weight:900;margin:0 0 16px;">${isUrgent ? `Don't miss it, ${fullName}.` : `See you tomorrow, ${fullName}.`}</h2>
      <p style="font-size:1rem;line-height:1.65;color:#333;margin:0 0 20px;">${isUrgent ? 'The Resume Hot Seat broadcast starts in <strong>less than 1 hour</strong>.' : 'The Resume Hot Seat broadcast is <strong>tomorrow</strong>.'}</p>
      <div style="background:#F4F4EE;border-left:4px solid #D61A3C;padding:16px 20px;margin:20px 0;">
        <p style="margin:0 0 4px;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#D61A3C;">${sessionTitle || 'RESUME HOT SEAT LIVE'}</p>
        <p style="margin:4px 0 0;font-size:1rem;font-weight:700;color:#111111;">${formattedDate} EAT</p>
      </div>
      ${streamLink ? `<a href="${streamLink}" style="display:inline-block;background:#D61A3C;color:#FFFFFF;padding:14px 28px;font-weight:800;text-decoration:none;font-size:0.9rem;text-transform:uppercase;border:2px solid #111111;margin:16px 0;">WATCH LIVE STREAM →</a>` : `<p style="margin:16px 0;color:#555;font-size:0.9rem;">The stream link will be shared shortly before we go live.</p>`}
      <p style="margin:24px 0 0;font-size:0.85rem;color:#888;">Questions? <a href="mailto:info@duncanmakoyo.com" style="color:#D61A3C;">info@duncanmakoyo.com</a></p>
    </div>
  </div>
</div>`;
}

// ─── Helper: Auto-schedule Reminder Emails ────────────────────────────────────
async function scheduleRemindersForSession(session) {
  const liveDt = new Date(session.live_datetime);
  try {
    const { data: submissions, error } = await supabase
      .from('hotseat_submissions')
      .select('full_name, email')
      .in('status', ['pending', 'selected']);
    if (error || !submissions?.length) {
      console.log('[HotSeat Reminders] No pending submissions to remind.');
      return;
    }
    console.log(`[HotSeat Reminders] Scheduling for ${submissions.length} submitters...`);
    for (const sub of submissions) {
      const minus24h = new Date(liveDt.getTime() - 24 * 60 * 60 * 1000);
      if (minus24h > new Date(Date.now() + 60 * 1000)) {
        await sendHotseatEmail({
          to: sub.email,
          subject: `Reminder: Resume Hot Seat is TOMORROW — ${new Date(session.live_datetime).toLocaleDateString('en-KE',{timeZone:'Africa/Nairobi'})}`,
          html: buildReminderEmail({ fullName: sub.full_name, sessionTitle: session.title, liveDatetime: session.live_datetime, streamLink: session.stream_link, hoursUntil: 24 }),
          scheduledAt: minus24h.toISOString(),
        });
      }
      const minus1h = new Date(liveDt.getTime() - 60 * 60 * 1000);
      if (minus1h > new Date(Date.now() + 60 * 1000)) {
        await sendHotseatEmail({
          to: sub.email,
          subject: `We Go LIVE in 1 Hour — Resume Hot Seat`,
          html: buildReminderEmail({ fullName: sub.full_name, sessionTitle: session.title, liveDatetime: session.live_datetime, streamLink: session.stream_link, hoursUntil: 1 }),
          scheduledAt: minus1h.toISOString(),
        });
      }
    }
    console.log(`[HotSeat Reminders] Done scheduling for: ${session.title}`);
  } catch (err) {
    console.error('[HotSeat Reminders Error]', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Submit Resume (public, rate-limited)
router.post('/submit', submitLimiter, async (req, res) => {
  try {
    const { full_name, email, target_role, resume_url, file_name, consent_given } = req.body;
    const cleanName   = sanitizeString(full_name, 100);
    const cleanEmail  = sanitizeString(email, 150).toLowerCase();
    const cleanRole   = sanitizeString(target_role, 150) || 'General Application';
    const cleanResume = sanitizeString(resume_url, 1000);
    const cleanFile   = sanitizeString(file_name, 200) || 'Resume.pdf';

    if (!cleanName || !cleanEmail || !cleanResume) return res.status(400).json({ error: 'Full Name, Email, and Resume URL are required.' });
    if (!isValidEmail(cleanEmail)) return res.status(400).json({ error: 'Please provide a valid email address.' });
    if (!isValidUrl(cleanResume) || cleanResume.includes('placeholder.storage.com')) {
      return res.status(400).json({ error: 'Resume file upload failed. Please try uploading your PDF again.' });
    }
    if (consent_given !== true && consent_given !== 'true') {
      return res.status(400).json({ error: 'You must consent to displaying your resume during the live session.' });
    }

    const { data, error } = await supabase
      .from('hotseat_submissions')
      .insert([{ full_name: cleanName, email: cleanEmail, target_role: cleanRole, resume_url: cleanResume, file_name: cleanFile, consent_given: true, status: 'pending' }])
      .select();

    if (error) {
      console.error('[HotSeat Submit Error]', error.message);
      return res.status(500).json({ error: 'Failed to save submission. Please try again.' });
    }

    const submission = data[0];
    const submittedAt = submission.created_at || new Date().toISOString();

    // Fetch active live session for candidate email
    const { data: liveSessions } = await supabase
      .from('hotseat_live_sessions')
      .select('title, live_datetime, stream_link')
      .eq('is_active', true)
      .order('live_datetime', { ascending: true })
      .limit(1);
    const nextSession = liveSessions?.[0] || null;

    // Fire-and-forget emails
    sendHotseatEmail({
      to: cleanEmail,
      subject: `You're in the Queue, ${cleanName} — Resume Hot Seat Confirmation`,
      html: buildCandidateEmail({ fullName: cleanName, targetRole: cleanRole, liveSession: nextSession }),
    }).catch(err => console.error('[HotSeat Candidate Email]', err.message));

    sendHotseatEmail({
      to: MENTOR_EMAILS,
      subject: `[Hot Seat Submission] ${cleanName} — ${cleanRole}`,
      html: buildMentorAlertEmail({ fullName: cleanName, candidateEmail: cleanEmail, targetRole: cleanRole, resumeUrl: cleanResume, fileName: cleanFile, submittedAt }),
    }).catch(err => console.error('[HotSeat Mentor Email]', err.message));

    return res.json({ success: true, submission });
  } catch (err) {
    console.error('[HotSeat Submit Catch]', err);
    return res.status(500).json({ error: 'Internal server error processing submission.' });
  }
});

// 2. List Submissions (mentor only)
router.get('/submissions', authenticateMentor, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('hotseat_submissions')
      .select('id, full_name, email, target_role, resume_url, file_name, consent_given, status, created_at')
      .order('created_at', { ascending: false });
    if (status && ['pending', 'selected', 'reviewed'].includes(status)) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) { console.error('[HotSeat Fetch Error]', error.message); return res.status(500).json({ error: 'Failed to fetch submissions.' }); }
    return res.json({ success: true, submissions: data || [] });
  } catch (err) { return res.status(500).json({ error: 'Internal server error.' }); }
});

// 3. Update Submission Status (mentor only)
router.patch('/submissions/:id/status', authenticateMentor, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid submission ID.' });
    if (!['pending', 'selected', 'reviewed'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    const payload = { status };
    if (notes !== undefined) payload.notes = sanitizeString(notes, 500);
    const { data, error } = await supabase.from('hotseat_submissions').update(payload).eq('id', id).select();
    if (error) { console.error('[HotSeat Update Error]', error.message); return res.status(500).json({ error: 'Failed to update.' }); }
    
    const updatedSub = data?.[0];
    if (updatedSub && status === 'selected') {
      const { data: liveSessions } = await supabase
        .from('hotseat_live_sessions')
        .select('title, live_datetime, stream_link')
        .eq('is_active', true)
        .order('live_datetime', { ascending: true })
        .limit(1);
      const activeSession = liveSessions?.[0] || null;

      sendHotseatEmail({
        to: updatedSub.email,
        subject: `🔥 Your Resume Was Selected for "The Resume Hot Seat" Live Teardown!`,
        html: buildSelectedEmail({
          fullName: updatedSub.full_name,
          targetRole: updatedSub.target_role,
          liveSession: activeSession
        }),
      }).catch(err => console.error('[HotSeat Selected Notification Email Error]', err.message));
    }

    return res.json({ success: true, submission: updatedSub });
  } catch (err) { return res.status(500).json({ error: 'Internal server error.' }); }
});

// 4. Public Stats
router.get('/stats', async (req, res) => {
  try {
    const { count, error } = await supabase.from('hotseat_submissions').select('*', { count: 'exact', head: true });
    if (error) return res.json({ totalSubmissions: 14 });
    return res.json({ totalSubmissions: count || 14 });
  } catch { return res.json({ totalSubmissions: 14 }); }
});

// 5. Get Current Active Live Session (public — landing page countdown)
router.get('/live-session', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hotseat_live_sessions')
      .select('id, title, live_datetime, stream_link, max_spots, notes')
      .eq('is_active', true)
      .order('live_datetime', { ascending: true })
      .limit(1);
    if (error) { console.error('[HotSeat Live Session Error]', error.message); return res.json({ success: true, session: null }); }
    return res.json({ success: true, session: data?.[0] || null });
  } catch (err) { return res.json({ success: true, session: null }); }
});

function parseLiveDatetime(dtStr) {
  if (typeof dtStr !== 'string') return new Date(dtStr);
  const hasTimezone = dtStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dtStr);
  if (!hasTimezone) {
    return new Date(`${dtStr}+03:00`);
  }
  return new Date(dtStr);
}

// 6. Create New Live Session (mentor only — auto-schedules reminders)
router.post('/live-session', authenticateMentor, async (req, res) => {
  try {
    const { title, live_datetime, stream_link, max_spots, notes, deactivate_others } = req.body;
    if (!live_datetime) return res.status(400).json({ error: 'live_datetime is required.' });
    const liveDate = parseLiveDatetime(live_datetime);
    if (isNaN(liveDate.getTime())) return res.status(400).json({ error: 'live_datetime must be a valid date/time.' });

    if (deactivate_others) {
      await supabase.from('hotseat_live_sessions').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { data, error } = await supabase
      .from('hotseat_live_sessions')
      .insert([{
        title:         sanitizeString(title || 'Resume Hot Seat Live', 200),
        live_datetime: liveDate.toISOString(),
        stream_link:   stream_link ? sanitizeString(stream_link, 500) : null,
        max_spots:     parseInt(max_spots, 10) || 3,
        notes:         sanitizeString(notes || '', 500),
        is_active:     true,
      }])
      .select();

    if (error) { console.error('[HotSeat Live Session Create Error]', error.message); return res.status(500).json({ error: 'Failed to save live session.' }); }
    const newSession = data[0];
    scheduleRemindersForSession(newSession).catch(err => console.error('[Reminder Schedule Error]', err.message));
    return res.json({ success: true, session: newSession, message: 'Live session saved. Reminder emails are being scheduled.' });
  } catch (err) { return res.status(500).json({ error: 'Internal server error.' }); }
});

// 7. Update Live Session (mentor only)
router.patch('/live-session/:id', authenticateMentor, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid session ID.' });
    const { title, live_datetime, stream_link, max_spots, notes, is_active } = req.body;
    const payload = {};
    if (title !== undefined)       payload.title       = sanitizeString(title, 200);
    if (notes !== undefined)       payload.notes       = sanitizeString(notes, 500);
    if (stream_link !== undefined) payload.stream_link = stream_link ? sanitizeString(stream_link, 500) : null;
    if (max_spots !== undefined)   payload.max_spots   = parseInt(max_spots, 10) || 3;
    if (is_active !== undefined)   payload.is_active   = Boolean(is_active);
    if (live_datetime !== undefined) {
      const d = parseLiveDatetime(live_datetime);
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid live_datetime.' });
      payload.live_datetime = d.toISOString();
    }
    const { data, error } = await supabase.from('hotseat_live_sessions').update(payload).eq('id', id).select();
    if (error) { console.error('[HotSeat Session Update Error]', error.message); return res.status(500).json({ error: 'Failed to update session.' }); }
    if (live_datetime && data?.[0]) scheduleRemindersForSession(data[0]).catch(e => console.error('[Reminder Re-Schedule]', e.message));
    return res.json({ success: true, session: data[0] });
  } catch (err) { return res.status(500).json({ error: 'Internal server error.' }); }
});

// 8. List All Live Sessions (mentor only)
router.get('/live-sessions', authenticateMentor, async (req, res) => {
  try {
    const { data, error } = await supabase.from('hotseat_live_sessions').select('*').order('live_datetime', { ascending: false });
    if (error) return res.status(500).json({ error: 'Failed to fetch sessions.' });
    return res.json({ success: true, sessions: data || [] });
  } catch (err) { return res.status(500).json({ error: 'Internal server error.' }); }
});

// 9. Delete Live Session (mentor only)
router.delete('/live-session/:id', authenticateMentor, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid session ID.' });
    const { data, error } = await supabase.from('hotseat_live_sessions').delete().eq('id', id).select();
    if (error) { console.error('[HotSeat Session Delete Error]', error.message); return res.status(500).json({ error: 'Failed to delete session.' }); }
    return res.json({ success: true, message: 'Live session deleted successfully.', session: data?.[0] });
  } catch (err) { return res.status(500).json({ error: 'Internal server error.' }); }
});

export default router;
