import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ArrowLeft, Loader2, ShieldCheck, Lock } from 'lucide-react';
import axios from 'axios';
import ServicesPage from './ServicesPage';

const AcademyAuth = lazy(() => import('./components/academy/AcademyAuth'));
const AcademyDashboard = lazy(() => import('./components/academy/AcademyDashboard'));

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

function ProcessingOverlay({ message }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(9, 9, 11, 0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150,
      backdropFilter: 'blur(4px)', color: '#fff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#10b981' }} />
        <p style={{ fontWeight: 600 }}>{message}</p>
      </div>
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
    return 'academy-dashboard';
  }

  if (hash === '#/terms') return 'terms';
  if (hash === '#/privacy') return 'privacy';
  if (hash === '#/admin' || hash === '#/academy/dashboard' || hash === '#/hookbunker/dashboard') return 'academy-dashboard';
  if (hash === '#/login' || hash === '#/academy') return 'academy-auth';

  return 'services';
};

function App() {
  const [currentPath, setCurrentPath] = useState(getPathFromHash);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');

  // Handle email verification token query
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
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
          sessionStorage.setItem('hb_auth_error', err.response?.data?.error || 'Email verification failed.');
        } finally {
          setIsProcessing(false);
          const cleanUrl = window.location.origin + window.location.pathname + '#/academy/dashboard';
          window.location.href = cleanUrl;
        }
      })();
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentPath]);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(getPathFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderTerms = () => (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '4rem 1.5rem', color: '#d4d4d8', lineHeight: 1.8 }}>
      <button
        onClick={() => window.location.hash = '#/'}
        style={{ background: 'none', border: 'none', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '2rem', fontWeight: 600 }}
      >
        <ArrowLeft size={18} /> Back to Home
      </button>
      <h1 style={{ color: '#fff', fontSize: '2.4rem', fontWeight: 800 }}>Terms of Service &amp; Operational Disclaimers</h1>
      <p style={{ color: '#71717a' }}>Last Updated: September 2026 &bull; MAKOYOCART VENTURES</p>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ color: '#fff' }}>1. Acceptance of Terms</h3>
        <p>By accessing or utilizing the websites, networks, or digital tools operated by MAKOYOCART VENTURES (Registration No: BN-WLSP9KP9), including duncanmakoyo.com, CampusNet Wi-Fi access points, WhatsApp automated communication engines, and payment ingestion pipelines, you agree to be legally bound by these Terms of Service.</p>

        <h3 style={{ color: '#fff', marginTop: '2rem' }}>2. CampusNet Wi-Fi Service Terms</h3>
        <p>CampusNet provides prepaid wireless internet connectivity in designated partner hostels and campuses. Access is granted via digital voucher passcodes generated upon M-Pesa confirmation. Bandwidth is fairly allocated per user. We maintain zero tolerance for illegal network activities, malicious port scanning, or unauthorized proxying.</p>

        <h3 style={{ color: '#fff', marginTop: '2rem' }}>3. WhatsApp Automated Communication</h3>
        <p>Users who initiate inquiries or complete Wi-Fi transactions consent to receive transactional confirmations, voucher codes, and operational status updates via the official Meta WhatsApp Cloud API. You can opt out at any time by replying STOP.</p>

        <h3 style={{ color: '#fff', marginTop: '2rem' }}>4. Payments &amp; M-Pesa Transactions</h3>
        <p>All transactions are processed in Kenyan Shillings (KES) through authorized payment providers (Safaricom Daraja / Paystack). Vouchers are delivered instantly upon webhook confirmation. If an M-Pesa deduction occurs during a network partition, automated reconciliation will credit your active session or provide a replacement voucher.</p>

        <h3 style={{ color: '#fff', marginTop: '2rem' }}>5. Limitation of Liability</h3>
        <p>While we engineer resilient hardware and failover routing, services are provided on an "as is" and "as available" basis. MAKOYOCART VENTURES and Duncan Makoyo shall not be liable for upstream ISP fiber cuts, power blackouts exceeding backup UPS thresholds, or third-party telecom downtimes.</p>

        <h3 style={{ color: '#fff', marginTop: '2rem' }}>6. Governing Law</h3>
        <p>These terms are governed by the laws of the Republic of Kenya. Any legal matters shall be subject to the jurisdiction of the courts in Kisii / Nairobi, Kenya.</p>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '4rem 1.5rem', color: '#d4d4d8', lineHeight: 1.8 }}>
      <button
        onClick={() => window.location.hash = '#/'}
        style={{ background: 'none', border: 'none', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '2rem', fontWeight: 600 }}
      >
        <ArrowLeft size={18} /> Back to Home
      </button>
      <h1 style={{ color: '#fff', fontSize: '2.4rem', fontWeight: 800 }}>Privacy Policy</h1>
      <p style={{ color: '#71717a' }}>Last Updated: September 2026 &bull; MAKOYOCART VENTURES</p>

      <div style={{ marginTop: '2rem' }}>
        <p>MAKOYOCART VENTURES (operating duncanmakoyo.com and CampusNet) is committed to protecting the privacy and personal data of our users in compliance with the Kenya Data Protection Act, 2019.</p>

        <h3 style={{ color: '#fff', marginTop: '2rem' }}>1. Information We Collect</h3>
        <p>We collect only the minimal data required to deliver connectivity and engineering services:</p>
        <ul style={{ paddingLeft: '1.5rem' }}>
          <li><b>Wi-Fi Operations:</b> Device MAC address (for captive portal binding), phone number (for M-Pesa voucher delivery), and session connection duration.</li>
          <li><b>Engineering Inquiries:</b> Name, email, WhatsApp contact, and project specifications provided voluntarily via our contact form.</li>
          <li><b>Payment Records:</b> Transaction reference numbers and amounts confirmed via Safaricom/Paystack webhooks. We never store M-Pesa PINs or banking credentials.</li>
        </ul>

        <h3 style={{ color: '#fff', marginTop: '2rem' }}>2. How Information is Used</h3>
        <p>Data is used exclusively to maintain your active internet connection, route automated WhatsApp transaction receipts, track loyalty rewards, and respond to engineering consultation requests. <b>We never sell, rent, or trade user data or browsing records to third parties.</b></p>

        <h3 style={{ color: '#fff', marginTop: '2rem' }}>3. Data Security</h3>
        <p>All database records are secured inside Supabase PostgreSQL instances with Row-Level Security (RLS) policies. Payment and webhook endpoints enforce cryptographic HMAC signatures.</p>

        <h3 style={{ color: '#fff', marginTop: '2rem' }}>4. Contact for Data Requests</h3>
        <p>For data inquiries or deletion requests, contact our data administrator at <b>info@duncanmakoyo.com</b> or via physical mail at P.O. Box 54, 40200 - Kisii, Kenya.</p>
      </div>
    </div>
  );

  return (
    <div className="app-root" style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5' }}>
      {isProcessing && <ProcessingOverlay message={processingMsg} />}

      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#09090b', color: '#10b981' }}>
          <Loader2 size={36} className="animate-spin" />
        </div>
      }>
        {currentPath === 'services' && (
          <ServicesPage onNavigateToPath={(path) => {
            setCurrentPath(path);
            window.location.hash = `#/${path}`;
          }} />
        )}

        {currentPath === 'terms' && renderTerms()}
        {currentPath === 'privacy' && renderPrivacy()}

        {currentPath === 'academy-auth' && (
          <AcademyAuth onNavigate={(path) => {
            setCurrentPath(path);
            window.location.hash = `#/${path}`;
          }} />
        )}

        {currentPath === 'academy-dashboard' && (
          <AcademyDashboard onNavigate={(path) => {
            setCurrentPath(path);
            window.location.hash = `#/${path}`;
          }} />
        )}
      </Suspense>
    </div>
  );
}

export default App;
