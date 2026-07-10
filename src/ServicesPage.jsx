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
    priceKES: 1500,
    priceUSD: 12,
    delivery: 'Delivery: 48–72 Hours · 1 Revision',
    features: [
      'ATS-Optimized CV',
      'Professional formatting',
      'Keyword optimization',
      'PDF & Word delivery',
    ],
  },
  {
    id: 'professional',
    tier: 'Professional',
    priceKES: 3500,
    priceUSD: 28,
    delivery: 'Delivery: 48 Hours · 2 Revisions',
    featured: true,
    features: [
      'ATS CV Rewrite',
      'Tailored Cover Letter',
      'Advanced keyword strategy',
      'Promotion / Career transition focus',
      'Applicant Tracking System audit',
    ],
  },
  {
    id: 'executive',
    tier: 'Executive',
    priceKES: 6000,
    priceUSD: 48,
    delivery: 'Delivery: 24–48 Hours · 3 Revisions',
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
  'ATS CV Writing (Essential — KES 1,500)',
  'ATS CV + Cover Letter (Professional — KES 3,500)',
  'Executive Career Package (KES 6,000)',
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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '2.5rem',
            width: '100%', maxWidth: '440px', margin: '1rem',
            boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dm-teal)', marginBottom: '0.4rem' }}>
                {payingPackage.tier} Package
              </div>
              <h3 style={{ margin: 0, fontFamily: 'Montserrat, sans-serif', fontSize: '1.5rem', color: 'var(--dm-navy)' }}>
                {currency === 'USD' ? '$' : 'KES '}{currency === 'USD' ? payingPackage.priceUSD : payingPackage.priceKES.toLocaleString()}
              </h3>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--dm-text-muted)' }}>
                Enter your email to proceed. Duncan will contact you within 24 hours after payment.
              </p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="dm-form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Email Address</label>
              <input
                type="email"
                value={payEmail}
                autoFocus
                onChange={e => { setPayEmail(e.target.value); setPayError(''); }}
                placeholder="you@example.com"
                className="dm-form-input"
              />
            </div>

            {payError && (
              <p style={{ color: '#EF4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{payError}</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setShowPayModal(false); setIsPaying(false); }}
                style={{ flex: 1, padding: '0.875rem', borderRadius: '10px', border: '1.5px solid var(--dm-border)', background: 'transparent', fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem', fontFamily: 'Inter, sans-serif' }}
              >
                Cancel
              </button>
              <button
                className="dm-pricing-btn primary"
                style={{ flex: 2 }}
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
                      <button className="dm-nav-dropdown-item" onClick={() => onNavigateToPath('hookbunker')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={14} className="text-emerald-500" /> HookBunker Proxy
                      </button>
                      <button className="dm-nav-dropdown-item" onClick={() => onNavigateToPath('academy')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <GraduationCap size={14} className="text-teal-500" /> Career Academy
                      </button>
                      <button className="dm-nav-dropdown-item" onClick={() => onNavigateToPath('workshop')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={14} className="text-amber-500" /> AI Masterclass
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
                  <button className="dm-mobile-link" onClick={() => { onNavigateToPath('hookbunker'); setMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                    <Shield size={16} /> HookBunker Proxy
                  </button>
                  <button className="dm-mobile-link" onClick={() => { onNavigateToPath('academy'); setMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#14B8A6' }}>
                    <GraduationCap size={16} /> Career Academy
                  </button>
                  <button className="dm-mobile-link" onClick={() => { onNavigateToPath('workshop'); setMobileMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22C55E' }}>
                    <Zap size={16} /> AI Masterclass
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Premium gradient avatar badge representing Duncan Makoyo */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--dm-teal) 0%, var(--dm-primary) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: '#fff',
                fontWeight: 800,
                marginBottom: '1.5rem',
                boxShadow: '0 8px 30px rgba(18, 56, 232, 0.25)',
                border: '3px solid rgba(255, 255, 255, 0.1)',
                fontFamily: 'Montserrat, sans-serif'
              }}>
                DM
              </div>

              <h1 className="dm-hero-headline">
                Get More Interviews, More Clients, and More Opportunities
              </h1>

              <p className="dm-hero-sub">
                Professional CV Writing, LinkedIn Optimization, Website Development, and Digital Growth Solutions — designed to help professionals and businesses stand out.
              </p>

              <div className="dm-hero-btns">
                <button className="dm-btn-primary" onClick={() => scrollTo('contact')}>
                  Request Service →
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
      <section className="dm-section" style={{ background: '#fff' }}>
        <div className="dm-container">
          <span className="dm-section-label">Why Choose Me</span>
          <h2 className="dm-section-title">Results, Not Just Services</h2>
          <p className="dm-section-sub" style={{ marginBottom: '3rem' }}>
            I combine technology, marketing, and professional branding to help individuals and businesses create a stronger presence — and convert opportunities into real outcomes.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {[
              { icon: <FileText size={20} className="text-blue-600" />, title: 'ATS-Optimized CVs', desc: 'Resumes engineered to pass recruiter screening systems and reach human decision-makers.' },
              { icon: <Briefcase size={20} className="text-blue-600" />, title: 'LinkedIn Visibility', desc: 'Profiles that attract recruiters, showcase credibility, and generate inbound opportunities.' },
              { icon: <Globe size={20} className="text-blue-600" />, title: 'Professional Websites', desc: 'Modern, responsive sites that build trust and convert visitors into paying customers.' },
              { icon: <Zap size={20} className="text-blue-600" />, title: 'Fast & Reliable', desc: 'Clear communication, fast turnaround times, and consistent delivery — every project.' },
              { icon: <BarChart size={20} className="text-blue-600" />, title: 'Measurable Results', desc: 'Digital solutions engineered to generate interviews, clients, and real business growth.' },
              { icon: <DollarSign size={20} className="text-blue-600" />, title: 'Affordable Quality', desc: 'Premium-level work at fair pricing — no hidden fees, no generic templates.' },
            ].map(item => (
              <div key={item.title} style={{
                display: 'flex', gap: '1rem', padding: '1.5rem',
                background: 'var(--dm-bg)', borderRadius: '14px',
                border: '1px solid var(--dm-border)',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'var(--dm-teal-light)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.3rem', color: 'var(--dm-navy)', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '0.95rem' }}>{item.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--dm-text-muted)', lineHeight: 1.55 }}>{item.desc}</p>
                </div>
              </div>
            ))}
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
      <section className="dm-section" id="process" style={{ background: '#faf9f6', color: '#090e1a', borderTop: '1px solid rgba(9, 14, 26, 0.05)', borderBottom: '1px solid rgba(9, 14, 26, 0.05)' }}>
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
              <span className="dm-section-label" style={{ color: 'var(--dm-primary)', marginBottom: '0.75rem', display: 'inline-block' }}>Proven Metrics</span>
              <h2 style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--dm-navy)',
                margin: '0 0 1rem 0',
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
              }}>
                Results That Speak For Themselves
              </h2>
              <p style={{
                margin: 0,
                fontSize: '1rem',
                color: '#475569',
                lineHeight: 1.6,
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
      <section className="dm-section" id="pricing" style={{ background: 'var(--dm-bg)' }}>
        <div className="dm-container">
          <span className="dm-section-label">Career Packages</span>
          <h2 className="dm-section-title">Clear, Honest Pricing</h2>
          <p className="dm-section-sub" style={{ marginBottom: '1.5rem' }}>
            Career service packages paid via Paystack (M-Pesa, Card, Bank). Website and business services — <button onClick={() => scrollTo('contact')} style={{ background: 'none', border: 'none', color: 'var(--dm-teal)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>request a custom quote</button>.
          </p>

          {/* Currency Toggle Selector */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
            <div style={{
              background: '#E2E8F0',
              padding: '4px',
              borderRadius: '30px',
              display: 'flex',
              gap: '4px',
              border: '1px solid #CBD5E1',
            }}>
              <button
                onClick={() => setCurrency('KES')}
                style={{
                  padding: '6px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: currency === 'KES' ? 'var(--dm-teal)' : 'transparent',
                  color: currency === 'KES' ? '#fff' : 'var(--dm-slate)',
                  transition: 'all 0.2s ease',
                }}
              >
                KES (Shillings)
              </button>
              <button
                onClick={() => setCurrency('USD')}
                style={{
                  padding: '6px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: currency === 'USD' ? 'var(--dm-teal)' : 'transparent',
                  color: currency === 'USD' ? '#fff' : 'var(--dm-slate)',
                  transition: 'all 0.2s ease',
                }}
              >
                USD ($)
              </button>
            </div>
          </div>

          {/* Free Audit Banner */}
          <div className="dm-audit-banner" style={{ marginBottom: '2.5rem' }}>
            <div className="dm-audit-text">
              <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={16} className="text-blue-500" /> Free CV Audit Available
              </strong>
              <p>Not sure which package fits? Request a free CV audit and I'll tell you exactly what needs improving.</p>
            </div>
            <button className="dm-btn-primary" onClick={() => scrollTo('contact')}>
              Get Free Audit
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

          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--dm-text-muted)', flexWrap: 'wrap' }}>
            <Lock size={14} className="text-blue-500" /> Secure payment via Paystack · M-Pesa, Card & Bank accepted · Duncan contacts you within 24 hours of payment
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          RESULTS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" style={{ background: '#fff' }}>
        <div className="dm-container">
          <span className="dm-section-label">Client Outcomes</span>
          <h2 className="dm-section-title">What Clients Gain</h2>
          <p className="dm-section-sub" style={{ marginBottom: '2.5rem' }}>When we work together, these are the outcomes clients typically achieve.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {[
              'Increased interview invitations',
              'Stronger professional branding',
              'Greater recruiter visibility',
              'Improved business credibility',
              'More customer inquiries',
              'Better online presence',
              'Higher conversion potential',
              'Faster career progression',
            ].map(result => (
              <div key={result} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '1rem 1.25rem', background: 'var(--dm-bg)',
                borderRadius: '12px', border: '1px solid var(--dm-border)',
              }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>✓</div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--dm-slate)' }}>{result}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ATS SIMULATOR CTA SECTION
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" id="ats-simulator" style={{ background: 'linear-gradient(135deg, #0D1B4D 0%, #1238E8 50%, #2B5BFF 100%)', overflow: 'hidden', position: 'relative' }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(18, 56, 232, 0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(43, 91, 255, 0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="dm-container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }} className="ats-cta-grid">

            {/* Left — Copy */}
            <div>
              <div style={{ display: 'inline-block', background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '20px', padding: '5px 18px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', marginBottom: '1.5rem' }}>
                Free Tool
              </div>
              <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: '1rem', lineHeight: 1.25 }}>
                See What ATS Systems<br />Actually Read From Your CV
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.9)', lineHeight: 1.75, fontSize: '0.95rem', marginBottom: '2rem' }}>
                Everybody talks about ATS systems. Very few people have actually seen one work. Upload your CV and watch a live ATS parse it — field by field — in real time. See exactly what gets detected, what gets missed, and why.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {[
                  '[OK] Contact info, skills and sections — detected live',
                  '[ERR] Missing fields shown in real time',
                  '[WARN] Formatting issues that kill readability exposed',
                  '[stats] Detailed ATS readiness score breakdown',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: '#FFFFFF', fontWeight: 500 }}>
                    {item}
                  </div>
                ))}
              </div>

              {onNavigateToPath && (
                <button
                  onClick={() => onNavigateToPath('ats')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                    background: 'var(--dm-primary)',
                    color: '#fff', border: 'none', borderRadius: '12px',
                    padding: '1rem 2rem', fontSize: '1rem', fontWeight: 800,
                    fontFamily: 'Montserrat, sans-serif', cursor: 'pointer',
                    boxShadow: '0 6px 24px rgba(18, 56, 232, 0.4)', transition: 'transform 0.15s, box-shadow 0.15s, background-color 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(43, 91, 255, 0.5)'; e.currentTarget.style.background = 'var(--dm-electric)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 24px rgba(18, 56, 232, 0.4)'; e.currentTarget.style.background = 'var(--dm-primary)'; }}
                >
                  [search] Try the Live ATS Simulator →
                </button>
              )}
              <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>[lock] 100% free · No signup · Your CV never leaves your device</p>
            </div>

            {/* Right — Preview mockup */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34D399' }} />
              </div>
              <div style={{ color: '#38BDF8', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.75rem' }}>// ATS Parser — Live Output</div>
              {[
                { label: 'Name', value: 'John Doe', status: '[OK]' },
                { label: 'Email', value: 'john@email.com', status: '[OK]' },
                { label: 'Phone', value: '+254 7XX XXX XXX', status: '[OK]' },
                { label: 'LinkedIn', value: 'Not detected', status: '[ERR]', muted: true },
                { label: 'Experience', value: '~5 years', status: '[OK]' },
                { label: 'Skills found', value: 'SQL, Excel, Python…', status: '[OK]' },
                { label: 'Certifications', value: 'Not detected', status: '[ERR]', muted: true },
                { label: 'Multi-column', value: 'Detected — Risky!', status: '[WARN]', muted: true },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '1rem' }}>
                  <span style={{ color: '#94A3B8', minWidth: '100px' }}>{row.label}:</span>
                  <span style={{ color: row.muted ? 'rgba(255,255,255,0.3)' : '#fff', flex: 1, textAlign: 'right', fontStyle: row.muted ? 'italic' : 'normal' }}>{row.value}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{row.status}</span>
                </div>
              ))}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>ATS Readiness Score</span>
                <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: '1.1rem', fontFamily: 'Montserrat, sans-serif' }}>67%</span>
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
      <section className="dm-section" id="academy" style={{ background: '#fff', borderTop: '1px solid var(--dm-border)' }}>
        <div className="dm-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem', alignItems: 'center' }} className="academy-grid">
            
            {/* Left Column — Introduction */}
            <div>
              <span className="dm-section-label" style={{ color: 'var(--dm-teal)', background: 'var(--dm-teal-light)', padding: '3px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Career Academy
              </span>
              <h2 className="dm-section-title" style={{ marginTop: '1rem', marginBottom: '1.25rem', textAlign: 'left' }}>
                From Job Seeker to In-Demand Professional
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--dm-text-muted)', lineHeight: 1.75, marginBottom: '2rem' }}>
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
            <div style={{
              background: 'var(--dm-bg)',
              border: '1px solid var(--dm-border)',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 4px 12px rgba(13, 27, 77, 0.02)'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--dm-navy)', fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '1rem' }}>
                Program Highlights
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { title: '6-Sprint Mentorship', desc: 'Focus on personal branding & outreach strategy.' },
                  { title: 'Duncan 1-on-1 Reviews', desc: 'Direct feedback on your CV and materials.' },
                  { title: 'WhatsApp Community', desc: 'Private group networking with other candidates.' },
                  { title: 'ATS Mock Screening', desc: 'Validate your CV against live parse algorithms.' }
                ].map(hl => (
                  <li key={hl.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <Check size={14} className="text-emerald-600" style={{ marginTop: '3px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--dm-navy)' }}>{hl.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--dm-text-muted)', lineHeight: 1.4 }}>{hl.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .academy-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ABOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" id="about" style={{ background: '#fff' }}>
        <div className="dm-container">
          <div className="dm-about-grid">
            <div className="dm-about-photo" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
              <img
                src="/portrait.jpeg"
                alt="Duncan Makoyo — Career Consultant & Digital Strategist"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
              />
              {/* Name plate */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.6) 60%, transparent 100%)',
                padding: '2rem 1.5rem 1.25rem',
                display: 'flex', flexDirection: 'column', gap: '0.2rem',
              }}>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>Duncan Makoyo</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--dm-primary)', fontWeight: 600, letterSpacing: '0.04em' }}>Career Consultant & Digital Strategist</span>
              </div>
            </div>

            <div>
              <span className="dm-section-label">About</span>
              <h2 className="dm-section-title" style={{ marginBottom: '1.25rem' }}>Hi, I'm Duncan.</h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--dm-text-muted)', lineHeight: 1.75, marginBottom: '1.5rem' }}>
                I help professionals secure better career opportunities and assist businesses in building a stronger digital presence.
              </p>
              <p style={{ fontSize: '0.95rem', color: 'var(--dm-text-muted)', lineHeight: 1.75, marginBottom: '2rem' }}>
                My background combines technology, professional branding, and business growth strategy. Rather than offering generic solutions, I focus on creating practical systems that help people and businesses present themselves professionally — and achieve measurable results.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  'ATS-optimized CVs that pass recruiter screening',
                  'LinkedIn profiles that attract inbound opportunities',
                  'Websites that convert visitors into customers',
                  'Digital systems that generate real business growth',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--dm-slate)' }}>
                    <Check size={16} className="text-teal-600" style={{ marginTop: '2px', flexShrink: 0 }} />
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="dm-btn-primary" onClick={() => scrollTo('contact')}>
                  Work With Me →
                </button>
                <a
                  href="https://wa.me/254794877125"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 1.5rem', borderRadius: '10px', background: 'linear-gradient(135deg, #63D11A, #4CAF0A)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', fontFamily: 'Inter, sans-serif', transition: 'opacity 0.15s' }}
                >
                  💬 WhatsApp Me
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          CONTACT FORM
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" id="contact" style={{ background: 'var(--dm-bg)' }}>
        <div className="dm-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '4rem', alignItems: 'start' }}>
            {/* Left */}
            <div>
              <span className="dm-section-label">Get In Touch</span>
              <h2 className="dm-section-title">Request a Service</h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--dm-text-muted)', lineHeight: 1.75, marginBottom: '2rem' }}>
                Whether you're applying for your next job or growing your business online, the right professional presentation makes all the difference. Let's talk.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--dm-teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dm-text-muted)', marginBottom: '0.2rem' }}>Phone / WhatsApp</div>
                    <a href="tel:+254794877125" style={{ fontWeight: 700, color: 'var(--dm-navy)', textDecoration: 'none', fontSize: '0.95rem' }}>+254 794 877 125</a>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--dm-teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dm-text-muted)', marginBottom: '0.2rem' }}>Email</div>
                    <a href="mailto:info@duncanmakoyo.com" style={{ fontWeight: 700, color: 'var(--dm-navy)', textDecoration: 'none', fontSize: '0.95rem' }}>info@duncanmakoyo.com</a>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--dm-teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dm-text-muted)', marginBottom: '0.2rem' }}>Response Time</div>
                    <div style={{ fontWeight: 700, color: 'var(--dm-navy)', fontSize: '0.95rem' }}>Within 24 hours</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — Form */}
            <div style={{
              background: '#fff', borderRadius: '20px', padding: '2.5rem',
              border: '1.5px solid var(--dm-border)', boxShadow: 'var(--dm-shadow-md)',
            }}>
              {formStatus === 'success' ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--dm-teal)' }}>[OK]</div>
                  <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', marginBottom: '0.5rem' }}>Request Received!</h3>
                  <p style={{ color: 'var(--dm-text-muted)', fontSize: '0.95rem', lineHeight: 1.65 }}>
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
                  <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', fontSize: '1.1rem', marginBottom: '1.75rem' }}>
                    Tell Me About Your Project
                  </h3>

                  {formError && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#991B1B', fontSize: '0.875rem' }}>
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

                  <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--dm-text-muted)' }}>
                    [lock] Your information is safe and never shared with third parties.
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
          <h2 className="dm-cta-title">Ready to Stand Out?</h2>
          <p className="dm-cta-sub">
            Whether you're applying for your next job or growing your business online, the right professional presentation can make all the difference. Let's build something that creates opportunities.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="dm-btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1rem' }} onClick={() => scrollTo('contact')}>
              Request a Service Today →
            </button>
            <a
              href="https://wa.me/254794877125?text=Hi%20Duncan%2C%20I%27d%20like%20to%20request%20a%20service."
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', borderRadius: '10px', background: 'linear-gradient(135deg, #63D11A, #4CAF0A)', color: '#fff', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}
            >
              💬 WhatsApp Me
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
