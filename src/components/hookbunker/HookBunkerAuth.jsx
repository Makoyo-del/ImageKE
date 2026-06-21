import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { supabase } from '../../supabase';
import { BunkerLayout, theme } from './theme';
import './HookBunkerAuth.css';

export function HookBunkerAuth({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authError, setAuthError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [inactivityNotice, setInactivityNotice] = useState('');

  useEffect(() => {
    const reason = sessionStorage.getItem('hb_logout_reason');
    if (reason === 'inactivity') {
      setInactivityNotice('You have been signed out due to inactivity to protect your account security.');
      sessionStorage.removeItem('hb_logout_reason');
    }

    const pendingError = sessionStorage.getItem('hb_auth_error');
    if (pendingError) {
      setAuthError(pendingError);
      sessionStorage.removeItem('hb_auth_error');
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (!email || !password) {
      setAuthError('Please fill in all fields.');
      return;
    }

    // RFC-compliant email address format verification
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError('Please enter a valid email address.');
      return;
    }

    if (authMode === 'signup') {
      // Strong password validation check (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character)
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!strongPasswordRegex.test(password)) {
        setAuthError('Password must be at least 8 characters long, and contain at least one uppercase letter, one lowercase letter, one numeric digit, and one special character (e.g. @$!%*?&).');
        return;
      }

      if (!acceptTerms) {
        setAuthError('You must read and accept the Terms of Service and Privacy Policy to register.');
        return;
      }
    }
    
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthError('Signup successful! Check your email inbox to verify your account and complete registration.');
        setAuthMode('login');
      }
    } catch (err) {
      let msg = err.message || 'An error occurred during authentication.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Incorrect email or password. Please verify your credentials and try again.';
      } else if (msg.includes('Email not confirmed') || msg.includes('Email not verified')) {
        msg = 'Your email address is not verified yet. Please check your inbox and click the confirmation link.';
      } else if (msg.includes('User already registered') || msg.includes('already exists')) {
        msg = 'An account with this email address already exists. Try signing in instead.';
      } else if (msg.includes('Password should be at least')) {
        msg = 'Password must be at least 8 characters long.';
      }
      setAuthError(msg);
    }
  };

  return (
    <BunkerLayout onNavigate={onNavigate}>
      <div className="hb-auth-container">
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <div className="hb-auth-icon-circle">
            <Shield size={28} color={theme.primary} />
          </div>
          <h2 className="hb-auth-title">
            {authMode === 'login' ? 'Welcome back' : 'Create Account'}
          </h2>
          <p className="hb-auth-subtitle">
            {authMode === 'login' ? 'Login to access your project gateways' : 'Sign up to protect your webhook payloads'}
          </p>
        </div>

        {inactivityNotice && (
          <div style={{ 
            background: 'rgba(96, 165, 250, 0.08)', 
            border: '1px solid rgba(96, 165, 250, 0.25)', 
            color: '#60a5fa', 
            padding: '0.85rem 1rem', 
            borderRadius: '10px', 
            fontSize: '0.85rem', 
            marginBottom: '1.5rem', 
            lineHeight: 1.5 
          }}>
            {inactivityNotice}
          </div>
        )}

        {authError && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.25)', 
            color: theme.danger, 
            padding: '0.85rem 1rem', 
            borderRadius: '10px', 
            fontSize: '0.85rem', 
            marginBottom: '1.5rem', 
            lineHeight: 1.5 
          }}>
            {authError}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="hb-form-group">
            <label className="hb-input-label">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="developer@duncanmakoyo.com"
              required
              className="hb-form-input"
            />
          </div>
          <div className="hb-form-group">
            <label className="hb-input-label">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="hb-form-input"
            />
          </div>
          
          {authMode === 'signup' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem', marginBottom: '0.5rem', marginTop: '0.25rem' }}>
              <input 
                type="checkbox" 
                id="accept-terms-checkbox"
                checked={acceptTerms}
                onChange={e => setAcceptTerms(e.target.checked)}
                required
                style={{ marginTop: '4px', cursor: 'pointer', accentColor: theme.primary }}
              />
              <label htmlFor="accept-terms-checkbox" style={{ color: theme.textMuted, cursor: 'pointer', lineHeight: 1.5 }}>
                I accept the{' '}
                <span 
                  onClick={(e) => { e.preventDefault(); window.location.hash = '#/terms'; }} 
                  style={{ color: theme.primary, textDecoration: 'underline', fontWeight: 600 }}
                >
                  Terms of Service
                </span>{' '}
                and{' '}
                <span 
                  onClick={(e) => { e.preventDefault(); window.location.hash = '#/privacy'; }} 
                  style={{ color: theme.primary, textDecoration: 'underline', fontWeight: 600 }}
                >
                  Privacy Policy
                </span>
                .
              </label>
            </div>
          )}

          <button 
            type="submit"
            className="hb-submit-btn"
          >
            {authMode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem' }}>
          <span style={{ color: theme.textMuted }}>
            {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            style={{ background: 'none', border: 'none', color: theme.primary, fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: '0.875rem', textDecoration: 'underline' }}
          >
            {authMode === 'login' ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </BunkerLayout>
  );
}
