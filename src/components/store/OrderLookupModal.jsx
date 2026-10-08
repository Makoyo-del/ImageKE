import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  AlertCircle,
  Loader2,
  Mail
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

export default function OrderLookupModal({ onClose }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setError('');
    setResendSuccess('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/store/lookup-order`, {
        query: query.trim()
      });

      if (res.data?.success && res.data?.orders?.length > 0) {
        setOrders(res.data.orders);
      } else {
        setError('No active purchases found for that email or reference.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to locate order. Please check your spelling or contact support.');
      setOrders(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResendReceipt = async (order) => {
    setResendingId(order.orderNumber);
    setResendSuccess('');
    try {
      const res = await axios.post(`${API_URL}/api/store/resend-receipt`, {
        paymentReference: order.paymentReference || order.orderNumber,
        email: query.includes('@') ? query.trim() : null
      });

      if (res.data?.success) {
        setResendSuccess(`Receipt & fresh download links sent to your email!`);
      }
    } catch (err) {
      setError('Could not re-send email. Please download directly below.');
    } finally {
      setResendingId(null);
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
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '32px',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        color: '#f4f4f5'
      }}>
        {/* Close */}
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

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '22px',
            fontWeight: 800,
            color: '#ffffff',
            margin: '0 0 6px'
          }}>
            Order Lookup & File Recovery
          </h2>
          <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
            Enter the email address used during purchase or your Paystack payment reference.
          </p>
        </div>

        <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              required
              placeholder="e.g. name@example.com or DM-2026-..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 14px',
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 20px',
                background: '#10b981',
                color: '#000000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Search
            </button>
          </div>
        </form>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {resendSuccess && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{resendSuccess}</span>
          </div>
        )}

        {/* Results List */}
        {orders && orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#a1a1aa' }}>
              Found {orders.length} Active Asset{orders.length > 1 ? 's' : ''}:
            </div>

            {orders.map((o) => (
              <div
                key={o.orderNumber}
                style={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '10px',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '14px' }}>
                    {o.productName}
                  </span>
                  <span style={{ fontSize: '11px', color: '#10b981', fontFamily: 'monospace' }}>
                    {o.orderNumber}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                  <a
                    href={o.directVaultUrl || o.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '10px',
                      background: '#10b981',
                      color: '#000000',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <Download size={14} /> Download File
                  </a>

                  {o.googleSheetsUrl ? (
                    <a
                      href={o.googleSheetsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px',
                        backgroundColor: '#27272a',
                        color: '#ffffff',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        border: '1px solid #3f3f46'
                      }}
                    >
                      <ExternalLink size={13} /> Google Sheets
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleResendReceipt(o)}
                      disabled={resendingId === o.orderNumber}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px',
                        backgroundColor: '#27272a',
                        color: '#ffffff',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: '1px solid #3f3f46',
                        cursor: 'pointer'
                      }}
                    >
                      <Mail size={13} /> Re-send Email
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
