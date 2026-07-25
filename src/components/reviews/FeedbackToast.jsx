import React, { useEffect, useState } from 'react';
import { Star, X, MessageSquare, ArrowRight } from 'lucide-react';

export default function FeedbackToast({ isVisible, onClose, onScrollToForm }) {
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9990,
        maxWidth: '380px',
        width: 'calc(100vw - 48px)',
        background: '#F4F4EE',
        border: '2px solid #111111',
        borderRadius: '0px',
        padding: '1.25rem',
        boxShadow: '6px 6px 0px #111111',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#D61A3C',
            display: 'inline-block'
          }} />
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#111111'
          }}>
            USER FEEDBACK // ATS & LINKEDIN
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none',
            border: 'none',
            color: '#111111',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Content */}
      <h4 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        color: '#111111',
        fontSize: '1.1rem',
        fontWeight: 800,
        margin: '0 0 0.5rem 0',
        lineHeight: 1.3
      }}>
        How did your analysis go?
      </h4>
      <p style={{
        fontSize: '0.85rem',
        color: '#333333',
        margin: '0 0 1rem 0',
        lineHeight: 1.45
      }}>
        Share your experience and star rating to help other job seekers evaluate their resume readiness!
      </p>

      {/* Action Button */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => {
            if (onScrollToForm) onScrollToForm();
            if (onClose) onClose();
          }}
          style={{
            flex: 1,
            background: '#D61A3C',
            color: '#FFFFFF',
            border: '1.5px solid #111111',
            padding: '0.65rem 1rem',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          LEAVE A REVIEW <ArrowRight size={14} />
        </button>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            color: '#111111',
            border: '1.5px solid #111111',
            padding: '0.65rem 0.85rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          LATER
        </button>
      </div>
    </div>
  );
}
