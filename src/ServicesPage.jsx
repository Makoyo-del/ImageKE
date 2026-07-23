import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Menu, X, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Brain, Shield, GraduationCap, Zap, 
  Wrench, Check, Mail, Phone, Clock, Globe, Settings, TrendingUp, Target, 
  MessageCircle, MessageSquare, FileText, Briefcase, BarChart, DollarSign,
  Lock, Star
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

// ... (keep career packages config)
const CAREER_PACKAGES = [
  {
    id: 'essential',
    tier: 'Essential',
    priceKES: 2500,
    priceUSD: 20,
    delivery: 'Delivery: 48–72 Hours · 1 Revision',
    features: [
      'ATS-Optimized CV',
      'Professional formatting',
      'Keyword optimization',
      'PDF & Word delivery',
    ],
  },
  {
    id: 'executive',
    tier: 'Executive',
    priceKES: 9500,
    priceUSD: 75,
    delivery: 'Delivery: 24–48 Hours · 3 Revisions',
    featured: true,
    features: [
      'ATS CV Rewrite',
      'Tailored Cover Letter',
      'LinkedIn Profile Optimization',
      '30-min Interview Prep Call',
      'Priority Delivery',
      'Post-delivery support',
    ],
  },
];

// ... (skip down to navbar code)


// ─── Service Options (for form dropdown) ──────────────────────────────────────
const SERVICE_OPTIONS = [
  'ATS CV Writing (Essential — KES 2,500)',
  'Executive Career Package (KES 9,500)',
  'LinkedIn Profile Optimization',
  'Professional Website Development',
  'Digital Presence Setup (Email, Domain, Branding)',
  'Marketing & Growth Support',
  'Free CV Audit',
  'Other / Custom Project',
];

// ─── Paystack helper ───────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Scroll helper ─────────────────────────────────────────────────────────────
function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Services Data ─────────────────────────────────────────────────────────────
const ALL_SERVICES = [
  {
    icon: <FileText size={22} className="text-blue-600" />,
    badge: 'career',
    name: 'ATS CV Writing & Optimization',
    desc: 'Most resumes fail before a recruiter ever reads them. I create ATS-friendly resumes that highlight your achievements and increase your interview rate.',
    outcome: '→ More interview invitations',
    bestFor: ['Job seekers', 'Career changers', 'Recent graduates'],
    ctaLabel: 'Get Started →'
  },
  {
    icon: <Mail size={22} className="text-blue-600" />,
    badge: 'career',
    name: 'Cover Letter Writing',
    desc: 'A strong cover letter separates you from hundreds of applicants. I write customized letters tailored to specific industries and positions.',
    outcome: '→ Stand out from the crowd',
    bestFor: ['Competitive roles', 'Career transitions', 'Specific industries'],
    ctaLabel: 'Get Started →'
  },
  {
    icon: <Briefcase size={22} className="text-blue-600" />,
    badge: 'career',
    name: 'LinkedIn Profile Optimization',
    desc: 'Recruiters search LinkedIn every day. I optimize your profile to improve visibility, build credibility, and attract the right opportunities.',
    outcome: '→ Get discovered by recruiters',
    bestFor: ['Professionals', 'Job seekers', 'Executives'],
    ctaLabel: 'Get Started →'
  },
  {
    icon: <Globe size={22} className="text-indigo-600" />,
    badge: 'business',
    name: 'Professional Website Development',
    desc: 'Your website is often the first impression customers have. I build modern, responsive websites that establish credibility and convert visitors into paying leads.',
    outcome: '→ Turn visitors into paying clients',
    bestFor: ['Small businesses', 'Consultants', 'Agencies'],
    ctaLabel: 'Request a Quote →'
  },
  {
    icon: <Settings size={22} className="text-indigo-600" />,
    badge: 'business',
    name: 'Digital Presence Setup',
    desc: 'Build a complete professional online identity — business email, domain configuration, contact forms, lead generation systems, and online branding.',
    outcome: '→ Look credible online, instantly',
    bestFor: ['New businesses', 'Freelancers', 'Consultants'],
    ctaLabel: 'Request a Quote →'
  },
  {
    icon: <TrendingUp size={22} className="text-indigo-600" />,
    badge: 'business',
    name: 'Marketing & Growth Support',
    desc: 'Strategic online positioning and digital optimization to help businesses attract more customers and grow their revenue consistently.',
    outcome: '→ More customer inquiries',
    bestFor: ['Growing businesses', 'Service providers', 'Personal brands'],
    ctaLabel: 'Request a Quote →'
  }
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ServicesPage({ onNavigateToTools, onNavigateToPath }) {
  // Mobile navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadIframe, setLoadIframe] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', email: '', phone: '', service: '', message: '', wantAudit: false,
  });
  const [formStatus, setFormStatus] = useState(null); // null | 'sending' | 'success' | 'error'
  const [formError, setFormError] = useState('');

  // Payment state
  const [payingPackage, setPayingPackage] = useState(null);
  const [payEmail, setPayEmail] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payError, setPayError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [currency, setCurrency] = useState('KES');

  // Horizontal Services Scroll Ref
  const scrollContainerRef = useRef(null);

  const scrollServices = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = 412.5; // card width (390) + gap (22.5)
    const target = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    container.scrollTo({
      left: target,
      behavior: 'smooth'
    });
  };

  // Load Paystack script on mount
  useEffect(() => {
    if (!document.getElementById('paystack-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Optimize iframe loading to not block initial paint
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadIframe(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // ── Form handlers ──────────────────────────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.service) {
      setFormError('Please fill in your name, email, and service needed.');
      return;
    }
    if (!isValidEmail(form.email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    setFormError('');
    setFormStatus('sending');

    try {
      await axios.post(`${API_URL}/api/submit-service-request`, form);
      setFormStatus('success');
      setForm({ name: '', email: '', phone: '', service: '', message: '', wantAudit: false });
    } catch (err) {
      console.error(err);
      setFormStatus('error');
      const subject = encodeURIComponent(`Service Request: ${form.service}`);
      const body = encodeURIComponent(
        `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nService: ${form.service}\nAudit: ${form.wantAudit ? 'Yes' : 'No'}\n\nMessage:\n${form.message}`
      );
      const mailtoUrl = `mailto:duncan@duncanmakoyo.com?subject=${subject}&body=${body}`;
      setFormError(
        <span>
          Automated submission failed. Please click{' '}
          <a href={mailtoUrl} style={{ color: '#B91C1C', textDecoration: 'underline', fontWeight: 700 }}>
            here to send your request via email
          </a>{' '}
          directly, or contact Duncan on WhatsApp.
        </span>
      );
    }
  };

  // ── Paystack payment ───────────────────────────────────────────────────────
  const initiateCareerPayment = async (pkg) => {
    if (!isValidEmail(payEmail)) {
      setPayError('Please enter a valid email address.');
      return;
    }
    if (!PAYSTACK_PUBLIC_KEY) {
      setPayError('Payment system not configured. Please contact Duncan directly.');
      return;
    }
    if (!window.PaystackPop) {
      setPayError('Payment gateway is loading. Please wait a moment and try again.');
      return;
    }

    setIsPaying(true);
    setPayError('');

    const activePrice = currency === 'USD' ? pkg.priceUSD : pkg.priceKES;

    try {
      const initRes = await axios.post(`${API_URL}/api/initialize-payment`, {
        email: payEmail.trim().toLowerCase(),
        amount: activePrice,
        metadata: { type: 'career_service', package: pkg.id, packageTier: pkg.tier, currency },
      });

      if (!initRes.data?.data?.reference) throw new Error('Invalid payment response.');
      const { reference } = initRes.data.data;

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: payEmail.trim().toLowerCase(),
        amount: activePrice * 100,
        currency: currency,
        ref: reference,
        callback: function (response) {
          (async () => {
            try {
              const verifyRes = await axios.get(`${API_URL}/api/verify-payment/${response.reference}`);
              const ok = verifyRes.data?.status === 'success' || verifyRes.data?.data?.status === 'success';
              if (ok) {
                // Notify Duncan via email
                try {
                  await axios.post(`${API_URL}/api/notify-service-order`, {
                    email: payEmail.trim().toLowerCase(),
                    package: pkg.tier,
                    price: activePrice,
                    reference: response.reference,
                    currency,
                  });
                } catch {}

                setShowPayModal(false);
                setPayEmail('');
                setPayingPackage(null);
                alert(`Payment confirmed! Duncan will contact you at ${payEmail} within 24 hours to begin your ${pkg.tier} package.`);
              } else {
                setPayError('Payment was not confirmed. Please contact Duncan if you were charged.');
              }
            } catch {
              setPayError('Verification failed. Contact Duncan with reference: ' + response.reference);
            } finally {
              setIsPaying(false);
            }
          })();
        },
        onClose: () => setIsPaying(false),
      });
      handler.openIframe();
    } catch (err) {
      setPayError(err.response?.data?.error || err.message || 'Could not start payment.');
      setIsPaying(false);
    }
  };

  const openPayModal = (pkg) => {
    setPayingPackage(pkg);
    setPayEmail('');
    setPayError('');
    setShowPayModal(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dm-page">

      {/* ── Payment Modal ── */}
      {showPayModal && payingPackage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
        }}>
          <div style={{
            background: '#F4F4EE', borderRadius: '0', padding: '2.5rem',
            width: '100%', maxWidth: '440px', margin: '1rem',
            border: '2px solid #111111', boxShadow: '6px 6px 0 #111111',
          }}>
            <div style={{ marginBottom: '1.5rem', borderBottom: '2px solid #111111', paddingBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#D61A3C', marginBottom: '0.5rem', fontFamily: 'Inter, sans-serif' }}>
                // {payingPackage.tier} Package
              </div>
              <h3 style={{ margin: 0, fontFamily: 'Playfair Display, Georgia, serif', fontSize: '2rem', color: '#111111', fontWeight: 900 }}>
                {currency === 'USD' ? '$' : 'KES '}{currency === 'USD' ? payingPackage.priceUSD : payingPackage.priceKES.toLocaleString()}
              </h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#555555', fontFamily: 'Inter, sans-serif' }}>
                Enter your email to proceed. Duncan will contact you within 24 hours after payment.
              </p>
            </div>

            <div style={{ marginBottom: '1rem', border: '2px solid #111111' }}>
              <label className="dm-form-label" style={{ display: 'block' }}>Email Address</label>
              <input
                type="email"
                value={payEmail}
                autoFocus
                onChange={e => { setPayEmail(e.target.value); setPayError(''); }}
                placeholder="you@example.com"
                className="dm-form-input"
                style={{ borderRadius: 0 }}
              />
            </div>

            {payError && (
              <p style={{ color: '#D61A3C', fontSize: '0.85rem', marginBottom: '1rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>{payError}</p>
            )}

            <div style={{ display: 'flex', gap: '0' }}>
              <button
                onClick={() => { setShowPayModal(false); setIsPaying(false); }}
                style={{ flex: 1, padding: '0.875rem', borderRadius: '0', border: '2px solid #111111', borderRight: 'none', background: 'transparent', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                Cancel
              </button>
              <button
                className="dm-pricing-btn primary"
                style={{ flex: 2, borderRadius: 0 }}
                onClick={() => initiateCareerPayment(payingPackage)}
                disabled={isPaying}
              >
                {isPaying ? 'Processing…' : `Pay ${currency === 'USD' ? '$' : 'KES '}${currency === 'USD' ? payingPackage.priceUSD : payingPackage.priceKES.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <nav className="dm-nav" id="top">
        <div className="dm-nav-container">
          <div className="dm-nav-logo" onClick={() => scrollTo('top')}>DM<span>.</span></div>
          <div className="dm-nav-links">
            <button className="dm-nav-link" onClick={() => scrollTo('services')}>Services</button>
            <button className="dm-nav-link" onClick={() => scrollTo('pricing')}>Pricing</button>
            <button className="dm-nav-link" onClick={() => scrollTo('process')}>Process</button>
            
            {/* Dropdown: Products & Tools */}
            {(onNavigateToPath || onNavigateToTools) && (
              <div className="dm-nav-dropdown">
                <button className="dm-nav-dropdown-trigger">
                  Products &amp; Tools <ChevronDown size={12} style={{ marginTop: '1px' }} />
                </button>
                <div className="dm-nav-dropdown-menu">
                  {onNavigateToPath && (
                    <>
                      <button className="dm-nav-dropdown-item" onClick={() => onNavigateToPath('ats')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Brain size={14} className="text-blue-500" /> ATS Simulator
                      </button>
                      <button className="dm-nav-dropdown-item" onClick={() => onNavigateToPath('linkedin')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Briefcase size={14} style={{ color: '#D61A3C' }} /> LinkedIn Recruiter Scorecard
                      </button>
                      <button className="dm-nav-dropdown-item" onClick={() => onNavigateToPath('hookbunker')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={14} className="text-emerald-500" /> HookBunker Proxy
                      </button>

                      <button className="dm-nav-dropdown-item" onClick={() => onNavigateToPath('academy')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GraduationCap size={14} className="text-teal-500" /> Career Academy
                      </button>
                      <button className="dm-nav-dropdown-item" onClick={() => onNavigateToPath('workshop')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={14} className="text-amber-500" /> AI Masterclass
                      </button>
                      <button className="dm-nav-dropdown-item" onClick={() => onNavigateToPath('vault')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={14} className="text-rose-500" /> Resume Vault
                      </button>
                    </>
                  )}
                  {onNavigateToTools && (
                    <button className="dm-nav-dropdown-item" onClick={onNavigateToTools} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Wrench size={14} className="text-slate-400" /> Photo &amp; Video Tools
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Dropdown: Freelance */}
            <div className="dm-nav-dropdown">
              <button className="dm-nav-dropdown-trigger">
                Freelance <ChevronDown size={12} style={{ marginTop: '1px' }} />
              </button>
              <div className="dm-nav-dropdown-menu">
                <a href="https://www.fiverr.com/s/LdwxP1Q" target="_blank" rel="noopener noreferrer" className="dm-nav-dropdown-item" style={{ color: '#1dbf73' }}>
                  Fiverr <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
                </a>
                <a href="https://www.upwork.com/freelancers/~013bd30757def45e6d?mp_source=share" target="_blank" rel="noopener noreferrer" className="dm-nav-dropdown-item" style={{ color: '#14a800' }}>
                  Upwork <ExternalLink size={11} style={{ marginLeft: 'auto' }} />
                </a>
              </div>
            </div>

            <button className="dm-nav-link" onClick={() => scrollTo('about')}>About</button>
            <button className="dm-nav-link" onClick={() => scrollTo('contact')}>Contact</button>
          </div>
          <button className="dm-nav-cta" onClick={() => scrollTo('contact')}>
            Request Service
          </button>
          <button
            className="dm-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="dm-mobile-menu">
          <div className="dm-mobile-section-title">Core Navigation</div>
          <button className="dm-mobile-link" onClick={() => { scrollTo('services'); setMobileMenuOpen(false); }}>Services</button>
          <button className="dm-mobile-link" onClick={() => { scrollTo('pricing'); setMobileMenuOpen(false); }}>Pricing</button>
          <button className="dm-mobile-link" onClick={() => { scrollTo('process'); setMobileMenuOpen(false); }}>Process</button>
          <button className="dm-mobile-link" onClick={() => { scrollTo('about'); setMobileMenuOpen(false); }}>About</button>
          <button className="dm-mobile-link" onClick={() => { scrollTo('contact'); setMobileMenuOpen(false); }}>Contact</button>

          {(onNavigateToPath || onNavigateToTools) && (
            <>
              <div className="dm-mobile-section-title">Products &amp; Tools</div>
              {onNavigateToPath && (
                <>
                  <button className="dm-mobile-link" onClick={() => { onNavigateToPath('ats'); setMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Brain size={16} /> ATS Simulator
                  </button>
                  <button className="dm-mobile-link" onClick={() => { onNavigateToPath('linkedin'); setMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D61A3C' }}>
                    <Briefcase size={16} /> LinkedIn Recruiter Scorecard
                  </button>
                  <button className="dm-mobile-link" onClick={() => { onNavigateToPath('hookbunker'); setMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                    <Shield size={16} /> HookBunker Proxy
                  </button>

                  <button className="dm-mobile-link" onClick={() => { onNavigateToPath('academy'); setMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#14B8A6' }}>
                    <GraduationCap size={16} /> Career Academy
                  </button>
                  <button className="dm-mobile-link" onClick={() => { onNavigateToPath('workshop'); setMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22C55E' }}>
                    <Zap size={16} /> AI Masterclass
                  </button>
                  <button className="dm-mobile-link" onClick={() => { onNavigateToPath('vault'); setMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e' }}>
                    <FileText size={16} /> Resume Vault
                  </button>
                </>
              )}
              {onNavigateToTools && (
                <button className="dm-mobile-link" onClick={() => { onNavigateToTools(); setMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={16} /> Photo &amp; Video Tools
                </button>
              )}
            </>
          )}

          <div className="dm-mobile-section-title">Freelance Platforms</div>
          <a href="https://www.fiverr.com/s/LdwxP1Q" target="_blank" rel="noopener noreferrer" className="dm-mobile-link" style={{ color: '#1dbf73' }} onClick={() => setMobileMenuOpen(false)}>
            Fiverr <ExternalLink size={12} style={{ display: 'inline', marginLeft: '6px', verticalAlign: 'middle' }} />
          </a>
          <a href="https://www.upwork.com/freelancers/~013bd30757def45e6d?mp_source=share" target="_blank" rel="noopener noreferrer" className="dm-mobile-link" style={{ color: '#14a800' }} onClick={() => setMobileMenuOpen(false)}>
            Upwork <ExternalLink size={12} style={{ display: 'inline', marginLeft: '6px', verticalAlign: 'middle' }} />
          </a>

          <button className="dm-mobile-cta" style={{ marginTop: '1rem' }} onClick={() => { scrollTo('contact'); setMobileMenuOpen(false); }}>
            Request Service
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-hero" id="hero">
        <div className="dm-container" style={{ width: '100%' }}>
          <div className="dm-hero-grid">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              {/* Swiss Editorial monogram — stark ink block */}
              <div style={{
                display: 'inline-block',
                background: '#D61A3C',
                color: '#fff',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                fontSize: '0.65rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: '6px 16px',
                marginBottom: '2rem',
                border: '2px solid #111111',
              }}>
                // Career Consulting · Digital Strategy
              </div>

              <h1 className="dm-hero-headline">
                Land High-Paying Roles,<br />
                Dominate the ATS, and<br />
                <em>Accelerate Your Career</em>
              </h1>

              <p className="dm-hero-sub">
                Premium ATS-Optimized CV Writing, LinkedIn Profile Overhauls, and Strategic Career Positioning. Engineered to get you past the algorithms and into the interview room.
              </p>

              <div className="dm-hero-btns">
                <button className="dm-btn-primary" onClick={() => onNavigateToPath('ats')}>
                  Try Free ATS Audit →
                </button>
                <button className="dm-btn-outline" onClick={() => scrollTo('pricing')}>
                  View Packages
                </button>
              </div>

              {/* Smaller client platform links row */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>Also on:</span>
                <a href="https://www.fiverr.com/s/LdwxP1Q" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#1dbf73', fontWeight: 700, textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Fiverr <ExternalLink size={10} />
                </a>
                <a href="https://www.upwork.com/freelancers/~013bd30757def45e6d?mp_source=share" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#14a800', fontWeight: 700, textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Upwork <ExternalLink size={10} />
                </a>
              </div>

              <div className="dm-hero-social-proof" style={{ marginTop: '2rem' }}>
                <span className="dm-stars">★★★★★</span>
                <span>Trusted by professionals and growing businesses worldwide</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          MOVING RIBBON (Infinite Marquee)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="dm-trust-bar">
        <div className="dm-marquee-track">
          {[1, 2, 3, 4].map(idx => (
            <div className="dm-marquee-group" key={idx}>
              {[
                'ATS Resume Optimization',
                'LinkedIn Branding',
                'Business Websites',
                'Professional Email Setup',
                'Digital Growth',
              ].map(item => (
                <div className="dm-trust-item" key={item}>
                  <span className="dm-trust-check">✓</span>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          WHY WORK WITH ME
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" style={{ background: '#F4F4EE' }}>
        <div className="dm-container">
          <span className="dm-section-label">Why Choose Me</span>
          <h2 className="dm-section-title">Results, Not Just <em style={{ color: '#D61A3C', fontStyle: 'italic' }}>Services</em></h2>
          <p className="dm-section-sub" style={{ marginBottom: '3rem' }}>
            I combine technology, marketing, and professional branding to help individuals and businesses create a stronger presence — and convert opportunities into real outcomes.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0', border: '2px solid #111111' }}>
            {[
              { icon: <FileText size={18} />, title: 'ATS-Optimized CVs', desc: 'Resumes engineered to pass recruiter screening systems and reach human decision-makers.' },
              { icon: <Briefcase size={18} />, title: 'LinkedIn Visibility', desc: 'Profiles that attract recruiters, showcase credibility, and generate inbound opportunities.' },
              { icon: <Globe size={18} />, title: 'Professional Websites', desc: 'Modern, responsive sites that build trust and convert visitors into paying customers.' },
              { icon: <Zap size={18} />, title: 'Fast & Reliable', desc: 'Clear communication, fast turnaround times, and consistent delivery — every project.' },
              { icon: <BarChart size={18} />, title: 'Measurable Results', desc: 'Digital solutions engineered to generate interviews, clients, and real business growth.' },
              { icon: <DollarSign size={18} />, title: 'Affordable Quality', desc: 'Premium-level work at fair pricing — no hidden fees, no generic templates.' },
            ].map((item, i) => (
              <div key={item.title} style={{
                display: 'flex', gap: '1rem', padding: '1.75rem',
                background: '#F4F4EE',
                borderRight: (i % 3 !== 2) ? '2px solid #111111' : 'none',
                borderBottom: i < 3 ? '2px solid #111111' : 'none',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff'}
              onMouseLeave={e => e.currentTarget.style.background = '#F4F4EE'}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '0',
                  background: '#111111', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: '#F4F4EE',
                }}>
                  {item.icon}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.3rem', color: '#111111', fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#555555', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FREE CAREER DIAGNOSTIC LEAD MAGNETS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" style={{ background: '#FFFFFF', borderTop: '2px solid #111111', borderBottom: '2px solid #111111', padding: '4.5rem 0' }}>
        <div className="dm-container">
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3rem' }}>
            <span className="dm-section-label" style={{ color: '#D61A3C' }}>FREE DIAGNOSTIC TOOLS</span>
            <h2 className="dm-section-title" style={{ fontSize: '2.2rem' }}>
              Test Your Job Search Ready Score <em style={{ color: '#D61A3C', fontStyle: 'italic' }}>In 30 Seconds</em>
            </h2>
            <p style={{ color: '#555555', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
              Use our proprietary recruitment simulation tools to test if your resume passes corporate ATS filters and evaluate how recruiters rank your profile on LinkedIn.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            
            {/* Tool 1: ATS Simulator */}
            <div style={{ border: '2px solid #111111', background: '#F4F4EE', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ background: '#111111', color: '#FFFFFF', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.5rem', textTransform: 'uppercase' }}>
                    TOOL #1 // RESUME PARSER
                  </span>
                  <Brain size={24} color="#111111" />
                </div>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                  ATS Resume Simulator
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#555555', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                  Upload your CV to test formatting, multi-column risks, keyword extraction, and overall ATS compliance before applying for corporate roles.
                </p>
              </div>
              <button
                onClick={() => onNavigateToPath && onNavigateToPath('ats')}
                style={{
                  width: '100%',
                  background: '#111111',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.85rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}>
                TEST YOUR RESUME NOW →
              </button>
            </div>

            {/* Tool 2: LinkedIn Scorecard */}
            <div style={{ border: '2px solid #111111', background: '#FFFFFF', padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ background: '#D61A3C', color: '#FFFFFF', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.5rem', textTransform: 'uppercase' }}>
                    TOOL #2 // RECRUITER POV
                  </span>
                  <Briefcase size={24} color="#D61A3C" />
                </div>
                <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                  LinkedIn Recruiter Scorecard
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#555555', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                  Simulate what HR &amp; headhunters see when searching for your target job title. Discover missing search terms &amp; get a free headline rewrite.
                </p>
              </div>
              <button
                onClick={() => onNavigateToPath && onNavigateToPath('linkedin')}
                style={{
                  width: '100%',
                  background: '#D61A3C',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.85rem',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}>
                RUN LINKEDIN AUDIT →
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SERVICES (Redesigned: Horizontal Scroll Slider with Arrows)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" id="services" style={{ background: 'var(--dm-bg)', padding: '5.5rem 0', overflow: 'hidden' }}>
        <div className="dm-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <div>
              <span className="dm-section-label">What I Offer</span>
              <h2 className="dm-section-title" style={{ margin: 0 }}>Services</h2>
            </div>
            
            {/* Scroll Navigation Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <button 
                onClick={() => scrollServices('left')}
                className="dm-scroll-btn"
                aria-label="Scroll Left"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => scrollServices('right')}
                className="dm-scroll-btn"
                aria-label="Scroll Right"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <p className="dm-section-sub" style={{ marginTop: 0, marginBottom: '2.5rem', textAlign: 'left' }}>
            Every service is designed around a specific outcome — not just a deliverable.
          </p>
        </div>

        {/* Horizontal scroll track */}
        <div className="dm-services-track-wrapper" ref={scrollContainerRef}>
          <div className="dm-services-track">
            {ALL_SERVICES.map(svc => (
              <div key={svc.name} className="dm-service-card">
                {/* Header band */}
                <div className="dm-service-card-head">
                  <div className="dm-service-card-glow" />
                  <div className="dm-service-icon">{svc.icon}</div>
                  <h3 className="dm-service-name">{svc.name}</h3>
                </div>
                {/* Card body */}
                <div className="dm-service-card-body">
                  <span className={`dm-service-badge ${svc.badge}`}>{svc.badge === 'career' ? 'Career Service' : 'Business Growth'}</span>
                  <p className="dm-service-desc">{svc.desc}</p>
                  {svc.bestFor && (
                    <div className="dm-service-tags">
                      {svc.bestFor.map(b => (
                        <span key={b} style={{ fontSize: '0.72rem', background: 'var(--dm-bg)', color: 'var(--dm-slate)', border: '1px solid var(--dm-border)', borderRadius: '20px', padding: '2px 10px' }}>{b}</span>
                      ))}
                    </div>
                  )}
                  <div className="dm-service-outcome">{svc.outcome}</div>
                  <button className="dm-service-cta" onClick={() => scrollTo('contact')}>{svc.ctaLabel}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS (Redesigned: Vertical Timeline)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" id="process" style={{ background: '#F4F4EE', color: '#111111' }}>
        <div className="dm-container" style={{ maxWidth: '1000px' }}>
          <span className="dm-section-label" style={{ color: 'var(--dm-primary)' }}>The Process</span>
          <h2 className="dm-section-title" style={{ color: '#090e1a', marginBottom: '3.5rem' }}>How It Works</h2>

          <div className="dm-timeline">
            {[
              {
                num: '1',
                phase: 'Step 1: Lead Inquiry',
                title: 'Submit Your Request',
                desc: 'Fill in the simple request form below or send me a message on WhatsApp. Share your career goals, targeted roles, or details about the business website you need built.',
              },
              {
                num: '2',
                phase: 'Step 2: Review & Alignment',
                title: 'Tailored Consultation',
                desc: 'I review your current CV, profile, or project details. We will schedule a brief discussion or exchange key questions to align on the perfect layout and messaging strategy.',
              },
              {
                num: '3',
                phase: 'Step 3: Custom Development',
                title: 'Drafting & Premium Delivery',
                desc: 'I write and structure your ATS-optimized CV, optimize your LinkedIn profile, or build your custom website. You receive premium-quality deliverables within our agreed timeline.',
              },
              {
                num: '4',
                phase: 'Step 4: Launch & Revisions',
                title: 'Support & Revisions',
                desc: 'We review the work together. I implement any requested revisions to ensure everything is perfect. Revisions are included, and I remain available for post-delivery support.',
              },
            ].map((step, index, arr) => (
              <div key={step.num} className="dm-timeline-item">
                
                {/* Left Side: Number Circle & Connector Line */}
                <div className="dm-timeline-left">
                  <div className="dm-timeline-circle">{step.num}</div>
                  {index < arr.length - 1 && <div className="dm-timeline-line" />}
                </div>

                {/* Right Side: Content */}
                <div className="dm-timeline-content">
                  <h3 className="dm-timeline-title">{step.title}</h3>
                  <div className="dm-timeline-phase">{step.phase}</div>
                  <p className="dm-timeline-desc">{step.desc}</p>
                </div>

              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STATS (Redesigned: 2-Column Milky Layout)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-stats">
        <div className="dm-container">
          <div className="dm-stats-two-col">
            
            {/* Left Column: Heading and Context */}
            <div className="dm-stats-left">
              <span className="dm-section-label" style={{ color: '#D61A3C', marginBottom: '0.75rem', display: 'inline-block' }}>Proven Metrics</span>
              <h2 style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '2.25rem',
                fontWeight: 900,
                color: '#F4F4EE',
                margin: '0 0 1rem 0',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
              }}>
                Results That <em style={{ color: '#D61A3C', fontStyle: 'italic' }}>Speak</em> For Themselves
              </h2>
              <p style={{
                margin: 0,
                fontSize: '0.95rem',
                color: 'rgba(244,244,238,0.6)',
                lineHeight: 1.75,
                fontFamily: 'Inter, sans-serif',
              }}>
                I focus on delivering tangible growth and career advancement. Every project is engineered to achieve maximum impact, speed, and client satisfaction.
              </p>
            </div>

            {/* Right Column: Grid of Stats */}
            <div className="dm-stats-right">
              <div className="dm-stats-grid-2x2">
                {[
                  { num: '10+', label: 'Happy Clients Served' },
                  { num: '100%', label: 'Satisfaction Rate' },
                  { num: '100%', label: 'Interviews & Promotions' },
                  { num: '24–72h', label: 'Average Delivery Time' },
                ].map(s => (
                  <div key={s.label} className="dm-stat-card">
                    <div className="dm-stat-num">{s.num}</div>
                    <div className="dm-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" id="pricing" style={{ background: '#F4F4EE' }}>
        <div className="dm-container">
          <span className="dm-section-label">Career Packages</span>
          <h2 className="dm-section-title">Clear, Honest Pricing</h2>
          <p className="dm-section-sub" style={{ marginBottom: '1.5rem' }}>
            Career service packages paid via Paystack (M-Pesa, Card, Bank). Website and business services — <button onClick={() => scrollTo('contact')} style={{ background: 'none', border: 'none', color: 'var(--dm-teal)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>request a custom quote</button>.
          </p>

          {/* Swiss Currency Toggle */}
          <div className="dm-currency-toggle">
            <div className="dm-currency-group">
              <button
                onClick={() => setCurrency('KES')}
                className={`dm-currency-btn ${currency === 'KES' ? 'active' : 'inactive'}`}
              >
                KES (Shillings)
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`dm-currency-btn ${currency === 'USD' ? 'active' : 'inactive'}`}
                style={{ borderLeft: '2px solid #111111' }}
              >
                USD ($)
              </button>
            </div>
          </div>

          {/* Free Audit Banner */}
          <div className="dm-audit-banner" style={{ marginBottom: '2.5rem' }}>
            <div className="dm-audit-text">
              <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={16} className="text-blue-500" /> [target] Free Instant ATS Simulator
              </strong>
              <p>Not sure which package fits? Run your resume through my free ATS simulator and get instant feedback on what needs improving.</p>
            </div>
            <button className="dm-btn-primary" onClick={() => onNavigateToPath('ats')}>
              Launch Free Simulator
            </button>
          </div>

          <div className="dm-pricing-grid">
            {CAREER_PACKAGES.map(pkg => (
              <div key={pkg.id} className={`dm-pricing-card${pkg.featured ? ' featured' : ''}`}>
                {pkg.featured && (
                  <div className="dm-pricing-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star size={10} fill="currentColor" /> Most Popular
                  </div>
                )}
                <div>
                  <div className="dm-pricing-tier">{pkg.tier}</div>
                  <div className="dm-pricing-price">
                    {currency === 'USD' ? (
                      <>
                        <small>$</small>{pkg.priceUSD}
                      </>
                    ) : (
                      <>
                        <small>KES </small>{pkg.priceKES.toLocaleString()}
                      </>
                    )}
                  </div>
                  <div className="dm-pricing-delivery">{pkg.delivery}</div>
                  <ul className="dm-pricing-features">
                    {pkg.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <Check size={14} className="text-emerald-500" style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  className={`dm-pricing-btn ${pkg.featured ? 'primary' : 'outline'}`}
                  onClick={() => openPayModal(pkg)}
                  style={{ marginTop: '1.5rem' }}
                >
                  Get Started — {currency === 'USD' ? '$' + pkg.priceUSD : 'KES ' + pkg.priceKES.toLocaleString()}
                </button>
              </div>
            ))}
          </div>

          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '2rem', fontSize: '0.7rem', color: '#555555', flexWrap: 'wrap', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            <Lock size={12} style={{ color: '#D61A3C' }} /> Secure payment via Paystack · M-Pesa, Card & Bank accepted · Duncan contacts you within 24 hours
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          RESULTS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" style={{ background: '#F4F4EE' }}>
        <div className="dm-container">
          <span className="dm-section-label">Client Outcomes</span>
          <h2 className="dm-section-title">What Clients <em style={{ color: '#D61A3C', fontStyle: 'italic' }}>Gain</em></h2>
          <p className="dm-section-sub" style={{ marginBottom: '2.5rem' }}>When we work together, these are the outcomes clients typically achieve.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0', border: '2px solid #111111' }}>
            {[
              'Increased interview invitations',
              'Stronger professional branding',
              'Greater recruiter visibility',
              'Improved business credibility',
              'More customer inquiries',
              'Better online presence',
              'Higher conversion potential',
              'Faster career progression',
            ].map((result, i) => (
              <div key={result} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '1rem 1.25rem', background: '#F4F4EE',
                borderRight: (i % 4 !== 3) ? '2px solid #111111' : 'none',
                borderBottom: i < 4 ? '2px solid #111111' : 'none',
              }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '0', background: '#D61A3C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>✓</div>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>{result}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ATS SIMULATOR CTA SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" id="ats-simulator" style={{ background: '#111111', overflow: 'hidden', position: 'relative' }}>
        <div className="dm-container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }} className="ats-cta-grid">

            {/* Left — Copy */}
            <div>
              <div style={{ display: 'inline-block', background: '#D61A3C', border: '2px solid #D61A3C', padding: '4px 14px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#FFFFFF', marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif' }}>
                // Free Tool
              </div>
              <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#F4F4EE', fontSize: 'clamp(1.75rem, 3vw, 2.75rem)', marginBottom: '1rem', lineHeight: 1.15, fontWeight: 900 }}>
                See What ATS Systems<br /><em style={{ color: '#D61A3C', fontStyle: 'italic' }}>Actually Read</em> From Your CV
              </h2>
              <p style={{ color: 'rgba(244,244,238,0.75)', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '2rem', fontFamily: 'Inter, sans-serif' }}>
                Everybody talks about ATS systems. Very few people have actually seen one work. Upload your CV and watch a live ATS parse it — field by field — in real time. See exactly what gets detected, what gets missed, and why.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '2rem', border: '2px solid rgba(244,244,238,0.15)' }}>
                {[
                  { tag: '[OK]', text: 'Contact info, skills and sections — detected live', tagColor: '#2D7A2D' },
                  { tag: '[ERR]', text: 'Missing fields shown in real time', tagColor: '#D61A3C' },
                  { tag: '[WARN]', text: 'Formatting issues that kill readability exposed', tagColor: '#A07000' },
                  { tag: '[STATS]', text: 'Detailed ATS readiness score breakdown', tagColor: '#444' },
                ].map(item => (
                  <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.825rem', color: 'rgba(244,244,238,0.8)', fontFamily: 'monospace', padding: '0.625rem 1rem', borderBottom: '1px solid rgba(244,244,238,0.08)' }}>
                    <span style={{ fontWeight: 800, color: item.tagColor, flexShrink: 0, minWidth: '54px' }}>{item.tag}</span>
                    {item.text}
                  </div>
                ))}
              </div>

              {onNavigateToPath && (
                <button
                  onClick={() => onNavigateToPath('ats')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                    background: '#D61A3C',
                    color: '#fff', border: '2px solid #D61A3C', borderRadius: '0',
                    padding: '1rem 2rem', fontSize: '0.8rem', fontWeight: 800,
                    fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                    boxShadow: 'none', transition: 'background 0.12s ease',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#F4F4EE'; e.currentTarget.style.color = '#111111'; e.currentTarget.style.borderColor = '#F4F4EE'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#D61A3C'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#D61A3C'; }}
                >
                  Try the Live ATS Simulator →
                </button>
              )}
              <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'rgba(244,244,238,0.4)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}>100% free · No signup · Your CV never leaves your device</p>
            </div>

            {/* Right — Terminal mockup */}
            <div style={{ background: '#0A0A0A', border: '2px solid rgba(244,244,238,0.15)', borderRadius: '0', padding: '1.5rem', fontFamily: 'monospace', fontSize: '0.8rem', boxShadow: '4px 4px 0 rgba(214,26,60,0.3)' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(244,244,238,0.1)', alignItems: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '0', background: '#D61A3C' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '0', background: '#555' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '0', background: '#555' }} />
                <span style={{ marginLeft: '8px', color: 'rgba(244,244,238,0.3)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ATS Parser — Live Output</span>
              </div>
              <div style={{ color: '#D61A3C', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>// Parsing resume.pdf ...</div>
              {[
                { label: 'Name', value: 'John Doe', status: '[OK]', statusColor: '#2D7A2D' },
                { label: 'Email', value: 'john@email.com', status: '[OK]', statusColor: '#2D7A2D' },
                { label: 'Phone', value: '+254 7XX XXX XXX', status: '[OK]', statusColor: '#2D7A2D' },
                { label: 'LinkedIn', value: 'Not detected', status: '[ERR]', muted: true, statusColor: '#D61A3C' },
                { label: 'Experience', value: '~5 years', status: '[OK]', statusColor: '#2D7A2D' },
                { label: 'Skills found', value: 'SQL, Excel, Python…', status: '[OK]', statusColor: '#2D7A2D' },
                { label: 'Certifications', value: 'Not detected', status: '[ERR]', muted: true, statusColor: '#D61A3C' },
                { label: 'Multi-column', value: 'Detected — Risky!', status: '[WARN]', muted: true, statusColor: '#A07000' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid rgba(244,244,238,0.06)', gap: '1rem' }}>
                  <span style={{ color: 'rgba(244,244,238,0.4)', minWidth: '110px', fontSize: '0.75rem' }}>{row.label}:</span>
                  <span style={{ color: row.muted ? 'rgba(244,244,238,0.25)' : 'rgba(244,244,238,0.85)', flex: 1, textAlign: 'right', fontStyle: row.muted ? 'italic' : 'normal', fontSize: '0.75rem' }}>{row.value}</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: row.statusColor, flexShrink: 0 }}>{row.status}</span>
                </div>
              ))}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid rgba(214,26,60,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'rgba(244,244,238,0.4)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ATS Readiness Score</span>
                <span style={{ color: '#D61A3C', fontWeight: 900, fontSize: '1.25rem', fontFamily: 'Playfair Display, Georgia, serif' }}>67%</span>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .ats-cta-grid { grid-template-columns: 1fr !important; gap: 2.5rem !important; }
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" style={{ background: 'var(--dm-bg)' }}>
        <div className="dm-container">
          <span className="dm-section-label">Client Feedback</span>
          <h2 className="dm-section-title">What People Say</h2>
          <div className="dm-testimonials-grid">
            {[
              {
                stars: '★★★★★',
                text: '"Duncan rewrote my CV and within two weeks I had three interview calls. I had been applying for months with no response. The difference was night and day."',
                name: 'Maximiller A.',
                role: 'Banking Professional, Nairobi',
                initials: 'MA',
                color: '#1238E8',
              },
              {
                stars: '★★★★★',
                text: '"He built my business website in under 48 hours. It looks professional, loads fast, and I\'ve already gotten two client inquiries through the contact form."',
                name: 'Jeniffer T.',
                role: 'Independent Consultant',
                initials: 'JT',
                color: '#2B5BFF',
              },
              {
                stars: '★★★★★',
                text: '"My LinkedIn profile was basic before Duncan optimized it. Now I get recruiter messages regularly. Worth every shilling."',
                name: 'Edwin M.',
                role: 'Finance & Operations Professional',
                initials: 'EM',
                color: '#FFD21F',
              },
            ].map(t => (
              <div key={t.name} className="dm-testimonial-card">
                <div className="dm-testimonial-stars">{t.stars}</div>
                <p className="dm-testimonial-text">{t.text}</p>
                <div className="dm-testimonial-author">
                  <div className="dm-testimonial-avatar" style={{ background: t.color }}>{t.initials}</div>
                  <div>
                    <div className="dm-testimonial-name">{t.name}</div>
                    <div className="dm-testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ACADEMY SECTION (Redesigned: Simplified & Light-Themed)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" id="academy" style={{ background: '#F4F4EE' }}>
        <div className="dm-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0', alignItems: 'stretch', border: '2px solid #111111' }} className="academy-grid">
            
            {/* Left Column — Introduction */}
            <div style={{ padding: '3rem', borderRight: '2px solid #111111' }}>
              <span className="dm-section-label">Career Academy</span>
              <h2 className="dm-section-title" style={{ marginTop: '0.5rem', marginBottom: '1.25rem', textAlign: 'left' }}>
                From Job Seeker to <em style={{ color: '#D61A3C', fontStyle: 'italic' }}>In-Demand</em> Professional
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#555555', lineHeight: 1.75, marginBottom: '2rem', fontFamily: 'Inter, sans-serif' }}>
                Transition your career with a structured mentorship program. Duncan guides you step-by-step through ATS CV reconstruction, LinkedIn profile domination, competitive outreach campaigns, and intensive mock interviews.
              </p>
              {onNavigateToPath && (
                <button
                  className="dm-btn-primary"
                  onClick={() => onNavigateToPath('academy')}
                >
                  Explore the Academy →
                </button>
              )}
            </div>

            {/* Right Column — Academy Highlights Box */}
            <div style={{ background: '#111111', padding: '3rem' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#D61A3C', marginBottom: '1.25rem', fontFamily: 'Inter, sans-serif' }}>// Program Highlights</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { title: '6-Sprint Mentorship', desc: 'Focus on personal branding & outreach strategy.' },
                  { title: 'Duncan 1-on-1 Reviews', desc: 'Direct feedback on your CV and materials.' },
                  { title: 'WhatsApp Community', desc: 'Private group networking with other candidates.' },
                  { title: 'ATS Mock Screening', desc: 'Validate your CV against live parse algorithms.' }
                ].map(hl => (
                  <li key={hl.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', borderBottom: '1px solid rgba(244,244,238,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <span style={{ color: '#D61A3C', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0, marginTop: '1px' }}>→</span>
                    <div>
                      <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#F4F4EE', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Inter, sans-serif' }}>{hl.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'rgba(244,244,238,0.55)', lineHeight: 1.5, marginTop: '0.2rem', fontFamily: 'Inter, sans-serif' }}>{hl.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .academy-grid { grid-template-columns: 1fr !important; border: 2px solid #111111; }
            .academy-grid > div:first-child { border-right: none !important; border-bottom: 2px solid #111111; }
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ABOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" id="about" style={{ background: '#F4F4EE' }}>
        <div className="dm-container">
          {/* Swiss Bento: fixed photo col + flex text col, NO overlap */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '340px 1fr',
            gap: 0,
            alignItems: 'stretch',
            border: '2px solid #111111',
            overflow: 'hidden',
          }}>

            {/* LEFT — Photo column */}
            <div style={{
              position: 'relative',
              minHeight: '520px',
              background: '#111111',
              borderRight: '2px solid #111111',
              overflow: 'hidden',
              flexShrink: 0,
            }}>
              <img
                src="/portrait.jpeg"
                alt="Duncan Makoyo — Career Consultant &amp; Digital Strategist"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top center',
                  display: 'block',
                }}
              />
              {/* Swiss nameplate — ink strip at bottom */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: '#111111',
                padding: '1rem 1.25rem',
                display: 'flex', flexDirection: 'column', gap: '0.2rem',
                borderTop: '2px solid #D61A3C',
                zIndex: 2,
              }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: '0.875rem', color: '#F4F4EE', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duncan Makoyo</span>
                <span style={{ fontSize: '0.7rem', color: '#D61A3C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>Career Consultant · Digital Strategist</span>
              </div>
            </div>

            {/* RIGHT — Text column */}
            <div style={{
              padding: '3rem',
              minWidth: 0,       /* critical: prevents grid blowout */
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <span className="dm-section-label">About</span>
              <h2 className="dm-section-title" style={{ marginBottom: '1.25rem' }}>Hi, I’m <em style={{ color: '#D61A3C', fontStyle: 'italic' }}>Duncan.</em></h2>
              <p style={{ fontSize: '1rem', color: '#444444', lineHeight: 1.8, marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif' }}>
                I help professionals secure better career opportunities and assist businesses in building a stronger digital presence.
              </p>
              <p style={{ fontSize: '0.9rem', color: '#555555', lineHeight: 1.8, marginBottom: '2rem', fontFamily: 'Inter, sans-serif' }}>
                My background combines technology, professional branding, and business growth strategy. Rather than offering generic solutions, I focus on creating practical systems that help people and businesses present themselves professionally — and achieve measurable results.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '2px solid #111111', marginBottom: '2rem' }}>
                {[
                  'ATS-optimized CVs that pass recruiter screening',
                  'LinkedIn profiles that attract inbound opportunities',
                  'Websites that convert visitors into customers',
                  'Digital systems that generate real business growth',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#111111', borderBottom: '1px solid #111111', padding: '0.75rem 1rem', fontFamily: 'Inter, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span style={{ color: '#D61A3C', flexShrink: 0, fontWeight: 800 }}>→</span>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0', flexWrap: 'wrap', border: '2px solid #111111' }}>
                <button className="dm-btn-primary" onClick={() => scrollTo('contact')} style={{ borderRadius: 0, border: 'none' }}>
                  Work With Me →
                </button>
                <a
                  href="https://wa.me/254794877125"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 1.5rem', borderRadius: '0', borderLeft: '2px solid #111111', background: '#25D366', color: '#fff', fontWeight: 800, fontSize: '0.75rem', textDecoration: 'none', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                >
                  WhatsApp →
                </a>
              </div>
            </div>

          </div>

          {/* Responsive: stack on mobile */}
          <style>{`
            @media (max-width: 768px) {
              #about .dm-container > div {
                grid-template-columns: 1fr !important;
              }
              #about .dm-container > div > div:first-child {
                min-height: 320px !important;
                border-right: none !important;
                border-bottom: 2px solid #111111 !important;
              }
            }
          `}</style>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          CONTACT FORM
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" id="contact" style={{ background: '#F4F4EE' }}>
        <div className="dm-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '4rem', alignItems: 'start' }}>
            {/* Left */}
            <div>
              <span className="dm-section-label">Get In Touch</span>
              <h2 className="dm-section-title">Request a <em style={{ color: '#D61A3C', fontStyle: 'italic' }}>Service</em></h2>
              <p style={{ fontSize: '0.95rem', color: '#555555', lineHeight: 1.75, marginBottom: '2rem', fontFamily: 'Inter, sans-serif' }}>
                Whether you're applying for your next job or growing your business online, the right professional presentation makes all the difference. Let's talk.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '2px solid #111111' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', borderBottom: '2px solid #111111' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '0', background: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#F4F4EE' }}>
                    <Phone size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#D61A3C', marginBottom: '0.2rem', fontFamily: 'Inter, sans-serif' }}>Phone / WhatsApp</div>
                    <a href="tel:+254794877125" style={{ fontWeight: 700, color: '#111111', textDecoration: 'none', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}>+254 794 877 125</a>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', borderBottom: '2px solid #111111' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '0', background: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#F4F4EE' }}>
                    <Mail size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#D61A3C', marginBottom: '0.2rem', fontFamily: 'Inter, sans-serif' }}>Email</div>
                    <a href="mailto:info@duncanmakoyo.com" style={{ fontWeight: 700, color: '#111111', textDecoration: 'none', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}>info@duncanmakoyo.com</a>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '0', background: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#F4F4EE' }}>
                    <Clock size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#D61A3C', marginBottom: '0.2rem', fontFamily: 'Inter, sans-serif' }}>Response Time</div>
                    <div style={{ fontWeight: 700, color: '#111111', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}>Within 24 hours</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Form */}
            <div style={{
              background: '#F4F4EE', borderRadius: '0',
              border: '2px solid #111111', boxShadow: '4px 4px 0 #111111',
            }}>
              {formStatus === 'success' ? (
                <div style={{ textAlign: 'center', padding: '3rem 2.5rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem', color: '#2D7A2D', fontFamily: 'Inter, sans-serif', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>[OK]</div>
                  <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#111111', marginBottom: '0.5rem', fontWeight: 700 }}>Request Received!</h3>
                  <p style={{ color: '#555555', fontSize: '0.9rem', lineHeight: 1.7, fontFamily: 'Inter, sans-serif' }}>
                    Duncan will review your request and get back to you within 24 hours. Check your email for a confirmation.
                  </p>
                  <button
                    className="dm-btn-primary"
                    style={{ marginTop: '1.5rem' }}
                    onClick={() => setFormStatus(null)}
                  >
                    Send Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit}>
                  <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid #111111' }}>
                    <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', color: '#111111', fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>
                      Tell Me About Your Project
                    </h3>
                  </div>

                  {formError && (
                    <div style={{ background: 'rgba(214,26,60,0.06)', border: 'none', borderLeft: '4px solid #D61A3C', borderRadius: '0', padding: '0.75rem 1rem', margin: '0 0 0 0', color: '#D61A3C', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
                      {formError}
                    </div>
                  )}

                  <div className="dm-form-grid">
                    <div className="dm-form-group">
                      <label className="dm-form-label">Full Name *</label>
                      <input name="name" value={form.name} onChange={handleFormChange} className="dm-form-input" placeholder="Your name" required />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-form-label">Email Address *</label>
                      <input name="email" type="email" value={form.email} onChange={handleFormChange} className="dm-form-input" placeholder="you@example.com" required />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-form-label">Phone / WhatsApp</label>
                      <input name="phone" value={form.phone} onChange={handleFormChange} className="dm-form-input" placeholder="+254 7XX XXX XXX" />
                    </div>
                    <div className="dm-form-group">
                      <label className="dm-form-label">Service Needed *</label>
                      <select name="service" value={form.service} onChange={handleFormChange} className="dm-form-select" required>
                        <option value="">Select a service…</option>
                        {SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="dm-form-group full">
                      <label className="dm-form-label">Message / Additional Details</label>
                      <textarea name="message" value={form.message} onChange={handleFormChange} className="dm-form-textarea" placeholder="Tell me more about your goal, timeline, or specific requirements…" />
                    </div>
                    <div className="dm-form-group full">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--dm-slate)', fontWeight: 500 }}>
                        <input type="checkbox" name="wantAudit" checked={form.wantAudit} onChange={handleFormChange} style={{ accentColor: 'var(--dm-teal)', width: '16px', height: '16px' }} />
                        I'd like a <strong style={{ color: 'var(--dm-teal)' }}>free CV audit</strong> before deciding on a package
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="dm-form-submit"
                    disabled={formStatus === 'sending'}
                  >
                    {formStatus === 'sending' ? 'Sending…' : 'Request a Service →'}
                  </button>

                  <p style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.7rem', color: '#777', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.1em', borderTop: '1px solid #111111', marginTop: 0 }}>
                    Your information is safe and never shared with third parties.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Responsive contact grid */}
        <style>{`
          @media (max-width: 768px) {
            #contact .dm-container > div {
              grid-template-columns: 1fr !important;
              gap: 2.5rem !important;
            }
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-cta-section">
        <div className="dm-container" style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="dm-cta-title">Ready to <em>Stand Out?</em></h2>
          <p className="dm-cta-sub">
            Whether you're applying for your next job or growing your business online, the right professional presentation can make all the difference. Let's build something that creates opportunities.
          </p>
          <div style={{ display: 'flex', gap: '0', justifyContent: 'flex-start', flexWrap: 'wrap', border: '2px solid rgba(244,244,238,0.25)', display: 'inline-flex' }}>
            <button className="dm-btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '0.8rem', borderRadius: 0 }} onClick={() => scrollTo('contact')}>
              Request a Service Today →
            </button>
            <a
              href="https://wa.me/254794877125?text=Hi%20Duncan%2C%20I%27d%20like%20to%20request%20a%20service."
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', borderRadius: '0', borderLeft: '2px solid rgba(244,244,238,0.25)', background: '#25D366', color: '#fff', fontWeight: 800, fontSize: '0.75rem', textDecoration: 'none', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              WhatsApp →
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="dm-footer">
        <div className="dm-container">
          <div className="dm-footer-grid">
            {/* Brand col */}
            <div className="dm-footer-brand">
              <div className="dm-footer-logo">DM<span>.</span></div>
              <p className="dm-footer-desc">
                Professional CV Writing, LinkedIn Optimization, Website Development, and Digital Growth Solutions for professionals and businesses across Kenya.
              </p>
              <div className="dm-footer-contact">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={12} /> <a href="tel:+254794877125">+254 794 877 125</a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={12} /> <a href="mailto:info@duncanmakoyo.com">info@duncanmakoyo.com</a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={12} /> <a href="https://duncanmakoyo.com" style={{ color: 'var(--dm-teal)' }}>duncanmakoyo.com</a>
                </div>
              </div>
            </div>

            {/* Services col */}
            <div>
              <div className="dm-footer-col-title">Services</div>
              <button className="dm-footer-link" onClick={() => scrollTo('services')}>ATS CV Writing</button>
              <button className="dm-footer-link" onClick={() => scrollTo('services')}>Cover Letter</button>
              <button className="dm-footer-link" onClick={() => scrollTo('services')}>LinkedIn Optimization</button>
              <button className="dm-footer-link" onClick={() => scrollTo('services')}>Website Development</button>
              <button className="dm-footer-link" onClick={() => scrollTo('services')}>Digital Presence Setup</button>
            </div>

            {/* Links col */}
            <div>
              <div className="dm-footer-col-title">Quick Links</div>
              <button className="dm-footer-link" onClick={() => scrollTo('pricing')}>Pricing</button>
              <button className="dm-footer-link" onClick={() => scrollTo('process')}>Process</button>
              <button className="dm-footer-link" onClick={() => scrollTo('about')}>About</button>
              <button className="dm-footer-link" onClick={() => scrollTo('contact')}>Contact</button>
              {onNavigateToTools && (
                <button className="dm-footer-link" onClick={onNavigateToTools}>Photo & Video Tools</button>
              )}
              {onNavigateToPath && (
                <>
                  <button className="dm-footer-link" onClick={() => onNavigateToPath('ats')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Brain size={12} /> ATS Simulator</button>
                  <button className="dm-footer-link" onClick={() => onNavigateToPath('hookbunker')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 600 }}><Shield size={12} /> HookBunker Monitor</button>
                  <button className="dm-footer-link" onClick={() => onNavigateToPath('terms')}>Terms of Use</button>
                  <button className="dm-footer-link" onClick={() => window.location.hash = '#/rider-login'}>Rider Portal</button>
                  <button className="dm-footer-link" onClick={() => onNavigateToPath('privacy')}>Privacy Policy</button>
                </>
              )}
            </div>

            {/* Connect col */}
            <div>
              <div className="dm-footer-col-title">Connect</div>
              <a className="dm-footer-link" href="https://wa.me/254794877125" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><MessageCircle size={12} /> WhatsApp</a>
              <a className="dm-footer-link" href="https://www.linkedin.com/in/duncan-makoyo-196ba7307/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ExternalLink size={12} /> LinkedIn</a>
              <a className="dm-footer-link" href="mailto:info@duncanmakoyo.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> Email Me</a>
            </div>
          </div>

          <div className="dm-footer-bottom">
            <span>© {new Date().getFullYear()} Duncan Makoyo. All rights reserved.</span>
            <span>
              Also try our free tools:{' '}
              {onNavigateToTools ? (
                <button className="dm-footer-tools-link" onClick={onNavigateToTools}>ImageKE Photo & Video Studio →</button>
              ) : (
                <span style={{ color: 'var(--dm-teal)' }}>ImageKE Photo & Video Studio</span>
              )}
            </span>
          </div>
        </div>
      </footer>

      {/* ── WhatsApp Float ── */}
      <a
        href="https://wa.me/254794877125?text=Hi%20Duncan%2C%20I%27d%20like%20to%20request%20a%20service."
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        title="Chat on WhatsApp"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
      >
        <MessageCircle size={24} />
      </a>

    </div>
  );
}
