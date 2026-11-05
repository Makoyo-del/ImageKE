import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Calendar,
  Shield,
  Phone,
  MessageSquare,
  Gift,
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
  CheckCircle2,
  XCircle,
  Clock3,
  TrendingUp,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { supabase } from '../../supabase';
import './CampusNetOps.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

const getAuthHeaders = async () => {
  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (err) {
    console.warn('Could not read Supabase session:', err);
  }
  const fallback = import.meta.env.VITE_CAMPUSNET_ADMIN_SECRET;
  if (fallback) {
    return { Authorization: `Bearer ${fallback}` };
  }
  return {};
};

export function CampusNetOps({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Tabs: 'sessions' | 'transactions' | 'hotline'
  const [activeTab, setActiveTab] = useState('sessions');
  const [revenueFilter, setRevenueFilter] = useState('all'); // 'today' | 'week' | 'month' | 'all'
  const [sessionFilter, setSessionFilter] = useState('active'); // 'active' | 'all'
  const [txFilter, setTxFilter] = useState('all'); // 'all' | 'unrecovered' | 'failed' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  // Action states
  const [pruning, setPruning] = useState(false);
  const [pruneResult, setPruneResult] = useState(null);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // ─── Hotline Dispatch Form ─────────────────────────────────────────────────
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
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_URL}/api/campusnet/admin/overview`, { headers });
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
    // Auto-poll only when tab is visible, throttled to 60s
    const poll = setInterval(() => {
      if (!document.hidden) {
        fetchOverview(true);
      }
    }, 60000);
    return () => clearInterval(poll);
  }, []);

  const handlePrune = async () => {
    if (!window.confirm('Prune expired sessions older than the 2-hour dispute window from Supabase?')) return;
    setPruning(true);
    setPruneResult(null);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.post(`${API_URL}/api/campusnet/admin/prune`, {}, { headers });
      setPruneResult(res.data);
      await fetchOverview(true);
    } catch (err) {
      alert('Pruning failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setPruning(false);
    }
  };

  const handleReconcilePaystack = async () => {
    setReconciling(true);
    setReconcileResult(null);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.post(`${API_URL}/api/campusnet/admin/reconcile-paystack`, {}, { headers });
      setReconcileResult(res.data);
      await fetchOverview(true);
    } catch (err) {
      alert('Reconciliation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setReconciling(false);
    }
  };

  const handleHotlineDispatch = async (e) => {
    e.preventDefault();
    if (!hotlinePhone) return;
    setDispatching(true);
    setDispatchResult(null);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.post(`${API_URL}/api/campusnet/admin/manual-activate`, {
        phone: hotlinePhone,
        package_id: hotlinePkg,
        reason: hotlineNote || 'Hotline Phone Activation'
      }, { headers });
      setDispatchResult(res.data);
      setHotlinePhone('');
      setHotlineNote('');
      await fetchOverview(true);
    } catch (err) {
      alert('Activation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setDispatching(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading && !data) {
    return (
      <div className="cn-loading-container">
        <RefreshCw size={32} className="animate-spin" color="#ff5414" />
        <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>
          Connecting to Makoyocart Wi-Fi Engine...
        </p>
      </div>
    );
  }

  const stats = data?.stats || {};
  const sessions = data?.sessions || [];
  const conversion = stats.conversion_metrics || {};
  const recentTransactions = data?.recent_transactions || [];

  // Filter Sessions
  const filteredSessions = sessions.filter(s => {
    if (sessionFilter === 'active' && !s.is_active) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (s.phone && s.phone.includes(q)) ||
             (s.local_phone && s.local_phone.includes(q)) ||
             (s.voucher_code && s.voucher_code.toLowerCase().includes(q));
    }
    return true;
  });

  // Filter Transactions
  const filteredTransactions = recentTransactions.filter(tx => {
    if (txFilter === 'completed' && tx.status !== 'completed') return false;
    if (txFilter === 'failed' && tx.status !== 'failed' && tx.status !== 'abandoned') return false;
    if (txFilter === 'unrecovered' && !tx.is_unrecovered) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (tx.phone && tx.phone.includes(q)) ||
             (tx.local_phone && tx.local_phone.includes(q)) ||
             (tx.reference && tx.reference.toLowerCase().includes(q)) ||
             (tx.package_name && tx.package_name.toLowerCase().includes(q));
    }
    return true;
  });

  const periodLabels = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    all: 'All Time'
  };

  const activeBreakdown = stats.time_breakdowns?.[revenueFilter] || {
    gross_kes: stats.wifi_total_revenue_kes || stats.total_revenue_kes || 0,
    net_kes: stats.estimated_net_revenue_kes || Math.round((stats.total_revenue_kes || 0) * 0.985),
    fee_kes: stats.estimated_paystack_fee_kes || Math.round((stats.total_revenue_kes || 0) * 0.015),
    count: stats.wifi_transactions_count || stats.total_transactions_count || 0
  };

  const unrecoveredCount = recentTransactions.filter(t => t.is_unrecovered).length;
  const failedCount = recentTransactions.filter(t => t.status === 'failed' || t.status === 'abandoned').length;
  const completedCount = recentTransactions.filter(t => t.status === 'completed').length;

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

      {/* Top Banner Alert for Unrecovered Buyers */}
      {(conversion.unrecovered_buyers_count || 0) > 0 && (
        <div className="cn-alert-banner" style={{ background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.15), rgba(255, 84, 20, 0.15))', borderColor: 'rgba(244, 63, 94, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.75rem' }}>🎯</span>
            <div>
              <strong style={{ fontSize: '1rem', color: '#fca5a5', display: 'block' }}>
                {conversion.unrecovered_buyers_count} Potential Wi-Fi Buyers Dropped at Checkout!
              </strong>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                High-intent students dropped ~KSh {(conversion.unrecovered_missed_kes || 0).toLocaleString()} in the last 30 days due to STK timeouts or cancellations. Reach out via 1-click WhatsApp to close them!
              </span>
            </div>
          </div>
          <button 
            className="cn-action-btn cn-btn-claim"
            onClick={() => { setActiveTab('transactions'); setTxFilter('unrecovered'); }}
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', background: '#f43f5e', borderColor: '#f43f5e' }}
          >
            <ArrowUpRight size={15} /> Recover Dropped Buyers
          </button>
        </div>
      )}

      {/* DIRECT TIME FILTER BAR (PURE WI-FI LEDGER) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '1.25rem',
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '10px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color="#00d4ff" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
            Wi-Fi Revenue Filter:
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            CampusNet Independent Ledger
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setRevenueFilter(f.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                border: revenueFilter === f.id ? '1px solid #00d4ff' : '1px solid rgba(255, 255, 255, 0.08)',
                background: revenueFilter === f.id ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: revenueFilter === f.id ? '#00d4ff' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

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
            <span className="cn-stock-chip">12H: {stats.vouchers_by_package?.pkg_12h || 0}</span>
            <span className="cn-stock-chip">24H: {stats.vouchers_by_package?.pkg_24h || 0}</span>
            <span className="cn-stock-chip">3D: {stats.vouchers_by_package?.pkg_3d || 0}</span>
            <span className="cn-stock-chip">7D: {stats.vouchers_by_package?.pkg_7d || 0}</span>
            <span className="cn-stock-chip">30D: {stats.vouchers_by_package?.pkg_30d || 0}</span>
          </div>
        </div>

        {/* Card 3: Pure Independent Wi-Fi Sales */}
        <div className="cn-stat-card cn-card-cyan">
          <div className="cn-stat-header">
            <span className="cn-stat-title">CampusNet Wi-Fi Sales ({periodLabels[revenueFilter]})</span>
            <span style={{ fontSize: '0.72rem', background: 'rgba(0, 212, 255, 0.15)', color: '#00d4ff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(0, 212, 255, 0.3)' }}>
              ⚡ Pure Wi-Fi Ledger
            </span>
          </div>
          <div className="cn-stat-value">
            KSh {(activeBreakdown.gross_kes || 0).toLocaleString()}
          </div>
          <div className="cn-stat-subtext">
            <span>Net: <strong style={{ color: '#00e676' }}>~KSh {(activeBreakdown.net_kes || 0).toLocaleString()}</strong></span>
            <span style={{ margin: '0 6px', opacity: 0.5 }}>•</span>
            <span>Fee: ~KSh {(activeBreakdown.fee_kes || 0).toLocaleString()}</span>
            <span style={{ margin: '0 6px', opacity: 0.5 }}>•</span>
            <span>{activeBreakdown.count || 0} paid passes</span>
          </div>
        </div>

        {/* Card 4: STK Conversion & Missed Revenue (30 Days) */}
        <div className="cn-stat-card cn-card-rose">
          <div className="cn-stat-header">
            <span className="cn-stat-title">Payment Conversion (30d)</span>
            <TrendingUp size={18} color="#f43f5e" />
          </div>
          <div className="cn-stat-value">
            {conversion.conversion_rate_pct ?? '--'}%
            <span style={{ fontSize: '0.85rem', color: (conversion.conversion_rate_pct || 0) >= 80 ? '#00e676' : '#fca5a5', fontWeight: 600 }}>
              {conversion.total_completed || 0} paid / {(conversion.total_completed || 0) + (conversion.total_failed || 0)} attempts
            </span>
          </div>
          <div className="cn-stat-subtext">
            <strong style={{ color: '#fca5a5' }}>KSh {(conversion.unrecovered_missed_kes || 0).toLocaleString()}</strong> unrecovered ({conversion.unrecovered_buyers_count || 0} students dropped at checkout)
          </div>
        </div>
      </div>

      {/* 3-Tab Clean Navigation Bar */}
      <div className="cn-nav-tabs">
        <button 
          className={`cn-nav-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <Wifi size={16} /> Live Sessions
          <span className="cn-badge-count">{stats.active_sessions_count || 0}</span>
        </button>

        <button 
          className={`cn-nav-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <CreditCard size={16} /> Transactions & Recovery
          {unrecoveredCount > 0 ? (
            <span className="cn-badge-count" style={{ background: '#f43f5e' }}>{unrecoveredCount} to Recover</span>
          ) : (
            <span className="cn-badge-count">{recentTransactions.length}</span>
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

          {/* DESKTOP TABLE VIEW */}
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
                            <strong style={{ color: '#ffffff' }}>{s.local_phone || s.phone}</strong>
                          </td>
                          <td>
                            <span className="cn-code-tag">
                              {s.voucher_code || 'AUTHO-ACTIVE'}
                              <button 
                                onClick={() => copyToClipboard(s.voucher_code)} 
                                className="cn-copy-mini-btn"
                                title="Copy voucher code"
                              >
                                {copiedCode === s.voucher_code ? <Check size={12} color="#00e676" /> : <Copy size={12} />}
                              </button>
                            </span>
                          </td>
                          <td>
                            <span className="cn-pkg-badge">{s.package_name || 'Active Pass'}</span>
                          </td>
                          <td>
                            <span className={`cn-time-left ${isActive ? 'active' : 'expired'}`}>
                              <Clock size={13} /> {dynamicTimeLeft}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                            {new Date(s.valid_until).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                          </td>
                          <td>
                            <span className={`cn-status-pill ${isActive ? 'active' : 'expired'}`}>
                              {isActive ? 'ACTIVE' : 'EXPIRED'}
                            </span>
                          </td>
                          <td>
                            <div className="cn-action-cell">
                              <a 
                                href={s.whatsapp_link} 
                                target="_blank" 
                                rel="noreferrer"
                                className="cn-action-btn cn-btn-wa"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare size={13} /> Chat
                              </a>
                              <a 
                                href={s.tel_link} 
                                className="cn-action-btn cn-btn-call"
                                title="Call resident"
                              >
                                <Phone size={13} /> Call
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

          {/* MOBILE CARDS VIEW */}
          <div className="cn-mobile-cards">
            {filteredSessions.length === 0 ? (
              <div className="cn-table-card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
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
                  <div key={s.id || s.phone} className="cn-mcard">
                    <div className="cn-mcard-top">
                      <div>
                        <strong className="cn-mcard-phone">{s.local_phone || s.phone}</strong>
                        <div className="cn-mcard-sub">{s.package_name || 'Active Pass'}</div>
                      </div>
                      <span className={`cn-status-pill ${isActive ? 'active' : 'expired'}`}>
                        {isActive ? 'ACTIVE' : 'EXPIRED'}
                      </span>
                    </div>

                    <div className="cn-mcard-body">
                      <div className="cn-mcard-row">
                        <span className="cn-mcard-label">Voucher:</span>
                        <span className="cn-code-tag">
                          {s.voucher_code || 'AUTHO-ACTIVE'}
                          <button 
                            onClick={() => copyToClipboard(s.voucher_code)} 
                            className="cn-copy-mini-btn"
                          >
                            {copiedCode === s.voucher_code ? <Check size={12} color="#00e676" /> : <Copy size={12} />}
                          </button>
                        </span>
                      </div>
                      <div className="cn-mcard-row">
                        <span className="cn-mcard-label">Remaining:</span>
                        <span className={`cn-time-left ${isActive ? 'active' : 'expired'}`}>
                          <Clock size={13} /> {dynamicTimeLeft}
                        </span>
                      </div>
                      <div className="cn-mcard-row">
                        <span className="cn-mcard-label">Valid Until:</span>
                        <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                          {new Date(s.valid_until).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                        </span>
                      </div>
                    </div>

                    <div className="cn-mcard-actions">
                      <a 
                        href={s.whatsapp_link} 
                        target="_blank" 
                        rel="noreferrer"
                        className="cn-mcard-action-btn cn-btn-wa"
                      >
                        <MessageSquare size={13} /> WhatsApp
                      </a>
                      <a 
                        href={s.tel_link} 
                        className="cn-mcard-action-btn cn-btn-call"
                      >
                        <Phone size={13} /> Call
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
          TAB 2: TRANSACTIONS & PAYMENT RECOVERY
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'transactions' && (
        <div>
          {/* Toolbar */}
          <div className="cn-toolbar">
            <div className="cn-search-box">
              <Search size={16} color="#94a3b8" />
              <input 
                type="text"
                className="cn-search-input"
                placeholder="Search phone, reference, or package..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="cn-filter-pills">
              <button 
                className={`cn-pill-btn ${txFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTxFilter('all')}
              >
                All ({recentTransactions.length})
              </button>
              <button 
                className={`cn-pill-btn ${txFilter === 'unrecovered' ? 'active' : ''}`}
                onClick={() => setTxFilter('unrecovered')}
                style={txFilter === 'unrecovered' ? { background: '#f43f5e', borderColor: '#f43f5e' } : {}}
              >
                🎯 Unrecovered ({unrecoveredCount})
              </button>
              <button 
                className={`cn-pill-btn ${txFilter === 'failed' ? 'active' : ''}`}
                onClick={() => setTxFilter('failed')}
              >
                Failed / Dropped ({failedCount})
              </button>
              <button 
                className={`cn-pill-btn ${txFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setTxFilter('completed')}
              >
                Completed ({completedCount})
              </button>
            </div>

            <button 
              className="cn-reconcile-btn"
              onClick={handleReconcilePaystack}
              disabled={reconciling}
              title="Queries Paystack API directly and auto-fixes any stuck transactions"
            >
              <RefreshCw size={14} className={reconciling ? 'animate-spin' : ''} />
              {reconciling ? 'Reconciling...' : 'Reconcile with Paystack'}
            </button>
          </div>

          {reconcileResult && (
            <div style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', color: '#00d4ff', padding: '0.65rem 1.15rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>
                ✓ {reconcileResult.message || `Scanned ${reconcileResult.scanned} Paystack transactions. Reconciled ${reconcileResult.reconciled_total} in Supabase.`}
              </span>
              <button onClick={() => setReconcileResult(null)} style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>
          )}

          {/* DESKTOP TABLE VIEW */}
          <div className="cn-table-card cn-desktop-table">
            <div className="cn-table-wrapper">
              <table className="cn-data-table">
                <thead>
                  <tr>
                    <th>Student Phone</th>
                    <th>Package & Amount</th>
                    <th>Status</th>
                    <th>Gateway Response / Reason</th>
                    <th>Time (EAT)</th>
                    <th>Reference</th>
                    <th>Recovery Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                        No transactions match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(tx => {
                      const isSuccess = tx.status === 'completed';
                      const isFailed = tx.status === 'failed' || tx.status === 'abandoned';
                      const cleanPhone = (tx.phone || '').replace(/\D/g, '');
                      
                      // Contextual recovery WhatsApp message
                      const waText = isSuccess
                        ? `Hi! Thank you for subscribing to CampusNet Wi-Fi (${tx.package_name || 'Pass'}). Let us know if you need any assistance!`
                        : `Hi! Noticed your CampusNet Wi-Fi payment attempt (${tx.package_name || 'Pass'} - KSh ${tx.amount_kes || tx.price}) didn't go through. Do you need any help getting connected?`;
                      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;
                      const telLink = `tel:+${cleanPhone}`;

                      return (
                        <tr key={tx.id || tx.reference}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ color: '#ffffff' }}>{tx.local_phone || tx.phone}</strong>
                              {tx.is_unrecovered && (
                                <span className="cn-tx-unrecovered-badge">
                                  🎯 BUYER INTENT
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#f1f5f9' }}>
                              {tx.package_name || 'Wi-Fi Pass'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#00e676', fontWeight: 700 }}>
                              KSh {tx.amount_kes || tx.price || 0}
                            </div>
                          </td>
                          <td>
                            {isSuccess ? (
                              <span className="cn-tx-pill cn-tx-pill-success">
                                <CheckCircle2 size={12} /> COMPLETED
                              </span>
                            ) : isFailed ? (
                              <span className="cn-tx-pill cn-tx-pill-failed">
                                <XCircle size={12} /> FAILED
                              </span>
                            ) : (
                              <span className="cn-tx-pill cn-tx-pill-pending">
                                <Clock3 size={12} /> PENDING
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="cn-tx-response">
                              {tx.gateway_response || (isSuccess ? 'Successful STK Push' : 'Awaiting payment verification')}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {tx.created_at ? new Date(tx.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }) : '--'}
                          </td>
                          <td>
                            <span className="cn-code-tag" style={{ fontSize: '0.75rem' }}>
                              {(tx.reference || '').slice(0, 14)}...
                              <button 
                                onClick={() => copyToClipboard(tx.reference)} 
                                className="cn-copy-mini-btn"
                                title="Copy full reference"
                              >
                                {copiedCode === tx.reference ? <Check size={12} color="#00e676" /> : <Copy size={12} />}
                              </button>
                            </span>
                          </td>
                          <td>
                            <div className="cn-action-cell">
                              <a 
                                href={waLink} 
                                target="_blank" 
                                rel="noreferrer"
                                className="cn-action-btn cn-btn-wa"
                                title="Recover or assist on WhatsApp"
                              >
                                <MessageSquare size={13} /> {isSuccess ? 'WhatsApp' : 'Recover'}
                              </a>
                              <a 
                                href={telLink} 
                                className="cn-action-btn cn-btn-call"
                                title="Direct voice call"
                              >
                                <Phone size={13} /> Call
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

          {/* MOBILE CARDS VIEW */}
          <div className="cn-mobile-cards">
            {filteredTransactions.length === 0 ? (
              <div className="cn-table-card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                No transactions match the selected filter.
              </div>
            ) : (
              filteredTransactions.map(tx => {
                const isSuccess = tx.status === 'completed';
                const isFailed = tx.status === 'failed' || tx.status === 'abandoned';
                const cleanPhone = (tx.phone || '').replace(/\D/g, '');
                const waText = isSuccess
                  ? `Hi! Thank you for subscribing to CampusNet Wi-Fi (${tx.package_name || 'Pass'}). Let us know if you need any assistance!`
                  : `Hi! Noticed your CampusNet Wi-Fi payment attempt (${tx.package_name || 'Pass'} - KSh ${tx.amount_kes || tx.price}) didn't go through. Do you need any help getting connected?`;
                const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`;
                const telLink = `tel:+${cleanPhone}`;

                return (
                  <div key={tx.id || tx.reference} className="cn-mcard">
                    <div className="cn-mcard-top">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong className="cn-mcard-phone">{tx.local_phone || tx.phone}</strong>
                          {tx.is_unrecovered && (
                            <span className="cn-tx-unrecovered-badge">
                              🎯 UNRECOVERED
                            </span>
                          )}
                        </div>
                        <div className="cn-mcard-sub">
                          {tx.package_name || 'Pass'} • <strong style={{ color: '#00e676' }}>KSh {tx.amount_kes || tx.price || 0}</strong>
                        </div>
                      </div>
                      {isSuccess ? (
                        <span className="cn-tx-pill cn-tx-pill-success">COMPLETED</span>
                      ) : isFailed ? (
                        <span className="cn-tx-pill cn-tx-pill-failed">FAILED</span>
                      ) : (
                        <span className="cn-tx-pill cn-tx-pill-pending">PENDING</span>
                      )}
                    </div>

                    <div className="cn-mcard-body">
                      <div className="cn-mcard-row">
                        <span className="cn-mcard-label">Result:</span>
                        <span style={{ fontSize: '0.82rem', color: isFailed ? '#fca5a5' : '#cbd5e1' }}>
                          {tx.gateway_response || (isSuccess ? 'Payment Successful' : 'Processing')}
                        </span>
                      </div>
                      <div className="cn-mcard-row">
                        <span className="cn-mcard-label">Time:</span>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {tx.created_at ? new Date(tx.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }) : '--'}
                        </span>
                      </div>
                      <div className="cn-mcard-row">
                        <span className="cn-mcard-label">Ref:</span>
                        <span className="cn-code-tag" style={{ fontSize: '0.72rem' }}>
                          {(tx.reference || '').slice(0, 16)}
                          <button 
                            onClick={() => copyToClipboard(tx.reference)} 
                            className="cn-copy-mini-btn"
                          >
                            {copiedCode === tx.reference ? <Check size={11} color="#00e676" /> : <Copy size={11} />}
                          </button>
                        </span>
                      </div>
                    </div>

                    <div className="cn-mcard-actions">
                      <a 
                        href={waLink} 
                        target="_blank" 
                        rel="noreferrer"
                        className="cn-mcard-action-btn cn-btn-wa"
                      >
                        <MessageSquare size={13} /> {isSuccess ? 'WhatsApp' : 'Recover on WhatsApp'}
                      </a>
                      <a 
                        href={telLink} 
                        className="cn-mcard-action-btn cn-btn-call"
                      >
                        <Phone size={13} /> Call
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
                  Use this when a student calls the helpline (0794877125) or pays via cash to immediately grant Wi-Fi access.
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
                  Select Package (Option A Continuous Pricing)
                </label>
                <select 
                  value={hotlinePkg}
                  onChange={e => setHotlinePkg(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="pkg_1h">1 Hour Flash Pass (KSh 10)</option>
                  <option value="pkg_3h">3 Hours Browsing (KSh 20)</option>
                  <option value="pkg_12h">12 Hours Pass (KSh 30)</option>
                  <option value="pkg_24h">24 Hours Unlimited (KSh 50)</option>
                  <option value="pkg_3d">3 Days Weekend Pass (KSh 100)</option>
                  <option value="pkg_7d">7 Days Unlimited (KSh 180)</option>
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
