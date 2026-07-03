import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Shield, Lock, Loader2, ArrowRight, X, Phone, Mail, MapPin } from 'lucide-react';
import './WorkshopLanding.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

const WORKSHOP_DATE = new Date('2026-07-18T11:00:00Z'); // 2:00 PM EAT

const CURRICULUM = [
  { icon: '✅', color: 'blue', title: 'Build one Master CV', desc: 'That never needs to be rewritten from scratch.' },
  { icon: '✅', color: 'green', title: 'Create targeted CV versions', desc: 'Turn that one CV into multiple versions for different jobs in minutes.' },
  { icon: '✅', color: 'purple', title: 'Use ChatGPT properly', desc: 'Learn to write prompts that deliver high-quality results instead of guessing.' },
  { icon: '✅', color: 'gold', title: 'Match the job description', desc: 'Make every application closely align with what recruiters are scanning for.' },
  { icon: '✅', color: 'blue', title: 'Generate cover letters', desc: 'Create tailored, professional cover letters in minutes.' },
  { icon: '✅', color: 'green', title: 'Avoid application filters', desc: 'Understand the critical mistakes that cause recruiters to skip your CV.' },
];

const TESTIMONIALS = [
  { name: 'Isabella Makori', initial: 'IM', text: 'Working with Duncan was a wonderful experience. He is a team player. Highly recommended.' },
  { name: 'Philemon Kirui', initial: 'PK', text: 'I am writing to recommend Duncan for new engagements. Having worked together at Equity Bank, I can confidently state that Duncan has all the qualities of a team player and can perform well as a team leader. He has an eye for detail and he is well motivated and can make a significant positive difference and impact when given an opportunity.' },
  { name: 'Damaris Nyagaka', initial: 'DN', text: 'Makoyo is a team player, energetic and has great potential to Transform lives. Recommended!!' },
  { name: 'Rabin Ogesi', initial: 'RO', text: 'Duncan Makoyo is a team player, eager to learn, highly productive, reliable at all times. Highly recommended.' },
  { name: 'Achieri Maxmillah', initial: 'AM', text: 'I worked with Duncan Makoyo at equity bank and was impressed by his commitment and smart approach to work. He is tech-Savy, always demonstrated professionalism and his ability to adapt to new challenges made him a valuable member and dependable contributor.' },
  { name: 'Collins Kiprotich Koech', initial: 'CK', text: 'Duncan is a genuine and competent leader.' },
];

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, targetDate - Date.now());
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

export default function WorkshopLanding({ onNavigate }) {
  const [earlyBirdRemaining, setEarlyBirdRemaining] = useState(20);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const countdown = useCountdown(WORKSHOP_DATE);
  const isEarlyBird = earlyBirdRemaining > 0;
  const pricingRef = useRef(null);

  // Fetch early bird seat counts
  useEffect(() => {
    fetch(`${API_URL}/api/workshop/early-bird-count`)
      .then(r => r.json())
      .then(d => { if (d.success) setEarlyBirdRemaining(d.remaining); })
      .catch(() => {})
      .finally(() => setLoadingSeats(false));
  }, []);

  // Load Paystack
  useEffect(() => {
    if (!document.getElementById('paystack-script')) {
      const s = document.createElement('script');
      s.id = 'paystack-script';
      s.src = 'https://js.paystack.co/v1/inline.js';
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  const scrollToPricing = () => pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const openModal = () => setShowModal(true);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    if (!fullName.trim()) { setErrorMsg('Please enter your full name.'); setIsSubmitting(false); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorMsg('Please enter a valid email address.'); setIsSubmitting(false); return; }
    if (!phone.trim() || phone.trim().length < 8) { setErrorMsg('Please enter a valid phone number.'); setIsSubmitting(false); return; }
    if (!PAYSTACK_PUBLIC_KEY) { setErrorMsg('Our payment gateway is temporarily unavailable. Please contact support.'); setIsSubmitting(false); return; }
    if (!window.PaystackPop) { setErrorMsg('Payment gateway is loading. Please wait a moment and try again.'); setIsSubmitting(false); return; }

    try {
      const ticketType = isEarlyBird ? 'early_bird' : 'regular';
      const res = await fetch(`${API_URL}/api/workshop/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), ticket_type: ticketType }),
      });
      const data = await res.json();
      if (!res.ok || !data?.data?.reference) throw new Error(data.error || 'We could not start the checkout process. Please try again.');

      const { reference } = data.data;
      const amountKES = ticketType === 'early_bird' ? 1000 : 1500;

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: email.trim().toLowerCase(),
        amount: amountKES * 100,
        currency: 'KES',
        ref: reference,
        callback: (response) => {
          (async () => {
            try {
              setIsSubmitting(true);
              const vRes = await fetch(`${API_URL}/api/workshop/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reference: response.reference }),
              });
              const vData = await vRes.json();
              if (vRes.ok && vData.status === 'paid') {
                setSuccessMsg('Seat Confirmed! Check your email for the workshop toolkit and Google Meet link.');
                setShowModal(false);
                setFullName(''); setEmail(''); setPhone('');
              } else {
                setErrorMsg(vData.error || 'We could not verify your payment. Please contact info@duncanmakoyo.com.');
              }
            } catch { setErrorMsg('Payment was successful, but we had an issue confirming your seat. Please email info@duncanmakoyo.com.'); }
            finally { setIsSubmitting(false); }
          })();
        },
        onClose: () => setIsSubmitting(false),
      });
      handler.openIframe();
    } catch (err) {
      setErrorMsg(err.message || 'We could not start the payment process. Please try again.');
      setIsSubmitting(false);
    }
  };

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="ws-page">
      {/* ═══ STICKY NAV ═══ */}
      <nav className="ws-nav">
        <div className="ws-nav-inner">
          <button className="ws-nav-brand" onClick={() => onNavigate && onNavigate('services')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <div className="ws-nav-logo">AI</div>
            <div className="ws-nav-title">AI Job Seeker<small>Workshop</small></div>
          </button>
          <div className="ws-nav-links">
            <button className="ws-nav-link" onClick={scrollToPricing}>Pricing</button>
            <button className="ws-nav-link" onClick={() => document.getElementById('ws-for-you')?.scrollIntoView({ behavior: 'smooth' })}>Is This For You?</button>
            <button className="ws-nav-link" onClick={() => document.getElementById('ws-learn')?.scrollIntoView({ behavior: 'smooth' })}>What You'll Learn</button>
            <button className="ws-nav-link" onClick={() => document.getElementById('ws-testimonials')?.scrollIntoView({ behavior: 'smooth' })}>Reviews</button>
            <button className="ws-nav-link" onClick={() => window.location.hash = '#/terms'}>Terms</button>
            <button className="ws-nav-link" onClick={() => window.location.hash = '#/privacy'}>Privacy</button>
            <button className="ws-nav-cta" onClick={openModal}>Reserve My Seat</button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="ws-hero">
        <div className="ws-hero-grid">
          {/* Left */}
          <div className="ws-hero-content">
            <div className="ws-hero-pill">🔴 LIVE ONLINE WORKSHOP</div>

            <h1>
              Get More Interviews <br/>
              <span>Without Rewriting Your CV Every Time</span>
            </h1>

            <p className="ws-hero-sub">
              Learn a practical AI workflow that helps you tailor your CV to every application in minutes.
            </p>

            <div className="ws-hero-badges">
              <div className="ws-hero-badge-item"><div className="ws-hero-badge-icon">✓</div> Live AI Demonstration</div>
              <div className="ws-hero-badge-item"><div className="ws-hero-badge-icon">✓</div> Build Along Step-by-Step</div>
              <div className="ws-hero-badge-item"><div className="ws-hero-badge-icon">✓</div> Copy-and-Paste Prompts Included</div>
              <div className="ws-hero-badge-item"><div className="ws-hero-badge-icon">✓</div> Leave With a CV You Can Reuse</div>
            </div>

            <div className="ws-hero-btns">
              <button className="ws-btn-green" onClick={openModal}>
                Reserve My Seat <ArrowRight size={18} />
              </button>
              <a
                href="https://wa.me/254794877125?text=Hi%20Duncan%2C%20I%27m%20interested%20in%20the%20AI%20Job%20Seeker%20Workshop."
                target="_blank"
                rel="noopener noreferrer"
                className="ws-btn-whatsapp ws-whatsapp-glow"
              >
                💬 WhatsApp Me
              </a>
            </div>
          </div>

          {/* Right */}
          <div className="ws-hero-visual">
            <div className="ws-portrait-container">
              <div className="ws-portrait-glow" />
              <img src="/portrait.jpeg" alt="Duncan Makoyo" className="ws-portrait-img" loading="eager" decoding="async" width="340" height="453" />
              {/* Floating icons */}
              <div className="ws-float-icon ws-fi-1">💻</div>
              <div className="ws-float-icon ws-fi-2">🎓</div>
              <div className="ws-float-icon ws-fi-3">📜</div>
              <div className="ws-float-icon ws-fi-4">📱</div>
              <div className="ws-float-icon ws-fi-5">⏰</div>
              {/* Trainer tag */}
              <div className="ws-trainer-tag">
                <strong>Duncan Makoyo</strong>
                <span>ATS Resume Writer &amp; LinkedIn Specialist</span>
              </div>
            </div>

            {/* Countdown card */}
            <div className="ws-countdown-card">
              <div className="ws-countdown-label">⏰ Workshop starts in:</div>
              <div className="ws-countdown-timer">
                <div className="ws-cd-unit"><strong>{pad(countdown.days)}</strong><span>Days</span></div>
                <div className="ws-cd-unit"><strong>{pad(countdown.hours)}</strong><span>Hrs</span></div>
                <div className="ws-cd-unit"><strong>{pad(countdown.mins)}</strong><span>Mins</span></div>
                <div className="ws-cd-unit"><strong>{pad(countdown.secs)}</strong><span>Secs</span></div>
              </div>
              <div className="ws-countdown-slots">
                {loadingSeats ? '...' : `${20 - earlyBirdRemaining} / 20 Early Bird Seats Taken`}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SUCCESS TOAST ═══ */}
      {successMsg && (
        <div style={{ padding: '1.5rem' }}>
          <div className="ws-success-toast">
            <CheckCircle2 size={36} />
            <div>
              <h4>Registration Successful!</h4>
              <p>{successMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ IS THIS WORKSHOP FOR YOU? ═══ */}
      <section className="ws-bonus-section" id="ws-for-you" style={{ background: 'var(--ws-gray-50)', borderBottom: '1px solid var(--ws-gray-200)', padding: '5rem 1.5rem' }}>
        <div className="ws-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="ws-section-label" style={{ display: 'block', textAlign: 'center', width: 'fit-content', margin: '0 auto 1.25rem' }}>Target Audience</div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '2.5rem', letterSpacing: '-0.02em' }}>
            Is This Workshop For You?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              "You're applying for jobs but rarely getting interviews.",
              "You've heard about AI but don't know how to use it professionally.",
              "You spend too much time editing your CV.",
              "You want a repeatable process instead of starting from scratch.",
              "You want practical skills you can use immediately after the workshop."
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'center', background: '#fff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid var(--ws-gray-200)', boxShadow: 'var(--ws-shadow-sm)' }}>
                <span style={{ fontSize: '1.2rem', color: 'var(--ws-blue)' }}>✔</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 550, color: 'var(--ws-gray-800)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ YOU KEEP EVERYTHING ═══ */}
      <section className="ws-trust-bar">
        <div className="ws-container">
          <div className="ws-section-label" style={{ display: 'block', textAlign: 'center', width: 'fit-content', margin: '0 auto 1.25rem' }}>Takeaways</div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '2.5rem', letterSpacing: '-0.02em' }}>You Keep Everything</h2>
          <div className="ws-trust-grid">

            {[
              { icon: '📚', title: 'AI Prompt Library', desc: 'Copy-and-paste prompt workflow' },
              { icon: '📄', title: 'ATS CV Template', desc: 'Recruiter-approved parser-safe template' },
              { icon: '📐', title: 'Master CV Framework', desc: 'Structured layout for any industry' },
              { icon: '🎯', title: 'Job Matching Prompts', desc: 'Extract key keywords in seconds' },
              { icon: '📧', title: 'Cover Letter Prompts', desc: 'Tailor custom cover letters instantly' },
            ].map((item, i) => (
              <div key={i} className="ws-trust-card">
                <div className="ws-trust-icon">{item.icon}</div>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHAT YOU'LL LEARN + PRICING ═══ */}
      <section className="ws-learn-section" id="ws-learn">
        <div className="ws-learn-grid">
          {/* Left: Curriculum */}
          <div className="ws-learn-left">
            <div className="ws-section-label">Curriculum</div>
            <h2>During this workshop you'll learn to...</h2>
            <div className="ws-curriculum-grid" style={{ gridTemplateColumns: '1fr' }}>
              {CURRICULUM.map((item, i) => (
                <div key={i} className="ws-curr-item" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '1.25rem' }}>
                  <div style={{ fontSize: '1.25rem', color: 'var(--ws-green)' }}>{item.icon}</div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{item.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--ws-text-muted)', margin: '4px 0 0' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Pricing card */}
          <div ref={pricingRef}>
            <div className="ws-pricing-card">
              <div className="ws-pricing-header">
                <span>FIRST 20 SEATS ONLY!</span>
              </div>
              <div className="ws-pricing-body">
                <div className="ws-pricing-label">{isEarlyBird ? 'EARLY BIRD OFFER' : 'REGULAR PRICE'}</div>
                <div className="ws-pricing-amount">KES {isEarlyBird ? '1,000' : '1,500'}</div>
                {isEarlyBird && <div className="ws-pricing-original">Regular Price: KES 1,500</div>}

                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--ws-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', textAlign: 'left' }}>
                  Here's what you leave with:
                </div>
                <ul className="ws-pricing-features">
                  {[
                    'My complete AI prompting workflow',
                    'Reusable ATS-friendly CV template',
                    'Cover letter prompt library',
                    'Job description matching framework',
                    'Lifetime access to workshop slides'
                  ].map((f, i) => (
                    <li key={i}><CheckCircle2 size={16} className="ws-pf-check" /> {f}</li>
                  ))}
                </ul>

                <button className="ws-pricing-cta-btn" onClick={openModal}>
                  RESERVE MY SEAT <ArrowRight size={18} />
                </button>
                <div className="ws-pricing-secure">
                  <Shield size={14} /> Secure Payment By Paystack
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BY THE END OF THE WORKSHOP YOU'LL HAVE ═══ */}
      <section className="ws-bonus-section" style={{ background: 'var(--ws-white)', borderTop: '1px solid var(--ws-gray-200)', borderBottom: '1px solid var(--ws-gray-200)', padding: '5rem 1.5rem' }}>
        <div className="ws-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="ws-section-label" style={{ display: 'block', textAlign: 'center', width: 'fit-content', margin: '0 auto 1.25rem' }}>Outcome</div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '2.5rem', letterSpacing: '-0.02em' }}>
            By the End of the Workshop You'll Have
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {[
              "One professional Master CV",
              "AI prompts you can reuse",
              "A tailored CV for a real job",
              "A repeatable application workflow",
              "Confidence using AI during your job search"
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--ws-gray-50)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--ws-gray-200)' }}>
                <span style={{ fontSize: '1.1rem', color: 'var(--ws-green)' }}>✓</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ws-gray-800)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="ws-testimonials-section" id="ws-testimonials">
        <div className="ws-section-label" style={{ display: 'block', textAlign: 'center', maxWidth: 'fit-content', margin: '0 auto 1rem' }}>Social Proof</div>
        <h2>Professionals Already Trust My Process</h2>
        <p className="ws-testimonials-desc">Recommendations from colleagues and professionals who have worked alongside Duncan.</p>
        <div className="ws-testimonials-grid">
          {TESTIMONIALS.slice(0, 3).map((t, i) => (
            <div key={i} className="ws-testimonial-card">
              <div className="ws-testimonial-stars">★★★★★</div>
              <p className="ws-testimonial-text">"{t.text}"</p>
              <div className="ws-testimonial-author">
                <div className="ws-testimonial-avatar">{t.initial}</div>
                <div className="ws-testimonial-name">{t.name}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ COUNTDOWN / URGENCY ═══ */}
      <section className="ws-urgency-section">
        <div className="ws-urgency-inner">
          <div className="ws-urgency-label">EARLY BIRD OFFER ENDS IN:</div>
          <div className="ws-urgency-timer">
            <div className="ws-urgency-unit"><strong>{pad(countdown.days)}</strong><span>Days</span></div>
            <div className="ws-urgency-unit"><strong>{pad(countdown.hours)}</strong><span>Hours</span></div>
            <div className="ws-urgency-unit"><strong>{pad(countdown.mins)}</strong><span>Mins</span></div>
            <div className="ws-urgency-unit"><strong>{pad(countdown.secs)}</strong><span>Secs</span></div>
          </div>
          <div className="ws-urgency-seats">
            {loadingSeats ? '...' : `${20 - earlyBirdRemaining} / 20 Early Bird Seats Taken`}
          </div>
          <div className="ws-urgency-note">
            Hurry! Once the first 20 seats are gone, price goes up to KES 1,500.
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="ws-final-cta">
        <h2>The next job you apply for doesn't have to use the same CV you've been sending everywhere.</h2>
        <p>Spend two hours learning a workflow you can use for every application going forward. Reserve your seat before the early-bird offer ends.</p>
        <div className="ws-final-btns">
          <button className="ws-btn-green" onClick={openModal}>
            RESERVE MY SEAT NOW <ArrowRight size={18} />
          </button>
          <a
            href="https://wa.me/254794877125?text=Hi%20Duncan%2C%20I%27m%20interested%20in%20the%20AI%20Job%20Seeker%20Workshop."
            target="_blank"
            rel="noopener noreferrer"
            className="ws-btn-whatsapp ws-whatsapp-glow"
          >
            💬 WhatsApp Me
          </a>
        </div>
        <div className="ws-final-phone">
          📞 <a href="tel:+254794877125">0794 877 125</a>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="ws-footer">
        <div className="ws-footer-grid">
          {/* Brand */}
          <div>
            <div className="ws-footer-brand-logo">
              <div className="ws-nav-logo">AI</div>
              <strong style={{ color: '#fff', fontSize: '0.9rem' }}>AI Job Seeker Workshop</strong>
            </div>
            <p className="ws-footer-brand-desc">Helping job seekers use AI to create CVs that get results.</p>
            <div className="ws-footer-socials">
              <a className="ws-footer-social" href="https://www.linkedin.com/in/duncan-makoyo-196ba7307/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">in</a>
              <a className="ws-footer-social" href="https://wa.me/254794877125" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">💬</a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="ws-footer-col">
            <h4>Quick Links</h4>
            <button className="ws-footer-link" onClick={() => window.location.hash = '#/'}>Home</button>
            <button className="ws-footer-link" onClick={scrollToPricing}>Pricing</button>
            <button className="ws-footer-link" onClick={() => document.getElementById('ws-learn')?.scrollIntoView({ behavior: 'smooth' })}>What You'll Learn</button>
            <button className="ws-footer-link" onClick={() => document.getElementById('ws-testimonials')?.scrollIntoView({ behavior: 'smooth' })}>Reviews</button>
          </div>

          {/* Workshop Details */}
          <div className="ws-footer-col">
            <h4>Workshop Details</h4>
            <div className="ws-footer-link">🎥 Live On Google Meet</div>
            <div className="ws-footer-link">⏱ 2 Hours Interactive Session</div>
            <div className="ws-footer-link">🎟 Limited To 20 Seats</div>
          </div>

          {/* Contact */}
          <div className="ws-footer-col">
            <h4>Contact</h4>
            <a className="ws-footer-link" href="tel:+254794877125"><Phone size={14} /> 0794 877125</a>
            <a className="ws-footer-link" href="mailto:info@duncanmakoyo.com"><Mail size={14} /> info@duncanmakoyo.com</a>
            <div className="ws-footer-link"><MapPin size={14} /> Kisii, Kenya</div>
            <button className="ws-footer-link" onClick={() => window.location.hash = '#/terms'}>Terms of Use</button>
            <button className="ws-footer-link" onClick={() => window.location.hash = '#/privacy'}>Privacy Policy</button>
          </div>
        </div>
        <div className="ws-footer-bottom">
          © {new Date().getFullYear()} AI Job Seeker Workshop. All Rights Reserved.
        </div>
      </footer>

      {/* ═══ REGISTRATION MODAL ═══ */}
      {showModal && (
        <div className="ws-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="ws-modal-card">
            <div className="ws-modal-header">
              <h3>Reserve Your Seat</h3>
              <button className="ws-modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="ws-modal-body">
              {errorMsg && <div className="ws-modal-alert error">{errorMsg}</div>}

              <form onSubmit={handleRegister}>
                <label htmlFor="ws-name">Full Name</label>
                <input id="ws-name" type="text" placeholder="Enter your full name" value={fullName} onChange={e => setFullName(e.target.value)} required />

                <label htmlFor="ws-email">Email Address</label>
                <input id="ws-email" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />

                <label htmlFor="ws-phone">Phone Number</label>
                <input id="ws-phone" type="tel" placeholder="0712 345 678" value={phone} onChange={e => setPhone(e.target.value)} required />

                <div className="ws-modal-ticket-info">
                  <span>Selected Ticket:</span>
                  <strong>{isEarlyBird ? 'Early Bird — KES 1,000' : 'Regular — KES 1,500'}</strong>
                </div>

                <button type="submit" disabled={isSubmitting} className="ws-modal-submit">
                  {isSubmitting ? (
                    <><Loader2 size={16} className="ws-spin" /> Redirecting to Paystack...</>
                  ) : (
                    <><Lock size={16} /> Proceed to Secure Payment</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
