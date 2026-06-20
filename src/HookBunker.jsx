import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  Shield, 
  Terminal, 
  Database, 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Copy, 
  ExternalLink, 
  BookOpen, 
  Lock, 
  ArrowLeft, 
  Cpu, 
  Zap, 
  Play, 
  DollarSign, 
  Settings,
  ChevronRight,
  LogOut,
  User,
  Activity
} from 'lucide-react';
import axios from 'axios';

// API base url (communicates with our Render backend)
const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

// ─── STYLING CONSTANTS (Sleek Dark Theme) ──────────────────────────────────────
const theme = {
  bg: '#090d16',
  cardBg: 'rgba(17, 24, 39, 0.7)',
  border: 'rgba(255, 255, 255, 0.08)',
  text: '#f3f4f6',
  textMuted: '#9ca3af',
  primary: '#10b981', // Emerald green
  primaryGlow: 'rgba(16, 185, 129, 0.15)',
  secondary: '#3b82f6', // Bright blue
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
};

// Common Layout Wrapper for HookBunker
function BunkerLayout({ children, onNavigate }) {
  useEffect(() => {
    const hash = window.location.hash;
    let title = "HookBunker — Secure Webhook Proxy & Fail-Safe Delivery Gateway";
    let description = "HookBunker is a resilient payment webhook proxy and transaction logger for Safaricom M-Pesa (Daraja), Paystack, and Payhero. Prevent payment timeouts, monitor callbacks, and queue automated retries.";

    if (hash.includes('/docs')) {
      title = "Integration Guides & Documentation — HookBunker";
      description = "Integration guides for Safaricom M-Pesa API, Paystack webhooks, and Payhero callbacks. Setup proxy tunnels and secure signature verification.";
    } else if (hash.includes('/dashboard')) {
      title = "Developer Console Workspace — HookBunker";
      description = "Manage your webhook proxy channels, monitor transaction logs, inspect API delivery payloads, and force manual redelivery attempts.";
    } else if (hash.includes('/terms')) {
      title = "Terms of Service & Liability Indemnification — HookBunker";
      description = "Legal terms, usage guidelines, and limitation of liability agreement for the HookBunker proxy service and Duncan Makoyo.";
    } else if (hash.includes('/privacy')) {
      title = "Privacy Policy & Payload Security — HookBunker";
      description = "Privacy agreement, webhook payload processing data encryption, database tenant isolation, and logs retention policies.";
    }

    // Set page title
    document.title = title;

    // Set page description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    } else {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      metaDesc.setAttribute('content', description);
      document.head.appendChild(metaDesc);
    }

    // Inject FAQ Schema JSON-LD if on main landing page
    const existingSchema = document.getElementById('hookbunker-faq-schema');
    if (existingSchema) existingSchema.remove();

    if (hash === '#/hookbunker' || hash === '' || hash === '#/') {
      const schemaScript = document.createElement('script');
      schemaScript.id = 'hookbunker-faq-schema';
      schemaScript.type = 'application/ld+json';
      schemaScript.text = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How does HookBunker protect against payment callback timeouts?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Many payment callback APIs require responses within a strict 3-second window. HookBunker intercepts incoming HTTP requests, immediately returns a 200 OK within 20ms, and processes forwarding in the background so your server never misses a payment."
            }
          },
          {
            "@type": "Question",
            "name": "What happens if a webhook delivery fails?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "HookBunker queues failed deliveries for automatic retries based on your plan tier intervals (1, 5, or 15 minutes). Developers can also inspect details and manually force a redelivery."
            }
          },
          {
            "@type": "Question",
            "name": "Are my database logs and payloads secure?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. All webhooks and transaction payloads are stored in secure Supabase PostgreSQL databases with strict tenant isolation, and are encrypted in transit."
            }
          }
        ]
      });
      document.head.appendChild(schemaScript);
    }

    return () => {
      // Clean up FAQ schema if navigating away
      const schema = document.getElementById('hookbunker-faq-schema');
      if (schema) schema.remove();
    };
  }, [window.location.hash]);

  return (
    <div style={{
      background: theme.bg,
      color: theme.text,
      minHeight: '100vh',
      fontFamily: 'Inter, system-ui, sans-serif',
      paddingBottom: '4rem'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(9, 13, 22, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${theme.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div 
            onClick={() => window.location.hash = '#/hookbunker'}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <Shield size={24} color={theme.primary} style={{ filter: `drop-shadow(0 0 8px ${theme.primary})` }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
              Hook<span style={{ color: theme.primary }}>Bunker</span>
            </span>
          </div>
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => window.location.hash = '#/hookbunker/docs'}
              style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <BookOpen size={16} /> Docs
            </button>
            <button 
              onClick={() => window.location.hash = '#/hookbunker/dashboard'}
              style={{ background: 'none', border: 'none', color: theme.text, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Activity size={16} color={theme.primary} /> Dashboard
            </button>
            <button 
              onClick={() => window.location.hash = '#/'}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${theme.border}`,
                color: theme.textMuted,
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              ← CV Builder
            </button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: '6rem',
        borderTop: `1px solid ${theme.border}`,
        padding: '3rem 1.5rem 1rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
            <span 
              onClick={() => window.location.hash = '#/hookbunker/terms'}
              style={{ color: theme.textMuted, cursor: 'pointer' }}
            >
              Terms of Service
            </span>
            <span 
              onClick={() => window.location.hash = '#/hookbunker/privacy'}
              style={{ color: theme.textMuted, cursor: 'pointer' }}
            >
              Privacy Policy
            </span>
            <span 
              onClick={() => window.location.hash = '#/'}
              style={{ color: theme.textMuted, cursor: 'pointer' }}
            >
              Resume ATS Tool
            </span>
          </div>
          <p style={{ color: 'rgba(156, 163, 175, 0.5)', fontSize: '0.8rem' }}>
            &copy; {new Date().getFullYear()} HookBunker by Duncan Makoyo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ question, answer }) {
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

// ─── LANDING PAGE COMPONENT ────────────────────────────────────────────────────
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
                color: '#090d16',
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
          {/* The Nightmare Column */}
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

          {/* The Solution Column */}
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
                  color: '#090d16',
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
                  color: p.glow ? '#090d16' : theme.text,
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

// ─── DOCUMENTATION COMPONENT ──────────────────────────────────────────────────
export function HookBunkerDocs({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('mpesa');

  return (
    <BunkerLayout onNavigate={onNavigate}>
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
        {/* Sidebar Nav */}
        <div style={{ width: '100%', maxWidth: '240px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
            Integration Guides
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={() => setActiveTab('mpesa')}
              style={{
                textAlign: 'left',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: activeTab === 'mpesa' ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: 'none',
                color: activeTab === 'mpesa' ? theme.primary : theme.textMuted,
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              Safaricom M-Pesa <ChevronRight size={14} />
            </button>
            <button 
              onClick={() => setActiveTab('paystack')}
              style={{
                textAlign: 'left',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: activeTab === 'paystack' ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: 'none',
                color: activeTab === 'paystack' ? theme.primary : theme.textMuted,
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              Paystack <ChevronRight size={14} />
            </button>
            <button 
              onClick={() => setActiveTab('payhero')}
              style={{
                textAlign: 'left',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: activeTab === 'payhero' ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: 'none',
                color: activeTab === 'payhero' ? theme.primary : theme.textMuted,
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              Payhero <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: '300px', background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '2.5rem', borderRadius: '16px' }}>
          {activeTab === 'mpesa' && (
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>Integrating Safaricom M-Pesa (Daraja)</h2>
              <p style={{ color: theme.textMuted, lineHeight: 1.6, marginBottom: '2rem' }}>
                Avoid Safaricom's strict 3-second timeouts by proxying callbacks through HookBunker.
              </p>
              
              <h4 style={{ color: '#fff', marginBottom: '0.5rem' }}>Step 1: Set Callback URL</h4>
              <p style={{ color: theme.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Copy your Project Proxy URL from the HookBunker Dashboard and paste it into your Daraja Developer Portal under the Callback URL setting.
              </p>

              <h4 style={{ color: '#fff', marginBottom: '0.5rem' }}>Step 2: Payloads Handled Automatically</h4>
              <p style={{ color: theme.textMuted, fontSize: '0.9rem', marginBottom: '1rem' }}>
                Your destination server will receive the exact raw JSON object dispatched by Safaricom:
              </p>
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '1.25rem',
                borderRadius: '8px',
                overflowX: 'auto',
                fontFamily: 'Courier, monospace',
                fontSize: '0.85rem',
                border: `1px solid ${theme.border}`,
                color: '#34d399'
              }}>
{`{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29112-321124-1",
      "CheckoutRequestID": "ws_CO_20062026...",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 3500.00 },
          { "Name": "MpesaReceiptNumber", "Value": "QBR81829AC" },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}`}
              </pre>
            </div>
          )}

          {activeTab === 'paystack' && (
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>Integrating Paystack</h2>
              <p style={{ color: theme.textMuted, lineHeight: 1.6, marginBottom: '2rem' }}>
                Protect your user activation pipelines by safeguarding Paystack payments against deployment cycles.
              </p>
              
              <h4 style={{ color: '#fff', marginBottom: '0.5rem' }}>Step 1: Configure Paystack Webhook</h4>
              <p style={{ color: theme.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Navigate to your <b>Paystack Dashboard Settings &rarr; API Keys &amp; Webhooks</b> and paste your HookBunker URL as the Webhook URL.
              </p>

              <h4 style={{ color: '#fff', marginBottom: '0.5rem' }}>Webhook Forwarding Payload</h4>
              <p style={{ color: theme.textMuted, fontSize: '0.9rem', marginBottom: '1rem' }}>
                We forward the verification headers and exact JSON structure so your code runs unchanged:
              </p>
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '1.25rem',
                borderRadius: '8px',
                overflowX: 'auto',
                fontFamily: 'Courier, monospace',
                fontSize: '0.85rem',
                border: `1px solid ${theme.border}`,
                color: '#38bdf8'
              }}>
{`{
  "event": "charge.success",
  "data": {
    "id": 3020192,
    "domain": "test",
    "status": "success",
    "reference": "ref_90182743",
    "amount": 250000,
    "gateway_response": "Successful",
    "customer": {
      "email": "developer@duncanmakoyo.com"
    }
  }
}`}
              </pre>
            </div>
          )}

          {activeTab === 'payhero' && (
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>Integrating Payhero</h2>
              <p style={{ color: theme.textMuted, lineHeight: 1.6, marginBottom: '2rem' }}>
                Secure Payhero callback delivery logs and trigger automatic retry notifications.
              </p>
              
              <h4 style={{ color: '#fff', marginBottom: '0.5rem' }}>Integration Step</h4>
              <p style={{ color: theme.textMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Paste the HookBunker Ingestion URL into the callback settings on your Payhero dashboard.
              </p>
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '1.25rem',
                borderRadius: '8px',
                overflowX: 'auto',
                fontFamily: 'Courier, monospace',
                fontSize: '0.85rem',
                border: `1px solid ${theme.border}`,
                color: '#a78bfa'
              }}>
{`{
  "status": "Success",
  "transaction_id": "PH-TX-10294",
  "amount": 500,
  "phone": "254712345678",
  "reference": "order_ref_103094"
}`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </BunkerLayout>
  );
}

// ─── TERMS OF SERVICE COMPONENT ────────────────────────────────────────────────
export function HookBunkerTerms({ onNavigate }) {
  return (
    <BunkerLayout onNavigate={onNavigate}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '3rem', borderRadius: '16px', lineHeight: 1.7 }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1.5rem', borderBottom: `1px solid ${theme.border}`, paddingBottom: '1rem', color: '#fff' }}>
          Terms of Service
        </h1>
        <p style={{ color: theme.textMuted, fontSize: '0.85rem' }}>Last updated: June 21, 2026</p>
        
        <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', color: '#fff' }}>1. Acceptance of Terms</h3>
        <p style={{ color: theme.textMuted, fontSize: '0.9rem' }}>
          By registering an account or using HookBunker, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree, you are prohibited from using the service.
        </p>

        <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', color: '#fff' }}>2. Description of Proxy Service</h3>
        <p style={{ color: theme.textMuted, fontSize: '0.9rem' }}>
          HookBunker provides a resilient payment webhook proxy and delivery logging interface. HookBunker intercepts and redirects transactional payloads (such as Safaricom M-Pesa, Paystack, and Payhero callbacks) to developer targets. HookBunker is not a payment gateway, does not handle, hold, or process actual client funds, and is not responsible for financial reconciliations.
        </p>

        <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', color: '#fff', textTransform: 'uppercase' }}>3. Limitation of Liability &amp; Full Indemnification</h3>
        <p style={{ color: theme.textMuted, fontSize: '0.9rem', fontWeight: 600 }}>
          YOU EXPRESSLY UNDERSTAND AND AGREE THAT DUNCAN MAKOYO, HOOKBUNKER, AND THEIR REPRESENTATIVES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES. THIS INCLUDES, BUT IS NOT LIMITED TO, LOSS OF PROFITS, REVENUE, GOODWILL, CUSTOMER TRANSACTIONS, BUSINESS INTERRUPTION, DATA CORRUPTION, OR SYSTEM OUTAGES ARISING OUT OF WEBHOOK DELIVERY FAILURES, CALLBACK DELAYS, RETRY QUEUE LATENCIES, DOWNGRADES, SERVICE SUSPENSIONS, OR SECURITY BREACHES.
        </p>
        <p style={{ color: theme.textMuted, fontSize: '0.9rem' }}>
          YOU AGREE TO DEFEND, INDEMNIFY, AND HOLD HARMLESS DUNCAN MAKOYO FROM AND AGAINST ANY AND ALL CLAIMS, DAMAGES, COSTS, LOSSES, LIABILITIES, AND EXPENSES (INCLUDING LEGAL FEES) ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE GATEWAY PROXY OR ANY PAYMENTS RECEIVED VIA SAFARICOM M-PESA, PAYSTACK, OR PAYHERO. HookBunker is provided strictly on an "AS IS" and "AS AVAILABLE" basis without warranty of any kind.
        </p>

        <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', color: '#fff' }}>4. Billing and Plan Adjustments</h3>
        <p style={{ color: theme.textMuted, fontSize: '0.9rem' }}>
          Failure to process subscription renewals on Paystack will trigger automatic account downgrades to the Free tier. Upon downgrade, active project slots are capped at 1. HookBunker deactivates projects beyond this cap at its sole discretion, and is not liable for any missed webhooks or transactions on suspended projects.
        </p>
      </div>
    </BunkerLayout>
  );
}

// ─── PRIVACY POLICY COMPONENT ──────────────────────────────────────────────────
export function HookBunkerPrivacy({ onNavigate }) {
  return (
    <BunkerLayout onNavigate={onNavigate}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '3rem', borderRadius: '16px', lineHeight: 1.7 }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '1.5rem', borderBottom: `1px solid ${theme.border}`, paddingBottom: '1rem', color: '#fff' }}>
          Privacy Policy
        </h1>
        <p style={{ color: theme.textMuted, fontSize: '0.85rem' }}>Last updated: June 21, 2026</p>
        
        <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', color: '#fff' }}>1. Payload Data Collection</h3>
        <p style={{ color: theme.textMuted, fontSize: '0.9rem' }}>
          We temporarily collect and store transactional payload information sent via Safaricom M-Pesa, Paystack, and Payhero on your behalf. This parsed data contains payment references, amounts, customer emails, and phone numbers to generate your developer logs.
        </p>

        <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', color: '#fff' }}>2. Data Isolation and Storage Security</h3>
        <p style={{ color: theme.textMuted, fontSize: '0.9rem' }}>
          All callback transaction records are stored in encrypted Supabase PostgreSQL databases with strict row-level security (RLS) policies. Your data is strictly isolated per developer tenant. API keys are hashed and kept confidential.
        </p>

        <h3 style={{ marginTop: '2rem', marginBottom: '0.5rem', color: '#fff' }}>3. Data Pruning and Retention</h3>
        <p style={{ color: theme.textMuted, fontSize: '0.9rem' }}>
          Webhook logs and raw JSON payloads are kept strictly according to your active tier: 3 days for Free, 14 days for Team, and 30 days for Business. Pruning runs automatically to purge expired transactional records from our active tables.
        </p>
      </div>
    </BunkerLayout>
  );
}

// ─── DASHBOARD COMPONENT (THE MAIN WORKSPACE) ──────────────────────────────────
export function HookBunkerDashboard({ onNavigate }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authError, setAuthError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // Dashboard data states
  const [projects, setProjects] = useState([]);
  const [selectedProj, setSelectedProj] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  
  // Project creation form
  const [projName, setProjName] = useState('');
  const [projTargetUrl, setProjTargetUrl] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionError, setActionError] = useState('');

  // Feedback states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState('feature_request'); // 'feature_request' | 'feedback'
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // NPS rating prompt states
  const [showNpsPrompt, setShowNpsPrompt] = useState(false);
  const [npsRating, setNpsRating] = useState(0);
  const [npsComment, setNpsComment] = useState('');
  const [npsStep, setNpsStep] = useState(1); // 1: stars, 2: comment, 3: thank you

  // Profile & subscription states
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [billingCurrency, setBillingCurrency] = useState('KES');
  
  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch projects and profile once authenticated
  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchProfile();
    }
  }, [user]);

  // Fetch logs when active project changes
  useEffect(() => {
    if (selectedProj) {
      fetchLogs(selectedProj.id);
    }
  }, [selectedProj]);

  // Routine NPS trigger: Shows rating card routinely if projects exist and user hasn't rated in last 30 days
  useEffect(() => {
    if (user && projects.length > 0) {
      const lastPrompt = localStorage.getItem('hookbunker_last_rating_prompt');
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
      if (!lastPrompt || (Date.now() - parseInt(lastPrompt, 10)) > thirtyDays) {
        const timer = setTimeout(() => {
          setShowNpsPrompt(true);
          setNpsStep(1);
          setNpsRating(0);
          setNpsComment('');
        }, 5000); // 5-second delay after dashboard load
        return () => clearTimeout(timer);
      }
    }
  }, [user, projects]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    setActionError('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const res = await axios.get(`${API_URL}/api/hookbunker/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data);
      if (res.data.length > 0 && !selectedProj) {
        setSelectedProj(res.data[0]);
      }
    } catch (err) {
      setActionError('Failed to fetch projects.');
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchLogs = async (projId) => {
    setLogsLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await axios.get(`${API_URL}/api/hookbunker/projects/${projId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').single();
      if (error) throw error;
      if (data) {
        setProfile(data);
      }
    } catch (e) {
      console.error('Error fetching subscription profile:', e.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadPaystackScript = () => {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) { resolve(window.PaystackPop); return; }
      if (document.getElementById('paystack-inline-script')) {
        const check = setInterval(() => {
          if (window.PaystackPop) {
            clearInterval(check);
            resolve(window.PaystackPop);
          }
        }, 100);
        return;
      }
      const script = document.createElement('script');
      script.id = 'paystack-inline-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => resolve(window.PaystackPop);
      script.onerror = () => reject(new Error('Failed to load Paystack checkout script.'));
      document.body.appendChild(script);
    });
  };

  const handleUpgradeTier = async (tierName, currency = 'KES') => {
    let amount = 0;
    if (tierName === 'team') {
      amount = currency === 'KES' ? 3400 : 26;
    } else if (tierName === 'business') {
      amount = currency === 'KES' ? 11500 : 89;
    } else {
      return;
    }

    const amountInSubunits = amount * 100; // kobo for KES, cents for USD

    try {
      setActionError('');
      const PaystackPop = await loadPaystackScript();

      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: amountInSubunits,
        currency: currency,
        metadata: {
          type: 'hookbunker_subscription',
          tier: tierName,
          userId: user.id
        },
        callback: async function (paystackResponse) {
          try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            const res = await axios.post(`${API_URL}/api/hookbunker/verify-subscription`, {
              reference: paystackResponse.reference
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.success) {
              setProfile(res.data.profile);
              alert(`Success! Your HookBunker account has been upgraded to the ${tierName.toUpperCase()} tier.`);
            }
          } catch (verifyErr) {
            alert(verifyErr.response?.data?.error || 'Verification failed. Please contact support.');
          }
        },
        onClose: function () {
          console.log('Subscription checkout window closed.');
        }
      });

      handler.openIframe();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!email || !password) {
      setAuthError('Please fill in all fields.');
      return;
    }

    // RFC-compliant email address format verification
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError('Please enter a valid, RFC-compliant email address.');
      return;
    }

    if (authMode === 'signup') {
      // Strong password validation check (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character)
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!strongPasswordRegex.test(password)) {
        setAuthError('Password must be at least 8 characters long, and contain at least one uppercase letter, one lowercase letter, one numeric digit, and one special character (e.g. @$!%*?&).');
        return;
      }

      if (!acceptTerms) {
        setAuthError('You must read and accept the Terms of Service and Privacy Policy to register.');
        return;
      }
    }
    
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthError('Signup successful! Check your email inbox to verify your account and complete registration.');
        setAuthMode('login');
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setActionError('');
    if (!projName || !projTargetUrl) {
      setActionError('Project Name and Target URL are required.');
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await axios.post(`${API_URL}/api/hookbunker/projects`, {
        name: projName,
        target_url: projTargetUrl,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProjects([res.data, ...projects]);
      setSelectedProj(res.data);
      setProjName('');
      setProjTargetUrl('');
      setShowCreateForm(false);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to create project.');
    }
  };

  const handleDeleteProject = async (projId) => {
    if (!window.confirm('Are you absolutely sure you want to delete this project? All associated webhook logs and delivery retry queues will be permanently destroyed.')) {
      return;
    }

    setActionError('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      await axios.delete(`${API_URL}/api/hookbunker/projects/${projId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedProjs = projects.filter(p => p.id !== projId);
      setProjects(updatedProjs);
      if (updatedProjs.length > 0) {
        setSelectedProj(updatedProjs[0]);
      } else {
        setSelectedProj(null);
        setLogs([]);
      }
      setSelectedLog(null);
    } catch (err) {
      setActionError('Failed to delete project.');
    }
  };

  const handleToggleProjectActive = async (projId) => {
    setActionError('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await axios.patch(`${API_URL}/api/hookbunker/projects/${projId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updatedProjs = projects.map(p => p.id === projId ? res.data : p);
      setProjects(updatedProjs);
      setSelectedProj(res.data);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to toggle project status.');
    }
  };

  const handleManualRetry = async (webhookId) => {
    setActionError('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      await axios.post(`${API_URL}/api/hookbunker/webhooks/${webhookId}/retry`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Webhook redelivery trigger queued! Refresh logs in a few seconds to see the new attempt.');
      if (selectedProj) {
        fetchLogs(selectedProj.id);
      }
      setSelectedLog(null);
    } catch (err) {
      setActionError('Failed to trigger retry.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProjects([]);
    setSelectedProj(null);
    setLogs([]);
    setSelectedLog(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!feedbackContent) return;
    setFeedbackSubmitting(true);
    setFeedbackSuccess(false);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      await axios.post(`${API_URL}/api/hookbunker/feedback`, {
        type: feedbackType,
        title: feedbackType === 'feature_request' ? feedbackTitle : null,
        content: feedbackContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedbackSuccess(true);
      setFeedbackTitle('');
      setFeedbackContent('');
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSuccess(false);
      }, 2000);
    } catch (err) {
      alert('Failed to submit feedback.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleNpsSubmit = async () => {
    if (npsStep === 1 && npsRating === 0) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      await axios.post(`${API_URL}/api/hookbunker/feedback`, {
        type: 'routine_rating',
        rating: npsRating,
        content: npsComment || 'No comment provided.'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNpsStep(3);
      localStorage.setItem('hookbunker_last_rating_prompt', Date.now().toString());
      setTimeout(() => {
        setShowNpsPrompt(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      setShowNpsPrompt(false);
    }
  };

  const handleNpsDismiss = () => {
    setShowNpsPrompt(false);
    // Postpone prompt for 7 days
    localStorage.setItem('hookbunker_last_rating_prompt', (Date.now() - (23 * 24 * 60 * 60 * 1000)).toString());
  };

  // Render Loading
  if (authLoading) {
    return (
      <BunkerLayout onNavigate={onNavigate}>
        <div style={{ textAlign: 'center', padding: '6rem' }}>
          <RefreshCw size={36} color={theme.primary} className="spin-animation" />
          <p style={{ color: theme.textMuted, marginTop: '1rem' }}>Checking authorization credentials...</p>
        </div>
      </BunkerLayout>
    );
  }

  // Render Login Form if Unauthenticated
  if (!user) {
    return (
      <BunkerLayout onNavigate={onNavigate}>
        <div style={{
          maxWidth: '420px',
          margin: '4rem auto 0',
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: '16px',
          padding: '2.5rem',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Shield size={32} color={theme.primary} style={{ marginBottom: '0.75rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {authMode === 'login' ? 'Welcome back to HookBunker' : 'Create your HookBunker Account'}
            </h2>
            <p style={{ color: theme.textMuted, fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {authMode === 'login' ? 'Login to access your project gateways' : 'Sign up to protect your webhook payloads'}
            </p>
          </div>

          {authError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: theme.danger, padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="developer@duncanmakoyo.com"
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#0e1422', color: '#fff', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#0e1422', color: '#fff', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>
            
            {authMode === 'signup' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="accept-terms-checkbox"
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  required
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <label htmlFor="accept-terms-checkbox" style={{ color: theme.textMuted, cursor: 'pointer', lineHeight: 1.4 }}>
                  I accept the{' '}
                  <span 
                    onClick={(e) => { e.preventDefault(); window.location.hash = '#/hookbunker/terms'; }} 
                    style={{ color: theme.primary, textDecoration: 'underline', fontWeight: 600 }}
                  >
                    Terms of Service
                  </span>{' '}
                  and{' '}
                  <span 
                    onClick={(e) => { e.preventDefault(); window.location.hash = '#/hookbunker/privacy'; }} 
                    style={{ color: theme.primary, textDecoration: 'underline', fontWeight: 600 }}
                  >
                    Privacy Policy
                  </span>
                  .
                </label>
              </div>
            )}

            <button 
              type="submit"
              style={{ background: theme.primary, color: '#090d16', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', marginTop: '0.5rem' }}
            >
              {authMode === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: theme.textMuted }}>
              {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              style={{ background: 'none', border: 'none', color: theme.primary, fontWeight: 700, cursor: 'pointer' }}
            >
              {authMode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </div>
        </div>
      </BunkerLayout>
    );
  }

  // Render Logged-in Dashboard
  return (
    <BunkerLayout onNavigate={onNavigate}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', borderBottom: `1px solid ${theme.border}`, paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: theme.primary, fontWeight: 700, textTransform: 'uppercase' }}>Console Workspace</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Welcome, {user.email}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={() => { setShowFeedbackModal(true); setFeedbackType('feature_request'); }}
            style={{ background: 'rgba(16, 185, 129, 0.1)', border: `1px solid ${theme.primary}40`, color: theme.primary, padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Request Feature
          </button>
          <button 
            onClick={() => { setShowFeedbackModal(true); setFeedbackType('feedback'); }}
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Feedback
          </button>
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.15)', color: theme.danger, padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </div>

      {actionError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: theme.danger, padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {actionError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* LEFT COLUMN: Projects list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Apps / Projects
              </h3>
              <button 
                onClick={() => setShowCreateForm(!showCreateForm)}
                style={{ background: theme.primaryGlow, border: `1px solid ${theme.primary}50`, color: theme.primary, width: '24px', height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Project Limit Progress Bar (LinkedIn style upsell) */}
            {!profileLoading && (
              <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: theme.textMuted, marginBottom: '6px' }}>
                  <span>Project Slots: {projects.length} / {profile?.subscription_tier === 'team' ? '5' : profile?.subscription_tier === 'business' ? '∞' : '1'}</span>
                  {profile?.subscription_tier !== 'business' && (
                    <button 
                      onClick={() => handleUpgradeTier(profile?.subscription_tier === 'team' ? 'business' : 'team', billingCurrency)}
                      style={{ background: 'none', border: 'none', color: theme.primary, padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                    >
                      Upgrade &rarr;
                    </button>
                  )}
                </div>
                {profile?.subscription_tier !== 'business' && (
                  <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, (projects.length / (profile?.subscription_tier === 'team' ? 5 : 1)) * 100)}%`, 
                      height: '100%', 
                      background: projects.length >= (profile?.subscription_tier === 'team' ? 5 : 1) ? theme.danger : theme.primary,
                      borderRadius: '999px'
                    }} />
                  </div>
                )}
              </div>
            )}

            {/* Create Project Panel */}
            {showCreateForm && (
              <form onSubmit={handleCreateProject} style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${theme.border}`, padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: theme.textMuted, marginBottom: '2px' }}>Project Name</label>
                  <input 
                    type="text" 
                    value={projName}
                    onChange={e => setProjName(e.target.value)}
                    placeholder="E.g. Paystack Proxy"
                    required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: `1px solid ${theme.border}`, background: '#0e1422', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: theme.textMuted, marginBottom: '2px' }}>Target Destination URL</label>
                  <input 
                    type="url" 
                    value={projTargetUrl}
                    onChange={e => setProjTargetUrl(e.target.value)}
                    placeholder="https://api.myapp.com/pay-webhook"
                    required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: `1px solid ${theme.border}`, background: '#0e1422', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button type="submit" style={{ flex: 1, background: theme.primary, color: '#090d16', border: 'none', padding: '0.4rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>Create</button>
                  <button type="button" onClick={() => setShowCreateForm(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.4rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            )}

            {projectsLoading ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: theme.textMuted }}>Loading apps...</div>
            ) : projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: theme.textMuted, fontSize: '0.85rem' }}>
                No active projects. Click "+" to create one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {projects.map((p) => (
                  <button 
                    key={p.id}
                    onClick={() => { setSelectedProj(p); setSelectedLog(null); }}
                    style={{
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      background: selectedProj?.id === p.id ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      border: `1px solid ${selectedProj?.id === p.id ? 'rgba(16, 185, 129, 0.25)' : 'transparent'}`,
                      color: p.active ? (selectedProj?.id === p.id ? '#fff' : theme.textMuted) : '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{p.name}</span>
                      {!p.active && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.15)', color: theme.danger, padding: '2px 6px', borderRadius: '4px', border: `1px solid rgba(239, 68, 68, 0.3)` }}>
                          Suspended
                        </span>
                      )}
                    </div>
                    <ChevronRight size={14} style={{ opacity: selectedProj?.id === p.id ? 1 : 0.3 }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* LinkedIn-style Premium Promotion Card */}
          {!profileLoading && profile?.subscription_tier !== 'business' && (
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)', 
              border: `1px solid ${theme.primary}30`, 
              padding: '1.25rem', 
              borderRadius: '12px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div>
                <span style={{ fontSize: '0.65rem', background: theme.primary, color: '#090d16', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Premium Feature
                </span>
                <h4 style={{ margin: '6px 0 2px', fontSize: '0.85rem', fontWeight: 800 }}>Unlock Webhook Speed &amp; Capacity</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: theme.textMuted, lineHeight: 1.4 }}>
                  Premium accounts receive <b>1-minute automatic retries</b> (currently 15 minutes) and up to <b>30 days</b> log retention.
                </p>
              </div>
              <button 
                onClick={() => handleUpgradeTier(profile?.subscription_tier === 'team' ? 'business' : 'team', billingCurrency)}
                style={{ 
                  background: `linear-gradient(90deg, ${theme.primary} 0%, ${theme.secondary} 100%)`, 
                  color: '#090d16', 
                  border: 'none', 
                  padding: '0.5rem', 
                  borderRadius: '6px', 
                  fontWeight: 800, 
                  cursor: 'pointer', 
                  fontSize: '0.75rem', 
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                  transition: 'opacity 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = 0.9}
                onMouseOut={(e) => e.currentTarget.style.opacity = 1}
              >
                Try premium features
              </button>
            </div>
          )}

          {selectedProj && (
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '1.5rem', borderRadius: '12px', wordBreak: 'break-all' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>App Details</h3>
                <div style={{ display: 'flex', gap: '0.50rem', alignItems: 'center' }}>
                  <button 
                    onClick={() => handleToggleProjectActive(selectedProj.id)}
                    style={{
                      background: selectedProj.active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      border: `1px solid ${selectedProj.active ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                      color: selectedProj.active ? theme.danger : theme.primary,
                      cursor: 'pointer',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                    title={selectedProj.active ? 'Suspend Webhook Ingestion' : 'Resume Webhook Ingestion'}
                  >
                    {selectedProj.active ? 'Suspend' : 'Activate'}
                  </button>
                  <button 
                    onClick={() => handleDeleteProject(selectedProj.id)}
                    style={{ background: 'none', border: 'none', color: theme.danger, cursor: 'pointer', opacity: 0.7 }}
                    title="Delete Project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ color: theme.textMuted, display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>API KEY</span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                    <code style={{ background: '#0e1422', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', color: theme.primary }}>{selectedProj.api_key.substring(0, 12)}...</code>
                    <button onClick={() => copyToClipboard(selectedProj.api_key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted }}><Copy size={12} /></button>
                  </div>
                </div>
                <div>
                  <span style={{ color: theme.textMuted, display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Ingestion URL</span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                    <code style={{ background: '#0e1422', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', color: theme.secondary }}>{`${window.location.origin}/api/hookbunker/webhooks/${selectedProj.api_key}`}</code>
                    <button onClick={() => copyToClipboard(`${window.location.origin}/api/hookbunker/webhooks/${selectedProj.api_key}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted }}><Copy size={12} /></button>
                  </div>
                </div>
                <div>
                  <span style={{ color: theme.textMuted, display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Target Destination</span>
                  <span style={{ display: 'block', marginTop: '4px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#fff' }}>{selectedProj.target_url}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Billing &amp; Subscription
              </h3>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                <button 
                  onClick={() => setBillingCurrency('KES')}
                  style={{
                    background: billingCurrency === 'KES' ? theme.primary : 'none',
                    color: billingCurrency === 'KES' ? '#090d16' : theme.textMuted,
                    border: 'none',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  KES
                </button>
                <button 
                  onClick={() => setBillingCurrency('USD')}
                  style={{
                    background: billingCurrency === 'USD' ? theme.primary : 'none',
                    color: billingCurrency === 'USD' ? '#090d16' : theme.textMuted,
                    border: 'none',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  USD
                </button>
              </div>
            </div>

            {profileLoading ? (
              <div style={{ fontSize: '0.85rem', color: theme.textMuted }}>Loading billing details...</div>
            ) : (
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <span style={{ color: theme.textMuted, display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Current Tier</span>
                  <span style={{ textTransform: 'uppercase', fontWeight: 800, color: theme.primary, fontSize: '0.95rem', display: 'block', marginTop: '2px' }}>
                    {profile?.subscription_tier || 'FREE'}
                  </span>
                </div>
                
                <div style={{ color: theme.textMuted, fontSize: '0.8rem', borderTop: `1px solid ${theme.border}`, paddingTop: '0.5rem' }}>
                  <div>Project Limit: <b>{profile?.subscription_tier === 'team' ? '5 Projects' : profile?.subscription_tier === 'business' ? 'Unlimited' : '1 Project'}</b></div>
                  <div>Webhooks Limit: <b>{profile?.subscription_tier === 'team' ? '25k / mo' : profile?.subscription_tier === 'business' ? '150k / mo' : '500 / mo'}</b></div>
                </div>

                {(!profile || profile.subscription_tier === 'free') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => handleUpgradeTier('team', billingCurrency)}
                      style={{ background: theme.secondary, color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Upgrade to Team ({billingCurrency === 'KES' ? 'KES 3,400' : '$26'}/mo)
                    </button>
                    <button 
                      onClick={() => handleUpgradeTier('business', billingCurrency)}
                      style={{ background: 'none', border: `1px solid ${theme.primary}`, color: theme.primary, padding: '0.5rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Upgrade to Business ({billingCurrency === 'KES' ? 'KES 11,500' : '$89'}/mo)
                    </button>
                  </div>
                )}

                {profile?.subscription_tier === 'team' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button 
                      onClick={() => handleUpgradeTier('business', billingCurrency)}
                      style={{ background: theme.primary, color: '#090d16', border: 'none', padding: '0.5rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      Upgrade to Business ({billingCurrency === 'KES' ? 'KES 11,500' : '$89'}/mo)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Webhook logs and inspections */}
        <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '2rem', borderRadius: '16px', minHeight: '500px' }}>
          {!selectedProj ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: theme.textMuted }}>
              <Shield size={48} color={theme.border} style={{ marginBottom: '1rem' }} />
              <p>Create or select a project from the sidebar to inspect logs.</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: `1px solid ${theme.border}`, paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Webhook Callback History ({selectedProj.name})</h2>
                <button 
                  onClick={() => fetchLogs(selectedProj.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  <RefreshCw size={12} /> Sync Logs
                </button>
              </div>

              {logsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: theme.textMuted }}>
                  <RefreshCw size={24} className="spin-animation" style={{ marginRight: '8px' }} /> Fetching transaction payloads...
                </div>
              ) : logs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: theme.textMuted }}>
                  <Terminal size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p>No webhooks captured yet for this route.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Point your gateway callbacks to your ingestion URL to start monitoring.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Upgrade Alert Banner (LinkedIn style) */}
                  {profile?.subscription_tier !== 'business' && (
                    <div style={{ 
                      background: 'rgba(59, 130, 246, 0.05)', 
                      border: '1px solid rgba(59, 130, 246, 0.15)', 
                      padding: '0.75rem 1rem', 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#93c5fd' }}>
                        <Terminal size={14} />
                        <span>
                          Free accounts are limited to 3-day log retention. Upgrade to store logs for up to <b>30 days</b>.
                        </span>
                      </div>
                      <button 
                        onClick={() => handleUpgradeTier(profile?.subscription_tier === 'team' ? 'business' : 'team', billingCurrency)}
                        style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', padding: 0 }}
                      >
                        Learn more &rarr;
                      </button>
                    </div>
                  )}

                  {/* Logs list table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${theme.border}`, color: theme.textMuted }}>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Captured</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Gateway</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Method</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Reference</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Customer</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Amount</th>
                          <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Status</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => {
                          const date = new Date(log.created_at).toLocaleString();
                          const isSuccess = log.status === 'success';
                          return (
                            <tr key={log.id} style={{ borderBottom: `1px solid ${theme.border}`, hover: { background: 'rgba(255,255,255,0.02)' } }}>
                              <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: theme.textMuted }}>{date}</td>
                              <td style={{ padding: '0.75rem 0.5rem', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem' }}>
                                <span style={{
                                  background: log.gateway === 'mpesa' ? '#10b98120' : log.gateway === 'paystack' ? '#0ea5e920' : 'rgba(255,255,255,0.05)',
                                  color: log.gateway === 'mpesa' ? '#10b981' : log.gateway === 'paystack' ? '#38bdf8' : '#fff',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  {log.gateway}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem' }}>
                                <span style={{
                                  background: 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${theme.border}`,
                                  color: '#e5e7eb',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  textTransform: 'capitalize'
                                }}>
                                  {log.payment_method ? log.payment_method.replace('_', ' ') : '—'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.transaction_code || '—'}</td>
                              <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ color: log.email ? '#fff' : theme.textMuted }}>{log.email || log.phone || '—'}</span>
                                  {log.email && log.phone && <span style={{ color: theme.textMuted, fontSize: '0.7rem' }}>{log.phone}</span>}
                                </div>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{log.amount ? `${log.gateway === 'mpesa' ? 'KES' : '$'} ${log.amount}` : '—'}</td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  background: isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: isSuccess ? theme.success : theme.danger,
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  textTransform: 'uppercase'
                                }}>
                                  {log.status}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                                <button 
                                  onClick={() => setSelectedLog(log)}
                                  style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`, color: '#fff', padding: '0.25rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Log Detail Slide-over / Modal */}
      {selectedLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end', zIndex: 100 }}>
          <div style={{ width: '100%', maxWidth: '550px', background: '#0b111e', borderLeft: `1px solid ${theme.border}`, padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Webhook Inspection</h2>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ background: '#0e1422', border: `1px solid ${theme.border}`, padding: '1.25rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td style={{ padding: '4px 0', color: theme.textMuted }}>ID:</td><td style={{ fontFamily: 'monospace', color: '#fff' }}>{selectedLog.id}</td></tr>
                  <tr><td style={{ padding: '4px 0', color: theme.textMuted }}>Gateway:</td><td style={{ fontWeight: 700, color: theme.primary, textTransform: 'uppercase' }}>{selectedLog.gateway}</td></tr>
                  {selectedLog.payment_method && <tr><td style={{ padding: '4px 0', color: theme.textMuted }}>Method:</td><td style={{ color: '#fff', textTransform: 'capitalize' }}>{selectedLog.payment_method.replace('_', ' ')}</td></tr>}
                  <tr><td style={{ padding: '4px 0', color: theme.textMuted }}>Reference:</td><td style={{ fontFamily: 'monospace', color: '#fff' }}>{selectedLog.transaction_code || '—'}</td></tr>
                  <tr><td style={{ padding: '4px 0', color: theme.textMuted }}>Captured:</td><td style={{ color: '#fff' }}>{new Date(selectedLog.created_at).toLocaleString()}</td></tr>
                  {selectedLog.email && <tr><td style={{ padding: '4px 0', color: theme.textMuted }}>Email:</td><td style={{ color: '#fff' }}>{selectedLog.email}</td></tr>}
                  {selectedLog.phone && <tr><td style={{ padding: '4px 0', color: theme.textMuted }}>Phone:</td><td style={{ color: '#fff' }}>{selectedLog.phone}</td></tr>}
                  <tr><td style={{ padding: '4px 0', color: theme.textMuted }}>Delivery Status:</td><td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, background: selectedLog.status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: selectedLog.status === 'success' ? theme.success : theme.danger, padding: '2px 6px', borderRadius: '4px' }}>
                      {selectedLog.status}
                    </span>
                  </td></tr>
                </tbody>
              </table>
            </div>

            {/* Delivery attempts logs */}
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Delivery Log Attempts</h3>
              {(!selectedLog.deliveries || selectedLog.deliveries.length === 0) ? (
                <p style={{ color: theme.textMuted, fontSize: '0.85rem', fontStyle: 'italic' }}>No forwarding delivery attempts recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedLog.deliveries.map((del, idx) => {
                    const isSuccess = del.response_status >= 200 && del.response_status < 300;
                    return (
                      <div key={del.id} style={{ border: `1px solid ${theme.border}`, background: '#0e1422', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 700 }}>Attempt #{del.attempt_number || idx + 1}</span>
                          <span style={{ color: isSuccess ? theme.success : theme.danger, fontWeight: 800 }}>
                            HTTP {del.response_status || 'Network Error'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: theme.textMuted }}>
                          <div>Latency: <b style={{ color: '#fff' }}>{del.duration_ms} ms</b></div>
                          {del.error_message && <div style={{ color: theme.danger }}>Error Message: {del.error_message}</div>}
                          {del.response_body && (
                            <div style={{ marginTop: '0.25rem' }}>
                              <span>Response Body Preview:</span>
                              <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px', overflowX: 'auto', marginTop: '2px', fontFamily: 'monospace', fontSize: '0.7rem', color: '#fff' }}>
                                {del.response_body}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Raw JSON Payload */}
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Raw Payload JSON</h3>
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '1rem',
                borderRadius: '8px',
                overflowX: 'auto',
                fontFamily: 'Courier, monospace',
                fontSize: '0.8rem',
                border: `1px solid ${theme.border}`,
                color: '#34d399',
                maxHeight: '200px'
              }}>
                {JSON.stringify(selectedLog.payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback / Feature Request Modal ── */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ width: '100%', maxWidth: '460px', background: '#0b111e', border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {feedbackType === 'feature_request' ? 'Request a Feature' : 'Send Feedback'}
              </h2>
              <button 
                onClick={() => setShowFeedbackModal(false)}
                style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {feedbackSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <CheckCircle size={48} color={theme.primary} style={{ margin: '0 auto 1rem', filter: `drop-shadow(0 0 8px ${theme.primary}40)` }} />
                <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Thank You!</h4>
                <p style={{ color: theme.textMuted, fontSize: '0.9rem', marginTop: '0.25rem' }}>Your feedback has been successfully submitted.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {feedbackType === 'feature_request' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Feature Title</label>
                    <input 
                      type="text" 
                      value={feedbackTitle}
                      onChange={e => setFeedbackTitle(e.target.value)}
                      placeholder="e.g. Discord Webhook Alerts Integration"
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#0e1422', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                    {feedbackType === 'feature_request' ? 'Explain the Feature' : 'Your Feedback / Report'}
                  </label>
                  <textarea 
                    value={feedbackContent}
                    onChange={e => setFeedbackContent(e.target.value)}
                    placeholder={feedbackType === 'feature_request' ? "Describe what this feature would do and how it helps your development workflow..." : "Tell us what you like, what is broken, or how we can improve HookBunker..."}
                    required
                    rows={5}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#0e1422', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowFeedbackModal(false)}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={feedbackSubmitting}
                    style={{ flex: 2, background: theme.primary, color: '#090d16', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {feedbackSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Routine NPS rating Toast Slide-In ── */}
      {showNpsPrompt && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '350px',
          background: '#0b111e',
          border: `1px solid ${theme.primary}50`,
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: `0 10px 30px ${theme.primaryGlow}, 0 20px 60px rgba(0,0,0,0.4)`,
          zIndex: 90,
          animation: 'slideUp 0.3s ease-out'
        }}>
          {npsStep === 1 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Rate HookBunker</h4>
                <button onClick={handleNpsDismiss} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: '1rem', padding: 0 }}>&times;</button>
              </div>
              <p style={{ color: theme.textMuted, fontSize: '0.8rem', lineHeight: 1.4, margin: '0 0 1rem 0' }}>
                How would you rate HookBunker's delivery speed and reliability?
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star}
                    onClick={() => { setNpsRating(star); setNpsStep(2); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', padding: 0, color: star <= npsRating ? theme.warning : '#4b5563' }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          )}

          {npsStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: theme.primary, fontWeight: 700 }}>Rating: {npsRating}/5 Stars</span>
                <button onClick={handleNpsDismiss} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: '1rem' }}>&times;</button>
              </div>
              <textarea 
                value={npsComment}
                onChange={e => setNpsComment(e.target.value)}
                placeholder="What can we improve? (optional)"
                rows={3}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${theme.border}`, background: '#0e1422', color: '#fff', fontSize: '0.8rem', resize: 'none', fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setNpsStep(1)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`, color: '#fff', padding: '0.4rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>Back</button>
                <button onClick={handleNpsSubmit} style={{ flex: 2, background: theme.primary, color: '#090d16', border: 'none', padding: '0.4rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Submit</button>
              </div>
            </div>
          )}

          {npsStep === 3 && (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <CheckCircle size={24} color={theme.primary} style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Feedback Logged!</h4>
              <p style={{ color: theme.textMuted, fontSize: '0.75rem', margin: '4px 0 0 0' }}>Thank you for helping us improve.</p>
            </div>
          )}
          
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(50px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </BunkerLayout>
  );
}
