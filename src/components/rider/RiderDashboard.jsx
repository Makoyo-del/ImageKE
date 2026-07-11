import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { LogOut, DollarSign, Smartphone, Loader2, CheckCircle, TrendingUp, Calendar, Clock } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

const RiderDashboard = () => {
  const [session, setSession] = useState(null);
  const [riderInfo, setRiderInfo] = useState(null);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [cashLoading, setCashLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0 });
  const [paymentOverlay, setPaymentOverlay] = useState(null); // null or { status: 'waiting' | 'success' | 'failed' | 'timeout', phone, amount }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.hash = '#/rider-login';
      } else {
        setSession(session);
        fetchRiderInfo(session.user.id);
        fetchStats(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) window.location.hash = '#/rider-login';
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRiderInfo = async (userId) => {
    const { data } = await supabase.from('riders').select('*').eq('id', userId).single();
    if (data) setRiderInfo(data);
  };

  const fetchStats = async (userId) => {
    const now = new Date();
    
    // Today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    // Week (Sunday start)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    const startOfWeekISO = startOfWeek.toISOString();
    
    // Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data } = await supabase
      .from('fare_collections')
      .select('amount, status, created_at')
      .eq('rider_id', userId)
      .eq('status', 'success');

    if (data) {
      let t = 0, w = 0, m = 0;
      data.forEach(col => {
        if (col.created_at >= startOfToday) t += Number(col.amount);
        if (col.created_at >= startOfWeekISO) w += Number(col.amount);
        if (col.created_at >= startOfMonth) m += Number(col.amount);
      });
      setStats({ today: t, week: w, month: m });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const startPaymentPolling = (collectionId, phoneVal, amountVal) => {
    setPaymentOverlay({ status: 'waiting', phone: phoneVal, amount: amountVal });
    
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const { data, error } = await supabase
          .from('fare_collections')
          .select('status')
          .eq('id', collectionId)
          .single();
          
        if (data) {
          if (data.status === 'success') {
            clearInterval(interval);
            setPaymentOverlay({ status: 'success', phone: phoneVal, amount: amountVal });
            fetchStats(session.user.id); // Update stats instantly
            // Auto close after 3 seconds
            setTimeout(() => setPaymentOverlay(null), 3000);
          } else if (data.status === 'failed') {
            clearInterval(interval);
            setPaymentOverlay({ status: 'failed', phone: phoneVal, amount: amountVal });
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
      
      if (attempts >= 30) { // 60 seconds max
        clearInterval(interval);
        setPaymentOverlay({ status: 'timeout', phone: phoneVal, amount: amountVal });
      }
    }, 2000);
  };

  const triggerSTK = async (e) => {
    e.preventDefault();
    if (!phone || !amount) return;
    
    // Format phone: assuming Kenyan 07... or 254... 
    let formattedPhone = phone.replace(/\s+/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    else if (formattedPhone.startsWith('+254')) formattedPhone = formattedPhone.substring(1);
    
    setLoading(true);
    setMessage(null);
    try {
      const res = await axios.post(`${API_URL}/api/rider/charge`, {
        phone: formattedPhone,
        amount: Number(amount)
      }, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      const collectionId = res.data.collection.id;
      setPhone('');
      setAmount('');
      
      // Start real-time polling to wait for PIN entry
      startPaymentPolling(collectionId, formattedPhone, Number(amount));
    } catch (err) {
      console.error(err);
      showMessage('error', err.response?.data?.error || 'Failed to trigger M-Pesa. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  const recordCash = async () => {
    if (!amount) {
      showMessage('error', 'Enter amount for cash payment');
      return;
    }
    
    setCashLoading(true);
    setMessage(null);
    try {
      await axios.post(`${API_URL}/api/rider/cash`, {
        amount: Number(amount)
      }, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      showMessage('success', 'Cash payment recorded!');
      setAmount('');
      fetchStats(session.user.id);
    } catch (err) {
      showMessage('error', 'Failed to record cash payment.');
    } finally {
      setCashLoading(false);
    }
  };

  if (!session) return <div style={{ height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--dm-bg)' }}><Loader2 className="animate-spin" size={32} color="var(--dm-primary)" /></div>;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--dm-bg)',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'var(--dm-navy)',
        padding: '1rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div>
          <h1 style={{ color: 'var(--dm-white)', fontSize: '1.25rem', margin: 0, fontFamily: 'Montserrat, sans-serif' }}>
            Rider Dashboard
          </h1>
          {riderInfo && <p style={{ color: 'var(--dm-slate-400)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>{riderInfo.name}</p>}
        </div>
        <button 
          onClick={handleLogout}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--dm-slate-400)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            cursor: 'pointer'
          }}
        >
          <LogOut size={20} />
        </button>
      </header>

      <main style={{ padding: '1.25rem', maxWidth: '500px', margin: '0 auto' }}>
        
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--dm-white)', padding: '1rem', borderRadius: '12px', boxShadow: 'var(--dm-shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--dm-slate-400)', marginBottom: '0.25rem' }}>
              <Clock size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>TODAY</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dm-primary)' }}>
              KES {stats.today.toLocaleString()}
            </div>
          </div>
          <div style={{ background: 'var(--dm-white)', padding: '1rem', borderRadius: '12px', boxShadow: 'var(--dm-shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--dm-slate-400)', marginBottom: '0.25rem' }}>
              <TrendingUp size={16} /> <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>THIS WEEK</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dm-navy)' }}>
              KES {stats.week.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div style={{ 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEE2E2',
            color: message.type === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${message.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
            fontSize: '0.9rem'
          }}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <div style={{width: 20}} />}
            {message.text}
          </div>
        )}

        {/* Action Form */}
        <div style={{ background: 'var(--dm-white)', padding: '1.5rem', borderRadius: '16px', boxShadow: 'var(--dm-shadow-md)' }}>
          <h2 style={{ fontSize: '1.1rem', color: 'var(--dm-navy)', marginBottom: '1.25rem', fontWeight: 700 }}>New Fare Collection</h2>
          
          <form onSubmit={triggerSTK}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dm-slate-400)', marginBottom: '0.4rem' }}>Amount (KES)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--dm-text)', fontWeight: 700 }}>KES</span>
                <input 
                  type="number" 
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', fontSize: '1.2rem', fontWeight: 700, borderRadius: '12px', border: '2px solid var(--dm-border)', outline: 'none' }}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--dm-slate-400)', marginBottom: '0.4rem' }}>Passenger Phone (for M-Pesa)</label>
              <div style={{ position: 'relative' }}>
                <Smartphone style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--dm-slate-400)' }} size={20} />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '1rem 1rem 1rem 2.75rem', fontSize: '1.1rem', borderRadius: '12px', border: '2px solid var(--dm-border)', outline: 'none' }}
                  placeholder="07XX XXX XXX"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                type="submit"
                disabled={loading}
                style={{ 
                  background: 'var(--dm-success)', 
                  color: 'white', 
                  padding: '1.1rem', 
                  borderRadius: '12px', 
                  border: 'none', 
                  fontSize: '1.1rem', 
                  fontWeight: 800, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.8 : 1
                }}
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <><Smartphone size={24} /> Request M-Pesa</>}
              </button>

              <div style={{ textAlign: 'center', color: 'var(--dm-slate-400)', fontSize: '0.8rem', fontWeight: 600, margin: '0.25rem 0' }}>OR</div>

              <button 
                type="button"
                onClick={recordCash}
                disabled={cashLoading}
                style={{ 
                  background: 'var(--dm-bg)', 
                  color: 'var(--dm-navy)', 
                  padding: '1.1rem', 
                  borderRadius: '12px', 
                  border: '2px solid var(--dm-navy)', 
                  fontSize: '1rem', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: cashLoading ? 'not-allowed' : 'pointer',
                  opacity: cashLoading ? 0.8 : 1
                }}
              >
                {cashLoading ? <Loader2 className="animate-spin" size={20} /> : <><DollarSign size={20} /> Collect Cash</>}
              </button>
            </div>
          </form>

        </div>
      </main>

      {/* Fullscreen Payment Status Overlay */}
      {paymentOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1.5rem',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '380px',
            backgroundColor: 'var(--dm-white)',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {paymentOverlay.status === 'waiting' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                <Loader2 className="animate-spin" size={54} color="var(--dm-primary)" />
                <h3 style={{ margin: 0, color: 'var(--dm-navy)', fontSize: '1.3rem', fontWeight: 800 }}>Requesting M-Pesa</h3>
                <p style={{ margin: 0, color: 'var(--dm-slate-400)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                  STK prompt sent to <strong style={{ color: 'var(--dm-navy)' }}>+{paymentOverlay.phone}</strong>
                </p>
                <p style={{ margin: 0, color: 'var(--dm-navy)', fontSize: '1.1rem', fontWeight: 700 }}>
                  Amount: KES {paymentOverlay.amount.toLocaleString()}
                </p>
                <p style={{ margin: 0, color: 'var(--dm-slate-400)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  Please tell the passenger to enter their M-Pesa PIN on their phone.
                </p>
              </div>
            )}

            {paymentOverlay.status === 'success' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                <CheckCircle size={64} color="var(--dm-success)" />
                <h3 style={{ margin: 0, color: 'var(--dm-navy)', fontSize: '1.4rem', fontWeight: 800 }}>Payment Successful</h3>
                <p style={{ margin: 0, color: 'var(--dm-slate-400)', fontSize: '0.95rem' }}>
                  Transaction confirmed in real-time.
                </p>
                <p style={{ margin: 0, color: 'var(--dm-success)', fontSize: '1.3rem', fontWeight: 800 }}>
                  KES {paymentOverlay.amount.toLocaleString()} Collected
                </p>
              </div>
            )}

            {paymentOverlay.status === 'failed' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ color: '#EF4444', fontSize: '2rem', fontWeight: 800 }}>×</span>
                </div>
                <h3 style={{ margin: 0, color: 'var(--dm-navy)', fontSize: '1.3rem', fontWeight: 800 }}>Payment Failed</h3>
                <p style={{ margin: 0, color: 'var(--dm-slate-400)', fontSize: '0.95rem', lineHeight: 1.4 }}>
                  The customer cancelled the prompt, entered a wrong PIN, or had insufficient funds.
                </p>
                <button
                  onClick={() => setPaymentOverlay(null)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--dm-navy)',
                    color: 'white',
                    padding: '0.85rem',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '0.5rem'
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}

            {paymentOverlay.status === 'timeout' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ color: '#D97706', fontSize: '2rem', fontWeight: 800 }}>!</span>
                </div>
                <h3 style={{ margin: 0, color: 'var(--dm-navy)', fontSize: '1.3rem', fontWeight: 800 }}>No Response Yet</h3>
                <p style={{ margin: 0, color: 'var(--dm-slate-400)', fontSize: '0.95rem', lineHeight: 1.4 }}>
                  The prompt timed out. Please check if the customer completed the payment on their phone, or try requesting again.
                </p>
                <button
                  onClick={() => setPaymentOverlay(null)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--dm-navy)',
                    color: 'white',
                    padding: '0.85rem',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '0.5rem'
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default RiderDashboard;
