import React, { useState } from 'react';
import axios from 'axios';
import { 
  Wifi, 
  MessageSquare, 
  ShieldCheck, 
  Server, 
  Zap, 
  Send, 
  MessageCircle, 
  Terminal, 
  ArrowRight,
  Database,
  Network,
  Activity,
  Layers,
  CheckCircle2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

export default function ServicesPage({ onNavigateToPath }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: 'Campus Wi-Fi & Hotspot Infrastructure',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await axios.post(`${API_URL}/api/submit-service-request`, formData);
      setSubmitSuccess(true);
      setFormData({ name: '', email: '', phone: '', service: 'Campus Wi-Fi & Hotspot Infrastructure', message: '' });
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit inquiry. Please reach out via WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{
      backgroundColor: '#090a0e',
      backgroundImage: 
        'radial-gradient(circle at 85% 10%, rgba(255, 84, 20, 0.20) 0%, transparent 55%), ' +
        'radial-gradient(circle at 15% 90%, rgba(0, 230, 118, 0.10) 0%, transparent 45%), ' +
        'radial-gradient(circle at 50% 50%, rgba(9, 10, 14, 0.85) 0%, transparent 100%)',
      color: '#f1f5f9',
      minHeight: '100vh',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      lineHeight: 1.6
    }}>
      {/* ── Top Navigation Header ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        background: 'rgba(17, 19, 26, 0.88)',
        borderBottom: '1.5px solid rgba(255, 255, 255, 0.12)',
        padding: '1rem 1.5rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#ffffff'
            }}>
              DM<span style={{ color: '#ff5414' }}>.</span>
            </div>
            <div style={{
              fontSize: '0.68rem',
              color: '#94a3b8',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 700
            }}>
              Makoyocart Ventures
            </div>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
            <button onClick={() => scrollTo('ventures')} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', transition: 'color 0.2s' }}>Active Ventures</button>
            <button onClick={() => scrollTo('campusnet')} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', transition: 'color 0.2s' }}>Campus Wi-Fi</button>
            <button onClick={() => scrollTo('whatsapp')} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', transition: 'color 0.2s' }}>WhatsApp Engine</button>
            <button onClick={() => scrollTo('payments')} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', transition: 'color 0.2s' }}>Payment Infra</button>
            <button onClick={() => scrollTo('contact')} style={{
              background: '#ff5414',
              color: '#ffffff',
              border: 'none',
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 16px rgba(255, 84, 20, 0.4)',
              transition: 'all 0.2s ease'
            }}>
              Consult on Systems <ArrowRight size={14} />
            </button>
          </nav>
        </div>
      </header>

      {/* ── Hero Section (Status badge removed as requested) ── */}
      <section style={{ padding: '6rem 1.5rem 4rem', maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(2.7rem, 6vw, 4.5rem)',
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          margin: '0 0 1.5rem',
          color: '#ffffff'
        }}>
          I Engineer Real-World <br />
          <span style={{
            background: 'linear-gradient(135deg, #ff5414 0%, #ff8352 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Working Production Systems.
          </span>
        </h1>

        <p style={{
          fontSize: '1.2rem',
          color: '#cbd5e1',
          maxWidth: '760px',
          margin: '0 auto 2.5rem',
          lineHeight: 1.7,
          fontWeight: 400
        }}>
          No abstract software or generic website fluff. I design, deploy, and operate tangible infrastructure that solves physical friction—from high-density campus hostel Wi-Fi networks to Meta WhatsApp Cloud API automation and zero-loss payment pipelines.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '4rem' }}>
          <button onClick={() => scrollTo('ventures')} style={{
            background: '#ff5414',
            color: '#ffffff',
            padding: '0.9rem 2rem',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '1rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(255, 84, 20, 0.45)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}>
            Explore Active Ventures <ArrowRight size={16} />
          </button>
          <a href="https://wa.me/254794877125" target="_blank" rel="noopener noreferrer" style={{
            background: 'var(--profit-green-bg, rgba(0, 230, 118, 0.14))',
            color: '#00e676',
            border: '1.5px solid rgba(0, 230, 118, 0.4)',
            padding: '0.9rem 2rem',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '1rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 16px rgba(0, 230, 118, 0.15)',
            transition: 'all 0.2s ease'
          }}>
            <MessageCircle size={18} style={{ color: '#00e676' }} /> Chat on WhatsApp
          </a>
        </div>

        {/* ── Operational Proof Metrics Cards (Captive Portal Style) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1.25rem',
          textAlign: 'left'
        }}>
          <div style={{
            background: 'rgba(17, 19, 26, 0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>CampusNet Wi-Fi</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.2rem', fontWeight: 800, color: '#ff5414', marginTop: '0.25rem' }}>450+ Vouchers</div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.25rem' }}>Generated &amp; consumed live in student hostels</div>
          </div>

          <div style={{
            background: 'rgba(17, 19, 26, 0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>M-Pesa Webhooks</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.2rem', fontWeight: 800, color: '#00e676', marginTop: '0.25rem' }}>100+ Live STKs</div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.25rem' }}>Processed via HookBunker gateway</div>
          </div>

          <div style={{
            background: 'rgba(17, 19, 26, 0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Meta Business Suite</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.2rem', fontWeight: 800, color: '#ff5414', marginTop: '0.25rem' }}>Verified Domain</div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.25rem' }}>Official WhatsApp Cloud API portfolio active</div>
          </div>

          <div style={{
            background: 'rgba(17, 19, 26, 0.94)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Core Hardware</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.2rem', fontWeight: 800, color: '#00e676', marginTop: '0.25rem' }}>MikroTik L009</div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.25rem' }}>High-density hostel routing &amp; queues</div>
          </div>
        </div>
      </section>

      {/* ── Active Ventures Anchor ── */}
      <div id="ventures"></div>

      {/* ── Venture 1: CampusNet Wi-Fi Infrastructure ── */}
      <section id="campusnet" style={{ padding: '5rem 1.5rem', borderTop: '1.5px solid rgba(255, 255, 255, 0.1)', background: 'rgba(17, 19, 26, 0.5)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff5414', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
            <Wifi size={18} /> VENTURE 01 &bull; CAMPUS INTERNET INFRASTRUCTURE
          </div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.4rem', fontWeight: 800, margin: '0 0 1rem', color: '#ffffff' }}>
            CampusNet: Autonomous Hostel Wi-Fi Network
          </h2>
          <p style={{ color: '#cbd5e1', maxWidth: '750px', fontSize: '1.05rem', lineHeight: 1.65, margin: '0 0 2.5rem' }}>
            A fully automated, coinless Wi-Fi venture deployed in student hostels around Kisii. Eliminates manual voucher vending through direct Safaricom M-Pesa STK Push triggers, instant captive portal authentication, and automated session renewal.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div style={{
              background: 'rgba(17, 19, 26, 0.94)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '18px',
              padding: '1.75rem',
              boxShadow: '0 15px 35px -10px rgba(0,0,0,0.6)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(255, 84, 20, 0.15)', padding: '0.6rem', borderRadius: '10px' }}>
                  <Server style={{ color: '#ff5414' }} size={24} />
                </div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: 700 }}>MikroTik L009 Gateway Core</h3>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.65 }}>
                Configured as the high-throughput master router. Handles RouterOS v7 firewall, NAT, DHCP leases, DNS caching, queue-tree per-client bandwidth fairness (no choking), and captive portal walled-garden bypass.
              </p>
            </div>

            <div style={{
              background: 'rgba(17, 19, 26, 0.94)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '18px',
              padding: '1.75rem',
              boxShadow: '0 15px 35px -10px rgba(0,0,0,0.6)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(0, 230, 118, 0.15)', padding: '0.6rem', borderRadius: '10px' }}>
                  <Network style={{ color: '#00e676' }} size={24} />
                </div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: 700 }}>hAP Lite Access Points</h3>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.65 }}>
                Stripped of routing duties and deployed in pure Access Point bridge mode. Eliminates double-NAT latency and broadcast storms across dense multi-floor student quarters.
              </p>
            </div>

            <div style={{
              background: 'rgba(17, 19, 26, 0.94)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '18px',
              padding: '1.75rem',
              boxShadow: '0 15px 35px -10px rgba(0,0,0,0.6)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(255, 84, 20, 0.15)', padding: '0.6rem', borderRadius: '10px' }}>
                  <Database style={{ color: '#ff5414' }} size={24} />
                </div>
                <h3 style={{ fontFamily: "'Outfit', sans-serif", margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: 700 }}>Supabase Real-Time Ledger</h3>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.65 }}>
                Session tracking, MAC address binds, payment reconciliation, and a dynamic 10-stamp loyalty engine that automatically awards returning residents with free pass codes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Venture 2: WhatsApp Cloud API Automation ── */}
      <section id="whatsapp" style={{ padding: '5rem 1.5rem', borderTop: '1.5px solid rgba(255, 255, 255, 0.1)', background: '#090a0e' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#00e676', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
            <MessageSquare size={18} /> VENTURE 02 &bull; CONVERSATIONAL COMMERCE &amp; BOT PIPELINES
          </div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.4rem', fontWeight: 800, margin: '0 0 1rem', color: '#ffffff' }}>
            Meta WhatsApp Cloud API Engine
          </h2>
          <p style={{ color: '#cbd5e1', maxWidth: '750px', fontSize: '1.05rem', lineHeight: 1.65, margin: '0 0 2.5rem' }}>
            Leveraging Meta's official WhatsApp Business Cloud API under Makoyocart Ventures to turn friction-heavy customer workflows into automated, instant WhatsApp conversations.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div style={{
              background: 'rgba(17, 19, 26, 0.94)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '18px',
              padding: '1.75rem',
              boxShadow: '0 15px 35px -10px rgba(0,0,0,0.6)'
            }}>
              <div style={{ background: 'rgba(0, 230, 118, 0.15)', width: 'fit-content', padding: '0.6rem', borderRadius: '10px', marginBottom: '1rem' }}>
                <Zap style={{ color: '#00e676' }} size={24} />
              </div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#ffffff', fontWeight: 700 }}>Instant Voucher Dispatch</h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.65 }}>
                When an M-Pesa payment lands, the system automatically pushes the generated Wi-Fi passcode and duration receipt straight into the customer's WhatsApp chat with zero human delay.
              </p>
            </div>

            <div style={{
              background: 'rgba(17, 19, 26, 0.94)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '18px',
              padding: '1.75rem',
              boxShadow: '0 15px 35px -10px rgba(0,0,0,0.6)'
            }}>
              <div style={{ background: 'rgba(255, 84, 20, 0.15)', width: 'fit-content', padding: '0.6rem', borderRadius: '10px', marginBottom: '1rem' }}>
                <ShieldCheck style={{ color: '#ff5414' }} size={24} />
              </div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#ffffff', fontWeight: 700 }}>Self-Service Troubleshooting</h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.65 }}>
                Conversational diagnostic bot that guides hostel students through network re-connections, voucher status queries, and AP signal validation without operator intervention.
              </p>
            </div>

            <div style={{
              background: 'rgba(17, 19, 26, 0.94)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '18px',
              padding: '1.75rem',
              boxShadow: '0 15px 35px -10px rgba(0,0,0,0.6)'
            }}>
              <div style={{ background: 'rgba(0, 230, 118, 0.15)', width: 'fit-content', padding: '0.6rem', borderRadius: '10px', marginBottom: '1rem' }}>
                <Activity style={{ color: '#00e676' }} size={24} />
              </div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#ffffff', fontWeight: 700 }}>Verified Enterprise Domain</h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: 1.65 }}>
                Officially verified under duncanmakoyo.com with DNS TXT authentication and legal BRS business credentials for high message delivery tiering.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Venture 3: Payment Ingestion & HookBunker ── */}
      <section id="payments" style={{ padding: '5rem 1.5rem', borderTop: '1.5px solid rgba(255, 255, 255, 0.1)', background: 'rgba(17, 19, 26, 0.5)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff5414', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
            <Terminal size={18} /> VENTURE 03 &bull; PAYMENT WEBHOOK ARCHITECTURE
          </div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.4rem', fontWeight: 800, margin: '0 0 1rem', color: '#ffffff' }}>
            HookBunker: Zero-Loss M-Pesa Webhook Gateway
          </h2>
          <p style={{ color: '#cbd5e1', maxWidth: '750px', fontSize: '1.05rem', lineHeight: 1.65, margin: '0 0 2.5rem' }}>
            A resilient proxy and buffer engine designed to capture asynchronous Safaricom Daraja and Paystack callbacks without dropping transactions during upstream spikes or server restarts.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div style={{
              background: 'rgba(17, 19, 26, 0.94)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
            }}>
              <h4 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>HMAC SHA-512 Security</h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.65, margin: 0 }}>Constant-time signature verification prevents spoofing attacks on callback endpoints.</p>
            </div>
            <div style={{
              background: 'rgba(17, 19, 26, 0.94)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
            }}>
              <h4 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>Idempotent Processing</h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.65, margin: 0 }}>Deduplicates identical payment events so network retries never double-credit vouchers or accounts.</p>
            </div>
            <div style={{
              background: 'rgba(17, 19, 26, 0.94)',
              border: '1.5px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
            }}>
              <h4 style={{ fontFamily: "'Outfit', sans-serif", color: '#ffffff', margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>Dead-Letter Queue</h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.65, margin: 0 }}>Logs payload snapshots in Supabase for audit trail and manual replay if target endpoints go cold.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact & Engineering Inquiry Section ── */}
      <section id="contact" style={{ padding: '6rem 1.5rem', borderTop: '1.5px solid rgba(255, 255, 255, 0.1)', background: '#090a0e' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ color: '#ff5414', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              CONTRACT ENGINEERING &bull; PARTNERSHIPS &bull; VENTURES
            </div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.75rem' }}>
              Have an Engineering Problem to Solve?
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '1.05rem', lineHeight: 1.65 }}>
              Whether you need automated campus Wi-Fi infrastructure deployed, Meta WhatsApp Cloud bot workflows, or reliable M-Pesa webhook pipelines built for your business.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{
            background: 'rgba(17, 19, 26, 0.96)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1.5px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '24px',
            padding: '2.5rem',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 84, 20, 0.15)',
            position: 'relative'
          }}>
            {submitSuccess && (
              <div style={{
                background: 'rgba(0, 230, 118, 0.14)',
                border: '1.5px solid #00e676',
                padding: '1.25rem',
                borderRadius: '12px',
                color: '#00e676',
                marginBottom: '1.5rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={20} /> Inquiry received! Duncan will reach out to you within 24 hours.
              </div>
            )}
            {submitError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.14)',
                border: '1.5px solid #ef4444',
                padding: '1.25rem',
                borderRadius: '12px',
                color: '#ef4444',
                marginBottom: '1.5rem',
                fontWeight: 700
              }}>
                {submitError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 700, marginBottom: '0.45rem', letterSpacing: '0.04em' }}>YOUR NAME</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Victor Mutua"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    background: '#090a0e',
                    border: '1.5px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 700, marginBottom: '0.45rem', letterSpacing: '0.04em' }}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    background: '#090a0e',
                    border: '1.5px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 700, marginBottom: '0.45rem', letterSpacing: '0.04em' }}>WHATSAPP / PHONE</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254 7XX XXX XXX"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    background: '#090a0e',
                    border: '1.5px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 700, marginBottom: '0.45rem', letterSpacing: '0.04em' }}>PRIMARY AREA OF INTEREST</label>
                <select
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1rem',
                    background: '#090a0e',
                    border: '1.5px solid rgba(255, 255, 255, 0.16)',
                    borderRadius: '10px',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Campus Wi-Fi & Hotspot Infrastructure">Campus Wi-Fi &amp; Hotspot Infrastructure</option>
                  <option value="WhatsApp Cloud API & Conversational Bots">WhatsApp Cloud API &amp; Conversational Bots</option>
                  <option value="M-Pesa Webhook & Payment Backend">M-Pesa Webhook &amp; Payment Backend</option>
                  <option value="Custom Production Engineering Solution">Custom Production Engineering Solution</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 700, marginBottom: '0.45rem', letterSpacing: '0.04em' }}>PROJECT SCOPE OR SYSTEM DETAILS</label>
              <textarea
                rows={4}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Briefly describe the infrastructure, scale, or operational challenge..."
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: '#090a0e',
                  border: '1.5px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  lineHeight: 1.6,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #ff5414 0%, #e03a00 100%)',
                color: '#ffffff',
                padding: '1rem',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '1rem',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 6px 20px rgba(255, 84, 20, 0.45)',
                transition: 'all 0.2s ease'
              }}
            >
              {isSubmitting ? 'Sending Request...' : 'Send Engineering Inquiry'} <Send size={16} />
            </button>
          </form>
        </div>
      </section>

      {/* ── Footer & Compliance Notice (Captive Portal Dark Theme) ── */}
      <footer style={{
        borderTop: '1.5px solid rgba(255, 255, 255, 0.1)',
        background: '#07080b',
        padding: '3rem 1.5rem',
        color: '#94a3b8',
        fontSize: '0.875rem'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: '#ffffff', fontSize: '1.2rem', marginBottom: '0.25rem' }}>
              MAKOYOCART VENTURES
            </div>
            <div style={{ color: '#cbd5e1' }}>Registration No: BN-WLSP9KP9 &bull; Operating duncanmakoyo.com</div>
            <div style={{ color: '#94a3b8', marginTop: '0.2rem' }}>Mwamosioma, Kisii-Kilgoris Road, Darajambili, P.O. Box 54, 40200 - Kisii, Kenya</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button onClick={() => window.location.hash = '#/terms'} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Terms</button>
            <button onClick={() => window.location.hash = '#/privacy'} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>Privacy</button>
            <a href="https://wa.me/254794877125" target="_blank" rel="noopener noreferrer" style={{ color: '#00e676', textDecoration: 'none', fontWeight: 700 }}>WhatsApp</a>
            <button onClick={() => window.location.hash = '#/academy/dashboard'} style={{
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#f1f5f9',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '6px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              Internal Ops Login
            </button>
          </div>
        </div>
        <div style={{ maxWidth: '1100px', margin: '1.75rem auto 0', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
          &copy; {new Date().getFullYear()} MAKOYOCART VENTURES &bull; Engineered by Duncan Makoyo. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
