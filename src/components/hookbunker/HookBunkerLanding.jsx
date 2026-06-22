import React, { useState } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  RefreshCw,
  Mail,
  Lock,
  Database,
  Activity,
  Clock,
  ChevronDown,
  ArrowRight,
  Globe,
  Terminal
} from 'lucide-react';
import { BunkerLayout, theme } from './theme';

// ─── Sub-Components ───────────────────────────────────────────────────────────

function Badge({ children, variant = 'primary' }) {
  const colors = {
    primary: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', color: theme.primary },
    danger:  { bg: 'rgba(239, 68, 68, 0.1)',  border: 'rgba(239, 68, 68, 0.2)',  color: theme.danger  },
  };
  const c = colors[variant];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: c.bg, border: `1px solid ${c.border}`,
      padding: '5px 14px', borderRadius: '9999px',
      fontSize: '0.78rem', fontWeight: 700, color: c.color,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {children}
    </span>
  );
}

function SectionHeading({ eyebrow, title, subtitle, center = true }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', marginBottom: '3.5rem' }}>
      {eyebrow && (
        <p style={{
          fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: theme.primary, marginBottom: '0.75rem',
        }}>
          {eyebrow}
        </p>
      )}
      <h2 style={{
        fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 900,
        letterSpacing: '-0.025em', lineHeight: 1.15,
        color: '#fff', margin: '0 auto 1rem',
        maxWidth: center ? '680px' : 'none',
        fontFamily: 'Montserrat, sans-serif',
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{
          color: theme.textMuted, fontSize: '1.05rem',
          lineHeight: 1.65, maxWidth: '600px',
          margin: center ? '0 auto' : '0',
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${theme.border}`,
      borderRadius: '16px', padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '2.5rem', fontWeight: 900, color: theme.primary, fontFamily: 'Montserrat, sans-serif' }}>
        {value}
      </div>
      <div style={{ color: theme.textMuted, fontSize: '0.875rem', marginTop: '0.4rem', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

export function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        background: 'rgba(17, 24, 39, 0.4)',
        border: `1px solid ${open ? 'rgba(16,185,129,0.25)' : theme.border}`,
        borderRadius: '10px', padding: '1.25rem 1.5rem',
        cursor: 'pointer', transition: 'border-color 0.2s',
      }}
    >
      <div style={{
        fontWeight: 700, color: '#fff', fontSize: '0.975rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
      }}>
        <span>{question}</span>
        <ChevronDown size={16} color={theme.primary} style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s', flexShrink: 0,
        }} />
      </div>
      {open && (
        <p style={{
          color: theme.textMuted, fontSize: '0.9rem',
          lineHeight: 1.65, marginTop: '0.875rem', cursor: 'default',
        }}>
          {answer}
        </p>
      )}
    </div>
  );
}

// ─── Main Landing Component ───────────────────────────────────────────────────

export function HookBunkerLanding({ onNavigate }) {
  const navigate = (path) => { window.location.hash = path; };

  const plans = [
    {
      name: 'Developer',
      tagline: 'Start for free, no card required',
      price: 'KES 0',
      period: 'forever',
      features: [
        '500 webhooks / month',
        '1 active project',
        '3-day log retention',
        'Configurable retry limit',
        'Email alert on first failure',
        'Force-redeliver from dashboard',
      ],
      cta: 'Get Started Free',
      highlighted: false,
    },
    {
      name: 'Team',
      tagline: 'For teams running live payment products',
      price: 'KES 3,400',
      period: '/ month',
      features: [
        '25,000 webhooks / month',
        'Up to 5 active projects',
        '14-day log retention',
        'HTTP signature forwarding',
        'Email alerts: first & final failure',
        'Real-time dashboard (LIVE)',
      ],
      cta: 'Upgrade to Team',
      highlighted: true,
      badge: 'Most Popular',
    },
    {
      name: 'Business',
      tagline: 'For high-volume payment pipelines',
      price: 'KES 11,500',
      period: '/ month',
      features: [
        '150,000 webhooks / month',
        'Unlimited active projects',
        '30-day log retention',
        'Priority execution queue',
        'Full delivery attempt history',
        'All Team features included',
      ],
      cta: 'Scale to Business',
      highlighted: false,
    },
  ];

  const faqs = [
    {
      q: 'How does HookBunker protect against M-Pesa timeout failures?',
      a: 'Safaricom Daraja requires your callback server to respond within 3 seconds. If your server is cold-starting, under load, or restarting, the callback is dropped permanently. HookBunker intercepts the request, writes it to persistent storage, and returns HTTP 200 in under 20ms — before Safaricom times out. Your server receives the payload asynchronously in the background.',
    },
    {
      q: 'What happens when a webhook delivery fails?',
      a: 'HookBunker records the failure with the HTTP status code and response body. You receive an immediate email alert. The retry system then re-attempts delivery according to your configured max retry limit (1–10). You receive a final "retries exhausted" email when all attempts are spent — no intermediate spam. You can also force-redeliver manually from the dashboard at any time.',
    },
    {
      q: 'Is the developer\'s server URL exposed to anyone?',
      a: 'No. Your target server URL is stored encrypted in Supabase and is only visible to you in the dashboard. It is never included in any response sent to payment gateways or third parties. HookBunker acts as a blind proxy — the gateway only ever sees api.duncanmakoyo.com.',
    },
    {
      q: 'How are billing and renewals handled?',
      a: 'Subscriptions are managed through Paystack\'s PCI-compliant billing infrastructure. Monthly renewals, card tokenization, and payment events are handled by Paystack and verified by HookBunker\'s backend via HMAC-signed webhook events. Your tier is updated automatically on payment confirmation and reverted automatically on cancellation.',
    },
    {
      q: 'What happens if I downgrade or my subscription lapses?',
      a: 'Your account reverts to the Developer (Free) tier immediately. HookBunker automatically deactivates projects beyond the free tier limit (1 active project), keeping your oldest project active. All historical logs remain accessible until the retention window expires. You can re-upgrade at any time.',
    },
    {
      q: 'Is my transaction payload data secure?',
      a: 'All payloads are stored in an encrypted PostgreSQL database on Supabase with strict Row-Level Security (RLS) policies. No user can query another user\'s data — enforced at the database layer, not just application code. Your server\'s target URL and API key are never shared with other tenants.',
    },
  ];

  return (
    <BunkerLayout onNavigate={onNavigate}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '5rem 1rem 7rem', position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px',
          background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 65%)`,
          zIndex: 0, pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '780px', margin: '0 auto' }}>
          <Badge><Zap size={12} /> Production-Grade Webhook Infrastructure</Badge>

          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 900, lineHeight: 1.08,
            letterSpacing: '-0.04em',
            margin: '1.5rem auto',
            fontFamily: 'Montserrat, sans-serif',
            background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Your Payment Webhooks,{' '}
            <span style={{ color: theme.primary, WebkitTextFillColor: 'initial' }}>
              Guaranteed Delivered.
            </span>
          </h1>

          <p style={{
            fontSize: '1.15rem', color: theme.textMuted,
            lineHeight: 1.7, margin: '0 auto 2.5rem',
            maxWidth: '580px',
          }}>
            HookBunker sits between your payment gateway and your server. It absorbs M-Pesa, Paystack, and Payhero callbacks in under 20ms, stores them, and delivers to your server with automatic retries and failure alerts.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('#/hookbunker/dashboard')}
              style={{
                background: theme.primary, color: '#fff',
                border: 'none', padding: '0.875rem 2rem',
                borderRadius: '8px', fontWeight: 700, fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: `0 0 0 1px ${theme.primary}, 0 4px 24px ${theme.primaryGlow}`,
                transition: 'transform 0.15s, box-shadow 0.15s',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 0 0 1px ${theme.primary}, 0 8px 32px ${theme.primaryGlow}`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 0 0 1px ${theme.primary}, 0 4px 24px ${theme.primaryGlow}`; }}
            >
              Start for Free <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('#/hookbunker/docs')}
              style={{
                background: 'transparent', color: theme.text,
                border: `1px solid ${theme.border}`,
                padding: '0.875rem 2rem', borderRadius: '8px',
                fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = theme.primary; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; }}
            >
              <Terminal size={16} /> View Integration Docs
            </button>
          </div>

          {/* Trust indicators */}
          <div style={{
            display: 'flex', gap: '1.5rem', justifyContent: 'center',
            alignItems: 'center', flexWrap: 'wrap', marginTop: '2.5rem',
          }}>
            {[
              { icon: <Lock size={13} />, text: 'HMAC-verified ingestion' },
              { icon: <Globe size={13} />, text: 'Custom domain masking' },
              { icon: <Activity size={13} />, text: 'Real-time log streaming' },
            ].map((item, i) => (
              <span key={i} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                color: theme.textMuted, fontSize: '0.8rem', fontWeight: 500,
              }}>
                <span style={{ color: theme.primary }}>{item.icon}</span>
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '7rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.5rem',
        }}>
          <StatCard value="< 20ms" label="Guaranteed gateway acknowledgment" />
          <StatCard value="100%" label="Payload capture rate" />
          <StatCard value="1–10×" label="Configurable retry attempts" />
          <StatCard value="3 gateways" label="M-Pesa, Paystack, Payhero" />
        </div>
      </section>

      {/* ── Problem vs Solution ───────────────────────────────────────────── */}
      <section style={{ marginBottom: '8rem' }}>
        <SectionHeading
          eyebrow="Why HookBunker"
          title="Standard Webhook Integration is Fragile by Design"
          subtitle="Payment gateways fire once and forget. Any failure on your end means a lost transaction — and a frustrated customer."
        />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
        }}>
          {/* Without */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.03)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            padding: '2.5rem', borderRadius: '16px',
          }}>
            <Badge variant="danger"><XCircle size={11} /> Without HookBunker</Badge>
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {[
                { title: 'Timeout Dropouts', body: 'M-Pesa requires a response in under 3 seconds. A cold-starting server misses the window — the transaction is dropped silently.' },
                { title: 'Server Downtime = Lost Payments', body: 'A 2-minute deployment window can cause 5+ payment callbacks to vanish. No logs, no retry, no recovery.' },
                { title: 'Zero Visibility', body: 'You only discover missed payments when customers complain. By then it is too late to replay anything.' },
                { title: 'Local Debugging Friction', body: 'Rotating ngrok tunnels, manual payment tests, no payload inspection — debugging payment integrations is a day-long process.' },
              ].map((item, i) => (
                <div key={i}>
                  <h4 style={{ color: '#fff', fontSize: '0.975rem', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={14} color={theme.danger} style={{ flexShrink: 0 }} /> {item.title}
                  </h4>
                  <p style={{ color: theme.textMuted, fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* With HookBunker */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.02)',
            border: `1px solid rgba(16,185,129,0.2)`,
            padding: '2.5rem', borderRadius: '16px',
            boxShadow: `0 8px 40px ${theme.primaryGlow}`,
          }}>
            <Badge><Shield size={11} /> With HookBunker</Badge>
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {[
                { title: '< 20ms Acknowledgment', body: 'HookBunker absorbs the request, writes to the database, and returns 200 OK before M-Pesa\'s timeout window closes.' },
                { title: 'Automatic Retry Queue', body: 'If your server is down, the payload is stored. Automated retries run until delivery succeeds or your configured limit is reached.' },
                { title: 'Full Payload Logs', body: 'Every callback is stored with the raw JSON body, headers, delivery attempts, HTTP status codes, and timestamps.' },
                { title: '1-Click Replay', body: 'Inspect the exact payload your gateway sent, and replay it to any URL — including localhost — directly from the dashboard.' },
              ].map((item, i) => (
                <div key={i}>
                  <h4 style={{ color: '#fff', fontSize: '0.975rem', fontWeight: 700, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={14} color={theme.primary} style={{ flexShrink: 0 }} /> {item.title}
                  </h4>
                  <p style={{ color: theme.textMuted, fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '8rem' }}>
        <SectionHeading
          eyebrow="How It Works"
          title="Three Steps to a Bulletproof Payment Pipeline"
        />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '2rem',
        }}>
          {[
            {
              step: '01',
              icon: <Terminal size={28} color={theme.primary} />,
              title: 'Create a Project',
              body: 'Sign in, create a project, and enter the URL of your backend endpoint. HookBunker generates a unique ingestion URL for each project.',
            },
            {
              step: '02',
              icon: <Globe size={28} color={theme.secondary} />,
              title: 'Point Your Gateway',
              body: 'Set your HookBunker ingestion URL as the callback/webhook URL in your M-Pesa, Paystack, or Payhero dashboard. Done in 30 seconds.',
            },
            {
              step: '03',
              icon: <Activity size={28} color={theme.primary} />,
              title: 'Monitor & Relax',
              body: 'HookBunker captures, logs, and delivers every callback. Your dashboard streams live results. Email alerts fire on failure — only once, not on every retry.',
            },
          ].map((item, i) => (
            <div key={i} style={{
              background: theme.cardBg, border: `1px solid ${theme.border}`,
              padding: '2.5rem', borderRadius: '16px', position: 'relative',
            }}>
              <span style={{
                position: 'absolute', top: '1.5rem', right: '1.5rem',
                fontSize: '0.7rem', fontWeight: 900, color: theme.primary,
                opacity: 0.5, letterSpacing: '0.1em',
              }}>
                {item.step}
              </span>
              <div style={{ marginBottom: '1.25rem' }}>{item.icon}</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.6rem', color: '#fff' }}>
                {item.title}
              </h3>
              <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '8rem' }}>
        <SectionHeading
          eyebrow="Core Features"
          title="Everything a Production Webhook Pipeline Needs"
        />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}>
          {[
            { icon: <Zap size={24} color={theme.primary} />, title: 'Sub-20ms Ingestion', body: 'Payload is acknowledged to the gateway before any processing occurs. M-Pesa, Paystack — no more timeouts.' },
            { icon: <RefreshCw size={24} color={theme.secondary} />, title: 'Configurable Retries', body: 'Set 1–10 max retry attempts per project. The system stops automatically and notifies you when the limit is reached.' },
            { icon: <Mail size={24} color={theme.danger} />, title: 'Smart Email Alerts', body: 'You get exactly 2 emails per failure: one on the first attempt, one when retries are exhausted. No inbox flooding.' },
            { icon: <Lock size={24} color={theme.primary} />, title: 'Signature Forwarding', body: 'Original gateway headers (x-paystack-signature, etc.) are preserved and forwarded so your server can validate them.' },
            { icon: <Database size={24} color={theme.secondary} />, title: 'Full Payload History', body: 'Every delivery attempt is logged with status code, response body, latency, and timestamp. Full forensic trail.' },
            { icon: <Clock size={24} color={theme.primary} />, title: 'Force Redeliver', body: 'Replay any stored webhook to any URL with one click. Use it for debugging local integrations without live payments.' },
          ].map((f, i) => (
            <div key={i} style={{
              background: theme.cardBg, border: `1px solid ${theme.border}`,
              padding: '2rem', borderRadius: '14px',
            }}>
              <div style={{ marginBottom: '1rem' }}>{f.icon}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>{f.title}</h3>
              <p style={{ color: theme.textMuted, fontSize: '0.875rem', lineHeight: 1.65, margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '8rem' }} id="pricing">
        <SectionHeading
          eyebrow="Pricing"
          title="Predictable Plans. No Surprise Charges."
          subtitle="Pick the tier that matches your monthly webhook volume. All plans include the full feature set. Upgrade or cancel anytime."
        />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '2rem',
          maxWidth: '1000px',
          margin: '0 auto',
        }}>
          {plans.map((plan, i) => (
            <div key={i} style={{
              background: plan.highlighted ? 'rgba(16,185,129,0.04)' : theme.cardBg,
              border: `1px solid ${plan.highlighted ? theme.primary : theme.border}`,
              borderRadius: '18px', padding: '2.5rem 2rem',
              display: 'flex', flexDirection: 'column',
              position: 'relative',
              boxShadow: plan.highlighted ? `0 12px 40px ${theme.primaryGlow}` : 'none',
            }}>
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: '-13px', left: '50%',
                  transform: 'translateX(-50%)',
                  background: theme.primary, color: '#fff',
                  fontSize: '0.7rem', fontWeight: 800, padding: '4px 14px',
                  borderRadius: '9999px', letterSpacing: '0.08em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ marginBottom: '1.75rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.3rem' }}>
                  {plan.name}
                </h3>
                <p style={{ color: theme.textMuted, fontSize: '0.8rem', margin: '0 0 1.25rem' }}>
                  {plan.tagline}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '2.25rem', fontWeight: 900, color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>
                    {plan.price}
                  </span>
                  <span style={{ color: theme.textMuted, fontSize: '0.875rem' }}>{plan.period}</span>
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
                {plan.features.map((f, fi) => (
                  <li key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.875rem', color: theme.text }}>
                    <CheckCircle size={15} color={theme.primary} style={{ marginTop: '1px', flexShrink: 0 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate('#/hookbunker/dashboard')}
                style={{
                  background: plan.highlighted ? theme.primary : 'rgba(255,255,255,0.05)',
                  color: plan.highlighted ? '#fff' : theme.text,
                  border: plan.highlighted ? 'none' : `1px solid ${theme.border}`,
                  padding: '0.75rem 1.5rem', borderRadius: '8px',
                  fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                  transition: 'opacity 0.15s',
                  width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p style={{
          textAlign: 'center', color: theme.textMuted, fontSize: '0.8rem',
          marginTop: '2rem',
        }}>
          All prices in Kenyan Shillings. USD pricing available at checkout. Cancel or change plans at any time from your dashboard.
        </p>
      </section>

      {/* ── Security Strip ───────────────────────────────────────────────── */}
      <section style={{
        background: 'rgba(16, 185, 129, 0.03)',
        border: `1px solid rgba(16,185,129,0.1)`,
        borderRadius: '16px', padding: '3rem 2.5rem',
        marginBottom: '8rem',
        display: 'flex', flexWrap: 'wrap',
        gap: '2rem', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ maxWidth: '480px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
            <Shield size={22} color={theme.primary} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Built Secure by Default
            </h3>
          </div>
          <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.65, margin: 0 }}>
            Your target server URL is never exposed to gateways or other tenants. All ingestion traffic flows through our domain. Database rows are isolated by user ID at the PostgreSQL layer — not just in application code.
          </p>
        </div>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.75rem',
        }}>
          {[
            'HMAC Signature Verification',
            'Row-Level Security (RLS)',
            'JWT-Authenticated Dashboard',
            'Ingestion Rate Limiting',
            'No Backend URL Exposure',
            'Replay Attack Prevention',
          ].map((item, i) => (
            <span key={i} style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.15)',
              color: theme.primary, fontSize: '0.78rem',
              fontWeight: 600, padding: '5px 12px', borderRadius: '6px',
            }}>
              ✓ {item}
            </span>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '6rem' }}>
        <SectionHeading
          eyebrow="FAQ"
          title="Common Questions"
          subtitle="Everything you need to know before integrating HookBunker into your payment pipeline."
        />
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {faqs.map((faq, i) => (
            <FaqItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </section>

      {/* ── CTA Footer ───────────────────────────────────────────────────── */}
      <section style={{
        textAlign: 'center',
        borderTop: `1px solid ${theme.border}`,
        paddingTop: '5rem', paddingBottom: '4rem',
      }}>
        <h2 style={{
          fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
          fontWeight: 900, letterSpacing: '-0.03em',
          color: '#fff', marginBottom: '1rem',
          fontFamily: 'Montserrat, sans-serif',
        }}>
          Stop Losing Payments to Webhook Failures
        </h2>
        <p style={{ color: theme.textMuted, fontSize: '1rem', maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: 1.65 }}>
          Start for free. No credit card required. Your first project is ready in under 2 minutes.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('#/hookbunker/dashboard')}
            style={{
              background: theme.primary, color: '#fff',
              border: 'none', padding: '0.875rem 2.25rem',
              borderRadius: '8px', fontWeight: 700, fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: `0 4px 24px ${theme.primaryGlow}`,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            Create Free Account <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('#/hookbunker/docs')}
            style={{
              background: 'transparent', color: theme.text,
              border: `1px solid ${theme.border}`, padding: '0.875rem 2.25rem',
              borderRadius: '8px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Read the Docs
          </button>
        </div>
      </section>

    </BunkerLayout>
  );
}
