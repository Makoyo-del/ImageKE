import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase';
import { ShieldCheck, Upload, AlertCircle, CheckCircle, Video, Search, Lock, Zap, User, Mail, Briefcase, FileText, ArrowRight, Eye, X, Award, Star } from 'lucide-react';
import './ResumeHotSeatLanding.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

// ─── Dynamic Proof Screenshots Dataset ──────────────────────────────────────
const PROOF_SCREENSHOTS = [
  {
    id: 'emmanuel',
    name: 'Emmanuel Mbeeli',
    score: '100%',
    status: 'PERFECT MATCH',
    image: "/ats_proof/Emmanuel Mbeeli's ATS score.webp",
    featured: true,
    tag: 'RECRUITER PASSED',
    quote: 'CV rewritten and optimized to achieve a 100% perfect match on recruiter-grade ATS algorithms.'
  },
  {
    id: 'edgar',
    name: 'Edgar Imo',
    score: 'HIGH MATCH',
    status: 'ATS PASSED',
    image: "/ats_proof/Edgar Imo's Result.webp",
    tag: 'EXECUTIVE REWRITE',
    quote: 'Format reconstructed from multi-column trap to clean single-column executive hierarchy.'
  },
  {
    id: 'edwin-gesora',
    name: 'Edwin Gesora',
    score: 'PASSED',
    status: 'VERIFIED',
    image: "/ats_proof/Edwin Gesora's result.webp",
    tag: 'TECH & OPERATIONS',
    quote: 'STAR methodology metrics injected into lead bullet points for instant 6-second recruiter skims.'
  },
  {
    id: 'edwin-makori',
    name: 'Edwin Makori',
    score: 'TOP TIER',
    status: 'ATS READY',
    image: "/ats_proof/Edwin Makori's result-ATS.webp",
    tag: 'MANAGEMENT ROLE',
    quote: 'Header hierarchy standardized with industry uppercase tags to eliminate parser glitches.'
  },
  {
    id: 'jenifer',
    name: 'Jenifer Tarus',
    score: 'PASSED',
    status: 'OPTIMIZED',
    image: "/ats_proof/Jenifer Tarus's ATS score.webp",
    tag: 'FINANCE & BANKING',
    quote: 'Eliminated table elements and graphic text boxes that were causing auto-rejection.'
  },
  {
    id: 'maxmiller',
    name: 'Maxmiller Achieri',
    score: 'HIGH SCORE',
    status: 'VERIFIED',
    image: "/ats_proof/Maxmiller Achieri's ATS score.webp",
    tag: 'CAREER PIVOT',
    quote: 'Keywords aligned with target job specifications for maximum parsing density.'
  },
  {
    id: 'philemon',
    name: 'Philemon Kirui',
    score: 'PASSED',
    status: 'RECRUITER READY',
    image: "/ats_proof/Philemon Kirui's ATS score.webp",
    tag: 'PROJECT LEAD',
    quote: 'Structured work history to pass both AI keyword scanners and hiring manager reviews.'
  }
];

const PROCESS_STEPS_REWRITE = [
  {
    num: '01',
    tag: 'THE BLINDSPOT',
    title: 'You Submit, We Protect.',
    desc: 'Upload your current resume. Our system automatically redacts your sensitive contact info (phone, email, street address) so your privacy is 100% shielded for the live broadcast.'
  },
  {
    num: '02',
    tag: 'THE MACHINE',
    title: 'The Brutal Reality.',
    desc: 'Watch live as we feed your CV into a recruiter-grade ATS simulator. We strip away your beautiful design and show you the raw, broken text the recruiter actually sees.'
  },
  {
    num: '03',
    tag: 'THE FIX',
    title: 'Human Strategy & Rewrite.',
    desc: 'We don\'t just point out the red flags. You get an instant, live strategy session on how to rewrite your metrics, fix your layout, and position yourself to bypass the bots and impress the hiring manager.'
  }
];

const PAIN_POINTS = [
  {
    title: 'The Hidden ATS Filter Trap',
    text: 'Multi-column layouts and fancy tables look clean to you, but standard ATS software reads across columns left-to-right, turning your work history into jumbled gibberish.'
  },
  {
    title: 'The 6-Second Recruiter Skim',
    text: 'Once your CV reaches a human, recruiters spend an average of 6 seconds skimming before deciding to move forward or reject. Without bolded lead metrics, your application is invisible.'
  },
  {
    title: 'The "Qualified But Rejected" Syndrome',
    text: 'You have the exact qualifications for the job, but missing standard uppercase headers and improper keyword density get you auto-rejected before anyone reads your credentials.'
  }
];

export function ResumeHotSeatLanding({ onNavigate }) {
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [totalSubmissions, setTotalSubmissions] = useState(14);
  const fileInputRef = useRef(null);

  // Lightbox Modal State for Proof Screenshots
  const [selectedProof, setSelectedProof] = useState(null);

  // ── Live Session State (dynamic from Mentor Dashboard) ──
  const [liveSession, setLiveSession] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  // Fetch Stats for Urgency Badge
  useEffect(() => {
    fetch(`${API_URL}/api/hotseat/stats`)
      .then(res => res.json())
      .then(data => { if (data.totalSubmissions) setTotalSubmissions(data.totalSubmissions); })
      .catch(() => {});
  }, []);

  // Fetch Live Session for countdown + stream link
  useEffect(() => {
    fetch(`${API_URL}/api/hotseat/live-session`)
      .then(res => res.json())
      .then(data => { if (data.success && data.session) setLiveSession(data.session); })
      .catch(() => {});
  }, []);

  // Countdown Timer — updates every second when a live session is set
  useEffect(() => {
    if (!liveSession?.live_datetime) return;
    const tick = () => {
      const now = Date.now();
      const target = new Date(liveSession.live_datetime).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setCountdown({
        days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        expired: false,
      });
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [liveSession]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (selected.type !== 'application/pdf' && !selected.name.endsWith('.pdf')) {
      setSubmitError('Please select a valid PDF file (.pdf).');
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setSubmitError('File size exceeds 10MB limit.');
      return;
    }

    setSubmitError('');
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setSubmitError('Please enter your full name and email address.');
      return;
    }
    if (!file) {
      setSubmitError('Please upload your resume in PDF format.');
      return;
    }
    if (!consent) {
      setSubmitError('You must check the consent box to participate in the live stream teardown.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      let publicResumeUrl = '';

      // Upload file to Supabase Storage 'resumes' bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(`hotseat/${fileName}`, file, { cacheControl: '3600', upsert: true });

      if (uploadError || !uploadData) {
        // Reject loudly — a broken URL in the DB is worse than a clear error
        console.error('[Storage upload error]', uploadError?.message);
        throw new Error('Failed to upload your resume file. Please check your internet connection and try again.');
      }

      const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(`hotseat/${fileName}`);
      publicResumeUrl = urlData?.publicUrl || '';

      if (!publicResumeUrl) {
        throw new Error('Failed to get resume URL after upload. Please try again.');
      }

      // Submit metadata to backend Express endpoint
      const response = await fetch(`${API_URL}/api/hotseat/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          target_role: targetRole.trim() || 'General Application',
          resume_url: publicResumeUrl,
          file_name: file.name,
          consent_given: true
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to complete submission.');
      }

      setSubmittedSuccess(true);
    } catch (err) {
      setSubmitError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const navigateTo = (path) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.hash = `#/${path}`;
    }
  };

  const scrollToForm = (e) => {
    if (e) e.preventDefault();
    const formElement = document.getElementById('reserve-spot');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (window.location.hash.includes('reserve-spot')) {
      const formElement = document.getElementById('reserve-spot');
      if (formElement) {
        setTimeout(() => {
          formElement.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    }
  }, []);

  // Emmanuel Mbeeli featured hero item
  const emmanuelProof = PROOF_SCREENSHOTS.find(p => p.id === 'emmanuel') || PROOF_SCREENSHOTS[0];

  return (
    <div className="hotseat-root">
      {/* ── 1. Information Architecture & Navigation Bar ── */}
      <nav className="hotseat-nav-bar">
        <div className="hotseat-container hotseat-nav-content">
          <div className="hotseat-nav-left">
            <span className="hotseat-nav-badge">PRODUCTS</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--hs-text)' }}>
              THE RESUME HOT SEAT
            </span>
          </div>

          <div className="hotseat-nav-links">
            <button onClick={() => navigateTo('ats')} className="hotseat-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              Free ATS Tool
            </button>
            <button onClick={() => navigateTo('linkedin')} className="hotseat-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              LinkedIn Audit
            </button>
            <button onClick={() => navigateTo('vault')} className="hotseat-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              Resume Vault
            </button>
            <button onClick={() => navigateTo('services')} className="hotseat-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--hs-crimson)' }}>
              All Services →
            </button>
          </div>
        </div>
      </nav>

      {/* ── 2. SECTION 1: THE HERO (WITH EMMANUEL'S 100% PROOF FEATURED) ── */}
      <section className="hotseat-section-hero">
        <div className="hotseat-container">
          <div className="bento-grid">
            {/* Left Hero Text Cell */}
            <div className="bento-cell" style={{ gridColumn: 'span 7' }}>
              <div style={{ marginBottom: '1.75rem' }}>
                {/* Dynamic urgency badge — live session title or fallback */}
                <div className="urgency-badge">
                  <span className="urgency-dot" />
                  <span>
                    {liveSession
                      ? `LIVE: ${liveSession.title || 'RESUME HOT SEAT'} // ONLY ${liveSession.max_spots || 3} SPOTS`
                      : 'ONLY 3 RESUMES SELECTED PER LIVE SESSION'}
                  </span>
                </div>
              </div>

              <h1 className="hotseat-heading-hero">
                Stop Getting Ghosted <em>By The Algorithms.</em>
              </h1>

              <p className="hotseat-subheadline">
                You are applying to hundreds of jobs and hearing nothing back. It's not your experience—it's your formatting. Submit your CV to <strong>"The Resume Hot Seat"</strong> for a live, ruthless ATS teardown. See exactly why the bots are rejecting you, and watch a professional career strategist fix it in real-time.
              </p>

              {/* ── Dynamic Countdown Timer ── */}
              {liveSession && !countdown.expired && (
                <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#111111', border: '2px solid #111111', display: 'inline-block' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', color: '#D61A3C', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    NEXT LIVE SESSION // COUNTDOWN
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    {[{ v: countdown.days, l: 'DAYS' }, { v: countdown.hours, l: 'HRS' }, { v: countdown.minutes, l: 'MIN' }, { v: countdown.seconds, l: 'SEC' }].map(({ v, l }) => (
                      <div key={l} style={{ textAlign: 'center', minWidth: '3rem' }}>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>
                          {String(v).padStart(2, '0')}
                        </div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#888', letterSpacing: '0.1em', marginTop: '4px' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#888', fontWeight: 600 }}>
                    {(() => {
                      const d = new Date(liveSession.live_datetime);
                      if (isNaN(d.getTime())) return '';
                      const formatted = d.toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
                      const tz = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(d).find(p => p.type === 'timeZoneName')?.value || '';
                      return `${formatted} ${tz}`.trim();
                    })()}
                  </div>
                </div>
              )}

              {liveSession && countdown.expired && (
                <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', background: '#D61A3C', display: 'inline-block' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>WE ARE LIVE NOW — TUNE IN</span>
                </div>
              )}

              <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <a href="#reserve-spot" onClick={scrollToForm} className="hotseat-btn-crimson" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                  SUBMIT MY RESUME FOR TEARDOWN →
                </a>
                {liveSession?.stream_link && (
                  <a
                    href={liveSession.stream_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--hs-crimson)', textTransform: 'uppercase', textDecoration: 'none', border: '2px solid var(--hs-crimson)', padding: '0.7rem 1.2rem' }}
                  >
                    WATCH LIVE →
                  </a>
                )}
                <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--hs-muted)', textTransform: 'uppercase' }}>
                  🔒 100% PRIVACY PROTECTED // REDACTED LIVE
                </span>
              </div>
            </div>

            {/* Right Hero Cell: Emmanuel Mbeeli's 100% Perfect ATS Score Proof */}
            <div className="bento-cell" style={{ gridColumn: 'span 5', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="hotseat-tag" style={{ color: 'var(--hs-crimson)' }}>VERIFIED PROOF // 100% PERFECT ATS MATCH</span>
                <span className="hero-100-badge">100% SCORE</span>
              </div>

              {/* Emmanuel Proof Card Image Wrapper */}
              <div 
                className="hero-proof-img-container"
                onClick={() => setSelectedProof(emmanuelProof)}
                title="Click to view full 100% ATS score report"
              >
                <img 
                  src={emmanuelProof.image} 
                  alt="Emmanuel Mbeeli 100% ATS Score Proof" 
                  className="hero-proof-img"
                  loading="lazy"
                />
                <div className="hero-proof-overlay">
                  <Eye size={24} color="#FFFFFF" />
                  <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.05em' }}>CLICK TO INSPECT REPORT</span>
                </div>
              </div>

              {/* Caption Box */}
              <div style={{ marginTop: '1rem', borderTop: '1.5px solid var(--hs-border)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--hs-text)' }}>
                    Candidate: Emmanuel Mbeeli
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', background: '#DCFCE7', padding: '0.2rem 0.5rem', border: '1px solid #166534' }}>
                    SCORE: 100%
                  </span>
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--hs-muted)', lineHeight: 1.5, margin: 0 }}>
                  <em>"{emmanuelProof.quote}"</em>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. SECTION 2: THE PAIN & THE PROCESS (THE VALUE) ── */}
      <section className="hotseat-section-value">
        <div className="hotseat-container">

          {/* Pain Agitation Overview */}
          <div style={{ marginBottom: '4rem', textAlign: 'left', maxWidth: '800px' }}>
            <span className="hotseat-tag" style={{ color: 'var(--hs-crimson)', marginBottom: '0.75rem' }}>THE REASON YOU'RE NOT GETTING INTERVIEWS</span>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.15, margin: 0 }}>
              Why 88% Of Resumes Get Auto-Rejected Before A Recruiter Ever Opens Them.
            </h2>
          </div>

          <div className="hotseat-pain-grid">
            {PAIN_POINTS.map((pain, idx) => (
              <div key={idx} className="pain-card">
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--hs-crimson)', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>
                  PROBLEM 0{idx + 1}
                </div>
                <h3 className="pain-card-title">{pain.title}</h3>
                <p style={{ fontSize: '0.925rem', color: 'var(--hs-muted)', lineHeight: 1.65, margin: 0 }}>
                  {pain.text}
                </p>
              </div>
            ))}
          </div>

          {/* Process 3-Step Bento Grid Rewrite */}
          <div style={{ borderTop: '2px solid var(--hs-border)', paddingTop: '4rem' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <span className="hotseat-tag" style={{ color: 'var(--hs-crimson)' }}>THE REVOLUTIONARY LIVE PROCESS</span>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.2rem', fontWeight: 900, margin: '0.5rem 0 0' }}>
                How "The Resume Hot Seat" Turns Rejections Into Interviews.
              </h2>
            </div>

            <div className="bento-grid">
              {PROCESS_STEPS_REWRITE.map((step, idx) => (
                <div key={idx} className="bento-cell" style={{ gridColumn: 'span 4', background: '#FFFFFF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <span className="hotseat-tag" style={{ color: 'var(--hs-crimson)' }}>STEP {step.num} // {step.tag}</span>
                    <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.2rem', fontWeight: 900, color: '#DDDDDD' }}>{step.num}</span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.85rem', letterSpacing: '-0.01em' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '0.925rem', color: 'var(--hs-muted)', lineHeight: 1.65, margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── 4. SECTION 3: THE CAPTURE FORM (THE CONVERSION) ── */}
      <section id="reserve-spot" className="hotseat-section-form">
        <div className="hotseat-container">
          <div className="bento-grid">
            {/* Form Guidance Cell */}
            <div className="bento-cell" style={{ gridColumn: 'span 5', background: '#FFFFFF' }}>
              <span className="hotseat-tag" style={{ color: 'var(--hs-crimson)', marginBottom: '1rem' }}>SUBMIT YOUR CV</span>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.4rem', fontWeight: 900, lineHeight: 1.15, marginBottom: '1rem' }}>
                Reserve Your Spot In The Hot Seat.
              </h2>
              <p style={{ fontSize: '1rem', color: 'var(--hs-muted)', lineHeight: 1.65, marginBottom: '2rem' }}>
                We only select 3 resumes per live broadcast to ensure maximum value and deep-dive strategy. Submit your PDF below to join the queue.
              </p>

              <div style={{ border: '2px solid var(--hs-border)', padding: '1.5rem', background: 'var(--hs-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  <ShieldCheck size={20} color="var(--hs-crimson)" /> 100% PRIVACY SHIELD GUARANTEE
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--hs-muted)', lineHeight: 1.55, margin: 0 }}>
                  Even though you consent to displaying your resume on screen, your <strong>phone number, email address, and street address will be automatically redacted</strong> prior to going live.
                </p>
              </div>
            </div>

            {/* Form Right Inputs Cell */}
            <div className="bento-cell" style={{ gridColumn: 'span 7' }}>
              {submittedSuccess ? (
                <div style={{ padding: '3rem 2rem', textAlign: 'center', background: '#FFFFFF', border: '2px solid var(--hs-border)' }}>
                  <CheckCircle size={56} color="var(--hs-crimson)" style={{ margin: '0 auto 1.25rem' }} />
                  <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                    You're In The Hot Seat Queue!
                  </h3>
                  <p style={{ fontSize: '1rem', color: 'var(--hs-muted)', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 1.75rem' }}>
                    Your resume has been securely received. We will notify you via email when your resume is selected for an upcoming live teardown stream.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => navigateTo('ats')}
                      className="hotseat-btn-crimson"
                    >
                      TRY FREE ATS SIMULATOR NOW →
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {submitError && (
                    <div style={{ background: '#FEF2F2', border: '2px solid #FECACA', padding: '0.9rem 1.1rem', color: '#991B1B', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={18} /> {submitError}
                    </div>
                  )}

                  <div>
                    <label className="hotseat-label">1. FULL NAME *</label>
                    <input
                      type="text"
                      className="hotseat-input"
                      placeholder="e.g. Duncan Makoyo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="hotseat-label">2. EMAIL ADDRESS *</label>
                    <input
                      type="email"
                      className="hotseat-input"
                      placeholder="e.g. duncan@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="hotseat-label">3. TARGET ROLE / INDUSTRY (OPTIONAL)</label>
                    <input
                      type="text"
                      className="hotseat-input"
                      placeholder="e.g. Senior Project Manager / Tech"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="hotseat-label">4. UPLOAD RESUME (PDF ONLY) *</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="hotseat-input"
                      style={{ textAlign: 'left', cursor: 'pointer', background: file ? '#F0FDF4' : '#FFFFFF', borderColor: file ? '#166534' : 'var(--hs-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <span style={{ fontWeight: 600, color: file ? '#166534' : 'var(--hs-muted)' }}>
                        {file ? `✓ Selected: ${file.name}` : 'Click to select PDF resume...'}
                      </span>
                      <Upload size={18} color={file ? '#166534' : 'var(--hs-text)'} />
                    </button>
                  </div>

                  <div style={{ border: '1.5px solid var(--hs-border)', padding: '1.1rem', background: '#FFFFFF', marginTop: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--hs-text)', lineHeight: 1.5 }}>
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--hs-crimson)' }}
                        required
                      />
                      <span>
                        <strong>Mandatory Consent:</strong> I consent to having my resume displayed and critiqued publicly during a live broadcast session. (Note: Phone numbers, emails, and exact street addresses will be manually redacted prior to stream).
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="hotseat-btn-crimson"
                    disabled={submitting}
                    style={{ marginTop: '0.5rem', width: '100%' }}
                  >
                    {submitting ? 'UPLOADING RESUME...' : 'SUBMIT RESUME FOR LIVE TEARDOWN →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. SECTION 4: REAL ATS SCORE PROOF & REVIEWS GALLERY ── */}
      <section className="hotseat-section-proof">
        <div className="hotseat-container">
          <div style={{ marginBottom: '3rem', textAlign: 'left' }}>
            <span className="hotseat-tag" style={{ color: 'var(--hs-crimson)', marginBottom: '0.75rem' }}>
              VERIFIED CLIENT AUDITS // 100% AUTHENTIC PROOF
            </span>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem', fontWeight: 900, margin: '0.25rem 0 0' }}>
              Real ATS Scores From Previous Client Resumes.
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--hs-muted)', marginTop: '0.5rem', maxWidth: '650px' }}>
              These are actual ATS parsing reports from clients whose CVs we restructured and rewritten. Click any report to zoom in and inspect the score details.
            </p>
          </div>

          {/* Proof Grid (3-column on desktop, 2 on tablet, 1 on mobile) */}
          <div className="proof-grid">
            {PROOF_SCREENSHOTS.map((item) => (
              <div key={item.id} className="proof-card" onClick={() => setSelectedProof(item)}>
                <div className="proof-card-header">
                  <div>
                    <span className="proof-card-name">{item.name}</span>
                    <div className="proof-card-tag">{item.tag}</div>
                  </div>
                  <span className={`proof-score-pill ${item.score === '100%' ? 'perfect' : ''}`}>
                    {item.score}
                  </span>
                </div>

                {/* Lazy Loaded Proof Screenshot */}
                <div className="proof-img-wrapper">
                  <img 
                    src={item.image} 
                    alt={`${item.name} ATS score screenshot`} 
                    className="proof-img"
                    loading="lazy"
                  />
                  <div className="proof-img-overlay">
                    <Eye size={20} color="#FFFFFF" />
                    <span>INSPECT AUDIT REPORT</span>
                  </div>
                </div>

                <p className="proof-card-quote">
                  "{item.quote}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. LIGHTBOX MODAL FOR ATS PROOF SCREENSHOTS ── */}
      {selectedProof && (
        <div className="proof-lightbox-backdrop" onClick={() => setSelectedProof(null)}>
          <div className="proof-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="proof-lightbox-header">
              <div>
                <span className="hotseat-tag" style={{ color: 'var(--hs-crimson)' }}>
                  VERIFIED AUDIT // {selectedProof.name}
                </span>
                <h3 style={{ margin: '0.25rem 0 0', fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', fontWeight: 900 }}>
                  ATS Score Report: <span style={{ color: 'var(--hs-crimson)' }}>{selectedProof.score}</span>
                </h3>
              </div>
              <button 
                onClick={() => setSelectedProof(null)} 
                className="proof-lightbox-close"
                aria-label="Close Lightbox"
              >
                <X size={22} />
              </button>
            </div>

            <div className="proof-lightbox-body">
              <img 
                src={selectedProof.image} 
                alt={`${selectedProof.name} Full ATS Score Report`} 
                className="proof-lightbox-img"
                loading="lazy"
              />
            </div>

            <div className="proof-lightbox-footer">
              <span style={{ fontSize: '0.85rem', color: 'var(--hs-muted)', fontWeight: 600 }}>
                {selectedProof.quote}
              </span>
              <a href="#reserve-spot" onClick={(e) => { setSelectedProof(null); scrollToForm(e); }} className="hotseat-btn-crimson" style={{ padding: '0.6rem 1.25rem', fontSize: '0.8rem', textDecoration: 'none', cursor: 'pointer' }}>
                SUBMIT YOUR CV NOW →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeHotSeatLanding;
