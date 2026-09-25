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
    <div style={{
      backgroundColor: '#090a0e',
      backgroundImage: 
        'radial-gradient(circle at 85% 10%, rgba(255, 84, 20, 0.18) 0%, transparent 55%), ' +
        'radial-gradient(circle at 15% 90%, rgba(0, 230, 118, 0.10) 0%, transparent 45%), ' +
        'radial-gradient(circle at 50% 50%, rgba(9, 10, 14, 0.85) 0%, transparent 100%)',
      minHeight: '100vh',
      padding: '3rem 1.5rem 6rem',
      color: '#cbd5e1',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <button
          onClick={() => window.location.hash = '#/'}
          style={{
            background: 'rgba(255, 84, 20, 0.12)',
            border: '1.5px solid rgba(255, 84, 20, 0.4)',
            color: '#ff5414',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            marginBottom: '2.5rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            transition: 'all 0.2s ease'
          }}
        >
          <ArrowLeft size={16} /> Back to Ventures
        </button>

        <div style={{
          background: 'rgba(17, 19, 26, 0.96)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1.5px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '24px',
          padding: 'clamp(1.75rem, 5vw, 3.5rem)',
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 84, 20, 0.15)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #ff5414, transparent)',
            borderRadius: '0 0 4px 4px'
          }}></div>

          <div style={{
            display: 'inline-block',
            background: 'rgba(255, 84, 20, 0.14)',
            color: '#ff5414',
            padding: '0.35rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '1rem'
          }}>
            Legal &bull; Operational Terms
          </div>

          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            color: '#ffffff',
            fontSize: 'clamp(2rem, 4vw, 2.8rem)',
            fontWeight: 800,
            lineHeight: 1.2,
            margin: '0 0 0.75rem'
          }}>
            Terms of Service &amp; Operational Disclaimers
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            Effective Date: September 2026 &bull; MAKOYOCART VENTURES (Registration No: BN-WLSP9KP9) &bull; Operating duncanmakoyo.com
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>
            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#ff5414' }}>1.</span> Acceptance of Terms &amp; Authority
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
                By accessing or utilizing the websites, physical networking infrastructure, software proxies, or automated communication pipelines operated by <strong style={{ color: '#ffffff' }}>MAKOYOCART VENTURES</strong> (including duncanmakoyo.com, CampusNet Wi-Fi captive portals, HookBunker proxy endpoints, and Meta WhatsApp Cloud automation), you explicitly agree to be legally bound by these Terms of Service. If you disagree with any portion of these terms, you must terminate network connections and discontinue use immediately.
              </p>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#ff5414' }}>2.</span> CampusNet Wi-Fi Service Terms
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: '0 0 0.75rem' }}>
                CampusNet delivers autonomous prepaid internet access across student hostels and commercial living quarters. Connectivity is provisioned strictly on an authorized device basis:
              </p>
              <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}><strong style={{ color: '#ffffff' }}>Voucher Passcodes:</strong> Digital vouchers are activated upon confirmation of payment and expire automatically according to the designated duration (e.g., 3 Hours, 24 Hours, Weekly, Monthly).</li>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}><strong style={{ color: '#ffffff' }}>MAC Address Binding:</strong> For network security and bandwidth guarantee, vouchers bind to the physical MAC address of the activating device.</li>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}><strong style={{ color: '#ffffff' }}>Bandwidth Allocation:</strong> Dynamic queue trees on our MikroTik core routers enforce fair bandwidth distribution to prevent choking. Automated speed shaping applies during peak hostel hours.</li>
              </ul>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#ff5414' }}>3.</span> Acceptable Use &amp; Zero Tolerance Policy
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
                CampusNet is an educational and productivity internet utility. Users are strictly prohibited from utilizing the network for unauthorized port scanning, denial of service (DoS/DDoS) operations, distribution of malicious software, torrent piracy, illegal financial fraud, or any activities in violation of the Kenya Computer Misuse and Cybercrimes Act, 2018. We reserve the immediate right to blacklist offending MAC addresses without refund.
              </p>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#ff5414' }}>4.</span> Payments, Safaricom M-Pesa &amp; Reconciliation
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
                All transactions are denominated in Kenyan Shillings (KES) and processed securely via licensed mobile money providers (Safaricom Daraja M-Pesa STK Push / Paystack). Vouchers are disbursed instantaneously upon cryptographic webhook acknowledgement. In the rare event of a mobile carrier delay where funds are deducted without voucher generation, our automated background reconciler verifies the transaction reference code and credits the connection or provides a replacement voucher.
              </p>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#ff5414' }}>5.</span> Meta WhatsApp Automated Communication
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
                Customers initiating Wi-Fi purchases or technical inquiries consent to receive transactional confirmations, duration receipts, and diagnostic prompts through our verified Meta WhatsApp Cloud API integration. We respect customer attention: no third-party spam or irrelevant promotional broadcasts will ever be dispatched. Users can discontinue receiving automated messages at any time by replying <strong style={{ color: '#ffffff' }}>STOP</strong>.
              </p>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#ff5414' }}>6.</span> Systems Engineering &amp; Client Engagements
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
                Commercial consulting, bespoke network deployments, and webhook proxy integrations executed by Duncan Makoyo for external clients are governed by explicit Statements of Work (SOW). Delivery timelines, hardware warranties, and intellectual property transfers are defined per contract.
              </p>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#ff5414' }}>7.</span> Limitations of Liability &amp; Telecom Boundaries
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
                While our systems utilize high-availability MikroTik hardware, automated watchdog scripts, and battery backup systems, internet services depend on third-party upstream telecommunication providers. MAKOYOCART VENTURES and Duncan Makoyo shall not be held liable for upstream national fiber cuts, regional power grid failures exceeding backup capacity, or mobile carrier payment network downtime.
              </p>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#ff5414' }}>8.</span> Governing Law &amp; Jurisdiction
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
                These terms are governed by and construed in accordance with the laws of the <strong style={{ color: '#ffffff' }}>Republic of Kenya</strong>. Any disputes arising under these terms shall be submitted to the exclusive jurisdiction of the competent courts in Kisii or Nairobi, Kenya.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div style={{
      backgroundColor: '#090a0e',
      backgroundImage: 
        'radial-gradient(circle at 85% 10%, rgba(255, 84, 20, 0.18) 0%, transparent 55%), ' +
        'radial-gradient(circle at 15% 90%, rgba(0, 230, 118, 0.10) 0%, transparent 45%), ' +
        'radial-gradient(circle at 50% 50%, rgba(9, 10, 14, 0.85) 0%, transparent 100%)',
      minHeight: '100vh',
      padding: '3rem 1.5rem 6rem',
      color: '#cbd5e1',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <button
          onClick={() => window.location.hash = '#/'}
          style={{
            background: 'rgba(255, 84, 20, 0.12)',
            border: '1.5px solid rgba(255, 84, 20, 0.4)',
            color: '#ff5414',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            marginBottom: '2.5rem',
            fontWeight: 700,
            fontSize: '0.9rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            transition: 'all 0.2s ease'
          }}
        >
          <ArrowLeft size={16} /> Back to Ventures
        </button>

        <div style={{
          background: 'rgba(17, 19, 26, 0.96)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1.5px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '24px',
          padding: 'clamp(1.75rem, 5vw, 3.5rem)',
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 84, 20, 0.15)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #00e676, transparent)',
            borderRadius: '0 0 4px 4px'
          }}></div>

          <div style={{
            display: 'inline-block',
            background: 'rgba(0, 230, 118, 0.14)',
            color: '#00e676',
            padding: '0.35rem 0.85rem',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '1rem'
          }}>
            Privacy &bull; Data Protection
          </div>

          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            color: '#ffffff',
            fontSize: 'clamp(2rem, 4vw, 2.8rem)',
            fontWeight: 800,
            lineHeight: 1.2,
            margin: '0 0 0.75rem'
          }}>
            Privacy Policy &amp; Data Protection
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            Effective Date: September 2026 &bull; In Full Compliance with the Kenya Data Protection Act, 2019
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>
            <div>
              <p style={{ color: '#f1f5f9', fontSize: '1.05rem', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>
                <strong style={{ color: '#ffffff' }}>MAKOYOCART VENTURES</strong> (Registration No: BN-WLSP9KP9, operating duncanmakoyo.com and the CampusNet hostel network) is strictly committed to safeguarding user confidentiality and protecting personal information in full alignment with the <strong style={{ color: '#00e676' }}>Kenya Data Protection Act, 2019 (KDPA)</strong> and international privacy best practices.
              </p>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#00e676' }}>1.</span> Information We Collect
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: '0 0 0.75rem' }}>
                We follow a strict principle of data minimization—collecting only the precise data points necessary to deliver reliable network access and client communications:
              </p>
              <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                  <strong style={{ color: '#ffffff' }}>Wi-Fi Operations:</strong> Hardware MAC address (required to bind prepaid voucher sessions and prevent credential hijacking), user telephone number (provided by the customer for M-Pesa voucher delivery), IP lease duration, and aggregate bandwidth consumption.
                </li>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                  <strong style={{ color: '#ffffff' }}>Engineering &amp; Business Inquiries:</strong> Contact name, business email, WhatsApp contact number, and technical project scope submitted voluntarily through our consultation forms.
                </li>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                  <strong style={{ color: '#ffffff' }}>Payment Verification:</strong> Cryptographic transaction reference codes (e.g. Safaricom M-Pesa receipt code), amount paid, and timestamp. <strong style={{ color: '#ff5414' }}>We never receive, access, or store M-Pesa PIN numbers, bank account logins, or debit/credit card CVVs.</strong>
                </li>
              </ul>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#00e676' }}>2.</span> How We Use Your Information
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: '0 0 0.75rem' }}>
                Collected data is utilized strictly for direct operational fulfillment:
              </p>
              <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>To maintain uninterrupted hostel Wi-Fi sessions and renew expired vouchers.</li>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>To dispatch instant WhatsApp purchase confirmations and automated voucher codes.</li>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>To compute customer loyalty milestones (e.g., awarding free 24-hour passes upon milestone purchases).</li>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>To respond to systems engineering proposals and commercial partnership inquiries.</li>
              </ul>
              <div style={{
                marginTop: '1.25rem',
                background: 'rgba(0, 230, 118, 0.08)',
                border: '1px solid rgba(0, 230, 118, 0.3)',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                color: '#f1f5f9',
                fontSize: '0.95rem'
              }}>
                <strong style={{ color: '#00e676' }}>🛡️ Strict No-Monetization Guarantee:</strong> We do not inspect, log, or sell customer web browsing records, DNS requests, or application payload data. We never sell, lease, or broker your personal information to third-party advertisers or data brokers under any circumstances.
              </div>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#00e676' }}>3.</span> Data Storage, Encryption &amp; Security Standards
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
                Operational records are stored inside encrypted PostgreSQL databases hosted on Supabase, guarded by strict Row-Level Security (RLS) policies that isolate client data. Communication endpoints, webhook listeners, and API channels enforce cryptographic HMAC SHA-512 signatures and TLS 1.3 encryption in transit.
              </p>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#00e676' }}>4.</span> Retention &amp; Automatic Expiry
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: 0 }}>
                Temporary device session bindings automatically expire and are purged when a voucher period concludes. Transactional records are retained only for the duration legally required under Kenyan taxation and financial audit regulations, after which they are irreversibly decommissioned.
              </p>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#00e676' }}>5.</span> Your Statutory Rights Under the KDPA
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: '0 0 0.75rem' }}>
                As a data subject in Kenya, you have the right to:
              </p>
              <ul style={{ paddingLeft: '1.5rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>Request confirmation of whether we hold personal data relating to you.</li>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>Request correction of inaccurate or incomplete personal records.</li>
                <li style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>Request erasure of your contact details or phone number from our loyalty ledger.</li>
              </ul>
            </div>

            <div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#00e676' }}>6.</span> Data Controller Contact Information
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.98rem', lineHeight: 1.8, margin: '0 0 0.75rem' }}>
                For data protection inquiries, access requests, or deletion notices, reach out to our designated Data Controller:
              </p>
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '1.25rem',
                borderRadius: '12px',
                color: '#cbd5e1',
                fontSize: '0.95rem',
                lineHeight: 1.7
              }}>
                <div><strong style={{ color: '#ffffff' }}>Entity:</strong> MAKOYOCART VENTURES (BN-WLSP9KP9)</div>
                <div><strong style={{ color: '#ffffff' }}>Designated Controller:</strong> Duncan Ombiro Makoyo</div>
                <div><strong style={{ color: '#ffffff' }}>Official Email:</strong> <a href="mailto:info@duncanmakoyo.com" style={{ color: '#ff5414', textDecoration: 'none' }}>info@duncanmakoyo.com</a> / <a href="mailto:duncanmakoyo@gmail.com" style={{ color: '#ff5414', textDecoration: 'none' }}>duncanmakoyo@gmail.com</a></div>
                <div><strong style={{ color: '#ffffff' }}>WhatsApp / Direct Phone:</strong> <a href="https://wa.me/254794877125" target="_blank" rel="noopener noreferrer" style={{ color: '#00e676', textDecoration: 'none' }}>+254 794 877 125</a></div>
                <div><strong style={{ color: '#ffffff' }}>Physical Address:</strong> Mwamosioma, Kisii-Kilgoris Road, Darajambili, P.O. Box 54, 40200 - Kisii, Kenya</div>
              </div>
            </div>
          </div>
        </div>
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
