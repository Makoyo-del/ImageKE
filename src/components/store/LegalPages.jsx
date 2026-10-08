import React from 'react';
import { X, Shield, FileText, Cookie } from 'lucide-react';

export function LegalModal({ type, onClose }) {
  const titles = {
    terms: 'Terms of Service & License Agreement',
    privacy: 'Privacy & Data Protection Policy',
    cookies: 'Cookies & Local Storage Policy'
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
        maxWidth: '680px',
        maxHeight: '85vh',
        overflowY: 'auto',
        padding: '36px',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        color: '#f4f4f5',
        lineHeight: 1.6
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

        <h2 style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '24px',
          fontWeight: 800,
          color: '#ffffff',
          margin: '0 0 20px'
        }}>
          {titles[type] || 'Legal Information'}
        </h2>

        {type === 'terms' && (
          <div style={{ fontSize: '14px', color: '#a1a1aa' }}>
            <p><strong style={{ color: '#ffffff' }}>1. Single-User License Grant:</strong> Upon purchase of any digital spreadsheet or operating system from Duncan Makoyo / Makoyocart Ventures, you are granted a perpetual, non-exclusive, non-transferable single-user license for personal and internal commercial business operations.</p>
            <p><strong style={{ color: '#ffffff' }}>2. Restrictions on Distribution:</strong> You may not redistribute, resell, sub-license, upload to public repositories, or publish copies of the master template files. Derivative client deliverables (such as PDF client proposals produced via the OS) are fully permitted.</p>
            <p><strong style={{ color: '#ffffff' }}>3. Digital Goods Delivery & Refunds:</strong> All products are digital files delivered instantly upon payment verification via on-screen download links and email confirmation. If you encounter any technical compatibility defect, contact support at duncan@duncanmakoyo.com for instant resolution.</p>
            <p><strong style={{ color: '#ffffff' }}>4. Disclaimer:</strong> Financial and debt calculation tools are engineered for planning and simulation purposes. They do not constitute certified accounting or legal financial advice.</p>
          </div>
        )}

        {type === 'privacy' && (
          <div style={{ fontSize: '14px', color: '#a1a1aa' }}>
            <p><strong style={{ color: '#ffffff' }}>1. Information We Collect:</strong> We collect only the essential information necessary for fulfillment and support: your email address, customer name (optional), IP address, and transaction references.</p>
            <p><strong style={{ color: '#ffffff' }}>2. Payment Card Security:</strong> We do not store, process, or transmit credit card or banking details on our servers. All financial transactions are processed securely through PCI-DSS Level 1 certified payment gateway Paystack.</p>
            <p><strong style={{ color: '#ffffff' }}>3. Data Usage & Protection:</strong> Your contact information is never sold or shared with third parties. It is solely used for delivering your purchase confirmation, order recovery, and critical security notices.</p>
            <p><strong style={{ color: '#ffffff' }}>4. Data Deletion Rights:</strong> You may request complete erasure of your customer order record by contacting privacy@duncanmakoyo.com.</p>
          </div>
        )}

        {type === 'cookies' && (
          <div style={{ fontSize: '14px', color: '#a1a1aa' }}>
            <p><strong style={{ color: '#ffffff' }}>1. Minimal Cookie Policy:</strong> We respect your privacy and do not use invasive third-party tracking cookies.</p>
            <p><strong style={{ color: '#ffffff' }}>2. Local Storage Usage:</strong> We utilize browser LocalStorage exclusively to store your preferred currency selection (USD vs KES) and active download session tokens so your experience remains seamless.</p>
            <p><strong style={{ color: '#ffffff' }}>3. Opt-out:</strong> You can clear LocalStorage at any time through your browser developer tools or settings without breaking storefront accessibility.</p>
          </div>
        )}

        <div style={{ marginTop: '28px', borderTop: '1px solid #27272a', paddingTop: '16px', textAlign: 'right' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
