import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Download, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Lock, 
  FileSpreadsheet, 
  ArrowLeft,
  ChevronRight,
  TrendingDown,
  Percent,
  Calendar,
  Zap,
  HelpCircle
} from 'lucide-react';
import CheckoutModal from './CheckoutModal';
import { useStoreProducts } from './useStoreProducts';
import OrderLookupModal from './OrderLookupModal';
import { LegalModal } from './LegalPages';

import './store.css';

export default function DebtFreedomLanding() {
  const [currency, setCurrency] = useState(() => localStorage.getItem('dm_store_currency') || 'USD');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const [legalType, setLegalType] = useState(null);

  useEffect(() => {
    localStorage.setItem('dm_store_currency', currency);
  }, [currency]);

  const { debtProduct: product, bundleProduct, formatPrice } = useStoreProducts();
  const formattedPrice = formatPrice(product, currency);
  const formattedBundlePrice = formatPrice(bundleProduct, currency);

  return (
    <div className="dm-store" style={{
      backgroundColor: '#09090b',
      color: '#f4f4f5',
      minHeight: '100vh',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Top Sticky Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        backdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(9, 9, 11, 0.85)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{
          maxWidth: '1180px',
          margin: '0 auto',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <a 
            href="#/assets"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#a1a1aa',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: '#121215'
            }}
          >
            <ArrowLeft size={14} /> Back to Store
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'inline-flex',
              padding: '3px',
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700
            }}>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: currency === 'USD' ? '#10b981' : 'transparent',
                  color: currency === 'USD' ? '#000000' : '#a1a1aa',
                  fontWeight: 700
                }}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('KES')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: currency === 'KES' ? '#10b981' : 'transparent',
                  color: currency === 'KES' ? '#000000' : '#a1a1aa',
                  fontWeight: 700
                }}
              >
                KES (KSh)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowCheckout(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#000000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.3)'
              }}
            >
              Get Access — {formattedPrice}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '50px 20px 80px' }}>
        
        <div style={{ textAlign: 'center', maxWidth: '840px', margin: '0 auto 48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '20px'
          }}>
            <Zap size={14} /> Single-Sheet Excel & Cloud App
          </div>

          <h1 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            margin: '0 0 20px'
          }}>
            Stop Guessing When You’ll Be Debt-Free. Know Your Exact Day in 2 Minutes.
          </h1>

          <p style={{
            fontSize: '17px',
            lineHeight: 1.65,
            color: '#a1a1aa',
            margin: '0 0 32px'
          }}>
            Credit card minimum payments are designed to keep you trapped in debt for years. 
            The Debt Freedom Engine compares Snowball vs. Avalanche strategies side-by-side with live What-If accelerators 
            so you eliminate interest and take back your money.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowCheckout(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 36px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#000000',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 12px 24px -6px rgba(16, 185, 129, 0.4)'
              }}
            >
              Unlock Instant Access — {formattedPrice} <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* ─── LIVE APP FRAME PREVIEW ─────────────────────────────────────────── */}
        <div style={{
          backgroundColor: '#121215',
          border: '1px solid #27272a',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          marginBottom: '60px'
        }}>
          {/* Simulated App Header Bar */}
          <div style={{
            backgroundColor: '#18181b',
            padding: '10px 16px',
            borderBottom: '1px solid #27272a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              </div>
              <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                The_Debt_Freedom_Engine_Master.xlsx
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.2)', flexShrink: 0 }}>
              Full Screen Model
            </div>
          </div>

          <img 
            src="/previews/debt_preview.png" 
            alt="The Debt Freedom Engine High Resolution Preview"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>

        {/* ─── THE 3 CRITICAL FLAWS WE SOLVE ──────────────────────────────────── */}
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '26px',
            fontWeight: 800,
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '36px'
          }}>
            Why Most People Stay Trapped in Debt
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            <div style={{ backgroundColor: '#121215', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '16px', marginBottom: '8px' }}>
                1. The Minimum Payment Illusion
              </div>
              <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Banks set minimum payments so 75% of your money goes straight to interest. Paying only minimums extends debt by up to 12 years.
              </p>
            </div>

            <div style={{ backgroundColor: '#121215', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '16px', marginBottom: '8px' }}>
                2. Snowball vs. Avalanche Confusion
              </div>
              <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                People don't know whether to target highest APR first (Avalanche) or smallest balance first (Snowball). This app calculates both side-by-side.
              </p>
            </div>

            <div style={{ backgroundColor: '#121215', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '16px', marginBottom: '8px' }}>
                3. Overwhelming Multi-Tab Sheets
              </div>
              <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Online spreadsheets have 8 confusing tabs and break easily. We engineered a single-sheet vertical scroll layout that fits every laptop screen.
              </p>
            </div>
          </div>
        </div>

        {/* ─── 4 CORE APP CAPABILITIES ────────────────────────────────────────── */}
        <div style={{
          backgroundColor: '#121215',
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '36px',
          marginBottom: '60px'
        }}>
          <h2 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '24px',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '28px'
          }}>
            Engineered Capabilities Built Into The Master App
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            <div>
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                4-Card Command Deck
              </div>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Live Total Debt, Total Monthly Minimums, Projected Debt-Free Day, and Total Interest Remaining.
              </p>
            </div>

            <div>
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                Interactive What-If Math
              </div>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Enter an extra $50 or KSh 2,000/month and watch the engine calculate exact months slashed and cash saved.
              </p>
            </div>

            <div>
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                Strategy Toggle Dropdown
              </div>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Switch between Snowball (smallest balance) and Avalanche (highest APR) with 1 click.
              </p>
            </div>

            <div>
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                Monthly Payment Log
              </div>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Log your monthly payments. As debts reach $0, they automatically turn green and strike-through.
              </p>
            </div>
          </div>
        </div>

        {/* ─── BUNDLE UPSELL CARD ────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: '#181922',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '16px',
          padding: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '24px',
          marginBottom: '60px'
        }}>
          <div>
            <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>
              Upgrade & Save 60%
            </div>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
              Want Both The Debt Engine & Freelancer Pricing OS?
            </h3>
            <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0 }}>
              Get the Complete 2-in-1 Solopreneur Bundle for only <strong style={{ color: '#fbbf24' }}>{formattedBundlePrice}</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              // trigger bundle purchase
              setShowCheckout(true);
            }}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Get The Complete Bundle
          </button>
        </div>

        {/* ─── FAQs ─────────────────────────────────────────────────────────── */}
        <div style={{ maxWidth: '800px', margin: '0 auto 40px' }}>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 800, color: '#ffffff', textAlign: 'center', marginBottom: '24px' }}>
            Frequently Asked Questions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '10px', padding: '18px' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px', marginBottom: '6px' }}>
                How do I get my files after payment?
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa', lineHeight: 1.5 }}>
                An instant Download Modal appears on your screen right after Paystack verification with direct <code style={{ color: '#10b981' }}>.xlsx</code> and Google Sheets copy links. A backup copy is simultaneously emailed to you.
              </p>
            </div>
            <div style={{ backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '10px', padding: '18px' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px', marginBottom: '6px' }}>
                Does it work on Mac and Windows?
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#a1a1aa', lineHeight: 1.5 }}>
                Yes, it works natively on Microsoft Excel 2016+, Office 365 for Windows & Mac, and on any browser with Google Sheets.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #27272a', padding: '30px 20px', textAlign: 'center', fontSize: '12px', color: '#71717a' }}>
        <p style={{ margin: '0 0 8px' }}>© {new Date().getFullYear()} Makoyocart Ventures • Built by Duncan Makoyo</p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button type="button" onClick={() => setLegalType('terms')} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>Terms</button>
          <button type="button" onClick={() => setLegalType('privacy')} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>Privacy</button>
          <button type="button" onClick={() => setLegalType('cookies')} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>Cookies</button>
        </div>
      </footer>

      {showCheckout && (
        <CheckoutModal
          product={product}
          currency={currency}
          onClose={() => setShowCheckout(false)}
        />
      )}

      {showLookup && (
        <OrderLookupModal onClose={() => setShowLookup(false)} />
      )}

      {legalType && (
        <LegalModal type={legalType} onClose={() => setLegalType(null)} />
      )}
    </div>
  );
}
