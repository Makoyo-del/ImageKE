import React, { useEffect } from 'react';
import { Shield, BookOpen, Activity } from 'lucide-react';
import './HookBunkerCommon.css';

// Sleek Midnight Dark Navy Theme
export const theme = {
  bg: '#081236',
  cardBg: 'rgba(13, 18, 54, 0.65)',
  border: 'rgba(220, 229, 255, 0.08)',
  text: '#ffffff',
  textMuted: '#94a3b8',
  primary: '#2b5bff', // Electric Blue
  primaryGlow: 'rgba(43, 91, 255, 0.15)',
  secondary: '#1238E8', // Primary Blue
  danger: '#ef2a2a',
  warning: '#ffd21f',
  success: '#63d11a',
};

// General Layout Wrapper for HookBunker
export function BunkerLayout({ children, onNavigate }) {
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
    }

    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    } else {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      metaDesc.setAttribute('content', description);
      document.head.appendChild(metaDesc);
    }

    // FAQ schema injection
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
      const schema = document.getElementById('hookbunker-faq-schema');
      if (schema) schema.remove();
    };
  }, [window.location.hash]);

  return (
    <div className="hb-wrapper">
      {/* Top Header Navigation */}
      <header style={{
        background: 'rgba(9, 13, 22, 0.85)',
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

      {/* Main Body */}
      <main style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '2.5rem 1.5rem', flex: 1, boxSizing: 'border-box' }}>
        {children}
      </main>

      {/* Main Footer (Reused across website under the same domain) */}
      <footer style={{ padding: '2rem 0', textAlign: 'center', borderTop: `1px solid ${theme.border}`, background: 'rgba(13, 18, 54, 0.4)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
          <p style={{ color: theme.textMuted, fontSize: '0.875rem' }}>&copy; {new Date().getFullYear()} Duncan Makoyo. All rights reserved.</p>
          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
            <button onClick={() => window.location.hash = '#/terms'} style={{ background: 'none', border: 'none', color: theme.textMuted, fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit' }}>Terms of Use</button>
            <button onClick={() => window.location.hash = '#/privacy'} style={{ background: 'none', border: 'none', color: theme.textMuted, fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit' }}>Privacy Policy</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
