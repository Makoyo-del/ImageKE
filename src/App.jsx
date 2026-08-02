import React, { useState, useCallback, useRef, useEffect, Suspense, lazy } from 'react';
import { Upload, Download, CheckCircle, ArrowLeft, Loader2, AlertCircle, RefreshCw, Trash2, FileImage, Video, Crop, FileVideo, Music, Play, Pause, Eye, Layers, User, Globe, Percent, GraduationCap, Compass } from 'lucide-react';
import axios from 'axios';

// Lazily load route components to reduce initial bundle size and speed up page load
const ServicesPage = lazy(() => import('./ServicesPage'));
const ATSSimulator = lazy(() => import('./ATSSimulator'));
const HookBunkerLanding = lazy(() => import('./components/hookbunker/HookBunkerLanding').then(m => ({ default: m.HookBunkerLanding })));
const HookBunkerDocs = lazy(() => import('./components/hookbunker/HookBunkerDocs').then(m => ({ default: m.HookBunkerDocs })));
const HookBunkerDashboard = lazy(() => import('./components/hookbunker/HookBunkerDashboard').then(m => ({ default: m.HookBunkerDashboard })));
const AcademyAuth = lazy(() => import('./components/academy/AcademyAuth'));
const AcademyDashboard = lazy(() => import('./components/academy/AcademyDashboard'));
const WorkshopLanding = lazy(() => import('./components/workshop/WorkshopLanding'));
const WorkshopJoin = lazy(() => import('./components/workshop/WorkshopJoin'));
const RiderLogin = lazy(() => import('./components/rider/RiderLogin'));
const RiderDashboard = lazy(() => import('./components/rider/RiderDashboard'));
const ATSResumeVault = lazy(() => import('./components/vault/ATSResumeVault'));
const LinkedInScorecard = lazy(() => import('./LinkedInScorecard'));
const ResumeHotSeatLanding = lazy(() => import('./components/hotseat/ResumeHotSeatLanding'));
const ImageVideoTools = lazy(() => import('./components/tools/ImageVideoTools'));

// ─── Environment Config ────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ProcessingOverlay({ message }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px', margin: '0 auto 1rem',
          border: '4px solid #e5e7eb', borderTop: '4px solid var(--primary)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontWeight: 600, color: 'var(--text)' }}>{message}</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const getPathFromHash = () => {
  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);
  const fullUrl = window.location.href;

  if (
    hash.includes('access_token=') ||
    hash.includes('error=') ||
    searchParams.has('code') ||
    searchParams.has('error') ||
    searchParams.has('error_description')
  ) {
    const isAcademyRedirect = fullUrl.includes('/academy/dashboard') ||
      fullUrl.includes('%2Facademy%2Fdashboard') ||
      sessionStorage.getItem('academy_signup_pending') === 'true';
    return isAcademyRedirect ? 'academy-dashboard' : 'hookbunker-dashboard';
  }

  if (hash === '#/ats' || hash === '#/ats-simulator') return 'ats';
  if (
    hash === '#/products/resume-hotseat' ||
    hash === '#/hotseat' ||
    hash === '#/resume-hotseat' ||
    hash === '#/hot-seat' ||
    hash === '#reserve-spot' ||
    hash.startsWith('#/products/resume-hotseat') ||
    hash.startsWith('#/hotseat') ||
    hash.includes('reserve-spot')
  ) return 'hotseat';
  if (hash === '#/linkedin' || hash === '#/linkedin-scorecard' || hash === '#/linkedin-audit') return 'linkedin';

  if (hash === '#/batch') return 'batch';
  if (hash === '#/custom') return 'custom';
  if (hash === '#/processor') return 'processor';
  if (hash === '#/terms') return 'terms';
  if (hash === '#/privacy') return 'privacy';
  if (hash === '#/photo-tools' || hash === '#/photo-editor' || hash === '#/photoeditor') return 'home';
  if (hash === '#/video-tools' || hash === '#/video-editor' || hash === '#/videos') return 'home';
  if (hash === '#/home' || hash === '#/tools') return 'home';
  if (hash === '#/vault' || hash === '#/ats-vault') return 'vault';

  if (hash === '#/academy') return 'academy-auth';
  if (hash === '#/academy/dashboard') return 'academy-dashboard';

  if (hash.startsWith('#/workshop/join')) return 'workshop-join';
  if (hash === '#/workshop' || hash === '#/ai-jobseeker-workshop') return 'workshop';

  if (hash === '#/rider-login') return 'rider-login';
  if (hash === '#/rider-dashboard') return 'rider-dashboard';

  if (hash === '#/hookbunker') return 'hookbunker-landing';
  if (hash === '#/hookbunker/docs') return 'hookbunker-docs';
  if (hash === '#/hookbunker/dashboard') return 'hookbunker-dashboard';
  if (hash === '#/hookbunker/terms') return 'terms';
  if (hash === '#/hookbunker/privacy') return 'privacy';

  return 'services';
};

const getTabFromHash = () => {
  const hash = window.location.hash;
  if (hash === '#/video-tools' || hash === '#/video-editor' || hash === '#/videos') return 'videos';
  return 'images';
};

function App() {
  const [currentPath, setCurrentPath] = useState(getPathFromHash);
  const [currentTab, setCurrentTab] = useState(getTabFromHash);
  const [atsHandoffState, setAtsHandoffState] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');

  // Intercept Supabase Auth redirects (Implicit Grant Hash or PKCE/error Search Query)
  useEffect(() => {
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);

    // Check for custom Academy verify_token
    const verifyToken = searchParams.get('verify_token');
    if (verifyToken) {
      (async () => {
        try {
          setIsProcessing(true);
          setProcessingMsg('Verifying your email address...');
          const res = await axios.post(`${API_URL}/api/academy/verify-email`, { token: verifyToken });
          if (res.data?.success) {
            sessionStorage.setItem('hb_toast_message', 'Email verified successfully! You can now sign in.');
            sessionStorage.setItem('hb_toast_type', 'success');
          } else {
            sessionStorage.setItem('hb_auth_error', 'Email verification failed: Invalid or expired link.');
          }
        } catch (err) {
          sessionStorage.setItem('hb_auth_error', err.response?.data?.error || 'Email verification failed. Connection issue.');
        } finally {
          setIsProcessing(false);
          // Clear query params and reload the page cleanly on Academy dashboard page
          const cleanUrl = window.location.origin + window.location.pathname + '#/academy/dashboard';
          window.location.href = cleanUrl;
        }
      })();
      return;
    }

    let isAuthRedirect = false;
    let errorMsg = null;
    let authType = null;
    let hasAccessToken = false;

    if (hash.includes('access_token=') || hash.includes('error=')) {
      isAuthRedirect = true;
      const paramString = hash.includes('access_token=')
        ? hash.substring(hash.indexOf('access_token='))
        : hash.substring(hash.indexOf('error='));
      const params = new URLSearchParams(paramString);
      errorMsg = params.get('error_description') || params.get('error');
      authType = params.get('type');
      hasAccessToken = params.has('access_token');
    } else if (searchParams.has('code') || searchParams.has('error') || searchParams.has('error_description')) {
      isAuthRedirect = true;
      errorMsg = searchParams.get('error_description') || searchParams.get('error');
      authType = searchParams.get('type');
      hasAccessToken = searchParams.has('code');
    }

    if (isAuthRedirect) {
      // Determine which product this redirect was for.
      // Academy sets emailRedirectTo to /#/academy/dashboard.
      // If that path is present in the full URL, it's an Academy redirect.
      const fullUrl = window.location.href;
      const isAcademyRedirect = fullUrl.includes('/academy/dashboard') ||
        fullUrl.includes('%2Facademy%2Fdashboard') ||
        sessionStorage.getItem('academy_signup_pending') === 'true';

      if (errorMsg) {
        const decodedError = decodeURIComponent(errorMsg).replace(/\+/g, ' ');
        sessionStorage.setItem('hb_auth_error', `Authentication failed: ${decodedError}`);
      } else if (hasAccessToken) {
        if (isAcademyRedirect) {
          sessionStorage.setItem('hb_toast_message', 'Email verified. Welcome to the Career Academy!');
          sessionStorage.setItem('hb_toast_type', 'success');
          sessionStorage.removeItem('academy_signup_pending');
        } else if (authType === 'signup') {
          sessionStorage.setItem('hb_toast_message', 'Email verified successfully. Welcome to your HookBunker dashboard!');
          sessionStorage.setItem('hb_toast_type', 'success');
        } else if (authType === 'recovery') {
          sessionStorage.setItem('hb_toast_message', 'Credentials confirmed. Please update your password in the settings.');
          sessionStorage.setItem('hb_toast_type', 'success');
        } else if (authType === 'invite') {
          sessionStorage.setItem('hb_toast_message', 'Invitation accepted. Welcome to HookBunker!');
          sessionStorage.setItem('hb_toast_type', 'success');
        } else {
          sessionStorage.setItem('hb_toast_message', 'Email verified and logged in successfully.');
          sessionStorage.setItem('hb_toast_type', 'success');
        }
      }

      // Route to the correct dashboard based on product
      if (isAcademyRedirect) {
        if (window.location.search) {
          const cleanUrl = window.location.origin + window.location.pathname + '#/academy/dashboard';
          window.history.replaceState(null, '', cleanUrl);
        } else {
          window.location.hash = '#/academy/dashboard';
        }
        setCurrentPath('academy-dashboard');
      } else {
        // Clear search query parameters or hash redirects from URL to keep it clean
        if (window.location.search) {
          const cleanUrl = window.location.origin + window.location.pathname + '#/hookbunker/dashboard';
          window.history.replaceState(null, '', cleanUrl);
        } else {
          window.location.hash = '#/hookbunker/dashboard';
        }
        // Manually trigger local path state update
        setCurrentPath('hookbunker-dashboard');
      }
    }
  }, []);

  // Reset window scroll to top on path/tool change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentPath]);

  // Listen for hash changes to update navigation state
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(getPathFromHash());
      setCurrentTab(getTabFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial sync
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);


  // Reset window scroll to top on path/tool change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentPath]);

  // Listen for hash changes to update navigation state
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(getPathFromHash());
      setCurrentTab(getTabFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const renderTerms = () => (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem', maxWidth: '850px' }}>
      <button
        onClick={() => setCurrentPath('services')}
        className="btn"
        style={{ background: 'none', color: 'var(--text-muted)', padding: 0, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <ArrowLeft size={18} /> Back to Home
      </button>
      <h1>Terms of Use &amp; Service Disclaimers</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Last Updated: July 2026</p>
      <div style={{ marginTop: '2rem', lineHeight: 1.8, color: 'var(--text-muted)' }}>
        <h3 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>1. Acceptance of Terms</h3>
        <p>By accessing or using the website at duncanmakoyo.com ("the Site"), and any associated media utilities (ImageKE Photo &amp; Video Studio), career development services, ATS resume auditing simulator, The Resume Hot Seat live teardowns, LinkedIn Scorecard, HookBunker proxy, Career Academy, AI Masterclasses, Resume Vault, or digital presence consulting (collectively, "the Services"), you confirm that you are at least 18 years of age (or have parental/guardian consent) and agree to be legally bound by these Terms of Use. If you do not agree, please discontinue use of the Services immediately.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>2. Scope and Description of All Products &amp; Services</h3>
        <p>We provide a comprehensive suite of digital, media, developer, and career solutions, including:</p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 2 }}>
          <li><b>ImageKE Photo Utilities:</b> Automated image resizing and cropping for specific portal requirements (e.g. eCitizen, KRA iTax, HELB, US/Schengen Visa), custom dimensional resizing, and a Batch Document Compressor to optimize scanned page uploads.</li>
          <li><b>ImageKE Video Studio:</b> Client-side aspect ratio cropping (portrait 9:16, square 1:1, widescreen 16:9), size compressors (WhatsApp under 16MB, email under 25MB), text/image branding watermarkers, MP3 audio extractors, and video frame extraction tools.</li>
          <li><b>ATS Simulator (V2):</b> A secure resume parsing utility utilizing artificial intelligence to analyze formatting safety, structural ordering, privacy markers (e.g. photos, DOB, National ID risks), STAR methodology metrics, and keyword coverage.</li>
          <li><b>The Resume Hot Seat (Live Teardown Broadcasts):</b> An interactive live teardown event where candidates submit their CVs for real-time ATS scanning, public document analysis, and live career strategy reviews streamed across platforms including LinkedIn, TikTok, and YouTube.</li>
          <li><b>LinkedIn Recruiter POV Scorecard:</b> A specialized diagnostic tool auditing LinkedIn profiles against recruiter search parameters, headline density, about section formatting, and keywords.</li>
          <li><b>HookBunker Webhook Proxy &amp; Gateway:</b> A resilient developer forwarding proxy designed to ingest callback events from payment gateways (Safaricom M-Pesa, Paystack, Payhero) and reliably dispatch them to target applications with status logging and retry dispatching.</li>
          <li><b>Career Academy &amp; Mentorship Program:</b> A structured learning platform offering outcomes-focused training on personal branding, LinkedIn positioning, resume writing, job search sprints, interview preparation, and digital tools.</li>
          <li><b>AI Jobseeker Masterclasses &amp; Workshops:</b> Live and recorded training sessions covering AI prompt engineering for job seekers, cover letter automation, and job application strategies.</li>
          <li><b>ATS Resume Vault:</b> A curated repository of battle-tested, ATS-friendly resume templates tailored for competitive industries.</li>
          <li><b>Rider Logistics &amp; Operations Portal:</b> An internal dispatch and driver management interface for logistics coordination.</li>
        </ul>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>3. Specific Terms for "The Resume Hot Seat" Live Streams</h3>
        <p>By submitting your resume to "The Resume Hot Seat" platform, you explicitly acknowledge and agree to the following terms:</p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 2 }}>
          <li><b>Voluntary Public Broadcast Consent:</b> You grant Duncan Makoyo and the Site operators an irrevocable, worldwide license to display, analyze, critique, and broadcast your submitted resume, full name, target role, and career history during live streaming sessions and recorded re-broadcasts across public platforms (including LinkedIn, TikTok, YouTube, X, and Instagram).</li>
          <li><b>Best-Effort Sensitive Data Redaction:</b> While our automated systems and live workflow redact phone numbers, email addresses, and exact physical street addresses prior to broadcast, you acknowledge that redaction is performed on a best-effort basis. You assume all inherent risks associated with live public broadcasting.</li>
          <li><b>Public Critique &amp; Feedback:</b> You acknowledge that live teardowns involve candid, professional critiques of your resume formatting, syntax, and metrics. You agree not to hold the host or Site operators liable for constructive feedback rendered during live streams.</li>
        </ul>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>4. Payments, Billing, and Refunds</h3>
        <p>You agree to adhere to the payment terms associated with each category of Services:</p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 2 }}>
          <li><b>Pay-Per-Download Tools:</b> Single media fixes or batch document compression downloads require a fixed payment processed via Paystack. Because watermarked previews are displayed prior to purchase, all sales are final and non-refundable.</li>
          <li><b>Creator Subscription Plan:</b> A monthly subscription granting unlimited downloads for video and photo tools. Subscriptions are billed automatically until canceled. Canceled subscriptions remain active until the end of the billing period and are non-refundable.</li>
          <li><b>HookBunker Developer Subscription Plans:</b> Optional upgrade tiers processed and auto-renewed securely via Paystack. Failed renewals result in immediate downgrade to the Free Tier. When downgraded, active workspace slots are capped at 1; excess projects are deactivated. Suspended projects do not process callbacks, and we hold zero liability for missed gateway callbacks.</li>
          <li><b>Academy Cohort &amp; Membership Fees:</b> Accelerator cohort registrations and monthly membership subscriptions are processed via Paystack. Once paid, cohort fees and subscription charges are non-refundable.</li>
          <li><b>Professional Consulting Packages:</b> Custom branding, web development, and resume copywriting packages are subject to project-specific pricing. Once project discovery or draft composition has started, fees are non-refundable.</li>
        </ul>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>5. Zero-Guarantees Disclaimer (Absolute Disclaimer of Warranties)</h3>
        <p>THE SERVICES, TOOLS, TEMPLATES, ANALYSIS REPORTS, AND LIVE BROADCASTS ARE PROVIDED STRICTLY ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND. DUNCAN MAKOYO AND THE SITE OPERATORS EXPRESSLY DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, AND NON-INFRINGEMENT.</p>
        <p><b>WE OFFER ZERO GUARANTEES REGARDING CAREER OR BUSINESS OUTCOMES, INCLUDING BUT NOT LIMITED TO:</b></p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 2 }}>
          <li><b>NO JOB OR INTERVIEW GUARANTEE:</b> We do NOT guarantee, warrant, or promise that using the ATS Simulator, participating in The Resume Hot Seat, downloading Resume Vault templates, or enrolling in Career Academy will result in job interviews, callback calls, employment offers, salary increases, or career advancements. All tools provide educational analysis only.</li>
          <li><b>NO BUSINESS OR REVENUE GUARANTEE:</b> We do NOT guarantee increases in web traffic, business leads, sales conversions, search engine rankings, or digital revenue from custom web development, HookBunker proxy usage, or SEO packages.</li>
          <li><b>NO THIRD-PARTY ACCEPTANCE GUARANTEE:</b> We do NOT guarantee acceptance of processed photos, videos, or documents by any government portal (eCitizen, KRA), visa office, school portal, or corporate Applicant Tracking System.</li>
        </ul>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>6. Limitation of Liability &amp; Full Legal Indemnification</h3>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL DUNCAN MAKOYO, THE SITE OPERATORS, ITS AGENTS, OR SERVICE PROVIDERS BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, EMPLOYMENT OPPORTUNITIES, REJECTION BY EMPLOYERS, BUSINESS DOWNTIME, TRANSACTION FAILURES, REVENUE LOSSES, OR SYSTEM FAILURES.</p>
        <p><b>YOU AGREE TO FULLY INDEMNIFY, DEFEND, AND HOLD HARMLESS DUNCAN MAKOYO AND THE OPERATORS</b> from and against any and all claims, damages, liabilities, losses, costs, or expenses (including legal fees) arising from: (i) your use or misuse of the Site, ATS tools, Resume Hot Seat live streams, HookBunker proxy gateways, or Career Academy portals; (ii) any career, employment, financial, or business outcomes resulting from our consulting, teardowns, or mentorship; (iii) your voluntary participation and document submission for live broadcast sessions; (iv) any third-party claims regarding intellectual property infringement in materials you submitted; or (v) any service interruptions, gateway callback delays, or browser-processing crashes. Under no circumstances shall our cumulative liability exceed the exact amount paid by you for the specific service transaction in dispute.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>7. Governing Law and Disputes</h3>
        <p>These Terms of Use shall be governed by, construed, and enforced in accordance with the laws of the Republic of Kenya. Any legal actions or disputes arising from these Terms or the Services shall be submitted to the exclusive jurisdiction of the courts of Nairobi, Kenya.</p>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem', maxWidth: '850px' }}>
      <button
        onClick={() => setCurrentPath('services')}
        className="btn"
        style={{ background: 'none', color: 'var(--text-muted)', padding: 0, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <ArrowLeft size={18} /> Back to Home
      </button>
      <h1>Privacy Policy</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Last Updated: July 2026</p>
      <div style={{ marginTop: '2rem', lineHeight: 1.8, color: 'var(--text-muted)' }}>
        <p>This Privacy Policy describes how we collect, process, and protect your personal information across all products offered on duncanmakoyo.com ("the Site"), including ImageKE media tools, ATS Simulator, The Resume Hot Seat live streams, LinkedIn Scorecard, HookBunker developer proxy, and Career Academy programs.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>1. Browser-Native Processing (Zero Server Transmission)</h3>
        <p>For the ImageKE Photo and Video editing tools (including compressor, aspect cropper, watermarker, and frame extractors), **all rendering is conducted locally in your web browser using WebAssembly and canvas technologies**. Your uploaded photos, logo overlays, and video streams never leave your device and are never sent to our servers.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>2. Data We Collect Across All Products</h3>
        <p>We collect personal and professional information under the following conditions:</p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 2 }}>
          <li><b>Career Forms &amp; Consultation:</b> When you submit service requests, we collect your name, email, phone number, LinkedIn URL, target job fields, and uploaded CV files.</li>
          <li><b>ATS Simulator (V2):</b> When you use the standalone simulator, your resume data is processed in memory to generate your readiness score. No parsed resume text is stored permanently on our servers.</li>
          <li><b>The Resume Hot Seat Submissions:</b> When you submit a resume for live broadcast teardowns, we collect your full name, email, target role, and uploaded PDF. As outlined in the Terms, your sensitive contact details (phone, email, street address) are redacted prior to streaming on public channels.</li>
          <li><b>HookBunker Transaction Logs:</b> We temporarily store transactional payload metadata received from payment gateways (M-Pesa, Paystack, Payhero) on your behalf. Database records are secured in Supabase PostgreSQL tables with strict Row-Level Security (RLS) policies and pruned automatically according to your plan tier.</li>
          <li><b>Billing Data:</b> Email addresses and transaction references collected during Paystack checkout are processed securely. Credit card details and M-Pesa PINs are handled directly by Paystack and are never stored by us.</li>
        </ul>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>3. How We Use and Share Information</h3>
        <p>We use your information exclusively to deliver the requested Services, refine your CV drafts, conduct requested live teardowns, host client websites, verify payments, route webhook payloads, and communicate project updates. We **never sell, share, rent, or trade your personal data, resume details, contact lists, developer transaction payloads, or media files** with third-party advertising or marketing agencies.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>4. Data Protection and Retention</h3>
        <p>We store financial transaction records for 7 years to comply with Kenyan tax accounting audits. Completed client CV drafts and audit logs are retained for 1 year to assist you with future revisions, after which they are permanently deleted. You can request the immediate deletion of your career files at any time by contacting us.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>5. Legal Compliance</h3>
        <p>This Privacy Policy is designed to comply with the Data Protection Act of the Republic of Kenya. By using any of our Services, you consent to our privacy practices as outlined herein.</p>
      </div>
    </div>
  );


  // ── Video Helpers ─────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  // ROOT
  // ─────────────────────────────────────────────────────────────────────────────
  // ─── Navigate to Tools from Services Page ────────────────────────────────────
  const navigateToPath = (path) => {
    if (path === 'services') window.location.hash = '#/';
    else if (path === 'ats') window.location.hash = '#/ats';
    else if (path === 'hotseat' || path === 'resume-hotseat') window.location.hash = '#/products/resume-hotseat';
    else if (path === 'home' || path === 'photo-tools' || path === 'tools' || path === 'video-tools' || path === 'photo-video') window.location.hash = '#/photo-tools';
    else if (path === 'batch') window.location.hash = '#/batch';
    else if (path === 'custom') window.location.hash = '#/custom';
    else if (path === 'terms') window.location.hash = '#/terms';
    else if (path === 'privacy') window.location.hash = '#/privacy';

    // Academy paths navigation
    else if (path === 'academy') window.location.hash = '#/academy';
    else if (path === 'academy-dashboard') window.location.hash = '#/academy/dashboard';

    // Workshop path navigation
    else if (path === 'workshop') window.location.hash = '#/workshop';
    else if (path === 'workshop-join') window.location.hash = '#/workshop/join';

    // HookBunker paths navigation
    else if (path === 'hookbunker') window.location.hash = '#/hookbunker';
    else if (path === 'hookbunker-docs') window.location.hash = '#/hookbunker/docs';
    else if (path === 'hookbunker-dashboard') window.location.hash = '#/hookbunker/dashboard';
    else if (path === 'hookbunker-terms') window.location.hash = '#/terms';
    else if (path === 'hookbunker-privacy') window.location.hash = '#/privacy';

    else window.location.hash = `#/${path}`;
  };

  const handleNavigateToTools = () => {
    window.location.hash = '#/photo-tools';
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Suspense fallback={
        <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: '#fafafa', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading interface...</p>
          </div>
        </div>
      }>

        {/* ── Services Landing Page ── */}
        {currentPath === 'services' && (
          <ServicesPage
            onNavigateToTools={handleNavigateToTools}
            onNavigateToPath={navigateToPath}
          />
        )}

        {/* ── ATS Resume Vault ── */}
        {currentPath === 'vault' && (
          <ATSResumeVault onNavigate={navigateToPath} />
        )}

        {/* ── Resume Hot Seat Landing ── */}
        {currentPath === 'hotseat' && (
          <ResumeHotSeatLanding onNavigate={(path, payload) => {
            if (payload && path === 'ats') setAtsHandoffState(payload);
            setCurrentPath(path);
            window.location.hash = `#/${path}`;
          }} />
        )}

        {/* ── ATS Simulator ── */}
        {currentPath === 'ats' && (
          <ATSSimulator
            onBack={() => { setAtsHandoffState(null); window.location.hash = '#/'; }}
            handoffPayload={atsHandoffState}
          />
        )}

        {/* ── LinkedIn Recruiter POV Scorecard ── */}
        {currentPath === 'linkedin' && (
          <LinkedInScorecard onBack={() => window.location.hash = '#/'} />
        )}

        {/* ── HookBunker Landing Page ── */}
        {currentPath === 'hookbunker-landing' && (
          <HookBunkerLanding onNavigate={(path, payload) => {
            setCurrentPath(path);
            window.location.hash = `#/${path}`;
          }} />
        )}

        {/* ── Academy Auth View ── */}
        {currentPath === 'academy-auth' && (
          <AcademyAuth onAuthSuccess={() => { setCurrentPath('academy-dashboard'); window.location.hash = '#/academy/dashboard'; }} />
        )}

        {/* ── Academy Dashboard View ── */}
        {currentPath === 'academy-dashboard' && (
          <AcademyDashboard onNavigate={(path, payload) => {
            if (payload && path === 'ats') setAtsHandoffState(payload);
            setCurrentPath(path);
            window.location.hash = `#/${path}`;
          }} />
        )}

        {/* ── Workshop Landing View ── */}
        {currentPath === 'workshop' && (
          <WorkshopLanding onNavigate={navigateToPath} />
        )}

        {/* ── Workshop Join Gateway ── */}
        {currentPath === 'workshop-join' && (
          <WorkshopJoin />
        )}

        {currentPath === 'rider-login' && <RiderLogin />}
        {currentPath === 'rider-dashboard' && <RiderDashboard />}

        {/* ── Legal pages (standalone, minimal header) ── */}
        {(currentPath === 'terms' || currentPath === 'privacy') && (
          <>
            <header className="app-header">
              <div
                className="app-logo"
                onClick={() => window.location.hash = '#/'}
                role="button" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && (window.location.hash = '#/')}
                aria-label="Back to home"
              >
                <span className="app-logo-text">[KE] ImageKE <span className="app-logo-badge">PRO</span></span>
              </div>
            </header>
            <div style={{ flex: 1 }}>
              {currentPath === 'terms' && renderTerms()}
              {currentPath === 'privacy' && renderPrivacy()}
            </div>
            <footer style={{ padding: '2rem 0', textAlign: 'center', borderTop: '1px solid var(--border)', background: 'var(--card-bg)' }}>
              <div className="container">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>&copy; {new Date().getFullYear()} Duncan Makoyo. All rights reserved.</p>
              </div>
            </footer>
          </>
        )}

        {/* ── ImageKE Photo & Video Tools (Lazy loaded) ── */}
        {currentPath !== 'services' &&
          currentPath !== 'terms' &&
          currentPath !== 'privacy' &&
          currentPath !== 'ats' &&
          currentPath !== 'linkedin' &&
          currentPath !== 'vault' &&
          currentPath !== 'workshop' &&
          currentPath !== 'workshop-join' &&
          !currentPath.startsWith('hookbunker') &&
          !currentPath.startsWith('academy') &&
          !currentPath.startsWith('rider') && (
            <ImageVideoTools
              currentPath={currentPath}
              currentTab={currentTab}
              setCurrentPath={setCurrentPath}
              setCurrentTab={setCurrentTab}
            />
          )}
      </Suspense>
    </div>
  );
}

export default App;
