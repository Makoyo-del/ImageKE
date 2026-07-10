import re

filepath = r"c:\Users\USER\Desktop\Duncan Makoyo\DunMak\src\ATSSimulator.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Define markers
start_marker = "// ─── Score Ring Component ─────────────────────────────────────────────────────"
end_marker = "  // ── Payment Modal ──"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1:
    print("Error: start_marker not found!")
    exit(1)
if end_idx == -1:
    print("Error: end_marker not found!")
    exit(1)

new_code = """// ─── Score Ring Component ─────────────────────────────────────────────────────
function ScoreRing({ score, label, size = 90 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="text-center" style={{ minWidth: size + 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={score >= 75 ? '#B7FF76' : score >= 50 ? '#FFE66C' : '#FF5C35'}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-1000 ease-out"
        />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="text-[18px] font-black fill-white">
          {score}%
        </text>
      </svg>
      <div className="text-[10px] font-bold text-text-secondary/60 mt-2.5 leading-tight">{label}</div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ found, warningText, okText = 'Detected' }) {
  if (warningText) return (
    <span className="inline-flex bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
      ⚠️ {warningText}
    </span>
  );
  if (found) return (
    <span className="inline-flex bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
      {okText}
    </span>
  );
  return (
    <span className="inline-flex bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
      Not detected
    </span>
  );
}

// ─── Main ATS Simulator Component ────────────────────────────────────────────
export default function ATSSimulator({ onBack }) {
  const [view, setView] = useState('upload'); // 'upload' | 'parsing' | 'results'
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Parsing state
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [stepStatuses, setStepStatuses] = useState({}); // { stepId: 'running' | 'done' | 'error' }
  const [parseResult, setParseResult] = useState(null);
  const [parseError, setParseError] = useState('');

  // Lead form state
  const [leadForm, setLeadForm] = useState({ name: '', email: '', linkedin: '', consent: false });
  const [leadStatus, setLeadStatus] = useState(null); // null | 'sending' | 'success' | 'error'
  const [leadError, setLeadError] = useState('');

  // Branded PDF export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportEmail, setExportEmail] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportStatus, setExportStatus] = useState(''); // '', 'loading_pdf', 'loading_paystack', 'paying', 'verifying', 'generating', 'done'

  // Reset window scroll to top when view changes (e.g. upload -> parsing -> results)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [view]);

  // ── File selection ────────────────────────────────────────────────────────
  const handleFileSelect = useCallback((selectedFile) => {
    setUploadError('');
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      setUploadError('Only PDF and DOCX files are supported.');
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      setUploadError('File is too large. Please use a file under 15MB.');
      return;
    }
    setFile(selectedFile);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    handleFileSelect(dropped);
  }, [handleFileSelect]);

  // ── Run ATS Simulation ────────────────────────────────────────────────────
  const runSimulation = useCallback(async () => {
    if (!file) return;
    setView('parsing');
    setCurrentStepIndex(0);
    setStepStatuses({});
    setParseResult(null);
    setParseError('');

    const markStep = (id, status) =>
      setStepStatuses(prev => ({ ...prev, [id]: status }));

    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    const ext = file.name.split('.').pop().toLowerCase();

    // Start Gemini API Call immediately if key exists in env, or fall back to secure backend proxy.
    // NOTE: We intentionally do NOT read from localStorage — that would be a security risk
    // (any user could inject their own key and share it, exposing it in browser storage).
    let geminiPromise = null;
    const apiKey = ''; // Always use secure backend proxy in production to prevent key exposure

    if (apiKey) {
      geminiPromise = (async () => {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-lite',
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.0,
            }
          });

          let result;
          if (ext === 'pdf') {
            const base64Data = await fileToBase64(file);
            const extractedLinks = await extractPdfLinks(file);
            let promptText = GEMINI_SYSTEM_PROMPT;
            if (extractedLinks && extractedLinks.length > 0) {
              promptText += `\\n\\nCRITICAL CONTEXT — UNDERLYING HYPERLINKS:\\nThe document parsing engine extracted the following interactive hyperlinks embedded in the document's metadata/relationships/code:\\n${extractedLinks.map(l => `- ${l}`).join('\\n')}\\nUse this list to resolve any hidden/underlying links (e.g. if a link points to a LinkedIn profile, consider the LinkedIn URL detected even if only anchor text like 'LinkedIn' is visible in the resume body, and do not warn the user about it being missing or not formatted as a full URL).`;
            }
            result = await model.generateContent([
              {
                inlineData: {
                  data: base64Data,
                  mimeType: 'application/pdf'
                }
              },
              promptText
            ]);
          } else {
            const extractedText = await extractDocxText(file);
            const extractedLinks = await extractDocxLinks(file);
            let promptText = `Here is the extracted text of the resume:\\n\\n${extractedText}\\n\\nPlease analyze it using the instructions.`;
            if (extractedLinks && extractedLinks.length > 0) {
              promptText += `\\n\\nCRITICAL CONTEXT — UNDERLYING HYPERLINKS:\\nThe document parsing engine extracted the following interactive hyperlinks embedded in the document's metadata/relationships/code:\\n${extractedLinks.map(l => `- ${l}`).join('\\n')}\\nUse this list to resolve any hidden/underlying links (e.g. if a link points to a LinkedIn profile, consider the LinkedIn URL detected even if only anchor text like 'LinkedIn' is visible in the resume body, and do not warn the user about it being missing or not formatted as a full URL).`;
            }
            result = await model.generateContent([
              promptText,
              GEMINI_SYSTEM_PROMPT
            ]);
          }

          const responseText = result.response.text();
          const parsed = JSON.parse(responseText);

          // Calculate scores based on the flags
          parsed.scores = calculateScores(parsed);

          return parsed;
        } catch (error) {
          console.error("Gemini API parsing failed, falling back to client-side regex:", error);
          throw error;
        }
      })();
    } else {
      // Call the secure backend proxy
      geminiPromise = (async () => {
        try {
          let payload = {};
          let extractedLinks = [];
          if (ext === 'pdf') {
            const base64Data = await fileToBase64(file);
            extractedLinks = await extractPdfLinks(file);
            payload = { fileBase64: base64Data, fileType: 'pdf', extractedLinks };
          } else {
            const extractedText = await extractDocxText(file);
            extractedLinks = await extractDocxLinks(file);
            payload = { text: extractedText, fileType: 'docx', extractedLinks };
          }

          const response = await axios.post(`${API_URL}/api/analyze-resume`, payload);
          const parsed = response.data;

          // Calculate scores based on the flags
          parsed.scores = calculateScores(parsed);

          return parsed;
        } catch (error) {
          console.error("Secure backend proxy parsing failed, falling back to client-side regex:", error);
          throw error;
        }
      })();
    }

    try {
      // Step 0: Extract text
      markStep('extract', 'running');
      let rawText = '';
      if (!geminiPromise) {
        if (ext === 'pdf') rawText = await extractPdfText(file);
        else rawText = await extractDocxText(file);
      }
      await delay(600);
      markStep('extract', 'done');

      // Loop through remaining steps to animate
      const steps = ['structure', 'contact', 'experience', 'education', 'skills', 'formatting'];
      for (let i = 0; i < steps.length; i++) {
        const stepId = steps[i];
        setCurrentStepIndex(i + 1);
        markStep(stepId, 'running');
        await delay(500 + Math.random() * 400); // realistic variance
        markStep(stepId, 'done');
      }

      // Step 7: Score
      setCurrentStepIndex(7);
      markStep('score', 'running');

      let result;
      if (geminiPromise) {
        try {
          result = await geminiPromise;
        } catch (apiErr) {
          // If Gemini fails, extract text locally if we haven't already and run regex fallback
          if (!rawText) {
            if (ext === 'pdf') rawText = await extractPdfText(file);
            else rawText = await extractDocxText(file);
          }
          result = parseResume(rawText);
        }
      } else {
        await delay(1000);
        result = parseResume(rawText);
      }

      setParseResult(result);
      markStep('score', 'done');
      await delay(600);

      setView('results');
    } catch (err) {
      console.error(err);
      setParseError('An error occurred during resume parsing. Please check that your file is not corrupted and try again.');
      markStep(PARSE_STEPS[currentStepIndex]?.id, 'error');
    }
  }, [file]);


  // ── Lead Submission ────────────────────────────────────────────────────────
  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    if (!leadForm.name.trim() || !leadForm.email.trim()) { setLeadError('Please fill in your name and email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadForm.email)) { setLeadError('Please enter a valid email.'); return; }
    if (!leadForm.consent) { setLeadError('Please confirm your consent to continue.'); return; }
    setLeadError('');
    setLeadStatus('sending');

    const score = parseResult?.scores?.overallScore ?? 0;
    const issues = parseResult?.recommendations?.map(r => r.text).join(' | ') || 'None';

    try {
      await axios.post(`${API_URL}/api/submit-service-request`, {
        name: leadForm.name.trim(),
        email: leadForm.email.trim().toLowerCase(),
        phone: '',
        service: 'ATS Simulator Lead',
        message: `ATS Score: ${score}% | LinkedIn: ${leadForm.linkedin || 'Not provided'} | Issues: ${issues}`,
        wantAudit: false,
        source: 'ats_simulator',
        atsScore: score,
      });
      setLeadStatus('success');
    } catch {
      setLeadStatus('error');
      setLeadError('Submission failed. Please try contacting Duncan directly on WhatsApp.');
    }
  };

  // ── jsPDF Loader ─────────────────────────────────────────────────────────────
  const loadJsPdf = () => {
    return new Promise((resolve, reject) => {
      if (window.jspdf) { resolve(window.jspdf); return; }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => resolve(window.jspdf);
      script.onerror = () => reject(new Error('Failed to load jsPDF library.'));
      document.head.appendChild(script);
    });
  };

  // ── Paystack Script Loader ───────────────────────────────────────────────────
  const loadPaystack = () => {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) { resolve(window.PaystackPop); return; }
      if (document.getElementById('paystack-script')) {
        let count = 0;
        const interval = setInterval(() => {
          if (window.PaystackPop) {
            clearInterval(interval);
            resolve(window.PaystackPop);
          }
          if (count++ > 50) {
            clearInterval(interval);
            reject(new Error('Paystack script failed to load.'));
          }
        }, 100);
        return;
      }
      const script = document.createElement('script');
      script.id = 'paystack-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => resolve(window.PaystackPop);
      script.onerror = () => reject(new Error('Failed to load Paystack script.'));
      document.body.appendChild(script);
    });
  };

  // ── Generate Report PDF ──────────────────────────────────────────────────────
  const generateReportPDF = (parsedData, pitchCopy) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    
    const score = parsedData.scores?.overallScore ?? 0;
    const contact = parsedData.contact ?? {};
    const sections = parsedData.sections ?? {};
    const formatting = parsedData.formatting ?? {};
    const expEval = parsedData.experienceEvaluation ?? {};
    const recommendations = parsedData.recommendations ?? [];
    const skills = parsedData.skills ?? [];
    const yearsExp = parsedData.yearsExp ?? 'Not detected';
    
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2); // 515 pt

    // Colors
    const navyDark = '#0F172A';
    const textDark = '#1E293B';
    const borderLight = '#E2E8F0';
    
    // Score color
    const scoreColor = score >= 75 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626';
    
    // Helper to draw header on each page
    const drawPageHeader = (pageNum) => {
      doc.setFillColor(15, 23, 42); // Navy Dark
      doc.rect(0, 0, pageWidth, 60, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('DUNCAN MAKOYO | CAREER SERVICES', margin, 35);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.text('ATS COMPLIANCE AUDIT REPORT', pageWidth - margin - 150, 35, { align: 'right' });
      
      doc.text(`Page ${pageNum}`, pageWidth - margin, 35, { align: 'right' });
    };
    
    // Helper to draw footer on each page
    const drawPageFooter = () => {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('© 2026 Duncan Makoyo. All rights reserved. | info@duncanmakoyo.com | duncanmakoyo.com', margin, pageHeight - 30);
      doc.text('Confidential Career Audit Report', pageWidth - margin, pageHeight - 30, { align: 'right' });
    };

    // Helper for adding wrapped text with safety checks
    const addWrappedText = (text, x, y, maxWidth, fontSize = 10, fontStyle = 'normal', color = textDark, lineHeight = 15) => {
      doc.setFont('Helvetica', fontStyle);
      doc.setFontSize(fontSize);
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        doc.setTextColor(r, g, b);
      } else {
        doc.setTextColor(30, 41, 59);
      }
      const lines = doc.splitTextToSize(text, maxWidth);
      let currentY = y;
      for (let i = 0; i < lines.length; i++) {
        if (currentY > pageHeight - 60) {
          doc.addPage();
          drawPageHeader(doc.internal.getNumberOfPages());
          drawPageFooter();
          currentY = 90;
        }
        doc.text(lines[i], x, currentY);
        currentY += lineHeight;
      }
      return currentY;
    };

    // ---------------- PAGE 1 ----------------
    drawPageHeader(1);
    drawPageFooter();

    let y = 100;
    
    // Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text('ATS RESUME PARSING AUDIT', margin, y);
    y += 25;
    
    // Underline
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 25;

    // Metadata Card
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 70, 8, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 70, 8, 8, 'D');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Candidate Name:', margin + 15, y + 20);
    doc.text('Email Address:', margin + 15, y + 38);
    doc.text('Phone Number:', margin + 15, y + 56);

    doc.text('Scan Date:', margin + 280, y + 20);
    doc.text('LinkedIn Profile:', margin + 280, y + 38);
    doc.text('Experience Level:', margin + 280, y + 56);

    doc.setFont('Helvetica', 'normal');
    doc.text(contact.name || 'Not detected', margin + 110, y + 20);
    doc.text(contact.email || 'Not detected', margin + 110, y + 38);
    doc.text(contact.phone || 'Not detected', margin + 110, y + 56);

    doc.text(new Date().toLocaleDateString(), margin + 375, y + 20);
    doc.text(contact.linkedin || 'Not detected', margin + 375, y + 38);
    doc.text(yearsExp, margin + 375, y + 56);

    y += 95;

    // Score Callout Box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 60, 8, 8, 'F');
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(21, 128, 61); // Green 700
    doc.text(`${score}%`, margin + 20, y + 38);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('OVERALL ATS READINESS SCORE', margin + 90, y + 24);
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const scoreText = score >= 85 
      ? 'Outstanding. Your resume exhibits top-tier compatibility across structure, contact validation, and layout schemas.'
      : score >= 60
      ? 'Moderate risk. Basic sections parse successfully, but multiple structural and keyword compliance risks are present.'
      : 'Critical failures detected. Your resume format blocks automated parsers, leading to automatic rejection.';
    doc.text(scoreText, margin + 90, y + 42);

    y += 85;

    // Score Breakdown Table
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Compliance Score Breakdown', margin, y);
    y += 15;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    const rowH = 20;
    const scoresList = [
      { name: 'Parsing Accuracy', val: `${parsedData.scores.parsingAccuracy}%`, desc: 'Measures how cleanly contact lines, headers, and text structures parse.' },
      { name: 'Section Recognition', val: `${parsedData.scores.sectionScore}%`, desc: 'Validates presence of core sections (Summary, Experience, Education).' },
      { name: 'Keyword Coverage', val: `${parsedData.scores.keywordScore}%`, desc: 'Measures alignment against industry skill profiles.' },
      { name: 'Formatting Safety', val: `${parsedData.scores.formattingScore}%`, desc: 'Evaluates layout constraints, column risks, and tabular elements.' }
    ];

    scoresList.forEach(item => {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(item.name, margin + 10, y + 14);

      doc.text(item.val, margin + 150, y + 14);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(item.desc, margin + 200, y + 14);

      y += rowH;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, pageWidth - margin, y);
    });

    y += 20;

    // Section 1: Executive Findings
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Key Structural Compliance Audit', margin, y);
    y += 15;
    
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    const auditPoints = [
      { metric: 'Profile Picture / Face Photo', status: contact.hasPhoto ? 'RISK FOUND' : 'PASS', note: contact.hasPhoto ? 'Photo detected. Visuals increase recruiter bias and cause parsing errors.' : 'Clean. No parsing-risk face photos detected.' },
      { metric: 'Personal Data Safeguard', status: (contact.hasDOB || contact.hasMaritalStatus || contact.hasIDNumber) ? 'RISK FOUND' : 'PASS', note: (contact.hasDOB || contact.hasMaritalStatus || contact.hasIDNumber) ? 'Contains DOB, marital status, or ID number. Keep details strictly private.' : 'Safe. No sensitive biographical identifiers detected.' },
      { metric: 'Contact Separators', status: 'PASS', note: 'Standard pipes or clear separators used for fast indexing.' },
      { metric: 'Hyperlink Validation', status: contact.linkedin ? 'PASS' : 'WARNING', note: contact.linkedin ? 'LinkedIn URL detected and parsed.' : 'Missing LinkedIn profile link in header.' }
    ];

    auditPoints.forEach(item => {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(item.metric, margin + 10, y + 12);
      
      const isPass = item.status === 'PASS';
      doc.setTextColor(isPass ? 21 : 185, isPass ? 128 : 28, isPass ? 61 : 28);
      doc.text(item.status, margin + 160, y + 12);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      y = addWrappedText(item.note, margin + 240, y + 12, 235, 9, 'normal', '#64748B', 12) - 12;

      y += 18;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, pageWidth - margin, y);
    });

    // ---------------- PAGE 2 ----------------
    doc.addPage();
    drawPageHeader(2);
    drawPageFooter();
    y = 90;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Detailed Recommendations', margin, y);
    y += 15;
    
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    if (recommendations.length === 0) {
      y = addWrappedText('Outstanding compliance. No structural formatting risks detected.', margin + 10, y, contentWidth - 20, 10, 'normal', '#475569', 15);
    } else {
      recommendations.forEach((rec, idx) => {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(rec.type === 'critical' ? 185 : 217, rec.type === 'critical' ? 28 : 119, rec.type === 'critical' ? 28 : 6);
        doc.text(`[${rec.type.toUpperCase()}]`, margin + 10, y);
        
        y = addWrappedText(rec.text, margin + 95, y, contentWidth - 110, 9.5, 'normal', '#1E293B', 14) + 6;
      });
    }

    y += 20;

    // Experience Quality Section
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Experience & Copywriting Quality', margin, y);
    y += 15;
    
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    const copyMetrics = [
      { label: 'STAR Method Alignment', val: expEval.usesStarMethod ? 'PASS' : 'FAIL', note: expEval.usesStarMethod ? 'Bullets are action-oriented and result-driven.' : 'Bullets read like basic responsibilities lists. Focus on your actions & outcomes.' },
      { label: 'Measurable Outcomes', val: expEval.hasMetrics ? 'PASS' : 'FAIL', note: expEval.hasMetrics ? 'Strong density of metrics, percentages, and stats.' : 'Lacks numbers/statistics. Recruiter databases value performance data.' },
      { label: 'Visual Skimmability', val: expEval.boldsFirstWords ? 'PASS' : 'FAIL', note: expEval.boldsFirstWords ? 'Bolded starting phrases assist fast visual scanning.' : 'Bolding first phrases assists recruiters skim-reading under 6 seconds.' }
    ];

    copyMetrics.forEach(item => {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(item.label, margin + 10, y + 12);

      const isPass = item.val === 'PASS';
      doc.setTextColor(isPass ? 21 : 185, isPass ? 128 : 28, isPass ? 61 : 28);
      doc.text(item.val, margin + 160, y + 12);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      y = addWrappedText(item.note, margin + 230, y + 12, 245, 9, 'normal', '#64748B', 12) - 12;

      y += 20;
    });

    // ---------------- PAGE 3 ----------------
    doc.addPage();
    drawPageHeader(3);
    drawPageFooter();
    y = 90;

    // Pitch Section
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Strategic Action Plan', margin, y);
    y += 20;

    y = addWrappedText(pitchCopy, margin, y, contentWidth, 10.5, 'normal', '#1E293B', 17);

    return doc;
  };

  // Calculate scores and categories
  const scores = parseResult?.scores ?? { parsingAccuracy: 0, sectionScore: 0, keywordScore: 0, formattingScore: 0, overallScore: 0 };
  const overallScore = scores.overallScore;
  const contact = parseResult?.contact ?? {};
  const sections = parseResult?.sections ?? {};
  const formatting = parseResult?.formatting ?? {};
  const expEval = parseResult?.experienceEvaluation ?? {};
  const recommendations = parseResult?.recommendations ?? [];
  const skills = parseResult?.skills ?? [];
  const yearsExp = parseResult?.yearsExp ?? 'Not detected';

  const educationFound = parseResult?.hasEducation || sections.education;
  const hasAchievements = parseResult?.hasAchievements || sections.achievements;

  // Determine warnings
  const privacyCheck = {
    hasPhoto: contact.hasPhoto,
    hasDOB: contact.hasDOB,
    hasMaritalStatus: contact.hasMaritalStatus,
    hasIDNumber: contact.hasIDNumber,
    hasFullAddress: contact.hasFullAddress
  };

  const formatCheck = {
    multiColumnRisk: formatting.multiColumnRisk,
    hasTables: formatting.hasTables,
    hasGraphics: formatting.hasGraphics,
    hasTextBoxes: formatting.hasTextBoxes,
    hasColoredTextOrBg: formatting.hasColoredTextOrBg,
    isOverTwoPages: formatting.isOverTwoPages,
    hasCreativeHeadings: formatting.hasCreativeHeadings,
    hasSpecialBullets: formatting.hasSpecialBullets
  };

  // Clean reset
  const reset = () => {
    setView('upload');
    setFile(null);
    setUploadError('');
    setCurrentStepIndex(-1);
    setStepStatuses({});
    setParseResult(null);
    setParseError('');
    setLeadStatus(null);
    setLeadError('');
  };

  // Determine score labels & text
  const scoreLabel = overallScore >= 85 ? 'Excellent Readiness' : overallScore >= 60 ? 'Moderate Risk' : 'Critical Rejection Risk';
  const scoreColor = overallScore >= 85 ? '#B7FF76' : overallScore >= 60 ? '#FFE66C' : '#FF5C35';

  const scoreText = overallScore >= 85
    ? 'Your CV matches leading technical standards. Standardized uppercase sections, clean structural layout, and standard body copy align perfectly with automated systems.'
    : overallScore >= 60
    ? 'Your CV passes basic parsing but is leaving points on the table. A strategic rewrite focused on STAR method, keywords, and formatting will significantly increase your interview call rate.'
    : 'Your CV is being rejected by automated systems before any human sees it. A full professional rewrite is not optional — it\'s urgent. Let\'s fix this together.';

  const ctaHeadline = overallScore >= 85 ? '🎯 Let\'s Polish Your Boardroom Profile' : '⚡ Your CV Is Leaking Interviews. Let\'s Fix It.';
  const ctaBody = overallScore >= 85
    ? 'Your structure is excellent. Now let\'s translate that structure into executive authority. Hire me to audit your copywriting line-by-line, bold your key achievements, and optimize your LinkedIn profile for headhunters.'
    : 'Automated screening rejects 75% of CVs before recruiters see them. Your scan shows critical formatting and keyword gaps. Let\'s do a complete professional rewrite to pass every check and get you booked for interviews.';

  const pitchCopy = `Dear ${contact.name || 'Candidate'},

Based on our simulator's live audit, your resume scored ${overallScore}% in overall ATS readiness. 

Here is what we discovered:
1. Formatting Vulnerability: ${formatting.multiColumnRisk ? 'The double-column structure runs a high risk of scrambling your career timeline.' : 'The overall structure is clean, but secondary items need alignment.'}
2. Copywriting Density: ${expEval.usesStarMethod ? 'You have action verbs, but they lack measurable outcomes.' : 'Your work bullets lack clear STAR metrics. We must quantify your impact.'}
3. Privacy Compliance: ${contact.hasPhoto ? 'Remove the photo to eliminate bias.' : 'Biographical safeguards are mostly in place.'}

What we do next:
If you want to secure high-ticket roles, we must rewrite your resume from scratch. We will remove all visual clutter, write impact-driven bullet points using the STAR method, and optimize your keywords to rank top 10% in employer databases.

Select one of the packages below to get started immediately.`;

  // ─── VIEW RENDERING ────────────────────────────────────────────────────────
  return (
    <div className="bg-black text-text-secondary min-h-screen font-sans antialiased">
      
      {view === 'upload' && (
        <div className="max-w-[800px] mx-auto px-6 py-12 text-left">
          {onBack && (
            <button 
              className="bg-transparent border-none text-text-secondary/60 hover:text-white flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer" 
              onClick={onBack}
            >
              <ArrowLeft size={16} /> Back to Services
            </button>
          )}

          {/* Header */}
          <div className="text-center mb-16 max-w-[700px] mx-auto">
            <div className="inline-flex bg-primary/10 border border-primary/20 rounded-[9999px] px-4 py-1.5 text-[11px] font-black tracking-wider uppercase text-primary mb-6">
              Free Tool
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-6 leading-tight">
              See What ATS Systems<br />Actually Read From Your CV
            </h1>
            <p className="text-sm md:text-base text-text-secondary/70 leading-relaxed max-w-[600px] mx-auto mb-10">
              Everybody talks about ATS. Very few people have actually seen one work. Upload your CV and watch a live ATS parse it — field by field — in real time.
            </p>

            {/* How it works mini-steps */}
            <div className="flex flex-wrap gap-2.5 justify-center items-center text-xs text-text-secondary/50 font-bold">
              {['📤 Upload CV', '→', '🔍 Live Parsing', '→', '📊 Your ATS Score', '→', '✅ Fix Issues'].map((s, i) => (
                <span key={i} className={s === '→' ? 'text-text-secondary/30' : 'text-text-secondary/80'}>{s}</span>
              ))}
            </div>
          </div>

          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-[30px] p-12 text-center transition-all duration-300 cursor-pointer ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : file 
                ? 'border-primary/40 bg-primary/5' 
                : 'border-white/10 hover:border-primary/40 hover:bg-primary/5'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              hidden
              onChange={(e) => { handleFileSelect(e.target.files?.[0]); e.target.value = ''; }}
            />

            {file ? (
              <div className="animate-fadeIn">
                <div className="text-4xl mb-4">📋</div>
                <div className="font-bold text-white text-base mb-1">
                  {file.name}
                </div>
                <div className="text-xs text-text-secondary/50 mb-6">
                  {(file.size / 1024).toFixed(1)} KB &bull; {file.name.split('.').pop().toUpperCase()}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setUploadError(''); }}
                  className="bg-transparent border border-white/10 text-text-secondary/60 hover:bg-white/5 text-xs font-bold px-5 py-2 rounded-full cursor-pointer transition-all"
                >
                  Change File
                </button>
              </div>
            ) : (
              <div>
                <div className="text-5xl mb-6">📄</div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Drop your CV here
                </h3>
                <p className="text-xs text-text-secondary/50 mb-6">
                  or click to select — PDF or DOCX supported
                </p>
                <span className="inline-flex bg-primary text-text-primary px-6 py-3 rounded-[9999px] text-xs font-extrabold hover:opacity-90 active:scale-95 transition-all">
                  Select File
                </span>
                <p className="mt-6 text-[10px] text-text-secondary/40 leading-relaxed max-w-[320px] mx-auto">
                  🔒 Secure processing. Your CV is analyzed directly in the browser and never stored on any server.
                </p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="bg-red-950/40 border border-red-900/50 rounded-[12px] p-4 mt-6 text-xs text-red-400 flex items-center gap-2">
              ⚠️ {uploadError}
            </div>
          )}

          {file && (
            <button
              onClick={runSimulation}
              className="w-full mt-6 py-4 bg-primary text-text-primary rounded-[9999px] text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-premium"
            >
              🔍 Start ATS Simulation
            </button>
          )}

          {/* What we check */}
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '👤', label: 'Contact Info', sub: 'Name, email, phone, LinkedIn' },
              { icon: '💼', label: 'Work Experience', sub: 'Titles, companies, dates' },
              { icon: '🎓', label: 'Education', sub: 'Degrees, institutions' },
              { icon: '⚙️', label: 'Skills & Keywords', sub: '300+ keyword dictionary' },
              { icon: '🧱', label: 'Formatting Safety', sub: 'Columns, tables, images' },
              { icon: '📊', label: 'ATS Readiness Score', sub: 'Weighted 4-dimension score' },
            ].map(item => (
              <div key={item.label} className="bg-[#0c0c0d] border border-white/5 rounded-[30px] p-6 flex gap-4 text-left items-start">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <div className="font-bold text-white text-xs mb-1">{item.label}</div>
                  <div className="text-[10px] text-text-secondary/50 leading-relaxed">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'parsing' && (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <div className="w-full max-w-[480px] text-center">
            {/* Header */}
            <div className="mb-10 text-center">
              <div className="text-5xl mb-4 animate-pulse">🤖</div>
              <h2 className="text-xl font-bold text-white mb-2">
                ATS Parsing In Progress
              </h2>
              <p className="text-text-secondary/50 text-xs">
                Watch exactly what the ATS sees — step by step
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-3 text-left">
              {PARSE_STEPS.map((step, idx) => {
                const status = stepStatuses[step.id];
                const isActive = idx === currentStepIndex && status === 'running';
                const isDone = status === 'done';
                const isError = status === 'error';
                const isPending = !status;

                let rowBg = 'bg-[#0c0c0d] border-white/5';
                if (isActive) rowBg = 'bg-primary/5 border-primary/20';
                if (isDone) rowBg = 'bg-green-500/5 border-green-500/10';
                if (isError) rowBg = 'bg-red-500/5 border-red-500/10';

                return (
                  <div 
                    key={step.id} 
                    className={`flex items-center gap-4 border rounded-[20px] p-4 transition-all duration-300 ${rowBg}`}
                  >
                    <div className="w-10 h-10 rounded-[12px] bg-white/5 flex items-center justify-center text-lg flex-shrink-0">
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm truncate ${isPending ? 'text-text-secondary/40' : 'text-white'}`}>
                        {step.label}
                      </div>
                      {isActive && <div className="text-[10px] text-primary font-black uppercase tracking-wider mt-1 animate-pulse">Scanning…</div>}
                      {isDone && <div className="text-[10px] text-green-400 font-black uppercase tracking-wider mt-1">Completed ✓</div>}
                      {isError && <div className="text-[10px] text-red-400 font-black uppercase tracking-wider mt-1">Failed ✗</div>}
                    </div>
                    <div className="flex-shrink-0">
                      {isActive && <div className="w-4 h-4 rounded-full border border-white/10 border-t-primary animate-spin" />}
                      {isDone && <span className="text-green-400 text-sm">✅</span>}
                      {isError && <span className="text-red-400 text-sm">❌</span>}
                      {isPending && <span className="text-white/10 text-xs font-bold">○</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {parseError && (
              <div className="mt-8 bg-red-950/20 border border-red-900/50 rounded-[20px] p-6 text-center">
                <div className="text-3xl mb-2">❌</div>
                <div className="font-bold text-white mb-2">Parsing Failed</div>
                <div className="text-xs text-red-400/80 mb-6 leading-relaxed">{parseError}</div>
                <button 
                  onClick={reset} 
                  className="bg-transparent border border-white/25 text-white hover:bg-white/5 text-xs font-bold px-6 py-2.5 rounded-full cursor-pointer transition-all"
                >
                  Try Another File
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'results' && parseResult && (
        <div className="max-w-[1200px] mx-auto px-6 py-12">

          {/* Back + New Scan */}
          <div className="flex justify-between items-center mb-10 flex-wrap gap-4 text-left">
            {onBack && (
              <button 
                className="bg-transparent border-none text-text-secondary/60 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer" 
                onClick={onBack}
              >
                <ArrowLeft size={16} /> Back to Services
              </button>
            )}
            <button 
              onClick={reset} 
              className="bg-transparent border border-white/10 text-text-secondary/60 hover:bg-white/5 text-xs font-bold px-4 py-2.5 rounded-full cursor-pointer transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={12} /> Scan Another CV
            </button>
          </div>

          {/* Scanned/image warning banner */}
          {parseResult.formatting.isLikelyScanned && (
            <div className="bg-red-950/20 border border-red-900/50 rounded-[30px] p-6 md:p-8 flex gap-4 items-start text-left mb-10">
              <span className="text-3xl flex-shrink-0">🚫</span>
              <div>
                <div className="font-bold text-red-400 text-sm mb-1.5">Scanned / Image-Based Document Detected</div>
                <p className="text-red-400/80 text-xs leading-relaxed">
                  This appears to be a scanned PDF or image. ATS systems cannot extract any text from it — meaning your CV reads as a blank document to recruiters' systems. You must re-create it as a proper text-based document.
                </p>
              </div>
            </div>
          )}

          {/* ── Score Overview ── */}
          <div className="bg-[#0c0c0d] border border-white/5 rounded-[30px] p-8 md:p-10 mb-10 text-left relative overflow-hidden shadow-premium">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
              <div className="max-w-[500px]">
                <div className="text-[10px] font-black uppercase tracking-wider text-text-secondary/40 mb-3">
                  ATS Simulation Complete
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-6 truncate" title={file?.name}>
                  {file?.name}
                </h2>
                <div className="flex items-center gap-6">
                  <div className="text-5xl md:text-6xl font-black tracking-tight leading-none" style={{ color: scoreColor }}>
                    {overallScore}<span className="text-2xl font-bold">%</span>
                  </div>
                  <div>
                    <div className="font-extrabold text-base leading-tight mb-1" style={{ color: scoreColor }}>{scoreLabel}</div>
                    <div className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-wider">Overall ATS Readiness</div>
                  </div>
                </div>
              </div>

              {/* Score breakdown rings */}
              <div className="flex flex-wrap gap-6 items-center">
                <ScoreRing score={scores.parsingAccuracy} label="Parsing Accuracy" />
                <ScoreRing score={scores.sectionScore} label="Sections Recognized" />
                <ScoreRing score={scores.keywordScore} label="Keyword Coverage" />
                <ScoreRing score={scores.formattingScore} label="Formatting Safety" />
              </div>
            </div>
          </div>

          {/* ── Results Grid ── */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">

            {/* Contact Info Extracted */}
            <div className="bg-[#0c0c0d] border border-white/5 rounded-[30px] p-6 md:p-8 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-6 flex items-center gap-2">
                👤 Contact Information Extracted
              </h3>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-text-secondary/40">Field</th>
                      <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-text-secondary/40">Extracted Value</th>
                      <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-text-secondary/40 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { field: 'Full Name', value: contact.name, found: !!contact.name },
                      { field: 'Email Address', value: contact.email, found: !!contact.email },
                      { field: 'Phone Number', value: contact.phone, found: !!contact.phone },
                      { field: 'LinkedIn URL', value: contact.linkedin, found: !!contact.linkedin },
                      { field: 'Location', value: contact.location, found: !!contact.location },
                      { field: 'Years of Experience', value: yearsExp, found: yearsExp !== 'Not detected' },
                    ].map(row => (
                      <tr key={row.field} className="border-b border-white/5 last:border-none">
                        <td className="py-3.5 font-bold text-white">{row.field}</td>
                        <td className="py-3.5 text-text-secondary/70 truncate max-w-[180px]">
                          {row.found ? row.value : '—'}
                        </td>
                        <td className="py-3.5 text-right"><StatusBadge found={row.found} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section Detection */}
            <div className="bg-[#0c0c0d] border border-white/5 rounded-[30px] p-6 md:p-8 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-6 flex items-center gap-2">
                📋 Resume Sections Detected
              </h3>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-text-secondary/40">Section</th>
                      <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-text-secondary/40 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Professional Summary', found: sections.summary },
                      { label: 'Work Experience', found: sections.experience },
                      { label: 'Education', found: educationFound },
                      { label: 'Skills', found: sections.skills },
                      { label: 'Certifications', found: sections.certifications },
                      { label: 'Languages', found: sections.languages },
                      { label: 'Measurable Achievements', found: hasAchievements },
                      { label: 'LinkedIn URL', found: !!contact.linkedin },
                    ].map(row => (
                      <tr key={row.label} className="border-b border-white/5 last:border-none">
                        <td className="py-3.5 font-bold text-white">{row.label}</td>
                        <td className="py-3.5 text-right"><StatusBadge found={row.found} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bias & Privacy Compliance */}
            <div className="bg-[#0c0c0d] border border-white/5 rounded-[30px] p-6 md:p-8 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-6 flex items-center gap-2">
                🛡️ Bias & Privacy Compliance
              </h3>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-text-secondary/40">Critical Audit Check</th>
                      <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-text-secondary/40 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3.5 font-bold text-white">Profile Photo / Headshot</td>
                      <td className="py-3.5 text-right">{privacyCheck.hasPhoto ? <StatusBadge warningText="Risk — Remove photo" /> : <StatusBadge found={true} okText="Clean" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Date of Birth / Age</td>
                      <td className="py-3.5 text-right">{privacyCheck.hasDOB ? <StatusBadge warningText="Risk — Remove age/DOB" /> : <StatusBadge found={true} okText="Clean" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Marital Status / Gender</td>
                      <td className="py-3.5 text-right">{privacyCheck.hasMaritalStatus ? <StatusBadge warningText="Risk — Remove status" /> : <StatusBadge found={true} okText="Clean" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">National ID / Passport No.</td>
                      <td className="py-3.5 text-right">{privacyCheck.hasIDNumber ? <StatusBadge warningText="Critical Risk — Remove ID" /> : <StatusBadge found={true} okText="Clean" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Full Street Address</td>
                      <td className="py-3.5 text-right">{privacyCheck.hasFullAddress ? <StatusBadge warningText="Use City, Country only" /> : <StatusBadge found={true} okText="Clean" />}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Formatting & Layout Safety */}
            <div className="bg-[#0c0c0d] border border-white/5 rounded-[30px] p-6 md:p-8 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-6 flex items-center gap-2">
                🧱 Formatting & Layout Safety
              </h3>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-text-secondary/40">ATS Readability Check</th>
                      <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-text-secondary/40 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3.5 font-bold text-white">Multi-column layout</td>
                      <td className="py-3.5 text-right">{formatCheck.multiColumnRisk ? <StatusBadge warningText="May scramble reading order" /> : <StatusBadge found={true} okText="Safe" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Layout tables used</td>
                      <td className="py-3.5 text-right">{formatCheck.hasTables ? <StatusBadge warningText="Tables detected" /> : <StatusBadge found={true} okText="Safe" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Graphics / progress bars / icons</td>
                      <td className="py-3.5 text-right">{formatCheck.hasGraphics ? <StatusBadge warningText="Graphics detected" /> : <StatusBadge found={true} okText="Safe" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Floating text boxes</td>
                      <td className="py-3.5 text-right">{formatCheck.hasTextBoxes ? <StatusBadge warningText="Text boxes detected" /> : <StatusBadge found={true} okText="Safe" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Colored text / backgrounds</td>
                      <td className="py-3.5 text-right">{formatCheck.hasColoredTextOrBg ? <StatusBadge warningText="Use black text on white paper" /> : <StatusBadge found={true} okText="Safe" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Page count under 2-page limit</td>
                      <td className="py-3.5 text-right">{formatCheck.isOverTwoPages ? <StatusBadge warningText="Exceeds 2-page cap" /> : <StatusBadge found={true} okText="Safe" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Standard uppercase headings</td>
                      <td className="py-3.5 text-right">{formatCheck.hasCreativeHeadings ? <StatusBadge warningText="Creative headers found" /> : <StatusBadge found={true} okText="Safe" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Standard bullet points</td>
                      <td className="py-3.5 text-right">{formatCheck.hasSpecialBullets ? <StatusBadge warningText="Decorative bullets found" /> : <StatusBadge found={true} okText="Safe" />}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* STAR Method & Experience Quality */}
            <div className="bg-[#0c0c0d] border border-white/5 rounded-[30px] p-6 md:p-8 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-6 flex items-center gap-2">
                ✍️ Experience Quality (STAR Method)
              </h3>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-text-secondary/40">Resume Writing Metric</th>
                      <th className="pb-3 text-[10px] font-black uppercase tracking-wider text-text-secondary/40 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3.5 font-bold text-white">Uses STAR Method structure</td>
                      <td className="py-3.5 text-right">{expEval.usesStarMethod ? <StatusBadge found={true} okText="Yes" /> : <StatusBadge warningText="Lacks STAR format" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Quantified metrics & results</td>
                      <td className="py-3.5 text-right">{expEval.hasMetrics ? <StatusBadge found={true} okText="Yes" /> : <StatusBadge warningText="Lacks metrics/statistics" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Bolds first 3-5 words of bullets</td>
                      <td className="py-3.5 text-right">{expEval.boldsFirstWords ? <StatusBadge found={true} okText="Yes" /> : <StatusBadge warningText="No bolded first phrase" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Bolds numbers and percentages</td>
                      <td className="py-3.5 text-right">{expEval.boldsMetrics ? <StatusBadge found={true} okText="Yes" /> : <StatusBadge warningText="No bolded metrics" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">Proper capitalization & full stops</td>
                      <td className="py-3.5 text-right">{expEval.grammarCapitalizationAndPeriods ? <StatusBadge found={true} okText="Yes" /> : <StatusBadge warningText="Inconsistent endings" />}</td>
                    </tr>
                    <tr className="border-t border-white/5">
                      <td className="py-3.5 font-bold text-white">No raw asterisks in copy</td>
                      <td className="py-3.5 text-right">{expEval.rawAsterisksFound ? <StatusBadge warningText="Asterisks found (e.g. *247#)" /> : <StatusBadge found={true} okText="Yes" />}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Skills & Keywords */}
            <div className="bg-[#0c0c0d] border border-white/5 rounded-[30px] p-6 md:p-8 text-left">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-6 flex items-center gap-2">
                ⚙️ Skills & Keywords Recognised ({skills.length})
              </h3>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-6">
                  {skills.slice(0, 30).map(skill => (
                    <span key={skill} className="bg-primary/10 border border-primary/20 text-primary rounded-[9999px] px-3 py-1 text-[10px] font-black tracking-wide uppercase">{skill}</span>
                  ))}
                  {skills.length > 30 && (
                    <span className="text-[10px] text-text-secondary/40 font-bold w-full mt-2">
                      +{skills.length - 30} more keywords detected
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="text-3xl mb-2">🔴</div>
                  <div className="font-bold text-white text-sm mb-1">No recognisable skills found</div>
                  <div className="text-xs text-text-secondary/50">Add a dedicated skills section with industry keywords</div>
                </div>
              )}

              <div className="pt-6 border-t border-white/5 text-[10px] text-text-secondary/40 font-semibold">
                📌 Skills detected against a dictionary of 300+ keywords across tech, finance, HR, and more.
              </div>
            </div>
          </div>


          {/* ── Recruiter View ── */}
          <div className="bg-[#0c0c0d] border border-white/5 rounded-[30px] p-6 md:p-8 text-left mb-8">
            <h3 className="text-sm font-black uppercase tracking-wider text-white mb-2 flex items-center gap-2">
              👁️ Recruiter View — What the ATS Actually Shows Recruiters
            </h3>
            <p className="text-xs text-text-secondary/50 mb-6 leading-relaxed">
              Recruiters using ATS software don't see your beautiful design. They see structured data — like this:
            </p>
            <div className="bg-black border border-white/5 rounded-[24px] p-6 font-mono text-[11px] text-text-secondary/60 leading-relaxed overflow-x-auto">
              <div className="text-[#38BDF8] font-bold mb-3">// ATS Parsed Profile</div>
              <div><span className="text-[#FB7185]">Name:</span> <span className="text-white">{contact.name || '⚠️ NOT DETECTED'}</span></div>
              <div><span className="text-[#FB7185]">Email:</span> <span className="text-white">{contact.email || '⚠️ NOT DETECTED'}</span></div>
              <div><span className="text-[#FB7185]">Phone:</span> <span className="text-white">{contact.phone || '⚠️ NOT DETECTED'}</span></div>
              <div><span className="text-[#FB7185]">LinkedIn:</span> <span className="text-white">{contact.linkedin || '⚠️ NOT DETECTED'}</span></div>
              <div><span className="text-[#FB7185]">Experience:</span> <span className="text-white">{yearsExp}</span></div>
              <div><span className="text-[#FB7185]">Education:</span> <span className="text-white">{hasEducation ? '✓ Detected' : '⚠️ NOT DETECTED'}</span></div>
              <div><span className="text-[#FB7185]">Skills ({skills.length}):</span> <span className="text-white">{skills.slice(0, 8).join(', ') || '⚠️ NONE FOUND'}{skills.length > 8 ? ` +${skills.length - 8} more` : ''}</span></div>
              <div><span className="text-[#FB7185]">ATS Score:</span> <span className="font-black" style={{ color: scoreColor }}>{overallScore}%</span></div>
            </div>
          </div>

          {/* ── Recommendations ── */}
          {recommendations.length > 0 && (
            <div className="bg-[#0c0c0d] border border-white/5 rounded-[30px] p-6 md:p-8 text-left mb-8">
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-6">
                📝 ATS Recommendations ({recommendations.length})
              </h3>
              <div className="space-y-3.5">
                {recommendations.map((rec, i) => {
                  let alertStyle = '';
                  if (rec.type === 'critical') alertStyle = 'bg-red-950/20 border-red-900/50 text-red-400';
                  else if (rec.type === 'warning') alertStyle = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500';
                  else alertStyle = 'bg-green-500/10 border-green-500/20 text-green-400';

                  const icon = rec.type === 'critical' ? '🚨' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
                  return (
                    <div key={i} className={`border rounded-[16px] p-4 flex gap-3 items-start text-xs ${alertStyle}`}>
                      <span className="flex-shrink-0 text-base">{icon}</span>
                      <span className="leading-relaxed font-semibold">{rec.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── High-Ticket Upsell Funnel ── */}
          <div className="bg-gradient-to-b from-[#0c0c0d] to-black border border-white/5 rounded-[30px] p-8 md:p-12 text-center relative overflow-hidden shadow-premium mt-12">
            <div className="max-w-[800px] mx-auto text-left md:text-center mb-12">
              <div className="text-4xl mb-4">{overallScore >= 85 ? '🎯' : overallScore >= 60 ? '⚡' : '🚨'}</div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
                {ctaHeadline}
              </h2>
              <p className="text-sm md:text-base text-text-secondary/70 leading-relaxed max-w-[620px] mx-auto">
                {ctaBody}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-[960px] mx-auto text-left">
              
              {/* ATS Blueprint - Low Tier Upsell */}
              <div className="bg-[#0f0f11] border border-white/5 rounded-[24px] p-8 flex flex-col hover:border-primary/30 transition-all duration-300">
                <span className="inline-flex bg-white/5 border border-white/10 rounded-full px-3.5 py-1 text-[9px] font-black uppercase tracking-wider text-text-secondary/60 mb-4 self-start">
                  Do It Yourself
                </span>
                <h3 className="text-lg font-black text-white mb-1">The ATS Blueprint</h3>
                <div className="text-2xl font-black text-primary mb-6">999 KES</div>
                <p className="text-xs text-text-secondary/50 leading-relaxed mb-6 flex-grow">
                  Get the exact templates and keyword strategies I use to write executive resumes. Includes your premium PDF audit report.
                </p>
                <ul className="text-xs text-text-secondary/70 space-y-3.5 mb-8">
                  <li className="flex items-center gap-2 font-semibold"><Check size={12} className="text-primary" /> Premium PDF Audit Report</li>
                  <li className="flex items-center gap-2 font-semibold"><Check size={12} className="text-primary" /> ATS-Compliant Word Templates</li>
                  <li className="flex items-center gap-2 font-semibold"><Check size={12} className="text-primary" /> Action Verb Dictionary</li>
                </ul>
                <button
                  onClick={() => {
                    setExportEmail(contact.email || '');
                    setShowExportModal({ type: 'ats_blueprint', price: 999, title: 'The ATS Blueprint' });
                    setExportError('');
                    setExportStatus('');
                  }}
                  className="w-full bg-transparent hover:bg-white/5 border border-white/10 text-white font-extrabold py-3.5 rounded-[9999px] text-xs transition-all cursor-pointer text-center"
                >
                  Get The Blueprint
                </button>
              </div>

              {/* Executive Rewrite - High Tier Upsell */}
              <div className="bg-primary border border-primary/20 rounded-[24px] p-8 flex flex-col hover:opacity-95 transition-all duration-300 shadow-premium relative">
                <span className="inline-flex bg-black/10 border border-black/10 rounded-full px-3.5 py-1 text-[9px] font-black uppercase tracking-wider text-text-primary mb-4 self-start">
                  Done For You
                </span>
                <h3 className="text-lg font-black text-text-primary mb-1">Executive Resume Rewrite</h3>
                <div className="text-2xl font-black text-text-primary mb-6">9,500 KES</div>
                <p className="text-xs text-text-primary/70 leading-relaxed mb-6 flex-grow">
                  I will personally rewrite your CV from scratch, optimizing it for ATS systems and human recruiters to land high-paying interviews.
                </p>
                <ul className="text-xs text-text-primary/95 space-y-3.5 mb-8">
                  <li className="flex items-center gap-2 font-extrabold"><Check size={12} className="text-text-primary" /> Full Strategic Rewrite</li>
                  <li className="flex items-center gap-2 font-extrabold"><Check size={12} className="text-text-primary" /> LinkedIn Profile Optimization</li>
                  <li className="flex items-center gap-2 font-extrabold"><Check size={12} className="text-text-primary" /> Cover Letter Template</li>
                  <li className="flex items-center gap-2 font-extrabold"><Check size={12} className="text-text-primary" /> Bonus: Career Academy Access</li>
                </ul>
                <button
                  onClick={() => {
                    setExportEmail(contact.email || '');
                    setShowExportModal({ type: 'career_service', packageId: 'executive', price: 9500, title: 'Executive Resume Rewrite' });
                    setExportError('');
                    setExportStatus('');
                  }}
                  className="w-full bg-black hover:opacity-90 text-white font-extrabold py-3.5 rounded-[9999px] text-xs transition-all cursor-pointer text-center"
                >
                  Hire Duncan To Rewrite It
                </button>
              </div>

            </div>
            
            <div className="text-center mt-12">
              <a 
                className="inline-flex items-center gap-1.5 text-xs text-text-secondary/50 hover:text-white font-bold transition-colors" 
                href={`https://wa.me/254794877125?text=Hi%20Duncan%2C%20I%20just%20ran%20my%20CV%20through%20your%20ATS%20Simulator%20and%20got%20a%20score%20of%20${overallScore}%25.%20I%27d%20like%20help%20improving%20it.`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                💬 Have questions? Message Duncan directly on WhatsApp
              </a>
            </div>
          </div>

        </div>
      )}

      {/* ── Payment Modal ── */}
"""

# Replace contents
result_content = content[:start_idx] + new_code + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(result_content)

print("Replacement completed successfully!")
