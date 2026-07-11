import React, { useState } from 'react';
import { supabase } from '../../supabase';
import { Loader2, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

const RiderLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Verify role is rider
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileErr || profile?.role !== 'rider') {
        await supabase.auth.signOut();
        throw new Error('Unauthorized. Not a rider account.');
      }

      window.location.hash = '#/rider-dashboard';
    } catch (err) {
      setError(err.message || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--dm-bg)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1.5rem',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'var(--dm-white)',
        borderRadius: 'var(--dm-radius-lg)',
        padding: '2.5rem 2rem',
        boxShadow: 'var(--dm-shadow-lg)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            backgroundColor: 'var(--dm-primary)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Lock size={28} color="#fff" />
          </div>
          <h1 style={{ 
            color: 'var(--dm-navy)', 
            fontSize: '1.75rem', 
            fontWeight: 800, 
            marginBottom: '0.5rem',
            fontFamily: 'Montserrat, sans-serif'
          }}>
            Rider Portal
          </h1>
          <p style={{ color: 'var(--dm-slate-400)', fontSize: '0.95rem' }}>
            Sign in to manage your collections
          </p>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#FEE2E2', 
            color: '#991B1B', 
            padding: '0.75rem 1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            border: '1px solid #FCA5A5'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dm-navy)', fontWeight: 600, fontSize: '0.9rem' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dm-slate-400)' }}>
                <Mail size={18} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dm-border)',
                  outline: 'none',
                  fontSize: '1rem',
                  color: 'var(--dm-text)'
                }}
                placeholder="rider@example.com"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--dm-navy)', fontWeight: 600, fontSize: '0.9rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dm-slate-400)', zIndex: 1 }}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 2.5rem 0.85rem 2.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--dm-border)',
                  outline: 'none',
                  fontSize: '1rem',
                  color: 'var(--dm-text)'
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--dm-slate-400)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              backgroundColor: 'var(--dm-primary)',
              color: 'var(--dm-white)',
              padding: '0.85rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '1.05rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s',
              opacity: loading ? 0.8 : 1
            }}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : (
              <>
                Sign In <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default RiderLogin;
