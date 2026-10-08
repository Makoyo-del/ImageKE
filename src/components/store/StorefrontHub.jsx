import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Download, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Lock, 
  RefreshCw, 
  FileSpreadsheet, 
  ExternalLink, 
  Layers, 
  Search, 
  HelpCircle,
  TrendingUp,
  Percent,
  Calculator,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import CheckoutModal from './CheckoutModal';
import { useStoreProducts } from './useStoreProducts';
import OrderLookupModal from './OrderLookupModal';
import { LegalModal } from './LegalPages';

import './store.css';

export default function StorefrontHub() {
  const [currency, setCurrency] = useState(() => localStorage.getItem('dm_store_currency') || 'USD');
  const { productsList: products, formatPrice } = useStoreProducts();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const [legalType, setLegalType] = useState(null); // 'terms' | 'privacy' | 'cookies'

  useEffect(() => {
    localStorage.setItem('dm_store_currency', currency);
  }, [currency]);

  const handleBuy = (product) => {
    setSelectedProduct(product);
    setShowCheckout(true);
  };

  const getFormattedPrice = (p) => {
    if (currency === 'KES') {
      return `KSh ${Number(p.priceKes || 250).toLocaleString('en-KE')}`;
    }
    return `$${Number(p.priceUsd || 1.99).toFixed(2)}`;
  };

  const singleProducts = products.filter(p => !p.isBundle);
  const bundleProduct = products.find(p => p.isBundle) || products[2];

  return (
    <div className="dm-store" style={{
      backgroundColor: '#09090b',
      color: '#f4f4f5',
      minHeight: '100vh',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background Ambient Glow */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '1000px',
        height: '450px',
        background: 'radial-gradient(ellipse 600px 300px at 50% 0%, rgba(16, 185, 129, 0.12), transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Top Sticky Navigation */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a 
              href="#/"
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
              <ArrowLeft size={14} /> Back to Portfolio
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 10px #10b981'
              }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Duncan Makoyo Vault
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Currency Selector Pill */}
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
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: currency === 'USD' ? '#10b981' : 'transparent',
                  color: currency === 'USD' ? '#000000' : '#a1a1aa',
                  fontWeight: 700,
                  transition: 'all 0.15s ease'
                }}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('KES')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: currency === 'KES' ? '#10b981' : 'transparent',
                  color: currency === 'KES' ? '#000000' : '#a1a1aa',
                  fontWeight: 700,
                  transition: 'all 0.15s ease'
                }}
              >
                KES (KSh)
              </button>
            </div>

            {/* Self-Service Order Recovery Button */}
            <button
              type="button"
              onClick={() => setShowLookup(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                backgroundColor: '#1e1e24',
                color: '#f4f4f5',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Search size={14} style={{ color: '#10b981' }} />
              Order Lookup
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1180px', margin: '0 auto', padding: '40px 20px 80px', position: 'relative', zIndex: 10 }}>
        
        {/* Hero Section */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 60px' }}>
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
            <Sparkles size={14} />
            Precision Financial & Freelance Systems
          </div>

          <h1 style={{
            fontFamily: "'Outfit', -apple-system, sans-serif",
            fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            margin: '0 0 20px'
          }}>
            Single-Sheet Desktop Apps That Solve Real Financial Pain in 2 Minutes.
          </h1>

          <p style={{
            fontSize: '17px',
            lineHeight: 1.65,
            color: '#a1a1aa',
            margin: '0 0 32px'
          }}>
            No subscriptions. No confusing multi-tab spreadsheets. 
            Engineered with strict zero-macro native formulas, instant What-If accelerators, 
            and full multi-currency support for Excel & Google Sheets.
          </p>

          {/* Quick Value Pillars */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '24px',
            fontSize: '13px',
            color: '#d4d4d8'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981' }} />
              Single-Sheet Vertical Scroll
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981' }} />
              Instant On-Screen Download
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981' }} />
              Paystack 256-Bit SSL Checkout
            </div>
          </div>
        </div>

        {/* ─── 2-COLUMN MICRO ASSET GRID ────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '28px',
          marginBottom: '40px'
        }}>
          {/* Card 1: Debt Freedom Engine */}
          <div style={{
            backgroundColor: '#121215',
            border: '1px solid #27272a',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div>
              {/* Category Tag */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}>
                  Personal Finance & Debt
                </span>
                <span style={{ fontSize: '12px', color: '#71717a' }}>Instant .xlsx & Cloud</span>
              </div>

              {/* Title & Tagline */}
              <h2 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '22px',
                fontWeight: 700,
                color: '#ffffff',
                margin: '0 0 10px',
                lineHeight: 1.25
              }}>
                The Debt Freedom Engine
              </h2>
              <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6, margin: '0 0 20px' }}>
                Snowball vs. Avalanche strategy comparator with live What-If extra payment math. 
                Calculate your exact debt-free day in 2 minutes.
              </p>

              {/* Preview Image Frame */}
              <div style={{
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #27272a',
                marginBottom: '20px',
                backgroundColor: '#09090b'
              }}>
                <img 
                  src="/previews/debt_preview.png"
                  alt="Debt Freedom Engine Preview"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>

              {/* Core Solved Flaws Checklist */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                  What it Solves:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#d4d4d8' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle2 size={15} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                    <span>Eliminates the minimum payment trap that costs thousands in bank interest.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle2 size={15} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                    <span>Side-by-side Snowball vs. Avalanche payoff date & interest savings comparison.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle2 size={15} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                    <span>What-If simulator shows exact months shaved off per extra payment.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price & Action Area */}
            <div style={{ borderTop: '1px solid #27272a', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', fontFamily: "'Outfit', sans-serif" }}>
                    {getFormattedPrice(singleProducts[0] || { priceUsd: 1.99, priceKes: 250 })}
                  </span>
                  <span style={{ fontSize: '12px', color: '#71717a', marginLeft: '6px' }}>one-time • lifetime access</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <a
                  href="#/assets/debt-clock"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '12px',
                    backgroundColor: '#18181b',
                    color: '#f4f4f5',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  View Details <ChevronRight size={14} />
                </a>
                <button
                  type="button"
                  onClick={() => handleBuy(singleProducts[0] || { productId: 'debt-freedom-engine', name: 'The Debt Freedom Engine', priceUsd: 1.99, priceKes: 250 })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '12px',
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
                  Unlock Access <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Freelancer Pricing OS */}
          <div style={{
            backgroundColor: '#121215',
            border: '1px solid #27272a',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div>
              {/* Category Tag */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  padding: '4px 10px',
                  borderRadius: '6px'
                }}>
                  Freelance Operations
                </span>
                <span style={{ fontSize: '12px', color: '#71717a' }}>Instant .xlsx & Cloud</span>
              </div>

              {/* Title & Tagline */}
              <h2 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '22px',
                fontWeight: 700,
                color: '#ffffff',
                margin: '0 0 10px',
                lineHeight: 1.25
              }}>
                The Freelancer Pricing OS
              </h2>
              <p style={{ fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6, margin: '0 0 20px' }}>
                Stop undercharging. Calculate your non-negotiable Floor Rate, Target Rate, 
                and generate profitable 30-second fixed project quotes.
              </p>

              {/* Preview Image Frame */}
              <div style={{
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #27272a',
                marginBottom: '20px',
                backgroundColor: '#09090b'
              }}>
                <img 
                  src="/previews/freelance_preview.png"
                  alt="Freelancer Pricing OS Preview"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>

              {/* Core Solved Flaws Checklist */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#71717a', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
                  What it Solves:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#d4d4d8' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle2 size={15} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                    <span>Eliminates unbilled admin hours and hidden SaaS subscription loss.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle2 size={15} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                    <span>Calculates 3-tier rates: Floor (Red), Target (Green), Premium (Gold).</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <CheckCircle2 size={15} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                    <span>30-second project sizer with automated 50% deposit and milestone math.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price & Action Area */}
            <div style={{ borderTop: '1px solid #27272a', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', fontFamily: "'Outfit', sans-serif" }}>
                    {getFormattedPrice(singleProducts[1] || { priceUsd: 2.50, priceKes: 300 })}
                  </span>
                  <span style={{ fontSize: '12px', color: '#71717a', marginLeft: '6px' }}>one-time • lifetime access</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <a
                  href="#/assets/freelancer-rate"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '12px',
                    backgroundColor: '#18181b',
                    color: '#f4f4f5',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  View Details <ChevronRight size={14} />
                </a>
                <button
                  type="button"
                  onClick={() => handleBuy(singleProducts[1] || { productId: 'freelancer-pricing-os', name: 'The Freelancer Pricing OS', priceUsd: 2.50, priceKes: 300 })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '12px',
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
                  Unlock Access <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── MASTER 2-IN-1 BUNDLE BANNER ────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #181922 0%, #121216 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '20px',
          padding: '36px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.15)',
          marginBottom: '60px'
        }}>
          {/* Subtle Ambient Gold Glow */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle at 100% 0%, rgba(245, 158, 11, 0.12), transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '28px' }}>
            <div style={{ maxWidth: '650px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px'
              }}>
                <Sparkles size={13} />
                Executive Solopreneur Toolkit • 60% Bundle Savings
              </div>

              <h2 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
                fontWeight: 800,
                color: '#ffffff',
                margin: '0 0 12px',
                letterSpacing: '-0.02em'
              }}>
                The Complete Financial Freedom & Freelance OS Bundle
              </h2>

              <p style={{ fontSize: '15px', color: '#d4d4d8', lineHeight: 1.6, margin: '0 0 16px' }}>
                Get both Master spreadsheets, quickstart instruction guides, and instant Google Sheets cloud copies in one unified package.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#a1a1aa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} style={{ color: '#fbbf24' }} />
                  Debt Freedom Engine Master
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} style={{ color: '#fbbf24' }} />
                  Freelancer Pricing OS Master
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} style={{ color: '#fbbf24' }} />
                  Instant Google Sheets Copy Links
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', minWidth: '220px' }}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', color: '#71717a', textDecoration: 'line-through' }}>
                  {currency === 'KES' ? 'Regular: KSh 3,200' : 'Regular: $24.99'}
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#fbbf24', fontFamily: "'Outfit', sans-serif" }}>
                  {getFormattedPrice(bundleProduct || { priceUsd: 9.99, priceKes: 1299 })}
                </div>
                <div style={{ fontSize: '11px', color: '#a1a1aa' }}>One-time payment • Lifetime access</div>
              </div>

              <button
                type="button"
                onClick={() => handleBuy(bundleProduct || { productId: 'complete-financial-os-bundle', name: 'The Complete Financial Freedom & Freelance OS Bundle', priceUsd: 9.99, priceKes: 1299 })}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 10px 20px -5px rgba(245, 158, 11, 0.4)'
                }}
              >
                Get The Complete Bundle <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ─── TECHNICAL TRUST & FAQ ACCORDION ────────────────────────────────── */}
        <div style={{ maxWidth: '820px', margin: '0 auto 60px' }}>
          <h3 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '24px',
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
            marginBottom: '28px'
          }}>
            Frequently Asked Questions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '15px', marginBottom: '8px' }}>
                How do I receive my files after checkout?
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6 }}>
                Immediately upon payment verification on Paystack, an on-screen Download Modal will appear with 1-click links to download your Master <code style={{ color: '#10b981' }}>.xlsx</code> files and make a copy to Google Drive. A backup confirmation email is simultaneously delivered via Resend.
              </p>
            </div>

            <div style={{ backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '15px', marginBottom: '8px' }}>
                Does this work on both Microsoft Excel and Google Sheets?
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6 }}>
                Yes. The templates are engineered with standard, zero-macro native formulas compatible with Microsoft Excel 2016+, Microsoft 365 (Windows & Mac), and includes 1-click Google Sheets copy links that run in your web browser.
              </p>
            </div>

            <div style={{ backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '15px', marginBottom: '8px' }}>
                Can I switch currencies if I am not based in the US or Kenya?
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6 }}>
                Yes! Every spreadsheet features a global currency selector at the top (USD, KES, GBP, EUR, CAD, AUD, NGN, ZAR). All calculations, summary cards, and payoff schedules automatically adapt to your currency.
              </p>
            </div>

            <div style={{ backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '15px', marginBottom: '8px' }}>
                What if I lose my download link or switch computers?
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6 }}>
                Simply visit this page anytime and click <strong>Order Lookup</strong> in the top header. Enter your email address or payment reference to retrieve fresh, active download links instantly.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* ─── FOOTER & LEGAL LINKS ───────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid #27272a',
        backgroundColor: '#09090b',
        padding: '32px 20px',
        textAlign: 'center',
        fontSize: '13px',
        color: '#71717a'
      }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div>
            Built & Engineered by <strong>Duncan Makoyo</strong> • Makoyocart Ventures
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              type="button" 
              onClick={() => setLegalType('terms')} 
              style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
            >
              Terms of Service
            </button>
            <button 
              type="button" 
              onClick={() => setLegalType('privacy')} 
              style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
            >
              Privacy Policy
            </button>
            <button 
              type="button" 
              onClick={() => setLegalType('cookies')} 
              style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}
            >
              Cookies Policy
            </button>
          </div>
          <div style={{ fontSize: '11px', color: '#52525b', marginTop: '4px' }}>
            © {new Date().getFullYear()} Makoyocart Ventures. All rights reserved. Single-user personal and commercial license.
          </div>
        </div>
      </footer>

      {/* Checkout Modal */}
      {showCheckout && selectedProduct && (
        <CheckoutModal
          product={selectedProduct}
          currency={currency}
          onClose={() => {
            setShowCheckout(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Order Lookup Modal */}
      {showLookup && (
        <OrderLookupModal onClose={() => setShowLookup(false)} />
      )}

      {/* Legal Modal */}
      {legalType && (
        <LegalModal type={legalType} onClose={() => setLegalType(null)} />
      )}
    </div>
  );
}
