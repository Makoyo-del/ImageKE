import React from 'react';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Zap, 
  RefreshCw, 
  Mail 
} from 'lucide-react';
import { BunkerLayout, theme } from './theme';

export function FaqItem({ question, answer }) {
  return (
    <details 
      style={{
        background: 'rgba(17, 24, 39, 0.4)',
        border: `1px solid ${theme.border}`,
        borderRadius: '8px',
        padding: '1.25rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        outline: 'none',
        textAlign: 'left'
      }}
    >
      <summary 
        style={{
          fontWeight: 700,
          color: '#fff',
          fontSize: '1.05rem',
          outline: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          listStyle: 'none'
        }}
      >
        <span>{question}</span>
        <span style={{ color: theme.primary, fontSize: '1.3rem', fontWeight: 600 }}>+</span>
      </summary>
      <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6, marginTop: '0.75rem', cursor: 'default' }}>
        {answer}
      </p>
    </details>
  );
}

export function HookBunkerLanding({ onNavigate }) {
  const plans = [
    {
      name: 'Developer',
      price: 'KES 0',
      period: 'Forever Free',
      features: [
        '500 webhooks / month',
        '3 days data retention',
        '15 mins retry interval',
        'Basic Email Alerts',
        '1 active project',
        'Manual retry triggers'
      ],
      cta: 'Get Started Free',
      glow: false
    },
    {
      name: 'Team',
      price: '$26',
      period: '/ month',
      features: [
        '25,000 webhooks / month',
        '14 days data retention',
        '5 mins retry interval',
        'Instant Email Alerts',
        '5 active projects',
        'Manual retry triggers',
        'HTTP signature check'
      ],
      cta: 'Deploy Team Tier',
      glow: true
    },
    {
      name: 'Business',
      price: '$89',
      period: '/ month',
      features: [
        '150,000 webhooks / month',
        '30 days data retention',
        '1 min retry interval',
        'Priority Email Alerts',
        'Unlimited projects',
        'Priority execution queue',
        'Custom payload filtering'
      ],
      cta: 'Scale to Business',
      glow: false
    }
  ];

  return (
    <BunkerLayout onNavigate={onNavigate}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '4rem 1rem 6rem', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '500px',
          background: `radial-gradient(circle, ${theme.primaryGlow} 0%, transparent 70%)`,
          zIndex: 0,
          pointerEvents: 'none'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: theme.primary,
            marginBottom: '2rem'
          }}>
            <Zap size={14} /> Production Webhook Insurance is Here
          </div>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '1.5rem',
            maxWidth: '800px',
            margin: '0 auto 1.5rem',
            background: 'linear-gradient(to right, #ffffff, #9ca3af)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Zero Lost Payment Webhooks. <span style={{ color: theme.primary, WebkitTextFillColor: 'initial' }}>Ever.</span>
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: theme.textMuted,
            maxWidth: '650px',
            margin: '0 auto 2.5rem',
            lineHeight: 1.6
          }}>
            A highly resilient proxy for Safaricom M-Pesa, Paystack, and Payhero callbacks. We ingest callbacks, respond immediately, and handle retries & failures automatically.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              onClick={() => window.location.hash = '#/hookbunker/dashboard'}
              style={{
                background: theme.primary,
                color: '#ffffff',
                border: 'none',
                padding: '0.875rem 2rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${theme.primaryGlow}`,
                transition: 'all 0.2s'
              }}
            >
              Get Started Free
            </button>
            <button 
              onClick={() => window.location.hash = '#/hookbunker/docs'}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: theme.text,
                border: `1px solid ${theme.border}`,
                padding: '0.875rem 2rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              Read Integration Docs
            </button>
          </div>
        </div>
      </section>

      {/* Problem vs Solution Section */}
      <section style={{ marginBottom: '8rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>
          Why Developers Use HookBunker
        </h2>
        <p style={{ color: theme.textMuted, fontSize: '1.05rem', maxWidth: '650px', margin: '0 auto 3.5rem', lineHeight: 1.6 }}>
          Standard webhook integration is fragile. We decoupled ingestion from processing to make your payment pipeline bulletproof.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2.5rem',
          textAlign: 'left'
        }}>
          {/* Traditional Webhooks Nightmare */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.02)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            padding: '2.5rem',
            borderRadius: '16px',
            position: 'relative',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: theme.danger,
              marginBottom: '2rem'
            }}>
              <XCircle size={12} /> The Nightmare: Traditional Webhooks
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} color={theme.danger} /> Timeout Dropouts (M-Pesa 3s Limit)
                </h4>
                <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  If your server is cold-starting or busy processing background jobs, the gateway drops the connection. The customer paid, but their account remains locked.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} color={theme.danger} /> Server Downtime Data Loss
                </h4>
                <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  If your backend goes down for maintenance or updates, missed gateway callbacks are dropped, requiring tedious manual database entries.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} color={theme.danger} /> Local Debugging Hell
                </h4>
                <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Using free Ngrok tunnels that rotate URLs constantly, and having to perform live payments just to test callback integrations.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} color={theme.danger} /> Spoofing & Security Risks
                </h4>
                <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Exposing raw billing routes to the public web without robust signature validation, inviting malicious spoofed payloads.
                </p>
              </div>
            </div>
          </div>

          {/* HookBunker Shield */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.02)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            padding: '2.5rem',
            borderRadius: '16px',
            position: 'relative',
            boxShadow: `0 8px 30px ${theme.primaryGlow}`
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: theme.primary,
              marginBottom: '2rem'
            }}>
              <Shield size={12} color={theme.primary} /> The Shield: Powered by HookBunker
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              <div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} color={theme.primary} /> Instant &lt;20ms Ingestion
                </h4>
                <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  We absorb the callback instantly, write to our logs, and respond to the gateway within milliseconds. Zero timeouts.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} color={theme.primary} /> Automated Queue &amp; Retries
                </h4>
                <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  If your server is down, HookBunker buffers the payloads and schedules automated retries at set intervals until you recover.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} color={theme.primary} /> 1-Click Replay &amp; Dashboard Logs
                </h4>
                <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Inspect raw JSON callback bodies directly from your dashboard and replay them with one click to localhost for debugging.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} color={theme.primary} /> Secure Gateway Sandbox Isolation
                </h4>
                <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Hide your real API server behind HookBunker. We validate gateway headers and forward payloads with authenticated tokens.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ marginBottom: '8rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '4rem' }}>
          Engineered for 100% Callback Reliability
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem'
        }}>
          <div style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            padding: '2.5rem',
            borderRadius: '16px',
            backdropFilter: 'blur(8px)'
          }}>
            <Zap size={32} color={theme.primary} style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Lightning-Fast Acknowledgment</h3>
            <p style={{ color: theme.textMuted, lineHeight: 1.6, fontSize: '0.95rem' }}>
              We receive callbacks, write to a persistent logs table, and return HTTP 200 within 20 milliseconds. Safaricom never timeouts again.
            </p>
          </div>
          <div style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            padding: '2.5rem',
            borderRadius: '16px',
            backdropFilter: 'blur(8px)'
          }}>
            <RefreshCw size={32} color={theme.secondary} style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Smart Retries & Backoff</h3>
            <p style={{ color: theme.textMuted, lineHeight: 1.6, fontSize: '0.95rem' }}>
              If your backend is down or undergoing updates, we queue the transaction and retry periodically using an exponential delay algorithm.
            </p>
          </div>
          <div style={{
            background: theme.cardBg,
            border: `1px solid ${theme.border}`,
            padding: '2.5rem',
            borderRadius: '16px',
            backdropFilter: 'blur(8px)'
          }}>
            <Mail size={32} color={theme.danger} style={{ marginBottom: '1.5rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Instant Failure Alerting</h3>
            <p style={{ color: theme.textMuted, lineHeight: 1.6, fontSize: '0.95rem' }}>
              The moment a delivery fails to reach your server, we send detailed diagnostic emails via Resend detailing target URL error status codes.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Grid */}
      <section style={{ marginBottom: '4rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
          Sentry-Style Predictable Plans
        </h2>
        <p style={{ textAlign: 'center', color: theme.textMuted, marginBottom: '4rem' }}>
          No complex calculation. Pick a tier that covers your webhook volume.
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2.5rem',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          {plans.map((p, idx) => (
            <div key={idx} style={{
              background: theme.cardBg,
              border: `1px solid ${p.glow ? theme.primary : theme.border}`,
              padding: '3rem 2rem',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxShadow: p.glow ? `0 10px 40px ${theme.primaryGlow}` : 'none'
            }}>
              {p.glow && (
                <span style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: theme.primary,
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Most Popular
                </span>
              )}
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{p.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{p.price}</span>
                <span style={{ color: theme.textMuted, fontSize: '0.95rem' }}>{p.period}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                {p.features.map((f, fIdx) => (
                  <li key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: theme.text }}>
                    <CheckCircle size={16} color={theme.primary} /> {f}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => window.location.hash = '#/hookbunker/dashboard'}
                style={{
                  background: p.glow ? theme.primary : 'rgba(255, 255, 255, 0.05)',
                  color: p.glow ? '#ffffff' : theme.text,
                  border: p.glow ? 'none' : `1px solid ${theme.border}`,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="bunker-faqs" style={{ marginTop: '6rem', borderTop: `1px solid ${theme.border}`, paddingTop: '4rem', paddingBottom: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.025em' }}>Frequently Asked Questions</h2>
          <p style={{ color: theme.textMuted, fontSize: '1.05rem', marginTop: '0.5rem', maxWidth: '600px', margin: '0.5rem auto 0' }}>
            Learn how HookBunker safeguards your payment integration channels, maintains cycles, and handles scale.
          </p>
        </div>
        
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <FaqItem 
            question="How does HookBunker protect against M-Pesa webhook timeouts?" 
            answer="Safaricom Daraja API requires callback servers to respond within a strict 3-second limit. If your backend is restarting, cold-starting, or under load, the callback fails and M-Pesa drops the transaction. HookBunker intercepts incoming HTTP requests, logs them instantly, returns a 200 OK within 20ms, and securely forwards the payload to your destination in the background."
          />
          <FaqItem 
            question="What happens if a webhook delivery fails?" 
            answer="If your server crashes or returns an error status (e.g. 500, 502), HookBunker records the attempt and schedules automated retry deliveries based on your plan tier (Free = 15 mins, Team = 5 mins, Business = 1 min). You can also manually inspect the HTTP response body and click 'Force Redeliver' inside the console."
          />
          <FaqItem 
            question="How are subscription billing cycles maintained?" 
            answer="HookBunker is integrated with Paystack's billing engine. All monthly renewals, card tokenizations, and transactions are managed and verified on Paystack's PCI-compliant infrastructure. Our backend listens for Paystack subscription webhook notifications to automatically update your workspace limits or notify you on payment failures."
          />
          <FaqItem 
            question="What happens to my projects if my subscription fails or downgrades?" 
            answer="If your billing subscription expires or is cancelled, your account reverts to the Developer (Free) tier. Free tier limits projects to 1 active slot. HookBunker deactivates projects beyond this cap at its sole discretion, and is not liable for any missed webhooks or transactions on suspended projects. You can toggle which project is active in the console."
          />
          <FaqItem 
            question="Is my transaction payload data secure?" 
            answer="Yes. All incoming payloads are stored in encrypted PostgreSQL tables hosted on Supabase, with strict user tenant isolation. Furthermore, Team and Business plans support HTTP Signature verification, allowing your destination server to confirm that incoming requests originated strictly from HookBunker."
          />
        </div>
      </section>
    </BunkerLayout>
  );
}
