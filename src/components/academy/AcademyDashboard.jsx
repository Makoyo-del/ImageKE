import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { BookOpen, Award, CheckCircle2, AlertCircle, FileText, MessageSquare, PlusCircle, Check, LogOut, ArrowRight, UserCheck, Calendar, Lock, Mail } from 'lucide-react';
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

  // Workshop management states
  const [workshopRegistrations, setWorkshopRegistrations] = useState([]);
  const [loadingWorkshop, setLoadingWorkshop] = useState(false);
  const [workshopError, setWorkshopError] = useState('');
  const [sendingCertId, setSendingCertId] = useState(null);

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
  }, [session, activeTab, state]);

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
              ← Sign Out
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
            ← Sign Out
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
      {/* ── Header ── */}
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

      {/* ── Main Container ── */}
      <div className="ac-dashboard-container">
        
        {/* ── Tabs Navigation (Render-style) ── */}
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
                className={`ac-tab-btn ${activeTab === 'workshops' ? 'active' : ''}`}
                onClick={() => setActiveTab('workshops')}
              >
                Workshops
              </button>
              <button 
                className={`ac-tab-btn ${activeTab === 'riders' ? 'active' : ''}`}
                onClick={() => setActiveTab('riders')}
              >
                Riders
              </button>
            </>
          )}
        </div>

        {/* ── Error alerts ── */}
        {error && <div className="ac-page-alert error">{error}</div>}
        {pageMessage && (
          <div className={`ac-page-alert ${pageMessage.type}`} onClick={() => setPageMessage(null)}>
            {pageMessage.text}
          </div>
        )}

        {/* ── Tab Contents ── */}
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
                    Join Google Meet →
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
                              Submit Asset →
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
                                    setMessageSubject(`Direct Mentorship Message — Career Academy`);
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

          {state?.role === 'mentor' && activeTab === 'workshops' && (
            <div className="ac-submissions-layout" style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div className="ac-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>AI Job Seeker Workshop Registrants</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Review registrations, manage attendance, and email verifiable participation certificates.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>PAID SEATS</div>
                      <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>
                        {workshopRegistrations.filter(r => r.payment_status === 'paid').length}
                      </strong>
                    </div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>REVENUE (KES)</div>
                      <strong style={{ fontSize: '1.25rem', color: '#166534' }}>
                        {workshopRegistrations.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + Number(r.amount_paid), 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>

                {workshopError && <div className="ac-page-alert error">{workshopError}</div>}

                {loadingWorkshop ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <div className="ac-spinner" />
                  </div>
                ) : workshopRegistrations.length === 0 ? (
                  <p className="ac-empty-text">No registrations found.</p>
                ) : (
                  <div className="ac-table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="ac-data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Name</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Contact Details</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Ticket Info</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Payment Reference</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Attendance</th>
                          <th style={{ textAlign: 'left', padding: '12px' }}>Send Access Email</th>
                        </tr>
                      </thead>

                      <tbody>
                        {workshopRegistrations.map(reg => (
                          <tr key={reg.id} style={{ borderBottom: '1px solid #374151' }}>
                            <td style={{ padding: '12px' }}>
                              <strong style={{ display: 'block', color: '#f8fafc' }}>{reg.full_name}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Joined {new Date(reg.created_at).toLocaleDateString()}</span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{reg.email}</div>
                              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{reg.phone}</div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: reg.ticket_type === 'early_bird' ? 'rgba(20, 184, 166, 0.1)' : 'rgba(99, 102, 241, 0.1)', color: reg.ticket_type === 'early_bird' ? '#14b8a6' : '#818cf8', textTransform: 'uppercase' }}>
                                {reg.ticket_type === 'early_bird' ? 'Early Bird' : 'Regular'}
                              </span>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>KES {Number(reg.amount_paid).toLocaleString()}</span>
                            </td>
                            <td style={{ padding: '12px', fontSize: '0.8rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                              {reg.payment_reference}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span className={`ac-status-badge ${reg.payment_status === 'paid' ? 'active' : 'inactive'}`}>
                                {reg.payment_status === 'paid' ? 'Paid' : 'Pending'}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              {reg.payment_status === 'paid' ? (
                                <button
                                  onClick={() => handleUpdateAttendance(reg.id, reg.attendance_status)}
                                  style={{
                                    border: '1px solid',
                                    borderColor: reg.attendance_status === 'attended' ? '#22c55e' : '#475569',
                                    background: reg.attendance_status === 'attended' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                                    color: reg.attendance_status === 'attended' ? '#22c55e' : '#94a3b8',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  {reg.attendance_status === 'attended' ? 'Attended' : 'Mark Attended'}
                                </button>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: '12px' }}>
                              {reg.payment_status === 'paid' ? (
                                <button
                                  onClick={() => handleSendCertificate(reg.id)}
                                  disabled={sendingCertId === reg.id}
                                  className="ac-btn-review-action"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '4px 8px',
                                    backgroundColor: reg.certificate_sent ? 'rgba(148, 163, 184, 0.1)' : '',
                                    borderColor: reg.certificate_sent ? '#475569' : '',
                                    color: reg.certificate_sent ? '#94a3b8' : '',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {sendingCertId === reg.id ? (
                                    'Sending...'
                                  ) : reg.certificate_sent ? (
                                    'Resend Access'
                                  ) : (
                                    'Email Access'
                                  )}
                                </button>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MENTOR RIDERS TAB */}
          {state?.role === 'mentor' && activeTab === 'riders' && (
            <div className="ac-submissions-layout" style={{ maxWidth: '1200px', margin: '0 auto', gap: '2rem' }}>
              <div className="ac-card">
                <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Onboard New Rider</h3>
                <form onSubmit={handleCreateRider} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Name</label>
                    <input type="text" required value={riderForm.name} onChange={(e) => setRiderForm({...riderForm, name: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Phone</label>
                    <input type="tel" required value={riderForm.phone} onChange={(e) => setRiderForm({...riderForm, phone: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Email</label>
                    <input type="email" required value={riderForm.email} onChange={(e) => setRiderForm({...riderForm, email: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Initial Password</label>
                    <input type="password" required value={riderForm.password} onChange={(e) => setRiderForm({...riderForm, password: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="ac-btn-primary" disabled={riderActionLoading}>
                      {riderActionLoading ? 'Creating...' : 'Create Rider Account'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="ac-card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#0f172a' }}>Manage Riders</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>Name</th>
                        <th style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>Phone</th>
                        <th style={{ padding: '12px', color: '#64748b', fontSize: '0.85rem' }}>Change Password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riders.map(rider => (
                        <tr key={rider.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 500, color: '#0f172a' }}>{rider.name}</td>
                          <td style={{ padding: '12px', color: '#475569' }}>{rider.phone}</td>
                          <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                            <input 
                              type="password" 
                              placeholder="New password" 
                              value={newPasswords[rider.id] || ''}
                              onChange={(e) => setNewPasswords({...newPasswords, [rider.id]: e.target.value})}
                              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            />
                            <button 
                              onClick={() => handleChangeRiderPassword(rider.id)}
                              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                            >
                              Update
                            </button>
                          </td>
                        </tr>
                      ))}
                      {riders.length === 0 && (
                        <tr>
                          <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No riders found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
