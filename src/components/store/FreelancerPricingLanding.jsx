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
  TrendingUp,
  DollarSign,
  Briefcase,
  Zap,
  HelpCircle
} from 'lucide-react';
import CheckoutModal from './CheckoutModal';
import { useStoreProducts } from './useStoreProducts';
import OrderLookupModal from './OrderLookupModal';
import { LegalModal } from './LegalPages';

import './store.css';

export default function FreelancerPricingLanding() {
  const [currency, setCurrency] = useState(() => localStorage.getItem('dm_store_currency') || 'USD');
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const [legalType, setLegalType] = useState(null);

  useEffect(() => {
    localStorage.setItem('dm_store_currency', currency);
  }, [currency]);

  const { freelancerProduct: product, bundleProduct, formatPrice } = useStoreProducts();
  const formattedPrice = formatPrice(product, currency);
  const formattedBundlePrice = formatPrice(bundleProduct, currency);

  return (
    <div className="dm-store" style={{
      backgroundColor: '#09090b',
      color: '#f4f4f5',
      minHeight: '100vh',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* Top Header */}
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
              onClick={() => setCheckoutProduct(product)}
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
            <Briefcase size={14} /> Freelance Business Operating System
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
            Stop Pulling Quotes Out of Thin Air. Price Every Client Project for Maximum Profit.
          </h1>

          <p style={{
            fontSize: '17px',
            lineHeight: 1.65,
            color: '#a1a1aa',
            margin: '0 0 32px'
          }}>
            Freelancers lose thousands every year by forgetting income tax reserves, SaaS overheads, unbillable admin hours, 
            and scope creep. This single-sheet app calculates your Floor Rate, Target Profit Rate, and sizes client quotes in 30 seconds.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setCheckoutProduct(product)}
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
                Freelancer_Pricing_OS_Master.xlsx
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, backgroundColor: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.2)', flexShrink: 0 }}>
              Full Screen Model
            </div>
          </div>

          <img 
            src="/previews/freelance_preview.png" 
            alt="Freelancer Pricing OS High Resolution Preview"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>

        {/* ─── THE 3 FATAL FREELANCE PRICING TRAPS ────────────────────────────── */}
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '26px',
            fontWeight: 800,
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '36px'
          }}>
            The 3 Fatal Pricing Mistakes Freelancers Make
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            <div style={{ backgroundColor: '#121215', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '16px', marginBottom: '8px' }}>
                1. The 40-Hour Myth
              </div>
              <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Freelancers assume 40 billable hours a week. In reality, marketing and admin eat up 15–20 hours. Quoting on 40 hours cuts your real hourly earnings in half.
              </p>
            </div>

            <div style={{ backgroundColor: '#121215', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '16px', marginBottom: '8px' }}>
                2. Ignoring Tax Reserves & SaaS
              </div>
              <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Failing to bake in 20–30% for taxes and software tools turns a seemingly high quote into negative net profit at tax season.
              </p>
            </div>

            <div style={{ backgroundColor: '#121215', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '16px', marginBottom: '8px' }}>
                3. Quoting Fixed Projects Without Buffers
              </div>
              <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Quoting fixed fees without a complexity multiplier leads to unpaid scope creep. The app automatically sizes buffer multipliers and 50% deposits.
              </p>
            </div>
          </div>
        </div>

        {/* ─── 4 CORE CAPABILITIES ────────────────────────────────────────────── */}
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
            Engineered Features Inside The Freelancer OS
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            <div>
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                Triple-Tier Rate Matrix
              </div>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Floor Rate in Red (breakeven), Target Profit Rate in Green (25% margin), Premium Rate in Gold (50% margin).
              </p>
            </div>

            <div>
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                30-Second Fixed Project Sizer
              </div>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Input estimated project hours and complexity tier to generate fixed quote fees with built-in revision buffers.
              </p>
            </div>

            <div>
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                Automated 50% Deposit Sizer
              </div>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Calculates upfront deposit amount and milestone balances to copy directly into client contracts.
              </p>
            </div>

            <div>
              <div style={{ color: '#10b981', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>
                Overhead & Tax Deduction Engine
              </div>
              <p style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: 1.6, margin: 0 }}>
                Accounts for hardware depreciation, SaaS subscriptions, and income tax reserves automatically.
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
              Want Both The Freelancer OS & Debt Freedom Engine?
            </h3>
            <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0 }}>
              Get the Complete 2-in-1 Solopreneur Bundle for only <strong style={{ color: '#fbbf24' }}>{formattedBundlePrice}</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCheckoutProduct(bundleProduct)}
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

      {(showCheckout || checkoutProduct) && (
        <CheckoutModal
          product={checkoutProduct || product}
          currency={currency}
          onClose={() => {
            setShowCheckout(false);
            setCheckoutProduct(null);
          }}
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
