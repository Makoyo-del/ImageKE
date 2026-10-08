import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  ShieldCheck, 
  Download, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

export default function CheckoutModal({ product, currency = 'USD', onClose }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [completedOrder, setCompletedOrder] = useState(null);

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
      script.onerror = () => reject(new Error('Failed to load secure payment script.'));
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    loadPaystackScript().catch(err => console.warn('Preload paystack:', err.message));
  }, []);

  const formattedPrice = currency === 'KES'
    ? `KSh ${Number(product.priceKes || 250).toLocaleString('en-KE')}`
    : `$${Number(product.priceUsd || 1.99).toFixed(2)}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address for instant file delivery.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. Initialize checkout on backend (Strict server pricing enforcement)
      const res = await axios.post(`${API_URL}/api/store/initialize-checkout`, {
        productId: product.productId,
        email: email.trim(),
        customerName: name.trim(),
        currency: currency.toUpperCase()
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Initialization failed.');
      }

      const { paystack, orderNumber } = res.data;

      // 2. Trigger Paystack Inline Popup
      const PaystackPop = await loadPaystackScript();
      if (!PaystackPop) {
        throw new Error('Payment gateway is still loading. Please tap Retry.');
      }

      // NOTE: callback and onClose MUST be regular functions (NOT async functions)
      // because Paystack inline.js strictly checks ({}.toString.call(fn) === '[object Function]')
      const handler = PaystackPop.setup({
        key: paystack.publicKey || 'pk_live_12716854d554f3ef561e6dc73ebd073832d00ae6',
        email: email.trim().toLowerCase(),
        amount: res.data.pricing.subunitAmount,
        currency: res.data.pricing.currency,
        ref: paystack.reference,
        callback: function (response) {
          // Instant client-side verification inside async IIFE
          (async () => {
            setVerifying(true);
            try {
              const verifyRes = await axios.post(`${API_URL}/api/store/verify-payment`, {
                reference: response.reference,
                productId: product.productId,
                email: email.trim()
              });

              if (verifyRes.data?.success && verifyRes.data?.order) {
                setCompletedOrder(verifyRes.data.order);
              } else {
                throw new Error(verifyRes.data?.error || 'Verification pending.');
              }
            } catch (vErr) {
              console.error('Verification error:', vErr);
              // Even if client call fails, the backend webhook fulfills it
              setError('Payment completed! Your download link has been dispatched to your email.');
            } finally {
              setVerifying(false);
            }
          })();
        },
        onClose: function () {
          setLoading(false);
        }
      });

      handler.openIframe();
    } catch (err) {
      console.error('Checkout error:', err);
      const raw = (err.response?.data?.error || err.response?.data?.message || err.message || '').toString();
      let friendly = 'Unable to connect to the secure payment processor. Please check your connection and try again.';

      if (raw.includes('403') || raw.toLowerCase().includes('currency')) {
        friendly = 'The payment gateway is temporarily routing your transaction. Tap Retry to proceed with card or M-Pesa.';
      } else if (raw.toLowerCase().includes('network') || raw.toLowerCase().includes('timeout')) {
        friendly = 'Connection took longer than expected. Please verify your internet and tap Retry.';
      } else if (raw.includes('Attribute callback') || raw.includes('function') || raw.includes('undefined') || raw.includes('TypeError')) {
        friendly = 'Payment screen was interrupted. Tap Retry to launch secure checkout.';
      } else if (raw && !raw.includes('status code') && !raw.includes('AxiosError') && !raw.includes('code:')) {
        friendly = raw;
      }

      setError(friendly);
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      backgroundColor: 'rgba(9, 9, 11, 0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#121215',
        border: '1px solid #27272a',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        padding: '32px',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        color: '#f4f4f5'
      }}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#71717a',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        {/* ─── STATE 1: POST-PURCHASE UNLOCKED ACCESS ───────────────────────── */}
        {completedOrder ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                marginBottom: '16px'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '24px',
                fontWeight: 800,
                color: '#ffffff',
                margin: '0 0 6px'
              }}>
                Payment Verified & Unlocked!
              </h2>
              <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0 }}>
                Order Ref: <code style={{ color: '#10b981', fontFamily: 'monospace' }}>{completedOrder.orderNumber}</code>
              </p>
            </div>

            <div style={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                {completedOrder.productName}
              </div>
              <div style={{ fontSize: '13px', color: '#71717a', marginBottom: '16px' }}>
                Delivered to: <strong style={{ color: '#e4e4e7' }}>{completedOrder.customerEmail}</strong>
              </div>

              {/* Primary Master Download Button */}
              <a
                href={completedOrder.directSignedDownloadUrl || completedOrder.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#000000',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '14px',
                  textDecoration: 'none',
                  boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
                  marginBottom: '10px'
                }}
              >
                <Download size={18} /> Download Master File (.xlsx / .zip)
              </a>

              {/* Google Sheets Copy Option */}
              {completedOrder.googleSheetsUrl && (
                <a
                  href={completedOrder.googleSheetsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#27272a',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    textDecoration: 'none',
                    border: '1px solid #3f3f46'
                  }}
                >
                  <ExternalLink size={15} /> Make Google Drive Copy (Cloud)
                </a>
              )}
            </div>

            <div style={{
              fontSize: '12px',
              color: '#71717a',
              textAlign: 'center',
              lineHeight: 1.5,
              marginBottom: '20px'
            }}>
              A backup download link and receipt have also been sent to your email. You can re-download anytime via Order Lookup.
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#1e1e24',
                color: '#a1a1aa',
                border: '1px solid #27272a',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close Window
            </button>
          </div>
        ) : (
          /* ─── STATE 2: CHECKOUT FORM ────────────────────────────────────────── */
          <div>
            <div style={{ marginBottom: '24px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                padding: '3px 8px',
                borderRadius: '4px'
              }}>
                Instant Digital Fulfillment
              </span>
              <h2 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '22px',
                fontWeight: 800,
                color: '#ffffff',
                margin: '10px 0 4px',
                lineHeight: 1.25
              }}>
                {product.name}
              </h2>
              <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
                {product.tagline}
              </p>
            </div>

            {/* Price Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '13px', color: '#d4d4d8', fontWeight: 600 }}>Total Due Today</span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', fontFamily: "'Outfit', sans-serif" }}>
                {formattedPrice}
              </span>
            </div>

            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                      Unable to proceed with checkout
                    </div>
                    <div style={{ color: '#d4d4d8', fontSize: '12px', lineHeight: 1.5 }}>
                      {error}
                    </div>
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        style={{
                          backgroundColor: '#27272a',
                          border: '1px solid #3f3f46',
                          color: '#ffffff',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Tap to Retry
                      </button>
                      <a
                        href="mailto:duncan@duncanmakoyo.com?subject=Checkout%20Assistance%20-%20Digital%20Vault&body=Hi%20Duncan,%20I'm%20having%20trouble%20checking%20out%20on%20the%20digital%20vault."
                        style={{
                          color: '#10b981',
                          fontSize: '11px',
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                      >
                        Email Support (duncan@duncanmakoyo.com) →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#a1a1aa', marginBottom: '6px' }}>
                  Your Email Address (For file delivery & receipt) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#a1a1aa', marginBottom: '6px' }}>
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Duncan Makoyo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || verifying}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '15px',
                  cursor: loading || verifying ? 'not-allowed' : 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
                  opacity: loading || verifying ? 0.7 : 1
                }}
              >
                {loading || verifying ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {verifying ? 'Verifying payment...' : 'Opening Secure Checkout...'}
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Pay {formattedPrice} with Paystack
                  </>
                )}
              </button>
            </form>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '16px',
              fontSize: '12px',
              color: '#71717a'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} style={{ color: '#10b981' }} />
                256-Bit SSL Encrypted
              </div>
              <span>•</span>
              <div>Cards, M-Pesa, Apple Pay</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
