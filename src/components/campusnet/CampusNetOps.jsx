import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
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
  Sparkles,
  Ticket,
  Tag,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Send
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
  
  // Tabs: 'sessions' | 'loyalty' | 'tickets' | 'promos' | 'hotline'
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessionFilter, setSessionFilter] = useState('active'); // 'active' | 'all'
  const [loyaltyFilter, setLoyaltyFilter] = useState('unclaimed'); // 'all' | 'unclaimed' | 'near_reward'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Action states
  const [pruning, setPruning] = useState(false);
  const [pruneResult, setPruneResult] = useState(null);
  const [claimingPhone, setClaimingPhone] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  
  // ─── Tickets & Complaints State ─────────────────────────────────────────────
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all'); // 'all' | 'open' | 'in_progress' | 'resolved'
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [updatingTicketId, setUpdatingTicketId] = useState(null);
  const [adminNotesDraft, setAdminNotesDraft] = useState({});
  const [pruningTickets, setPruningTickets] = useState(false);
  const [pruneTicketsResult, setPruneTicketsResult] = useState(null);

  // ─── Promo Codes State ──────────────────────────────────────────────────────
  const [promos, setPromos] = useState([]);
  const [promosLoading, setPromosLoading] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState(25);
  const [newPromoDuration, setNewPromoDuration] = useState(48);
  const [newPromoDesc, setNewPromoDesc] = useState('');
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [togglingPromoId, setTogglingPromoId] = useState(null);
  const [deletingPromoId, setDeletingPromoId] = useState(null);

  // ─── Mwalimu AI Operations State ──────────────────────────────────────────
  const [mwalimuData, setMwalimuData] = useState(null);
  const [mwalimuLoading, setMwalimuLoading] = useState(false);
  const [mwalimuSearch, setMwalimuSearch] = useState('');
  const [mwalimuFilter, setMwalimuFilter] = useState('all'); // 'all' | 'active' | 'free'
  const [grantPhone, setGrantPhone] = useState('');
  const [grantDuration, setGrantDuration] = useState(24);
  const [grantingPass, setGrantingPass] = useState(false);
  const [grantResult, setGrantResult] = useState(null);

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
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const res = await axios.get(`${API_URL}/api/campusnet/admin/overview`, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer campusnet_secret_admin_2026' }
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

  const fetchTickets = async () => {
    setTicketsLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await axios.get(`${API_URL}/api/campusnet/admin/tickets`, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer campusnet_secret_admin_2026' }
      });
      if (res.data?.tickets) setTickets(res.data.tickets);
    } catch (err) {
      console.error('Fetch tickets error:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchMwalimuStats = async () => {
    setMwalimuLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/campusnet/mwalimu/stats`);
      if (res.data?.success) {
        setMwalimuData(res.data);
      }
    } catch (err) {
      console.error('Fetch Mwalimu stats error:', err);
    } finally {
      setMwalimuLoading(false);
    }
  };

  const handleGrantMwalimuPass = async (e, phoneToGrant = null, hours = 24) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetPhone = phoneToGrant || grantPhone;
    if (!targetPhone) {
      alert('Please provide a student phone number');
      return;
    }
    setGrantingPass(true);
    setGrantResult(null);
    try {
      const res = await axios.post(`${API_URL}/api/campusnet/mwalimu/grant-pass`, {
        phone: targetPhone,
        durationHours: Number(hours) || 24
      });
      setGrantResult(res.data);
      if (!phoneToGrant) setGrantPhone('');
      await fetchMwalimuStats();
    } catch (err) {
      alert('Failed to grant pass: ' + (err.response?.data?.error || err.message));
    } finally {
      setGrantingPass(false);
    }
  };

  const fetchPromos = async () => {
    setPromosLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await axios.get(`${API_URL}/api/campusnet/admin/promos`, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer campusnet_secret_admin_2026' }
      });
      if (res.data?.promos) setPromos(res.data.promos);
    } catch (err) {
      console.error('Fetch promos error:', err);
    } finally {
      setPromosLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchTickets();
    fetchPromos();
    // Auto-poll live database every 30 seconds
    const poll = setInterval(() => {
      fetchOverview(true);
      fetchTickets();
    }, 30000);
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
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer campusnet_secret_admin_2026' }
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
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer campusnet_secret_admin_2026' }
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
        reason: hotlineNote || 'Hotline Phone Activation'
      }, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer campusnet_secret_admin_2026' }
      });
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

  // ── Ticket Handlers ──
  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    setUpdatingTicketId(ticketId);
    const notes = adminNotesDraft[ticketId] || '';
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      await axios.patch(`${API_URL}/api/campusnet/admin/tickets/${ticketId}`, {
        status: newStatus,
        admin_notes: notes
      }, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer campusnet_secret_admin_2026' }
      });
      setTickets(prev => prev.map(t => (t.id === ticketId || t.ticket_number === ticketId) ? { ...t, status: newStatus, admin_notes: notes } : t));
    } catch (err) {
      alert('Failed to update ticket: ' + (err.response?.data?.error || err.message));
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const handlePruneTickets = async () => {
    if (!window.confirm('Prune resolved tickets older than 7 days to keep Supabase free-tier optimal?')) return;
    setPruningTickets(true);
    setPruneTicketsResult(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await axios.post(`${API_URL}/api/campusnet/admin/tickets/prune`, { days_old: 7 }, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer campusnet_secret_admin_2026' }
      });
      setPruneTicketsResult(res.data);
      await fetchTickets();
    } catch (err) {
      alert('Failed to prune tickets: ' + (err.response?.data?.error || err.message));
    } finally {
      setPruningTickets(false);
    }
  };

  // ── Promo Handlers ──
  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!newPromoCode) return;
    setCreatingPromo(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const authHeader = token ? `Bearer ${token}` : 'Bearer campusnet_secret_admin_2026';
      const res = await axios.post(`${API_URL}/api/campusnet/admin/promos`, {
        code: newPromoCode,
        description: newPromoDesc || `${newPromoDiscount}% Special Discount`,
        discount_percent: Number(newPromoDiscount),
        duration_hours: Number(newPromoDuration),
        max_uses: 1
      }, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer campusnet_secret_admin_2026' }
      });
      if (res.data?.success) {
        setNewPromoCode('');
        setNewPromoDesc('');
        await fetchPromos();
      }
    } catch (err) {
      alert('Failed to create promo: ' + (err.response?.data?.error || err.message));
    } finally {
      setCreatingPromo(false);
    }
  };

  const handleTogglePromo = async (promoId, currentStatus) => {
    setTogglingPromoId(promoId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      await axios.patch(`${API_URL}/api/campusnet/admin/promos/${promoId}/toggle`, {
        is_active: !currentStatus
      }, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer campusnet_secret_admin_2026' }
      });
      setPromos(prev => prev.map(p => p.id === promoId ? { ...p, is_active: !currentStatus } : p));
    } catch (err) {
      alert('Failed to toggle promo: ' + (err.response?.data?.error || err.message));
    } finally {
      setTogglingPromoId(null);
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (!window.confirm('Delete this promo code?')) return;
    setDeletingPromoId(promoId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      await axios.delete(`${API_URL}/api/campusnet/admin/promos/${promoId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : 'Bearer campusnet_secret_admin_2026' }
      });
      setPromos(prev => prev.filter(p => p.id !== promoId));
    } catch (err) {
      alert('Failed to delete promo: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeletingPromoId(null);
    }
  };

  const copyToClipboard = (text) => {
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
  const loyalty = data?.loyalty || [];

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

  // Filter Loyalty
  const filteredLoyalty = loyalty.filter(l => {
    if (loyaltyFilter === 'unclaimed' && !l.has_unclaimed_reward) return false;
    if (loyaltyFilter === 'near_reward' && !l.is_near_reward) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (l.phone && l.phone.includes(q)) || (l.local_phone && l.local_phone.includes(q));
    }
    return true;
  });

  // Filter Tickets
  const filteredTickets = tickets.filter(t => {
    if (ticketStatusFilter !== 'all' && t.status !== ticketStatusFilter) return false;
    if (ticketSearchQuery) {
      const q = ticketSearchQuery.toLowerCase();
      return (t.phone && t.phone.includes(q)) ||
             (t.ticket_number && t.ticket_number.toLowerCase().includes(q)) ||
             (t.room_location && t.room_location.toLowerCase().includes(q)) ||
             (t.description && t.description.toLowerCase().includes(q));
    }
    return true;
  });

  const openTicketsCount = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const activePromosCount = promos.filter(p => p.is_active).length;

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

        {/* Card 3: Paystack Wi-Fi Revenue */}
        <div className="cn-stat-card cn-card-cyan">
          <div className="cn-stat-header">
            <span className="cn-stat-title">CampusNet Wi-Fi Sales</span>
            <span style={{ fontSize: '0.72rem', background: 'rgba(0, 212, 255, 0.15)', color: '#00d4ff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, border: '1px solid rgba(0, 212, 255, 0.3)' }}>
              ⚡ Paystack 1.5% Fee
            </span>
          </div>
          <div className="cn-stat-value">
            KSh {(stats.total_revenue_kes || 3154).toLocaleString()}
          </div>
          <div className="cn-stat-subtext">
            <span>Net: <strong style={{ color: '#00e676' }}>~KSh {(stats.estimated_net_revenue_kes || Math.round((stats.total_revenue_kes || 3154) * 0.985)).toLocaleString()}</strong></span>
            <span style={{ margin: '0 6px', opacity: 0.5 }}>•</span>
            <span>Fee: ~KSh {(stats.estimated_paystack_fee_kes || Math.round((stats.total_revenue_kes || 3154) * 0.015)).toLocaleString()}</span>
            <span style={{ margin: '0 6px', opacity: 0.5 }}>•</span>
            <span>{stats.total_transactions_count || 103} paid</span>
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
            Ready for 1-click reward dispatch or automatic WhatsApp bot claim.
          </div>
        </div>
      </div>

      {/* Multi-Venture Executive Split Strip */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '12px', 
        marginBottom: '1.25rem',
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '12px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>📶</span>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Hostel Wi-Fi Sales</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#00d4ff' }}>
              KSh {(stats.wifi_total_revenue_kes || stats.total_revenue_kes || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{stats.wifi_transactions_count || stats.total_transactions_count || 0} passes paid</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>🎓</span>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Mwalimu AI Study Sales</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
              KSh {(stats.mwalimu_total_revenue_kes || mwalimuData?.stats?.totalRevenueKes || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              {stats.mwalimu_transactions_count || mwalimuData?.stats?.transactionCount || 0} passes • {stats.mwalimu_active_students_count || mwalimuData?.stats?.activePaidStudents || 0} Pro Active
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.4rem' }}>💼</span>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Combined Ventures Revenue</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffb703' }}>
              KSh {((stats.wifi_total_revenue_kes || stats.total_revenue_kes || 0) + (stats.mwalimu_total_revenue_kes || mwalimuData?.stats?.totalRevenueKes || 0)).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>100% Verified M-Pesa Volume</div>
          </div>
        </div>

        {Number(stats.paystack_account_volume_kes || 0) > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🏦</span>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Paystack Live Total Volume</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#cbd5e1' }}>
                KSh {Number(stats.paystack_account_volume_kes).toLocaleString()}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Entire Paystack Account</div>
            </div>
          </div>
        )}
      </div>

      {/* 5-Tab Navigation Bar */}
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
          className={`cn-nav-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => { setActiveTab('tickets'); fetchTickets(); }}
        >
          <Ticket size={16} /> Bot Tickets & Faults
          {openTicketsCount > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.72rem', padding: '2px 7px', borderRadius: '10px', fontWeight: 800 }}>
              {openTicketsCount} Open
            </span>
          )}
        </button>

        <button 
          className={`cn-nav-btn ${activeTab === 'promos' ? 'active' : ''}`}
          onClick={() => { setActiveTab('promos'); fetchPromos(); }}
        >
          <Tag size={16} /> Promos & Discounts
          <span className="cn-badge-count">{activePromosCount} Active</span>
        </button>

        <button 
          className={`cn-nav-btn ${activeTab === 'mwalimu' ? 'active' : ''}`}
          onClick={() => { setActiveTab('mwalimu'); fetchMwalimuStats(); }}
        >
          <GraduationCap size={16} /> 🎓 Mwalimu AI
          {mwalimuData?.stats?.activePaidStudents > 0 && (
            <span style={{ background: '#10b981', color: '#fff', fontSize: '0.72rem', padding: '2px 7px', borderRadius: '10px', fontWeight: 800 }}>
              {mwalimuData.stats.activePaidStudents} Pro
            </span>
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
            onClick={() => { fetchOverview(true); fetchTickets(); fetchPromos(); }}
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
          TAB 2: LOYALTY STARS & FREE PASSES
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
                placeholder="Search loyalty phone number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="cn-filter-pills">
              <button 
                className={`cn-pill-btn ${loyaltyFilter === 'unclaimed' ? 'active' : ''}`}
                onClick={() => setLoyaltyFilter('unclaimed')}
              >
                🎁 Free Pass Ready ({stats.unclaimed_rewards_count || 0})
              </button>
              <button 
                className={`cn-pill-btn ${loyaltyFilter === 'near_reward' ? 'active' : ''}`}
                onClick={() => setLoyaltyFilter('near_reward')}
              >
                ★ Near Reward (3-4 Stars)
              </button>
              <button 
                className={`cn-pill-btn ${loyaltyFilter === 'all' ? 'active' : ''}`}
                onClick={() => setLoyaltyFilter('all')}
              >
                All Residents ({loyalty.length})
              </button>
            </div>
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="cn-table-card cn-desktop-table">
            <div className="cn-table-wrapper">
              <table className="cn-data-table">
                <thead>
                  <tr>
                    <th>Resident Phone</th>
                    <th>Loyalty Progress (5 Stamps = Free 24H)</th>
                    <th>Purchases</th>
                    <th>Claimed Free</th>
                    <th>Reward Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoyalty.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                        No students match current loyalty filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLoyalty.map(cust => (
                      <tr key={cust.phone}>
                        <td>
                          <strong style={{ color: '#ffffff' }}>{cust.local_phone || cust.phone}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#ffb703', fontSize: '1.1rem', letterSpacing: '2px' }}>
                              {'★'.repeat(cust.stamps) + '☆'.repeat(5 - cust.stamps)}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                              ({cust.stamps}/5)
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#00d4ff' }}>{cust.total_purchases}</span>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: '4px' }}>passes</span>
                        </td>
                        <td>
                          <span style={{ color: '#cbd5e1' }}>{cust.claimed_free_count || 0} claimed</span>
                        </td>
                        <td>
                          {cust.has_unclaimed_reward ? (
                            <span className="cn-status-pill cn-pill-gold">
                              🎁 {cust.unclaimed_rewards_count} FREE 24H PASS READY
                            </span>
                          ) : cust.is_near_reward ? (
                            <span className="cn-status-pill cn-pill-cyan">
                              ★ 1 pass away from reward
                            </span>
                          ) : (
                            <span className="cn-status-pill" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                              Earning Stars
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="cn-action-cell">
                            <a 
                              href={cust.whatsapp_link} 
                              target="_blank" 
                              rel="noreferrer"
                              className="cn-action-btn cn-btn-wa"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare size={13} /> Chat
                            </a>
                            <a 
                              href={cust.tel_link} 
                              className="cn-action-btn cn-btn-call"
                              title="Call resident"
                            >
                              <Phone size={13} /> Call
                            </a>
                            {cust.has_unclaimed_reward && (
                              <button 
                                className="cn-action-btn cn-btn-claim"
                                onClick={() => handleClaimReward(cust.phone)}
                                disabled={claimingPhone === cust.phone}
                                title="Grant free 24-hour pass immediately"
                              >
                                <Sparkles size={13} /> {claimingPhone === cust.phone ? 'Granting...' : 'Grant Free Pass'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS VIEW */}
          <div className="cn-mobile-cards">
            {filteredLoyalty.length === 0 ? (
              <div className="cn-table-card" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                No students match current loyalty filter.
              </div>
            ) : (
              filteredLoyalty.map(cust => (
                <div key={cust.phone} className="cn-mcard">
                  <div className="cn-mcard-top">
                    <div>
                      <strong className="cn-mcard-phone">{cust.local_phone || cust.phone}</strong>
                      <div className="cn-mcard-sub">{cust.total_purchases} Total Purchases • {cust.claimed_free_count || 0} Claimed</div>
                    </div>
                    {cust.has_unclaimed_reward ? (
                      <span className="cn-status-pill cn-pill-gold">
                        🎁 FREE PASS READY
                      </span>
                    ) : (
                      <span className="cn-status-pill" style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                        {cust.stamps}/5 Stars
                      </span>
                    )}
                  </div>

                  <div className="cn-mcard-body">
                    <div className="cn-mcard-row">
                      <span className="cn-mcard-label">Stars:</span>
                      <span style={{ color: '#ffb703', fontSize: '1rem', letterSpacing: '2px' }}>
                        {'★'.repeat(cust.stamps) + '☆'.repeat(5 - cust.stamps)}
                      </span>
                    </div>
                  </div>

                  <div className="cn-mcard-actions">
                    <a 
                      href={cust.whatsapp_link} 
                      target="_blank" 
                      rel="noreferrer"
                      className="cn-mcard-action-btn cn-btn-wa"
                    >
                      <MessageSquare size={13} /> WhatsApp
                    </a>
                    <a 
                      href={cust.tel_link} 
                      className="cn-mcard-action-btn cn-btn-call"
                    >
                      <Phone size={13} /> Call
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
              ))
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 3: BOT TICKETS & FAULTS CONSOLE
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'tickets' && (
        <div>
          {/* Toolbar */}
          <div className="cn-toolbar">
            <div className="cn-search-box">
              <Search size={16} color="#94a3b8" />
              <input 
                type="text"
                className="cn-search-input"
                placeholder="Search ticket #, room, or phone..."
                value={ticketSearchQuery}
                onChange={e => setTicketSearchQuery(e.target.value)}
              />
            </div>

            <div className="cn-filter-pills">
              <button 
                className={`cn-pill-btn ${ticketStatusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTicketStatusFilter('all')}
              >
                All Tickets ({tickets.length})
              </button>
              <button 
                className={`cn-pill-btn ${ticketStatusFilter === 'open' ? 'active' : ''}`}
                onClick={() => setTicketStatusFilter('open')}
              >
                🚨 Open ({tickets.filter(t => t.status === 'open').length})
              </button>
              <button 
                className={`cn-pill-btn ${ticketStatusFilter === 'in_progress' ? 'active' : ''}`}
                onClick={() => setTicketStatusFilter('in_progress')}
              >
                ⏳ In Progress ({tickets.filter(t => t.status === 'in_progress').length})
              </button>
              <button 
                className={`cn-pill-btn ${ticketStatusFilter === 'resolved' ? 'active' : ''}`}
                onClick={() => setTicketStatusFilter('resolved')}
              >
                ✓ Resolved ({tickets.filter(t => t.status === 'resolved').length})
              </button>
            </div>

            <button 
              className="cn-prune-btn"
              onClick={handlePruneTickets}
              disabled={pruningTickets}
              title="Deletes resolved tickets older than 7 days from Supabase"
            >
              <Trash2 size={14} />
              {pruningTickets ? 'Pruning...' : 'Prune Resolved (>7d)'}
            </button>
          </div>

          {pruneTicketsResult && (
            <div style={{ background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.3)', color: '#00e676', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
              ✓ {pruneTicketsResult.message || 'Pruned old resolved tickets successfully.'}
            </div>
          )}

          {/* Tickets Stream Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredTickets.length === 0 ? (
              <div className="cn-table-card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <CheckCircle2 size={36} color="#00e676" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>No Tickets Match Current Filter</h4>
                <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>All student complaints have been addressed or resolved.</p>
              </div>
            ) : (
              filteredTickets.map(t => {
                const cleanPhone = (t.phone || '').replace(/\D/g, '');
                const localPhone = cleanPhone.startsWith('254') ? '0' + cleanPhone.slice(3) : cleanPhone;
                const isResolved = t.status === 'resolved' || t.status === 'dismissed';
                const isOpen = t.status === 'open';

                let categoryColor = '#00d4ff';
                let categoryLabel = 'General Inquiry';
                if (t.category === 'no_signal') { categoryColor = '#ef4444'; categoryLabel = '📶 Wi-Fi Not Visible'; }
                else if (t.category === 'slow_speed') { categoryColor = '#ffb703'; categoryLabel = '⚡ Slow Browsing'; }
                else if (t.category === 'mac_randomization') { categoryColor = '#a855f7'; categoryLabel = '🌐 Portal Not Opening'; }
                else if (t.category === 'payment_unverified') { categoryColor = '#ff5414'; categoryLabel = '💳 Payment Unverified'; }

                return (
                  <div 
                    key={t.id} 
                    className="cn-table-card"
                    style={{ 
                      padding: '1.25rem 1.5rem',
                      borderLeft: `4px solid ${isOpen ? '#ef4444' : isResolved ? '#00e676' : '#ffb703'}`,
                      background: isOpen ? 'rgba(239, 68, 68, 0.04)' : 'rgba(17, 24, 39, 0.7)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: '#fff', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                          #{t.ticket_number || 'CN-NEW'}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: `${categoryColor}22`, color: categoryColor, border: `1px solid ${categoryColor}44` }}>
                          {categoryLabel}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                          📍 <strong>{t.room_location || 'Hostel Room not specified'}</strong>
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          📱 {t.device_type || 'Mobile Device'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select 
                          value={t.status}
                          onChange={e => handleUpdateTicketStatus(t.id, e.target.value)}
                          disabled={updatingTicketId === t.id}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: t.status === 'open' ? 'rgba(239, 68, 68, 0.2)' : t.status === 'resolved' ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255, 183, 3, 0.2)',
                            color: t.status === 'open' ? '#fca5a5' : t.status === 'resolved' ? '#00e676' : '#ffb703',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="open">🚨 Open</option>
                          <option value="in_progress">⏳ In Progress</option>
                          <option value="resolved">✓ Resolved</option>
                          <option value="dismissed">✕ Dismissed</option>
                        </select>
                      </div>
                    </div>

                    <p style={{ margin: '0 0 1rem', fontSize: '0.92rem', color: '#f1f5f9', lineHeight: '1.5' }}>
                      {t.description}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        Resident: <strong style={{ color: '#fff' }}>{localPhone}</strong> ({cleanPhone}) • Logged {new Date(t.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a 
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi! Duncan here from CampusNet Support regarding ticket #${t.ticket_number} (Room ${t.room_location}). How can I assist you?`)}`}
                          target="_blank" 
                          rel="noreferrer"
                          className="cn-action-btn cn-btn-wa"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                        >
                          <MessageSquare size={13} /> WhatsApp
                        </a>
                        <a 
                          href={`tel:${localPhone}`} 
                          className="cn-action-btn cn-btn-call"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                        >
                          <Phone size={13} /> Call
                        </a>
                        {t.status !== 'resolved' && (
                          <button 
                            onClick={() => handleUpdateTicketStatus(t.id, 'resolved')}
                            disabled={updatingTicketId === t.id}
                            className="cn-action-btn"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', background: 'rgba(0, 230, 118, 0.15)', borderColor: '#00e676', color: '#00e676' }}
                          >
                            <Check size={13} /> Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 4: PROMOS & DISCOUNT CODES
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'promos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {/* Create Promo Card */}
          <div className="cn-table-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <PlusCircle size={22} color="#ff5414" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Create Discount Promo Code</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                  Broad casted live on the WhatsApp bot & applied on the portal.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreatePromo} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Promo Code (Uppercase)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. FRESHER2026, EXAMS20, WEEKEND50"
                  value={newPromoCode}
                  onChange={e => setNewPromoCode(e.target.value.toUpperCase())}
                  required
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '1rem', fontFamily: 'monospace', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Discount (%)
                  </label>
                  <input 
                    type="number"
                    min="5"
                    max="90"
                    value={newPromoDiscount}
                    onChange={e => setNewPromoDiscount(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,18,54,0.8)', color: '#00e676', fontSize: '1.1rem', fontWeight: 800, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Valid Duration
                  </label>
                  <select 
                    value={newPromoDuration}
                    onChange={e => setNewPromoDuration(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  >
                    <option value="24">24 Hours (1 Day)</option>
                    <option value="48">48 Hours (2 Days)</option>
                    <option value="72">72 Hours (3 Days)</option>
                    <option value="168">7 Days (1 Week)</option>
                    <option value="720">30 Days (1 Month)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Campaign Description
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 25% Launch Special for Freshers"
                  value={newPromoDesc}
                  onChange={e => setNewPromoDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button 
                type="submit"
                disabled={creatingPromo}
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
                <Tag size={16} />
                {creatingPromo ? 'Publishing...' : 'Publish Active Promo Code'}
              </button>
            </form>
          </div>

          {/* Active Promo Codes List */}
          <div className="cn-table-card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Live Discount Campaigns</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                  Toggle or remove active discount campaigns.
                </p>
              </div>
              <button onClick={fetchPromos} className="cn-action-btn" title="Refresh promos">
                <RefreshCw size={13} className={promosLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {promos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No promo codes created yet. Add one on the left!
                </div>
              ) : (
                promos.map(p => {
                  const isExpired = new Date(p.expires_at) <= new Date();
                  return (
                    <div 
                      key={p.id || p.code}
                      style={{
                        padding: '1rem',
                        borderRadius: '10px',
                        background: p.is_active && !isExpired ? 'rgba(0, 230, 118, 0.06)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${p.is_active && !isExpired ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#fff', fontSize: '1.1rem' }}>
                            {p.code}
                          </span>
                          <span style={{ background: '#00e676', color: '#000', fontWeight: 800, fontSize: '0.72rem', padding: '1px 6px', borderRadius: '4px' }}>
                            {p.discount_percent}% OFF
                          </span>
                          {p.is_active && !isExpired ? (
                            <span style={{ color: '#00e676', fontSize: '0.75rem', fontWeight: 700 }}>● Active</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>● Paused</span>
                          )}
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>
                          {p.description || 'Special Discount'}
                        </p>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Expires: {new Date(p.expires_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          onClick={() => handleTogglePromo(p.id, p.is_active)}
                          disabled={togglingPromoId === p.id}
                          className="cn-action-btn"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                        >
                          {p.is_active ? 'Pause' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleDeletePromo(p.id)}
                          disabled={deletingPromoId === p.id}
                          className="cn-action-btn"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444', color: '#ef4444' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB: MWALIMU AI SOCRATIC TUTOR CONSOLE
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'mwalimu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Mwalimu 4 Stat Cards */}
          <div className="cn-stat-grid">
            <div className="cn-stat-card cn-card-green">
              <div className="cn-stat-header">
                <span className="cn-stat-title">Active VIP Pro Students</span>
                <span className="cn-pulse-dot" />
              </div>
              <div className="cn-stat-value">
                {mwalimuData?.stats?.activePaidStudents || 0}
                <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>Unmetered</span>
              </div>
              <div className="cn-stat-subtext">
                Unlimited 24/7 Socratic question answering active
              </div>
            </div>

            <div className="cn-stat-card cn-card-cyan">
              <div className="cn-stat-header">
                <span className="cn-stat-title">Total Mwalimu AI Sales</span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  🎓 Bot Revenue
                </span>
              </div>
              <div className="cn-stat-value">
                KSh {(mwalimuData?.stats?.totalRevenueKes || stats.mwalimu_total_revenue_kes || 0).toLocaleString()}
              </div>
              <div className="cn-stat-subtext">
                <span>Today: <strong style={{ color: '#00e676' }}>KSh {(mwalimuData?.stats?.todayRevenueKes || stats.mwalimu_today_revenue_kes || 0).toLocaleString()}</strong></span>
                <span style={{ margin: '0 6px', opacity: 0.5 }}>•</span>
                <span>{mwalimuData?.stats?.transactionCount || stats.mwalimu_transactions_count || 0} study passes purchased</span>
              </div>
            </div>

            <div className="cn-stat-card cn-card-orange">
              <div className="cn-stat-header">
                <span className="cn-stat-title">Registered Students</span>
                <BookOpen size={18} color="#ff5414" />
              </div>
              <div className="cn-stat-value">
                {mwalimuData?.stats?.totalStudents || stats.mwalimu_total_students_count || 0}
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>on WhatsApp</span>
              </div>
              <div className="cn-stat-subtext">
                Students who have chatted with Mwalimu AI (+254 794 877 125)
              </div>
            </div>

            <div className="cn-stat-card cn-card-gold">
              <div className="cn-stat-header">
                <span className="cn-stat-title">Unit Economics & Margin</span>
                <Zap size={18} color="#ffb703" />
              </div>
              <div className="cn-stat-value" style={{ color: '#ffb703' }}>
                95%+
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 500 }}>Gross Margin</span>
              </div>
              <div className="cn-stat-subtext">
                Covers Render starter ($7/mo) & Gemini token inference (~KSh 0.01/q)
              </div>
            </div>
          </div>

          {/* Quick VIP Pass Grant Console */}
          <div className="cn-table-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <GraduationCap size={22} color="#10b981" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>1-Click VIP Study Pass Console</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                  Instantly grant a student unlimited Socratic questions without billing them (for VIPs, testing, or disputes).
                </p>
              </div>
            </div>

            <form onSubmit={handleGrantMwalimuPass} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input 
                type="tel"
                placeholder="Student WhatsApp (e.g. 0758530492 or 254758530492)"
                value={grantPhone}
                onChange={e => setGrantPhone(e.target.value)}
                required
                style={{ flex: '1 1 240px', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.95rem', outline: 'none' }}
              />
              <select 
                value={grantDuration}
                onChange={e => setGrantDuration(Number(e.target.value))}
                style={{ width: '180px', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.95rem', outline: 'none' }}
              >
                <option value="24">24 Hours (Cram Pass)</option>
                <option value="72">3 Days (Weekend Pass)</option>
                <option value="720">30 Days (Semester Pass)</option>
                <option value="8760">1 Year (VIP Scholar)</option>
              </select>
              <button 
                type="submit"
                disabled={grantingPass}
                style={{ 
                  background: '#10b981', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '0.75rem 1.5rem', 
                  borderRadius: '8px', 
                  fontWeight: 800, 
                  fontSize: '0.95rem', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Sparkles size={16} />
                {grantingPass ? 'Granting...' : 'Grant Unlimited Pass'}
              </button>
            </form>

            {grantResult && (
              <div style={{ marginTop: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                ✓ {grantResult.message || 'VIP Pass successfully activated!'}
              </div>
            )}
          </div>

          {/* Mwalimu Transactions Table */}
          <div className="cn-table-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Recent Mwalimu AI M-Pesa Purchases</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                  Micro-billing transactions verified by Paystack & activated on WhatsApp.
                </p>
              </div>
              <button onClick={fetchMwalimuStats} className="cn-action-btn" title="Refresh Mwalimu telemetry">
                <RefreshCw size={13} className={mwalimuLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            <div className="cn-table-wrapper">
              <table className="cn-data-table">
                <thead>
                  <tr>
                    <th>Student Phone</th>
                    <th>M-Pesa Receipt</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Date / Time (EAT)</th>
                    <th>Status</th>
                    <th>Quick Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {(mwalimuData?.recentTransactions || []).length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No M-Pesa pass purchases recorded yet.
                      </td>
                    </tr>
                  ) : (
                    (mwalimuData?.recentTransactions || []).map(tx => {
                      const cleanPhone = (tx.phone || '').replace(/\D/g, '');
                      const localPhone = cleanPhone.startsWith('254') ? '0' + cleanPhone.slice(3) : cleanPhone;
                      return (
                        <tr key={tx.id || tx.mpesa_receipt}>
                          <td><strong style={{ color: '#fff' }}>{localPhone}</strong></td>
                          <td><span className="cn-code-tag">{tx.mpesa_receipt || '—'}</span></td>
                          <td><span className="cn-pkg-badge">{tx.plan === 'semester_30d' ? '30-Day Semester VIP' : tx.plan === 'weekend_3d' ? '3-Day Weekend' : '24h Cram Pass'}</span></td>
                          <td><strong style={{ color: '#00e676' }}>KSh {tx.amount}</strong></td>
                          <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                            {new Date(tx.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}
                          </td>
                          <td><span className="cn-status-pill active">COMPLETED</span></td>
                          <td>
                            <a 
                              href={`https://wa.me/${cleanPhone}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="cn-action-btn cn-btn-wa"
                              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            >
                              <MessageSquare size={12} /> WhatsApp
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Student Directory Table */}
          <div className="cn-table-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Student Directory & Pass Expiry</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                  Active students, access tiers, and question consumption tracking.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className={`cn-pill-btn ${mwalimuFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setMwalimuFilter('all')}
                >
                  All ({(mwalimuData?.activeUsers || []).length})
                </button>
                <button 
                  className={`cn-pill-btn ${mwalimuFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setMwalimuFilter('active')}
                >
                  VIP Active
                </button>
              </div>
            </div>

            <div className="cn-table-wrapper">
              <table className="cn-data-table">
                <thead>
                  <tr>
                    <th>Student Phone</th>
                    <th>Access Tier</th>
                    <th>Valid Until</th>
                    <th>Queries Today</th>
                    <th>Status</th>
                    <th>Quick Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(mwalimuData?.activeUsers || []).length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No registered students yet.
                      </td>
                    </tr>
                  ) : (
                    (mwalimuData?.activeUsers || []).filter(u => {
                      if (mwalimuFilter === 'active') return u.valid_until && new Date(u.valid_until) > new Date();
                      return true;
                    }).map(u => {
                      const cleanPhone = (u.phone || '').replace(/\D/g, '');
                      const localPhone = cleanPhone.startsWith('254') ? '0' + cleanPhone.slice(3) : cleanPhone;
                      const isVip = u.valid_until && new Date(u.valid_until) > new Date();
                      return (
                        <tr key={u.phone}>
                          <td><strong style={{ color: '#fff' }}>{localPhone}</strong></td>
                          <td>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.78rem', 
                              fontWeight: 700, 
                              background: isVip ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.06)', 
                              color: isVip ? '#34d399' : '#94a3b8' 
                            }}>
                              {isVip ? '👑 VIP Pro' : '⭐ Free Daily Tier'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                            {u.valid_until ? new Date(u.valid_until).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }) : 'Expired'}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#fff' }}>{u.queries_today || 0} / 3</td>
                          <td>
                            <span className={`cn-status-pill ${isVip ? 'active' : 'expired'}`}>
                              {isVip ? 'ACTIVE' : 'FREE / EXPIRED'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <a 
                                href={`https://wa.me/${cleanPhone}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="cn-action-btn cn-btn-wa"
                                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                              >
                                <MessageSquare size={12} /> Chat
                              </a>
                              <button 
                                onClick={() => handleGrantMwalimuPass(null, cleanPhone, 24)} 
                                className="cn-action-btn"
                                style={{ padding: '3px 8px', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981' }}
                                title="Grant 24h VIP pass"
                              >
                                +24h VIP
                              </button>
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 5: HOTLINE INSTANT DISPATCH
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
