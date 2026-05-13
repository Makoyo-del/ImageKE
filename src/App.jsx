import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, CheckCircle, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { PRESETS, processImage } from './utils/imageProcessor';
import axios from 'axios';

// ─── Environment Config ────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

// Pricing (in KES) — matches server-side expectation
const PRICE_KES = 49;

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

// ─── Email Modal Component ─────────────────────────────────────────────────────
function EmailModal({ onSubmit, onCancel }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    onSubmit(email.trim().toLowerCase());
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '2rem',
        width: '100%', maxWidth: '400px', margin: '1rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Enter your email</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Paystack uses this to send your payment receipt.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="you@example.com"
            style={{
              width: '100%', padding: '0.75rem 1rem',
              border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
              borderRadius: '8px', fontSize: '1rem',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'transparent',
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{ flex: 1 }}
            >
              Continue to Pay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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

// ─── Main App ──────────────────────────────────────────────────────────────────
function App() {
  // 'home' | 'processor' | 'custom'
  const [currentPath, setCurrentPath] = useState('home');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customSize, setCustomSize] = useState({
    name: 'Custom Size',
    label: 'Your defined dimensions',
    width: 600,
    height: 600,
    maxSizeKB: 100,
  });

  // We keep originalFile in a ref so it's always fresh inside async callbacks
  // without needing to be in the dependency array (avoids stale closure bugs)
  const originalFileRef = useRef(null);

  const [processedBlob, setProcessedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [error, setError] = useState('');

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
    setCurrentPath('home');
    setIsPaid(false);
    setError('');
  };

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
    setIsPaid(false);
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
      setError(err.message || 'Failed to process image. Try a different photo.');
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  }, [currentPath, customSize, selectedPreset, previewUrl]);

  // ── Payment Flow ───────────────────────────────────────────────────────────
  const initiatePayment = async (email) => {
    setShowEmailModal(false);
    setIsPaying(true);
    setError('');

    if (!PAYSTACK_PUBLIC_KEY) {
      setError('Payment system is not configured. Please contact support.');
      setIsPaying(false);
      return;
    }

    if (!window.PaystackPop) {
      setError('Payment gateway failed to load. Please refresh the page and try again.');
      setIsPaying(false);
      return;
    }

    try {
      // Step 1: Get a reference from the backend
      const initRes = await axios.post(`${API_URL}/api/initialize-payment`, {
        email,
        amount: PRICE_KES, // Server converts KES → kobo
        metadata: { preset: getActivePreset().name },
      });

      if (!initRes.data?.status || !initRes.data?.data?.reference) {
        throw new Error('Invalid response from payment server.');
      }

      const { reference } = initRes.data.data;

      // Step 2: Open Paystack popup
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email,
        amount: PRICE_KES * 100, // Paystack popup expects kobo
        currency: 'KES',
        ref: reference,
        callback: async (paystackResponse) => {
          // Step 3: Verify with our backend
          try {
            setIsProcessing(true);
            setProcessingMsg('Verifying payment…');
            const verifyRes = await axios.get(
              `${API_URL}/api/verify-payment/${paystackResponse.reference}`
            );
            if (verifyRes.data?.data?.status === 'success') {
              setIsPaid(true);
            } else {
              setError('Payment was not confirmed. Please contact support if you were charged.');
            }
          } catch (err) {
            setError(
              err.response?.data?.error ||
              'Payment verification failed. Contact support with your reference: ' + paystackResponse.reference
            );
          } finally {
            setIsProcessing(false);
            setProcessingMsg('');
          }
        },
        onClose: () => {
          setIsPaying(false);
        },
      });

      handler.openIframe();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Could not start payment.';
      setError(msg);
      setIsPaying(false);
    }
  };

  // ── Download ───────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!isPaid) {
      setShowEmailModal(true);
      return;
    }

    const preset = getActivePreset();
    const file = originalFileRef.current;
    if (!file) {
      setError('Original photo is missing. Please upload again.');
      return;
    }

    setIsProcessing(true);
    setProcessingMsg('Generating clean photo…');
    setError('');

    try {
      const cleanBlob = await processImage(file, preset, false); // no watermark
      const filename = `${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_imageke.jpg`;
      triggerDownload(cleanBlob, filename);
    } catch (err) {
      console.error('[download]', err);
      setError(err.message || 'Failed to generate clean photo. Please try again.');
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
      <section className="hero">
        <div className="container">
          <h1>Stop Getting Rejected</h1>
          <p>
            Instantly resize and compress your passport photo for eCitizen, Visa,
            and Government portals in Kenya. Done in seconds. No account required.
          </p>
        </div>
      </section>

      <div className="container">
        <h2 style={{ marginBottom: '1.5rem' }}>Select your destination</h2>
        <div className="grid">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <div
              key={key}
              className="card"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && (setSelectedPreset(preset), setCurrentPath('processor'))}
              onClick={() => {
                setSelectedPreset(preset);
                setCurrentPath('processor');
              }}
            >
              <h3>{preset.name}</h3>
              <p>{preset.label}</p>
              <div style={{ marginTop: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                {preset.width}×{preset.height}px &bull; Max {preset.maxSizeKB}KB
              </div>
            </div>
          ))}
        </div>

        <div style={{
          textAlign: 'center', marginTop: '4rem', padding: '2rem',
          background: '#F9FAFB', borderRadius: '12px', marginBottom: '4rem',
        }}>
          <h3>Need a custom size?</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Resize for any requirement not listed above.
          </p>
          <button
            className="btn"
            style={{ marginTop: '1rem', background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)' }}
            onClick={() => setCurrentPath('custom')}
          >
            Open Custom Resizer
          </button>
        </div>
      </div>
    </div>
  );

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
              {isPaid ? (
                <div style={{
                  position: 'absolute', top: '10px', right: '10px',
                  background: 'rgba(16, 185, 129, 0.95)', color: 'white',
                  padding: '4px 12px', borderRadius: '20px',
                  fontSize: '0.75rem', fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <CheckCircle size={14} /> Paid — ready to download
                </div>
              ) : (
                <div style={{
                  position: 'absolute', top: '10px', right: '10px',
                  background: 'rgba(0,0,0,0.6)', color: 'white',
                  padding: '4px 12px', borderRadius: '20px',
                  fontSize: '0.75rem', fontWeight: 600,
                }}>
                  Preview
                </div>
              )}
            </div>

            <div className="metadata-info" style={{ marginTop: '1rem' }}>
              <div>Dimensions: <b>{preset.width}×{preset.height}px</b></div>
              {processedBlob && (
                <div>Preview size: <b>{(processedBlob.size / 1024).toFixed(1)} KB</b></div>
              )}
            </div>

            {!isPaid && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '1rem' }}>
                The preview has a watermark. Pay <b style={{ color: 'var(--text)' }}>KES {PRICE_KES}</b> to download the clean, portal-ready version.
              </p>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="btn"
                onClick={handleDownload}
                disabled={isPaying}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', fontSize: '1rem' }}
              >
                {isPaying
                  ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Processing…</>
                  : <><Download size={18} /> {isPaid ? 'Download Clean Photo' : `Pay KES ${PRICE_KES} & Download`}</>
                }
              </button>

              {!isPaid && (
                <button
                  onClick={reset}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem' }}
                >
                  Try a different photo
                </button>
              )}
            </div>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ROOT
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {isProcessing && <ProcessingOverlay message={processingMsg} />}
      {showEmailModal && (
        <EmailModal
          onSubmit={initiatePayment}
          onCancel={() => setShowEmailModal(false)}
        />
      )}
      {currentPath === 'home' && renderHome()}
      {currentPath === 'custom' && renderCustomPage()}
      {currentPath === 'processor' && renderProcessor()}
    </>
  );
}

export default App;
