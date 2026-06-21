import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { 
  Shield, 
  Terminal, 
  Database, 
  Mail, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Plus, 
  Copy, 
  ExternalLink, 
  BookOpen, 
  Lock, 
  ArrowLeft, 
  Cpu, 
  Zap, 
  Play, 
  Settings,
  ChevronRight,
  LogOut,
  User,
  Activity,
  FileCode,
  Sliders,
  DollarSign
} from 'lucide-react';
import axios from 'axios';
import { BunkerLayout, theme } from './theme';
import { HookBunkerAuth } from './HookBunkerAuth';
import './HookBunkerDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

export function HookBunkerDashboard({ onNavigate }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Dashboard data states
  const [projects, setProjects] = useState([]);
  const [selectedProj, setSelectedProj] = useState(null);
  const [activeProjTab, setActiveProjTab] = useState('logs'); // 'logs' | 'integration' | 'settings' | 'billing'
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  
  // Project creation form
  const [projName, setProjName] = useState('');
  const [projTargetUrl, setProjTargetUrl] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionError, setActionError] = useState('');

  // Feedback states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState('feature_request'); // 'feature_request' | 'feedback'
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // NPS rating prompt states
  const [showNpsPrompt, setShowNpsPrompt] = useState(false);
  const [npsRating, setNpsRating] = useState(0);
  const [npsComment, setNpsComment] = useState('');
  const [npsStep, setNpsStep] = useState(1); // 1: stars, 2: comment, 3: thank you

  // Profile & subscription states
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [billingCurrency, setBillingCurrency] = useState('KES');
  
  // Password Change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // Custom Toast State
  const [toast, setToast] = useState(null); // { message, type: 'info' | 'success' | 'error' }
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };
  
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Check for pending toast notifications (e.g. from email confirmation redirects)
  useEffect(() => {
    const pendingMsg = sessionStorage.getItem('hb_toast_message');
    const pendingType = sessionStorage.getItem('hb_toast_type') || 'success';
    if (pendingMsg) {
      showToast(pendingMsg, pendingType);
      sessionStorage.removeItem('hb_toast_message');
      sessionStorage.removeItem('hb_toast_type');
    }
  }, []);

  // Auth session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch data on session change
  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchProfile();
    } else {
      setProjects([]);
      setSelectedProj(null);
      setProfile(null);
    }
  }, [user]);

  // Fetch logs when selected project changes
  useEffect(() => {
    if (selectedProj) {
      fetchLogs(selectedProj.id);
      setActiveProjTab('logs');
    }
  }, [selectedProj]);

  // Inactivity Auto-Logout Timer (15 minutes limit)
  useEffect(() => {
    if (!user) return;

    let timeoutId;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

    const handleLogoutOnInactivity = async () => {
      console.log('Session expired due to user inactivity.');
      sessionStorage.setItem('hb_logout_reason', 'inactivity');
      await supabase.auth.signOut();
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogoutOnInactivity, INACTIVITY_LIMIT);
    };

    // Activity event listeners
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [user]);

  // NPS rating prompt trigger
  useEffect(() => {
    if (user && projects.length > 0) {
      const lastPrompt = localStorage.getItem('hookbunker_last_rating_prompt');
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
      if (!lastPrompt || (Date.now() - parseInt(lastPrompt, 10)) > thirtyDays) {
        const timer = setTimeout(() => {
          setShowNpsPrompt(true);
          setNpsStep(1);
          setNpsRating(0);
          setNpsComment('');
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, projects]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    setActionError('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      const res = await axios.get(`${API_URL}/api/hookbunker/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data);
    } catch (err) {
      setActionError('Failed to retrieve ingestion endpoints.');
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      // Fixed 406 by adding explicit id filter
      let { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;

      if (!data) {
        data = {
          id: user.id,
          email: user.email,
          subscription_tier: 'free',
          subscription_status: 'active',
          created_at: new Date().toISOString()
        };
      }
      setProfile(data);
    } catch (e) {
      console.error('Error fetching subscription profile:', e.message);
      setProfile({
        id: user.id,
        email: user.email,
        subscription_tier: 'free',
        subscription_status: 'active',
        created_at: new Date().toISOString()
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchLogs = async (projId) => {
    setLogsLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await axios.get(`${API_URL}/api/hookbunker/projects/${projId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadPaystackScript = () => {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) { resolve(window.PaystackPop); return; }
      if (document.getElementById('paystack-inline-script')) {
        const check = setInterval(() => {
          if (window.PaystackPop) {
            clearInterval(check);
            resolve(window.PaystackPop);
          }
        }, 100);
        return;
      }
      const script = document.createElement('script');
      script.id = 'paystack-inline-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => resolve(window.PaystackPop);
      script.onerror = () => reject(new Error('Failed to load Paystack checkout script.'));
      document.body.appendChild(script);
    });
  };

  const handleUpgradeTier = async (tierName, currency = 'KES') => {
    let amount = 0;
    if (tierName === 'team') {
      amount = currency === 'KES' ? 3400 : 26;
    } else if (tierName === 'business') {
      amount = currency === 'KES' ? 11500 : 89;
    } else {
      return;
    }

    const amountInSubunits = amount * 100;

    try {
      setActionError('');
      const PaystackPop = await loadPaystackScript();

      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: amountInSubunits,
        currency: currency,
        metadata: {
          type: 'hookbunker_subscription',
          tier: tierName,
          userId: user.id
        },
        callback: function (paystackResponse) {
          (async () => {
            try {
              const session = await supabase.auth.getSession();
              const token = session.data.session?.access_token;

              const res = await axios.post(`${API_URL}/api/hookbunker/verify-subscription`, {
                reference: paystackResponse.reference
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });

              if (res.data?.success) {
                setProfile(res.data.profile);
                showToast(`Your subscription has been updated to the ${tierName.toUpperCase()} plan.`, 'success');
              }
            } catch (verifyErr) {
              showToast(verifyErr.response?.data?.error || 'Verification failed. Please contact support.', 'error');
            }
          })();
        },
        onClose: function () {
          console.log('Subscription checkout closed.');
        }
      });

      handler.openIframe();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setActionError('');
    if (!projName || !projTargetUrl) {
      setActionError('Please specify both a project name and target destination.');
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await axios.post(`${API_URL}/api/hookbunker/projects`, {
        name: projName.trim(),
        targetUrl: projTargetUrl.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setProjects([...projects, res.data]);
      setProjName('');
      setProjTargetUrl('');
      setShowCreateForm(false);
      setSelectedProj(res.data);
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to create active ingestion endpoint.');
    }
  };

  const handleToggleProjectActive = async (projId) => {
    setActionError('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await axios.patch(`${API_URL}/api/hookbunker/projects/${projId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updated = projects.map(p => p.id === projId ? { ...p, active: res.data.active } : p);
      setProjects(updated);
      if (selectedProj?.id === projId) {
        setSelectedProj({ ...selectedProj, active: res.data.active });
      }
    } catch (err) {
      setActionError(err.response?.data?.error || 'Could not toggle active status.');
    }
  };

  const handleDeleteProject = async (projId) => {
    if (!window.confirm('Are you sure you want to permanently delete this webhook gateway? This action is irreversible.')) {
      return;
    }

    setActionError('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      await axios.delete(`${API_URL}/api/hookbunker/projects/${projId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const filtered = projects.filter(p => p.id !== projId);
      setProjects(filtered);
      setSelectedProj(null);
    } catch (err) {
      setActionError('Failed to delete webhook gateway.');
    }
  };

  const handleForceRedeliver = async (logId) => {
    setActionError('');
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await axios.post(`${API_URL}/api/hookbunker/webhooks/${logId}/retry`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        showToast('Manual redelivery request dispatched successfully.', 'success');
        if (selectedProj) {
          fetchLogs(selectedProj.id);
        }
        setSelectedLog(null);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Redelivery attempt failed.', 'error');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }

    setPasswordUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess('Access credentials updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update credentials.');
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard.', 'success');
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackSubmitting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      await axios.post(`${API_URL}/api/hookbunker/feedback`, {
        type: feedbackType,
        title: feedbackTitle,
        content: feedbackContent
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setFeedbackSuccess(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSuccess(false);
        setFeedbackTitle('');
        setFeedbackContent('');
      }, 2000);
    } catch (err) {
      showToast('Failed to transmit feedback. Please try again.', 'error');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleNpsSubmit = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      await axios.post(`${API_URL}/api/hookbunker/feedback`, {
        type: 'routine_rating',
        rating: npsRating,
        content: npsComment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNpsStep(3);
      localStorage.setItem('hookbunker_last_rating_prompt', Date.now().toString());
      setTimeout(() => {
        setShowNpsPrompt(false);
      }, 3000);
    } catch (err) {
      setShowNpsPrompt(false);
    }
  };

  const handleNpsDismiss = () => {
    setShowNpsPrompt(false);
    localStorage.setItem('hookbunker_last_rating_prompt', (Date.now() - (23 * 24 * 60 * 60 * 1000)).toString());
  };

  if (authLoading) {
    return (
      <BunkerLayout onNavigate={onNavigate}>
        <div style={{ textAlign: 'center', padding: '6rem' }}>
          <RefreshCw size={36} color={theme.primary} className="spin-animation" />
          <p style={{ color: theme.textMuted, marginTop: '1rem' }}>Checking authorization credentials...</p>
        </div>
      </BunkerLayout>
    );
  }

  // Render Login Form if Unauthenticated
  if (!user) {
    return <HookBunkerAuth onNavigate={onNavigate} />;
  }

  return (
    <BunkerLayout onNavigate={onNavigate}>
      {/* Dashboard Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', borderBottom: `1px solid ${theme.border}`, paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: theme.primary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Developer Workspace</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '4px 0 0' }}>Welcome, {user.email}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            onClick={() => { setShowFeedbackModal(true); setFeedbackType('feature_request'); }}
            style={{ background: 'rgba(16, 185, 129, 0.1)', border: `1px solid rgba(16, 185, 129, 0.25)`, color: theme.success, padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
          >
            Request Feature
          </button>
          <button 
            onClick={() => { setShowFeedbackModal(true); setFeedbackType('feedback'); }}
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
          >
            Feedback
          </button>
          <button 
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.15)', color: theme.danger, padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </div>

      {actionError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: theme.danger, padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {actionError}
        </div>
      )}

      {/* RENDER VIEW 1: Overview Dashboard (selectedProj is null) */}
      {!selectedProj ? (
        <div>
          {/* Top Bar slots progress and new creation button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Webhook Ingestion Endpoints</h2>
            <button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              style={{ background: theme.primary, color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> New Ingestion Target
            </button>
          </div>

          {/* Inline Create Ingestion Form */}
          {showCreateForm && (
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', fontFamily: 'Montserrat, sans-serif' }}>Configure Webhook Destination</h3>
              <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Application Name</label>
                    <input 
                      type="text" 
                      value={projName}
                      onChange={e => setProjName(e.target.value)}
                      placeholder="e.g. Payments Gateway Ingestion"
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.4rem' }}>Target Destination URL</label>
                    <input 
                      type="url" 
                      value={projTargetUrl}
                      onChange={e => setProjTargetUrl(e.target.value)}
                      placeholder="https://api.mywebsite.com/v1/mpesa-callback"
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setShowCreateForm(false)} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`, color: '#fff', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button type="submit" style={{ background: theme.primary, color: '#fff', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Initialize Destination</button>
                </div>
              </form>
            </div>
          )}

          {/* Project Capacity Limit Indicator */}
          {!profileLoading && (() => {
            const activeCount = projects.filter(p => p.active).length;
            const tierLimit = profile?.subscription_tier === 'team' ? 5 : profile?.subscription_tier === 'business' ? Infinity : 1;
            const tierLimitLabel = profile?.subscription_tier === 'team' ? '5' : profile?.subscription_tier === 'business' ? 'Unlimited' : '1';
            return (
              <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '1.25rem 1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, marginBottom: '8px' }}>
                  <span>Active Channels: {activeCount} / {tierLimitLabel}</span>
                  {profile?.subscription_tier !== 'business' && (
                    <span style={{ color: theme.primary }}>Free accounts are capped at 1 ingestion channel. Upgrade to expand capacity.</span>
                  )}
                </div>
                {profile?.subscription_tier !== 'business' && (
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, (activeCount / tierLimit) * 100)}%`, 
                      height: '100%', 
                      background: activeCount >= tierLimit ? theme.danger : theme.primary,
                      borderRadius: '999px'
                    }} />
                  </div>
                )}
              </div>
            );
          })()}

          {/* Projects Listing Grid */}
          {projectsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: theme.textMuted }}>
              <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 1rem' }} /> Retrieving service channels...
            </div>
          ) : projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 2rem', background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '16px', color: theme.textMuted }}>
              <Database size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.1rem' }}>No active ingestion channels</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Configure your first webhook destination to begin routing billing payloads securely.</p>
            </div>
          ) : (
            <div className="hb-projects-grid">
              {projects.map((p) => (
                <div key={p.id} className="hb-project-card" onClick={() => setSelectedProj(p)}>
                  <div>
                    <div className="hb-card-header">
                      <h3 className="hb-project-name">{p.name}</h3>
                      <span className={`hb-badge ${p.active ? 'hb-badge-active' : 'hb-badge-suspended'}`}>
                        {p.active ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 700 }}>Destination URL</span>
                      <span className="hb-project-url" style={{ marginTop: '2px' }}>{p.target_url}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${theme.border}`, paddingTop: '1rem', marginTop: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: theme.textMuted }}>Created: {new Date(p.created_at).toLocaleDateString()}</span>
                    <span style={{ fontSize: '0.8rem', color: theme.primary, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                      Console Workspace <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Billing & Subscription & Security Configuration for All Services page */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginTop: '3.5rem' }}>
            {/* Billing Panel */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '2rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, fontFamily: 'Montserrat, sans-serif' }}>Plan &amp; Usage Metrics</h3>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                  <button onClick={() => setBillingCurrency('KES')} style={{ background: billingCurrency === 'KES' ? theme.primary : 'none', color: billingCurrency === 'KES' ? '#fff' : theme.textMuted, border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>KES</button>
                  <button onClick={() => setBillingCurrency('USD')} style={{ background: billingCurrency === 'USD' ? theme.primary : 'none', color: billingCurrency === 'USD' ? '#fff' : theme.textMuted, border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>USD</button>
                </div>
              </div>

              {profileLoading ? (
                <p style={{ color: theme.textMuted, fontSize: '0.9rem' }}>Loading billing details...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: theme.textMuted, display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Current Subscription Level</span>
                    <span style={{ textTransform: 'uppercase', fontWeight: 800, color: theme.primary, fontSize: '1.1rem', display: 'block', marginTop: '2px' }}>
                      {profile?.subscription_tier || 'FREE'}
                    </span>
                  </div>
                  
                  <div style={{ color: theme.textMuted, fontSize: '0.85rem', borderTop: `1px solid ${theme.border}`, paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Active Channel Limit: <b>{profile?.subscription_tier === 'team' ? '5 Channels' : profile?.subscription_tier === 'business' ? 'Unlimited' : '1 Channel'}</b></div>
                    <div>Monthly Ingestion Volume: <b>{profile?.subscription_tier === 'team' ? '25,000 / mo' : profile?.subscription_tier === 'business' ? '150,000 / mo' : '500 / mo'}</b></div>
                  </div>

                  {(!profile || profile.subscription_tier === 'free') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button onClick={() => handleUpgradeTier('team', billingCurrency)} style={{ background: theme.secondary, color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                        Upgrade to Team ({billingCurrency === 'KES' ? 'KES 3,400' : '$26'}/mo)
                      </button>
                      <button onClick={() => handleUpgradeTier('business', billingCurrency)} style={{ background: 'none', border: `1px solid ${theme.primary}`, color: theme.primary, padding: '0.6rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                        Upgrade to Business ({billingCurrency === 'KES' ? 'KES 11,500' : '$89'}/mo)
                      </button>
                    </div>
                  )}

                  {profile?.subscription_tier === 'team' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button onClick={() => handleUpgradeTier('business', billingCurrency)} style={{ background: theme.primary, color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                        Upgrade to Business ({billingCurrency === 'KES' ? 'KES 11,500' : '$89'}/mo)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Account Credentials Panel */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '2rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem', fontFamily: 'Montserrat, sans-serif' }}>Access Control &amp; Credentials</h3>
              
              {passwordError && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: theme.danger, padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{passwordError}</div>}
              {passwordSuccess && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: theme.success, padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{passwordSuccess}</div>}

              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '2px' }}>New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '2px' }}>Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.85rem' }} />
                </div>
                <button type="submit" disabled={passwordUpdating} style={{ background: theme.primary, color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {passwordUpdating ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* RENDER VIEW 2: Project-Specific Workspace (selectedProj !== null) */
        <div>
          {/* Project Details Workspace Header */}
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
            <button 
              onClick={() => setSelectedProj(null)}
              style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0, marginBottom: '1.25rem' }}
            >
              <ArrowLeft size={16} /> Back to Ingestion Endpoints
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, fontFamily: 'Montserrat, sans-serif' }}>{selectedProj.name}</h2>
                  <span className={`hb-badge ${selectedProj.active ? 'hb-badge-active' : 'hb-badge-suspended'}`}>
                    {selectedProj.active ? 'Ingesting' : 'Suspended'}
                  </span>
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 700 }}>Ingestion Endpoint:</span>
                  <code style={{ background: '#050a14', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', color: theme.primary, fontFamily: 'monospace' }}>
                    {`${API_URL}/api/hookbunker/webhooks/${selectedProj.api_key}`}
                  </code>
                  <button onClick={() => copyToClipboard(`${API_URL}/api/hookbunker/webhooks/${selectedProj.api_key}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, padding: 0 }} title="Copy Endpoint"><Copy size={13} /></button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => handleToggleProjectActive(selectedProj.id)}
                  style={{
                    background: selectedProj.active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${selectedProj.active ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                    color: selectedProj.active ? theme.danger : theme.success,
                    cursor: 'pointer',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                >
                  {selectedProj.active ? 'Suspend Route' : 'Activate Route'}
                </button>
                <button 
                  onClick={() => handleDeleteProject(selectedProj.id)}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: theme.danger, padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                  title="Delete Ingestion Channel"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Workstation Tabs Navigation */}
          <div className="hb-tabs-row">
            <button 
              onClick={() => setActiveProjTab('logs')} 
              className={`hb-tab-btn ${activeProjTab === 'logs' ? 'active' : ''}`}
            >
              <Activity size={16} /> Callback History
            </button>
            <button 
              onClick={() => setActiveProjTab('integration')} 
              className={`hb-tab-btn ${activeProjTab === 'integration' ? 'active' : ''}`}
            >
              <FileCode size={16} /> Integration Details
            </button>
            <button 
              onClick={() => setActiveProjTab('settings')} 
              className={`hb-tab-btn ${activeProjTab === 'settings' ? 'active' : ''}`}
            >
              <Sliders size={16} /> Settings
            </button>
            <button 
              onClick={() => setActiveProjTab('billing')} 
              className={`hb-tab-btn ${activeProjTab === 'billing' ? 'active' : ''}`}
            >
              <DollarSign size={16} /> Plan &amp; Access
            </button>
          </div>

          {/* TAB 1: Logs */}
          {activeProjTab === 'logs' && (
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '2rem', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: `1px solid ${theme.border}`, paddingBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Webhook Event Logs</h3>
                <button 
                  onClick={() => fetchLogs(selectedProj.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.45rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  <RefreshCw size={12} /> Sync Logs
                </button>
              </div>

              {logsLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: theme.textMuted }}>
                  <RefreshCw size={24} className="spin-animation" style={{ marginRight: '8px' }} /> Fetching transaction payloads...
                </div>
              ) : logs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: theme.textMuted }}>
                  <Terminal size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No webhooks captured yet for this route.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px', margin: '4px 0 0' }}>Point your gateway callbacks to the Ingestion URL shown above to begin monitoring.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {profile?.subscription_tier !== 'business' && (
                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#93c5fd' }}>
                        <Terminal size={14} />
                        <span>Free accounts are limited to 3-day log retention. Upgrade to store logs for up to <b>30 days</b>.</span>
                      </div>
                      <button onClick={() => handleUpgradeTier(profile?.subscription_tier === 'team' ? 'business' : 'team', billingCurrency)} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', padding: 0 }}>Learn more &rarr;</button>
                    </div>
                  )}

                  {/* Logs Table */}
                  <div className="hb-table-container">
                    <table className="hb-table">
                      <thead>
                        <tr>
                          <th>Captured</th>
                          <th>Gateway</th>
                          <th>Method</th>
                          <th>Reference</th>
                          <th>Customer</th>
                          <th>Amount</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => {
                          const date = new Date(log.created_at).toLocaleString();
                          const isSuccess = log.status === 'success';
                          return (
                            <tr key={log.id}>
                              <td style={{ fontSize: '0.8rem', color: theme.textMuted }}>{date}</td>
                              <td style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: '0.75rem' }}>
                                <span style={{
                                  background: log.gateway === 'mpesa' ? '#10b98120' : log.gateway === 'paystack' ? '#0ea5e920' : 'rgba(255,255,255,0.05)',
                                  color: log.gateway === 'mpesa' ? '#10b981' : log.gateway === 'paystack' ? '#38bdf8' : '#fff',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  {log.gateway}
                                </span>
                              </td>
                              <td>
                                <span style={{
                                  background: 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${theme.border}`,
                                  color: '#e5e7eb',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  textTransform: 'capitalize'
                                }}>
                                  {log.payment_method ? log.payment_method.replace('_', ' ') : '—'}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.transaction_code || '—'}</td>
                              <td style={{ fontSize: '0.8rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ color: log.email ? '#fff' : theme.textMuted }}>{log.email || log.phone || '—'}</span>
                                  {log.email && log.phone && <span style={{ color: theme.textMuted, fontSize: '0.7rem' }}>{log.phone}</span>}
                                </div>
                              </td>
                              <td style={{ fontWeight: 600 }}>{log.amount ? `${log.gateway === 'mpesa' ? 'KES' : '$'} ${log.amount}` : '—'}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  background: isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: isSuccess ? theme.success : theme.danger,
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  textTransform: 'uppercase'
                                }}>
                                  {log.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button onClick={() => setSelectedLog(log)} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`, color: '#fff', padding: '0.25rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Inspect</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Dynamic Integration guides containing real API keys */}
          {activeProjTab === 'integration' && (
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '2.5rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', fontFamily: 'Montserrat, sans-serif' }}>Decoupled Integration Code for {selectedProj.name}</h3>
              <p style={{ color: theme.textMuted, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '2rem' }}>
                Use these customized, production-ready templates to securely parse forward webhooks on your server. Your Ingestion Proxy URL and project API keys are pre-injected.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Safaricom M-Pesa Code */}
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: `1px solid ${theme.border}`, paddingBottom: '0.5rem' }}>1. Safaricom M-Pesa Integration (STK Push &amp; Confirms)</h4>
                  <pre className="hb-code-box">
{`// Proxy Endpoint: ${API_URL}/api/hookbunker/webhooks/${selectedProj.api_key}

const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/mpesa-callback', (req, res) => {
  const payload = req.body;
  
  if (payload.Body && payload.Body.stkCallback) {
    const callbackData = payload.Body.stkCallback;
    if (callbackData.ResultCode === 0) {
      const metadata = callbackData.CallbackMetadata.Item;
      const amount = metadata.find(item => item.Name === 'Amount')?.Value;
      const receipt = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const phone = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
      
      console.log(\`[SUCCESS] STK Push: Receipt \${receipt} confirmed for KES \${amount}\`);
      // Update buyer record to active
    }
  } else if (payload.TransactionType) {
    // C2B Confirms
    console.log(\`[SUCCESS] C2B confirmation receipt: \${payload.TransID} value: \${payload.TransAmount}\`);
  }
  
  res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
});`}
                  </pre>
                </div>

                {/* Paystack Webhook Code */}
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: `1px solid ${theme.border}`, paddingBottom: '0.5rem' }}>2. Paystack Webhook Verification (HMAC SHA512)</h4>
                  <pre className="hb-code-box">
{`// Configure Webhook Target: ${API_URL}/api/hookbunker/webhooks/${selectedProj.api_key}

const express = require('express');
const crypto = require('crypto');
const app = express();

app.post('/api/paystack-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY; // your live secret key
  const signature = req.headers['x-paystack-signature'];
  
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(req.body)
    .digest('hex');
    
  if (hash !== signature) {
    console.error('Webhook signature validation failed. Spoofed payload warning.');
    return res.status(401).send('Invalid signature');
  }
  
  const eventData = JSON.parse(req.body.toString());
  if (eventData.event === 'charge.success') {
    const data = eventData.data;
    console.log(\`Payment reference confirmed: \${data.reference} | Customer: \${data.customer.email}\`);
    // Upgrade account subscription level
  }
  
  res.status(200).send('Verified');
});`}
                  </pre>
                </div>

                {/* Payhero Webhook Code */}
                <div>
                  <h4 style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: `1px solid ${theme.border}`, paddingBottom: '0.5rem' }}>3. Payhero Callback Receiver</h4>
                  <pre className="hb-code-box">
{`// Configure Ingestion Endpoint: ${API_URL}/api/hookbunker/webhooks/${selectedProj.api_key}

const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/payhero-callback', (req, res) => {
  const { status, transaction_id, amount, reference } = req.body;
  if (status === 'Success') {
    console.log(\`Payhero Payment confirmed: \${transaction_id} Amount: \${amount} Ref: \${reference}\`);
  }
  res.status(200).json({ success: true });
});`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Project Settings (Update destination, toggle, delete) */}
          {activeProjTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '2.5rem', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', fontFamily: 'Montserrat, sans-serif' }}>Gateway Routing Parameters</h3>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setActionError('');
                  try {
                    const session = await supabase.auth.getSession();
                    const token = session.data.session?.access_token;
                    const res = await axios.put(`${API_URL}/api/hookbunker/projects/${selectedProj.id}`, {
                      name: selectedProj.name,
                      targetUrl: selectedProj.target_url
                    }, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    setSelectedProj(res.data);
                    const updated = projects.map(p => p.id === selectedProj.id ? res.data : p);
                    setProjects(updated);
                    showToast('Destination URL updated successfully.', 'success');
                  } catch (err) {
                    setActionError(err.response?.data?.error || 'Failed to update endpoint.');
                  }
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Project Name</label>
                      <input 
                        type="text" 
                        value={selectedProj.name}
                        onChange={e => setSelectedProj({ ...selectedProj, name: e.target.value })}
                        required
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Target Destination URL</label>
                      <input 
                        type="url" 
                        value={selectedProj.target_url}
                        onChange={e => setSelectedProj({ ...selectedProj, target_url: e.target.value })}
                        required
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                  <button type="submit" style={{ background: theme.primary, color: '#fff', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Save Changes</button>
                </form>
              </div>

              {/* Danger Zone */}
              <div style={{ background: 'rgba(239, 42, 42, 0.03)', border: '1px solid rgba(239, 42, 42, 0.25)', padding: '2.5rem', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.danger, marginBottom: '0.5rem', fontFamily: 'Montserrat, sans-serif' }}>Danger Zone</h3>
                <p style={{ color: theme.textMuted, fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Deleting this proxy channel will permanently terminate all webhook ingestion, logs data, and retry queues. This action is irreversible.
                </p>
                <button 
                  onClick={() => handleDeleteProject(selectedProj.id)}
                  style={{ background: theme.danger, color: '#fff', border: 'none', padding: '0.65rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Permanently Delete Channel
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Workspace Billing (Specific to billing) */}
          {activeProjTab === 'billing' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '2rem', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem', fontFamily: 'Montserrat, sans-serif' }}>Plan &amp; Limits Configuration</h3>
                {profileLoading ? (
                  <p style={{ color: theme.textMuted, fontSize: '0.9rem' }}>Loading billing details...</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                    <div>
                      <span style={{ color: theme.textMuted, display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Current Subscription Level</span>
                      <span style={{ textTransform: 'uppercase', fontWeight: 800, color: theme.primary, fontSize: '1.1rem', display: 'block', marginTop: '2px' }}>
                        {profile?.subscription_tier || 'FREE'}
                      </span>
                    </div>
                    
                    <div style={{ color: theme.textMuted, fontSize: '0.85rem', borderTop: `1px solid ${theme.border}`, paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>Active Channel Limit: <b>{profile?.subscription_tier === 'team' ? '5 Channels' : profile?.subscription_tier === 'business' ? 'Unlimited' : '1 Channel'}</b></div>
                      <div>Monthly Ingestion Volume: <b>{profile?.subscription_tier === 'team' ? '25,000 / mo' : profile?.subscription_tier === 'business' ? '150,000 / mo' : '500 / mo'}</b></div>
                    </div>

                    {(!profile || profile.subscription_tier === 'free') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button onClick={() => handleUpgradeTier('team', billingCurrency)} style={{ background: theme.secondary, color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                          Upgrade to Team ({billingCurrency === 'KES' ? 'KES 3,400' : '$26'}/mo)
                        </button>
                        <button onClick={() => handleUpgradeTier('business', billingCurrency)} style={{ background: 'none', border: `1px solid ${theme.primary}`, color: theme.primary, padding: '0.6rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                          Upgrade to Business ({billingCurrency === 'KES' ? 'KES 11,500' : '$89'}/mo)
                        </button>
                      </div>
                    )}

                    {profile?.subscription_tier === 'team' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button onClick={() => handleUpgradeTier('business', billingCurrency)} style={{ background: theme.primary, color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                          Upgrade to Business ({billingCurrency === 'KES' ? 'KES 11,500' : '$89'}/mo)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Password update in project view */}
              <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, padding: '2rem', borderRadius: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.25rem', fontFamily: 'Montserrat, sans-serif' }}>Change Access Credentials</h3>
                
                {passwordError && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: theme.danger, padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{passwordError}</div>}
                {passwordSuccess && <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: theme.success, padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{passwordSuccess}</div>}

                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '2px' }}>New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '2px' }}>Confirm Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: `1px solid ${theme.border}`, background: 'rgba(8,18,54,0.8)', color: '#fff', fontSize: '0.85rem' }} />
                  </div>
                  <button type="submit" disabled={passwordUpdating} style={{ background: theme.primary, color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                    {passwordUpdating ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Detail Slide-over Drawer */}
      {selectedLog && (
        <div className="hb-drawer-overlay" onClick={() => setSelectedLog(null)}>
          <div className="hb-drawer-body" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, fontFamily: 'Montserrat, sans-serif' }}>Webhook Inspection</h2>
              <button 
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: '1.75rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            <div style={{ background: 'rgba(8,18,54,0.8)', border: `1px solid ${theme.border}`, padding: '1.25rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td style={{ padding: '6px 0', color: theme.textMuted }}>Log ID:</td><td style={{ fontFamily: 'monospace', color: '#fff' }}>{selectedLog.id}</td></tr>
                  <tr><td style={{ padding: '6px 0', color: theme.textMuted }}>Ingestion Gateway:</td><td style={{ fontWeight: 700, color: theme.primary, textTransform: 'uppercase' }}>{selectedLog.gateway}</td></tr>
                  {selectedLog.payment_method && <tr><td style={{ padding: '6px 0', color: theme.textMuted }}>Payment Method:</td><td style={{ color: '#fff', textTransform: 'capitalize' }}>{selectedLog.payment_method.replace('_', ' ')}</td></tr>}
                  <tr><td style={{ padding: '6px 0', color: theme.textMuted }}>Gateway Reference:</td><td style={{ fontFamily: 'monospace', color: '#fff' }}>{selectedLog.transaction_code || '—'}</td></tr>
                  <tr><td style={{ padding: '6px 0', color: theme.textMuted }}>Ingested Time:</td><td style={{ color: '#fff' }}>{new Date(selectedLog.created_at).toLocaleString()}</td></tr>
                  {selectedLog.email && <tr><td style={{ padding: '6px 0', color: theme.textMuted }}>Customer Email:</td><td style={{ color: '#fff' }}>{selectedLog.email}</td></tr>}
                  {selectedLog.phone && <tr><td style={{ padding: '6px 0', color: theme.textMuted }}>Customer Phone:</td><td style={{ color: '#fff' }}>{selectedLog.phone}</td></tr>}
                  <tr><td style={{ padding: '6px 0', color: theme.textMuted }}>Delivery Status:</td><td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, background: selectedLog.status === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: selectedLog.status === 'success' ? theme.success : theme.danger, padding: '2px 6px', borderRadius: '4px' }}>
                      {selectedLog.status}
                    </span>
                  </td></tr>
                </tbody>
              </table>
            </div>

            {/* Delivery attempts logs */}
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Delivery Log Attempts</h3>
              {(!selectedLog.deliveries || selectedLog.deliveries.length === 0) ? (
                <p style={{ color: theme.textMuted, fontSize: '0.85rem', fontStyle: 'italic' }}>No forwarding delivery attempts recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedLog.deliveries.map((del, idx) => {
                    const isSuccess = del.response_status >= 200 && del.response_status < 300;
                    return (
                      <div key={del.id} style={{ border: `1px solid ${theme.border}`, background: 'rgba(8,18,54,0.8)', borderRadius: '8px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 700 }}>Attempt #{del.attempt_number || idx + 1}</span>
                          <span style={{ color: isSuccess ? theme.success : theme.danger, fontWeight: 800 }}>
                            HTTP {del.response_status || 'Network Error'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: theme.textMuted }}>
                          <div>Latency: <b style={{ color: '#fff' }}>{del.duration_ms} ms</b></div>
                          {del.error_message && <div style={{ color: theme.danger }}>Error Message: {del.error_message}</div>}
                          {del.response_body && (
                            <div style={{ marginTop: '0.25rem' }}>
                              <span>Response Body Preview:</span>
                              <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '6px', borderRadius: '4px', overflowX: 'auto', marginTop: '2px', fontFamily: 'monospace', fontSize: '0.7rem', color: '#fff' }}>
                                {del.response_body}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Raw JSON Payload */}
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Raw Payload JSON</h3>
              <pre className="hb-code-box" style={{ maxHeight: '200px' }}>
                {JSON.stringify(selectedLog.payload, null, 2)}
              </pre>
            </div>

            {/* Manual Retry Trigger */}
            <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '1.25rem', marginTop: 'auto' }}>
              <button 
                onClick={() => handleForceRedeliver(selectedLog.id)}
                style={{ width: '100%', background: theme.primary, color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} /> Force Manual Redeliver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback / Feature Request Modal ── */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ width: '100%', maxWidth: '460px', background: '#0b111e', border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                {feedbackType === 'feature_request' ? 'Request a Feature' : 'Send Feedback'}
              </h2>
              <button 
                onClick={() => setShowFeedbackModal(false)}
                style={{ background: 'none', border: 'none', color: theme.textMuted, fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {feedbackSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <CheckCircle size={48} color={theme.primary} style={{ margin: '0 auto 1rem', filter: `drop-shadow(0 0 8px ${theme.primary}40)` }} />
                <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Thank You!</h4>
                <p style={{ color: theme.textMuted, fontSize: '0.9rem', marginTop: '0.25rem' }}>Your feedback has been successfully submitted.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {feedbackType === 'feature_request' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Feature Title</label>
                    <input 
                      type="text" 
                      value={feedbackTitle}
                      onChange={e => setFeedbackTitle(e.target.value)}
                      placeholder="e.g. Discord Webhook Alerts Integration"
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#0e1422', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                    />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                    {feedbackType === 'feature_request' ? 'Explain the Feature' : 'Your Feedback / Report'}
                  </label>
                  <textarea 
                    value={feedbackContent}
                    onChange={e => setFeedbackContent(e.target.value)}
                    placeholder={feedbackType === 'feature_request' ? "Describe what this feature would do and how it helps your development workflow..." : "Tell us what you like, what is broken, or how we can improve HookBunker..."}
                    required
                    rows={5}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#0e1422', color: '#fff', fontSize: '0.9rem', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowFeedbackModal(false)}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${theme.border}`, color: theme.text, padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={feedbackSubmitting}
                    style={{ flex: 2, background: theme.primary, color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {feedbackSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Routine NPS rating Toast Slide-In ── */}
      {showNpsPrompt && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '350px',
          background: '#0b111e',
          border: `1px solid ${theme.primary}50`,
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: `0 10px 30px ${theme.primaryGlow}, 0 20px 60px rgba(0,0,0,0.4)`,
          zIndex: 90,
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>Share Your Experience</h4>
            <button onClick={handleNpsDismiss} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: 0 }}>&times;</button>
          </div>

          {npsStep === 1 && (
            <div>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: theme.textMuted, lineHeight: 1.45 }}>
                How likely are you to recommend HookBunker to a fellow software engineer?
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px', marginBottom: '1.25rem' }}>
                {[1, 2, 3, 4, 5].map((val) => (
                  <button 
                    key={val} 
                    onClick={() => { setNpsRating(val); setNpsStep(2); }}
                    style={{ flex: 1, padding: '0.5rem 0', background: 'rgba(255,255,255,0.03)', border: `1px solid ${theme.border}`, color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {npsStep === 2 && (
            <div>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: theme.textMuted }}>
                Any suggestions on how we can improve our webhook delivery system?
              </p>
              <textarea 
                value={npsComment}
                onChange={e => setNpsComment(e.target.value)}
                placeholder="Optional comments..."
                rows={3}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: `1px solid ${theme.border}`, background: '#0e1422', color: '#fff', fontSize: '0.8rem', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <button 
                onClick={handleNpsSubmit}
                style={{ width: '100%', background: theme.primary, color: '#fff', border: 'none', padding: '0.5rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', marginTop: '0.75rem' }}
              >
                Submit Rating
              </button>
            </div>
          )}

          {npsStep === 3 && (
            <div style={{ textAlign: 'center', padding: '0.5rem' }}>
              <CheckCircle size={32} color={theme.success} style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Thank you for your rating!</p>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#2b5bff',
          color: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 9999,
          fontSize: '0.875rem',
          fontWeight: 600,
          animation: 'slideIn 0.25s ease-out'
        }}>
          {toast.message}
        </div>
      )}
    </BunkerLayout>
  );
}
