import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Download, CheckCircle, ArrowLeft, Loader2, AlertCircle, RefreshCw, Trash2, FileImage, Video, Crop, FileVideo, Music, Play, Pause, Eye, Layers, User, Globe, Percent, GraduationCap, Compass } from 'lucide-react';
import ServicesPage from './ServicesPage';
import ATSSimulator from './ATSSimulator';
import { HookBunkerLanding, HookBunkerDocs, HookBunkerDashboard } from './HookBunker';
import AcademyAuth from './components/academy/AcademyAuth';
import AcademyDashboard from './components/academy/AcademyDashboard';
import WorkshopLanding from './components/workshop/WorkshopLanding';
import WorkshopJoin from './components/workshop/WorkshopJoin';
import RiderLogin from './components/rider/RiderLogin';
import RiderDashboard from './components/rider/RiderDashboard';
import { PRESETS, processImage, compressDocumentImage } from './utils/imageProcessor';
import { loadFFmpeg, changeVideoAspectRatio, compressVideo, addVideoWatermark, extractAudio, extractVideoFrames } from './utils/videoProcessor';
import axios from 'axios';
import JSZip from 'jszip';

// ─── Environment Config ────────────────────────────────────────────────────────
// Frontend is hosted on Hostinger, backend API is on Render (cross-origin).
// Set VITE_API_URL to your Render service URL before building for production.
// For local dev: VITE_API_URL=http://localhost:5000
const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a short delay to let the browser start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Processing Overlay ────────────────────────────────────────────────────────
function ProcessingOverlay({ message }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px', margin: '0 auto 1rem',
          border: '4px solid #e5e7eb', borderTop: '4px solid var(--primary)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontWeight: 600, color: 'var(--text)' }}>{message}</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Error Banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
      padding: '0.75rem 1rem', marginBottom: '1rem',
      display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
    }}>
      <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '1px' }} />
      <p style={{ color: '#991b1b', fontSize: '0.875rem', flex: 1 }}>{message}</p>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: '1rem' }}
      >×</button>
    </div>
  );
}

// ─── Routing Helpers ───────────────────────────────────────────────────────────
const getPathFromHash = () => {
  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);
  const fullUrl = window.location.href;
  
  // Intercept Supabase Auth redirects (Implicit Grant Hash or PKCE/error Search Query)
  if (
    hash.includes('access_token=') || 
    hash.includes('error=') ||
    searchParams.has('code') ||
    searchParams.has('error') ||
    searchParams.has('error_description')
  ) {
    const isAcademyRedirect = fullUrl.includes('/academy/dashboard') ||
      fullUrl.includes('%2Facademy%2Fdashboard') ||
      sessionStorage.getItem('academy_signup_pending') === 'true';
    return isAcademyRedirect ? 'academy-dashboard' : 'hookbunker-dashboard';
  }

  if (hash === '#/ats' || hash === '#/ats-simulator') return 'ats';
  if (hash === '#/batch') return 'batch';
  if (hash === '#/custom') return 'custom';
  if (hash === '#/processor') return 'processor';
  if (hash === '#/terms') return 'terms';
  if (hash === '#/privacy') return 'privacy';
  if (hash === '#/photo-tools' || hash === '#/photo-editor' || hash === '#/photoeditor') return 'home';
  if (hash === '#/video-tools' || hash === '#/video-editor' || hash === '#/videos') return 'home';
  if (hash === '#/home' || hash === '#/tools') return 'home';
  
  // Academy paths
  if (hash === '#/academy') return 'academy-auth';
  if (hash === '#/academy/dashboard') return 'academy-dashboard';

  // Workshop paths
  if (hash.startsWith('#/workshop/join')) return 'workshop-join';
  if (hash === '#/workshop' || hash === '#/ai-jobseeker-workshop') return 'workshop';

  // Rider paths
  if (hash === '#/rider-login') return 'rider-login';
  if (hash === '#/rider-dashboard') return 'rider-dashboard';

  // HookBunker paths
  if (hash === '#/hookbunker') return 'hookbunker-landing';
  if (hash === '#/hookbunker/docs') return 'hookbunker-docs';
  if (hash === '#/hookbunker/dashboard') return 'hookbunker-dashboard';
  if (hash === '#/hookbunker/terms') return 'terms';
  if (hash === '#/hookbunker/privacy') return 'privacy';
  
  return 'services';
};

const getTabFromHash = () => {
  const hash = window.location.hash;
  if (hash === '#/video-tools' || hash === '#/video-editor' || hash === '#/videos') return 'videos';
  return 'images';
};

// ─── Main App ──────────────────────────────────────────────────────────────────
function App() {
  // 'services' | 'home' | 'processor' | 'custom' | 'batch' | 'terms' | 'privacy'
  const [currentPath, setCurrentPath] = useState(getPathFromHash);
  const [currentTab, setCurrentTab] = useState(getTabFromHash);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customSize, setCustomSize] = useState({
    name: 'Custom Size',
    label: 'Your defined dimensions',
    width: 600,
    height: 600,
    maxSizeKB: 100,
  });

  const [batchFiles, setBatchFiles] = useState([]);
  const [targetSizeKB, setTargetSizeKB] = useState(250);
  const [maxDimension, setMaxDimension] = useState(1600);

  // We keep originalFile in a ref so it's always fresh inside async callbacks
  // without needing to be in the dependency array (avoids stale closure bugs)
  const originalFileRef = useRef(null);

  const [processedBlob, setProcessedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [error, setError] = useState('');

  // ── Video Tools States ──────────────────────────────────────────────────────
  const [activeVideoTool, setActiveVideoTool] = useState(null); // null | 'aspect' | 'compress' | 'watermark' | 'audio' | 'frames'
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFileMetadata, setVideoFileMetadata] = useState({ duration: 0, width: 0, height: 0 });
  const [ffmpegInstance, setFfmpegInstance] = useState(null);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [ffmpegLoadProgress, setFfmpegLoadProgress] = useState(0);
  const [ffmpegProcessProgress, setFfmpegProcessProgress] = useState(0);
  
  // Aspect Ratio settings
  const [targetAspect, setTargetAspect] = useState('9:16');
  const [cropOffsetPercent, setCropOffsetPercent] = useState(50); // slider 0 to 100 for horizontal focus
  
  // Compressor settings
  const [targetCompressMB, setTargetCompressMB] = useState(16); // Default 16MB for WhatsApp
  
  // Watermark settings
  const [watermarkType, setWatermarkType] = useState('text'); // 'text' | 'image'
  const [watermarkText, setWatermarkText] = useState('My Brand');
  const [watermarkImageFile, setWatermarkImageFile] = useState(null);
  const [watermarkImagePreview, setWatermarkImagePreview] = useState('');
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');

  // Frame Extractor settings
  const [frameExtractMode, setFrameExtractMode] = useState('fps'); // 'fps' | 'count'
  const [frameExtractFpsRate, setFrameExtractFpsRate] = useState(2); // every 2 seconds
  const [frameExtractCount, setFrameExtractCount] = useState(10); // 10 frames total
  const [extractedFrames, setExtractedFrames] = useState([]); // Array of { name, timestamp, blob }
  
  // Output states
  const [processedVideoBlob, setProcessedVideoBlob] = useState(null);
  const [processedVideoUrl, setProcessedVideoUrl] = useState('');


  // Intercept Supabase Auth redirects (Implicit Grant Hash or PKCE/error Search Query)
  useEffect(() => {
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    
    // Check for custom Academy verify_token
    const verifyToken = searchParams.get('verify_token');
    if (verifyToken) {
      (async () => {
        try {
          setIsProcessing(true);
          setProcessingMsg('Verifying your email address...');
          const res = await axios.post(`${API_URL}/api/academy/verify-email`, { token: verifyToken });
          if (res.data?.success) {
            sessionStorage.setItem('hb_toast_message', 'Email verified successfully! You can now sign in.');
            sessionStorage.setItem('hb_toast_type', 'success');
          } else {
            sessionStorage.setItem('hb_auth_error', 'Email verification failed: Invalid or expired link.');
          }
        } catch (err) {
          sessionStorage.setItem('hb_auth_error', err.response?.data?.error || 'Email verification failed. Connection issue.');
        } finally {
          setIsProcessing(false);
          // Clear query params and reload the page cleanly on Academy dashboard page
          const cleanUrl = window.location.origin + window.location.pathname + '#/academy/dashboard';
          window.location.href = cleanUrl;
        }
      })();
      return;
    }
    
    let isAuthRedirect = false;
    let errorMsg = null;
    let authType = null;
    let hasAccessToken = false;

    if (hash.includes('access_token=') || hash.includes('error=')) {
      isAuthRedirect = true;
      const paramString = hash.includes('access_token=')
        ? hash.substring(hash.indexOf('access_token='))
        : hash.substring(hash.indexOf('error='));
      const params = new URLSearchParams(paramString);
      errorMsg = params.get('error_description') || params.get('error');
      authType = params.get('type');
      hasAccessToken = params.has('access_token');
    } else if (searchParams.has('code') || searchParams.has('error') || searchParams.has('error_description')) {
      isAuthRedirect = true;
      errorMsg = searchParams.get('error_description') || searchParams.get('error');
      authType = searchParams.get('type');
      hasAccessToken = searchParams.has('code');
    }

    if (isAuthRedirect) {
      // Determine which product this redirect was for.
      // Academy sets emailRedirectTo to /#/academy/dashboard.
      // If that path is present in the full URL, it's an Academy redirect.
      const fullUrl = window.location.href;
      const isAcademyRedirect = fullUrl.includes('/academy/dashboard') ||
        fullUrl.includes('%2Facademy%2Fdashboard') ||
        sessionStorage.getItem('academy_signup_pending') === 'true';

      if (errorMsg) {
        const decodedError = decodeURIComponent(errorMsg).replace(/\+/g, ' ');
        sessionStorage.setItem('hb_auth_error', `Authentication failed: ${decodedError}`);
      } else if (hasAccessToken) {
        if (isAcademyRedirect) {
          sessionStorage.setItem('hb_toast_message', 'Email verified. Welcome to the Career Academy!');
          sessionStorage.setItem('hb_toast_type', 'success');
          sessionStorage.removeItem('academy_signup_pending');
        } else if (authType === 'signup') {
          sessionStorage.setItem('hb_toast_message', 'Email verified successfully. Welcome to your HookBunker dashboard!');
          sessionStorage.setItem('hb_toast_type', 'success');
        } else if (authType === 'recovery') {
          sessionStorage.setItem('hb_toast_message', 'Credentials confirmed. Please update your password in the settings.');
          sessionStorage.setItem('hb_toast_type', 'success');
        } else if (authType === 'invite') {
          sessionStorage.setItem('hb_toast_message', 'Invitation accepted. Welcome to HookBunker!');
          sessionStorage.setItem('hb_toast_type', 'success');
        } else {
          sessionStorage.setItem('hb_toast_message', 'Email verified and logged in successfully.');
          sessionStorage.setItem('hb_toast_type', 'success');
        }
      }

      // Route to the correct dashboard based on product
      if (isAcademyRedirect) {
        if (window.location.search) {
          const cleanUrl = window.location.origin + window.location.pathname + '#/academy/dashboard';
          window.history.replaceState(null, '', cleanUrl);
        } else {
          window.location.hash = '#/academy/dashboard';
        }
        setCurrentPath('academy-dashboard');
      } else {
        // Clear search query parameters or hash redirects from URL to keep it clean
        if (window.location.search) {
          const cleanUrl = window.location.origin + window.location.pathname + '#/hookbunker/dashboard';
          window.history.replaceState(null, '', cleanUrl);
        } else {
          window.location.hash = '#/hookbunker/dashboard';
        }
        // Manually trigger local path state update
        setCurrentPath('hookbunker-dashboard');
      }
    }
  }, []);

  // Reset window scroll to top on path/tool change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentPath, activeVideoTool]);

  // Listen for hash changes to update navigation state
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(getPathFromHash());
      setCurrentTab(getTabFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial sync
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Reactive cleanups when navigating away from specific tools
  useEffect(() => {
    if (currentPath !== 'processor') {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setProcessedBlob(null);
      setSelectedPreset(null);

    }
  }, [currentPath, previewUrl]);

  useEffect(() => {
    if (currentPath !== 'batch') {
      if (batchFiles.length > 0) {
        batchFiles.forEach(f => {
          if (f.previewUrl) {
            URL.revokeObjectURL(f.previewUrl);
          }
        });
        setBatchFiles([]);
      }
    }
  }, [currentPath, batchFiles]);

  useEffect(() => {
    const isVideoView = currentPath === 'home' && currentTab === 'videos';
    if (!isVideoView && activeVideoTool) {
      setVideoFile(null);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl('');
      setProcessedVideoBlob(null);
      if (processedVideoUrl && processedVideoUrl !== 'extracted_frames') {
        URL.revokeObjectURL(processedVideoUrl);
      }
      setProcessedVideoUrl('');
      setExtractedFrames([]);
      setCropOffsetPercent(50);
      setWatermarkImageFile(null);
      if (watermarkImagePreview) URL.revokeObjectURL(watermarkImagePreview);
      setWatermarkImagePreview('');
      setError('');
    }
  }, [currentPath, currentTab, activeVideoTool, videoUrl, processedVideoUrl, watermarkImagePreview]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getActivePreset = () => selectedPreset || customSize;

  const revokePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const reset = () => {
    revokePreview();
    originalFileRef.current = null;
    setProcessedBlob(null);
    setPreviewUrl(null);
    setSelectedPreset(null);
    window.location.hash = '#/photo-tools';
    setError('');
  };

  const formatSize = (bytes) => {
    if (bytes === null || bytes === undefined) return '';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const processBatchFile = useCallback(async (batchFile, targetSize = targetSizeKB, maxDim = maxDimension) => {
    setBatchFiles(prev => prev.map(f => f.id === batchFile.id ? { ...f, status: 'compressing' } : f));
    try {
      const compressedBlob = await compressDocumentImage(batchFile.file, maxDim, targetSize);
      const previewUrl = URL.createObjectURL(compressedBlob);
      setBatchFiles(prev => prev.map(f => f.id === batchFile.id ? {
        ...f,
        status: 'success',
        compressedBlob,
        compressedSize: compressedBlob.size,
        previewUrl,
      } : f));
    } catch (err) {
      console.error(err);
      setBatchFiles(prev => prev.map(f => f.id === batchFile.id ? {
        ...f,
        status: 'error',
        error: err.message || 'Compression failed',
      } : f));
    }
  }, []);

  const handleBatchFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files || []);
    e.target.value = '';
    if (selectedFiles.length === 0) return;

    const filesToProcess = selectedFiles.slice(0, 4);
    if (selectedFiles.length > 4) {
      setError('A maximum of 4 files can be compressed at once. Processing the first 4.');
    } else {
      setError('');
    }

    const initialFiles = filesToProcess.map((file, idx) => ({
      id: Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      originalSize: file.size,
      compressedSize: null,
      compressedBlob: null,
      previewUrl: null,
      status: 'pending',
      error: null,
    }));

    setBatchFiles(initialFiles);

    // Trigger processing for each file
    initialFiles.forEach(f => {
      processBatchFile(f, targetSizeKB, maxDimension);
    });
  }, [targetSizeKB, maxDimension, processBatchFile]);

  const recompressAll = useCallback((targetSize = targetSizeKB, maxDim = maxDimension) => {
    setError('');
    setBatchFiles(prev => {
      // Cleanup previous preview URLs
      prev.forEach(f => {
        if (f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl);
        }
      });

      const updated = prev.map(f => ({
        ...f,
        status: 'pending',
        compressedBlob: null,
        compressedSize: null,
        previewUrl: null,
        error: null,
      }));

      // Re-trigger processing for each
      updated.forEach(f => {
        processBatchFile(f, targetSize, maxDim);
      });

      return updated;
    });
  }, [targetSizeKB, maxDimension, processBatchFile]);

  // Direct free download for all batch files
  const handleDownloadAllBatch = useCallback(async () => {
    const successFiles = batchFiles.filter(f => f.status === 'success' && f.compressedBlob);
    if (successFiles.length === 0) return;

    for (let i = 0; i < successFiles.length; i++) {
      const f = successFiles[i];
      const cleanFilename = f.name.replace(/\.[^/.]+$/, "") + "_compressed.jpg";
      triggerDownload(f.compressedBlob, cleanFilename);
      if (i < successFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
  }, [batchFiles]);

  // Direct free download for individual batch file
  const handleDownloadIndividualBatch = useCallback(async (fileItem) => {
    const cleanFilename = fileItem.name.replace(/\.[^/.]+$/, "") + "_compressed.jpg";
    triggerDownload(fileItem.compressedBlob, cleanFilename);
  }, []);

  const resetBatch = useCallback(() => {
    batchFiles.forEach(f => {
      if (f.previewUrl) {
        URL.revokeObjectURL(f.previewUrl);
      }
    });
    setBatchFiles([]);
    setError('');
  }, [batchFiles]);

  const removeBatchFile = useCallback((id) => {
    setBatchFiles(prev => {
      const fileToRem = prev.find(f => f.id === id);
      if (fileToRem && fileToRem.previewUrl) {
        URL.revokeObjectURL(fileToRem.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const handleAddBatchFiles = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files || []);
    e.target.value = '';
    if (selectedFiles.length === 0) return;

    const allowedAdd = Math.max(0, 4 - batchFiles.length);
    if (batchFiles.length + selectedFiles.length > 4) {
      setError('A maximum of 4 files can be compressed at once.');
    } else {
      setError('');
    }

    const filesToProcess = selectedFiles.slice(0, allowedAdd);
    if (filesToProcess.length === 0) return;

    const addedItems = filesToProcess.map((file, idx) => ({
      id: Date.now() + '-' + idx + '-' + Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      originalSize: file.size,
      compressedSize: null,
      compressedBlob: null,
      previewUrl: null,
      status: 'pending',
      error: null,
    }));

    setBatchFiles(prev => [...prev, ...addedItems]);

    // Trigger processing for each of the new files
    addedItems.forEach(item => {
      processBatchFile(item, targetSizeKB, maxDimension);
    });
  }, [batchFiles, targetSizeKB, maxDimension, processBatchFile]);

  // ── File Upload & Processing ───────────────────────────────────────────────
  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be re-selected after a reset
    e.target.value = '';
    if (!file) return;

    // Determine the preset BEFORE any state changes
    // currentPath is 'custom' only when the user is on the custom page and
    // hasn't navigated away yet. selectedPreset is null on that page.
    const preset = currentPath === 'custom' ? customSize : selectedPreset;
    if (!preset) {
      setError('No format selected. Please go back and select a destination.');
      return;
    }

    revokePreview();
    originalFileRef.current = file;
    setProcessedBlob(null);
    setPreviewUrl(null);
    setError('');
    setIsProcessing(true);
    setProcessingMsg(`Optimizing for ${preset.name}…`);

    try {
      const blob = await processImage(file, preset, true); // watermarked preview
      const url = URL.createObjectURL(blob);
      setProcessedBlob(blob);
      setPreviewUrl(url);
      // Switch to processor view AFTER success
      setSelectedPreset(preset);
      setCurrentPath('processor');
    } catch (err) {
      console.error('[processImage]', err);
      setError('Failed to process image. Please try a different photo.');
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  }, [currentPath, customSize, selectedPreset, previewUrl]);


  // \u2500\u2500 Download \u2014 free, no payment gate \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const handleDownload = async () => {
    const preset = getActivePreset();
    const file = originalFileRef.current;
    if (!file) {
      setError('Original photo is missing. Please upload again.');
      return;
    }

    setIsProcessing(true);
    setProcessingMsg('Generating your photo\u2026');
    setError('');

    try {
      const cleanBlob = await processImage(file, preset, false); // no watermark \u2014 tool is free
      const filename = `${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_imageke.jpg`;
      triggerDownload(cleanBlob, filename);
    } catch (err) {
      console.error('[download]', err);
      setError(err.message || 'Failed to generate photo. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  };


  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: HOME
  // ─────────────────────────────────────────────────────────────────────────────
  const renderHome = () => (
    <div>
      <section className="hero" style={{ background: 'linear-gradient(135deg, #0D1B4D 0%, #1238E8 50%, #2B5BFF 100%)', borderBottom: 'none', color: '#ffffff', padding: '5rem 1.25rem 4rem' }}>
        <div className="container">
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '20px', padding: '6px 16px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.25rem', color: '#E0E7FF' }}>Kenya's #1 Photo Fixer</div>
          <h1 style={{ color: '#ffffff', marginBottom: '1.25rem', fontSize: 'clamp(2rem, 5vw, 3rem)', lineHeight: 1.2 }}>Your Photo Was Rejected.<br/>Fix It in 20 Seconds.</h1>
          <p style={{ fontSize: '1.1rem', maxWidth: '620px', margin: '0 auto', lineHeight: 1.75, color: 'rgba(255,255,255,0.85)' }}>
            eCitizen says your file is too large. The visa portal says the wrong dimensions. HELB bounces it back. You've been going back and forth for hours.
            <br /><br />
            <strong style={{ color: '#ffffff' }}>ImageKE solves it instantly.</strong> Select your destination portal, upload your photo, and get back a file that passes every check — sized exactly right, compressed below the limit, ready to submit. No app. No signup. Just results.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
            {['[OK] eCitizen Ready', '[OK] US Visa 600x600', '[OK] KRA iTax', '[OK] HELB Portal', '[OK] M-Pesa Checkout'].map(tag => (
              <span key={tag} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '20px', padding: '5px 14px', fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        {/* Batch Document Compressor Banner */}
        <div style={{
          background: 'linear-gradient(135deg, var(--dm-navy) 0%, var(--dm-primary) 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2.5rem',
          boxShadow: '0 8px 30px rgba(18, 56, 232, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '1rem',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'left',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Tablet / slow connection optimizer
          </div>
          <div>
            <h2 style={{ color: '#ffffff', marginBottom: '0.5rem', fontSize: '1.5rem' }}>[doc] Batch Document Compressor</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.95rem', maxWidth: '560px', lineHeight: 1.5 }}>
              Got 4 scanned pages that are 3MB each? eCitizen won't accept anything over 250KB. Upload all four here and compress them to submission size — without losing the text readability that examiners need.
            </p>
          </div>
          <button
            className="btn"
            style={{
              background: '#ffffff',
              color: 'var(--primary)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              fontWeight: 700,
              border: 'none',
            }}
            onClick={() => window.location.hash = '#/batch'}
          >
            Compress My Documents →
          </button>
        </div>

        <h2 style={{ marginBottom: '0.5rem' }}>Where do you need to submit?</h2>

        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Each portal has different pixel and file size requirements. Select yours and we'll handle the rest automatically.</p>
        <div className="grid">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <div
              key={key}
              className="card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && (setSelectedPreset(preset), window.location.hash = '#/processor')}
              onClick={() => {
                setSelectedPreset(preset);
                window.location.hash = '#/processor';
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                borderLeft: '4px solid var(--primary)',
                cursor: 'pointer',
                background: '#ffffff',
                padding: '1.5rem',
                borderRadius: 'var(--radius)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <div style={{
                  background: 'var(--primary-light)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  flexShrink: 0,
                }}>
                  {key === 'ECITIZEN' && <User size={20} />}
                  {key === 'US_VISA' && <Globe size={20} />}
                  {key === 'KRA' && <Percent size={20} />}
                  {key === 'HELB' && <GraduationCap size={20} />}
                  {key === 'SCHENGEN' && <Compass size={20} />}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>{preset.name}</h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', flexGrow: 1 }}>{preset.label}</p>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                {preset.width}×{preset.height}px &bull; Max {preset.maxSizeKB}KB
              </div>
            </div>
          ))}

          {/* Unified Custom Dimensions Card */}
          <div
            className="card"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && (window.location.hash = '#/custom')}
            onClick={() => window.location.hash = '#/custom'}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              borderLeft: '4px solid #4B5563',
              cursor: 'pointer',
              background: '#ffffff',
              padding: '1.5rem',
              borderRadius: 'var(--radius)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <div style={{
                background: '#F3F4F6',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4B5563',
                flexShrink: 0,
              }}>
                <Crop size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)' }}>Custom Dimensions</h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)', flexGrow: 1 }}>Define your own width, height, and maximum file size limit.</p>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#4B5563' }}>
              Manual Config &bull; Custom Limits
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: BATCH COMPRESSOR
  // ─────────────────────────────────────────────────────────────────────────────
  const renderBatchPage = () => {
    const isAnyCompressing = batchFiles.some(f => f.status === 'compressing');
    const successCount = batchFiles.filter(f => f.status === 'success').length;
    
    return (
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        {/* Back Button */}
        <button
          onClick={() => {
            resetBatch();
            window.location.hash = '#/photo-tools';
          }}
          className="btn"
          style={{
            background: 'none',
            color: 'var(--text-muted)',
            padding: 0,
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <ArrowLeft size={18} /> Back to home
        </button>

        {/* Title */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2.5rem' }}>[doc]</span> Batch Document Compressor
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1.05rem' }}>
            Compress up to 4 document photos locally on your tablet. Preserves layout, aspect ratio, and text sharpness.
          </p>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '2rem',
          alignItems: 'start',
        }} className="batch-layout">
          
          {/* Settings Box */}
          <div style={{
            background: 'var(--card-bg)',
            padding: '2rem',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚙️ Compression Settings
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {/* Target File Size Slider */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Target File Size: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{targetSizeKB} KB</span>
                </label>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={targetSizeKB}
                  onChange={(e) => setTargetSizeKB(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  200-300 KB is optimal for fast portal uploads and clear text readability.
                </span>
              </div>

              {/* Max Dimension Select */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Max Dimension (Longest Edge)
                </label>
                <select
                  value={maxDimension}
                  onChange={(e) => setMaxDimension(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    background: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <option value="1200">1200 px (Fast upload, compact)</option>
                  <option value="1600">1600 px (Recommended default)</option>
                  <option value="2000">2000 px (High detail)</option>
                  <option value="2400">2400 px (Maximum detail)</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Preserves original aspect ratio. Text will not be cropped.
                </span>
              </div>
            </div>

            {batchFiles.length > 0 && (
              <button
                onClick={() => recompressAll(targetSizeKB, maxDimension)}
                disabled={isAnyCompressing}
                className="btn"
                style={{
                  marginTop: '1.5rem',
                  background: 'transparent',
                  color: 'var(--primary)',
                  border: '1.5px solid var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                }}
              >
                <RefreshCw size={14} className={isAnyCompressing ? 'spin-icon' : ''} />
                Apply &amp; Re-compress All
              </button>
            )}
          </div>

          {/* Upload Zone & File List */}
          {batchFiles.length === 0 ? (
            <div className="upload-zone" style={{ padding: '4rem 2rem', background: '#F9FAFB' }}>
              <input
                type="file"
                id="batchFileInput"
                hidden
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleBatchFileSelect}
              />
              <label htmlFor="batchFileInput" style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{
                  background: '#EBF3FF',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  color: 'var(--primary)',
                }}>
                  <Upload size={32} />
                </div>
                <h3>Select Document Photos</h3>
                <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem', fontSize: '0.95rem' }}>
                  Select up to 4 images from your tablet storage or camera roll.
                </p>
                <span className="btn">Select Files</span>
              </label>
            </div>
          ) : (
            <div>
              {/* File List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                {batchFiles.map((fileItem) => {
                  const reductionPercent = fileItem.compressedSize && fileItem.originalSize
                    ? Math.round(((fileItem.originalSize - fileItem.compressedSize) / fileItem.originalSize) * 100)
                    : 0;

                  return (
                    <div
                      key={fileItem.id}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid var(--border)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'transform 0.15s ease',
                      }}
                      className="batch-file-card"
                    >
                      {/* Left: Thumbnail & File Meta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '6px',
                          background: '#F3F4F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                          border: '1px solid var(--border)',
                        }}>
                          {fileItem.previewUrl ? (
                            <img
                              src={fileItem.previewUrl}
                              alt="Thumbnail"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <FileImage size={24} style={{ color: 'var(--text-muted)' }} />
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            color: 'var(--text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }} title={fileItem.name}>
                            {fileItem.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                            <span>Original: <b>{formatSize(fileItem.originalSize)}</b></span>
                            {fileItem.compressedSize && (
                              <>
                                <span>&bull;</span>
                                <span style={{ color: 'var(--success)' }}>Compressed: <b>{formatSize(fileItem.compressedSize)}</b></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Status Badge */}
                        {fileItem.status === 'pending' && (
                          <span style={{ fontSize: '0.8rem', background: '#F3F4F6', color: '#4B5563', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                            Pending
                          </span>
                        )}
                        {fileItem.status === 'compressing' && (
                          <span style={{
                            fontSize: '0.8rem',
                            background: '#EBF3FF',
                            color: 'var(--primary)',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }} className="pulse">
                            <Loader2 size={12} className="spin-icon" /> Compressing
                          </span>
                        )}
                        {fileItem.status === 'success' && (
                          <span style={{
                            fontSize: '0.8rem',
                            background: '#ECFDF5',
                            color: 'var(--success)',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontWeight: 600,
                          }}>
                            -{reductionPercent}% saved
                          </span>
                        )}
                        {fileItem.status === 'error' && (
                          <span style={{ fontSize: '0.8rem', background: '#FEF2F2', color: '#EF4444', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }} title={fileItem.error}>
                            Failed
                          </span>
                        )}

                        {/* Individual Download */}
                        {fileItem.status === 'success' && fileItem.compressedBlob && (
                          <button
                            onClick={() => handleDownloadIndividualBatch(fileItem)}
                            className="btn"
                            style={{
                              padding: '0.4rem 0.8rem',
                              fontSize: '0.8rem',
                              background: 'var(--primary-light)',
                              color: 'var(--primary)',
                              border: 'none',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <Download size={12} /> Download
                          </button>
                        )}

                        {/* Remove button */}
                        <button
                          onClick={() => removeBatchFile(fileItem.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#9CA3AF',
                            padding: '0.25rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                          title="Remove file"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Bar */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {batchFiles.length < 4 && (
                    <label
                      htmlFor="addBatchFileInput"
                      className="btn"
                      style={{
                        background: 'transparent',
                        color: 'var(--primary)',
                        border: '1.5px solid var(--primary)',
                        cursor: 'pointer',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        fontSize: '0.9375rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      Add Files ({batchFiles.length}/4)
                    </label>
                  )}

                  <button
                    onClick={resetBatch}
                    className="btn"
                    style={{
                      background: 'none',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    Clear All
                  </button>
                </div>

                <button
                  onClick={handleDownloadAllBatch}
                  disabled={successCount === 0}
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.875rem 2rem',
                    boxShadow: successCount > 0 ? '0 4px 14px rgba(0, 82, 204, 0.3)' : 'none',
                  }}
                >
                  <Download size={18} /> Download All ({successCount})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic animations injection */}
        <style>{`
          .spin-icon {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .pulse {
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          @media (min-width: 768px) {
            .batch-layout {
              grid-template-columns: 320px 1fr;
            }
          }
        `}</style>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: CUSTOM PAGE
  // ─────────────────────────────────────────────────────────────────────────────
  const renderCustomPage = () => {
    const handleCustomInput = (field) => (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val > 0) {
        setCustomSize((prev) => ({ ...prev, [field]: val }));
      }
    };

    return (
      <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
        <button
          onClick={reset}
          className="btn"
          style={{ background: 'none', color: 'var(--text-muted)', padding: 0, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={18} /> Back
        </button>

        <div style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h1 style={{ marginBottom: '0.5rem' }}>Custom Dimensions</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Set your target dimensions and max file size, then upload.
          </p>

          <ErrorBanner message={error} onDismiss={() => setError('')} />

          <div style={{
            display: 'grid', gap: '1.25rem',
            background: 'var(--card-bg)', padding: '2rem',
            borderRadius: '12px', border: '1px solid var(--border)',
          }}>
            {[
              { label: 'Width (px)', field: 'width', min: 10, max: 5000 },
              { label: 'Height (px)', field: 'height', min: 10, max: 5000 },
              { label: 'Max File Size (KB)', field: 'maxSizeKB', min: 1, max: 10000 },
            ].map(({ label, field, min, max }) => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {label}
                </label>
                <input
                  type="number"
                  value={customSize[field]}
                  min={min}
                  max={max}
                  onChange={handleCustomInput(field)}
                  style={{
                    width: '100%', padding: '0.75rem 1rem',
                    borderRadius: '8px', border: '1px solid var(--border)',
                    fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}

            <div className="upload-zone" style={{ marginTop: '0.5rem' }}>
              <input
                type="file"
                id="customFileInput"
                hidden
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
              />
              <label htmlFor="customFileInput" style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{
                  background: '#F0F7FF', width: '48px', height: '48px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1rem', color: 'var(--primary)',
                }}>
                  <Upload size={24} />
                </div>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Ready to process</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {customSize.width}×{customSize.height}px &bull; Max {customSize.maxSizeKB}KB
                </p>
                <span className="btn">Select &amp; Resize</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: PROCESSOR
  // ─────────────────────────────────────────────────────────────────────────────
  const renderProcessor = () => {
    const preset = getActivePreset();

    return (
      <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
        <button
          onClick={reset}
          className="btn"
          style={{ background: 'none', color: 'var(--text-muted)', padding: 0, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={18} /> Back to selections
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1>{preset.name}</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {preset.width}×{preset.height}px &bull; Under {preset.maxSizeKB}KB
          </p>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {!previewUrl ? (
          // ── Upload State ────────────────────────────────────────────────────
          <div className="upload-zone">
            <input
              type="file"
              id="fileInput"
              hidden
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
            />
            <label htmlFor="fileInput" style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{
                background: '#F0F7FF', width: '64px', height: '64px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem', color: 'var(--primary)',
              }}>
                <Upload size={32} />
              </div>
              <h3>Upload your photo</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem' }}>
                Selfie or phone photo works perfectly. Supports JPG, PNG, WebP.
              </p>
              <span className="btn">Select Image</span>
            </label>
          </div>
        ) : (
          // ── Preview & Download State ─────────────────────────────────────────
          <div className="preview-container">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={previewUrl} className="preview-img" alt="Processed preview" />
            </div>

            <div className="metadata-info" style={{ marginTop: '1rem' }}>
              <div>Dimensions: <b>{preset.width}×{preset.height}px</b></div>
              {processedBlob && (
                <div>Preview size: <b>{(processedBlob.size / 1024).toFixed(1)} KB</b></div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="btn"
                onClick={handleDownload}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', fontSize: '1rem' }}
              >
                <Download size={18} /> Download Photo
              </button>

              <label style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Try a different photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: LEGAL PAGES
  // ─────────────────────────────────────────────────────────────────────────────
  const renderTerms = () => (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem', maxWidth: '800px' }}>
      <button
        onClick={() => setCurrentPath('services')}
        className="btn"
        style={{ background: 'none', color: 'var(--text-muted)', padding: 0, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <ArrowLeft size={18} /> Back to Home
      </button>
      <h1>Terms of Use</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Last Updated: June 2026</p>
      <div style={{ marginTop: '2rem', lineHeight: 1.8, color: 'var(--text-muted)' }}>
        <h3 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>1. Acceptance of Terms</h3>
        <p>By accessing or using the website at duncanmakoyo.com ("the Site"), and any associated media utilities (ImageKE Photo & Video Studio), career development services, ATS resume auditing simulator, custom web development packages, or digital presence consulting (collectively, "the Services"), you confirm that you are at least 18 years of age (or have parental/guardian consent) and agree to be legally bound by these Terms of Use. If you do not agree, please discontinue use of the Services immediately.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>2. Scope and Description of Services</h3>
        <p>We provide a comprehensive suite of digital, media, and career solutions, including:</p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 2 }}>
          <li><b>ImageKE Photo Utilities:</b> Automated image resizing and cropping for specific portal requirements (e.g. eCitizen, KRA iTax, HELB, US/Schengen Visa), custom dimensional resizing, and a Batch Document Compressor to optimize scanned page uploads for low-bandwidth connections.</li>
          <li><b>ImageKE Video Studio:</b> Client-side aspect ratio cropping (portrait 9:16, square 1:1, widescreen 16:9), size compressors (WhatsApp under 16MB, email under 25MB), text/image branding watermarkers, MP3 audio extractors, and video frame extraction tools.</li>
          <li><b>ATS Simulator (V2):</b> A secure resume parsing utility utilizing artificial intelligence to analyze formatting safety, structural ordering, privacy markers (e.g. photos, DOB, National ID risks), STAR methodology metrics, and keyword coverage.</li>
          <li><b>HookBunker Webhook Proxy & Gateway:</b> A resilient developer-first webhook forwarding proxy designed to ingest callback events from payment gateways (Safaricom M-Pesa, Paystack, Payhero) and reliably dispatch them to configured application targets, complete with status logging, payload inspection, and auto-retry dispatching.</li>
          <li><b>Professional Career & Web Services:</b> Elite CV/resume copywriting, cover letter design, LinkedIn profile optimization, corporate web development, search engine optimization (SEO), and digital presence setup.</li>
          <li><b>Career Academy & Mentorship Program:</b> A structured learning platform offering outcomes-focused training on personal branding, LinkedIn positioning, resume writing, job search sprints, interview preparation, digital tools (e.g. Google Business Profile setup), and guest expert webinars.</li>
        </ul>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>3. Payments, Billing, and Refunds</h3>
        <p>You agree to adhere to the payment terms associated with each category of Services:</p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 2 }}>
          <li><b>Pay-Per-Download Tools:</b> Single media fixes or batch document compression downloads require a fixed payment (e.g. KSh 49 or KSh 4) processed via Paystack. Because watermarked previews are displayed prior to purchase, all sales are final and non-refundable.</li>
          <li><b>Creator Subscription Plan:</b> A monthly subscription (KSh 499/month) granting unlimited downloads for video and photo tools. Subscriptions are billed automatically until canceled by the user via the local dashboard. Canceled subscriptions remain active until the end of the billing period and are non-refundable.</li>
          <li><b>HookBunker Developer Subscription Plans:</b> Optional upgrade tiers (Team plan at KSh 3,400/month or $26/month; Business plan at KSh 11,500/month or $89/month) processed and auto-renewed securely via Paystack. Subscription renewals that fail or fail to clear will result in immediate down-grading to the Free Tier. When downgraded, active workspace slots are capped at 1; any excess projects are automatically suspended or deactivated in the developer dashboard. Suspended projects do not process callbacks, and we hold no responsibility or liability for missed gateway callbacks.</li>
          <li><b>Academy Cohort and Membership Fees:</b> Accelerator cohort registrations (one-time fee of KSh 10,000) and monthly membership subscriptions (KSh 1,500/month) are processed securely via Paystack. Membership access is billed automatically until canceled. Active memberships that fail to renew successfully will result in immediate suspension of portal access and revocation of membership privileges. Once paid, cohort fees and subscription charges are non-refundable.</li>
          <li><b>Professional Consulting packages:</b> Custom branding, web development, and resume copywriting packages are subject to project-specific proposal pricing. Payments are due prior to commencement or at agreed milestones. Once project discovery or draft composition has started, fees are non-refundable.</li>
        </ul>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>4. Intellectual Property and Content Submissions</h3>
        <p>You retain ownership of any media, text, CV drafts, or project information you upload. You warrant that you hold full legal rights and licensing to any materials submitted. All proprietary code, software architectures, website copy, algorithms, and design tokens of the Site and the ImageKE tools are the sole intellectual property of Duncan Makoyo. Completed custom website builds, final CV drafts, and branding assets become your property only upon full payment settlement.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>5. Disclaimer of Warranties and Guarantees</h3>
        <p>THE SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. DUNCAN MAKOYO AND THE SITE OPERATORS MAKE NO WARRANTIES, EXPRESS OR IMPLIED, AND EXPRESSLY DISCLAIM ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE, WARRANT, OR PROMISE ANY SPECIFIC CAREER, BUSINESS, OR TECHNICAL OUTCOME, INCLUDING BUT NOT LIMITED TO:</p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 2 }}>
          <li>Securing job interviews, callbacks, employment offers, salary raises, career placements, or business growth from using the ATS Simulator, professional CV services, or joining the Career Academy. We prepare candidates but do not guarantee success or employment.</li>
          <li>Increases in web traffic, business leads, sales conversions, search engine rankings, or digital revenue from custom web development and SEO packages.</li>
          <li>Acceptance of processed photos, videos, or documents by any third-party government portal (eCitizen, KRA), visa office, school portal, or corporate Applicant Tracking System.</li>
          <li>Continuous callback deliveries, 100% gateway uptime, or immediate forwarding of payment hooks through HookBunker; system maintenance, API timeouts, or third-party outages may disrupt log captures.</li>
        </ul>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>6. Limitation of Liability and Full Indemnification</h3>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL DUNCAN MAKOYO, THE SITE OPERATORS, ITS AGENTS, OR SERVICE PROVIDERS BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, EMPLOYMENT OPPORTUNITIES, BUSINESS DOWNTIME, TRANSACTION FAILURES, REVENUE LOSSES, OR SYSTEM FAILURES.</p>
        <p><b>YOU AGREE TO FULLY INDEMNIFY, DEFEND, AND HOLD HARMLESS DUNCAN MAKOYO AND THE OPERATORS</b> from and against any and all claims, damages, liabilities, losses, costs, or expenses (including legal fees) arising from: (i) your use or misuse of the Site, HookBunker proxy gateways, Career Academy portals, or delivered assets; (ii) any career, financial, or business outcomes resulting from our consulting, training, or mentorship; (iii) any third-party claims regarding intellectual property infringement in materials you submitted; or (iv) any service interruptions, webhook delivery failures, callback queues delays, database data pruning, or browser-processing crashes. Under no circumstances shall our cumulative liability exceed the exact amount paid by you for the specific service transaction in dispute.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>7. Governing Law and Disputes</h3>
        <p>These Terms of Use shall be governed by, construed, and enforced in accordance with the laws of the Republic of Kenya. Any legal actions or disputes arising from these Terms or the Services shall be submitted to the exclusive jurisdiction of the courts of Nairobi, Kenya.</p>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem', maxWidth: '800px' }}>
      <button
        onClick={() => setCurrentPath('services')}
        className="btn"
        style={{ background: 'none', color: 'var(--text-muted)', padding: 0, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <ArrowLeft size={18} /> Back to Home
      </button>
      <h1>Privacy Policy</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Last Updated: June 2026</p>
      <div style={{ marginTop: '2rem', lineHeight: 1.8, color: 'var(--text-muted)' }}>
        <p>This Privacy Policy describes how we collect, process, and protect your personal information when you use duncanmakoyo.com ("the Site"), our browser-native media tools (ImageKE), our developer console (HookBunker), or our consulting services.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>1. Browser-Native Processing (Zero Server Transmission)</h3>
        <p>For the ImageKE Photo and Video editing tools (including compressor, aspect cropper, watermarker, and extractors), **all rendering is conducted locally in your web browser using WebAssembly and canvas technologies**. Your uploaded photos, logo overlays, and video streams never leave your device and are never sent to our servers.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>2. Data We Collect and Process</h3>
        <p>We collect personal and professional information under the following conditions:</p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 2 }}>
          <li><b>Career Forms & Consultation:</b> When you submit service requests or sign up for CV audits, we collect your name, email, phone number, LinkedIn URL, target job fields, and uploaded CV files.</li>
          <li><b>ATS Simulator V2:</b> When you use the simulator, we temporarily process your resume data. If you upload a PDF, the file is converted to text/base64 and sent to our secure backend proxy route to be analyzed using artificial intelligence. **No resume files or personal text parsed by the simulator are ever stored on our servers.** They are held in memory solely to compile your score card and are immediately discarded.</li>
          <li><b>HookBunker Transaction Logs:</b> We temporarily collect and store transactional payload information received from payment gateways (Safaricom M-Pesa, Paystack, and Payhero) on your behalf. This parsed metadata contains payment references, transaction amounts, customer emails, and phone numbers in order to populate your developer log console. All webhook database records are stored in secure Supabase PostgreSQL database tables with strict Row-Level Security (RLS) policies to ensure absolute tenant isolation. Logs and payloads are automatically pruned from active tables based on your active plan tier (3 days for Free, 14 days for Team, 30 days for Business).</li>
          <li><b>Billing Data:</b> Email addresses and transaction references collected during Paystack checkout are processed securely. Card numbers, bank log-ins, and M-Pesa PINs are handled directly by Paystack and are never visible to or stored by us.</li>
        </ul>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>3. How We Use and Share Information</h3>
        <p>We use your information exclusively to deliver the requested Services, refine your CV drafts, host client websites, verify payments, route webhook payloads, and communicate project updates. We **never sell, share, rent, or trade your personal data, resume details, contact lists, developer transaction payloads, or media files** with third-party advertising or marketing agencies.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>4. Data Protection and Retention</h3>
        <p>We store financial transaction records for 7 years to comply with Kenyan tax accounting audits. Completed client CV drafts, SEO audit logs, and custom web source code are retained for 1 year to assist you with future revisions, after which they are permanently deleted. You can request the immediate deletion of your career files at any time by contacting us.</p>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>5. Third-Party Services</h3>
        <p>We utilize the following secure integrations to facilitate Site operations:</p>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: 2 }}>
          <li><b>Paystack:</b> Payment gateway processing and subscription billing.</li>
          <li><b>Safaricom M-Pesa & Payhero:</b> Ingesting transaction webhook notification callbacks.</li>
          <li><b>Render:</b> Hosting infrastructure and request proxy routing.</li>
          <li><b>Secure AI Parsing Engine:</b> Processing resume analysis requests securely via a private server-side connection (data is not used to train models).</li>
        </ul>

        <h3 style={{ color: 'var(--text)', marginTop: '2rem', marginBottom: '0.5rem' }}>6. Legal Compliance</h3>
        <p>This Privacy Policy is designed to comply with the Data Protection Act of the Republic of Kenya. By using the Services, you consent to our practices as outlined herein.</p>
      </div>
    </div>
  );


  // ── Video Helpers ─────────────────────────────────────────────────────────
  const ensureFFmpegLoaded = async () => {
    if (ffmpegInstance) return ffmpegInstance;
    setFfmpegLoading(true);
    setFfmpegLoadProgress(10);
    try {
      const ffmpeg = await loadFFmpeg(
        (progress) => {
          setFfmpegLoadProgress(progress);
          setProcessingMsg(`Loading Video Engine… ${progress}%`);
        },
        (msg) => console.log(msg)
      );
      setFfmpegInstance(ffmpeg);
      setFfmpegLoading(false);
      return ffmpeg;
    } catch (err) {
      setFfmpegLoading(false);
      setError(err.message || 'Failed to initialize video engine.');
      throw err;
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setProcessedVideoBlob(null);
    setProcessedVideoUrl('');
    setPaidVideoTools({});
    setError('');
  };

  const handleVideoMetadata = (e) => {
    const video = e.target;
    setVideoFileMetadata({
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight
    });
  };

  const getVideoCropStyles = () => {
    const { width, height } = videoFileMetadata;
    if (!width || !height) return { width: '100%', left: '0%' };
    
    const videoAspect = width / height;
    let targetRatioVal = 16/9;
    if (targetAspect === '9:16') targetRatioVal = 9/16;
    if (targetAspect === '1:1') targetRatioVal = 1;
    
    if (videoAspect > targetRatioVal) {
      const overlayWidthPercent = (targetRatioVal / videoAspect) * 100;
      const maxLeftPercent = 100 - overlayWidthPercent;
      const leftPercent = maxLeftPercent * (cropOffsetPercent / 100);
      return {
        width: `${overlayWidthPercent}%`,
        left: `${leftPercent}%`,
        top: 0,
        height: '100%',
      };
    } else {
      const overlayHeightPercent = (videoAspect / targetRatioVal) * 100;
      const topPercent = (100 - overlayHeightPercent) / 2;
      return {
        width: '100%',
        left: '0%',
        top: `${topPercent}%`,
        height: `${overlayHeightPercent}%`,
      };
    }
  };

  const downloadFramesAsZip = async (framesList) => {
    if (framesList.length === 0) return;
    setIsProcessing(true);
    setProcessingMsg('Compiling ZIP archive client-side…');
    try {
      const zip = new JSZip();
      for (let index = 0; index < framesList.length; index++) {
        const f = framesList[index];
        zip.file(f.name, f.blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const cleanName = `${videoFile.name.replace(/\.[^/.]+$/, "")}_frames.zip`;
      triggerDownload(content, cleanName);
    } catch (err) {
      console.error(err);
      setError('Failed to bundle frames. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  };

  const handleProcessVideo = async () => {
    setIsProcessing(true);
    setProcessingMsg('Initializing video engine… 0%');
    setError('');
    try {
      const ffmpeg = await ensureFFmpegLoaded();
      setProcessingMsg('Processing video client-side (FFmpeg.wasm)…');
      let blob;

      if (activeVideoTool === 'aspect') {
        const { width, height } = videoFileMetadata;
        let cropWidth, cropHeight, cropX, cropY;
        const videoAspect = width / height;
        let targetRatioVal = 16/9;
        if (targetAspect === '9:16') targetRatioVal = 9/16;
        if (targetAspect === '1:1') targetRatioVal = 1;

        if (videoAspect > targetRatioVal) {
          cropHeight = height;
          cropWidth = Math.round(height * targetRatioVal);
          cropX = Math.round((width - cropWidth) * (cropOffsetPercent / 100));
          cropY = 0;
        } else {
          cropWidth = width;
          cropHeight = Math.round(width / targetRatioVal);
          cropX = 0;
          cropY = Math.round((height - cropHeight) / 2);
        }
        blob = await changeVideoAspectRatio(ffmpeg, videoFile, targetAspect, { x: cropX, y: cropY, width: cropWidth, height: cropHeight }, false);
        const url = URL.createObjectURL(blob);
        setProcessedVideoBlob(blob);
        setProcessedVideoUrl(url);
      } else if (activeVideoTool === 'compress') {
        blob = await compressVideo(ffmpeg, videoFile, videoFileMetadata.duration, targetCompressMB, false);
        const url = URL.createObjectURL(blob);
        setProcessedVideoBlob(blob);
        setProcessedVideoUrl(url);
      } else if (activeVideoTool === 'watermark') {
        const brandSource = watermarkType === 'image' ? watermarkImageFile : watermarkText;
        if (watermarkType === 'image' && !watermarkImageFile) {
          throw new Error('Please select a PNG logo image first.');
        }
        blob = await addVideoWatermark(ffmpeg, videoFile, brandSource, watermarkType, watermarkPosition, false);
        const url = URL.createObjectURL(blob);
        setProcessedVideoBlob(blob);
        setProcessedVideoUrl(url);
      } else if (activeVideoTool === 'audio') {
        blob = await extractAudio(ffmpeg, videoFile);
        const url = URL.createObjectURL(blob);
        setProcessedVideoBlob(blob);
        setProcessedVideoUrl(url);
      } else if (activeVideoTool === 'frames') {
        const frames = await extractVideoFrames(
          ffmpeg,
          videoFile,
          videoFileMetadata.duration,
          frameExtractMode,
          frameExtractMode === 'fps' ? frameExtractFpsRate : frameExtractCount,
          false
        );
        setExtractedFrames(frames);
        setProcessedVideoBlob(new Blob([], { type: 'application/zip' }));
        setProcessedVideoUrl('extracted_frames');
        // Auto-download all frames
        await downloadFramesAsZip(frames);
        return; // frames are already downloaded
      }

      // Auto-download for all non-frames tools
      if (blob && activeVideoTool !== 'frames') {
        const ext = activeVideoTool === 'audio' ? 'mp3' : 'mp4';
        const cleanName = `${videoFile.name.replace(/\.[^/.]+$/, "")}_edited.${ext}`;
        triggerDownload(blob, cleanName);
      }
    } catch (err) {
      console.error(err);
      setError('Video processing failed. Please check your video length and format, then try again.');
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  };

  const handleDownloadVideo = () => {
    if (!processedVideoBlob) return;
    if (activeVideoTool === 'frames') {
      downloadFramesAsZip(extractedFrames);
      return;
    }
    const ext = activeVideoTool === 'audio' ? 'mp3' : 'mp4';
    const filename = `${videoFile.name.replace(/\.[^/.]+$/, "")}_edited.${ext}`;
    triggerDownload(processedVideoBlob, filename);
  };

  const handleWatermarkImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWatermarkImageFile(file);
    setWatermarkImagePreview(URL.createObjectURL(file));
  };

  const resetVideoState = () => {
    setVideoFile(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl('');
    setProcessedVideoBlob(null);
    if (processedVideoUrl && processedVideoUrl !== 'extracted_frames') {
      URL.revokeObjectURL(processedVideoUrl);
    }
    setProcessedVideoUrl('');
    setExtractedFrames([]);
    setCropOffsetPercent(50);
    setWatermarkImageFile(null);
    if (watermarkImagePreview) URL.revokeObjectURL(watermarkImagePreview);
    setWatermarkImagePreview('');
    setError('');
  };

  const renderVideoDashboard = () => (
    <div>
      <section className="hero" style={{ background: 'linear-gradient(135deg, #0D1B4D 0%, #1238E8 50%, #2B5BFF 100%)' }}>
        <div className="container">
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '20px', padding: '4px 14px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1.25rem', color: 'rgba(255,255,255,0.9)' }}>Browser-Powered · No Upload · No Desktop App</div>
          <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#fff' }}>
            [vid] Your Video Studio, Right in Your Browser
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.05rem', maxWidth: '620px', margin: '0 auto', lineHeight: 1.7 }}>
            You shot a great video. But it's 45MB — WhatsApp won't send it. Or it's 16:9 and TikTok needs 9:16. Or you recorded a podcast and just need the audio. You shouldn't need Premiere Pro or CapCut for a 30-second fix.
            <br /><br />
            <strong style={{ color: '#fff' }}>ImageKE Video Studio does it in your browser.</strong> No uploads. No waiting. Your video never leaves your device.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
            {['[crop] TikTok 9:16 Crop', '[zip] WhatsApp Compress', '[mp3] MP3 Extractor', '[frames] Frame Extractor', '[label] Brand Watermark'].map(tag => (
              <span key={tag} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '20px', padding: '5px 14px', fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="container">
        <h2 style={{ marginBottom: '0.5rem' }}>Choose Your Video Tool</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Click a tool to get started. Your video is processed locally — nothing is uploaded.</p>
        <div className="grid">
          {[
            {
              id: 'aspect',
              title: 'Crop & Aspect Ratio',
              badge: 'TikTok / Reels',
              desc: 'Shot in 16:9 but need 9:16 for TikTok or Reels? Crop it to portrait with a visual focus selector — no guesswork.',
              icon: <Crop size={24} style={{ color: 'var(--primary)' }} />
            },
            {
              id: 'compress',
              title: 'WhatsApp Compressor',
              badge: 'Under 16MB',
              desc: 'Your video is too large to send. Compress it to under 16MB (WhatsApp) or 25MB (Gmail) without butchering the quality.',
              icon: <FileVideo size={24} style={{ color: 'var(--primary)' }} />
            },
            {
              id: 'watermark',
              title: 'Brand Watermarker',
              badge: 'Logo / Text',
              desc: 'Burn your company logo or brand text onto the video permanently. Ideal for content creators protecting their work.',
              icon: <Layers size={24} style={{ color: 'var(--primary)' }} />
            },
            {
              id: 'audio',
              title: 'Audio Extractor (MP3)',
              badge: 'Podcast / Music',
              desc: 'Pull the audio track from any video and save it as a clean MP3. Perfect for podcast clips, meeting recordings, or music.',
              icon: <Music size={24} style={{ color: 'var(--primary)' }} />
            },
            {
              id: 'frames',
              title: 'Video Frame Extractor',
              badge: 'Storyboard / AI Training',
              desc: 'Break your video into individual PNG frames at any rate — 1 per second, 2 per second, or a fixed total count. Downloads as a ZIP.',
              icon: <Eye size={24} style={{ color: 'var(--primary)' }} />
            }
          ].map((tool) => (
            <div
              key={tool.id}
              className="card"
              onClick={() => setActiveVideoTool(tool.id)}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid var(--primary)', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                {tool.icon}
                <div>
                  <h3 style={{ margin: 0 }}>{tool.title}</h3>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '10px', padding: '1px 8px', display: 'inline-block', marginTop: '2px' }}>{tool.badge}</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Video Editor UI ────────────────────────────────────────────────────────
  const renderVideoEditor = () => {
    const isProcessed = !!processedVideoUrl;
    
    return (
      <div className="container" style={{ paddingTop: '3rem', paddingBottom: '4rem' }}>
        <button
          onClick={() => { resetVideoState(); setActiveVideoTool(null); }}
          className="btn"
          style={{ background: 'none', color: 'var(--text-muted)', padding: 0, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={18} /> Back to dashboard
        </button>

        <h1 style={{ marginBottom: '0.5rem', textTransform: 'capitalize' }}>
          {activeVideoTool === 'aspect' && '[crop] Crop & Aspect Ratio Converter'}
          {activeVideoTool === 'compress' && '[zip] WhatsApp / Email Compressor'}
          {activeVideoTool === 'watermark' && '[label] Brand Watermarker'}
          {activeVideoTool === 'audio' && '[mp3] Audio Extractor (MP3)'}
          {activeVideoTool === 'frames' && '[frames] Video Frame Extractor'}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          {activeVideoTool === 'aspect' && 'Reformat 16:9 widescreen to 9:16 portrait (TikTok/Reels) or 1:1 square. Visual crop box shows exactly what will be cut.'}
          {activeVideoTool === 'compress' && 'Shrink large MP4s to fit under WhatsApp (16MB), Gmail (25MB), or any custom limit — all in your browser, no upload required.'}
          {activeVideoTool === 'watermark' && 'Burn your brand logo (PNG) or custom text permanently into the video. Choose your corner or center position.'}
          {activeVideoTool === 'audio' && 'Strip the video stream entirely and save just the audio as a high-quality MP3. Ideal for podcast clips, meeting recordings, or music.'}
          {activeVideoTool === 'frames' && 'Slice your video into individual PNG image frames. Set your frame rate or a fixed total count. All frames download as a single ZIP archive.'}
        </p>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {/* Upload State */}
        {!videoUrl ? (
          <div className="upload-zone" style={{ background: 'var(--dm-bg)', border: '2px dashed var(--dm-border)' }}>
            <input
              type="file"
              id="videoUploadInput"
              hidden
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
              onChange={handleVideoUpload}
            />
            <label htmlFor="videoUploadInput" style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{
                background: 'var(--primary-light)', width: '64px', height: '64px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyIntent: 'center',
                margin: '0 auto 1.5rem', color: 'var(--primary)',
              }}>
                <Upload size={32} />
              </div>
              <h3>Select Video File</h3>
              <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem' }}>
                Supports MP4, WebM, MOV, MKV files. Recommended: max 50MB for fast speed.
              </p>
              <span className="btn" style={{ background: 'var(--primary)' }}>Select Video</span>
            </label>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="batch-layout">
            
            {/* Left Column: Video Preview and Visual Tools */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <h3 style={{ alignSelf: 'flex-start' }}>Original Video</h3>
              <div style={{
                position: 'relative',
                display: 'inline-block',
                maxWidth: '100%',
                background: '#000',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)',
              }}>
                <video
                  src={videoUrl}
                  controls
                  onLoadedMetadata={handleVideoMetadata}
                  style={{ display: 'block', maxHeight: '380px', width: 'auto', maxWidth: '100%' }}
                />
                
                {/* Visual Crop Overlay (for Aspect Ratio) */}
                {activeVideoTool === 'aspect' && !isProcessed && (
                  <div style={{
                    position: 'absolute',
                    border: '2px dashed var(--primary)',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                    pointerEvents: 'none',
                    transition: 'all 0.1s ease',
                    ...getVideoCropStyles()
                  }} />
                )}

                {/* Simulated Watermark Preview (for Watermarking) */}
                {activeVideoTool === 'watermark' && !isProcessed && (
                  <div style={{
                    position: 'absolute',
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    pointerEvents: 'none',
                    fontWeight: 600,
                    // Map placement
                    top: watermarkPosition.startsWith('top') ? '16px' : watermarkPosition === 'center' ? '50%' : 'auto',
                    bottom: watermarkPosition.startsWith('bottom') ? '16px' : 'auto',
                    left: watermarkPosition.endsWith('left') ? '16px' : watermarkPosition === 'center' ? '50%' : 'auto',
                    right: watermarkPosition.endsWith('right') ? '16px' : 'auto',
                    transform: watermarkPosition === 'center' ? 'translate(-50%, -50%)' : 'none',
                  }}>
                    {watermarkType === 'text' ? watermarkText : (watermarkImagePreview ? <img src={watermarkImagePreview} style={{ maxHeight: '30px', maxWidth: '80px', display: 'block' }} alt="Preview" /> : 'Logo')}
                  </div>
                )}
              </div>
              
              <div style={{ alignSelf: 'flex-start', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>Dimensions: <b>{videoFileMetadata.width}×{videoFileMetadata.height}px</b></span> &bull;&nbsp;
                <span>Duration: <b>{Math.round(videoFileMetadata.duration || 0)}s</b></span> &bull;&nbsp;
                <span>Size: <b>{formatSize(videoFile.size)}</b></span>
              </div>
            </div>

            {/* Right Column: Settings & Triggers */}
            <div style={{
              background: 'var(--card-bg)',
              padding: '2rem',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                ⚙️ Configuration
              </h3>

              {/* 1. Aspect Ratio Settings */}
              {activeVideoTool === 'aspect' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Target Aspect Ratio
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { label: 'TikTok (9:16)', value: '9:16' },
                        { label: 'Square (1:1)', value: '1:1' },
                        { label: 'Wide (16:9)', value: '16:9' },
                      ].map((item) => (
                        <button
                          key={item.value}
                          onClick={() => setTargetAspect(item.value)}
                          className="btn"
                          style={{
                            flex: 1,
                            padding: '0.5rem 0.25rem',
                            fontSize: '0.8rem',
                            background: targetAspect === item.value ? 'var(--primary)' : 'transparent',
                            color: targetAspect === item.value ? '#ffffff' : 'var(--primary)',
                            border: '1px solid var(--primary)',
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Focus Slider */}
                  {(targetAspect === '9:16' || targetAspect === '1:1') && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Focus Area Position: <span style={{ color: 'var(--primary)' }}>{cropOffsetPercent}%</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={cropOffsetPercent}
                        onChange={(e) => setCropOffsetPercent(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                        Drag the slider to adjust the horizontal crop window. Bounding box overlay updates in real-time.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Compressor Settings */}
              {activeVideoTool === 'compress' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Target Compression Size
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { label: 'WhatsApp (16 MB)', value: 16 },
                        { label: 'Email (25 MB)', value: 25 },
                        { label: 'Low Bandwidth (8 MB)', value: 8 },
                      ].map((item) => (
                        <button
                          key={item.value}
                          onClick={() => setTargetCompressMB(item.value)}
                          className="btn"
                          style={{
                            flex: 1,
                            padding: '0.5rem 0.25rem',
                            fontSize: '0.8rem',
                            background: targetCompressMB === item.value ? 'var(--primary)' : 'transparent',
                            color: targetCompressMB === item.value ? '#ffffff' : 'var(--primary)',
                            border: '1px solid var(--primary)',
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Custom Size limit (MB)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={targetCompressMB}
                      onChange={(e) => setTargetCompressMB(parseFloat(e.target.value) || 16)}
                      style={{
                        width: '100%', padding: '0.6rem 0.8rem',
                        borderRadius: '8px', border: '1px solid var(--border)',
                        fontSize: '0.95rem', outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 3. Watermarker Settings */}
              {activeVideoTool === 'watermark' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Watermark Type
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { label: 'Text Brand', value: 'text' },
                        { label: 'Image Logo', value: 'image' },
                      ].map((item) => (
                        <button
                          key={item.value}
                          onClick={() => setWatermarkType(item.value)}
                          className="btn"
                          style={{
                            flex: 1,
                            padding: '0.5rem 0.25rem',
                            fontSize: '0.8rem',
                            background: watermarkType === item.value ? 'var(--primary)' : 'transparent',
                            color: watermarkType === item.value ? '#ffffff' : 'var(--primary)',
                            border: '1px solid var(--primary)',
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {watermarkType === 'text' ? (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Brand Text
                      </label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        style={{
                          width: '100%', padding: '0.6rem 0.8rem',
                          borderRadius: '8px', border: '1px solid var(--border)',
                          fontSize: '0.95rem', outline: 'none',
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Select PNG Logo
                      </label>
                      <input
                        type="file"
                        accept="image/png"
                        onChange={handleWatermarkImageUpload}
                        style={{ fontSize: '0.85rem' }}
                      />
                      {watermarkImagePreview && (
                        <img src={watermarkImagePreview} style={{ maxHeight: '40px', marginTop: '0.5rem', display: 'block', border: '1px solid var(--border)' }} alt="Logo" />
                      )}
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Position
                    </label>
                    <select
                      value={watermarkPosition}
                      onChange={(e) => setWatermarkPosition(e.target.value)}
                      style={{
                        width: '100%', padding: '0.6rem 0.8rem',
                        borderRadius: '8px', border: '1px solid var(--border)',
                        fontSize: '0.95rem', outline: 'none', background: '#fff',
                      }}
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="center">Center</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 4. Audio Settings */}
              {activeVideoTool === 'audio' && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  This will extract the audio track as an MP3 file. The video stream is completely discarded, reducing file size by up to 90%. The output is a clean, full-duration MP3.
                </p>
              )}

              {/* 5. Frame Extractor Settings */}
              {activeVideoTool === 'frames' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Extraction Mode
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { label: '📷 Rate (FPS)', value: 'fps' },
                        { label: '🔢 Fixed Count', value: 'count' },
                      ].map((item) => (
                        <button
                          key={item.value}
                          onClick={() => setFrameExtractMode(item.value)}
                          className="btn"
                          style={{
                            flex: 1,
                            padding: '0.6rem 0.25rem',
                            fontSize: '0.85rem',
                            background: frameExtractMode === item.value ? 'var(--primary)' : 'transparent',
                            color: frameExtractMode === item.value ? '#ffffff' : 'var(--primary)',
                            border: '1px solid var(--primary)',
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {frameExtractMode === 'fps' ? (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Extract one frame every <span style={{ color: 'var(--primary)' }}>{frameExtractFpsRate} second{frameExtractFpsRate !== 1 ? 's' : ''}</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={frameExtractFpsRate}
                        onChange={(e) => setFrameExtractFpsRate(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                        At {frameExtractFpsRate}s intervals, a {videoFileMetadata.duration ? Math.round(videoFileMetadata.duration / frameExtractFpsRate) : '?'}-frame ZIP will be generated.
                      </span>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Total frames to extract: <span style={{ color: 'var(--primary)' }}>{frameExtractCount}</span>
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="5"
                        value={frameExtractCount}
                        onChange={(e) => setFrameExtractCount(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                        Frames will be distributed evenly across the full video duration.
                      </span>
                    </div>
                  )}
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '8px', lineHeight: 1.5 }}>
                    [info] <b>Use case:</b> AI training datasets, storyboard generation, thumbnail selection, video analysis.
                  </p>
                </div>
              )}

              {/* Process Trigger Button */}
              {!isProcessed && (
                <button
                  onClick={handleProcessVideo}
                  className="btn"
                  style={{
                    background: 'var(--primary)',
                    boxShadow: '0 4px 14px rgba(18, 56, 232, 0.25)',
                    padding: '0.875rem 2rem',
                    fontWeight: 700,
                  }}
                >
                  [run] Render Preview
                </button>
              )}

              {/* Output & Download */}
              {isProcessed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <CheckCircle size={18} style={{ color: 'var(--success)' }} /> Processing Complete
                  </h3>

                  {/* Frame extractor output */}
                  {activeVideoTool === 'frames' && processedVideoUrl === 'extracted_frames' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        <b>{extractedFrames.length} frames</b> extracted and downloaded as ZIP.
                      </p>
                      {/* Frame thumbnails grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '6px' }}>
                        {extractedFrames.map((frame, idx) => (
                          <div key={idx} style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', background: '#000', aspectRatio: '16/9' }}>
                            <img
                              src={URL.createObjectURL(frame.blob)}
                              alt={`Frame ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => downloadFramesAsZip(extractedFrames)}
                        className="btn"
                        style={{ background: 'var(--success)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', padding: '0.875rem 2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
                      >
                        <Download size={18} /> Download All {extractedFrames.length} Frames as ZIP
                      </button>
                    </div>
                  ) : (
                    // Standard video/audio output
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      {activeVideoTool === 'audio' ? (
                        <audio src={processedVideoUrl} controls style={{ width: '100%' }} />
                      ) : (
                        <video src={processedVideoUrl} controls style={{ width: '100%', borderRadius: '8px', maxHeight: '200px', background: '#000' }} />
                      )}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Output size: <b>{formatSize(processedVideoBlob?.size)}</b>
                      </div>
                      <button
                        onClick={handleDownloadVideo}
                        className="btn"
                        style={{ background: 'var(--success)', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', padding: '0.875rem 2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', width: '100%' }}
                      >
                        <Download size={18} /> Download {activeVideoTool === 'audio' ? 'MP3' : 'Edited Video'}
                      </button>
                    </div>
                  )}

                  <button
                    onClick={resetVideoState}
                    className="btn"
                    style={{ background: 'none', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    ↺ Process Another Video
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVideoTools = () => {
    if (!activeVideoTool) return renderVideoDashboard();
    return renderVideoEditor();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ROOT
  // ─────────────────────────────────────────────────────────────────────────────
  // ─── Navigate to Tools from Services Page ────────────────────────────────────
  const navigateToPath = (path) => {
    if (path === 'services') window.location.hash = '#/';
    else if (path === 'ats') window.location.hash = '#/ats';
    else if (path === 'home') window.location.hash = '#/photo-tools';
    else if (path === 'batch') window.location.hash = '#/batch';
    else if (path === 'custom') window.location.hash = '#/custom';
    else if (path === 'terms') window.location.hash = '#/terms';
    else if (path === 'privacy') window.location.hash = '#/privacy';
    
    // Academy paths navigation
    else if (path === 'academy') window.location.hash = '#/academy';
    else if (path === 'academy-dashboard') window.location.hash = '#/academy/dashboard';

    // Workshop path navigation
    else if (path === 'workshop') window.location.hash = '#/workshop';
    else if (path === 'workshop-join') window.location.hash = '#/workshop/join';

    // HookBunker paths navigation
    else if (path === 'hookbunker') window.location.hash = '#/hookbunker';
    else if (path === 'hookbunker-docs') window.location.hash = '#/hookbunker/docs';
    else if (path === 'hookbunker-dashboard') window.location.hash = '#/hookbunker/dashboard';
    else if (path === 'hookbunker-terms') window.location.hash = '#/terms';
    else if (path === 'hookbunker-privacy') window.location.hash = '#/privacy';
    
    else window.location.hash = `#/${path}`;
  };

  const handleNavigateToTools = () => {
    window.location.hash = '#/photo-tools';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ── Services Landing Page (no ImageKE header shown) ── */}
      {currentPath === 'services' && (
        <ServicesPage
          onNavigateToTools={handleNavigateToTools}
          onNavigateToPath={navigateToPath}
        />
      )}

      {/* ── ATS Simulator (standalone page) ── */}
      {currentPath === 'ats' && (
        <ATSSimulator onBack={() => window.location.hash = '#/'} />
      )}

      {/* ── HookBunker Landing Page ── */}
      {currentPath === 'hookbunker-landing' && (
        <HookBunkerLanding onNavigate={navigateToPath} />
      )}

      {/* ── HookBunker Docs Page ── */}
      {currentPath === 'hookbunker-docs' && (
        <HookBunkerDocs onNavigate={navigateToPath} />
      )}

      {/* ── HookBunker Dashboard ── */}
      {currentPath === 'hookbunker-dashboard' && (
        <HookBunkerDashboard onNavigate={navigateToPath} />
      )}

      {/* ── Academy Auth View ── */}
      {currentPath === 'academy-auth' && (
        <AcademyAuth onAuthSuccess={() => navigateToPath('academy-dashboard')} />
      )}

      {/* ── Academy Dashboard View ── */}
      {currentPath === 'academy-dashboard' && (
        <AcademyDashboard onNavigate={navigateToPath} />
      )}

      {/* ── Workshop Landing View ── */}
      {currentPath === 'workshop' && (
        <WorkshopLanding onNavigate={navigateToPath} />
      )}

      {/* ── Workshop Join Gateway ── */}
      {currentPath === 'workshop-join' && (
        <WorkshopJoin />
      )}

      {currentPath === 'rider-login' && <RiderLogin />}
      {currentPath === 'rider-dashboard' && <RiderDashboard />}

      {/* ── Legal pages (standalone, minimal header) ── */}
      {(currentPath === 'terms' || currentPath === 'privacy') && (
        <>
          <header className="app-header">
            <div
              className="app-logo"
              onClick={() => window.location.hash = '#/'}
              role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && (window.location.hash = '#/')}
              aria-label="Back to home"
            >
              <span className="app-logo-text">[KE] ImageKE <span className="app-logo-badge">PRO</span></span>
            </div>
          </header>
          <div style={{ flex: 1 }}>
            {currentPath === 'terms' && renderTerms()}
            {currentPath === 'privacy' && renderPrivacy()}
          </div>
          <footer style={{ padding: '2rem 0', textAlign: 'center', borderTop: '1px solid var(--border)', background: 'var(--card-bg)' }}>
            <div className="container">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>&copy; {new Date().getFullYear()} Duncan Makoyo. All rights reserved.</p>
            </div>
          </footer>
        </>
      )}

      {/* ── ImageKE Photo & Video Tools ── */}
      {currentPath !== 'services' && 
       currentPath !== 'terms' && 
       currentPath !== 'privacy' && 
       currentPath !== 'ats' && 
       currentPath !== 'workshop' && 
       currentPath !== 'workshop-join' && 
       !currentPath.startsWith('hookbunker') && 
       !currentPath.startsWith('academy') && 
       !currentPath.startsWith('rider') && (
        <>
          {/* Sticky Header */}
          <header className="app-header">
            <div
              className="app-logo"
              onClick={() => { reset(); resetVideoState(); setActiveVideoTool(null); window.location.hash = '#/'; }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && (reset(), resetVideoState(), setActiveVideoTool(null), window.location.hash = '#/')}
              aria-label="Home"
            >
              <span className="app-logo-text">
                [KE] ImageKE <span className="app-logo-badge">PRO</span>
              </span>
            </div>
            <nav className="app-nav" aria-label="Main navigation">
              <button
                className={`app-nav-btn${currentTab === 'images' ? ' active-images' : ''}`}
                onClick={() => { reset(); resetVideoState(); setActiveVideoTool(null); window.location.hash = '#/photo-tools'; }}
                aria-current={currentTab === 'images' ? 'page' : undefined}
              >
                [img] Photo Tools
              </button>
              <button
                className={`app-nav-btn${currentTab === 'videos' ? ' active-videos' : ''}`}
                onClick={() => { reset(); resetVideoState(); setActiveVideoTool(null); window.location.hash = '#/video-tools'; }}
                aria-current={currentTab === 'videos' ? 'page' : undefined}
              >
                [vid] Video Tools
              </button>
            </nav>
            <button
              onClick={() => { reset(); resetVideoState(); setActiveVideoTool(null); window.location.hash = '#/'; }}
              style={{ background: 'none', border: 'none', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'inherit' }}
            >
              ← Back to Services
            </button>
          </header>

           <div style={{ flex: 1 }}>
            {isProcessing && <ProcessingOverlay message={processingMsg} />}
            {currentTab === 'images' ? (

              <>
                {currentPath === 'home' && renderHome()}
                {currentPath === 'batch' && renderBatchPage()}
                {currentPath === 'custom' && renderCustomPage()}
                {currentPath === 'processor' && renderProcessor()}
              </>
            ) : (
              renderVideoTools()
            )}
          </div>

          <footer style={{ padding: '2rem 0', textAlign: 'center', borderTop: '1px solid var(--border)', background: 'var(--card-bg)' }}>
            <div className="container">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>&copy; {new Date().getFullYear()} Duncan Makoyo. All rights reserved.</p>
              <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                <button onClick={() => window.location.hash = '#/terms'} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Terms of Use</button>
                <button onClick={() => window.location.hash = '#/rider-login'} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Rider Portal</button>
                <button onClick={() => window.location.hash = '#/privacy'} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Privacy Policy</button>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
