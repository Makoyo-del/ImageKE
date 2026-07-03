import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

const WorkshopJoin = () => {
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Extract email from URL if present (e.g. ?email=user@example.com)
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsVerifying(true);

    try {
      const res = await fetch(`${API_URL}/api/workshop/join-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      setSuccessMsg('Access Verified! Redirecting you to the Google Meet session...');
      
      // Redirect to the meeting link after a short delay
      setTimeout(() => {
        window.location.href = data.link;
      }, 1500);

    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while verifying your access.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0F172A',
      color: '#F8FAFC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '40px 32px',
        width: '100%',
        maxWidth: '480px',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          backgroundColor: 'rgba(20, 184, 166, 0.1)', 
          color: '#14B8A6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px auto'
        }}>
          <CheckCircle size={32} />
        </div>
        
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
          Workshop Access Verification
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '0.95rem', margin: '0 0 32px 0', lineHeight: '1.5' }}>
          Please enter the <strong style={{ color: '#F8FAFC' }}>exact email address</strong> you used to secure your seat to join the meeting.
        </p>

        {errorMsg && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#FCA5A5',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'left'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            color: '#86EFAC',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'left'
          }}>
            <CheckCircle size={20} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={20} color="#64748B" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              required
              disabled={isVerifying || successMsg !== ''}
              style={{
                width: '100%',
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                color: '#FFFFFF',
                padding: '14px 16px 14px 48px',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#14B8A6'}
              onBlur={(e) => e.target.style.borderColor = '#334155'}
            />
          </div>

          <button
            type="submit"
            disabled={isVerifying || successMsg !== ''}
            style={{
              width: '100%',
              backgroundColor: '#14B8A6',
              color: '#FFFFFF',
              padding: '14px 24px',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              border: 'none',
              cursor: (isVerifying || successMsg !== '') ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.2s, transform 0.1s',
              opacity: (isVerifying || successMsg !== '') ? 0.7 : 1
            }}
            onMouseOver={(e) => { if (!isVerifying && !successMsg) e.target.style.backgroundColor = '#0D9488'; }}
            onMouseOut={(e) => { if (!isVerifying && !successMsg) e.target.style.backgroundColor = '#14B8A6'; }}
            onMouseDown={(e) => { if (!isVerifying && !successMsg) e.target.style.transform = 'scale(0.98)'; }}
            onMouseUp={(e) => { if (!isVerifying && !successMsg) e.target.style.transform = 'scale(1)'; }}
          >
            {isVerifying ? (
              <>
                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                Verifying...
              </>
            ) : successMsg ? (
              'Verified'
            ) : (
              <>
                Access Live Session
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {errorMsg && errorMsg.includes('register first') && (
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #334155' }}>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '16px' }}>Don't have a ticket yet?</p>
            <button
              onClick={() => window.location.hash = '#/workshop'}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #475569',
                color: '#F8FAFC',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              Register Now
            </button>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default WorkshopJoin;
