import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, ExternalLink, CheckCircle2, AlertCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

export default function TokenDownloadResolver() {
  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState('');
  const [autoTriggered, setAutoTriggered] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function resolveToken() {
      try {
        setLoading(true);
        setError('');

        // Extract token from URL hash: e.g. #/api/store/download/:token or #/download/:token
        const hash = window.location.hash || '';
        const parts = hash.split('/');
        const token = parts[parts.length - 1]?.split('?')[0];

        if (!token || token.length < 10) {
          throw new Error('Invalid or missing download security token.');
        }

        const res = await axios.get(`${API_URL}/api/store/download/${token}?json=true`);

        if (!isMounted) return;

        if (res.data?.success && res.data?.downloadUrl) {
          setOrderData(res.data);
          
          // Trigger instant direct download automatically
          if (!autoTriggered) {
            setAutoTriggered(true);
            const timer = setTimeout(() => {
              window.location.href = res.data.downloadUrl;
            }, 600);
            return () => clearTimeout(timer);
          }
        } else {
          throw new Error(res.data?.error || 'Unable to retrieve your order download link.');
        }
      } catch (err) {
        if (!isMounted) return;
        const msg = err.response?.data?.error || err.message || 'Download link has expired or is invalid.';
        setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    resolveToken();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div style={{
      backgroundColor: '#09090b',
      minHeight: '100vh',
      color: '#f4f4f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <div style={{
        backgroundColor: '#121215',
        border: '1px solid #27272a',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '540px',
        padding: '36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        textAlign: 'center'
      }}>
        {loading && (
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              marginBottom: '20px'
            }}>
              <Loader2 size={32} className="animate-spin" />
            </div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 800, margin: '0 0 8px' }}>
              Preparing Your Download...
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: '14px', margin: 0 }}>
              Verifying your secure token and fetching your master asset files.
            </p>
          </div>
        )}

        {!loading && error && (
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              marginBottom: '20px'
            }}>
              <AlertCircle size={32} />
            </div>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 800, margin: '0 0 8px', color: '#f87171' }}>
              Download Link Notice
            </h2>
            <p style={{ color: '#d4d4d8', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
              {error}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href="#/assets"
                style={{
                  display: 'block',
                  padding: '12px 20px',
                  backgroundColor: '#10b981',
                  color: '#000000',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  textDecoration: 'none'
                }}
              >
                Go to Order Lookup to Re-Download
              </a>
              <a
                href="mailto:duncan@duncanmakoyo.com"
                style={{
                  color: '#a1a1aa',
                  fontSize: '12px',
                  textDecoration: 'none',
                  marginTop: '6px'
                }}
              >
                Need help? Contact duncan@duncanmakoyo.com
              </a>
            </div>
          </div>
        )}

        {!loading && orderData && (
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              marginBottom: '20px'
            }}>
              <CheckCircle2 size={34} />
            </div>

            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '24px', fontWeight: 800, margin: '0 0 6px', color: '#ffffff' }}>
              Your Download Has Started!
            </h2>
            <p style={{ color: '#a1a1aa', fontSize: '14px', margin: '0 0 20px' }}>
              If your download didn't begin automatically, click the button below.
            </p>

            <div style={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                {orderData.productName}
              </div>
              <div style={{ fontSize: '12px', color: '#10b981', fontFamily: 'monospace' }}>
                Order #{orderData.orderNumber}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <a
                href={orderData.downloadUrl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#000000',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '14px',
                  textDecoration: 'none',
                  boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)'
                }}
              >
                <Download size={18} /> Download Master File (.xlsx / .zip)
              </a>

              {orderData.googleSheetsUrl && (
                <a
                  href={orderData.googleSheetsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: '#27272a',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '13px',
                    textDecoration: 'none',
                    border: '1px solid #3f3f46'
                  }}
                >
                  <ExternalLink size={16} /> Make a Copy to Google Drive (Cloud)
                </a>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <a
                href="#/assets"
                style={{
                  color: '#a1a1aa',
                  fontSize: '13px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ArrowLeft size={14} /> Back to Digital Asset Vault
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
