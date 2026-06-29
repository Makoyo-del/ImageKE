import React, { useState } from 'react';
import { supabase } from '../../supabase';
import { Eye, EyeOff } from 'lucide-react';
import './AcademyAuth.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

export default function AcademyAuth({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authError, setAuthError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setMessage('');
    setLoading(true);

    if (!email || !password) {
      setAuthError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      if (authMode === 'login') {
        const res = await fetch(`${API_URL}/api/academy/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Login failed. Please verify your credentials.');
        }

        const { error } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (error) throw error;
        if (onAuthSuccess) onAuthSuccess();
      } else {
        // Registration is handled entirely on the backend.
        // This bypasses Supabase's own email template (which is branded for HookBunker)
        // and sends a proper Academy-branded welcome email via Resend instead.
        const res = await fetch(`${API_URL}/api/academy/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed. Please try again.');
        }
        setMessage('Account created! You can now sign in below.');
        setAuthMode('login');
      }
    } catch (err) {
      let msg = err.message || 'An error occurred during authentication.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Incorrect email or password. Please verify your credentials.';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Please verify your email address. Check your inbox for the confirmation link.';
      } else if (msg.includes('already exists') || msg.includes('already registered')) {
        msg = 'An account with this email already exists. Try signing in.';
      }
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ac-auth-wrapper">
      <div className="ac-auth-card">
        <div className="ac-auth-header">
          <h2 className="ac-auth-title">
            {authMode === 'login' ? 'Academy Sign In' : 'Academy Register'}
          </h2>
          <p className="ac-auth-subtitle">
            {authMode === 'login' 
              ? 'Access your outcomes-focused learning dashboard' 
              : 'Create an account to begin your career accelerator'
            }
          </p>
        </div>

        {authError && <div className="ac-auth-alert error">{authError}</div>}
        {message && <div className="ac-auth-alert success">{message}</div>}

        <form onSubmit={handleAuth} className="ac-auth-form">
          <div className="ac-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="ac-form-group">
            <label htmlFor="password">Password</label>
            <div className="ac-password-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="ac-password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {authMode === 'signup' && (
            <div className="ac-terms-wrapper">
              <p className="ac-terms-text">
                By registering, you agree to the{' '}
                <a 
                  href="#/terms" 
                  onClick={(e) => { e.preventDefault(); window.open('#/terms', '_blank'); }}
                >
                  Terms of Use
                </a>{' '}
                and{' '}
                <a 
                  href="#/privacy" 
                  onClick={(e) => { e.preventDefault(); window.open('#/privacy', '_blank'); }}
                >
                  Privacy Policy
                </a>. We prepare candidates for success but do not guarantee employment or placement outcomes.
              </p>
            </div>
          )}

          <button type="submit" className="ac-auth-btn" disabled={loading}>
            {loading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Register'}
          </button>
        </form>

        <div className="ac-auth-footer">
          {authMode === 'login' ? (
            <p>
              New to the academy?{' '}
              <button onClick={() => setAuthMode('signup')} className="ac-toggle-btn">
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button onClick={() => setAuthMode('login')} className="ac-toggle-btn">
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
