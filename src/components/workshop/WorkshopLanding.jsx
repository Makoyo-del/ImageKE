import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Loader2, ArrowRight, X, Phone, Mail, MapPin, Users, Clock, Star } from 'lucide-react';
import './WorkshopLanding.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';
const WORKSHOP_DATE = new Date('2026-07-18T11:00:00Z'); // 2:00 PM EAT
const WHATSAPP_GROUP = 'https://chat.whatsapp.com/HhehXfi5reR4RzXOHh3rdo';
const MAX_SEATS = 100;

const CURRICULUM = [
  { color: 'blue',   title: 'Build one Master CV',        desc: 'That never needs to be rewritten from scratch.' },
  { color: 'green',  title: 'Create targeted CV versions', desc: 'Turn that one CV into multiple versions for different jobs in minutes.' },
  { color: 'purple', title: 'Use ChatGPT properly',        desc: 'Write prompts that deliver high-quality results instead of guessing.' },
  { color: 'gold',   title: 'Match the job description',   desc: 'Make every application closely align with what recruiters are scanning for.' },
  { color: 'blue',   title: 'Generate cover letters',      desc: 'Create tailored, professional cover letters in minutes.' },
  { color: 'green',  title: 'Avoid application filters',   desc: 'Understand the critical mistakes that cause recruiters to skip your CV.' },
];

const TESTIMONIALS = [
  { name: 'Isabella Makori',        initial: 'IM', text: 'Working with Duncan was a wonderful experience. He is a team player. Highly recommended.' },
  { name: 'Philemon Kirui',         initial: 'PK', text: 'Duncan has all the qualities of a team player and can perform well as a team leader. He has an eye for detail and is well motivated.' },
  { name: 'Achieri Maxmillah',      initial: 'AM', text: 'He is tech-savvy, always demonstrated professionalism and his ability to adapt to new challenges made him a valuable and dependable contributor.' },
  { name: 'Damaris Nyagaka',        initial: 'DN', text: 'Makoyo is a team player, energetic and has great potential to Transform lives. Recommended!!' },
  { name: 'Rabin Ogesi',            initial: 'RO', text: 'Duncan Makoyo is a team player, eager to learn, highly productive, reliable at all times. Highly recommended.' },
  { name: 'Collins Kiprotich Koech',initial: 'CK', text: 'Duncan is a genuine and competent leader.' },
];

// UI/UX Pro Max: "What vs How" upsell — Trust & Authority pattern
const WHAT_VS_HOW = [
  { what: 'What ATS algorithms actually scan for',              how: 'Duncan maps every keyword to your specific role and sector' },
  { what: 'Why your current CV is being filtered out',          how: 'We rebuild your CV from scratch against the exact job spec' },
  { what: 'How to write AI prompts for cover letters',          how: 'We draft 3 tailored cover letters ready to send immediately' },
  { what: 'The Master CV framework that works for any role',    how: 'Your optimized Master CV delivered in 48 hours, guaranteed' },
];

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, targetDate - Date.now());
      setTimeLeft({
        days:  Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins:  Math.floor((diff % 3600000) / 60000),
        secs:  Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

export default function WorkshopLanding({ onNavigate }) {
  // Seat state
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [isFull, setIsFull]                   = useState(false);
  const [loadingSeats, setLoadingSeats]       = useState(true);

  // Dynamic workshop configurations from backend
  const [maxSeats, setMaxSeats] = useState(100);
  const [whatsappGroup, setWhatsappGroup] = useState('https://chat.whatsapp.com/HhehXfi5reR4RzXOHh3rdo');
  const [sessionDate, setSessionDate] = useState('Saturday, 18th July 2026');
  const [sessionTime, setSessionTime] = useState('2:00 PM EAT');
  const [workshopDate, setWorkshopDate] = useState(new Date('2026-07-18T11:00:00Z'));
  const [sessionDuration, setSessionDuration] = useState('2 Hours');

  // Modal / form state
  const [showModal, setShowModal]         = useState(false);
  const [modalState, setModalState]       = useState('form'); // 'form' | 'waitlist' | 'success' | 'already'
  const [fullName, setFullName]           = useState('');
  const [email, setEmail]                 = useState('');
  const [phone, setPhone]                 = useState('');
  const [profession, setProfession]       = useState('');
  const [challenge, setChallenge]         = useState('');
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [errorMsg, setErrorMsg]           = useState('');

  // Waitlist form state
  const [wlName, setWlName]               = useState('');
  const [wlEmail, setWlEmail]             = useState('');
  const [wlPhone, setWlPhone]             = useState('');
  const [wlSubmitting, setWlSubmitting]   = useState(false);
  const [wlSuccess, setWlSuccess]         = useState(false);
  const [wlError, setWlError]             = useState('');

  const countdown  = useCountdown(workshopDate);
  const pricingRef = useRef(null);
  const pad        = (n) => String(n).padStart(2, '0');
  const remaining  = Math.max(0, maxSeats - totalRegistered);
  const pctFull    = Math.min(100, Math.round((totalRegistered / maxSeats) * 100));

  // ── Fetch seat count & configs on mount (UI/UX Pro Max: immediate data, no jank)
  useEffect(() => {
    // 1. Fetch config first to align frontend with backend
    fetch(`${API_URL}/api/workshop/config`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          if (d.maxSeats) setMaxSeats(d.maxSeats);
          if (d.whatsappGroup) setWhatsappGroup(d.whatsappGroup);
          if (d.sessionDate) setSessionDate(d.sessionDate);
          if (d.sessionTime) setSessionTime(d.sessionTime);
          if (d.workshopDate) setWorkshopDate(new Date(d.workshopDate));
          if (d.sessionDuration) setSessionDuration(d.sessionDuration);
        }
      })
      .catch(() => {});

    // 2. Fetch registration count
    fetch(`${API_URL}/api/workshop/registration-count`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTotalRegistered(d.confirmed || 0);
          setIsFull(d.isFull || false);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSeats(false));
  }, []);

  const scrollToPricing = () => pricingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const openModal = () => {
    setModalState(isFull ? 'waitlist' : 'form');
    setErrorMsg('');
    setShowModal(true);
  };

  // ── Free registration submit
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim())                                         return setErrorMsg('Please enter your full name.');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErrorMsg('Please enter a valid email address.');
    if (!phone.trim() || phone.trim().length < 8)                 return setErrorMsg('Please enter a valid phone number.');

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/workshop/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:           fullName.trim(),
          email:               email.trim().toLowerCase(),
          phone:               phone.trim(),
          current_profession:  profession.trim(),
          biggest_challenge:   challenge.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        return;
      }

      if (data.alreadyRegistered) {
        setModalState('already');
        return;
      }

      if (data.full) {
        // Seats just ran out between page load and submit — switch to waitlist
        setIsFull(true);
        setTotalRegistered(maxSeats);
        setModalState('waitlist');
        return;
      }

      // Success!
      setTotalRegistered(prev => Math.min(maxSeats, prev + 1));
      setModalState('success');
    } catch {
      setErrorMsg('A network error occurred. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Waitlist submit (when modal opens in waitlist state)
  const handleWaitlist = async (e) => {
    e.preventDefault();
    setWlError('');
    if (!wlName.trim())                                             return setWlError('Please enter your name.');
    if (!wlEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(wlEmail)) return setWlError('Please enter a valid email address.');
    setWlSubmitting(true);
    try {
      await fetch(`${API_URL}/api/workshop/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: wlName.trim(), email: wlEmail.trim().toLowerCase(), phone: wlPhone.trim() }),
      });
      setWlSuccess(true);
    } catch {
      setWlError('Could not save your details. Please try again.');
    } finally {
      setWlSubmitting(false);
    }
  };

  return (
    <div className="ws-page">

      {/* ═══ STICKY NAV ═══ */}
      <nav className="ws-nav" aria-label="Workshop navigation">
        <div className="ws-nav-inner">
          <button className="ws-nav-brand" onClick={() => onNavigate && onNavigate('services')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <div className="ws-nav-logo">AI</div>
            <div className="ws-nav-title">Duncan Makoyo<small>Free Masterclass</small></div>
          </button>
          <div className="ws-nav-links">
            <button className="ws-nav-link" onClick={scrollToPricing}>Seats</button>
            <button className="ws-nav-link" onClick={() => document.getElementById('ws-learn')?.scrollIntoView({ behavior: 'smooth' })}>What You'll Learn</button>
            <button className="ws-nav-link" onClick={() => document.getElementById('ws-upsell')?.scrollIntoView({ behavior: 'smooth' })}>Premium Services</button>
            <button className="ws-nav-link" onClick={() => document.getElementById('ws-testimonials')?.scrollIntoView({ behavior: 'smooth' })}>Reviews</button>
            <button className="ws-nav-cta" onClick={openModal}>
              {isFull ? 'Join Waitlist' : 'Claim My Free Seat'}
            </button>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="ws-hero">
        <div className="ws-hero-grid">
          {/* Left: Copy */}
          <div className="ws-hero-content">
            <div className="ws-hero-pill">
              <span className="ws-live-dot" aria-hidden="true" />
              FREE LIVE MASTERCLASS
            </div>

            <h1>
              How to Use AI to Land{' '}
              <span>More Interviews</span>{' '}
              Without Sending Hundreds of Applications
            </h1>

            <p className="ws-hero-sub">
              A {sessionDuration} live session that shows you the exact AI workflow used to build CVs that pass ATS filters and get recruiters to respond.
            </p>

            {/* Live seat bar — UI/UX Pro Max: urgency + scarcity */}
            <div className="ws-seats-bar" ref={pricingRef}>
              <div className="ws-seats-bar-track">
                <div className="ws-seats-bar-fill" style={{ width: `${pctFull}%` }} />
              </div>
              <div className="ws-seats-bar-label">
                {loadingSeats ? (
                  <span>Checking availability…</span>
                ) : isFull ? (
                  <span className="ws-seats-full">🔴 All {maxSeats} seats taken — join the waitlist</span>
                ) : (
                  <span><strong>{remaining}</strong> of {maxSeats} free seats remaining</span>
                )}
              </div>
            </div>

            <div className="ws-hero-badges">
              {[
                { icon: <Users size={14} />, label: 'Live AI Demonstration' },
                { icon: <Clock size={14} />, label: `${sessionDuration} Live Session` },
                { icon: <Star  size={14} />, label: 'Free Prompt Library Included' },
                { icon: <CheckCircle2 size={14} />, label: 'Reusable ATS CV Template' },
              ].map((b, i) => (
                <div key={i} className="ws-hero-badge-item">
                  <div className="ws-hero-badge-icon">{b.icon}</div>
                  {b.label}
                </div>
              ))}
            </div>

            <div className="ws-hero-btns">
              <button className="ws-btn-green" onClick={openModal} aria-label="Claim your free masterclass seat">
                {isFull ? 'Join the Waitlist' : 'Claim My Free Seat'} <ArrowRight size={18} />
              </button>
              <a
                href="https://wa.me/254794877125?text=Hi%20Duncan%2C%20I%27m%20interested%20in%20the%20Free%20AI%20Job%20Search%20Masterclass."
                target="_blank"
                rel="noopener noreferrer"
                className="ws-btn-whatsapp ws-whatsapp-glow"
              >
                💬 WhatsApp Me
              </a>
            </div>
          </div>

          {/* Right: Portrait + countdown */}
          <div className="ws-hero-visual">
            <div className="ws-portrait-container">
              <div className="ws-portrait-glow" />
              <img src="/portrait.jpeg" alt="Duncan Makoyo — Career Mentor and AI Job Search Strategist" className="ws-portrait-img" loading="eager" decoding="async" width="340" height="453" />
              <div className="ws-float-icon ws-fi-1" aria-hidden="true">💻</div>
              <div className="ws-float-icon ws-fi-2" aria-hidden="true">🎓</div>
              <div className="ws-float-icon ws-fi-3" aria-hidden="true">📄</div>
              <div className="ws-float-icon ws-fi-4" aria-hidden="true">🤖</div>
              <div className="ws-float-icon ws-fi-5" aria-hidden="true">⭐</div>
              <div className="ws-trainer-tag">
                <strong>Duncan Makoyo</strong>
                <span>Career Mentor & AI Job Search Strategist</span>
              </div>
            </div>

            <div className="ws-countdown-card" aria-label="Countdown to masterclass">
              <div className="ws-countdown-label">⏰ Masterclass starts in:</div>
              <div className="ws-countdown-timer">
                <div className="ws-cd-unit"><strong>{pad(countdown.days)}</strong><span>Days</span></div>
                <div className="ws-cd-unit"><strong>{pad(countdown.hours)}</strong><span>Hrs</span></div>
                <div className="ws-cd-unit"><strong>{pad(countdown.mins)}</strong><span>Mins</span></div>
                <div className="ws-cd-unit"><strong>{pad(countdown.secs)}</strong><span>Secs</span></div>
              </div>
              <div className="ws-countdown-slots">
                📅 {sessionDate} · {sessionTime}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ IS THIS FOR YOU? ═══ */}
      <section className="ws-bonus-section" id="ws-for-you" style={{ background: 'var(--ws-gray-50)', borderBottom: '1px solid var(--ws-gray-200)', padding: '5rem 1.5rem' }}>
        <div className="ws-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="ws-section-label" style={{ display: 'block', textAlign: 'center', width: 'fit-content', margin: '0 auto 1.25rem' }}>Who This Is For</div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '2.5rem', letterSpacing: '-0.02em' }}>
            Is This Masterclass For You?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              "You're applying for jobs but rarely getting interviews despite being qualified.",
              "You've heard about AI tools but don't know how to use them professionally.",
              "You rewrite your CV from scratch for every job — and still hear nothing.",
              "You want a repeatable system, not another template that doesn't work.",
              "You want practical skills you can use in your next application — tonight.",
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'center', background: '#fff', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid var(--ws-gray-200)', boxShadow: 'var(--ws-shadow-sm)' }}>
                <CheckCircle2 size={20} style={{ color: 'var(--ws-green)', flexShrink: 0 }} aria-hidden="true" />
                <span style={{ fontSize: '0.95rem', fontWeight: 550, color: 'var(--ws-gray-800)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TAKEAWAYS ═══ */}
      <section className="ws-trust-bar">
        <div className="ws-container">
          <div className="ws-section-label" style={{ display: 'block', textAlign: 'center', width: 'fit-content', margin: '0 auto 1.25rem' }}>Takeaways</div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '2.5rem', letterSpacing: '-0.02em' }}>You Keep Everything</h2>
          <div className="ws-trust-grid">
            {[
              { icon: '📚', title: 'AI Prompt Library',      desc: 'Copy-and-paste CV and cover letter workflow' },
              { icon: '📄', title: 'ATS CV Template',        desc: 'Recruiter-approved, parser-safe template' },
              { icon: '📐', title: 'Master CV Framework',    desc: 'Structured layout that adapts to any industry' },
              { icon: '🎯', title: 'Job Matching Prompts',   desc: 'Extract critical keywords in seconds' },
              { icon: '📧', title: 'Cover Letter Prompts',   desc: 'Tailor custom cover letters instantly' },
            ].map((item, i) => (
              <div key={i} className="ws-trust-card">
                <div className="ws-trust-icon" aria-hidden="true">{item.icon}</div>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHAT YOU'LL LEARN + SEAT COUNTER ═══ */}
      <section className="ws-learn-section" id="ws-learn">
        <div className="ws-learn-grid">
          {/* Left: Curriculum */}
          <div className="ws-learn-left">
            <div className="ws-section-label">Curriculum</div>
            <h2>During this masterclass you'll learn to…</h2>
            <div className="ws-curriculum-grid" style={{ gridTemplateColumns: '1fr' }}>
              {CURRICULUM.map((item, i) => (
                <div key={i} className="ws-curr-item" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '1.25rem' }}>
                  <CheckCircle2 size={22} style={{ color: 'var(--ws-green)', flexShrink: 0 }} aria-hidden="true" />
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{item.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--ws-text-muted)', margin: '4px 0 0' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Free seat card */}
          <div>
            <div className="ws-pricing-card">
              <div className="ws-pricing-header">
                <span>{isFull ? '🔴 SEATS FULL — JOIN WAITLIST' : `🎓 FREE — ${remaining} SEATS LEFT`}</span>
              </div>
              <div className="ws-pricing-body">
                {/* UI/UX Pro Max: FREE badge with strong visual contrast */}
                <div className="ws-free-badge" aria-label="Free event">
                  FREE
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--ws-text-muted)', marginBottom: '1.25rem' }}>
                  No payment required. No credit card. Just show up.
                </div>

                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--ws-text)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                  What you'll walk away with:
                </div>
                <ul className="ws-pricing-features">
                  {[
                    'Complete AI prompting workflow',
                    'Reusable ATS-friendly CV template',
                    'Cover letter prompt library',
                    'Job description matching framework',
                    'Live CV teardown (your mistakes exposed)',
                  ].map((f, i) => (
                    <li key={i}><CheckCircle2 size={16} className="ws-pf-check" aria-hidden="true" /> {f}</li>
                  ))}
                </ul>

                {/* Live seat progress bar */}
                <div className="ws-seats-progress-wrap">
                  <div className="ws-seats-progress-bar">
                    <div className="ws-seats-progress-fill" style={{ width: `${pctFull}%`, background: isFull ? 'var(--ws-red)' : 'var(--ws-green-gradient)' }} />
                  </div>
                  <div className="ws-seats-progress-label">
                    {loadingSeats ? '…' : isFull ? `All ${maxSeats} seats taken` : `${totalRegistered} / ${maxSeats} seats taken`}
                  </div>
                </div>

                <button className="ws-pricing-cta-btn" onClick={openModal} aria-label={isFull ? 'Join the waitlist' : 'Claim your free masterclass seat'}>
                  {isFull ? 'JOIN THE WAITLIST' : 'CLAIM MY FREE SEAT'} <ArrowRight size={18} />
                </button>
                <div className="ws-pricing-secure">
                  <span role="img" aria-label="lock">🔒</span> No payment required · 100% Free
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHAT VS HOW UPSELL — UI/UX Pro Max: Trust & Authority pattern ═══ */}
      <section className="ws-what-how-section" id="ws-upsell" aria-labelledby="ws-upsell-heading">
        <div className="ws-container">
          <div className="ws-section-label" style={{ display: 'block', textAlign: 'center', width: 'fit-content', margin: '0 auto 1rem' }}>Premium Services</div>
          <h2 id="ws-upsell-heading" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            The Masterclass Teaches the What.
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--ws-text-muted)', fontSize: '1rem', marginBottom: '3rem', maxWidth: '620px', margin: '0 auto 3rem' }}>
            The Premium Service does it <em>for you</em> — in 48 hours, fully optimized, so you just focus on acing the interviews.
          </p>

          <div className="ws-upsell-grid">
            {/* Left column: What the masterclass teaches */}
            <div className="ws-upsell-card ws-upsell-free">
              <div className="ws-upsell-card-label">✅ What the Masterclass Teaches (Free)</div>
              <ul className="ws-upsell-list">
                {WHAT_VS_HOW.map((item, i) => (
                  <li key={i}>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    <span>{item.what}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right column: What the paid service delivers */}
            <div className="ws-upsell-card ws-upsell-paid">
              <div className="ws-upsell-card-label">⚡ How the Premium Service Does It For You</div>
              <ul className="ws-upsell-list">
                {WHAT_VS_HOW.map((item, i) => (
                  <li key={i}>
                    <Star size={16} aria-hidden="true" />
                    <span>{item.how}</span>
                  </li>
                ))}
              </ul>
              <div className="ws-upsell-packages">
                <div className="ws-upsell-pkg">
                  <strong>Professional</strong>
                  <span>ATS CV + Cover Letter</span>
                  <span className="ws-upsell-price">KES 3,500</span>
                </div>
                <div className="ws-upsell-pkg ws-upsell-pkg-featured">
                  <strong>Executive</strong>
                  <span>CV + Cover Letter + LinkedIn + Call</span>
                  <span className="ws-upsell-price">KES 6,000</span>
                </div>
              </div>
              <a
                href="https://wa.me/254794877125?text=Hi%20Duncan%2C%20I%27d%20like%20to%20discuss%20the%20Professional%20or%20Executive%20Career%20Package."
                target="_blank"
                rel="noopener noreferrer"
                className="ws-upsell-cta"
              >
                Book a Premium Package on WhatsApp <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BY THE END YOU'LL HAVE ═══ */}
      <section className="ws-bonus-section" style={{ background: 'var(--ws-white)', borderTop: '1px solid var(--ws-gray-200)', borderBottom: '1px solid var(--ws-gray-200)', padding: '5rem 1.5rem' }}>
        <div className="ws-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="ws-section-label" style={{ display: 'block', textAlign: 'center', width: 'fit-content', margin: '0 auto 1.25rem' }}>Outcome</div>
          <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '2.5rem', letterSpacing: '-0.02em' }}>
            By the End of the Masterclass You'll Have
          </h2>
          <div className="ws-outcome-grid">
            {[
              'One professional Master CV',
              'AI prompts you can reuse forever',
              'A tailored CV for a real job listing',
              'A repeatable application workflow',
              'Confidence using AI in your job search',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--ws-gray-50)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--ws-gray-200)' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--ws-green)', flexShrink: 0 }} aria-hidden="true" />
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
              <div className="ws-testimonial-stars" aria-label="5 stars">★★★★★</div>
              <p className="ws-testimonial-text">"{t.text}"</p>
              <div className="ws-testimonial-author">
                <div className="ws-testimonial-avatar" aria-hidden="true">{t.initial}</div>
                <div className="ws-testimonial-name">{t.name}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ URGENCY — seat counter bar ═══ */}
      <section className="ws-urgency-section" aria-label="Remaining seats urgency">
        <div className="ws-urgency-inner">
          <div className="ws-urgency-label">{isFull ? 'ALL SEATS TAKEN — NEXT COHORT WAITLIST' : 'FREE SEATS REMAINING:'}</div>
          <div className="ws-urgency-timer">
            <div className="ws-urgency-unit"><strong>{pad(countdown.days)}</strong><span>Days</span></div>
            <div className="ws-urgency-unit"><strong>{pad(countdown.hours)}</strong><span>Hours</span></div>
            <div className="ws-urgency-unit"><strong>{pad(countdown.mins)}</strong><span>Mins</span></div>
            <div className="ws-urgency-unit"><strong>{pad(countdown.secs)}</strong><span>Secs</span></div>
          </div>
          <div className="ws-urgency-seats">
            {loadingSeats ? '…' : isFull ? `${maxSeats} / ${maxSeats} — Waitlist open` : `${remaining} of ${maxSeats} free seats still available`}
          </div>
          <div className="ws-urgency-note">
            {isFull
              ? 'Join the waitlist and be first to know when the next cohort opens.'
              : `Once all ${maxSeats} seats are taken, registration closes automatically. Claim yours now.`}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="ws-final-cta">
        <h2>The next job you apply for doesn't have to use the same CV you've been sending everywhere.</h2>
        <p>Spend 90 minutes learning a workflow you can use for every application going forward. Your seat is free.</p>
        <div className="ws-final-btns">
          <button className="ws-btn-green" onClick={openModal} aria-label={isFull ? 'Join waitlist' : 'Claim free seat'}>
            {isFull ? 'JOIN THE WAITLIST' : 'CLAIM MY FREE SEAT NOW'} <ArrowRight size={18} />
          </button>
          <a
            href="https://wa.me/254794877125?text=Hi%20Duncan%2C%20I%27m%20interested%20in%20the%20Free%20AI%20Job%20Search%20Masterclass."
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
          <div>
            <div className="ws-footer-brand-logo">
              <div className="ws-nav-logo">AI</div>
              <strong style={{ color: '#fff', fontSize: '0.9rem' }}>Free AI Job Search Masterclass</strong>
            </div>
            <p className="ws-footer-brand-desc">Helping job seekers use AI to create CVs that get recruiters to respond.</p>
            <div className="ws-footer-socials">
              <a className="ws-footer-social" href="https://www.linkedin.com/in/duncan-makoyo-196ba7307/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">in</a>
              <a className="ws-footer-social" href="https://wa.me/254794877125" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">💬</a>
            </div>
          </div>
          <div className="ws-footer-col">
            <h4>Quick Links</h4>
            <button className="ws-footer-link" onClick={() => window.location.hash = '#/'}>Home</button>
            <button className="ws-footer-link" onClick={scrollToPricing}>Seat Availability</button>
            <button className="ws-footer-link" onClick={() => document.getElementById('ws-learn')?.scrollIntoView({ behavior: 'smooth' })}>What You'll Learn</button>
            <button className="ws-footer-link" onClick={() => document.getElementById('ws-testimonials')?.scrollIntoView({ behavior: 'smooth' })}>Reviews</button>
          </div>
          <div className="ws-footer-col">
            <h4>Masterclass Details</h4>
            <div className="ws-footer-link">🎥 Live on Google Meet</div>
            <div className="ws-footer-link">⏱ {sessionDuration} Interactive Session</div>
            <div className="ws-footer-link">🎟 Limited to {maxSeats} Free Seats</div>
            <div className="ws-footer-link">📅 {sessionDate} · {sessionTime}</div>
          </div>
          <div className="ws-footer-col">
            <h4>Contact</h4>
            <a className="ws-footer-link" href="tel:+254794877125"><Phone size={14} /> 0794 877 125</a>
            <a className="ws-footer-link" href="mailto:info@duncanmakoyo.com"><Mail size={14} /> info@duncanmakoyo.com</a>
            <div className="ws-footer-link"><MapPin size={14} /> Kisii, Kenya</div>
            <button className="ws-footer-link" onClick={() => window.location.hash = '#/terms'}>Terms of Use</button>
            <button className="ws-footer-link" onClick={() => window.location.hash = '#/privacy'}>Privacy Policy</button>
          </div>
        </div>
        <div className="ws-footer-bottom">
          © {new Date().getFullYear()} Duncan Makoyo. All Rights Reserved.
        </div>
      </footer>

      {/* ═══ MODAL ═══ */}
      {showModal && (
        <div
          className="ws-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ws-modal-title"
        >
          <div className="ws-modal-card">
            <div className="ws-modal-header">
              <h3 id="ws-modal-title">
                {modalState === 'form'      && 'Claim Your Free Seat'}
                {modalState === 'waitlist'  && 'Join the Waitlist'}
                {modalState === 'success'   && "You're Registered! 🎉"}
                {modalState === 'already'   && 'Already Registered'}
              </h3>
              <button className="ws-modal-close" onClick={() => setShowModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <div className="ws-modal-body">

              {/* ── SUCCESS STATE ── */}
              {modalState === 'success' && (
                <div className="ws-modal-success">
                  <div className="ws-modal-success-icon" aria-hidden="true">
                    <CheckCircle2 size={48} />
                  </div>
                  <h4>Seat Confirmed!</h4>
                  <p>Check your email for the masterclass join link and reminder schedule. Then join the WhatsApp group below to receive your free prompt sheets and ATS CV template before the live session.</p>
                  <a href={whatsappGroup} target="_blank" rel="noopener noreferrer" className="ws-modal-whatsapp-btn">
                    📱 Join the Masterclass WhatsApp Group
                  </a>
                  <button className="ws-modal-dismiss" onClick={() => setShowModal(false)}>Close</button>
                </div>
              )}

              {/* ── ALREADY REGISTERED STATE ── */}
              {modalState === 'already' && (
                <div className="ws-modal-success">
                  <div className="ws-modal-success-icon" style={{ background: 'rgba(26,86,219,0.1)', color: 'var(--ws-blue)' }} aria-hidden="true">
                    <CheckCircle2 size={48} />
                  </div>
                  <h4>You're Already Registered</h4>
                  <p>We found your registration. Check your inbox for the confirmation email with your join link. If you can't find it, contact Duncan on WhatsApp.</p>
                  <a href={whatsappGroup} target="_blank" rel="noopener noreferrer" className="ws-modal-whatsapp-btn">
                    📱 Join the Masterclass WhatsApp Group
                  </a>
                  <button className="ws-modal-dismiss" onClick={() => setShowModal(false)}>Close</button>
                </div>
              )}

              {/* ── REGISTRATION FORM ── */}
              {modalState === 'form' && (
                <>
                  <div className="ws-modal-free-badge">🎓 FREE · No payment required</div>
                  {errorMsg && <div className="ws-modal-alert error" role="alert">{errorMsg}</div>}

                  <form onSubmit={handleRegister} noValidate>
                    <label htmlFor="ws-name">Full Name <span aria-hidden="true">*</span></label>
                    <input id="ws-name" type="text" placeholder="Enter your full name" value={fullName} onChange={e => setFullName(e.target.value)} required aria-required="true" autoComplete="name" />

                    <label htmlFor="ws-email">Email Address <span aria-hidden="true">*</span></label>
                    <input id="ws-email" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required aria-required="true" autoComplete="email" />

                    <label htmlFor="ws-phone">Phone Number <span aria-hidden="true">*</span></label>
                    <input id="ws-phone" type="tel" placeholder="0712 345 678" value={phone} onChange={e => setPhone(e.target.value)} required aria-required="true" autoComplete="tel" />

                    {/* Lead-capture qualification fields */}
                    <label htmlFor="ws-profession">Current Role / Profession</label>
                    <input id="ws-profession" type="text" placeholder="e.g. Sales Executive, Fresh Graduate, Teacher…" value={profession} onChange={e => setProfession(e.target.value)} autoComplete="organization-title" />

                    <label htmlFor="ws-challenge">Biggest Job Search Challenge Right Now</label>
                    <textarea id="ws-challenge" rows={3} placeholder="e.g. Not getting interviews, don't know how to tailor my CV…" value={challenge} onChange={e => setChallenge(e.target.value)} style={{ resize: 'vertical', minHeight: '80px' }} />

                    <button type="submit" disabled={isSubmitting} className="ws-modal-submit">
                      {isSubmitting
                        ? <><Loader2 size={16} className="ws-spin" /> Saving your seat…</>
                        : <>🎓 Claim My Free Seat</>}
                    </button>
                  </form>
                  <p className="ws-modal-privacy">Your details are never shared. You'll receive one confirmation email and two reminders only.</p>
                </>
              )}

              {/* ── WAITLIST FORM ── */}
              {modalState === 'waitlist' && !wlSuccess && (
                <>
                  <div className="ws-modal-alert waitlist" role="status">
                    All 100 seats for this cohort are taken. Join the waitlist and we'll notify you when the next masterclass opens.
                  </div>
                  {wlError && <div className="ws-modal-alert error" role="alert">{wlError}</div>}

                  <form onSubmit={handleWaitlist} noValidate>
                    <label htmlFor="ws-wl-name">Full Name <span aria-hidden="true">*</span></label>
                    <input id="ws-wl-name" type="text" placeholder="Your full name" value={wlName} onChange={e => setWlName(e.target.value)} required aria-required="true" autoComplete="name" />

                    <label htmlFor="ws-wl-email">Email Address <span aria-hidden="true">*</span></label>
                    <input id="ws-wl-email" type="email" placeholder="you@email.com" value={wlEmail} onChange={e => setWlEmail(e.target.value)} required aria-required="true" autoComplete="email" />

                    <label htmlFor="ws-wl-phone">Phone Number (Optional)</label>
                    <input id="ws-wl-phone" type="tel" placeholder="0712 345 678" value={wlPhone} onChange={e => setWlPhone(e.target.value)} autoComplete="tel" />

                    <button type="submit" disabled={wlSubmitting} className="ws-modal-submit">
                      {wlSubmitting
                        ? <><Loader2 size={16} className="ws-spin" /> Joining waitlist…</>
                        : '🔔 Notify Me for the Next Cohort'}
                    </button>
                  </form>
                  <p className="ws-modal-privacy">Or reach Duncan directly on WhatsApp to discuss premium 1-on-1 CV optimization.</p>
                </>
              )}

              {/* ── WAITLIST SUCCESS ── */}
              {modalState === 'waitlist' && wlSuccess && (
                <div className="ws-modal-success">
                  <div className="ws-modal-success-icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--ws-gold)' }} aria-hidden="true">
                    <CheckCircle2 size={48} />
                  </div>
                  <h4>You're on the Waitlist!</h4>
                  <p>We'll email you the moment the next free masterclass opens for registration. In the meantime, Duncan is available for a private 1-on-1 CV session on WhatsApp.</p>
                  <a
                    href="https://wa.me/254794877125?text=Hi%20Duncan%2C%20I%27m%20on%20the%20masterclass%20waitlist%20and%20want%20to%20discuss%20a%201-on-1%20CV%20session."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ws-modal-whatsapp-btn"
                  >
                    💬 Book a Private Session
                  </a>
                  <button className="ws-modal-dismiss" onClick={() => setShowModal(false)}>Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
