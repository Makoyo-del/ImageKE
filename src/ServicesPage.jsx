import React, { useState } from 'react';
import axios from 'axios';
import { 
  Wifi, 
  MessageSquare, 
  ShieldCheck, 
  Server, 
  Cpu, 
  Activity, 
  Zap, 
  CheckCircle, 
  Send, 
  ExternalLink, 
  MessageCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Terminal, 
  Layers, 
  RefreshCw,
  ArrowRight,
  Database,
  Network
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
    <div style={{ background: '#09090b', color: '#f4f4f5', minHeight: '100vh', fontFamily: "'Space Grotesk', -apple-system, sans-serif" }}>
      {/* ── Navigation Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)',
        background: 'rgba(9, 9, 11, 0.85)', borderBottom: '1px solid #27272a',
        padding: '1rem 1.5rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff' }}>
              DM<span style={{ color: '#10b981' }}>.</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Makoyocart Ventures
            </div>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
            <button onClick={() => scrollTo('ventures')} style={{ background: 'none', border: 'none', color: '#d4d4d8', cursor: 'pointer' }}>Active Ventures</button>
            <button onClick={() => scrollTo('campusnet')} style={{ background: 'none', border: 'none', color: '#d4d4d8', cursor: 'pointer' }}>Campus Wi-Fi</button>
            <button onClick={() => scrollTo('whatsapp')} style={{ background: 'none', border: 'none', color: '#d4d4d8', cursor: 'pointer' }}>WhatsApp Engine</button>
            <button onClick={() => scrollTo('payments')} style={{ background: 'none', border: 'none', color: '#d4d4d8', cursor: 'pointer' }}>Payment Infra</button>
            <button onClick={() => scrollTo('contact')} style={{
              background: '#10b981', color: '#000', border: 'none', padding: '0.5rem 1.1rem',
              borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}>
              Consult on Systems <ArrowRight size={14} />
            </button>
          </nav>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section style={{ padding: '5rem 1.5rem 4rem', maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '9999px', padding: '0.35rem 0.9rem',
          fontSize: '0.8rem', color: '#34d399', fontWeight: 700, marginBottom: '1.5rem'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          SYSTEMS ENGINEER &bull; HARDWARE &bull; NETWORKS &bull; AUTOMATION
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4.2rem)', fontWeight: 800, lineHeight: 1.1,
          letterSpacing: '-0.04em', margin: '0 0 1.5rem', color: '#ffffff'
        }}>
          I Engineer Real-World <br />
          <span style={{ color: '#10b981' }}>Working Production Systems.</span>
        </h1>

        <p style={{
          fontSize: '1.15rem', color: '#a1a1aa', maxWidth: '750px', margin: '0 auto 2.5rem',
          lineHeight: 1.7, fontWeight: 400
        }}>
          No abstract software or generic website fluff. I design, deploy, and operate tangible infrastructure that solves physical friction—from high-density campus hostel Wi-Fi networks to Meta WhatsApp Cloud API automation and zero-loss payment pipelines.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
          <button onClick={() => scrollTo('ventures')} style={{
            background: '#ffffff', color: '#09090b', padding: '0.85rem 1.75rem', borderRadius: '8px',
            fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer'
          }}>
            Explore Active Ventures
          </button>
          <a href="https://wa.me/254794877125" target="_blank" rel="noopener noreferrer" style={{
            background: 'rgba(255,255,255,0.05)', color: '#ffffff', border: '1px solid #27272a',
            padding: '0.85rem 1.75rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <MessageCircle size={18} style={{ color: '#10b981' }} /> Chat on WhatsApp
          </a>
        </div>

        {/* Live Metrics Grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem',
          textAlign: 'left'
        }}>
          <div style={{ background: '#121215', border: '1px solid #27272a', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campus ISP Sessions</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>450+ Vouchers</div>
            <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '0.25rem' }}>Generated &amp; consumed live in hostels</div>
          </div>
          <div style={{ background: '#121215', border: '1px solid #27272a', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>M-Pesa Webhooks</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>100+ Live STKs</div>
            <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '0.25rem' }}>Processed via HookBunker gateway</div>
          </div>
          <div style={{ background: '#121215', border: '1px solid #27272a', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meta Business Status</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a78bfa', marginTop: '0.25rem' }}>Verified Domain</div>
            <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '0.25rem' }}>WhatsApp Cloud API portfolio active</div>
          </div>
          <div style={{ background: '#121215', border: '1px solid #27272a', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Core Hardware</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>MikroTik L009</div>
            <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '0.25rem' }}>High-density hostel routing &amp; queues</div>
          </div>
        </div>
      </section>

      {/* ── Active Ventures Anchor ── */}
      <div id="ventures"></div>

      {/* ── Venture 1: CampusNet Wi-Fi Infrastructure ── */}
      <section id="campusnet" style={{ padding: '4rem 1.5rem', borderTop: '1px solid #1f1f23', background: '#0e0e11' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            <Wifi size={18} /> VENTURE 01 &bull; CAMPUS INTERNET INFRASTRUCTURE
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 1rem', color: '#ffffff' }}>
            CampusNet: Autonomous Hostel Wi-Fi Network
          </h2>
          <p style={{ color: '#a1a1aa', maxWidth: '750px', fontSize: '1.05rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
            A fully automated, coinless Wi-Fi venture deployed in student hostels around Kisii. Eliminates manual voucher vending through direct Safaricom M-Pesa STK Push triggers, instant captive portal authentication, and automated session renewal.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: '#16161a', border: '1px solid #27272a', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Server style={{ color: '#10b981' }} size={24} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>MikroTik L009 Gateway Core</h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Configured as the high-throughput master router. Handles RouterOS v7 firewall, NAT, DHCP leases, DNS caching, queue-tree per-client bandwidth fairness (no choking), and captive portal walled-garden bypass.
              </p>
            </div>

            <div style={{ background: '#16161a', border: '1px solid #27272a', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Network style={{ color: '#38bdf8' }} size={24} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>hAP Lite Access Points</h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Stripped of routing duties and deployed in pure Access Point bridge mode. Eliminates double-NAT latency and broadcast storms across dense multi-floor student quarters.
              </p>
            </div>

            <div style={{ background: '#16161a', border: '1px solid #27272a', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Database style={{ color: '#a78bfa' }} size={24} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff' }}>Supabase Real-Time Ledger</h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Session tracking, MAC address binds, payment reconciliation, and a dynamic 10-stamp loyalty engine that automatically awards returning residents with free pass codes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Venture 2: WhatsApp Cloud API Automation ── */}
      <section id="whatsapp" style={{ padding: '4rem 1.5rem', borderTop: '1px solid #1f1f23', background: '#09090b' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a78bfa', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            <MessageSquare size={18} /> VENTURE 02 &bull; CONVERSATIONAL COMMERCE &amp; BOT PIPELINES
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 1rem', color: '#ffffff' }}>
            Meta WhatsApp Cloud API Engine
          </h2>
          <p style={{ color: '#a1a1aa', maxWidth: '750px', fontSize: '1.05rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
            Leveraging Meta's official WhatsApp Business Cloud API under Makoyocart Ventures to turn friction-heavy customer workflows into automated, instant WhatsApp conversations.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: '#121215', border: '1px solid #27272a', borderRadius: '12px', padding: '1.5rem' }}>
              <Zap style={{ color: '#a78bfa', marginBottom: '0.75rem' }} size={24} />
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#fff' }}>Instant Voucher Dispatch</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                When an M-Pesa payment lands, the system automatically pushes the generated Wi-Fi passcode and duration receipt straight into the customer's WhatsApp chat with zero human delay.
              </p>
            </div>

            <div style={{ background: '#121215', border: '1px solid #27272a', borderRadius: '12px', padding: '1.5rem' }}>
              <ShieldCheck style={{ color: '#10b981', marginBottom: '0.75rem' }} size={24} />
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#fff' }}>Self-Service Troubleshooting</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Conversational diagnostic bot that guides hostel students through network re-connections, voucher status queries, and AP signal validation without operator intervention.
              </p>
            </div>

            <div style={{ background: '#121215', border: '1px solid #27272a', borderRadius: '12px', padding: '1.5rem' }}>
              <Activity style={{ color: '#38bdf8', marginBottom: '0.75rem' }} size={24} />
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#fff' }}>Verified Enterprise Domain</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Officially verified under duncanmakoyo.com with DNS TXT authentication and legal BRS business credentials for high message delivery tiering.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Venture 3: Payment Ingestion & HookBunker ── */}
      <section id="payments" style={{ padding: '4rem 1.5rem', borderTop: '1px solid #1f1f23', background: '#0e0e11' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
            <Terminal size={18} /> VENTURE 03 &bull; PAYMENT WEBHOOK ARCHITECTURE
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 1rem', color: '#ffffff' }}>
            HookBunker: Resilient Webhook Proxy &amp; Gateway
          </h2>
          <p style={{ color: '#a1a1aa', maxWidth: '750px', fontSize: '1.05rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
            The backbone handling payment verification across all operations. Ingests high-frequency callback events from Safaricom M-Pesa, Paystack, and Payhero, ensuring zero dropped payments.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: '#16161a', border: '1px solid #27272a', borderRadius: '10px', padding: '1.25rem' }}>
              <h4 style={{ color: '#fff', margin: '0 0 0.5rem' }}>HMAC SHA-512 Security</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>Constant-time signature verification prevents spoofing attacks on callback endpoints.</p>
            </div>
            <div style={{ background: '#16161a', border: '1px solid #27272a', borderRadius: '10px', padding: '1.25rem' }}>
              <h4 style={{ color: '#fff', margin: '0 0 0.5rem' }}>Idempotent Processing</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>Deduplicates identical payment events so network retries never double-credit vouchers or accounts.</p>
            </div>
            <div style={{ background: '#16161a', border: '1px solid #27272a', borderRadius: '10px', padding: '1.25rem' }}>
              <h4 style={{ color: '#fff', margin: '0 0 0.5rem' }}>Dead-Letter Queue</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, margin: 0 }}>Logs payload snapshots in Supabase for audit trail and manual replay if target endpoints go cold.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact & Engineering Inquiry Section ── */}
      <section id="contact" style={{ padding: '5rem 1.5rem', borderTop: '1px solid #1f1f23', background: '#09090b' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              CONTRACT ENGINEERING &bull; PARTNERSHIPS &bull; VENTURES
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff', margin: '0.5rem 0' }}>
              Have an Engineering Problem to Solve?
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: '1rem', lineHeight: 1.6 }}>
              Whether you need automated campus Wi-Fi infrastructure deployed, Meta WhatsApp Cloud bot workflows, or reliable M-Pesa webhook pipelines built for your business.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ background: '#121215', border: '1px solid #27272a', borderRadius: '12px', padding: '2rem' }}>
            {submitSuccess && (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', padding: '1rem', borderRadius: '8px', color: '#10b981', marginBottom: '1.5rem', fontWeight: 600 }}>
                ✓ Inquiry received! Duncan will reach out to you within 24 hours.
              </div>
            )}
            {submitError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: '8px', color: '#ef4444', marginBottom: '1.5rem', fontWeight: 600 }}>
                {submitError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>YOUR NAME</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Victor Mutua"
                  style={{ width: '100%', padding: '0.75rem', background: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  style={{ width: '100%', padding: '0.75rem', background: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>WHATSAPP / PHONE</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254 7XX XXX XXX"
                  style={{ width: '100%', padding: '0.75rem', background: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>PRIMARY AREA OF INTEREST</label>
                <select
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', background: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', fontSize: '0.9rem' }}
                >
                  <option value="Campus Wi-Fi & Hotspot Infrastructure">Campus Wi-Fi &amp; Hotspot Infrastructure</option>
                  <option value="WhatsApp Cloud API & Conversational Bots">WhatsApp Cloud API &amp; Conversational Bots</option>
                  <option value="M-Pesa Webhook & Payment Backend">M-Pesa Webhook &amp; Payment Backend</option>
                  <option value="Custom Production Engineering Solution">Custom Production Engineering Solution</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>PROJECT SCOPE OR SYSTEM DETAILS</label>
              <textarea
                rows={4}
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Briefly describe the infrastructure, scale, or operational challenge..."
                style={{ width: '100%', padding: '0.75rem', background: '#09090b', border: '1px solid #27272a', borderRadius: '6px', color: '#fff', fontSize: '0.9rem', lineHeight: 1.5 }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%', background: '#10b981', color: '#000', padding: '0.85rem',
                border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.95rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {isSubmitting ? 'Sending Request...' : 'Send Engineering Inquiry'} <Send size={16} />
            </button>
          </form>
        </div>
      </section>

      {/* ── Footer & Compliance Notice ── */}
      <footer style={{ borderTop: '1px solid #1f1f23', background: '#070709', padding: '3rem 1.5rem', color: '#71717a', fontSize: '0.85rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              MAKOYOCART VENTURES
            </div>
            <div>Registration No: BN-WLSP9KP9 &bull; Operating duncanmakoyo.com</div>
            <div>Mwamosioma, Kisii-Kilgoris Road, Darajambili, P.O. Box 54, 40200 - Kisii, Kenya</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button onClick={() => window.location.hash = '#/terms'} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '0.85rem' }}>Terms</button>
            <button onClick={() => window.location.hash = '#/privacy'} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '0.85rem' }}>Privacy</button>
            <a href="https://wa.me/254794877125" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none' }}>WhatsApp</a>
            <button onClick={() => window.location.hash = '#/academy/dashboard'} style={{
              background: '#18181b', color: '#a1a1aa', border: '1px solid #27272a',
              borderRadius: '4px', padding: '0.35rem 0.65rem', fontSize: '0.75rem', cursor: 'pointer'
            }}>
              Internal Ops Login
            </button>
          </div>
        </div>
        <div style={{ maxWidth: '1100px', margin: '1.5rem auto 0', paddingTop: '1rem', borderTop: '1px solid #18181b', textAlign: 'center', fontSize: '0.75rem', color: '#52525b' }}>
          &copy; {new Date().getFullYear()} MAKOYOCART VENTURES &bull; Engineered by Duncan Makoyo. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
