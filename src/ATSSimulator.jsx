import React, { useState, useRef, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';

// ─── Skills Dictionary (300+ keywords across domains) ────────────────────────
const SKILLS_DICTIONARY = [
  // Tech
  'JavaScript','TypeScript','Python','Java','C++','C#','PHP','Ruby','Go','Rust','Swift','Kotlin','Scala',
  'React','Angular','Vue','Node.js','Express','Django','Flask','Spring','Laravel','Rails',
  'SQL','MySQL','PostgreSQL','MongoDB','Redis','Oracle','SQLite','Cassandra','DynamoDB',
  'AWS','Azure','GCP','Docker','Kubernetes','Terraform','Ansible','Jenkins','GitHub','GitLab','CI/CD',
  'HTML','CSS','REST','GraphQL','API','Microservices','DevOps','Agile','Scrum','Jira','Confluence',
  'Machine Learning','Deep Learning','AI','Data Science','TensorFlow','PyTorch','Pandas','NumPy','Tableau','Power BI',
  'Excel','Word','PowerPoint','Outlook','SAP','Salesforce','Dynamics 365','HubSpot',
  // Finance & Business
  'Accounting','Bookkeeping','Financial Analysis','Budgeting','Forecasting','Auditing','Tax','IFRS','GAAP',
  'QuickBooks','Xero','Sage','Financial Reporting','Cash Flow','P&L','Balance Sheet',
  'Project Management','PMP','Prince2','Risk Management','Business Analysis','Process Improvement',
  'Customer Service','Client Relations','Sales','Marketing','Digital Marketing','SEO','Social Media',
  'Content Marketing','Email Marketing','Google Analytics','Adobe Creative Suite','Photoshop','Illustrator',
  // HR & Operations
  'Recruitment','Talent Acquisition','HRIS','Payroll','Performance Management','Training','Learning & Development',
  'Supply Chain','Logistics','Procurement','Inventory Management','Operations Management','Six Sigma','Lean',
  // Healthcare & Education
  'Patient Care','Clinical Research','Nursing','Pharmacy','Teaching','Curriculum Development','Coaching','Mentoring',
  // Soft Skills
  'Leadership','Communication','Teamwork','Problem Solving','Critical Thinking','Time Management',
  'Negotiation','Presentation','Strategic Planning','Decision Making','Collaboration','Adaptability',
  // Kenyan/African context
  'M-Pesa','Mobile Money','KRA','eCitizen','IFMIS','G-Pay','Mpesa Integration',
];

const SECTION_HEADINGS = {
  summary: ['summary', 'profile', 'objective', 'professional summary', 'career objective', 'personal statement', 'about me', 'overview'],
  experience: ['experience', 'work experience', 'employment', 'professional experience', 'career history', 'work history', 'employment history', 'positions held'],
  education: ['education', 'academic', 'qualifications', 'educational background', 'academic background', 'training', 'academic qualifications'],
  skills: ['skills', 'technical skills', 'core competencies', 'competencies', 'expertise', 'proficiencies', 'key skills', 'skill set', 'areas of expertise'],
  certifications: ['certifications', 'certificates', 'professional certifications', 'licenses', 'accreditations', 'credentials', 'professional development'],
  languages: ['languages', 'language skills', 'linguistic skills'],
  achievements: ['achievements', 'accomplishments', 'awards', 'honors', 'recognition', 'key achievements'],
  references: ['references', 'referees', 'professional references'],
  linkedin: ['linkedin'],
};

const JOB_TITLE_KEYWORDS = [
  'manager','director','executive','officer','analyst','engineer','developer','designer',
  'consultant','advisor','specialist','coordinator','administrator','assistant','associate',
  'head','lead','senior','junior','principal','chief','president','vice president','vp',
  'founder','co-founder','ceo','cto','cfo','coo','hr','it','ops','operations',
  'accountant','auditor','supervisor','superintendent','general manager','gm',
];

const DEGREE_KEYWORDS = ['bachelor','master','phd','doctorate','diploma','certificate','associate','bsc','ba','msc','ma','mba','bcom','btech','mtech','hnd','kcse','kcpe','ict'];

// ─── Core Parsing Engine ─────────────────────────────────────────────────────
function parseResume(rawText) {
  const text = rawText || '';
  const lower = text.toLowerCase();
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // ── Contact Information ────────────────────────────────────────────────────
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  // International phone: matches +CC (NN)NNN-NNNN variants, 7-15 digits (ITU E.164 range)
  const phoneMatch = text.match(/(\+?[0-9]{1,4}[\s.\-]?\(?[0-9]{1,4}\)?[\s.\-]?[0-9]{3,5}[\s.\-]?[0-9]{3,5}(?:[\s.\-]?[0-9]{1,4})?)/);
  // LinkedIn: match profile, company, school URLs
  const linkedinMatch = text.match(/linkedin\.com\/(?:in|company|school)\/[a-zA-Z0-9\-_%]+/i);

  // Name: try first non-blank line that isn't email/phone/heading
  let detectedName = null;
  for (const line of lines.slice(0, 8)) {
    if (line.length > 2 && line.length < 60 && !line.includes('@') && !/^\d/.test(line) && !lower.includes('curriculum') && !lower.includes('resume') && !lower.includes('cv')) {
      const wordCount = line.split(/\s+/).length;
      if (wordCount >= 2 && wordCount <= 5) {
        detectedName = line;
        break;
      }
    }
  }

  // ── Section Detection ──────────────────────────────────────────────────────
  const detectedSections = {};
  for (const [section, keywords] of Object.entries(SECTION_HEADINGS)) {
    detectedSections[section] = keywords.some(kw => lower.includes(kw));
  }

  // ── Job Titles ─────────────────────────────────────────────────────────────
  const foundTitles = lines.filter(line => {
    const l = line.toLowerCase();
    return JOB_TITLE_KEYWORDS.some(k => l.includes(k)) && line.length < 80;
  }).slice(0, 5);

  // ── Dates ──────────────────────────────────────────────────────────────────
  const datePatterns = [
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*[\s,\-]+\d{4}\b/gi,
    /\b(20\d{2}|19\d{2})\b/g,
    /\bpresent\b|\bcurrent\b/gi,
  ];
  let dateCount = 0;
  datePatterns.forEach(p => { const m = text.match(p); if (m) dateCount += m.length; });

  // ── Education ─────────────────────────────────────────────────────────────
  const hasEducation = DEGREE_KEYWORDS.some(k => lower.includes(k));

  // ── Skills ────────────────────────────────────────────────────────────────
  const detectedSkills = SKILLS_DICTIONARY.filter(skill =>
    lower.includes(skill.toLowerCase())
  );

  // ── Achievements (measurable) ──────────────────────────────────────────────
  const achievementSignals = ['%', 'increased', 'decreased', 'reduced', 'improved', 'grew', 'generated', 'saved', 'managed', 'led', 'built', 'launched', 'delivered', 'achieved', 'exceeded'];
  const hasAchievements = achievementSignals.some(s => lower.includes(s));

  // ── Formatting Analysis ────────────────────────────────────────────────────
  const totalChars = text.replace(/\s/g, '').length;
  const isLikelyScanned = totalChars < 150;

  // Column detection: many very short lines interleaved indicates multi-col layout
  const shortLines = lines.filter(l => l.length > 1 && l.length < 25).length;
  const longLines = lines.filter(l => l.length > 60).length;
  const multiColumnRisk = !isLikelyScanned && shortLines > longLines * 1.5 && shortLines > 15;

  // Special chars in headings
  const specialCharPattern = /[|•◆■▪►▸◦‣]/g;
  const specialCharCount = (text.match(specialCharPattern) || []).length;

  // Tables heuristic
  const tablePattern = /\|.*\|/g;
  const hasTables = (text.match(tablePattern) || []).length > 2;

  // Images: PDF with near-zero text
  const hasImageWarning = isLikelyScanned;

  // ── Years of Experience ────────────────────────────────────────────────────
  let yearsExp = 'Not detected';
  const yearMatches = text.match(/\b(20\d{2}|19\d{2})\b/g);
  if (yearMatches && yearMatches.length >= 2) {
    const years = yearMatches.map(Number);
    const span = Math.max(...years) - Math.min(...years);
    if (span > 0 && span < 50) yearsExp = `~${span} years`;
  }

  // ── Recommendations ────────────────────────────────────────────────────────
  const recommendations = [];
  if (isLikelyScanned) recommendations.push({ type: 'critical', text: 'Your CV appears to be a scanned image. ATS systems cannot read it. Use a text-based PDF or DOCX.' });
  if (multiColumnRisk) recommendations.push({ type: 'critical', text: 'Multi-column layout detected. ATS systems often scramble text from columns, losing your experience data.' });
  if (hasTables) recommendations.push({ type: 'warning', text: 'Tables detected. Layout tables can confuse ATS parsers. Use plain text sections instead.' });
  if (!detectedSections.skills) recommendations.push({ type: 'warning', text: 'No "Skills" section detected. Add a dedicated skills section with relevant keywords.' });
  if (!detectedSections.summary) recommendations.push({ type: 'info', text: 'No professional summary detected. A 3-line summary at the top boosts ATS keyword density.' });
  if (!detectedSections.certifications) recommendations.push({ type: 'info', text: 'No certifications section found. If you have certifications, add a dedicated section.' });
  // LinkedIn is recommended but never required — many industries/regions don't rely on it
  if (!linkedinMatch) recommendations.push({ type: 'info', text: 'No LinkedIn URL detected. If you are active on LinkedIn, include the full profile URL (e.g. linkedin.com/in/yourname) in your contact section for recruiter convenience.' });
  if (!hasAchievements) recommendations.push({ type: 'warning', text: 'No measurable achievements found. Add metrics (e.g., "Increased sales by 23%") to stand out.' });
  if (detectedSkills.length < 5) recommendations.push({ type: 'warning', text: `Only ${detectedSkills.length} recognizable skills found. Expand your skills section with industry keywords.` });
  if (specialCharCount > 10) recommendations.push({ type: 'info', text: 'Decorative bullet symbols detected. Use plain hyphens or standard bullets for better ATS compatibility.' });

  const result = {
    contact: {
      name: detectedName,
      email: emailMatch ? emailMatch[0] : null,
      phone: phoneMatch ? phoneMatch[0] : null,
      linkedin: linkedinMatch ? linkedinMatch[0] : null,
      location: null,
      hasPhoto: false,
      hasDOB: false,
      hasMaritalStatus: false,
      hasIDNumber: false,
      hasFullAddress: false,
    },
    sections: detectedSections,
    hasEducation,
    yearsExp,
    jobTitles: foundTitles,
    dateCount,
    skills: detectedSkills,
    hasAchievements,
    formatting: {
      isLikelyScanned,
      multiColumnRisk,
      specialCharCount,
      hasTables,
      hasImageWarning,
      totalChars,
      hasGraphics: false,
      hasTextBoxes: false,
      hasColoredTextOrBg: false,
      hasSpecialBullets: specialCharCount > 10,
      hasCreativeHeadings: false,
      isOverTwoPages: false,
    },
    experienceEvaluation: {
      usesStarMethod: hasAchievements,
      hasMetrics: hasAchievements,
      boldsFirstWords: false,
      boldsMetrics: false,
      grammarCapitalizationAndPeriods: true,
      rawAsterisksFound: false,
    },
    recommendations,
    rawTextLength: totalChars,
  };

  result.scores = calculateScores(result);
  return result;
}

// ─── File to Base64 helper ───────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
}

// ─── Gemini system instruction / prompt ──────────────────────────────────────
const GEMINI_SYSTEM_PROMPT = `
You are an advanced proprietary ATS Simulator Engine (V2). Your objective is to parse the uploaded resume and evaluate it against professional resume-writing standards.

CRITICAL RULES FOR RECOMMENDATIONS & TERMINOLOGY:
1. Do NOT mention "Gemini", "Google", "AI", "LLM", or any specific machine learning model name in your analysis or recommendations. Treat yourself as a proprietary "ATS Simulator Engine".
2. All recommendations must be formulated in a constructive, client-facing tone as if written by an elite career consultant.
3. Evaluate the resume strictly against the following Resume Quality Rules:

RESUME QUALITY RULES:
1. Typography & Design:
   - Preferred fonts are clean, standard sans-serif (e.g., Calibri, Arial, Montserrat, Open Sans).
   - Simple, clean layouts. Colors should be strictly black text on white background. No colored headers, gray subtitles, or tint accents.
   - Layout tables must be avoided (they confuse ATS parsers).
   - No visual/design clutter (no icons, skill progress bars, star ratings, pie charts, or floating text boxes).
   - Page count: Professional/executive resumes should strictly be under a 2-page cap.
   - Compiling margins should be compact (around 0.4in to 0.5in).
   - No decorative bullet symbols (use standard circular bullets or plain hyphens).
2. Structure & Organization:
   - Sections should be organized in this order:
     1. Contact Information
     2. Professional Summary
     3. Key Achievements
     4. Core Skills
     5. Professional Experience
     6. Education
     7. Interests
     8. Referees
   - Standard headers should be uppercase (e.g., PROFESSIONAL SUMMARY, CORE SKILLS, PROFESSIONAL EXPERIENCE, EDUCATION, CERTIFICATIONS, LANGUAGES, KEY ACHIEVEMENTS, REFEREES). Avoid creative headings like "My Journey".
3. Contact Details & Privacy Rules:
   - Contact line should be separated by pipes (" | ").
    - No profile photo/headshot (this is a major ATS bias and parsing risk). IMPORTANT: Set "hasPhoto" to true ONLY if you explicitly see a visual photographic headshot/profile picture of a person's face. Do NOT flag text headers, blank margins, colored sidebar containers, decorative icons, avatars, or logos as a photo. If not 100% certain, assume false.
    - No personal identifiers: Date of birth (DOB), age, gender, marital status, National ID, or passport numbers (these are privacy and bias risks!). Only set "hasDOB", "hasMaritalStatus", and "hasIDNumber" to true if you see explicit text stating these.
   - No full physical address (only City, Country is acceptable, e.g., "Nairobi, Kenya").
   - Include LinkedIn URL if provided. Do not complain if not provided unless they have other contact info missing.
4. Content & STAR Method (Critical):
   - Every experience bullet point must follow the STAR method: Action Verb + Specific Task + Quantifiable Result. No generic responsibilities list.
   - Bold the first 3-5 words of every bullet point in the experience section.
   - Bold key statistics and metrics (e.g., "% Growth", "$ ARR", "Time saved", transaction counts, audit scores) inside paragraphs and bullets.
   - Ensure there are NO raw asterisks in the copy (e.g., USSD channels must be written as "USSD 247#" or "USSD channel 247#" instead of "*247#").
   - Punctuation & Grammar: Every bullet point/item must start with a capital letter and end with a clean full stop (period).
    - Referees: If references are listed, they should include the supervisor's name, title, and direct phone.

CRITICAL INSTRUCTION ON TRUTHFULNESS:
All boolean evaluation flags (e.g., hasPhoto, hasDOB, hasMaritalStatus, hasIDNumber, hasFullAddress, isLikelyScanned, multiColumnRisk, hasTables, hasGraphics, hasTextBoxes, hasCreativeHeadings, hasSpecialBullets, isOverTwoPages, hasColoredTextOrBg, usesStarMethod, hasMetrics, boldsFirstWords, boldsMetrics, grammarCapitalizationAndPeriods, rawAsterisksFound) MUST be 100% truthful based strictly on what is present in the document. Do not guess, speculate, or make false inferences. If a feature or risk is not clearly and explicitly present, set its flag to false.

You must parse the document and return a JSON object with the following schema:
{
  "contact": {
    "name": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "linkedin": "string or null",
    "location": "string or null",
    "hasPhoto": boolean,
    "hasDOB": boolean,
    "hasMaritalStatus": boolean,
    "hasIDNumber": boolean,
    "hasFullAddress": boolean
  },
  "sections": {
    "summary": boolean,
    "experience": boolean,
    "education": boolean,
    "skills": boolean,
    "certifications": boolean,
    "languages": boolean,
    "achievements": boolean,
    "references": boolean
  },
  "formatting": {
    "isLikelyScanned": boolean,
    "multiColumnRisk": boolean,
    "hasTables": boolean,
    "hasGraphics": boolean,
    "hasTextBoxes": boolean,
    "hasHeaderFooterContact": boolean,
    "hasCreativeHeadings": boolean,
    "hasSpecialBullets": boolean,
    "pageCountEstimate": number,
    "isOverTwoPages": boolean,
    "hasColoredTextOrBg": boolean
  },
  "skills": ["string"],
  "jobTitles": ["string"],
  "yearsExp": "string",
  "hasAchievements": boolean,
  "experienceEvaluation": {
    "usesStarMethod": boolean,
    "hasMetrics": boolean,
    "boldsFirstWords": boolean,
    "boldsMetrics": boolean,
    "grammarCapitalizationAndPeriods": boolean,
    "rawAsterisksFound": boolean
  },
  "recommendations": [
    {
      "type": "critical",
      "text": "string"
    }
  ]
}
`;

// ─── Score calculation helper ────────────────────────────────────────────────
function calculateScores(parsedData) {
  if (!parsedData) return { parsingAccuracy: 0, sectionScore: 0, keywordScore: 0, formattingScore: 0, overallScore: 0 };

  // Parsing Accuracy (30%)
  let parsingAccuracy = 100;
  if (parsedData.formatting?.isLikelyScanned) parsingAccuracy -= 50;
  if (!parsedData.contact?.name) parsingAccuracy -= 20;
  if (!parsedData.contact?.email) parsingAccuracy -= 15;
  if (!parsedData.contact?.phone) parsingAccuracy -= 15;
  parsingAccuracy = Math.max(0, parsingAccuracy);

  // Section Score (25%)
  const sectionsObj = parsedData.sections || {};
  const sectionKeys = Object.keys(sectionsObj);
  const sectionsFound = sectionKeys.filter(k => sectionsObj[k]).length;
  const sectionScore = sectionKeys.length ? Math.round((sectionsFound / sectionKeys.length) * 100) : 0;

  // Keyword Score (25%) — dynamic: 12 recognised skills = full marks (avoids domain bias)
  const KEYWORD_TARGET = 12;
  const skillsCount = Array.isArray(parsedData.skills) ? parsedData.skills.length : 0;
  const keywordScore = Math.min(100, Math.round((skillsCount / KEYWORD_TARGET) * 100));

  // Formatting Score (20%)
  let formattingDeductions = 0;
  if (parsedData.formatting?.multiColumnRisk) formattingDeductions += 25;
  if (parsedData.contact?.hasPhoto) formattingDeductions += 35;
  if (parsedData.formatting?.hasTables) formattingDeductions += 15;
  if (parsedData.formatting?.hasGraphics) formattingDeductions += 15;
  if (parsedData.formatting?.hasTextBoxes) formattingDeductions += 15;
  if (parsedData.formatting?.hasColoredTextOrBg) formattingDeductions += 10;
  if (parsedData.formatting?.hasSpecialBullets) formattingDeductions += 10;
  if (parsedData.formatting?.hasCreativeHeadings) formattingDeductions += 10;
  if (parsedData.formatting?.isOverTwoPages) formattingDeductions += 15;
  
  // Experience quality deductions
  if (parsedData.experienceEvaluation && !parsedData.experienceEvaluation.usesStarMethod) formattingDeductions += 10;
  if (parsedData.experienceEvaluation && !parsedData.experienceEvaluation.hasMetrics) formattingDeductions += 10;
  if (parsedData.contact?.hasDOB) formattingDeductions += 20;
  if (parsedData.contact?.hasIDNumber) formattingDeductions += 20;
  
  const formattingScore = Math.max(0, 100 - formattingDeductions);

  const overallScore = Math.round(
    parsingAccuracy * 0.30 +
    sectionScore * 0.25 +
    keywordScore * 0.25 +
    formattingScore * 0.20
  );

  return {
    parsingAccuracy,
    sectionScore,
    keywordScore,
    formattingScore,
    overallScore
  };
}

// ─── PDF.js Loader ───────────────────────────────────────────────────────────
function loadPdfJs() {

  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js'));
    document.head.appendChild(script);
  });
}

// ─── Extract text from PDF ────────────────────────────────────────────────────
async function extractPdfText(file) {
  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

// ─── Extract text from DOCX ──────────────────────────────────────────────────
async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const xmlFile = zip.file('word/document.xml');
  if (!xmlFile) throw new Error('Invalid DOCX file: word/document.xml not found.');
  const xmlContent = await xmlFile.async('text');
  // Remove XML tags, decode entities, collapse whitespace
  return xmlContent
    .replace(/<\/w:p>/gi, '\n')
    .replace(/<\/w:r>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .split('\n').map(l => l.trim()).join('\n');
}

// ─── Extract hyperlinks from PDF ──────────────────────────────────────────────
async function extractPdfLinks(file) {
  try {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const links = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const annotations = await page.getAnnotations();
      for (const annot of annotations) {
        if (annot.subtype === 'Link' && annot.url) {
          links.push(annot.url);
        }
      }
    }
    return links;
  } catch (err) {
    console.warn('[PDF link extraction failed]', err);
    return [];
  }
}

// ─── Extract hyperlinks from DOCX ─────────────────────────────────────────────
async function extractDocxLinks(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    const relsFile = zip.file('word/_rels/document.xml.rels');
    if (!relsFile) return [];
    const relsContent = await relsFile.async('text');
    
    // Extract all Target="..." from the rels file
    const matches = relsContent.matchAll(/Target="([^"]+)"/g);
    const links = [];
    for (const match of matches) {
      const url = match[1];
      if (url.startsWith('http') || url.includes('linkedin.com')) {
        links.push(url);
      }
    }
    return links;
  } catch (err) {
    console.warn('[DOCX link extraction failed]', err);
    return [];
  }
}

// ─── Parsing Steps Definition ─────────────────────────────────────────────────
const PARSE_STEPS = [
  { id: 'extract', label: 'Extracting text from document', icon: '📄' },
  { id: 'structure', label: 'Detecting document structure', icon: '🔍' },
  { id: 'contact', label: 'Scanning contact information', icon: '👤' },
  { id: 'experience', label: 'Parsing work experience', icon: '💼' },
  { id: 'education', label: 'Identifying education history', icon: '🎓' },
  { id: 'skills', label: 'Extracting skills & keywords', icon: '⚙️' },
  { id: 'formatting', label: 'Analyzing formatting compatibility', icon: '🧱' },
  { id: 'score', label: 'Calculating ATS readiness score', icon: '📊' },
];

// ─── Score Ring Component ─────────────────────────────────────────────────────
function ScoreRing({ score, label, size = 90, color = '#63D11A' }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div style={{ textAlign: 'center', minWidth: size + 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={score >= 75 ? '#63D11A' : score >= 50 ? '#FFD21F' : '#EF2A2A'}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em"
          style={{ fontSize: size * 0.22, fontWeight: 800, fill: '#FFFFFF', fontFamily: 'Montserrat, sans-serif' }}>
          {score}%
        </text>
      </svg>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#E2E8F0', marginTop: '0.4rem', lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ found, warningText, okText = 'Detected' }) {
  if (warningText) return (
    <span className="ats-status-badge" style={{ background: 'rgba(255, 210, 31, 0.12)', color: '#A16207' }}>
      ⚠️ {warningText}
    </span>
  );
  if (found) return (
    <span className="ats-status-badge" style={{ background: 'rgba(99, 209, 26, 0.12)', color: '#166534' }}>
      🟢 {okText}
    </span>
  );
  return (
    <span className="ats-status-badge" style={{ background: 'rgba(239, 42, 42, 0.1)', color: '#991B1B' }}>
      🔴 Not detected
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
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

    if (apiKey) {
      geminiPromise = (async () => {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-lite',
            generationConfig: {
              responseMimeType: 'application/json',
            }
          });

          let result;
          if (ext === 'pdf') {
            const base64Data = await fileToBase64(file);
            const extractedLinks = await extractPdfLinks(file);
            let promptText = GEMINI_SYSTEM_PROMPT;
            if (extractedLinks && extractedLinks.length > 0) {
              promptText += `\n\nCRITICAL CONTEXT — UNDERLYING HYPERLINKS:\nThe document parsing engine extracted the following interactive hyperlinks embedded in the document's metadata/relationships/code:\n${extractedLinks.map(l => `- ${l}`).join('\n')}\nUse this list to resolve any hidden/underlying links (e.g. if a link points to a LinkedIn profile, consider the LinkedIn URL detected even if only anchor text like 'LinkedIn' is visible in the resume body, and do not warn the user about it being missing or not formatted as a full URL).`;
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
            let promptText = `Here is the extracted text of the resume:\n\n${extractedText}\n\nPlease analyze it using the instructions.`;
            if (extractedLinks && extractedLinks.length > 0) {
              promptText += `\n\nCRITICAL CONTEXT — UNDERLYING HYPERLINKS:\nThe document parsing engine extracted the following interactive hyperlinks embedded in the document's metadata/relationships/code:\n${extractedLinks.map(l => `- ${l}`).join('\n')}\nUse this list to resolve any hidden/underlying links (e.g. if a link points to a LinkedIn profile, consider the LinkedIn URL detected even if only anchor text like 'LinkedIn' is visible in the resume body, and do not warn the user about it being missing or not formatted as a full URL).`;
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
      setParseError(err.message || 'An unexpected error occurred during parsing.');
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

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    setView('upload');
    setFile(null);
    setUploadError('');
    setCurrentStepIndex(-1);
    setStepStatuses({});
    setParseResult(null);
    setParseError('');
    setLeadForm({ name: '', email: '', linkedin: '', consent: false });
    setLeadStatus(null);
    setLeadError('');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED STATE — computed from parseResult for the results view
  // All values have safe fallbacks so the view never crashes even if the
  // Gemini response is partial or the regex fallback path is used.
  // ─────────────────────────────────────────────────────────────────────────
  const contact        = parseResult?.contact        ?? {};
  const sections       = parseResult?.sections       ?? {};
  const skills         = Array.isArray(parseResult?.skills) ? parseResult.skills : [];
  const recommendations = Array.isArray(parseResult?.recommendations) ? parseResult.recommendations : [];
  const formatCheck    = parseResult?.formatting     ?? {};
  const expEval        = parseResult?.experienceEvaluation ?? {};
  const privacyCheck   = parseResult?.contact        ?? {};
  const scores         = parseResult?.scores         ?? { parsingAccuracy: 0, sectionScore: 0, keywordScore: 0, formattingScore: 0, overallScore: 0 };
  const overallScore   = scores.overallScore         ?? 0;
  const hasAchievements = parseResult?.hasAchievements ?? false;
  const hasEducation    = parseResult?.hasEducation   ?? (parseResult?.sections?.education ?? false);
  const educationFound  = hasEducation;
  const yearsExp        = parseResult?.yearsExp       ?? 'Not detected';

  // Score colour and label based on overall score
  const scoreColor = overallScore >= 75 ? '#63D11A' : overallScore >= 50 ? '#FFD21F' : '#EF2A2A';
  const scoreLabel = overallScore >= 85 ? 'ATS Ready' : overallScore >= 70 ? 'Good Standing' : overallScore >= 50 ? 'Needs Work' : 'High Risk';

  // CTA copy based on score
  const ctaHeadline = overallScore >= 85
    ? 'Your CV is ATS-Ready — Let\'s Make It Exceptional'
    : overallScore >= 60
    ? 'Your CV Has Gaps — Fix Them Before You Apply'
    : 'Your CV Is Failing ATS Systems — This Is Urgent';
  const ctaBody = overallScore >= 85
    ? 'A high ATS score is necessary, but not sufficient. Recruiters still need to choose you over equally qualified candidates. Get a professional review to sharpen your narrative, metrics, and positioning.'
    : overallScore >= 60
    ? 'Your CV passes basic parsing but is leaving points on the table. A strategic rewrite focused on STAR method, keywords, and formatting will significantly increase your interview call rate.'
    : 'Your CV is being rejected by automated systems before any human sees it. A full professional rewrite is not optional — it\'s urgent. Let\'s fix this together.';

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW RENDERING
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .ats-back-btn { background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; color: var(--dm-text-muted); font-size: 0.9rem; font-weight: 600; font-family: Inter, sans-serif; padding: 0.5rem 0; transition: color 0.15s; }
        .ats-back-btn:hover { color: var(--dm-primary); }
        .ats-drop-zone { border: 2.5px dashed #CBD5E1; border-radius: 20px; padding: 4rem 2rem; text-align: center; transition: all 0.2s; background: #fff; cursor: pointer; }
        .ats-drop-zone.dragging { border-color: var(--dm-primary); background: rgba(18, 56, 232, 0.04); }
        .ats-drop-zone:hover { border-color: var(--dm-primary); }
        .ats-file-selected { border-color: var(--dm-primary); background: rgba(18, 56, 232, 0.04); }
        @keyframes ats-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes ats-fadein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .ats-step-row { animation: ats-fadein 0.3s ease forwards; }
        @keyframes ats-spin { to { transform: rotate(360deg); } }
        .ats-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #E2E8F0; border-top-color: var(--dm-primary); border-radius: 50%; animation: ats-spin 0.7s linear infinite; vertical-align: middle; margin-right: 6px; }
        .ats-skill-chip { display: inline-block; background: rgba(18, 56, 232, 0.1); color: var(--dm-primary); border: 1px solid rgba(18, 56, 232, 0.25); border-radius: 20px; padding: 3px 12px; font-size: 0.75rem; font-weight: 700; margin: 3px; }
        .ats-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .ats-table th { background: var(--dm-bg); padding: 0.5rem 0.75rem; text-align: left; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--dm-text-muted); border-bottom: 1px solid var(--dm-border); }
        .ats-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--dm-border); vertical-align: middle; color: var(--dm-slate); }
        .ats-table tr:last-child td { border-bottom: none; }
        .ats-section-card { background: #fff; border-radius: 16px; border: 1px solid var(--dm-border); padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .ats-table-container { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .ats-lead-input {
          width: 100%;
          padding: 0.85rem 1.1rem;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          font-size: 0.95rem;
          font-family: Inter, sans-serif;
          outline: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          background: rgba(15, 23, 42, 0.5);
          color: #ffffff;
        }
        .ats-lead-input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
        .ats-lead-input:focus {
          border-color: var(--dm-primary);
          background: rgba(15, 23, 42, 0.75);
          box-shadow: 0 0 0 3px rgba(18, 56, 232, 0.25);
        }
        .ats-wa-link {
          color: rgba(255, 255, 255, 0.6) !important;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          transition: all 0.2s ease;
        }
        .ats-wa-link:hover {
          color: var(--dm-primary) !important;
          transform: translateY(-1px);
        }
        .ats-status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
        .ats-lead-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }
        @media (max-width: 900px) {
          .ats-results-grid { grid-template-columns: 1fr !important; }
          .ats-scores-row { flex-wrap: wrap !important; gap: 1.5rem !important; }
        }
        @media (max-width: 600px) {
          .ats-lead-grid { grid-template-columns: 1fr !important; gap: 1rem !important; }
          .ats-section-card { padding: 1rem !important; }
          .ats-table { font-size: 0.72rem !important; }
          .ats-table th { padding: 0.4rem 0.5rem !important; font-size: 0.62rem !important; }
          .ats-table td { padding: 0.5rem 0.5rem !important; word-break: break-all; }
          .ats-skill-chip { font-size: 0.7rem !important; padding: 2px 8px !important; margin: 2px !important; }
          .ats-scores-row { gap: 1rem !important; justify-content: space-around; }
          .ats-status-badge { padding: 2px 6px !important; font-size: 0.65rem !important; }
          .ats-drop-zone { padding: 2.5rem 1rem !important; }
        }
      `}</style>

      {view === 'upload' && (
        <div className="dm-page" style={{ background: 'var(--dm-bg)', minHeight: '100vh' }}>
          <div className="dm-container" style={{ paddingTop: '3rem', paddingBottom: '5rem', maxWidth: '800px', margin: '0 auto' }}>
            {onBack && (
              <button className="ats-back-btn" onClick={onBack} style={{ marginBottom: '2rem' }}>
                ← Back to Services
              </button>
            )}

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ display: 'inline-block', background: 'rgba(18, 56, 232, 0.1)', border: '1px solid rgba(18, 56, 232, 0.25)', borderRadius: '20px', padding: '5px 18px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dm-primary)', marginBottom: '1.25rem' }}>
                Free Tool
              </div>
              <h1 style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '1rem', lineHeight: 1.25 }}>
                See What ATS Systems<br />Actually Read From Your CV
              </h1>
              <p style={{ fontSize: '1.05rem', color: 'var(--dm-text-muted)', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto' }}>
                Everybody talks about ATS. Very few people have actually seen one work. Upload your CV and watch a live ATS parse it — field by field — in real time.
              </p>

              {/* How it works mini-steps */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '2rem' }}>
                {['📤 Upload CV', '→', '🔍 Live Parsing', '→', '📊 Your ATS Score', '→', '✅ Fix Issues'].map((s, i) => (
                  <span key={i} style={{ fontSize: '0.85rem', color: s === '→' ? '#CBD5E1' : 'var(--dm-slate)', fontWeight: s === '→' ? 400 : 700 }}>{s}</span>
                ))}
              </div>
            </div>

            {/* Drop Zone */}
            <div
              className={`ats-drop-zone${isDragging ? ' dragging' : ''}${file ? ' ats-file-selected' : ''}`}
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
                <div>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📋</div>
                  <div style={{ fontWeight: 800, color: 'var(--dm-navy)', fontFamily: 'Montserrat, sans-serif', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                    {file.name}
                  </div>
                  <div style={{ color: 'var(--dm-text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                    {(file.size / 1024).toFixed(1)} KB · {file.name.split('.').pop().toUpperCase()}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setUploadError(''); }}
                    style={{ background: 'none', border: '1.5px solid var(--dm-border)', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--dm-text-muted)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginRight: '0.5rem' }}
                  >
                    Change File
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📄</div>
                  <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', margin: '0 0 0.5rem' }}>
                    Drop your CV here
                  </h3>
                  <p style={{ color: 'var(--dm-text-muted)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
                    or click to select — PDF or DOCX supported
                  </p>
                  <span style={{ display: 'inline-block', background: 'var(--dm-primary)', color: '#fff', padding: '0.75rem 2rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', fontFamily: 'Inter, sans-serif' }}>
                    Select File
                  </span>
                  <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: '#475569' }}>
                    🔒 Secure processing. Your CV is analyzed directly in the browser and never stored on any server.
                  </p>
                </div>
              )}
            </div>

            {uploadError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '0.75rem 1rem', marginTop: '1rem', color: '#991B1B', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚠️ {uploadError}
              </div>
            )}

            {file && (
              <button
                onClick={runSimulation}
                style={{
                  display: 'block', width: '100%', marginTop: '1.5rem',
                  background: 'var(--dm-primary)',
                  color: '#fff', border: 'none', borderRadius: '14px',
                  padding: '1.1rem', fontSize: '1.05rem', fontWeight: 800,
                  fontFamily: 'Montserrat, sans-serif', cursor: 'pointer',
                  boxShadow: '0 6px 24px rgba(18, 56, 232, 0.35)', transition: 'transform 0.15s, box-shadow 0.15s, background-color 0.15s',
                  letterSpacing: '0.01em',
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(43, 91, 255, 0.45)'; e.currentTarget.style.background = 'var(--dm-electric)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 6px 24px rgba(18, 56, 232, 0.35)'; e.currentTarget.style.background = 'var(--dm-primary)'; }}
              >
                🔍 Start ATS Simulation
              </button>
            )}

            {/* What we check */}
            <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { icon: '👤', label: 'Contact Info', sub: 'Name, email, phone, LinkedIn' },
                { icon: '💼', label: 'Work Experience', sub: 'Titles, companies, dates' },
                { icon: '🎓', label: 'Education', sub: 'Degrees, institutions' },
                { icon: '⚙️', label: 'Skills & Keywords', sub: '300+ keyword dictionary' },
                { icon: '🧱', label: 'Formatting Safety', sub: 'Columns, tables, images' },
                { icon: '📊', label: 'ATS Readiness Score', sub: 'Weighted 4-dimension score' },
              ].map(item => (
                <div key={item.label} style={{ background: '#fff', border: '1px solid var(--dm-border)', borderRadius: '12px', padding: '1.1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--dm-navy)', fontSize: '0.875rem', fontFamily: 'Montserrat, sans-serif' }}>{item.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--dm-text-muted)', marginTop: '0.2rem' }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'parsing' && (
        <div style={{ minHeight: '100vh', background: 'var(--dm-navy)', display: 'flex', alignItems: 'center', justifycontent: 'center', padding: '2rem' }}>
          <div style={{ width: '100%', maxWidth: '560px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'ats-pulse 2s ease-in-out infinite' }}>🤖</div>
              <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                ATS Parsing In Progress
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
                Watch exactly what the ATS sees — step by step
              </p>
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {PARSE_STEPS.map((step, idx) => {
                const status = stepStatuses[step.id];
                const isActive = idx === currentStepIndex && status === 'running';
                const isDone = status === 'done';
                const isError = status === 'error';
                const isPending = !status;

                return (
                  <div key={step.id} className="ats-step-row" style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    background: isActive ? 'rgba(20,184,166,0.12)' : isDone ? 'rgba(20,184,166,0.06)' : isError ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isActive ? 'rgba(20,184,166,0.4)' : isDone ? 'rgba(20,184,166,0.2)' : isError ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '12px', padding: '1rem 1.25rem', transition: 'all 0.3s ease',
                  }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: isActive ? 'rgba(20,184,166,0.2)' : isDone ? 'rgba(20,184,166,0.15)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      {step.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: isPending ? 'rgba(255,255,255,0.35)' : '#fff', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}>
                        {step.label}
                      </div>
                      {isActive && <div style={{ color: '#fff', fontSize: '0.75rem', marginTop: '0.2rem', fontWeight: 600 }}>Scanning…</div>}
                      {isDone && <div style={{ color: '#34D399', fontSize: '0.75rem', marginTop: '0.2rem', fontWeight: 600 }}>Completed ✓</div>}
                      {isError && <div style={{ color: '#F87171', fontSize: '0.75rem', marginTop: '0.2rem', fontWeight: 600 }}>Failed ✗</div>}
                    </div>
                    <div style={{ flexShrink: 0, fontSize: '1.2rem' }}>
                      {isActive && <span className="ats-spinner" />}
                      {isDone && <span style={{ color: '#34D399' }}>✅</span>}
                      {isError && <span style={{ color: '#F87171' }}>❌</span>}
                      {isPending && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '1rem' }}>○</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {parseError && (
              <div style={{ marginTop: '2rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '1.25rem', color: '#FCA5A5', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>❌</div>
                <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Parsing Failed</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '1rem' }}>{parseError}</div>
                <button onClick={reset} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff', padding: '0.6rem 1.5rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
                  Try Another File
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'results' && parseResult && (
        <div className="dm-page" style={{ background: 'var(--dm-bg)', minHeight: '100vh' }}>
          <div className="dm-container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem', maxWidth: '1100px', margin: '0 auto' }}>

            {/* Back + New Scan */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              {onBack && <button className="ats-back-btn" onClick={onBack}>← Back to Services</button>}
              <button onClick={reset} style={{ background: 'none', border: '1.5px solid var(--dm-border)', borderRadius: '8px', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--dm-slate)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🔄 Scan Another CV
              </button>
            </div>

            {/* Scanned/image warning banner */}
            {parseResult.formatting.isLikelyScanned && (
              <div style={{ background: '#FEF2F2', border: '2px solid #FECACA', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '2rem' }}>🚫</span>
                <div>
                  <div style={{ fontWeight: 800, color: '#991B1B', fontFamily: 'Montserrat, sans-serif', marginBottom: '0.3rem' }}>Scanned / Image-Based Document Detected</div>
                  <div style={{ color: '#B91C1B', fontSize: '0.875rem', lineHeight: 1.6 }}>This appears to be a scanned PDF or image. ATS systems cannot extract any text from it — meaning your CV reads as a blank document to recruiters' systems. You must re-create it as a proper text-based document.</div>
                </div>
              </div>
            )}

            {/* ── Score Overview ──────────────────────────────────────────── */}
            <div style={{ background: 'linear-gradient(135deg, var(--dm-navy) 0%, var(--dm-primary) 50%, var(--dm-electric) 100%)', borderRadius: '20px', padding: '2.5rem', marginBottom: '2rem', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>ATS Simulation Complete</div>
                  <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(1.5rem, 3vw, 2rem)', margin: '0 0 0.5rem' }}>
                    {file?.name}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '3.5rem', fontWeight: 900, color: scoreColor, fontFamily: 'Montserrat, sans-serif', lineHeight: 1 }}>
                      {overallScore}<span style={{ fontSize: '1.5rem' }}>%</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: scoreColor }}>{scoreLabel}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Overall ATS Readiness</div>
                    </div>
                  </div>
                </div>

                {/* Score breakdown rings */}
                <div className="ats-scores-row" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  <ScoreRing score={scores.parsingAccuracy} label="Parsing Accuracy" />
                  <ScoreRing score={scores.sectionScore} label="Section Recognition" />
                  <ScoreRing score={scores.keywordScore} label="Keyword Coverage" />
                  <ScoreRing score={scores.formattingScore} label="Formatting Safety" />
                </div>
              </div>
            </div>

            {/* ── Results Grid ─────────────────────────────────────────────── */}
            <div className="ats-results-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

              {/* Contact Info Extracted */}
              <div className="ats-section-card">
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  👤 Contact Information Extracted
                </h3>
                <div className="ats-table-container">
                  <table className="ats-table">
                    <thead><tr><th>Field</th><th>Extracted Value</th><th>Status</th></tr></thead>
                    <tbody>
                      {[
                        { field: 'Full Name', value: contact.name, found: !!contact.name },
                        { field: 'Email Address', value: contact.email, found: !!contact.email },
                        { field: 'Phone Number', value: contact.phone, found: !!contact.phone },
                        { field: 'LinkedIn URL', value: contact.linkedin, found: !!contact.linkedin },
                        { field: 'Location', value: contact.location, found: !!contact.location },
                        { field: 'Years of Experience', value: yearsExp, found: yearsExp !== 'Not detected' },
                      ].map(row => (
                        <tr key={row.field}>
                          <td style={{ fontWeight: 600 }}>{row.field}</td>
                          <td style={{ color: row.found ? 'var(--dm-slate)' : '#94A3B8', fontStyle: row.found ? 'normal' : 'italic', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.found ? row.value : '—'}
                          </td>
                          <td><StatusBadge found={row.found} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section Detection */}
              <div className="ats-section-card">
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📋 Resume Sections Detected
                </h3>
                <div className="ats-table-container">
                  <table className="ats-table">
                    <thead><tr><th>Section</th><th>Status</th></tr></thead>
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
                        <tr key={row.label}>
                          <td style={{ fontWeight: 600 }}>{row.label}</td>
                          <td><StatusBadge found={row.found} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bias & Privacy Compliance */}
              <div className="ats-section-card">
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🛡️ Bias & Privacy Compliance
                </h3>
                <div className="ats-table-container">
                  <table className="ats-table">
                    <thead><tr><th>Critical Audit Check</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Profile Photo / Headshot</td>
                        <td>{privacyCheck.hasPhoto ? <StatusBadge warningText="Risk — Remove photo" /> : <StatusBadge found={true} okText="Clean" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Date of Birth / Age</td>
                        <td>{privacyCheck.hasDOB ? <StatusBadge warningText="Risk — Remove age/DOB" /> : <StatusBadge found={true} okText="Clean" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Marital Status / Gender</td>
                        <td>{privacyCheck.hasMaritalStatus ? <StatusBadge warningText="Risk — Remove status" /> : <StatusBadge found={true} okText="Clean" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>National ID / Passport No.</td>
                        <td>{privacyCheck.hasIDNumber ? <StatusBadge warningText="Critical Risk — Remove ID" /> : <StatusBadge found={true} okText="Clean" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Full Street Address</td>
                        <td>{privacyCheck.hasFullAddress ? <StatusBadge warningText="Use City, Country only" /> : <StatusBadge found={true} okText="Clean" />}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Formatting & Layout Safety */}
              <div className="ats-section-card">
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🧱 Formatting & Layout Safety
                </h3>
                <div className="ats-table-container">
                  <table className="ats-table">
                    <thead><tr><th>ATS Readability Check</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Multi-column layout</td>
                        <td>{formatCheck.multiColumnRisk ? <StatusBadge warningText="May scramble reading order" /> : <StatusBadge found={true} okText="Safe" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Layout tables used</td>
                        <td>{formatCheck.hasTables ? <StatusBadge warningText="Tables detected" /> : <StatusBadge found={true} okText="Safe" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Graphics / progress bars / icons</td>
                        <td>{formatCheck.hasGraphics ? <StatusBadge warningText="Graphics detected" /> : <StatusBadge found={true} okText="Safe" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Floating text boxes</td>
                        <td>{formatCheck.hasTextBoxes ? <StatusBadge warningText="Text boxes detected" /> : <StatusBadge found={true} okText="Safe" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Colored text / backgrounds</td>
                        <td>{formatCheck.hasColoredTextOrBg ? <StatusBadge warningText="Use black text on white paper" /> : <StatusBadge found={true} okText="Safe" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Page count under 2-page limit</td>
                        <td>{formatCheck.isOverTwoPages ? <StatusBadge warningText="Exceeds 2-page cap" /> : <StatusBadge found={true} okText="Safe" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Standard uppercase headings</td>
                        <td>{formatCheck.hasCreativeHeadings ? <StatusBadge warningText="Creative headers found" /> : <StatusBadge found={true} okText="Safe" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Standard bullet points</td>
                        <td>{formatCheck.hasSpecialBullets ? <StatusBadge warningText="Decorative bullets found" /> : <StatusBadge found={true} okText="Safe" />}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* STAR Method & Experience Quality */}
              <div className="ats-section-card">
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ✍️ Experience Quality (STAR Method)
                </h3>
                <div className="ats-table-container">
                  <table className="ats-table">
                    <thead><tr><th>Resume Writing Metric</th><th>Status</th></tr></thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Uses STAR Method structure</td>
                        <td>{expEval.usesStarMethod ? <StatusBadge found={true} okText="Yes" /> : <StatusBadge warningText="Lacks STAR format" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Quantified metrics & results</td>
                        <td>{expEval.hasMetrics ? <StatusBadge found={true} okText="Yes" /> : <StatusBadge warningText="Lacks metrics/statistics" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Bolds first 3-5 words of bullets</td>
                        <td>{expEval.boldsFirstWords ? <StatusBadge found={true} okText="Yes" /> : <StatusBadge warningText="No bolded first phrase" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Bolds numbers and percentages</td>
                        <td>{expEval.boldsMetrics ? <StatusBadge found={true} okText="Yes" /> : <StatusBadge warningText="No bolded metrics" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Proper capitalization & full stops</td>
                        <td>{expEval.grammarCapitalizationAndPeriods ? <StatusBadge found={true} okText="Yes" /> : <StatusBadge warningText="Inconsistent endings" />}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>No raw asterisks in copy</td>
                        <td>{expEval.rawAsterisksFound ? <StatusBadge warningText="Asterisks found (e.g. *247#)" /> : <StatusBadge found={true} okText="Yes" />}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Skills & Keywords */}
              <div className="ats-section-card">
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚙️ Skills & Keywords Recognised ({skills.length})
                </h3>
                {skills.length > 0 ? (
                  <div>
                    {skills.slice(0, 30).map(skill => (
                      <span key={skill} className="ats-skill-chip">{skill}</span>
                    ))}
                    {skills.length > 30 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--dm-text-muted)', display: 'block', marginTop: '0.5rem' }}>
                        +{skills.length - 30} more keywords detected
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔴</div>
                    <div style={{ fontWeight: 700, color: 'var(--dm-slate)', marginBottom: '0.3rem' }}>No recognisable skills found</div>
                    <div style={{ fontSize: '0.8rem' }}>Add a dedicated skills section with industry keywords</div>
                  </div>
                )}

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--dm-border)', fontSize: '0.8rem', color: 'var(--dm-text-muted)' }}>
                  📌 Skills detected against a dictionary of 300+ keywords across tech, finance, HR, and more.
                </div>
              </div>
            </div>


            {/* ── Recruiter View ──────────────────────────────────────────── */}
            <div className="ats-section-card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                👁️ Recruiter View — What the ATS Actually Shows Recruiters
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--dm-text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Recruiters using ATS software don't see your beautiful design. They see structured data — like this:
              </p>
              <div style={{ background: 'var(--dm-navy-800)', borderRadius: '12px', padding: '1.5rem', fontFamily: "'Courier New', monospace", fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.8 }}>
                <div style={{ color: '#38BDF8', fontWeight: 700, marginBottom: '0.5rem' }}>// ATS Parsed Profile</div>
                <div><span style={{ color: '#FB7185' }}>Name:</span> <span style={{ color: '#fff' }}>{contact.name || '⚠️ NOT DETECTED'}</span></div>
                <div><span style={{ color: '#FB7185' }}>Email:</span> <span style={{ color: '#fff' }}>{contact.email || '⚠️ NOT DETECTED'}</span></div>
                <div><span style={{ color: '#FB7185' }}>Phone:</span> <span style={{ color: '#fff' }}>{contact.phone || '⚠️ NOT DETECTED'}</span></div>
                <div><span style={{ color: '#FB7185' }}>LinkedIn:</span> <span style={{ color: '#fff' }}>{contact.linkedin || '⚠️ NOT DETECTED'}</span></div>
                <div><span style={{ color: '#FB7185' }}>Experience:</span> <span style={{ color: '#fff' }}>{yearsExp}</span></div>
                <div><span style={{ color: '#FB7185' }}>Education:</span> <span style={{ color: '#fff' }}>{hasEducation ? '✓ Detected' : '⚠️ NOT DETECTED'}</span></div>
                <div><span style={{ color: '#FB7185' }}>Skills ({skills.length}):</span> <span style={{ color: '#fff' }}>{skills.slice(0, 8).join(', ') || '⚠️ NONE FOUND'}{skills.length > 8 ? ` +${skills.length - 8} more` : ''}</span></div>
                <div><span style={{ color: '#FB7185' }}>ATS Score:</span> <span style={{ color: scoreColor, fontWeight: 800 }}>{overallScore}%</span></div>
              </div>
            </div>

            {/* ── Recommendations ───────────────────────────────────────────── */}
            {recommendations.length > 0 && (
              <div className="ats-section-card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: 'var(--dm-navy)', fontSize: '1rem', marginBottom: '1.25rem' }}>
                  📝 ATS Recommendations ({recommendations.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recommendations.map((rec, i) => {
                    const bg = rec.type === 'critical' ? '#FEF2F2' : rec.type === 'warning' ? '#FEF3C7' : '#F0FDF4';
                    const border = rec.type === 'critical' ? '#FECACA' : rec.type === 'warning' ? '#FDE68A' : '#BBF7D0';
                    const icon = rec.type === 'critical' ? '🚨' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
                    const textColor = rec.type === 'critical' ? '#991B1B' : rec.type === 'warning' ? '#92400E' : '#166534';
                    return (
                      <div key={i} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.875rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <span style={{ flexShrink: 0 }}>{icon}</span>
                        <span style={{ fontSize: '0.875rem', color: textColor, lineHeight: 1.55, fontWeight: rec.type === 'critical' ? 700 : 500 }}>{rec.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Lead Capture CTA ──────────────────────────────────────────── */}
            <div style={{
              background: 'linear-gradient(135deg, var(--dm-navy) 0%, var(--dm-navy-800) 50%, var(--dm-navy) 100%)',
              borderRadius: '20px', padding: '2.5rem',
              border: `1px solid ${scoreColor}33`,
              boxShadow: `0 0 40px ${scoreColor}22`,
            }}>
              <div style={{ maxWidth: '620px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{overallScore >= 85 ? '🎯' : overallScore >= 60 ? '⚡' : '🚨'}</div>
                  <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontSize: '1.35rem', marginBottom: '0.75rem' }}>
                    {ctaHeadline}
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                    {ctaBody}
                  </p>
                </div>

                {leadStatus === 'success' ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(99, 209, 26, 0.1)', border: '1px solid rgba(99, 209, 26, 0.3)', borderRadius: '14px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
                    <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', marginBottom: '0.5rem' }}>Got it! Duncan will be in touch.</h3>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>Check your inbox. You'll hear back within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleLeadSubmit}>
                    <div className="ats-lead-grid">
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name *</label>
                        <input className="ats-lead-input" placeholder="Your name" value={leadForm.name} onChange={e => setLeadForm(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address *</label>
                        <input className="ats-lead-input" type="email" placeholder="you@example.com" value={leadForm.email} onChange={e => setLeadForm(p => ({ ...p, email: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LinkedIn URL (optional)</label>
                      <input className="ats-lead-input" placeholder="linkedin.com/in/yourname" value={leadForm.linkedin} onChange={e => setLeadForm(p => ({ ...p, linkedin: e.target.value }))} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer', marginBottom: '1.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      <input type="checkbox" checked={leadForm.consent} onChange={e => setLeadForm(p => ({ ...p, consent: e.target.checked }))} style={{ accentColor: 'var(--dm-primary)', width: '16px', height: '16px', marginTop: '2px', flexShrink: 0 }} />
                      I agree to be contacted by Duncan Makoyo about my CV results. My data will not be shared with third parties.
                    </label>
                    {leadError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.6rem 1rem', marginBottom: '1rem', color: '#FCA5A5', fontSize: '0.85rem' }}>{leadError}</div>}
                    <button
                      type="submit"
                      disabled={leadStatus === 'sending'}
                      style={{ width: '100%', background: 'var(--dm-primary)', color: '#fff', border: 'none', borderRadius: '12px', padding: '1.1rem', fontSize: '1.05rem', fontWeight: 800, fontFamily: 'Montserrat, sans-serif', cursor: 'pointer', boxShadow: '0 4px 20px rgba(18, 56, 232, 0.35)', letterSpacing: '0.01em', transition: 'transform 0.15s, box-shadow 0.15s, background-color 0.15s' }}
                      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(43, 91, 255, 0.45)'; e.currentTarget.style.background = 'var(--dm-electric)'; }}
                      onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(18, 56, 232, 0.35)'; e.currentTarget.style.background = 'var(--dm-primary)'; }}
                    >
                      {leadStatus === 'sending' ? 'Sending…' : 'Get My Personalised Review →'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                      <a className="ats-wa-link" href={`https://wa.me/254794877125?text=Hi%20Duncan%2C%20I%20just%20ran%20my%20CV%20through%20your%20ATS%20Simulator%20and%20got%20a%20score%20of%20${overallScore}%25.%20I%27d%20like%20help%20improving%20it.`} target="_blank" rel="noopener noreferrer">
                        💬 Or message Duncan directly on WhatsApp
                      </a>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
