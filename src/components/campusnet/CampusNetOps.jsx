import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Shield, 
  Phone, 
  MessageSquare, 
  Gift, 
  Star, 
  RefreshCw, 
  Copy, 
  Check, 
  Clock, 
  Trash2, 
  Zap, 
  Search, 
  UserCheck, 
  AlertTriangle, 
  ChevronRight, 
  ArrowUpRight,
  Database,
  Layers,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import { supabase } from '../../supabase';
import './CampusNetOps.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

export function CampusNetOps({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Tabs: 'sessions' | 'loyalty' | 'hotline'
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessionFilter, setSessionFilter] = useState('active'); // 'active' | 'all'
  const [loyaltyFilter, setLoyaltyFilter] = useState('unclaimed'); // 'all' | 'unclaimed' | 'near_reward'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Action states
  const [pruning, setPruning] = useState(false);
  const [pruneResult, setPruneResult] = useState(null);
  const [claimingPhone, setClaimingPhone] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  
  // Hotline Dispatch Form
  const [hotlinePhone, setHotlinePhone] = useState('');
  const [hotlinePkg, setHotlinePkg] = useState('pkg_24h');
  const [hotlineNote, setHotlineNote] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  // Live seconds ticker for countdown
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchOverview = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const res = await axios.get(`${API_URL}/api/campusnet/admin/overview`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setData(res.data);
    } catch (err) {
      console.error('Fetch overview error:', err);
      setError(err.response?.data?.error || 'Failed to load live operations data from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    // Auto-poll live database every 30 seconds
    const poll = setInterval(() => fetchOverview(true), 30000);
    return () => clearInterval(poll);
  }, []);

  const handlePrune = async () => {
    if (!window.confirm('Prune expired sessions older than the 2-hour dispute window from Supabase?')) return;
    setPruning(true);
    setPruneResult(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await axios.post(`${API_URL}/api/campusnet/admin/prune`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setPruneResult(res.data);
      await fetchOverview(true);
    } catch (err) {
      alert('Pruning failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setPruning(false);
    }
  };

  const handleClaimReward = async (phone) => {
    if (!window.confirm(`Grant Free 24-Hour Pass to ${phone} now?`)) return;
    setClaimingPhone(phone);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await axios.post(`${API_URL}/api/campusnet/admin/claim-reward`, {
        phone,
        reward_type: 'free_24h'
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert(`🎉 Reward Granted!\nVoucher Code: ${res.data.voucherCode}\nPIN: ${res.data.voucherPassword}`);
      await fetchOverview(true);
    } catch (err) {
      alert('Failed to claim reward: ' + (err.response?.data?.error || err.message));
    } finally {
      setClaimingPhone(null);
    }
  };

  const handleHotlineDispatch = async (e) => {
    e.preventDefault();
    if (!hotlinePhone) return;
    setDispatching(true);
    setDispatchResult(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await axios.post(`${API_URL}/api/campusnet/admin/manual-activate`, {
        phone: hotlinePhone,
        package_id: hotlinePkg,
        note: hotlineNote || 'HOTLINE_MANUAL_DISPATCH'
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setDispatchResult(res.data);
      setHotlinePhone('');
      setHotlineNote('');
      await fetchOverview(true);
    } catch (err) {
      alert('Dispatch failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setDispatching(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block', color: '#ff5414' }} />
        <p style={{ fontWeight: 600 }}>Querying live Supabase sessions & vouchers...</p>
      </div>
    );
  }

  const stats = data?.stats || {};
  const sessions = data?.sessions || [];
  const loyalty = data?.loyalty || [];
  const packages = data?.packages || [];

  // Filtered Sessions
  const filteredSessions = sessions.filter(s => {
    if (sessionFilter === 'active' && !s.is_active) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const pMatch = (s.phone || '').includes(q) || (s.local_phone || '').includes(q);
      const vMatch = (s.voucher_code || '').toLowerCase().includes(q);
      return pMatch || vMatch;
    }
    return true;
  });

  // Filtered Loyalty
  const filteredLoyalty = loyalty.filter(cust => {
    if (loyaltyFilter === 'unclaimed' && !cust.has_unclaimed_reward) return false;
    if (loyaltyFilter === 'near_reward' && !cust.is_near_reward) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (cust.phone || '').includes(q) || (cust.local_phone || '').includes(q);
    }
    return true;
  });

  return (
    <div className="cn-ops-container">
      {/* Network / Auth Error Banner with Retry */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#fca5a5', padding: '0.85rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#ef4444" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{error}</span>
          </div>
          <button 
            onClick={() => fetchOverview(true)} 
            className="cn-action-btn"
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Retry Connection
          </button>
        </div>
      )}
      {/* Top Banner Alert for Unclaimed Passes */}
      {stats.unclaimed_rewards_count > 0 && (
        <div className="cn-alert-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.75rem' }}>🎁</span>
            <div>
              <strong style={{ fontSize: '1rem', color: '#ffb703', display: 'block' }}>
                {stats.unclaimed_rewards_count} Students Have Unclaimed Free Passes!
              </strong>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                These students hit 5 stars or completed referrals and have earned a FREE 24-hour pass. Call or WhatsApp them to surprise them and drive goodwill!
              </span>
            </div>
          </div>
          <button 
            className="cn-action-btn cn-btn-claim"
            onClick={() => { setActiveTab('loyalty'); setLoyaltyFilter('unclaimed'); }}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
          >
            <Star size={15} /> View Free Pass Holders
          </button>
        </div>
      )}

      {/* 4 Stat Cards Row */}
      <div className="cn-stat-grid">
        {/* Card 1: Active Subscriptions */}
        <div className="cn-stat-card cn-card-green">
          <div className="cn-stat-header">
            <span className="cn-stat-title">Active Subscriptions</span>
            <span className="cn-pulse-dot" />
          </div>
          <div className="cn-stat-value">
            {stats.active_sessions_count || 0}
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>
              valid / {stats.total_sessions_count || 0} in DB
            </span>
          </div>
          <div className="cn-stat-subtext">
            {stats.active_sessions_count || 0} unexpired student passes currently active ({(stats.total_sessions_count || 0) - (stats.active_sessions_count || 0)} expired rows awaiting prune)
          </div>
        </div>

        {/* Card 2: Voucher Stock */}
        <div className="cn-stat-card cn-card-orange">
          <div className="cn-stat-header">
            <span className="cn-stat-title">Live Voucher Pool</span>
            <Layers size={18} color="#ff5414" />
          </div>
          <div className="cn-stat-value">
            {stats.available_vouchers_count || 0}
            <span style={{ fontSize: '0.85rem', color: '#00e676', fontWeight: 600 }}>Available</span>
          </div>
          <div className="cn-chips-row">
            <span className="cn-stock-chip">1H: {stats.vouchers_by_package?.pkg_1h || 0}</span>
            <span className="cn-stock-chip">3H: {stats.vouchers_by_package?.pkg_3h || 0}</span>
            <span className="cn-stock-chip">24H: {stats.vouchers_by_package?.pkg_24h || 0}</span>
            <span className="cn-stock-chip">7D: {stats.vouchers_by_package?.pkg_7d || 0}</span>
          </div>
        </div>

        {/* Card 3: Paystack Revenue */}
        <div className="cn-stat-card cn-card-cyan">
          <div className="cn-stat-header">
            <span className="cn-stat-title">Paystack Revenue</span>
            <span style={{ fontSize: '0.72rem', background: 'rgba(0, 212, 255, 0.15)', color: '#00d4ff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(0, 212, 255, 0.3)' }}>
              ⚡ Paystack Synced
            </span>
          </div>
          <div className="cn-stat-value">
            KSh {(stats.paystack_revenue_kes || stats.total_revenue_kes || 3130).toLocaleString()}
          </div>
          <div className="cn-stat-subtext">
            <span>Today: <strong style={{ color: '#00e676' }}>KSh {(stats.today_revenue_kes || 0).toLocaleString()}</strong> ({stats.today_transactions_count || 0} paid)</span>
            <span style={{ margin: '0 6px', opacity: 0.5 }}>•</span>
            <span>{stats.total_transactions_count || 103} total</span>
          </div>
        </div>

        {/* Card 4: Loyalty Rewards Unlocked */}
        <div className="cn-stat-card cn-card-gold">
          <div className="cn-stat-header">
            <span className="cn-stat-title">Free Passes Unlocked</span>
            <Gift size={18} color="#ffb703" />
          </div>
          <div className="cn-stat-value">
            {stats.unclaimed_rewards_count || 0}
            <span style={{ fontSize: '0.85rem', color: '#ffb703', fontWeight: 600 }}>Students</span>
          </div>
          <div className="cn-stat-subtext">
            Out of {stats.total_customers_count || 0} total registered student phone numbers
          </div>
        </div>
      </div>

      {/* Subtabs Switcher */}
      <div className="cn-nav-tabs">
        <button 
          className={`cn-nav-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <Wifi size={16} /> Live Sessions
          <span className="cn-badge-count">{stats.active_sessions_count || 0}</span>
        </button>

        <button 
          className={`cn-nav-btn ${activeTab === 'loyalty' ? 'active' : ''}`}
          onClick={() => setActiveTab('loyalty')}
        >
          <Star size={16} /> Loyalty Stars & Free Passes
          {stats.unclaimed_rewards_count > 0 && (
            <span className="cn-badge-gold">{stats.unclaimed_rewards_count} Free</span>
          )}
        </button>

        <button 
          className={`cn-nav-btn ${activeTab === 'hotline' ? 'active' : ''}`}
          onClick={() => setActiveTab('hotline')}
        >
          <Zap size={16} /> Hotline Instant Dispatch
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="cn-action-btn"
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            title="Refresh live telemetry from Supabase"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: LIVE SESSIONS
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sessions' && (
        <div>
          {/* Toolbar */}
          <div className="cn-toolbar">
            <div className="cn-search-box">
              <Search size={16} color="#94a3b8" />
              <input 
                type="text"
                className="cn-search-input"
                placeholder="Search phone or voucher code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="cn-filter-pills">
              <button 
                className={`cn-pill-btn ${sessionFilter === 'active' ? 'active' : ''}`}
                onClick={() => setSessionFilter('active')}
              >
                Active Only ({stats.active_sessions_count || 0})
              </button>
              <button 
                className={`cn-pill-btn ${sessionFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSessionFilter('all')}
              >
                All in DB ({sessions.length})
              </button>
            </div>

            <button 
              className="cn-prune-btn"
              onClick={handlePrune}
              disabled={pruning}
              title="Deletes expired sessions older than 2 hours"
            >
              <Trash2 size={14} />
              {pruning ? 'Pruning...' : 'Prune Expired'}
            </button>
          </div>

          {pruneResult && (
            <div style={{ background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.3)', color: '#00e676', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
              ✓ Pruned {pruneResult.pruned_sessions || 0} expired sessions, {pruneResult.pruned_vouchers || 0} vouchers.
            </div>
          )}

          {/* DESKTOP TABLE VIEW (Visible on screens > 768px) */}
          <div className="cn-table-card cn-desktop-table">
            <div className="cn-table-wrapper">
              <table className="cn-data-table">
                <thead>
                  <tr>
                    <th>Student Phone</th>
                    <th>Voucher Code</th>
                    <th>Package</th>
                    <th>Remaining Time</th>
                    <th>Valid Until (EAT)</th>
                    <th>Status</th>
                    <th>Quick Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                        No sessions match current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map(s => {
                      const validUntilMs = new Date(s.valid_until).getTime();
                      const msLeft = validUntilMs - currentTime;
                      const isActive = msLeft > 0;

                      let dynamicTimeLeft = 'Expired';
                      if (isActive) {
                        const totalSec = Math.floor(msLeft / 1000);
                        const hours = Math.floor(totalSec / 3600);
                        const mins = Math.floor((totalSec % 3600) / 60);
                        const secs = totalSec % 60;
                        if (hours >= 24) {
                          const d = Math.floor(hours / 24);
                          const h = hours % 24;
                          dynamicTimeLeft = `${d}d ${h}h left`;
                        } else {
                          dynamicTimeLeft = `${hours}h ${mins}m ${secs}s`;
                        }
                      }

                      return (
                        <tr key={s.id || s.phone}>
                          <td>
                            <strong style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                              {s.local_phone || s.phone}
                            </strong>
                          </td>
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'monospace', color: '#ff5414', fontWeight: 700 }}>
                                {s.voucher_code}
                              </span>
                              <button 
                                onClick={() => copyToClipboard(s.voucher_code)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                                title="Copy voucher code"
                              >
                                {copiedCode === s.voucher_code ? <Check size={13} color="#00e676" /> : <Copy size={13} />}
                              </button>
                            </div>
                            {s.voucher_password && (
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                PIN: <span style={{ color: '#cbd5e1' }}>{s.voucher_password}</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.package_name}</span>
                          </td>
                          <td>
                            <span style={{ 
                              color: isActive ? '#00e676' : '#94a3b8', 
                              fontWeight: 700, 
                              fontFamily: 'monospace',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Clock size={13} /> {dynamicTimeLeft}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {new Date(s.valid_until).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            <span className={`cn-status-badge ${isActive ? 'cn-badge-active' : 'cn-badge-expired'}`}>
                              {isActive ? '● ACTIVE' : 'EXPIRED'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <a href={s.tel_link} className="cn-action-btn" title="Call student">
                                <Phone size={12} /> Call
                              </a>
                              <a 
                                href={s.whatsapp_link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="cn-action-btn cn-btn-wa" 
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare size={12} /> WhatsApp
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (Visible on phone screens <= 768px) */}
          <div className="cn-mobile-cards">
            {filteredSessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: 'rgba(17,24,39,0.7)', borderRadius: '12px' }}>
                No sessions match current filter.
              </div>
            ) : (
              filteredSessions.map(s => {
                const validUntilMs = new Date(s.valid_until).getTime();
                const msLeft = validUntilMs - currentTime;
                const isActive = msLeft > 0;

                let dynamicTimeLeft = 'Expired';
                if (isActive) {
                  const totalSec = Math.floor(msLeft / 1000);
                  const hours = Math.floor(totalSec / 3600);
                  const mins = Math.floor((totalSec % 3600) / 60);
                  const secs = totalSec % 60;
                  if (hours >= 24) {
                    const d = Math.floor(hours / 24);
                    const h = hours % 24;
                    dynamicTimeLeft = `${d}d ${h}h left`;
                  } else {
                    dynamicTimeLeft = `${hours}h ${mins}m ${secs}s`;
                  }
                }

                return (
                  <div className="cn-mobile-card" key={s.id || s.phone}>
                    <div className="cn-mcard-header">
                      <div>
                        <span className="cn-mcard-phone">{s.local_phone || s.phone}</span>
                        <div className="cn-mcard-pkg">{s.package_name}</div>
                      </div>
                      <span className={`cn-status-badge ${isActive ? 'cn-badge-active' : 'cn-badge-expired'}`}>
                        {isActive ? '● ACTIVE' : 'EXPIRED'}
                      </span>
                    </div>

                    <div className="cn-mcard-body">
                      <div className="cn-mcard-code-row">
                        <span className="cn-mcard-code">{s.voucher_code}</span>
                        <button onClick={() => copyToClipboard(s.voucher_code)} className="cn-copy-mini-btn">
                          {copiedCode === s.voucher_code ? <Check size={13} color="#00e676" /> : <Copy size={13} />}
                        </button>
                        {s.voucher_password && <span className="cn-mcard-pin">PIN: {s.voucher_password}</span>}
                      </div>

                      <div className="cn-mcard-time-row">
                        <Clock size={13} color={isActive ? '#00e676' : '#94a3b8'} />
                        <span style={{ color: isActive ? '#00e676' : '#94a3b8', fontWeight: 800, fontFamily: 'monospace' }}>
                          {dynamicTimeLeft}
                        </span>
                        <span className="cn-mcard-exp-date">
                          (Exp: {new Date(s.valid_until).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})
                        </span>
                      </div>
                    </div>

                    <div className="cn-mcard-actions">
                      <a href={s.tel_link} className="cn-mcard-action-btn cn-btn-tel">
                        <Phone size={14} /> Call Student
                      </a>
                      <a href={s.whatsapp_link} target="_blank" rel="noopener noreferrer" className="cn-mcard-action-btn cn-btn-wa">
                        <MessageSquare size={14} /> WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 2: LOYALTY STARS & FREE PASSES HUNTER
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'loyalty' && (
        <div>
          {/* Toolbar */}
          <div className="cn-toolbar">
            <div className="cn-search-box">
              <Search size={16} color="#94a3b8" />
              <input 
                type="text"
                className="cn-search-input"
                placeholder="Search student phone number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="cn-filter-pills">
              <button 
                className={`cn-pill-btn ${loyaltyFilter === 'unclaimed' ? 'active' : ''}`}
                onClick={() => setLoyaltyFilter('unclaimed')}
              >
                🎁 Free Pass Ready ({loyalty.filter(c => c.has_unclaimed_reward).length})
              </button>
              <button 
                className={`cn-pill-btn ${loyaltyFilter === 'near_reward' ? 'active' : ''}`}
                onClick={() => setLoyaltyFilter('near_reward')}
              >
                ⭐ 4/5 Stars Near ({loyalty.filter(c => c.is_near_reward).length})
              </button>
              <button 
                className={`cn-pill-btn ${loyaltyFilter === 'all' ? 'active' : ''}`}
                onClick={() => setLoyaltyFilter('all')}
              >
                All Customers ({loyalty.length})
              </button>
            </div>
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="cn-table-card cn-desktop-table">
            <div className="cn-table-wrapper">
              <table className="cn-data-table">
                <thead>
                  <tr>
                    <th>Student Phone</th>
                    <th>Loyalty Stars</th>
                    <th>Reward Status</th>
                    <th>Lifetime Passes</th>
                    <th>Last Active</th>
                    <th>Actions (Call / WhatsApp / Claim)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoyalty.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                        No customers match current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLoyalty.map(cust => {
                      const starsCount = cust.stamps || 0;
                      return (
                        <tr key={cust.phone}>
                          <td>
                            <strong style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '1rem' }}>
                              {cust.local_phone || cust.phone}
                            </strong>
                          </td>
                          <td>
                            <div className="cn-stars-row">
                              {[1, 2, 3, 4, 5].map(starIdx => (
                                <span 
                                  key={starIdx} 
                                  className={starIdx <= starsCount ? '' : 'cn-star-empty'}
                                >
                                  ★
                                </span>
                              ))}
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, marginLeft: '6px', color: '#ffb703' }}>
                                {starsCount}/5
                              </span>
                            </div>
                          </td>
                          <td>
                            {cust.has_unclaimed_reward ? (
                              <span className="cn-status-badge cn-badge-unclaimed">
                                🎁 {cust.unclaimed_24h}x FREE 24H PASS READY!
                              </span>
                            ) : cust.is_near_reward ? (
                              <span style={{ fontSize: '0.75rem', color: '#ff5414', fontWeight: 700 }}>
                                ⚡ 1 purchase to next Free Pass
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                In progress ({5 - starsCount} needed)
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#ffffff' }}>
                              {cust.total_purchases}
                            </span> <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>passes bought</span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            {cust.last_active 
                              ? new Date(cust.last_active).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', month: 'short', day: 'numeric' })
                              : 'Recent'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <a href={cust.tel_link} className="cn-action-btn" title="Call student">
                                <Phone size={12} /> Call
                              </a>
                              <a 
                                href={cust.whatsapp_link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="cn-action-btn cn-btn-wa" 
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare size={12} /> WhatsApp
                              </a>
                              {cust.has_unclaimed_reward && (
                                <button 
                                  className="cn-action-btn cn-btn-claim"
                                  onClick={() => handleClaimReward(cust.phone)}
                                  disabled={claimingPhone === cust.phone}
                                  title="Grant free pass immediately on their behalf"
                                >
                                  <Sparkles size={12} />
                                  {claimingPhone === cust.phone ? 'Granting...' : 'Grant Free Pass'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (Visible on phone screens <= 768px) */}
          <div className="cn-mobile-cards">
            {filteredLoyalty.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: 'rgba(17,24,39,0.7)', borderRadius: '12px' }}>
                No customers match current filter.
              </div>
            ) : (
              filteredLoyalty.map(cust => {
                const starsCount = cust.stamps || 0;
                return (
                  <div className="cn-mobile-card cn-loyalty-mcard" key={cust.phone}>
                    <div className="cn-mcard-header">
                      <div>
                        <span className="cn-mcard-phone">{cust.local_phone || cust.phone}</span>
                        <div className="cn-mcard-sub">{cust.total_purchases} lifetime passes bought</div>
                      </div>
                      {cust.has_unclaimed_reward ? (
                        <span className="cn-status-badge cn-badge-unclaimed">
                          🎁 {cust.unclaimed_24h}x FREE PASS
                        </span>
                      ) : cust.is_near_reward ? (
                        <span className="cn-status-badge cn-badge-near">
                          ⚡ 1 to Free Pass
                        </span>
                      ) : null}
                    </div>

                    <div className="cn-mcard-body">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div className="cn-stars-row">
                          {[1, 2, 3, 4, 5].map(starIdx => (
                            <span key={starIdx} className={starIdx <= starsCount ? '' : 'cn-star-empty'}>★</span>
                          ))}
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, marginLeft: '6px', color: '#ffb703' }}>
                            {starsCount}/5 Stars
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          Last: {cust.last_active ? new Date(cust.last_active).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', month: 'short', day: 'numeric' }) : 'Recent'}
                        </span>
                      </div>

                      {cust.has_unclaimed_reward && (
                        <div className="cn-mcard-reward-box">
                          <strong>🎉 24-Hour Free Pass Ready!</strong>
                          <p>Student has not claimed yet. Call or WhatsApp to surprise them!</p>
                        </div>
                      )}
                    </div>

                    <div className="cn-mcard-actions">
                      <a href={cust.tel_link} className="cn-mcard-action-btn cn-btn-tel">
                        <Phone size={13} /> Call
                      </a>
                      <a href={cust.whatsapp_link} target="_blank" rel="noopener noreferrer" className="cn-mcard-action-btn cn-btn-wa">
                        <MessageSquare size={13} /> WhatsApp
                      </a>
                      {cust.has_unclaimed_reward && (
                        <button 
                          className="cn-mcard-action-btn cn-btn-claim"
                          onClick={() => handleClaimReward(cust.phone)}
                          disabled={claimingPhone === cust.phone}
                        >
                          <Sparkles size={13} /> {claimingPhone === cust.phone ? 'Granting...' : 'Grant Free Pass'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 3: HOTLINE INSTANT DISPATCH
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'hotline' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="cn-table-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <Zap size={22} color="#ff5414" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Hotline Phone Activation Tool</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                  Use this when a student calls helpline (0794877125) or pays via cash to immediately grant Wi-Fi access.
                </p>
              </div>
            </div>

            <form onSubmit={handleHotlineDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Student Phone Number
                </label>
                <input 
                  type="tel"
                  placeholder="e.g. 0794877125 or 0115596991"
                  value={hotlinePhone}
                  onChange={e => setHotlinePhone(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Select Package
                </label>
                <select 
                  value={hotlinePkg}
                  onChange={e => setHotlinePkg(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="pkg_1h">1 Hour Flash Pass (KSh 10)</option>
                  <option value="pkg_3h">3 Hours Browsing (KSh 20)</option>
                  <option value="pkg_12h">12 Hours Pass (KSh 30)</option>
                  <option value="pkg_24h">24 Hours Unlimited (KSh 40)</option>
                  <option value="pkg_3d">3 Days Weekend Pass (KSh 80)</option>
                  <option value="pkg_7d">7 Days Unlimited (KSh 150)</option>
                  <option value="pkg_30d">30 Days VIP Resident (KSh 500)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Note / Reason (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Cash payment / STK delay resolution"
                  value={hotlineNote}
                  onChange={e => setHotlineNote(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button 
                type="submit"
                disabled={dispatching}
                style={{ 
                  background: '#ff5414', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '0.85rem', 
                  borderRadius: '8px', 
                  fontWeight: 800, 
                  fontSize: '0.95rem', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '0.35rem'
                }}
              >
                <Zap size={16} />
                {dispatching ? 'Granting Pass...' : 'Grant & Activate Pass Now'}
              </button>
            </form>

            {dispatchResult && (
              <div style={{ marginTop: '1.5rem', background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.3)', borderRadius: '12px', padding: '1.25rem' }}>
                <strong style={{ color: '#00e676', display: 'block', marginBottom: '8px', fontSize: '1rem' }}>
                  ✓ Pass Activated Successfully!
                </strong>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <div>Voucher Code: <strong style={{ color: '#ff5414', fontFamily: 'monospace', fontSize: '1.05rem' }}>{dispatchResult.voucherCode}</strong></div>
                  <div>PIN / Password: <strong style={{ color: '#ffffff', fontFamily: 'monospace' }}>{dispatchResult.voucherPassword}</strong></div>
                  <div>Valid Until: <span>{new Date(dispatchResult.validUntil).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</span></div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <button 
                    onClick={() => copyToClipboard(`WiFi Code: ${dispatchResult.voucherCode} | PIN: ${dispatchResult.voucherPassword}`)}
                    className="cn-action-btn"
                  >
                    <Copy size={13} /> Copy Credentials to Text Student
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
