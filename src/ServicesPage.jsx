import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

// ─── Career Package Prices (KES) ──────────────────────────────────────────────
const CAREER_PACKAGES = [
  {
    id: 'essential',
    tier: 'Essential',
    price: 1500,
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
    price: 3500,
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
    price: 6000,
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

// ─── Scroll helper ─────────────────────────────────────────────────────────────
function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Paystack helper ───────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ServicesPage({ onNavigateToTools, onNavigateToPath }) {
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

    try {
      const initRes = await axios.post(`${API_URL}/api/initialize-payment`, {
        email: payEmail.trim().toLowerCase(),
        amount: pkg.price,
        metadata: { type: 'career_service', package: pkg.id, packageTier: pkg.tier },
      });

      if (!initRes.data?.data?.reference) throw new Error('Invalid payment response.');
      const { reference } = initRes.data.data;

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: payEmail.trim().toLowerCase(),
        amount: pkg.price * 100,
        currency: 'KES',
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
                    price: pkg.price,
                    reference: response.reference,
                  });
                } catch {}

                setShowPayModal(false);
                setPayEmail('');
                setPayingPackage(null);
                alert(`✅ Payment confirmed! Duncan will contact you at ${payEmail} within 24 hours to begin your ${pkg.tier} package.`);
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
                KES {payingPackage.price.toLocaleString()}
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
                {isPaying ? 'Processing…' : `Pay KES ${payingPackage.price.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <nav className="dm-nav" id="top">
        <div className="dm-nav-logo">DM<span>.</span></div>
        <div className="dm-nav-links">
          <button className="dm-nav-link" onClick={() => scrollTo('services')}>Services</button>
          <button className="dm-nav-link" onClick={() => scrollTo('pricing')}>Pricing</button>
          <button className="dm-nav-link" onClick={() => scrollTo('process')}>Process</button>
          <button className="dm-nav-link" onClick={() => scrollTo('about')}>About</button>
          <button className="dm-nav-link" onClick={() => scrollTo('contact')}>Contact</button>
          {onNavigateToTools && (
            <button className="dm-nav-link" onClick={onNavigateToTools} title="Photo & Video Tools">🛠 Tools</button>
          )}
        </div>
        <button className="dm-nav-cta" onClick={() => scrollTo('contact')}>
          Request Service
        </button>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-hero" id="hero">
        <div className="dm-container" style={{ width: '100%' }}>
          <div className="dm-hero-grid">
            {/* Left */}
            <div>
              <div style={{
                display: 'inline-block', background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.25)',
                borderRadius: '20px', padding: '5px 16px', fontSize: '0.8rem', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dm-teal)', marginBottom: '1.5rem',
              }}>
                Professional Consulting Services
              </div>

              <h1 className="dm-hero-headline">
                Get More Interviews,<br />
                More Clients, and<br />
                <em>More Opportunities</em>
              </h1>

              <p className="dm-hero-sub">
                Professional CV Writing, LinkedIn Optimization, Website Development, and Digital Growth Solutions — designed to help professionals and businesses stand out.
              </p>

              <div className="dm-hero-btns">
                <button className="dm-btn-primary" onClick={() => scrollTo('contact')}>
                  Request a Service →
                </button>
                <button className="dm-btn-outline" onClick={() => scrollTo('services')}>
                  View Services
                </button>
              </div>

              <div className="dm-hero-social-proof">
                <span className="dm-stars">★★★★★</span>
                <span>Trusted by professionals and growing businesses across Kenya</span>
              </div>
            </div>

            {/* Right — Hero Image */}
            <div className="dm-illustration" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(20,184,166,0.2)',
                width: '100%',
                maxWidth: '500px',
              }}>
                <img
                  src="/hero.jpg"
                  alt="Professional career consulting services"
                  style={{ width: '100%', display: 'block', borderRadius: '24px' }}
                />
                {/* Floating badge overlay */}
                <div style={{
                  position: 'absolute', bottom: '20px', left: '20px',
                  background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(20,184,166,0.3)', borderRadius: '12px',
                  padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>✅</span>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>100% Client Satisfaction</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>Every client got interviews or a promotion</div>
                  </div>
                </div>
                {/* ATS badge */}
                <div style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'var(--dm-teal)', color: '#fff',
                  fontSize: '0.72rem', fontWeight: 800, padding: '5px 14px',
                  borderRadius: '20px', boxShadow: '0 4px 12px rgba(20,184,166,0.45)',
                  animation: 'float 3s ease-in-out infinite',
                }}>
                  ATS Score: 94% ↑
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TRUST BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="dm-trust-bar">
        <div className="dm-container">
          <div className="dm-trust-items">
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
              { icon: '📄', title: 'ATS-Optimized CVs', desc: 'Resumes engineered to pass recruiter screening systems and reach human decision-makers.' },
              { icon: '💼', title: 'LinkedIn Visibility', desc: 'Profiles that attract recruiters, showcase credibility, and generate inbound opportunities.' },
              { icon: '🌐', title: 'Professional Websites', desc: 'Modern, responsive sites that build trust and convert visitors into paying customers.' },
              { icon: '⚡', title: 'Fast & Reliable', desc: 'Clear communication, fast turnaround times, and consistent delivery — every project.' },
              { icon: '📊', title: 'Measurable Results', desc: 'Digital solutions engineered to generate interviews, clients, and real business growth.' },
              { icon: '💰', title: 'Affordable Quality', desc: 'Premium-level work at fair pricing — no hidden fees, no generic templates.' },
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
                  fontSize: '1.25rem', flexShrink: 0,
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
          SERVICES
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" id="services" style={{ background: 'var(--dm-bg)' }}>
        <div className="dm-container">
          <span className="dm-section-label">What I Offer</span>
          <h2 className="dm-section-title">Services</h2>
          <p className="dm-section-sub">Every service is designed around a specific outcome — not just a deliverable.</p>

          {/* Career Services */}
          <h3 style={{ margin: '3rem 0 1.5rem', fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: 'var(--dm-teal-light)', color: 'var(--dm-teal)', padding: '3px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Career Services</span>
          </h3>
          <div className="dm-services-grid">
            {[
              {
                icon: '📄', badge: 'career', name: 'ATS CV Writing & Optimization',
                desc: 'Most resumes fail before a recruiter ever reads them. I create ATS-friendly resumes that highlight your achievements and increase your interview rate.',
                outcome: '→ More interview invitations',
                bestFor: ['Job seekers', 'Career changers', 'Recent graduates', 'Promotion seekers'],
              },
              {
                icon: '✉️', badge: 'career', name: 'Cover Letter Writing',
                desc: 'A strong cover letter separates you from hundreds of applicants. I write customized letters tailored to specific industries and positions.',
                outcome: '→ Stand out from the crowd',
                bestFor: ['Competitive roles', 'Career transitions', 'Specific industries'],
              },
              {
                icon: '💼', badge: 'career', name: 'LinkedIn Profile Optimization',
                desc: 'Recruiters search LinkedIn every day. I optimize your profile to improve visibility, build credibility, and attract the right opportunities.',
                outcome: '→ Get discovered by recruiters',
                bestFor: ['Professionals', 'Job seekers', 'Executives'],
              },
            ].map(svc => (
              <div key={svc.name} className="dm-service-card">
                {/* Dark header band */}
                <div className="dm-service-card-head">
                  <div className="dm-service-card-glow" />
                  <div className="dm-service-icon">{svc.icon}</div>
                  <h3 className="dm-service-name">{svc.name}</h3>
                </div>
                {/* Card body */}
                <div className="dm-service-card-body">
                  <span className={`dm-service-badge ${svc.badge}`}>{svc.badge === 'career' ? 'Career Service' : 'Business'}</span>
                  <p className="dm-service-desc">{svc.desc}</p>
                  {svc.bestFor && (
                    <div className="dm-service-tags">
                      {svc.bestFor.map(b => (
                        <span key={b} style={{ fontSize: '0.72rem', background: 'var(--dm-bg)', color: 'var(--dm-slate)', border: '1px solid var(--dm-border)', borderRadius: '20px', padding: '2px 10px' }}>{b}</span>
                      ))}
                    </div>
                  )}
                  <div className="dm-service-outcome">{svc.outcome}</div>
                  <button className="dm-service-cta" onClick={() => scrollTo('contact')}>Get Started →</button>
                </div>
              </div>
            ))}
          </div>

          {/* Business Services */}
          <h3 style={{ margin: '3rem 0 1.5rem', fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: 'rgba(99,102,241,0.08)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.2)', padding: '3px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business Growth</span>
          </h3>
          <div className="dm-services-grid">
            {[
              {
                icon: '🌐', badge: 'business', name: 'Professional Website Development',
                desc: 'Your website is often the first impression customers have. I build modern, responsive websites that establish credibility and convert visitors into paying leads.',
                outcome: '→ Turn visitors into paying clients',
                bestFor: ['Small businesses', 'Consultants', 'Agencies', 'Startups'],
              },
              {
                icon: '⚙️', badge: 'business', name: 'Digital Presence Setup',
                desc: 'Build a complete professional online identity — business email, domain configuration, contact forms, lead generation systems, and online branding.',
                outcome: '→ Look credible online, instantly',
                bestFor: ['New businesses', 'Freelancers', 'Consultants'],
              },
              {
                icon: '📈', badge: 'business', name: 'Marketing & Growth Support',
                desc: 'Strategic online positioning and digital optimization to help businesses attract more customers and grow their revenue consistently.',
                outcome: '→ More customer inquiries',
                bestFor: ['Growing businesses', 'Service providers', 'Personal brands'],
              },
            ].map(svc => (
              <div key={svc.name} className="dm-service-card">
                {/* Dark header band — indigo tint for business */}
                <div className="dm-service-card-head" style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)' }}>
                  <div className="dm-service-card-glow" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)' }} />
                  <div className="dm-service-icon" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>{svc.icon}</div>
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
                  <div className="dm-service-outcome" style={{ color: '#818CF8' }}>{svc.outcome}</div>
                  <button className="dm-service-cta" style={{ background: '#312E81' }} onClick={() => scrollTo('contact')}>Request a Quote →</button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-section" id="process" style={{ background: '#fff' }}>
        <div className="dm-container">
          <span className="dm-section-label">The Process</span>
          <h2 className="dm-section-title">How It Works</h2>
          <p className="dm-section-sub">Transparent process, no surprises. Here's exactly what happens after you reach out.</p>

          <div className="dm-process-grid">
            {[
              { num: '01', title: 'Submit Request', desc: 'Fill in the simple form below or WhatsApp me. Tell me your goal and what you need.' },
              { num: '02', title: 'Consultation', desc: 'I review your request and may follow up with a few questions to tailor the solution.' },
              { num: '03', title: 'Delivery', desc: 'You receive the completed work — CV, website, or digital setup — on time, every time.' },
              { num: '04', title: 'Support', desc: 'Revisions included. I stay available for questions and follow-up support after delivery.' },
            ].map(step => (
              <div className="dm-process-step" key={step.num}>
                <div className="dm-process-num">{step.num}</div>
                <div className="dm-process-title">{step.title}</div>
                <p className="dm-process-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STATS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="dm-stats">
        <div className="dm-container">
          <div className="dm-stats-grid">
            {[
              { num: '10+', label: 'Happy Clients Served' },
              { num: '100%', label: 'Client Satisfaction' },
              { num: '100%', label: 'Got Interviews or Promotions' },
              { num: '24–72h', label: 'Average Delivery' },
            ].map(s => (
              <div key={s.label}>
                <div className="dm-stat-num">{s.num}</div>
                <div className="dm-stat-label">{s.label}</div>
              </div>
            ))}
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

          {/* Free Audit Banner */}
          <div className="dm-audit-banner" style={{ marginBottom: '2.5rem' }}>
            <div className="dm-audit-text">
              <strong>🎯 Free CV Audit Available</strong>
              <p>Not sure which package fits? Request a free CV audit and I'll tell you exactly what needs improving.</p>
            </div>
            <button className="dm-btn-primary" onClick={() => scrollTo('contact')}>
              Get Free Audit
            </button>
          </div>

          <div className="dm-pricing-grid">
            {CAREER_PACKAGES.map(pkg => (
              <div key={pkg.id} className={`dm-pricing-card${pkg.featured ? ' featured' : ''}`}>
                {pkg.featured && <div className="dm-pricing-badge">⭐ Most Popular</div>}
                <div className="dm-pricing-tier">{pkg.tier}</div>
                <div className="dm-pricing-price">
                  <small>KES </small>{pkg.price.toLocaleString()}
                </div>
                <div className="dm-pricing-delivery">{pkg.delivery}</div>
                <ul className="dm-pricing-features">
                  {pkg.features.map(f => <li key={f}>{f}</li>)}
                </ul>
                <button
                  className={`dm-pricing-btn ${pkg.featured ? 'primary' : 'outline'}`}
                  onClick={() => openPayModal(pkg)}
                >
                  Get Started — KES {pkg.price.toLocaleString()}
                </button>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: 'var(--dm-text-muted)' }}>
            💳 Secure payment via Paystack · M-Pesa, Card & Bank accepted · Duncan contacts you within 24 hours of payment
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
                color: '#0D9488',
              },
              {
                stars: '★★★★★',
                text: '"He built my business website in under 48 hours. It looks professional, loads fast, and I\'ve already gotten two client inquiries through the contact form."',
                name: 'Jeniffer T.',
                role: 'Independent Consultant',
                initials: 'JT',
                color: '#6366F1',
              },
              {
                stars: '★★★★★',
                text: '"My LinkedIn profile was basic before Duncan optimized it. Now I get recruiter messages regularly. Worth every shilling."',
                name: 'Edwin M.',
                role: 'Finance & Operations Professional',
                initials: 'EM',
                color: '#F59E0B',
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
                <span style={{ fontSize: '0.78rem', color: 'var(--dm-teal)', fontWeight: 600, letterSpacing: '0.04em' }}>Career Consultant & Digital Strategist</span>
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
                    <span className="dm-about-check">✓</span>
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
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 1.5rem', borderRadius: '10px', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', fontFamily: 'Inter, sans-serif', transition: 'opacity 0.15s' }}
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
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--dm-teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>📞</div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dm-text-muted)', marginBottom: '0.2rem' }}>Phone / WhatsApp</div>
                    <a href="tel:+254794877125" style={{ fontWeight: 700, color: 'var(--dm-navy)', textDecoration: 'none', fontSize: '0.95rem' }}>+254 794 877 125</a>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--dm-teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>✉️</div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dm-text-muted)', marginBottom: '0.2rem' }}>Email</div>
                    <a href="mailto:info@duncanmakoyo.com" style={{ fontWeight: 700, color: 'var(--dm-navy)', textDecoration: 'none', fontSize: '0.95rem' }}>info@duncanmakoyo.com</a>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--dm-teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>⏱️</div>
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
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
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
                    🔒 Your information is safe and never shared with third parties.
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
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', borderRadius: '10px', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}
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
                <div>📞 <a href="tel:+254794877125">+254 794 877 125</a></div>
                <div>✉️ <a href="mailto:info@duncanmakoyo.com">info@duncanmakoyo.com</a></div>
                <div>🌐 <a href="https://duncanmakoyo.com" style={{ color: 'var(--dm-teal)' }}>duncanmakoyo.com</a></div>
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
                  <button className="dm-footer-link" onClick={() => onNavigateToPath('terms')}>Terms of Use</button>
                  <button className="dm-footer-link" onClick={() => onNavigateToPath('privacy')}>Privacy Policy</button>
                </>
              )}
            </div>

            {/* Connect col */}
            <div>
              <div className="dm-footer-col-title">Connect</div>
              <a className="dm-footer-link" href="https://wa.me/254794877125" target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>
              <a className="dm-footer-link" href="https://www.linkedin.com/in/duncan-makoyo-196ba7307/" target="_blank" rel="noopener noreferrer">🔗 LinkedIn</a>
              <a className="dm-footer-link" href="mailto:info@duncanmakoyo.com">✉️ Email Me</a>
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
      >
        💬
      </a>

    </div>
  );
}
