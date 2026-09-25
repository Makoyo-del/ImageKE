import { HookBunkerDashboard } from '../hookbunker/HookBunkerDashboard';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { BookOpen, Award, CheckCircle2, AlertCircle, FileText, MessageSquare, PlusCircle, Check, LogOut, ArrowRight, UserCheck, Calendar, Lock, Mail, Eye, EyeOff, Loader2, Link2, Copy, ExternalLink, Share2, Sparkles, CheckCheck } from 'lucide-react';
import './AcademyDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

const MODULES = [
  { id: 'module_1', title: 'Sprint 1: Positioning & Personal Branding', desc: 'Define your target role, niche value proposition, and elevator pitch.', asset: 'Branding Bio & 1-Sentence Pitch' },
  { id: 'module_2', title: 'Sprint 2: The Modern ATS Resume', desc: 'Format and write a clean CV that passes automated parsers with an 80%+ score.', asset: 'Polished ATS CV (PDF)' },
  { id: 'module_3', title: 'Sprint 3: LinkedIn Profile Domination', desc: 'Structure your profile, headline, and features to drive passive recruiter visits.', asset: 'Optimized & Live LinkedIn Profile' },
  { id: 'module_4', title: 'Sprint 4: Job Search Strategy & Outreach', desc: 'Set up application pipelines, track opportunities, and write cold outreach copy.', asset: 'Application Tracker & 3 Templates' },
  { id: 'module_5', title: 'Sprint 5: Interview Prep & Communication', desc: 'Master the STAR method response framework, salary talks, and professional emails.', asset: 'STAR Stories Sheet' },
  { id: 'module_6', title: 'Sprint 6: Digital Skills & GMB SEO', desc: 'Create and verify local Google Business Profiles to attract freelancing clients.', asset: 'Verified Google Business Profile' },
];

export default function AcademyDashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [state, setState] = useState(null); // Backend state response
  const [activeTab, setActiveTab] = useState('overview'); // student: overview | sprints | feedback. mentor: overview | students | submissions | broadcast
  const [error, setError] = useState('');
  
  // Student Submission state
  const [submittingModule, setSubmittingModule] = useState(null);
  const [subLink, setSubLink] = useState('');
  const [subNotes, setSubNotes] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student Feedback state
  const [feedbackType, setFeedbackType] = useState('feedback');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackErr, setFeedbackErr] = useState('');
  const [feedbackOk, setFeedbackOk] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // Mentor Review state
  const [reviewingDel, setReviewingDel] = useState(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Mentor Broadcast state
  const [brSubject, setBrSubject] = useState('');
  const [brContent, setBrContent] = useState('');
  const [brError, setBrError] = useState('');
  const [brSuccess, setBrSuccess] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Payment checkout state
  const [payEmail, setPayEmail] = useState('');
  const [payPackage, setPayPackage] = useState('cohort'); // 'cohort' | 'membership'
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState('');

  // Custom Verification states
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);

  // Google Meet states
  const [meetLink, setMeetLink] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [meetingSuccess, setMeetingSuccess] = useState('');
  const [meetingError, setMeetingError] = useState('');
  const [updatingMeeting, setUpdatingMeeting] = useState(false);

  // Mentor Messaging single student state
  const [messagingStudent, setMessagingStudent] = useState(null);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageError, setMessageError] = useState('');
  const [messageSuccess, setMessageSuccess] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [pageMessage, setPageMessage] = useState(null);

  // Mentor Riders state
  const [riders, setRiders] = useState([]);
  const [riderForm, setRiderForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [riderActionLoading, setRiderActionLoading] = useState(false);
  const [newPasswords, setNewPasswords] = useState({});
  const [showOnboardPassword, setShowOnboardPassword] = useState(false);
  const [showTablePasswords, setShowTablePasswords] = useState({});

  // Workshop management states
  const [workshopRegistrations, setWorkshopRegistrations] = useState([]);
  const [loadingWorkshop, setLoadingWorkshop] = useState(false);
  const [workshopError, setWorkshopError] = useState('');
  const [sendingCertId, setSendingCertId] = useState(null);

  // Resume Vault states (Mentor)
  const [vaultTemplates, setVaultTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const [templateSuccess, setTemplateSuccess] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [submittingTemplate, setSubmittingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    id: '',
    name: '',
    description: '',
    is_free: true,
    price_kes: 0,
    price_usd: 0,
    category: 'Finance',
    optimized_companies: '',
    file: null
  });

  // Mentor Hot Seat Live states
  const [hotseatSubmissions, setHotseatSubmissions] = useState([]);
  const [loadingHotseat, setLoadingHotseat] = useState(false);
  const [hotseatError, setHotseatError] = useState('');
  const [hotseatFilter, setHotseatFilter] = useState('all');

  // Live Session Scheduler states
  const [liveSessions, setLiveSessions] = useState([]);
  const [liveSessionForm, setLiveSessionForm] = useState({ title: 'Resume Hot Seat Live', live_datetime: '', stream_link: '', max_spots: 3, notes: '', deactivate_others: true });
  const [savingLiveSession, setSavingLiveSession] = useState(false);
  const [liveSessionSuccess, setLiveSessionSuccess] = useState('');
  const [liveSessionError, setLiveSessionError] = useState('');

  const [editingSessionId, setEditingSessionId] = useState(null);

  // ── JForce Affiliate Monetizer states ──
  const [jforceUrl, setJforceUrl] = useState('');
  const [jforceLoading, setJforceLoading] = useState(false);
  const [jforceResult, setJforceResult] = useState(null);
  const [jforceError, setJforceError] = useState('');
  const [jforceCopied, setJforceCopied] = useState(null); // 'short' | 'direct' | 'copy'
  const [jforceHistory, setJforceHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('dunmak_jforce_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // ── JForce Monetizer Handlers ──
  const handleGenerateJForceLink = async (e) => {
    if (e) e.preventDefault();
    setJforceError('');
    setJforceResult(null);

    const trimmed = jforceUrl.trim();
    if (!trimmed) {
      setJforceError('Please paste a Jumia product link.');
      return;
    }

    setJforceLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/academy/mentor/jforce/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ url: trimmed })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate affiliate link.');
      }

      setJforceResult(data);
      const updatedHistory = [data, ...jforceHistory.filter(h => h.cleanOriginalUrl !== data.cleanOriginalUrl)].slice(0, 15);
      setJforceHistory(updatedHistory);
      try {
        localStorage.setItem('dunmak_jforce_history', JSON.stringify(updatedHistory));
      } catch (e) {}
    } catch (err) {
      setJforceError(err.message || 'Error generating affiliate link.');
    } finally {
      setJforceLoading(false);
    }
  };

  const copyJForceText = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setJforceCopied(fieldName);
    setTimeout(() => setJforceCopied(null), 2500);
  };

  const formatDatetimeForInput = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Africa/Nairobi'
      }).formatToParts(d);
      
      const year = parts.find(p => p.type === 'year').value;
      const month = parts.find(p => p.type === 'month').value;
      const day = parts.find(p => p.type === 'day').value;
      const hour = parts.find(p => p.type === 'hour').value;
      const minute = parts.find(p => p.type === 'minute').value;
      
      const cleanHour = hour === '24' ? '00' : hour;
      
      return `${year}-${month}-${day}T${cleanHour}:${minute}`;
    } catch (e) {
      return dateString.substring(0, 16);
    }
  };
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: null
  });

  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  const showConfirm = (title, message, confirmText, cancelText, onConfirm) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm
    });
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Fetch Dashboard State from Backend
  const fetchDashboardData = useCallback(async (token) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/academy/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setState(data);
        if (data.role === 'student' && data.status === 'inactive') {
          setPayEmail(data.data.email || '');
        }
        if (data.role === 'mentor' && data.data?.meeting) {
          setMeetLink(data.data.meeting.link || '');
          setMeetTime(data.data.meeting.time || '');
        }
      } else {
        setError(data.error || 'Failed to fetch dashboard data.');
      }
    } catch (err) {
      setError('Connection to server failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkshopRegistrations = useCallback(async (token) => {
    try {
      setLoadingWorkshop(true);
      setWorkshopError('');
      const res = await fetch(`${API_URL}/api/workshop/mentor/registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setWorkshopRegistrations(data.registrations || []);
      } else {
        setWorkshopError(data.error || 'Failed to fetch workshop registrations.');
      }
    } catch (err) {
      setWorkshopError('Connection to server failed.');
    } finally {
      setLoadingWorkshop(false);
    }
  }, []);

  const fetchRiders = async () => {
    try {
      const { data, error } = await supabase.from('riders').select('*').order('created_at', { ascending: false });
      if (data) setRiders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVaultTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      setTemplateError('');
      const res = await fetch(`${API_URL}/api/academy/templates`);
      const data = await res.json();
      if (res.ok) {
        setVaultTemplates(data);
      } else {
        setTemplateError(data.error || 'Failed to fetch templates.');
      }
    } catch (err) {
      setTemplateError('Failed to connect to server.');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // ── Mentor Hot Seat Handlers ──
  const fetchHotseatSubmissions = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingHotseat(true);
    setHotseatError('');
    try {
      const res = await fetch(`${API_URL}/api/hotseat/submissions`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHotseatSubmissions(data.submissions || []);
      } else {
        setHotseatError(data.error || 'Failed to fetch Hot Seat submissions.');
      }
    } catch (err) {
      setHotseatError('Connection error fetching Hot Seat submissions.');
    } finally {
      setLoadingHotseat(false);
    }
  }, [session]);

  // Fetch all live sessions (history)
  const fetchLiveSessions = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`${API_URL}/api/hotseat/live-sessions`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) setLiveSessions(data.sessions || []);
    } catch (err) { console.warn('[Live Sessions Fetch]', err); }
  }, [session]);

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!templateForm.name.trim()) {
      setTemplateError('Template name is required.');
      return;
    }
    if (!isEditingTemplate && !templateForm.file) {
      setTemplateError('Please upload a template file (.docx).');
      return;
    }

    setSubmittingTemplate(true);
    setTemplateError('');
    setTemplateSuccess('');

    const token = session?.access_token;

    let fileBase64 = null;
    let fileName = null;
    let previewBase64 = null;
    let previewName = null;

    if (templateForm.file) {
      try {
        fileBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result.split(',')[1]);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(templateForm.file);
        });
        fileName = templateForm.file.name;
      } catch (err) {
        setTemplateError('Failed to read document file.');
        setSubmittingTemplate(false);
        return;
      }
    }

    if (templateForm.preview_image) {
      try {
        previewBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result.split(',')[1]);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(templateForm.preview_image);
        });
        previewName = templateForm.preview_image.name;
      } catch (err) {
        setTemplateError('Failed to read preview image.');
        setSubmittingTemplate(false);
        return;
      }
    }

    const payload = {
      name: templateForm.name,
      description: templateForm.description,
      is_free: templateForm.is_free,
      price_kes: templateForm.is_free ? 0 : Number(templateForm.price_kes),
      price_usd: templateForm.is_free ? 0 : Number(templateForm.price_usd),
      category: templateForm.category,
      optimized_companies: templateForm.optimized_companies.split(',').map(c => c.trim()).filter(Boolean),
      file_name: fileName,
      file_data_base64: fileBase64,
      preview_image_base64: previewBase64,
      preview_image_name: previewName
    };

    try {
      const url = isEditingTemplate 
        ? `${API_URL}/api/academy/mentor/templates/${templateForm.id}`
        : `${API_URL}/api/academy/mentor/templates`;
      
      const method = isEditingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setTemplateSuccess(isEditingTemplate ? 'Template updated successfully!' : 'Template uploaded successfully!');
        setShowTemplateModal(false);
        fetchVaultTemplates();
        setTemplateForm({
          id: '',
          name: '',
          description: '',
          is_free: true,
          price_kes: 0,
          price_usd: 0,
          category: 'Finance',
          optimized_companies: '',
          file: null
        });
      } else {
        setTemplateError(data.error || 'Failed to save template.');
      }
    } catch (err) {
      setTemplateError('Failed to connect to server.');
    } finally {
      setSubmittingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    const token = session?.access_token;
    setTemplateError('');
    setTemplateSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/academy/mentor/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setTemplateSuccess('Template deleted successfully.');
        fetchVaultTemplates();
      } else {
        setTemplateError(data.error || 'Failed to delete template.');
      }
    } catch (err) {
      setTemplateError('Failed to connect to server.');
    }
  };

  const handleUpdateAttendance = async (registrationId, currentStatus) => {
    const newStatus = currentStatus === 'attended' ? 'absent' : 'attended';
    try {
      const res = await fetch(`${API_URL}/api/workshop/mentor/update-attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: registrationId, attendance_status: newStatus }),
      });
      if (res.ok) {
        setWorkshopRegistrations(prev =>
          prev.map(r => r.id === registrationId ? { ...r, attendance_status: newStatus } : r)
        );
      } else {
        alert('Failed to update attendance status.');
      }
    } catch (err) {
      alert('Connection error.');
    }
  };

  const handleSendCertificate = async (registrationId) => {
    setSendingCertId(registrationId);
    try {
      const res = await fetch(`${API_URL}/api/workshop/mentor/send-certificate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: registrationId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Certificate sent successfully!');
        setWorkshopRegistrations(prev =>
          prev.map(r => r.id === registrationId ? { ...r, certificate_sent: true } : r)
        );
      } else {
        alert(data.error || 'Failed to send certificate.');
      }
    } catch (err) {
      alert('Connection error.');
    } finally {
      setSendingCertId(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchDashboardData(session.access_token);
      } else {
        setLoading(false);
        if (onNavigate) onNavigate('academy');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchDashboardData(session.access_token);
      } else {
        setState(null);
        setLoading(false);
        if (window.location.hash === '#/academy/dashboard') {
          if (onNavigate) onNavigate('academy');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchDashboardData, onNavigate]);

  useEffect(() => {
    if (session && activeTab === 'workshops' && state?.role === 'mentor') {
      fetchWorkshopRegistrations(session.access_token);
    }
    
    if (session && activeTab === 'riders' && state?.role === 'mentor') {
      fetchRiders();
    }

    if (session && activeTab === 'templates' && state?.role === 'mentor') {
      fetchVaultTemplates();
    }

    if (session && activeTab === 'hotseat' && state?.role === 'mentor') {
      fetchHotseatSubmissions();
      fetchLiveSessions();
    }
  }, [session, activeTab, state, fetchVaultTemplates, fetchHotseatSubmissions, fetchLiveSessions]);

  // Load Paystack script
  useEffect(() => {
    if (!document.getElementById('paystack-script')) {
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleLogout = async () => {
    if (onNavigate) onNavigate('services');
    await supabase.auth.signOut();
  };

  const handleResendVerification = async () => {
    setVerifyError('');
    setVerifySuccess('');
    setResendingEmail(true);
    try {
      const res = await fetch(`${API_URL}/api/academy/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        }
      });
      const data = await res.json();
      if (res.ok) {
        setVerifySuccess('Verification email resent successfully! Please check your inbox.');
      } else {
        setVerifyError(data.error || 'Failed to resend verification.');
      }
    } catch (err) {
      setVerifyError('Connection error. Please try again.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleUpdateMeeting = async (e) => {
    e.preventDefault();
    setMeetingError('');
    setMeetingSuccess('');

    const trimmedLink = meetLink ? meetLink.trim() : '';
    const trimmedTime = meetTime ? meetTime.trim() : '';

    if (!trimmedLink) {
      setMeetingError('Google Meet call link is required.');
      return;
    }
    if (!trimmedTime) {
      setMeetingError('Session time / schedule is required.');
      return;
    }

    // URL validation
    let isValidUrl = false;
    try {
      const urlObj = new URL(trimmedLink);
      isValidUrl = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (err) {
      isValidUrl = false;
    }

    if (!isValidUrl) {
      setMeetingError('Please enter a valid URL (e.g., https://meet.google.com/abc-defg-hij).');
      return;
    }

    setUpdatingMeeting(true);
    try {
      const res = await fetch(`${API_URL}/api/academy/mentor/meeting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ link: trimmedLink, time: trimmedTime })
      });
      const data = await res.json();
      if (res.ok) {
        setMeetingSuccess('Meeting details updated successfully!');
        if (state) {
          setState({
            ...state,
            data: {
              ...state.data,
              meeting: { link: trimmedLink, time: trimmedTime }
            }
          });
        }
      } else {
        setMeetingError(data.error || 'Failed to update meeting.');
      }
    } catch (err) {
      setMeetingError('Connection error. Please try again.');
    } finally {
      setUpdatingMeeting(false);
    }
  };



  // Save or update live session
  const handleSaveLiveSession = async (e) => {
    e.preventDefault();
    if (!session?.access_token) return;
    setSavingLiveSession(true);
    setLiveSessionSuccess('');
    setLiveSessionError('');

    const url = editingSessionId
      ? `${API_URL}/api/hotseat/live-session/${editingSessionId}`
      : `${API_URL}/api/hotseat/live-session`;
    const method = editingSessionId ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(liveSessionForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const msg = editingSessionId ? 'Live session updated successfully!' : 'Live session scheduled successfully!';
        showToast(msg, 'success');
        setLiveSessionSuccess(msg);
        setLiveSessionForm({ title: 'Resume Hot Seat Live', live_datetime: '', stream_link: '', max_spots: 3, notes: '', deactivate_others: true });
        setEditingSessionId(null);
        fetchLiveSessions();
      } else {
        const errorMsg = data.error || 'Failed to save live session.';
        showToast(errorMsg, 'error');
        setLiveSessionError(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Connection error. Please try again.';
      showToast(errorMsg, 'error');
      setLiveSessionError(errorMsg);
    } finally {
      setSavingLiveSession(false);
    }
  };

  // Delete live session
  const handleDeleteLiveSession = async (sessionId) => {
    if (!session?.access_token) return;
    
    showConfirm(
      'Delete Live Session',
      'Are you sure you want to delete this live session? This action is permanent and cannot be undone.',
      'Yes, Delete Session',
      'Cancel',
      async () => {
        try {
          const res = await fetch(`${API_URL}/api/hotseat/live-session/${sessionId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast('Live session deleted successfully.', 'success');
            fetchLiveSessions();
            if (editingSessionId === sessionId) {
              setLiveSessionForm({ title: 'Resume Hot Seat Live', live_datetime: '', stream_link: '', max_spots: 3, notes: '', deactivate_others: true });
              setEditingSessionId(null);
            }
          } else {
            showToast(data.error || 'Failed to delete live session.', 'error');
          }
        } catch (err) {
          showToast('Connection error. Please try again.', 'error');
        }
      }
    );
  };

  // Toggle a live session active/inactive
  const handleToggleLiveSession = async (sessionId, currentActive) => {
    if (!session?.access_token) return;
    const actionName = currentActive ? 'deactivate' : 'activate';
    
    showConfirm(
      `${currentActive ? 'Deactivate' : 'Activate'} Session`,
      `Are you sure you want to ${actionName} this live session?`,
      `Yes, ${currentActive ? 'Deactivate' : 'Activate'}`,
      'Cancel',
      async () => {
        try {
          const res = await fetch(`${API_URL}/api/hotseat/live-session/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ is_active: !currentActive }),
          });
          const data = await res.json();
          if (res.ok) {
            showToast(`Live session ${currentActive ? 'deactivated' : 'activated'} successfully.`, 'success');
            fetchLiveSessions();
          } else {
            showToast(data.error || `Failed to ${actionName} session.`, 'error');
          }
        } catch (err) {
          showToast('Connection error. Please try again.', 'error');
        }
      }
    );
  };

  const handleAnalyzeHotseatLive = async (item) => {
    if (!session?.access_token) return;
    try {
      await fetch(`${API_URL}/api/hotseat/submissions/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: 'selected' })
      });
      setHotseatSubmissions(prev => prev.map(s => s.id === item.id ? { ...s, status: 'selected' } : s));
    } catch (err) {
      console.warn('[Hotseat update error]', err);
    }

    if (onNavigate) {
      onNavigate('ats', {
        resumeUrl: item.resume_url,
        candidateName: item.full_name,
        filename: item.file_name || 'Resume.pdf'
      });
    }
  };

  const handleUpdateHotseatStatus = async (id, status) => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`${API_URL}/api/hotseat/submissions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHotseatSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
      }
    } catch (err) {
      console.warn('[Hotseat update status catch]', err);
    }
  };

  // Student: Submit deliverable
  const handleSubmission = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setIsSubmitting(true);

    if (!subLink.trim() || !/^https?:\/\//i.test(subLink)) {
      setSubmitError('Please enter a valid HTTP or HTTPS link.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/academy/submit-deliverable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          module_id: submittingModule,
          link: subLink.trim(),
          notes: subNotes.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitSuccess('Deliverable submitted successfully! Duncan has been notified.');
        setSubLink('');
        setSubNotes('');
        setSubmittingModule(null);
        fetchDashboardData(session.access_token);
      } else {
        setSubmitError(data.error || 'Failed to submit deliverable.');
      }
    } catch (err) {
      setSubmitError('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Student: Submit feedback
  const handleFeedback = async (e) => {
    e.preventDefault();
    setFeedbackErr('');
    setFeedbackOk('');
    setSendingFeedback(true);

    if (!feedbackMsg.trim() || feedbackMsg.trim().length < 5) {
      setFeedbackErr('Feedback message must be at least 5 characters long.');
      setSendingFeedback(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/academy/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: feedbackType,
          message: feedbackMsg.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedbackOk('Thank you! Your feedback has been received and emailed to Duncan.');
        setFeedbackMsg('');
      } else {
        setFeedbackErr(data.error || 'Failed to submit feedback.');
      }
    } catch (err) {
      setFeedbackErr('Connection error. Please try again.');
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    setIsReviewing(true);
    setReviewError('');

    if (!reviewFeedback.trim()) {
      setReviewError('Please enter review feedback before submitting.');
      setIsReviewing(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/academy/mentor/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          deliverable_id: reviewingDel.id,
          feedback: reviewFeedback.trim(),
          status: 'reviewed',
        }),
      });

      if (res.ok) {
        setReviewingDel(null);
        setReviewFeedback('');
        setReviewError('');
        fetchDashboardData(session.access_token);
      } else {
        const data = await res.json();
        setReviewError(data.error || 'Failed to submit review.');
      }
    } catch (err) {
      setReviewError('Connection error. Please check your internet connection.');
    } finally {
      setIsReviewing(false);
    }
  };

  // Mentor: Send Broadcast
  const handleBroadcast = async (e) => {
    e.preventDefault();
    setBrError('');
    setBrSuccess('');
    setIsBroadcasting(true);

    if (!brSubject.trim() || !brContent.trim()) {
      setBrError('Please enter both subject and content.');
      setIsBroadcasting(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/academy/mentor/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subject: brSubject.trim(),
          content: brContent.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBrSuccess('Broadcast successfully saved and emailed to all active students!');
        setBrSubject('');
        setBrContent('');
        fetchDashboardData(session.access_token);
      } else {
        setBrError(data.error || 'Failed to dispatch broadcast.');
      }
    } catch (err) {
      setBrError('Connection error.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Mentor: Send direct message to a student
  const handleMessageStudent = async (e) => {
    e.preventDefault();
    setMessageError('');
    setMessageSuccess('');
    setSendingMessage(true);

    if (!messageSubject.trim() || !messageContent.trim()) {
      setMessageError('Please enter both subject and content.');
      setSendingMessage(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/academy/mentor/message-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          student_email: messagingStudent.email,
          subject: messageSubject.trim(),
          content: messageContent.trim(),
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to send message');
      setPageMessage({ type: 'success', text: 'Message sent successfully.' });
      setMessagingStudent(null);
    } catch (err) {
      setPageMessage({ type: 'error', text: err.message });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateRider = async (e) => {
    e.preventDefault();
    setRiderActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/academy/mentor/create-rider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(riderForm)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      setPageMessage({ type: 'success', text: 'Rider created successfully.' });
      setRiderForm({ name: '', phone: '', email: '', password: '' });
      fetchRiders();
    } catch (err) {
      setPageMessage({ type: 'error', text: err.message });
    } finally {
      setRiderActionLoading(false);
    }
  };

  const handleChangeRiderPassword = async (riderId) => {
    const password = newPasswords[riderId];
    if (!password) return;
    
    try {
      const res = await fetch(`${API_URL}/api/academy/mentor/change-rider-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ riderId, newPassword: password })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      setPageMessage({ type: 'success', text: 'Password changed successfully.' });
      setNewPasswords(prev => ({ ...prev, [riderId]: '' }));
    } catch (err) {
      setPageMessage({ type: 'error', text: err.message });
    }
  };

  // Paystack Billing Checkout
  const handleCheckout = async (e) => {
    e.preventDefault();
    setPayError('');
    setIsPaying(true);

    if (!payEmail.trim() || !payEmail.includes('@')) {
      setPayError('Please enter a valid email address.');
      setIsPaying(false);
      return;
    }

    if (!window.PaystackPop) {
      setPayError('Payment checkout script not loaded yet. Please try again in a few seconds.');
      setIsPaying(false);
      return;
    }

    try {
      // 1. Initialize session on backend
      const initRes = await fetch(`${API_URL}/api/initialize-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payEmail.trim().toLowerCase(),
          metadata: {
            type: 'academy_subscription',
            package: payPackage,
            currency: 'KES',
          },
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData?.data?.reference) {
        throw new Error(initData.error || 'Failed to initialize transaction.');
      }

      const { reference } = initData.data;
      const amountKES = payPackage === 'membership' ? 1500 : 10000;

      // 2. Open Paystack Inline iframe
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: payEmail.trim().toLowerCase(),
        amount: amountKES * 100, // KES to kobo
        currency: 'KES',
        ref: reference,
        callback: function (response) {
          (async () => {
            // 3. Verify payment on backend
            try {
              const verifyRes = await fetch(`${API_URL}/api/academy/verify-payment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ reference: response.reference }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.status === 'active') {
                fetchDashboardData(session.access_token);
              } else {
                setPayError(verifyData.error || 'Verification failed. Please contact support.');
              }
            } catch (verifyErr) {
              setPayError('Payment was successful, but server verification timed out. Please contact info@duncanmakoyo.com.');
            } finally {
              setIsPaying(false);
            }
          })();
        },
        onClose: function () {
          setIsPaying(false);
        },
      });
      handler.openIframe();
    } catch (err) {
      setPayError(err.message || 'Payment initialization failed.');
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="ac-loading-screen">
        <div className="ac-spinner" />
        <p>Loading Academy dashboard...</p>
      </div>
    );
  }

  // 1. Unverified View
  if (state?.role === 'student' && state?.status === 'unverified') {
    return (
      <div className="ac-inactive-wrapper">
        <div className="ac-inactive-card" style={{ maxWidth: '480px' }}>
          <div className="ac-inactive-header">
            <Mail size={36} className="ac-lock-icon" style={{ color: '#14b8a6', background: 'rgba(20, 184, 166, 0.1)' }} />
            <h2 className="ac-inactive-title">Verify Your Email Address</h2>
            <p className="ac-inactive-desc">
              We have sent a verification link to <strong>{state.data?.email}</strong>. Please check your inbox and click the link to confirm your account and proceed.
            </p>
          </div>

          {verifyError && <div className="ac-pay-alert error" style={{ margin: '1rem 0 0' }}>{verifyError}</div>}
          {verifySuccess && <div className="ac-pay-alert success" style={{ margin: '1rem 0 0' }}>{verifySuccess}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginTop: '1.5rem' }}>
            <button 
              onClick={handleResendVerification}
              className="ac-pay-btn"
              disabled={resendingEmail}
            >
              {resendingEmail ? 'Resending Verification...' : 'Resend Verification Email'}
            </button>

            <button onClick={handleLogout} className="ac-logout-sub-btn" style={{ marginTop: '0.5rem' }}>
              â† Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Inactive View (Payment Checkout)
  if (state?.role === 'student' && state?.status === 'inactive') {
    return (
      <div className="ac-inactive-wrapper">
        <div className="ac-inactive-card">
          <div className="ac-inactive-header">
            <Lock size={36} className="ac-lock-icon" />
            <h2 className="ac-inactive-title">Accelerator Registration Required</h2>
            <p className="ac-inactive-desc">
              Your account does not have an active Academy registration. Choose a package below to activate access to the 6-Week AI & Data Career Accelerator and paid community.
            </p>
          </div>

          {payError && <div className="ac-pay-alert error">{payError}</div>}

          <form onSubmit={handleCheckout} className="ac-pay-form">
            <div className="ac-pay-options">
              <div 
                className={`ac-pay-option-card ${payPackage === 'cohort' ? 'selected' : ''}`}
                onClick={() => setPayPackage('cohort')}
              >
                <div className="ac-pay-option-header">
                  <span className="ac-pay-option-title">Full 6-Week Accelerator</span>
                  <span className="ac-pay-option-price">KES 10,000</span>
                </div>
                <p className="ac-pay-option-detail">
                  Complete cohort experience, 1-on-1 reviews of all deliverables, CV makeover, custom portfolio hosting, and final placement matching.
                </p>
              </div>

              <div 
                className={`ac-pay-option-card ${payPackage === 'membership' ? 'selected' : ''}`}
                onClick={() => setPayPackage('membership')}
              >
                <div className="ac-pay-option-header">
                  <span className="ac-pay-option-title">Monthly Access Pass</span>
                  <span className="ac-pay-option-price">KES 1,500/mo</span>
                </div>
                <p className="ac-pay-option-detail">
                  Full self-paced access to curriculum modules, weekly templates, and the WhatsApp networking group. Revoked instantly if billing fails.
                </p>
              </div>
            </div>

            <div className="ac-form-group">
              <label htmlFor="checkout-email">Billing Email Address</label>
              <input
                type="email"
                id="checkout-email"
                required
                value={payEmail}
                onChange={(e) => setPayEmail(e.target.value)}
                placeholder="name@domain.com"
              />
            </div>

            <button type="submit" className="ac-pay-btn" disabled={isPaying}>
              {isPaying ? 'Processing Secure Checkout...' : `Pay ${payPackage === 'cohort' ? 'KES 10,000' : 'KES 1,500'} via Paystack`}
            </button>
            <p className="ac-pay-note">
              Supports M-Pesa, Airtel Money, and Visa/Mastercard. All transactions are securely processed by Paystack.
            </p>
          </form>

          <button onClick={handleLogout} className="ac-logout-sub-btn">
            â† Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Helper variables
  const data = state?.data || {};
  const deliverables = data.deliverables || [];
  const broadcasts = data.broadcasts || [];
  const students = data.students || [];

  return (
    <div className={`ac-dashboard-layout ${state?.role === 'mentor' ? 'mentor-theme' : ''}`}>
      {/* â”€â”€ Header â”€â”€ */}
      <header className="ac-dashboard-header">
        <div className="ac-header-brand">
          <h1 className="ac-brand-text">Career Academy</h1>
          <span className="ac-role-badge">{state?.role === 'mentor' ? 'Mentor Mode' : 'Learner Portal'}</span>
        </div>
        <div className="ac-header-nav">
          <span className="ac-user-email">{session?.user?.email}</span>
          <button onClick={handleLogout} className="ac-nav-logout-btn" title="Sign Out">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* â”€â”€ Main Container â”€â”€ */}
      <div className="ac-dashboard-container">
        
        {/* â”€â”€ Tabs Navigation (Render-style) â”€â”€ */}
        <div className="ac-tabs-bar">
          {state?.role === 'student' ? (
            <>
              <button 
                className={`ac-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button 
                className={`ac-tab-btn ${activeTab === 'sprints' ? 'active' : ''}`}
                onClick={() => setActiveTab('sprints')}
              >
                Sprints
              </button>
              <button 
                className={`ac-tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
                onClick={() => setActiveTab('feedback')}
              >
                Request & Feedback
              </button>
            </>
          ) : (
            <>
              <button 
                className={`ac-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Dashboard Overview
              </button>
              <button 
                className={`ac-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => setActiveTab('students')}
              >
                Students List ({students.length})
              </button>
              <button 
                className={`ac-tab-btn ${activeTab === 'submissions' ? 'active' : ''}`}
                onClick={() => setActiveTab('submissions')}
              >
                Submissions ({deliverables.filter(d => d.status === 'pending').length} pending)
              </button>
              <button 
                className={`ac-tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
                onClick={() => setActiveTab('broadcast')}
              >
                Announcements
              </button>
              <button 
                className={`ac-tab-btn ${activeTab === 'hookbunker' ? 'active' : ''}`}
                onClick={() => setActiveTab('hookbunker')}
                style={{ color: activeTab === 'hookbunker' ? '#10b981' : 'inherit', fontWeight: 700 }}
              >
                🛡️ HookBunker Gateway
              </button>
              <button 
                className={`ac-tab-btn ${activeTab === 'jforce' ? 'active' : ''}`}
                onClick={() => setActiveTab('jforce')}
                style={{ color: activeTab === 'jforce' ? '#F68B1E' : 'inherit', fontWeight: 600 }}
              >
                JForce Monetizer ⚡
              </button>
            </>
          )}
        </div>

        {/* â”€â”€ Error alerts â”€â”€ */}
        {error && <div className="ac-page-alert error">{error}</div>}
        {pageMessage && (
          <div className={`ac-page-alert ${pageMessage.type}`} onClick={() => setPageMessage(null)}>
            {pageMessage.text}
          </div>
        )}

        {/* â”€â”€ Tab Contents â”€â”€ */}
        <div className="ac-tab-content">
          
          {/* ========================================== */}
          {/* STUDENT OVERVIEW TAB                       */}
          {/* ========================================== */}
          {state?.role === 'student' && activeTab === 'overview' && (
            <div className="ac-overview-grid">
              <div className="ac-card main-welcome">
                <h2>Welcome Back</h2>
                <p>Welcome to your learning portal. Review announcements, follow your active sprints, and submit completed work for review.</p>
                
                <div className="ac-overview-metrics">
                  <div className="ac-metric-box">
                    <span className="ac-metric-val">{deliverables.filter(d => d.status === 'reviewed').length} / {MODULES.length}</span>
                    <span className="ac-metric-lbl">Sprints Completed</span>
                  </div>
                  <div className="ac-metric-box">
                    <span className="ac-metric-val">{deliverables.filter(d => d.status === 'pending').length}</span>
                    <span className="ac-metric-lbl">Pending Review</span>
                  </div>
                </div>
              </div>

              <div className="ac-card main-broadcasts">
                <h3>Latest Mentorship Broadcasts</h3>
                {broadcasts.length === 0 ? (
                  <p className="ac-empty-text">No announcements posted yet.</p>
                ) : (
                  <div className="ac-broadcast-list">
                    {broadcasts.slice(0, 3).map(b => (
                      <div key={b.id} className="ac-broadcast-item">
                        <div className="ac-broadcast-meta">
                          <span className="ac-broadcast-subject">{b.subject}</span>
                          <span className="ac-broadcast-date">{new Date(b.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="ac-broadcast-body">{b.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {state?.data?.meeting?.link && (
                <div className="ac-card ac-meeting-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '4px solid #14b8a6', background: 'rgba(20, 184, 166, 0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#14b8a6' }} />
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Live Mentor Session Call</h3>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>
                    Next Q&A Session Details: <strong>{state.data.meeting.time}</strong>
                  </p>
                  <a 
                    href={state.data.meeting.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ac-pay-btn"
                    style={{ display: 'inline-block', width: 'fit-content', textDecoration: 'none', padding: '10px 24px', borderRadius: '8px', fontSize: '0.9rem', marginTop: '0.25rem' }}
                  >
                    Join Google Meet â†’
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* STUDENT SPRINTS TAB                        */}
          {/* ========================================== */}
          {state?.role === 'student' && activeTab === 'sprints' && (
            <div className="ac-sprints-layout">
              {submitSuccess && <div className="ac-page-alert success">{submitSuccess}</div>}
              {submitError && <div className="ac-page-alert error">{submitError}</div>}

              {submittingModule ? (
                <div className="ac-card ac-submission-form-card">
                  <h3>Submit Deliverable for: {MODULES.find(m => m.id === submittingModule)?.title}</h3>
                  <form onSubmit={handleSubmission} className="ac-submission-form">
                    <div className="ac-form-group">
                      <label htmlFor="sub-link">Deliverable URL Link</label>
                      <input
                        type="url"
                        id="sub-link"
                        required
                        value={subLink}
                        onChange={(e) => setSubLink(e.target.value)}
                        placeholder="https://github.com/yourprofile or https://linkedin.com/in/profile"
                      />
                    </div>
                    <div className="ac-form-group">
                      <label htmlFor="sub-notes">Submission Notes (Optional)</label>
                      <textarea
                        id="sub-notes"
                        rows={4}
                        value={subNotes}
                        onChange={(e) => setSubNotes(e.target.value)}
                        placeholder="Write any questions or details for Duncan..."
                      />
                    </div>
                    <div className="ac-form-actions">
                      <button type="button" onClick={() => setSubmittingModule(null)} className="ac-btn-secondary">Cancel</button>
                      <button type="submit" className="ac-btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Uploading...' : 'Submit Deliverable'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="ac-sprints-list">
                  {MODULES.map(m => {
                    const submission = deliverables.find(d => d.module_id === m.id);
                    return (
                      <div key={m.id} className="ac-sprint-row">
                        <div className="ac-sprint-info">
                          <h4>{m.title}</h4>
                          <p className="ac-sprint-desc">{m.desc}</p>
                          <span className="ac-sprint-asset">Expected Asset: <strong>{m.asset}</strong></span>
                        </div>
                        <div className="ac-sprint-status-col">
                          {submission ? (
                            <div className="ac-status-badge-wrapper">
                              <span className={`ac-status-badge ${submission.status}`}>
                                {submission.status === 'reviewed' ? 'Reviewed' : 'Pending Review'}
                              </span>
                              {submission.feedback && (
                                <div className="ac-submission-feedback">
                                  <strong>Duncan's Feedback:</strong>
                                  <p>{submission.feedback}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button onClick={() => setSubmittingModule(m.id)} className="ac-btn-submit-action">
                              Submit Asset â†’
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* STUDENT FEEDBACK TAB                       */}
          {/* ========================================== */}
          {state?.role === 'student' && activeTab === 'feedback' && (
            <div className="ac-feedback-layout">
              <div className="ac-card ac-feedback-card">
                <h3>Submit Feedback or Feature Request</h3>
                <p className="ac-card-intro">Need help or want to request a feature? Submit here and Duncan will be notified immediately via email.</p>

                {feedbackOk && <div className="ac-page-alert success">{feedbackOk}</div>}
                {feedbackErr && <div className="ac-page-alert error">{feedbackErr}</div>}

                <form onSubmit={handleFeedback} className="ac-feedback-form">
                  <div className="ac-form-group">
                    <label>Submission Type</label>
                    <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}>
                      <option value="feedback">General Feedback</option>
                      <option value="feature_request">Feature Request</option>
                    </select>
                  </div>
                  <div className="ac-form-group">
                    <label htmlFor="feed-msg">Message</label>
                    <textarea
                      id="feed-msg"
                      rows={5}
                      required
                      value={feedbackMsg}
                      onChange={(e) => setFeedbackMsg(e.target.value)}
                      placeholder="Write your suggestions, request, or questions here..."
                    />
                  </div>
                  <button type="submit" className="ac-btn-primary" disabled={sendingFeedback}>
                    {sendingFeedback ? 'Sending...' : 'Submit Request'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* MENTOR OVERVIEW TAB                        */}
          {/* ========================================== */}
          {state?.role === 'mentor' && activeTab === 'overview' && (
            <div className="ac-mentor-grid">
              <div className="ac-card mentor-metric-card">
                <h3>System Summary</h3>
                <div className="ac-mentor-metrics">
                  <div className="ac-m-box">
                    <span className="ac-m-val">{students.length}</span>
                    <span className="ac-m-lbl">Total Students</span>
                  </div>
                  <div className="ac-m-box">
                    <span className="ac-m-val">{students.filter(s => s.academy_status === 'active').length}</span>
                    <span className="ac-m-lbl">Active Students</span>
                  </div>
                  <div className="ac-m-box">
                    <span className="ac-m-val">{deliverables.filter(d => d.status === 'pending').length}</span>
                    <span className="ac-m-lbl">Pending Reviews</span>
                  </div>
                </div>
              </div>

              <div className="ac-card mentor-recent-actions">
                <h3>Latest Broadcasts</h3>
                {broadcasts.length === 0 ? (
                  <p className="ac-empty-text">No announcements broadcasted yet.</p>
                ) : (
                  <div className="ac-broadcast-list">
                    {broadcasts.slice(0, 3).map(b => (
                      <div key={b.id} className="ac-broadcast-item">
                        <div className="ac-broadcast-meta">
                          <span className="ac-broadcast-subject">{b.subject}</span>
                          <span className="ac-broadcast-date">{new Date(b.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="ac-broadcast-body">{b.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="ac-card mentor-meeting-form-card" style={{ gridColumn: 'span 2' }}>
                <h3>Active Live Session Details</h3>
                <p className="ac-card-intro" style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  Set the Google Meet URL and Q&A session schedule. Active students will see this call details card on their dashboard overview.
                </p>
                {meetingSuccess && <div className="ac-page-alert success">{meetingSuccess}</div>}
                {meetingError && <div className="ac-page-alert error">{meetingError}</div>}
                
                <form onSubmit={handleUpdateMeeting} className="ac-broadcast-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="ac-form-group">
                    <label htmlFor="meet-link">Google Meet Call Link</label>
                    <input 
                      type="url" 
                      id="meet-link" 
                      value={meetLink} 
                      onChange={e => setMeetLink(e.target.value)} 
                      placeholder="https://meet.google.com/abc-defg-hij" 
                    />
                  </div>
                  <div className="ac-form-group">
                    <label htmlFor="meet-time">Session Time / Schedule</label>
                    <input 
                      type="text" 
                      id="meet-time" 
                      value={meetTime} 
                      onChange={e => setMeetTime(e.target.value)} 
                      placeholder="e.g. Wednesday 7:00 PM EAT" 
                    />
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="submit" className="ac-btn-primary" disabled={updatingMeeting} style={{ padding: '8px 24px', fontSize: '0.9rem' }}>
                      {updatingMeeting ? 'Updating...' : 'Update Session Details'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* MENTOR STUDENTS TAB                        */}
          {/* ========================================== */}
          {state?.role === 'mentor' && activeTab === 'students' && (
            <div className="ac-students-list-view">
              {messagingStudent ? (
                <div className="ac-card review-form-card">
                  <h3>Direct Message to: {messagingStudent.email}</h3>
                  <p className="ac-card-intro">Send a secure direct message and progress review to this student via email.</p>
                  
                  {messageSuccess && <div className="ac-page-alert success">{messageSuccess}</div>}
                  {messageError && <div className="ac-page-alert error">{messageError}</div>}

                  <form onSubmit={handleMessageStudent} className="ac-review-form">
                    <div className="ac-form-group">
                      <label htmlFor="msg-subject">Message Subject</label>
                      <input
                        type="text"
                        id="msg-subject"
                        required
                        value={messageSubject}
                        onChange={(e) => setMessageSubject(e.target.value)}
                        placeholder="Subject..."
                        style={{
                          color: '#f8fafc',
                          backgroundColor: '#0f172a',
                          border: '1px solid #475569',
                          borderRadius: '6px',
                          outline: 'none',
                          padding: '0.75rem 1rem',
                          fontSize: '0.95rem',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                    <div className="ac-form-group">
                      <label htmlFor="msg-content">Message Content</label>
                      <textarea
                        id="msg-content"
                        rows={6}
                        required
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder="Write your progress review, feedback, or response to this student here..."
                      />
                    </div>
                    <div className="ac-form-actions">
                      <button type="button" onClick={() => { setMessagingStudent(null); setMessageSubject(''); setMessageContent(''); setMessageError(''); setMessageSuccess(''); }} className="ac-btn-secondary">Cancel</button>
                      <button type="submit" className="ac-btn-primary" disabled={sendingMessage}>
                        {sendingMessage ? 'Sending...' : 'Send Message'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="ac-card">
                  <h3>Active Academy Learners</h3>
                  {students.length === 0 ? (
                    <p className="ac-empty-text">No students registered yet.</p>
                  ) : (
                    <div className="ac-table-wrapper">
                      <table className="ac-data-table">
                        <thead>
                          <tr>
                            <th>Student Email</th>
                            <th>Academy Status</th>
                            <th>Joined Date</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map(student => (
                            <tr key={student.id}>
                              <td className="ac-student-email-cell">{student.email}</td>
                              <td>
                                <span className={`ac-status-badge ${student.academy_status}`}>
                                  {student.academy_status === 'active' ? 'Active' : 'Unpaid'}
                                </span>
                              </td>
                              <td>{new Date(student.created_at).toLocaleDateString()}</td>
                              <td>
                                <button
                                  onClick={() => {
                                    setMessagingStudent(student);
                                    setMessageSubject(`Direct Mentorship Message â€” Career Academy`);
                                    setMessageContent('');
                                    setMessageError('');
                                    setMessageSuccess('');
                                  }}
                                  className="ac-btn-review-action"
                                >
                                  Message
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* MENTOR SUBMISSIONS TAB                     */}
          {/* ========================================== */}
          {state?.role === 'mentor' && activeTab === 'submissions' && (
            <div className="ac-submissions-layout">
              {reviewingDel ? (
                <div className="ac-card review-form-card">
                  <h3>Review Submission from: {students.find(s => s.id === reviewingDel.student_id)?.email || 'Student'}</h3>
                  <div className="ac-sub-details-box">
                    <p><strong>Sprint Module:</strong> {reviewingDel.module_id}</p>
                    <p><strong>Deliverable Link:</strong> <a href={reviewingDel.link} target="_blank" rel="noopener noreferrer">{reviewingDel.link}</a></p>
                    <p><strong>Student Notes:</strong> {reviewingDel.notes || 'No notes provided.'}</p>
                  </div>

                  {reviewError && <div className="ac-page-alert error">{reviewError}</div>}

                  <form onSubmit={handleReview} className="ac-review-form">
                    <div className="ac-form-group">
                      <label htmlFor="rev-feedback">Mentor Feedback</label>
                      <textarea
                        id="rev-feedback"
                        rows={6}
                        required
                        value={reviewFeedback}
                        onChange={(e) => setReviewFeedback(e.target.value)}
                        placeholder="Write detailed recommendations and approval notes..."
                      />
                    </div>
                    <div className="ac-form-actions">
                      <button type="button" onClick={() => { setReviewingDel(null); setReviewFeedback(''); setReviewError(''); }} className="ac-btn-secondary">Cancel</button>
                      <button type="submit" className="ac-btn-primary" disabled={isReviewing}>
                        {isReviewing ? 'Saving review...' : 'Submit Feedback & Approve'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="ac-card">
                  <h3>Pending Student Assets For Review</h3>
                  {deliverables.filter(d => d.status === 'pending').length === 0 ? (
                    <p className="ac-empty-text">All deliverables reviewed! Clean slate.</p>
                  ) : (
                    <div className="ac-table-wrapper">
                      <table className="ac-data-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Module</th>
                            <th>Submitted Link</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliverables.filter(d => d.status === 'pending').map(del => (
                            <tr key={del.id}>
                              <td>{students.find(s => s.id === del.student_id)?.email || 'Unknown'}</td>
                              <td>{del.module_id}</td>
                              <td><a href={del.link} target="_blank" rel="noopener noreferrer" className="ac-table-link">Open Submission</a></td>
                              <td>
                                <button onClick={() => setReviewingDel(del)} className="ac-btn-review-action">
                                  Grade Asset
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* MENTOR BROADCAST TAB                       */}
          {/* ========================================== */}
          {state?.role === 'mentor' && activeTab === 'broadcast' && (
            <div className="ac-broadcast-layout">
              <div className="ac-card ac-broadcast-card">
                <h3>Broadcast Announcement to All Active Students</h3>
                <p className="ac-card-intro">This message will be instantly posted to all student dashboards AND emailed to them in parallel via Resend.</p>

                {brSuccess && <div className="ac-page-alert success">{brSuccess}</div>}
                {brError && <div className="ac-page-alert error">{brError}</div>}

                <form onSubmit={handleBroadcast} className="ac-broadcast-form">
                  <div className="ac-form-group">
                    <label htmlFor="br-subject">Email/Dashboard Subject</label>
                    <input
                      type="text"
                      id="br-subject"
                      required
                      value={brSubject}
                      onChange={(e) => setBrSubject(e.target.value)}
                      placeholder="e.g. Sprint 2 Live Zoom Room is open!"
                    />
                  </div>
                  <div className="ac-form-group">
                    <label htmlFor="br-content">Message Content (Plain text)</label>
                    <textarea
                      id="br-content"
                      rows={8}
                      required
                      value={brContent}
                      onChange={(e) => setBrContent(e.target.value)}
                      placeholder="Write your email/announcement content here..."
                    />
                  </div>
                  <button type="submit" className="ac-btn-primary" disabled={isBroadcasting}>
                    {isBroadcasting ? 'Dispatching Broadcast Emails...' : 'Send Broadcast'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* MENTOR HOOKBUNKER GATEWAY TAB */}
          {state?.role === 'mentor' && activeTab === 'hookbunker' && (
            <div style={{ marginTop: '1rem', background: '#09090b', borderRadius: '12px', padding: '1.5rem', border: '1px solid #27272a' }}>
              <HookBunkerDashboard />
            </div>
          )}

          {/* MENTOR JFORCE AFFILIATE MONETIZER TAB */}
          {state?.role === 'mentor' && activeTab === 'jforce' && (
            <div className="ac-jforce-layout">
              {/* Header Card */}
              <div className="ac-card ac-jforce-hero-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="ac-jforce-badge">JForce Partner Token Active</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>casid*06d596d2...</span>
                    </div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Jumia JForce Affiliate Link Generator ⚡
                    </h2>
                    <p style={{ color: '#475569', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                      Paste any Jumia product link (web or app). The system strips all referral junk, attaches your verified consultant tokens, and produces a short, commission-tracked deep link.
                    </p>
                  </div>
                  <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: '10px', padding: '10px 16px', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#EA580C', textTransform: 'uppercase' }}>Tracking Mode</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#9A3412' }}>Adjust Deep Linking + Cookies</div>
                  </div>
                </div>

                {/* URL Input Form */}
                <form onSubmit={handleGenerateJForceLink} style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                      <input 
                        type="url"
                        placeholder="Paste Jumia Kenya product URL (e.g. https://www.jumia.co.ke/generic-keyboard-325828002.html)..."
                        value={jforceUrl}
                        onChange={(e) => setJforceUrl(e.target.value)}
                        required
                        className="ac-jforce-input"
                      />
                      {jforceUrl && (
                        <button
                          type="button"
                          onClick={() => { setJforceUrl(''); setJforceResult(null); }}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            fontSize: '1.1rem'
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button 
                      type="submit" 
                      disabled={jforceLoading}
                      className="ac-btn-primary ac-jforce-btn"
                    >
                      {jforceLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Monetizing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>Generate Affiliate Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {jforceError && (
                  <div style={{ marginTop: '1rem', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', fontSize: '0.88rem' }}>
                    ⚠️ {jforceError}
                  </div>
                )}
              </div>

              {/* Active Result Card */}
              {jforceResult && (
                <div className="ac-card ac-jforce-result-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.1rem' }}>🛍️</span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        {jforceResult.productTitle}
                      </h3>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '4px 10px', borderRadius: '999px' }}>
                      Ready to Share
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {/* Primary Short Link */}
                    <div className="ac-jforce-link-box" style={{ borderColor: '#F97316', background: '#FFFBF7' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ⚡ Shortened Affiliate Link (Best for Bio & Status)
                        </span>
                        <a href={jforceResult.shortUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#EA580C', fontWeight: 600, textDecoration: 'none' }}>
                          <span>Test</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <div className="ac-jforce-url-display">
                        {jforceResult.shortUrl}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => copyJForceText(jforceResult.shortUrl, 'short')}
                        className="ac-jforce-copy-btn"
                        style={{ background: jforceCopied === 'short' ? '#16A34A' : '#EA580C' }}
                      >
                        {jforceCopied === 'short' ? (
                          <>
                            <CheckCheck size={14} />
                            <span>Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy Short Link</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Full Direct Jumia Link */}
                    <div className="ac-jforce-link-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          🔗 Direct Jumia Deep Link (Full Payload)
                        </span>
                        <a href={jforceResult.directAffiliateUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
                          <span>Test</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <div className="ac-jforce-url-display" style={{ color: '#64748B', fontSize: '0.78rem' }}>
                        {jforceResult.directAffiliateUrl}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => copyJForceText(jforceResult.directAffiliateUrl, 'direct')}
                        className="ac-jforce-copy-btn"
                        style={{ background: jforceCopied === 'direct' ? '#16A34A' : '#334155' }}
                      >
                        {jforceCopied === 'direct' ? (
                          <>
                            <CheckCheck size={14} />
                            <span>Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy Full Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Pre-formatted Marketing Pitch Box */}
                  <div style={{ marginTop: '1.25rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Share2 size={14} color="#EA580C" />
                        <span>Pre-Formatted WhatsApp / Social Pitch</span>
                      </span>
                      <button 
                        type="button"
                        onClick={() => copyJForceText(jforceResult.marketingCopy, 'copy')}
                        style={{
                          background: jforceCopied === 'copy' ? '#16A34A' : '#0F172A',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '5px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {jforceCopied === 'copy' ? <CheckCheck size={12} /> : <Copy size={12} />}
                        <span>{jforceCopied === 'copy' ? 'Copied Pitch!' : 'Copy Pitch'}</span>
                      </button>
                    </div>
                    <pre style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                      fontSize: '0.85rem',
                      color: '#1E293B',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '10px 12px',
                      lineHeight: 1.5
                    }}>
                      {jforceResult.marketingCopy}
                    </pre>
                  </div>
                </div>
              )}

              {/* History Table Card */}
              {jforceHistory.length > 0 && (
                <div className="ac-card" style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Recent Monetized Links ({jforceHistory.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setJforceHistory([]);
                        localStorage.removeItem('dunmak_jforce_history');
                      }}
                      style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Clear History
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                          <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#64748B' }}>Product</th>
                          <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#64748B' }}>Short Link</th>
                          <th style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#64748B', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jforceHistory.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0F172A', fontSize: '0.88rem' }}>
                              {item.productTitle}
                            </td>
                            <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '0.82rem', color: '#EA580C' }}>
                              {item.shortUrl}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => copyJForceText(item.shortUrl, `hist_${idx}`)}
                                  style={{
                                    background: jforceCopied === `hist_${idx}` ? '#16A34A' : '#F1F5F9',
                                    color: jforceCopied === `hist_${idx}` ? '#fff' : '#0F172A',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '6px',
                                    padding: '4px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {jforceCopied === `hist_${idx}` ? 'Copied' : 'Copy'}
                                </button>
                                <a
                                  href={item.shortUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '4px 8px',
                                    color: '#64748B'
                                  }}
                                >
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TEMPLATE ADD/EDIT MODAL OVERLAY */}
          {showTemplateModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
              <div className="ac-card" style={{ maxWidth: '550px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '90vh', overflowY: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {isEditingTemplate ? 'Edit Resume Template' : 'Upload New Template'}
                  </h3>
                  <button 
                    onClick={() => setShowTemplateModal(false)}
                    style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer', marginLeft: 'auto' }}
                  >
                    Ã—
                  </button>
                </div>

                <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Template Name</label>
                    <input 
                      type="text" 
                      required 
                      value={templateForm.name} 
                      onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})} 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} 
                      placeholder="e.g. Transformation Finance"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Category</label>
                    <select
                      value={templateForm.category}
                      onChange={(e) => setTemplateForm({...templateForm, category: e.target.value})}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', bg: '#fff' }}
                    >
                      <option value="Finance">Finance & Banking</option>
                      <option value="Technology">Technology & DevOps</option>
                      <option value="NGO">NGO & International Development</option>
                      <option value="Executive">Executive Director & Management</option>
                      <option value="General">General / Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Description</label>
                    <textarea 
                      value={templateForm.description} 
                      onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})} 
                      rows="3"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'inherit' }} 
                      placeholder="Explain features and target roles for this template..."
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Pricing Type</label>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          checked={templateForm.is_free} 
                          onChange={() => setTemplateForm({...templateForm, is_free: true})} 
                        />
                        Free Download
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          checked={!templateForm.is_free} 
                          onChange={() => setTemplateForm({...templateForm, is_free: false})} 
                        />
                        Paid (KES & USD)
                      </label>
                    </div>
                  </div>

                  {!templateForm.is_free && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Price (KES)</label>
                        <input 
                          type="number" 
                          required={!templateForm.is_free}
                          value={templateForm.price_kes} 
                          onChange={(e) => setTemplateForm({...templateForm, price_kes: e.target.value})} 
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Price (USD)</label>
                        <input 
                          type="number" 
                          required={!templateForm.is_free}
                          value={templateForm.price_usd} 
                          onChange={(e) => setTemplateForm({...templateForm, price_usd: e.target.value})} 
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} 
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Optimized Companies (comma-separated)</label>
                    <input 
                      type="text" 
                      value={templateForm.optimized_companies} 
                      onChange={(e) => setTemplateForm({...templateForm, optimized_companies: e.target.value})} 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} 
                      placeholder="e.g. Equity Bank, KCB, Safaricom"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      {isEditingTemplate ? 'Replace Template File (.docx) - Optional' : 'Upload Template File (.docx)'}
                    </label>
                    <input 
                      type="file" 
                      required={!isEditingTemplate}
                      accept=".docx"
                      onChange={(e) => setTemplateForm({...templateForm, file: e.target.files[0]})} 
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px', marginTop: '10px' }}>
                      {isEditingTemplate ? 'Replace Preview Image (.png/.jpg/.webp) - Optional' : 'Upload Preview Image (.png/.jpg/.webp) - Optional'}
                    </label>
                    <input 
                      type="file" 
                      accept=".png,.jpg,.jpeg,.webp"
                      onChange={(e) => setTemplateForm({...templateForm, preview_image: e.target.files[0]})} 
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button 
                      type="button" 
                      onClick={() => setShowTemplateModal(false)}
                      style={{ padding: '0.75rem 1.5rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={submittingTemplate}
                      style={{ padding: '0.75rem 1.5rem', background: '#D12630', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {submittingTemplate && <Loader2 size={16} className="animate-spin" />}
                      {isEditingTemplate ? 'Save Changes' : 'Upload Template'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Custom On-Screen Confirmation Modal */}
          {confirmModal.isOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(17, 17, 17, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backdropFilter: 'blur(4px)'
            }}>
              <div style={{
                background: '#FFFFFF',
                border: '2px solid #111111',
                padding: '2rem',
                maxWidth: '450px',
                width: '90%',
                boxShadow: '8px 8px 0px #111111'
              }}>
                <h3 style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  color: '#111111',
                  margin: '0 0 1rem 0',
                  borderBottom: '2px solid #111111',
                  paddingBottom: '0.5rem'
                }}>
                  {confirmModal.title}
                </h3>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.95rem',
                  color: '#333333',
                  lineHeight: 1.5,
                  margin: '0 0 1.75rem 0'
                }}>
                  {confirmModal.message}
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    style={{
                      background: '#F4F4EE',
                      color: '#111111',
                      border: '1.5px solid #111111',
                      padding: '0.5rem 1.25rem',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {confirmModal.cancelText || 'Cancel'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirmModal.onConfirm) confirmModal.onConfirm();
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    style={{
                      background: '#D61A3C',
                      color: '#FFFFFF',
                      border: '1.5px solid #111111',
                      padding: '0.5rem 1.25rem',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    {confirmModal.confirmText || 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Custom On-Screen Toast Notification */}
          {toast.show && (
            <div style={{
              position: 'fixed',
              bottom: '2rem',
              right: '2rem',
              background: toast.type === 'error' ? '#FEE2E2' : '#F4F4EE',
              color: '#111111',
              border: `2px solid ${toast.type === 'error' ? '#EF4444' : '#111111'}`,
              padding: '1rem 1.5rem',
              zIndex: 9999,
              boxShadow: '4px 4px 0px #111111',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              maxWidth: '350px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: '0.875rem'
            }}>
              <span style={{ fontSize: '1.15rem' }}>
                {toast.type === 'error' ? '⚠️' : '✓'}
              </span>
              <div>{toast.message}</div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

