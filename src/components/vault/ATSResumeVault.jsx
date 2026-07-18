import React, { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import axios from 'axios';
import { FileText, UploadCloud, CheckCircle, ShieldAlert, Loader2, XCircle } from 'lucide-react';
import './ATSResumeVault.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

/* ─────────────────────────────────────────────────────────────────────────────
   ATS ENGINE  (same logic as ATSSimulator.jsx — no fake scores)
───────────────────────────────────────────────────────────────────────────── */
const SKILLS_DICT = [
  'JavaScript','TypeScript','Python','Java','C++','C#','PHP','Ruby','Go','Rust',
  'React','Angular','Vue','Node.js','Express','Django','Flask','Spring','Laravel',
  'SQL','MySQL','PostgreSQL','MongoDB','Redis','AWS','Azure','GCP','Docker','Kubernetes',
  'Terraform','Ansible','Jenkins','GitHub','GitLab','CI/CD','HTML','CSS','REST','GraphQL',
  'API','Microservices','DevOps','Agile','Scrum','Jira','Machine Learning','Deep Learning',
  'AI','Data Science','TensorFlow','PyTorch','Pandas','NumPy','Tableau','Power BI',
  'Excel','Word','PowerPoint','SAP','Salesforce','Accounting','Financial Analysis','Budgeting',
  'Forecasting','Auditing','Tax','IFRS','GAAP','QuickBooks','Financial Reporting','Cash Flow',
  'Project Management','PMP','Risk Management','Business Analysis','Process Improvement',
  'Customer Service','Sales','Marketing','Digital Marketing','SEO','Recruitment','Payroll',
  'Supply Chain','Logistics','Procurement','Operations Management','Six Sigma','Lean',
  'Leadership','Communication','Teamwork','Problem Solving','Critical Thinking','Time Management',
  'Negotiation','Strategic Planning','Decision Making','M-Pesa','Mobile Money','KRA','CBK',
];

const SECTIONS = {
  summary:['summary','profile','objective','professional summary','career objective','about me'],
  experience:['experience','work experience','employment','professional experience','career history'],
  education:['education','academic','qualifications','educational background','training'],
  skills:['skills','technical skills','core competencies','competencies','expertise','key skills'],
  certifications:['certifications','certificates','professional certifications','licenses'],
  achievements:['achievements','accomplishments','awards','key achievements'],
  references:['references','referees','professional references'],
};

function parseResume(rawText) {
  const text = rawText || '';
  const lower = text.toLowerCase();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(\+?[0-9]{1,4}[\s.\-]?\(?[0-9]{1,4}\)?[\s.\-]?[0-9]{3,5}[\s.\-]?[0-9]{3,5}(?:[\s.\-]?[0-9]{1,4})?)/);
  const linkedinMatch = text.match(/linkedin\.com\/(?:in|company|school)\/[a-zA-Z0-9\-_%]+/i);

  let detectedName = null;
  for (const line of lines.slice(0, 8)) {
    if (line.length > 2 && line.length < 60 && !line.includes('@') && !/^\d/.test(line)) {
      const wc = line.split(/\s+/).length;
      if (wc >= 2 && wc <= 5) { detectedName = line; break; }
    }
  }

  const detectedSections = {};
  for (const [sec, kws] of Object.entries(SECTIONS)) {
    detectedSections[sec] = kws.some(kw => lower.includes(kw));
  }

  const skills = SKILLS_DICT.filter(s => lower.includes(s.toLowerCase()));
  const achievementSignals = ['%','increased','decreased','reduced','improved','grew','generated','saved','managed','led','built','launched','delivered','achieved','exceeded'];
  const hasAchievements = achievementSignals.some(s => lower.includes(s));

  const totalChars = text.replace(/\s/g, '').length;
  const isLikelyScanned = totalChars < 150;
  const lines2 = lines;
  const shortLines = lines2.filter(l => l.length > 1 && l.length < 25).length;
  const longLines = lines2.filter(l => l.length > 60).length;
  const multiColumnRisk = !isLikelyScanned && shortLines > longLines * 1.5 && shortLines > 15;
  const specialCharCount = (text.match(/[|•◆■▪►▸◦‣]/g) || []).length;
  const hasTables = (text.match(/\|.*\|/g) || []).length > 2;

  let yearsExp = 'Not detected';
  const yearMatches = text.match(/\b(20\d{2}|19\d{2})\b/g);
  if (yearMatches && yearMatches.length >= 2) {
    const yrs = yearMatches.map(Number);
    const span = Math.max(...yrs) - Math.min(...yrs);
    if (span > 0 && span < 50) yearsExp = `~${span} years`;
  }

  const recommendations = [];
  if (isLikelyScanned) recommendations.push({ type: 'critical', text: 'Scanned image detected — ATS cannot read it. Use a text-based PDF or DOCX.' });
  if (multiColumnRisk) recommendations.push({ type: 'critical', text: 'Multi-column layout detected. ATS parsers scramble columns, losing your experience data.' });
  if (hasTables) recommendations.push({ type: 'warning', text: 'Tables detected. Use plain text sections instead for better ATS compatibility.' });
  if (!detectedSections.skills) recommendations.push({ type: 'warning', text: 'No "Skills" section. Add a dedicated section with industry-relevant keywords.' });
  if (!detectedSections.summary) recommendations.push({ type: 'info', text: 'No professional summary. A 3-line summary boosts ATS keyword density significantly.' });
  if (!hasAchievements) recommendations.push({ type: 'warning', text: 'No measurable achievements. Add metrics (e.g., "Increased sales by 23%") to stand out.' });
  if (skills.length < 5) recommendations.push({ type: 'warning', text: `Only ${skills.length} recognised skills found. Expand with industry-specific keywords.` });
  if (specialCharCount > 10) recommendations.push({ type: 'info', text: 'Decorative bullet symbols detected. Use plain hyphens for better ATS compatibility.' });

  const result = {
    contact: { name: detectedName, email: emailMatch?.[0] || null, phone: phoneMatch?.[0] || null, linkedin: linkedinMatch?.[0] || null, hasPhoto: false, hasDOB: false, hasIDNumber: false },
    sections: detectedSections, skills, hasAchievements, yearsExp,
    formatting: { isLikelyScanned, multiColumnRisk, specialCharCount, hasTables, hasGraphics: false, hasTextBoxes: false, hasColoredTextOrBg: false, hasSpecialBullets: specialCharCount > 10, isOverTwoPages: false },
    experienceEvaluation: { usesStarMethod: hasAchievements, hasMetrics: hasAchievements, boldsFirstWords: false, boldsMetrics: false },
    recommendations, rawTextLength: totalChars,
  };
  result.scores = calcScores(result);
  return result;
}

function calcScores(d) {
  if (!d) return { parsingAccuracy: 0, sectionScore: 0, keywordScore: 0, formattingScore: 0, overallScore: 0 };
  let p = 100;
  if (d.formatting?.isLikelyScanned) p -= 50;
  if (!d.contact?.name) p -= 20;
  if (!d.contact?.email) p -= 15;
  if (!d.contact?.phone) p -= 15;
  p = Math.max(0, p);

  const sObj = d.sections || {};
  const sKeys = Object.keys(sObj);
  const s = sKeys.length ? Math.round((sKeys.filter(k => sObj[k]).length / sKeys.length) * 100) : 0;
  const k = Math.min(100, Math.round(((d.skills?.length || 0) / 12) * 100));

  let fd = 0;
  if (d.formatting?.multiColumnRisk) fd += 25;
  if (d.contact?.hasPhoto) fd += 35;
  if (d.formatting?.hasTables) fd += 15;
  if (d.formatting?.hasGraphics) fd += 15;
  if (d.formatting?.hasSpecialBullets) fd += 10;
  if (d.formatting?.isOverTwoPages) fd += 15;
  if (d.experienceEvaluation && !d.experienceEvaluation.usesStarMethod) fd += 10;
  if (d.experienceEvaluation && !d.experienceEvaluation.hasMetrics) fd += 10;
  if (d.contact?.hasDOB) fd += 20;
  if (d.contact?.hasIDNumber) fd += 20;
  const f = Math.max(0, 100 - fd);
  const o = Math.round(p * 0.30 + s * 0.25 + k * 0.25 + f * 0.20);
  return { parsingAccuracy: p, sectionScore: s, keywordScore: k, formattingScore: f, overallScore: o };
}

function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; resolve(window.pdfjsLib); };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}

async function extractPdfText(file) {
  const lib = await loadPdfJs();
  const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text;
}

async function extractDocxText(file) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = zip.file('word/document.xml');
  if (!xml) throw new Error('Invalid DOCX.');
  return (await xml.async('text'))
    .replace(/<\/w:p>/gi, '\n').replace(/<\/w:r>/gi, ' ').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ').split('\n').map(l => l.trim()).join('\n');
}

function scoreColor(n) { return n >= 75 ? '#15803d' : n >= 50 ? '#d97706' : '#D12630'; }

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export function ATSResumeVault({ onNavigate }) {
  const [templates, setTemplates]         = useState([]);
  const [loadingTpl, setLoadingTpl]       = useState(true);
  const [tplError, setTplError]           = useState('');

  const [selTemplate, setSelTemplate]     = useState(null);
  const [payStatus, setPayStatus]         = useState(null);
  const [payMsg, setPayMsg]               = useState('');

  const [dragActive, setDragActive]       = useState(false);
  const [scanStatus, setScanStatus]       = useState(null); // null|'scanning'|'done'|'error'
  const [scanResult, setScanResult]       = useState(null);
  const [scanFileName, setScanFileName]   = useState('');
  const [scanError, setScanError]         = useState('');

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700;1,800&family=Inter:wght@400;500;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    if (!document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
      const s = document.createElement('script');
      s.src = 'https://js.paystack.co/v1/inline.js'; s.async = true;
      document.body.appendChild(s);
    }
    fetchTemplates();
  }, []);

  /* ── Templates ─────────────────────────────────────────────────────────────── */
  const fetchTemplates = async () => {
    try {
      setLoadingTpl(true); setTplError('');
      const res = await axios.get(`${API_URL}/api/academy/templates`);
      setTemplates(res.data || []);
    } catch { setTplError('Could not load templates — please refresh.'); }
    finally { setLoadingTpl(false); }
  };

  /* ── Free download ─────────────────────────────────────────────────────────── */
  const downloadFree = (t) => {
    if (!t.file_url) return;
    const a = document.createElement('a');
    a.href = t.file_url; a.setAttribute('download', `${t.name}.docx`); a.target = '_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  /* ── Paystack inline checkout ──────────────────────────────────────────────── */
  const handleCheckout = async (e, template) => {
    e.preventDefault();
    const email = e.target.email.value;
    if (!email.includes('@')) return;
    
    setSelTemplate(template);
    setPayStatus('initiating'); setPayMsg('Opening payment gateway…');
    try {
      const res = await axios.post(`${API_URL}/api/initialize-payment`, {
        email: email,
        metadata: { type: 'resume_template', template_id: template.id, currency: 'KES' }
      });
      const ref = res.data?.data?.reference;
      if (!ref) throw new Error(res.data?.message || 'No reference returned.');
      if (!window.PaystackPop) throw new Error('Paystack not loaded yet — please try again.');

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: email,
        amount: Math.round((template.price_kes || 0) * 100),
        currency: 'KES',
        ref: ref,
        metadata: { type: 'resume_template', template_id: template.id },
        callback: function (response) {
          (async () => {
            setPayStatus('verifying'); setPayMsg('Verifying payment…');
            try {
              // Updated to hit our new POST endpoint which handles Paystack verification and Resend email
              const v = await axios.post(`${API_URL}/api/academy/templates/purchase`, {
                reference: response.reference,
                email: email,
                templateId: template.id
              });
              if (v.data?.success) {
                setPayStatus('success'); setPayMsg('Payment confirmed! Download starting…');
                setTimeout(() => { window.location.href = v.data.file_url; }, 800);
              } else { throw new Error('Not confirmed'); }
            } catch (err) { 
              setPayStatus('error'); 
              setPayMsg(`Verification failed. Save ref: ${response.reference} and contact support.`); 
            }
          })();
        },
        onClose: function () {
          if (payStatus !== 'success' && payStatus !== 'verifying') {
            setPayStatus('error'); setPayMsg('Payment window closed. No charge was made.');
          }
        }
      });
      handler.openIframe();
      setPayMsg('Complete payment in the popup window.');
    } catch (err) {
      setPayStatus('error');
      setPayMsg(err.response?.data?.error || err.message || 'Payment init failed. Try again.');
    }
  };

  /* ── ATS file scan ─────────────────────────────────────────────────────────── */
  const handleDrag = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileSelect = (e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); };

  const processFile = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['docx','pdf'].includes(ext)) { setScanError('Only DOCX and PDF files are supported.'); setScanStatus('error'); return; }
    if (file.size > 10 * 1024 * 1024) { setScanError('File too large. Max 10MB.'); setScanStatus('error'); return; }

    setScanError(''); setScanResult(null); setScanFileName(file.name); setScanStatus('scanning');
    try {
      let result;
      try {
        let payload = {};
        if (ext === 'pdf') {
          const b64 = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = e => res(e.target.result.split(',')[1]); r.onerror = rej;
            r.readAsDataURL(file);
          });
          payload = { fileBase64: b64, fileType: 'pdf', extractedLinks: [] };
        } else {
          payload = { text: await extractDocxText(file), fileType: 'docx', extractedLinks: [] };
        }
        const res = await axios.post(`${API_URL}/api/analyze-resume`, payload, { timeout: 30000 });
        result = res.data; result.scores = calcScores(result);
      } catch {
        const raw = ext === 'pdf' ? await extractPdfText(file) : await extractDocxText(file);
        result = parseResume(raw);
      }
      setScanResult(result); setScanStatus('done');
    } catch {
      setScanError('Analysis failed. Please try a DOCX version.'); setScanStatus('error');
    }
  };

  const resetScan = () => { setScanStatus(null); setScanResult(null); setScanFileName(''); setScanError(''); };

  /* ─────────────────────────────────────────────────────────────────────────────
     RENDER  — Swiss Editorial Bento Grid
  ───────────────────────────────────────────────────────────────────────────── */
  const B = 'border-[#111111]'; // shorthand for consistent border colour token

  return (
    <div
      style={{ fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif', background: '#F5F5F0', color: '#111111', minHeight: '100vh' }}
    >
      {/* ── Outer page container with left/right structural rails ── */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        borderLeft: '1px solid #111111', borderRight: '1px solid #111111',
        minHeight: '100vh', display: 'flex', flexDirection: 'column'
      }}>

        {/* ══════════════════════════════════════════════════════════════════════
            TOP NAV BAR
        ══════════════════════════════════════════════════════════════════════ */}
        <header style={{ borderTop: '1px solid #111111', borderBottom: '1px solid #111111', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5F5F0', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 22, height: 22, background: '#D12630', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16, lineHeight: 1, userSelect: 'none' }}>+</div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>ATS Vault // Concept 01</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#666' }}>VAULT DESIGN FOR INTELLIGENCE</span>
            <button
              onClick={() => onNavigate('services')}
              style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', border: '1px solid #111111', padding: '6px 14px', background: 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.target.style.background = '#111111'; e.target.style.color = '#fff'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#111111'; }}
            >
              ← Back
            </button>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════════════════════
            HERO — Large Serif Headline
        ══════════════════════════════════════════════════════════════════════ */}
        <section style={{ borderBottom: '1px solid #111111', padding: '48px 40px 40px' }}>
          <h1 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: 'clamp(42px, 6vw, 80px)', fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.01em', margin: '0 0 32px', maxWidth: 920 }}>
            A <em style={{ color: '#D12630', fontStyle: 'italic', fontWeight: 700 }}>Vault</em> of direct-download,
            no-signup <em style={{ color: '#D12630', fontStyle: 'italic', fontWeight: 700 }}>Resume Templates</em>.
          </h1>
          <div style={{ borderTop: '1px solid rgba(17,17,17,0.3)', paddingTop: 16, display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D12630' }}>THE CONTEXT // 2026</div>
            <p style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 620, margin: 0, fontWeight: 500 }}>
              Zero accounts. Zero paywalls. 100% free, high-vetted ATS templates.<br />
              Optimized for Kenyan and Global corporate recruiting sectors.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            ROW 1 — All Template Cards Grid
        ══════════════════════════════════════════════════════════════════════ */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', background: '#F5F5F0' }}>
          {loadingTpl ? (
            <div style={{ gridColumn: '1 / -1', padding: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, borderBottom: '1px solid #111' }}>
              <Loader2 style={{ color: '#D12630', animation: 'spin 1s linear infinite' }} size={32} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888' }}>Querying Vault…</span>
            </div>
          ) : tplError ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', borderBottom: '1px solid #111' }}>
              <XCircle size={28} style={{ color: '#D12630', marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>{tplError}</p>
              <button onClick={fetchTemplates} style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid #111', padding: '8px 18px', cursor: 'pointer', background: 'transparent' }}>Retry</button>
            </div>
          ) : (
            <>
              {/* Actual Templates */}
              {templates.map((t, i) => (
                <div key={t.id} style={{
                  background: '#F5F5F0',
                  padding: '28px 28px 24px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: 'auto',
                  borderRight: '1px solid #111111',
                  borderBottom: '1px solid #111111',
                  marginRight: '-1px'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      {!t.is_free && (
                        <span style={{ background: '#111', color: '#D12630', fontSize: 9, fontWeight: 800, padding: '3px 8px', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: '#F1C40F' }}>★</span> Premium
                        </span>
                      )}
                      {t.is_free && (
                        <span style={{ background: 'rgba(21,128,61,0.1)', color: '#15803d', fontSize: 9, fontWeight: 800, padding: '3px 8px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                          Free
                        </span>
                      )}
                    </div>
                    
                    <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: 20, fontWeight: 700, color: '#D12630', marginBottom: 4, lineHeight: 1.2 }}>
                      {t.name.includes('(') ? (
                        <>
                          {t.name.split('(')[0].trim()}<br />
                          <span style={{ color: '#111111', fontStyle: 'normal' }}>({t.name.split('(')[1]}</span>
                        </>
                      ) : t.name}
                    </h3>
                    
                    {t.preview_url && (
                      <div style={{ margin: '14px 0', border: '1px solid rgba(17,17,17,0.1)', background: '#fff', padding: 4 }}>
                        <img src={t.preview_url} alt={`${t.name} preview`} loading="lazy" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 200, objectFit: 'cover', objectPosition: 'top' }} />
                      </div>
                    )}

                    {t.description && (
                      <p style={{ fontSize: 12, color: '#555', lineHeight: 1.55, margin: '8px 0 0' }}>{t.description}</p>
                    )}
                  </div>

                  <div style={{ marginTop: 20 }}>
                    {t.is_free ? (
                      <button
                        onClick={() => downloadFree(t)}
                        disabled={!t.file_url}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
                          color: t.file_url ? '#111111' : '#aaa',
                          textDecoration: 'none', border: 'none', background: 'none', cursor: t.file_url ? 'pointer' : 'default',
                          borderBottom: `2px solid ${t.file_url ? '#111111' : '#ddd'}`, paddingBottom: 2,
                          marginBottom: 18
                        }}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.file_url ? '#D12630' : '#ccc', display: 'inline-block', flexShrink: 0 }} />
                        {t.file_url ? 'Download .DOCX →' : 'Coming Soon'}
                      </button>
                    ) : (
                      <div style={{ marginBottom: 18 }}>
                        <form onSubmit={(e) => handleCheckout(e, t)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input 
                              name="email"
                              type="email" required placeholder="Enter email for receipt"
                              style={{ flex: 1, fontSize: 11, padding: '8px 10px', border: '1px solid #111', background: '#fff', outline: 'none', minWidth: 0 }}
                            />
                            <button 
                              type="submit"
                              disabled={payStatus === 'initiating' || payStatus === 'verifying'}
                              style={{ 
                                background: '#111', color: '#fff', border: 'none', padding: '0 14px', fontSize: 11, fontWeight: 700, 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
                              }}
                            >
                              {(selTemplate?.id === t.id && (payStatus === 'initiating' || payStatus === 'verifying')) && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                              KES {t.price_kes} →
                            </button>
                          </div>
                          {selTemplate?.id === t.id && payStatus && payMsg && (
                            <div style={{ fontSize: 10, fontWeight: 600, color: payStatus === 'success' ? '#15803d' : payStatus === 'error' ? '#D12630' : '#1d4ed8' }}>
                              {payMsg}
                            </div>
                          )}
                        </form>
                      </div>
                    )}

                    {/* Meta */}
                    <div style={{ borderTop: '1px solid rgba(17,17,17,0.12)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div style={{ fontSize: 11 }}>
                        {t.optimized_companies?.length > 0 && (
                          <>
                            <div style={{ fontWeight: 700, color: '#777', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 9, marginBottom: 3 }}>Optimized Companies:</div>
                            <div style={{ fontWeight: 600, color: '#111' }}>{t.optimized_companies.join(', ')}</div>
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', opacity: 0.5 }}>
                        <FileText size={18} style={{ color: '#333' }} />
                        <span style={{ fontSize: 9, fontWeight: 900, border: '1px solid #555', padding: '1px 4px', borderRadius: 2, color: '#333' }}>.docx</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Dynamic Informational Placeholders to fill the grid up to 3 slots */}
              {templates.length < 3 && [
                {
                  badge: "Coming Soon",
                  badgeColor: 'rgba(100, 116, 139, 0.1)',
                  textColor: '#64748b',
                  title: "Vetted ATS Designs Under Construction",
                  description: "This is not your average, generic template database. Every single document in this vault is engineered and vetted to pass automated applicant tracking systems (ATS) with flying colors. We add new designs weekly to keep up with changing corporate recruiting algorithms. Keep visiting!",
                  meta: "Updated Weekly"
                },
                {
                  badge: "Vetted to Hire",
                  badgeColor: 'rgba(209, 38, 48, 0.1)',
                  textColor: '#D12630',
                  title: "Engineered to Unlock Interviews",
                  description: "Standard internet resumes get filtered out 75% of the time. These vault templates are structured using clean, single-column Swiss Editorial layouts and optimized typography that have helped hundreds of candidates secure interviews at Equity Bank, Safaricom, and global firms.",
                  meta: "Candidate Approved"
                },
                {
                  badge: "Updates Incoming",
                  badgeColor: 'rgba(21, 128, 61, 0.1)',
                  textColor: '#15803d',
                  title: "Dynamic Vault Synchronization",
                  description: "Our team continuously monitors HR parsing technology and updates the existing templates dynamically. Keep visiting this vault regularly to download the latest optimized versions before your next application.",
                  meta: "Sync Status: Active"
                }
              ].slice(0, 3 - templates.length).map((placeholder, idx) => (
                <div key={`placeholder-${idx}`} style={{
                  background: '#F5F5F0',
                  padding: '28px 28px 24px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  minHeight: 'auto',
                  borderRight: '1px solid #111111',
                  borderBottom: '1px solid #111111',
                  marginRight: '-1px'
                }}>
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ background: placeholder.badgeColor, color: placeholder.textColor, fontSize: 9, fontWeight: 800, padding: '3px 8px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        {placeholder.badge}
                      </span>
                    </div>
                    <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: 20, fontWeight: 700, color: '#111111', marginBottom: 12, lineHeight: 1.2 }}>
                      {placeholder.title}
                    </h3>
                    <p style={{ fontSize: 12, color: '#555', lineHeight: 1.55, margin: 0 }}>
                      {placeholder.description}
                    </p>
                  </div>
                  <div style={{ marginTop: 24, borderTop: '1px solid rgba(17,17,17,0.12)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#777' }}>
                      {placeholder.meta}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#D12630', letterSpacing: '0.05em' }}>
                      SYS // ACTIVE
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            ROW 2 — ATS Check | Expert CTA
        ══════════════════════════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', background: '#111111', gap: '1px', flex: 1 }}>

          {/* ── ATS Score Checker ─────────────────────────────────────────── */}
          <div style={{ background: '#F5F5F0', padding: '32px 32px 36px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 8 }}>Verification Check</div>
              <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 24, fontWeight: 700, margin: '0 0 14px', lineHeight: 1.2 }}>Verify Your ATS Score</h2>

              {/* Drop zone */}
              <div
                onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={e => { e.preventDefault(); setDragActive(false); }} onDrop={handleDrop}
                onClick={() => document.getElementById('vault-fp').click()}
                style={{
                  border: `2px dashed ${dragActive ? '#D12630' : '#999'}`,
                  borderRadius: 4, padding: '28px 16px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', background: dragActive ? 'rgba(209,38,48,0.04)' : '#fff',
                  transition: 'all 0.2s', gap: 8, minHeight: 120,
                  transform: dragActive ? 'scale(0.98)' : 'scale(1)'
                }}
              >
                <input id="vault-fp" type="file" accept=".docx,.pdf" style={{ display: 'none' }} onChange={handleFileSelect} />
                {scanStatus === 'scanning' ? (
                  <>
                    <Loader2 style={{ color: '#D12630', animation: 'spin 1s linear infinite' }} size={24} />
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Analysing…</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={26} style={{ color: '#aaa' }} />
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.5, color: '#333' }}>
                      DRAG-AND-DROP<br />YOUR EDITED<br />RESUME HERE
                    </span>
                    <span style={{ fontSize: 9, color: '#bbb' }}>DOCX or PDF · Max 10MB</span>
                  </>
                )}
              </div>
            </div>

            {/* Results panel */}
            <div style={{ border: '1px solid #111111', borderRadius: 2, padding: '16px 20px', background: '#fff', flex: 1 }}>
              {scanStatus === 'error' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#D12630', marginBottom: 6 }}>
                    <XCircle size={14} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Analysis Failed</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#666', margin: '0 0 8px' }}>{scanError}</p>
                  <button onClick={resetScan} style={{ fontSize: 10, fontWeight: 700, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Try again →</button>
                </div>
              )}

              {scanStatus === 'done' && scanResult ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e5e5e5', paddingBottom: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D12630' }}>
                      {scanFileName.length > 20 ? scanFileName.substring(0, 20) + '…' : scanFileName}
                    </span>
                    <button onClick={resetScan} style={{ fontSize: 9, fontWeight: 700, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Reset</button>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>Score: </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: scoreColor(scanResult.scores.overallScore) }}>{scanResult.scores.overallScore}%</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                    {[
                      { l: 'Parsing', v: scanResult.scores.parsingAccuracy },
                      { l: 'Sections', v: scanResult.scores.sectionScore },
                      { l: 'Keywords', v: scanResult.scores.keywordScore },
                      { l: 'Format', v: scanResult.scores.formattingScore },
                    ].map(({ l, v }) => (
                      <div key={l} style={{ border: '1px solid #e5e5e5', borderRadius: 2, padding: '6px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: scoreColor(v) }}>{v}%</div>
                        <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999' }}>{l}</div>
                      </div>
                    ))}
                  </div>

                  {scanResult.recommendations?.slice(0, 4).map((rec, i) => (
                    <div key={i} style={{ display: 'flex', gap: 5, alignItems: 'flex-start', marginBottom: 5 }}>
                      <span style={{ fontWeight: 700, flexShrink: 0, fontSize: 11, color: rec.type === 'critical' ? '#D12630' : rec.type === 'warning' ? '#d97706' : '#2563eb' }}>
                        {rec.type === 'critical' ? '✘' : rec.type === 'warning' ? '⚠' : 'ℹ'}
                      </span>
                      <span style={{ fontSize: 10, color: '#444', lineHeight: 1.45 }}>{rec.text}</span>
                    </div>
                  ))}

                  {scanResult.skills?.length > 0 && (
                    <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: 10, marginTop: 8 }}>
                      <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#999', marginBottom: 5 }}>
                        Keywords ({scanResult.skills.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {scanResult.skills.slice(0, 10).map(s => (
                          <span key={s} style={{ fontSize: 8, fontWeight: 700, background: '#f0f0ec', color: '#444', padding: '2px 5px', borderRadius: 2 }}>{s}</span>
                        ))}
                        {scanResult.skills.length > 10 && (
                          <span style={{ fontSize: 8, color: '#999' }}>+{scanResult.skills.length - 10}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : scanStatus !== 'error' && (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#bbb' }}>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>Score: </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#ccc' }}>—%</span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#ccc', borderTop: '1px solid #e5e5e5', paddingTop: 14 }}>
                    Parsing: —<br />Feedback: Upload your CV above.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Expert Rewrite CTA — Vertical Editorial Banner ─────────── */}
          <div
            onClick={() => { onNavigate('services'); setTimeout(() => { document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }, 300); }}
            style={{
              background: '#D12630', color: '#fff', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '40px 0', position: 'relative', overflow: 'hidden', userSelect: 'none', transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#111'}
            onMouseLeave={e => e.currentTarget.style.background = '#D12630'}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.85 }}>DO IT FOR ME</span>
              <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1, textAlign: 'center', maxWidth: 200 }}>GET EXPERT REWRITE</span>
            </div>

            <div style={{ marginTop: 40, borderTop: '1px solid rgba(255,255,255,0.3)', padding: '20px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>REGISTER NOW →</span>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', display: 'block' }} />
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════════════════════════════ */}
        <footer style={{ borderTop: '1px solid #111111', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#F5F5F0' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 3 }}>VAULT // ACCESS LINK</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#333' }}>CLICK ON TEMPLATE TO DOWNLOAD DIRECTLY</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888', marginBottom: 3 }}>ID // 900C</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#333' }}>© {new Date().getFullYear()} DUNCAN MAKOYO.</div>
          </div>
        </footer>

      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @media (max-width: 700px) { .vault-grid-row2 { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

export default ATSResumeVault;
