/**
 * ============================================================================
 * MWALIMU AI: AUTONOMOUS MULTI-DISCIPLINARY SOCRATIC STUDY TUTOR
 * ============================================================================
 * High-concurrency, zero-storage, production-grade WhatsApp AI tutor for university
 * and college students across ALL disciplines: Mathematics, Statistics, Engineering,
 * Computer Science & Coding, Medicine & Health Sciences, Law, Business & Economics,
 * Natural Sciences, and Humanities.
 *
 * Enforces WhatsApp Cloud API limits, strict server-side pricing, dual-phone M-Pesa
 * billing, stacked pass subscriptions, multi-model resilient fallback, and voice/PDF
 * attachment handling.
 */

import crypto from 'crypto';
import {
  sendWhatsAppMessage,
  sendTypingIndicator,
  WA_GRAPH_VERSION,
  WA_LIMITS,
  clip,
  splitText
} from './WhatsAppSender.js';

// 10 Megabytes Hard Limit: Protects server RAM & keeps responses lightning-fast
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

// ─── 0. DYNAMIC STUDY PLANS & BILLING CONFIGURATION ───────────────────────────
export class MwalimuPlanManager {
  /**
   * Retrieves active study pass configurations.
   * Button titles are strictly capped at 20 characters (Meta API requirement).
   */
  static getPlans() {
    const dailyPrice = Number(process.env.MWALIMU_PRICE_DAILY) || 20;
    const weekendPrice = Number(process.env.MWALIMU_PRICE_WEEKEND) || 50;
    const semesterPrice = Number(process.env.MWALIMU_PRICE_SEMESTER) || 199;

    return {
      daily_24h: {
        id: 'daily_24h',
        name: '24-Hour Cram Pass',
        priceKes: dailyPrice,
        durationHours: 24,
        buttonId: 'BUY_PLAN_DAILY',
        buttonTitle: clip(`⚡ KSh ${dailyPrice} • 24h`, WA_LIMITS.BUTTON_TITLE),
        tier: 'daily',
        summary: '24h unlimited questions & PDF tutor'
      },
      weekend_3d: {
        id: 'weekend_3d',
        name: '3-Day CATs & Weekend Pass',
        priceKes: weekendPrice,
        durationHours: 72,
        buttonId: 'BUY_PLAN_WEEKEND',
        buttonTitle: clip(`📚 KSh ${weekendPrice} • 3 Days`, WA_LIMITS.BUTTON_TITLE),
        tier: 'weekend',
        summary: '72h unmetered revision marathon'
      },
      semester_30d: {
        id: 'semester_30d',
        name: '30-Day Semester VIP Pass',
        priceKes: semesterPrice,
        durationHours: 720,
        buttonId: 'BUY_PLAN_SEMESTER',
        buttonTitle: clip(`👑 KSh ${semesterPrice} • 30 Days`, WA_LIMITS.BUTTON_TITLE),
        tier: 'monthly',
        summary: '30 days full unlimited 24/7 tutor'
      }
    };
  }

  static getPlan(planId) {
    const plans = this.getPlans();
    return plans[planId] || plans.daily_24h;
  }

  static getPlanByButtonId(buttonId) {
    const plans = this.getPlans();
    if (buttonId === 'BUY_PLAN_DAILY' || buttonId === 'BUY_PLAN_20') return plans.daily_24h;
    if (buttonId === 'BUY_PLAN_WEEKEND' || buttonId === 'BUY_PLAN_50') return plans.weekend_3d;
    if (buttonId === 'BUY_PLAN_SEMESTER' || buttonId === 'BUY_PLAN_150' || buttonId === 'BUY_PLAN_199') return plans.semester_30d;
    return Object.values(plans).find(p => p.buttonId === buttonId) || null;
  }

  static validateAmount(planId, paidAmountKes) {
    const plan = this.getPlan(planId);
    return Number(paidAmountKes) >= Number(plan.priceKes);
  }

  static generatePaywallText(customHeader = null) {
    const plans = Object.values(this.getPlans());
    const header = customHeader || '🎓 *You have used today\'s 3 free questions!*';
    let txt = `${header}\n\n` +
      `Unlock instant, unmetered 24/7 Socratic tutoring across all your university courses with M-Pesa:\n\n`;
    for (const p of plans) {
      txt += `• *${p.name}:* KSh ${p.priceKes} (${p.summary})\n`;
    }
    txt += `\nSelect a study pass below to activate immediately:`;
    return txt;
  }

  static generatePaywallButtons() {
    const plans = Object.values(this.getPlans());
    return plans.map(p => ({
      type: 'reply',
      reply: {
        id: p.buttonId,
        title: p.buttonTitle
      }
    }));
  }
}

// ─── 1. UNIVERSAL MULTI-DISCIPLINARY CONTENT FORMATTER ────────────────────────
export class MwalimuContentFormatter {
  /**
   * Sanitizes and formats raw AI text into crisp, clean WhatsApp markdown and Unicode.
   * Handles Mathematics, Engineering, Code, Medicine, Law, Economics, and Social Sciences.
   */
  static cleanForWhatsApp(text) {
    if (!text || typeof text !== 'string') return '';

    let out = text;

    // 1. Unescape escaped characters
    out = out.replace(/\\n/g, '\n').replace(/\\t/g, '  ');

    // 2. Protect code fences so programming code (Python, Java, C++, JS, SQL) is not altered
    const codeBlocks = [];
    out = out.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(`\`\`\`${lang ? lang + '\n' : ''}${code.trim()}\`\`\``);
      return `__MWALIMU_CODE_BLOCK_${idx}__`;
    });

    const inlineCodes = [];
    out = out.replace(/`([^`\n]+)`/g, (match, code) => {
      const idx = inlineCodes.length;
      inlineCodes.push(`\`${code}\``);
      return `__MWALIMU_INLINE_CODE_${idx}__`;
    });

    // 3. Remove AI roleplay / stage directions (e.g. *Leans back...*, *Smiles and pulls out a pen*)
    out = out.replace(/^\s*\*[A-Z][^*]{5,120}\*\s*$/gm, '');
    out = out.replace(/^\s*\*[A-Z][^*]{5,120}\*\n+/g, '');

    // 4. Unicode Math & Scientific Notation Replacement
    out = this._formatMathAndSymbols(out);

    // 5. Convert Markdown Headings (#, ##, ###) into WhatsApp *BOLD*
    out = out.replace(/^#{1,6}\s+(.+)$/gm, '*$1*');

    // 6. Convert double bold (**bold**) into WhatsApp single bold (*bold*)
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '*$1*');

    // 7. Format Markdown Tables into clean vertical bullet points
    if (out.includes('|') && out.includes('---')) {
      out = this._formatTables(out);
    }

    // 8. Fix inline list dumps e.g. "(1) foo (2) bar (3) baz" -> split into vertical bullet lines
    out = out.replace(/([.!?])\s+(\([1-9]\)|\b[1-9]\.)\s+/g, '$1\n• ');

    // 9. Standardize bullet markers (* item or - item -> • item)
    out = out.replace(/^[\*\-]\s+/gm, '• ');

    // 10. Restore code blocks & inline code safely
    codeBlocks.forEach((block, idx) => {
      out = out.replace(`__MWALIMU_CODE_BLOCK_${idx}__`, block);
    });
    inlineCodes.forEach((code, idx) => {
      out = out.replace(`__MWALIMU_INLINE_CODE_${idx}__`, code);
    });

    // 11. Normalize excessive newlines
    out = out.replace(/\n{3,}/g, '\n\n').trim();

    // 12. Safety truncate under 3500 chars to avoid WhatsApp payload degradation
    if (out.length > 3500) {
      out = out.substring(0, 3400) + '\n\n*(Response truncated for brevity. Tap [Next Step ⏩] below to continue)*';
    }

    return out;
  }

  static _formatMathAndSymbols(text) {
    let s = text;

    // Superscripts
    const superMap = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
      'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 'k': 'ᵏ', 't': 'ᵗ'
    };
    s = s.replace(/\^([0-9niyxkt+-]+)/g, (_, m) => m.split('').map(c => superMap[c] || c).join(''));
    s = s.replace(/\^{([^}]+)}/g, (_, m) => m.split('').map(c => superMap[c] || c).join(''));

    // Subscripts (applied only after letters/variables, avoiding snake_case words)
    const subMap = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
      'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'y': 'ᵧ', 'i': 'ᵢ', 'n': 'ₙ', 'k': 'ₖ', 'm': 'ₘ'
    };
    s = s.replace(/\b([A-Za-z])_([0-9aeoxyinkm+-]+)\b/g, (_, v, m) => v + m.split('').map(c => subMap[c] || c).join(''));
    s = s.replace(/\b([A-Za-z])_{([^}]+)}\b/g, (_, v, m) => v + m.split('').map(c => subMap[c] || c).join(''));

    // Greek & Mathematical Symbols with word boundaries
    const symbolReplacements = [
      [/\\mu\b/g, 'μ'],
      [/\\sigma\^2/g, 'σ²'],
      [/\\sigma\b/g, 'σ'],
      [/\\lambda\b/g, 'λ'],
      [/\\alpha\b/g, 'α'],
      [/\\beta\b/g, 'β'],
      [/\\gamma\b/g, 'γ'],
      [/\\delta\b/g, 'δ'],
      [/\\Delta\b/g, 'Δ'],
      [/\\theta\b/g, 'θ'],
      [/\\Theta\b/g, 'Θ'],
      [/\\omega\b/g, 'ω'],
      [/\\Omega\b/g, 'Ω'],
      [/\\pi\b/g, 'π'],
      [/\\infty\b/g, '∞'],
      [/\\int\b/g, '∫'],
      [/\\sum\b/g, 'Σ'],
      [/\\prod\b/g, 'Π'],
      [/\\sqrt\[(\d+)\]{([^}]+)}/g, '$1√($2)'],
      [/\\sqrt{([^}]+)}/g, '√($1)'],
      [/\\sqrt\b/g, '√'],
      [/\\pm\b/g, '±'],
      [/\\geq?\b/g, '≥'],
      [/\\leq?\b/g, '≤'],
      [/\\neq\b/g, '≠'],
      [/\\approx\b/g, '≈'],
      [/\\cdot\b/g, '·'],
      [/\\times\b/g, '×'],
      [/\\div\b/g, '÷'],
      [/\\to\b/g, '→'],
      [/\\implies\b/g, '⟹'],
      [/\\iff\b/g, '⟺'],
      [/\\in\b/g, '∈'],
      [/\\notin\b/g, '∉'],
      [/\\subset\b/g, '⊂'],
      [/\\subseteq\b/g, '⊆'],
      [/\\cup\b/g, '∪'],
      [/\\cap\b/g, '∩'],
      [/\\forall\b/g, '∀'],
      [/\\exists\b/g, '∃'],
      [/\\nabla\b/g, '∇'],
      [/\\partial\b/g, '∂'],
      [/\\operatorname{Var}/g, 'Var'],
      [/\\operatorname{Cov}/g, 'Cov'],
      [/\\operatorname{E}/g, 'E'],
      [/\\operatorname{P}/g, 'P'],
      [/\\mathbb{E}/g, 'E'],
      [/\\mathbb{P}/g, 'P'],
      [/\\mathbb{R}/g, 'ℝ'],
      [/\\mathbb{N}/g, 'ℕ'],
      [/\\mathbb{Z}/g, 'ℤ'],
      [/\\mathbb{C}/g, 'ℂ'],
      [/\\boxed{([^}]+)}/g, '*$1*'],
      [/\\text{([^}]+)}/g, '$1'],
      [/\\frac{([^}]+)}{([^}]+)}/g, '($1 / $2)']
    ];

    symbolReplacements.forEach(([regex, repl]) => {
      s = s.replace(regex, repl);
    });

    // Display LaTeX blocks \[ ... \] or $$ ... $$
    s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => `\n\n    ${eq.trim()}\n\n`);
    s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => `\n\n    ${eq.trim()}\n\n`);

    // Inline LaTeX \( ... \)
    s = s.replace(/\\\((.*?)\\\)/g, '$1');

    // Strip mathematical single dollar signs $...$ if containing math symbols
    s = s.replace(/\$([^$\n]+)\$/g, (_, content) => {
      // Don't strip currency like $50 or $100
      if (/^\d+(\.\d+)?$/.test(content.trim())) return `$${content}`;
      return content;
    });

    return s;
  }

  static _formatTables(text) {
    const lines = text.split('\n');
    const cleanedLines = [];
    let inTable = false;
    let headers = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (trimmed.includes('---')) {
          inTable = true;
          continue;
        }
        const cells = trimmed.split('|').map(c => c.trim()).filter(c => c.length > 0);
        if (!inTable) {
          headers = cells;
        } else {
          const formattedRow = cells.map((cell, idx) => {
            const h = headers[idx] ? `*${headers[idx]}:* ` : '';
            return `${h}${cell}`;
          }).join(' • ');
          cleanedLines.push(`• ${formattedRow}`);
        }
      } else {
        inTable = false;
        cleanedLines.push(line);
      }
    }
    return cleanedLines.join('\n');
  }
}

// ─── 2. QUOTA & SUBSCRIPTION SERVICE ──────────────────────────────────────────
export class MwalimuQuotaService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.eatOffsetMs = 3 * 60 * 60 * 1000; // Africa/Nairobi (UTC+3)
  }

  _getEatDateString() {
    return new Date(Date.now() + this.eatOffsetMs).toISOString().slice(0, 10);
  }

  /**
   * Retrieves or registers a student account.
   * Resets daily quota based on Africa/Nairobi local midnight.
   */
  async getStudentState(phone) {
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    const todayEat = this._getEatDateString();

    try {
      const { data: user, error } = await this.supabase
        .from('mwalimu_users')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (error) {
        console.warn('[MwalimuQuota] DB fetch notice:', error.message);
      }

      if (user) {
        if (user.last_query_date !== todayEat) {
          user.queries_today = 0;
          user.last_query_date = todayEat;
          await this.supabase
            .from('mwalimu_users')
            .update({ queries_today: 0, last_query_date: todayEat })
            .eq('phone', cleanPhone);
        }
        return user;
      }

      // New Student Registration (Free tier by default)
      const newUser = {
        phone: cleanPhone,
        tier: 'free',
        valid_until: new Date(0).toISOString(),
        queries_today: 0,
        last_query_date: todayEat,
        recent_context: ''
      };

      const { data: created, error: createErr } = await this.supabase
        .from('mwalimu_users')
        .insert(newUser)
        .select()
        .single();

      if (!createErr && created) return created;
      return newUser;
    } catch (err) {
      console.error('[MwalimuQuota] Exception:', err.message);
      return { phone: cleanPhone, tier: 'free', queries_today: 0, valid_until: new Date(0).toISOString() };
    }
  }

  /**
   * Evaluates if student is eligible to ask a question.
   */
  async checkEligibility(phone) {
    const user = await this.getStudentState(phone);
    const now = new Date();
    const isPaidActive = user.valid_until && new Date(user.valid_until) > now;

    if (isPaidActive) {
      return {
        allowed: true,
        tier: user.tier || 'paid',
        validUntil: user.valid_until,
        isPaid: true
      };
    }

    const freeLimit = Number(process.env.MWALIMU_FREE_DAILY) || 3;
    if ((user.queries_today || 0) < freeLimit) {
      return {
        allowed: true,
        tier: 'free',
        remainingFree: freeLimit - (user.queries_today || 0),
        isPaid: false
      };
    }

    return {
      allowed: false,
      tier: 'free',
      queriesToday: user.queries_today,
      remainingFree: 0,
      isPaid: false,
      reason: 'QUOTA_EXHAUSTED'
    };
  }

  /**
   * Records usage and updates ephemeral rolling memory for Socratic follow-ups.
   */
  async recordUsage(phone, newContextSnippet = '') {
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    const todayEat = this._getEatDateString();

    try {
      const user = await this.getStudentState(cleanPhone);
      const isPaidActive = user.valid_until && new Date(user.valid_until) > new Date();

      const updatePayload = {
        last_query_date: todayEat,
        recent_context: (newContextSnippet || '').substring(0, 1400)
      };

      if (!isPaidActive) {
        updatePayload.queries_today = (user.queries_today || 0) + 1;
      }

      await this.supabase
        .from('mwalimu_users')
        .update(updatePayload)
        .eq('phone', cleanPhone);
    } catch (err) {
      console.error('[MwalimuQuota] Record usage error:', err.message);
    }
  }

  async resetStudentContext(phone) {
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    try {
      await this.supabase
        .from('mwalimu_users')
        .update({ recent_context: '' })
        .eq('phone', cleanPhone);
      return true;
    } catch (err) {
      console.error('[MwalimuQuota] Reset context error:', err.message);
      return false;
    }
  }

  /**
   * Activates a paid study pass.
   * Supports Pass Stacking: if student still has active hours, the new pass adds to remaining time.
   * Idempotent: checks receipt to prevent double counting on webhook retries.
   */
  async activateSubscription(phone, planType, mpesaReceipt, amount, payerPhone = null) {
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    const cleanReceipt = String(mpesaReceipt || '').trim().toUpperCase();
    const cleanPayer = payerPhone ? String(payerPhone).replace(/\D/g, '') : cleanPhone;

    const plan = MwalimuPlanManager.getPlan(planType);
    const durationHours = plan.durationHours;
    const durationMs = durationHours * 3600 * 1000;
    const effectiveAmount = Number(amount) || plan.priceKes;

    try {
      // 1. Idempotency check: Has this receipt reference already been processed?
      const { data: existingTx } = await this.supabase
        .from('mwalimu_transactions')
        .select('*')
        .eq('mpesa_receipt', cleanReceipt)
        .maybeSingle();

      if (existingTx) {
        console.log(`[MwalimuQuota] Duplicate activation ignored for receipt: ${cleanReceipt}`);
        const userState = await this.getStudentState(cleanPhone);
        return {
          success: true,
          plan: plan.id,
          validUntil: userState.valid_until,
          isDuplicate: true
        };
      }

      // 2. Fetch current user state to calculate stacked expiry
      const currentUser = await this.getStudentState(cleanPhone);
      const now = Date.now();
      const currentValidUntilMs = currentUser.valid_until ? new Date(currentUser.valid_until).getTime() : 0;
      const baseTimeMs = currentValidUntilMs > now ? currentValidUntilMs : now;
      const newValidUntilIso = new Date(baseTimeMs + durationMs).toISOString();

      // 3. Log transaction with graceful fallback if payer_phone column is not present
      const txPayload = {
        phone: cleanPhone,
        mpesa_receipt: cleanReceipt,
        amount: effectiveAmount,
        plan: plan.id
      };

      let txInsertRes = await this.supabase
        .from('mwalimu_transactions')
        .insert({ ...txPayload, payer_phone: cleanPayer });

      if (txInsertRes.error && txInsertRes.error.code === 'PGRST204') {
        // Fallback without payer_phone column
        txInsertRes = await this.supabase
          .from('mwalimu_transactions')
          .insert(txPayload);
      }

      // 4. Update student state
      await this.supabase
        .from('mwalimu_users')
        .upsert({
          phone: cleanPhone,
          tier: plan.tier,
          valid_until: newValidUntilIso,
          queries_today: 0
        }, { onConflict: 'phone' });

      return {
        success: true,
        plan: plan.id,
        planName: plan.name,
        validUntil: newValidUntilIso,
        durationHours
      };
    } catch (err) {
      console.error('[MwalimuQuota] Activation exception:', err.message);
      return { success: false, error: err.message };
    }
  }
}

// ─── 3. MULTI-MODEL SOCRATIC AI PEDAGOGY CLIENT ───────────────────────────────
export class MwalimuAIClient {
  constructor(apiKey) {
    this.apiKey = (apiKey || process.env.GEMINI_API_KEY || '').trim();

    // Parse models from environment or use proven live cascade
    const envModels = (process.env.MWALIMU_AI_MODELS || '').split(',').map(m => m.trim()).filter(Boolean);
    this.candidateModels = envModels.length > 0 ? envModels : [
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest'
    ];

    // Circuit breaker state: modelName -> disabledUntilTimestamp
    this.circuitBreakers = new Map();
  }

  _isModelAvailable(model) {
    const disabledUntil = this.circuitBreakers.get(model);
    if (!disabledUntil) return true;
    if (Date.now() > disabledUntil) {
      this.circuitBreakers.delete(model);
      return true;
    }
    return false;
  }

  _tripCircuitBreaker(model, durationSeconds = 60) {
    this.circuitBreakers.set(model, Date.now() + durationSeconds * 1000);
  }

  _buildSystemPrompt() {
    return `You are "Mwalimu AI", an exceptional, supportive university and college tutor sitting right next to the student with a pen and a notebook.

ACADEMIC SCOPE & DISCIPLINES:
You teach and guide students across ALL university & college fields:
1. MATHEMATICS & STATISTICS (Calculus, Linear Algebra, Probability, ODE/PDE, Discrete Math, Proofs).
2. COMPUTER SCIENCE & SOFTWARE (Algorithms, Data Structures, Python, Java, C/C++, JavaScript/TypeScript, SQL, System Design, Operating Systems, Networking).
3. ENGINEERING (Electrical, Mechanical, Civil, Mechatronics, Circuit Analysis, Thermodynamics, Mechanics).
4. MEDICINE, NURSING & PHARMACY (Anatomy, Physiology, Pathology, Pharmacology, Clinical reasoning principles, Medical ethics).
5. LAW (Kenyan Legal System, Constitution of Kenya 2010, Common Law, Law of Contract, Torts, Criminal Law, Evidence, Civil Procedure using the IRAC method).
6. BUSINESS, FINANCE & ECONOMICS (Financial Accounting, Managerial Finance, Micro/Macroeconomics, Taxation, Auditing, Supply Chain).
7. NATURAL SCIENCES (Physics, Chemistry, Biology, Biochemistry, Genetics).
8. HUMANITIES & SOCIAL SCIENCES (Communication, Philosophy, Sociology, History, Research Methods).

CORE SOCRATIC PEDAGOGY:
1. START WITH INTUITION & PURPOSE:
   - Before technical formulas or legal jargon, explain in plain, relatable language:
     • What problem does this concept solve?
     • Why does it matter in real life and in exams?
     • What is the big picture idea?
2. TEACH HOW TO THINK (NO SKIPPED STEPS):
   - Walk the student through the reasoning step-by-step.
   - Explain WHY each intermediate step is taken ("Because condition X holds...", "Therefore, we need...").
   - For calculations/proofs: present clean, indented Unicode steps (e.g., Step 1, Step 2).
   - For code: provide clean, well-commented code snippets with time/space complexity notes.
   - For law: structure clearly with Issue -> Rule/Statute -> Application -> Conclusion (IRAC).
   - For medicine/nursing: explain the physiological mechanism and remind to verify with local clinical guidelines.
3. EXAM PATTERNS & TRAPS:
   - Highlight: "Where students usually trip up on exams is..."
   - Point out key patterns so the student recognizes similar problems instantly.
4. TONE & PACING:
   - Friendly, encouraging, brilliant senior peer who wants the student to excel.
   - Academically rigorous, zero textbook fluff.
   - Bite-sized responses (under 300 words).
   - Conclude naturally with ONE punchy conceptual check question or a natural prompt for the next step.
   - Match the student's language naturally (English, Kiswahili, or Sheng).

WHATSAPP FORMATTING RULES (STRICT):
• Use single asterisks for *bold* (never double **bold**).
• Use clean Unicode symbols for math (e.g. ², ³, √, ∫, Σ, μ, σ, α, β, λ, ≤, ≥, ≠, ±, →).
• NEVER output raw LaTeX (like \\frac, \\begin, \\text, \\sum).
• Never write inline lists like (1)... (2)... (3)... Always use vertical bullet points:
  • Point 1
  • Point 2
• Never output roleplay stage directions (e.g. *leans back*, *smiles*).`;
  }

  /**
   * Generates a Socratic study answer with multi-model fallback.
   */
  async answerStudentQuery({ studentPhone, queryText, mediaBase64 = null, mediaMimeType = 'image/jpeg', recentContext = '' }) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const systemPrompt = this._buildSystemPrompt();
    let promptWithContext = queryText || 'Please analyze this attached study material and guide me step-by-step.';
    if (recentContext && recentContext.trim().length > 0) {
      promptWithContext = `[Previous Context: ${recentContext.trim()}]\n\nStudent Question: ${promptWithContext}`;
    }

    const parts = [{ text: promptWithContext }];

    if (mediaBase64) {
      parts.unshift({
        inline_data: {
          mime_type: mediaMimeType,
          data: mediaBase64
        }
      });
    }

    const payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 950,
        topP: 0.85
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
      ]
    };

    let lastError = null;
    const isMedia = !!mediaBase64;
    const perAttemptTimeoutMs = isMedia ? 20000 : 12000;

    for (const model of this.candidateModels) {
      if (!this._isModelAvailable(model)) {
        continue;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), perAttemptTimeoutMs);

      const startTime = Date.now();
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutTimer);

        const data = await response.json().catch(() => ({}));
        const durationMs = Date.now() - startTime;

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text;
          console.log(`[MwalimuAIClient] Model ${model} responded in ${durationMs}ms (${rawText.length} chars)`);
          return MwalimuContentFormatter.cleanForWhatsApp(rawText);
        }

        const httpStatus = response.status;
        const errMsg = data.error?.message || `HTTP ${httpStatus}`;
        console.warn(`[MwalimuAIClient] Model ${model} failed (${httpStatus} in ${durationMs}ms): ${errMsg}`);

        if (httpStatus === 404) {
          this._tripCircuitBreaker(model, 1800); // 30 min for decommissioned models
        } else if (httpStatus === 503 || httpStatus === 429) {
          this._tripCircuitBreaker(model, 60); // 1 min for temporary capacity spikes
        }

        lastError = new Error(errMsg);
      } catch (err) {
        clearTimeout(timeoutTimer);
        const durationMs = Date.now() - startTime;
        const isTimeout = err.name === 'AbortError';
        console.warn(`[MwalimuAIClient] Model ${model} exception (${isTimeout ? 'timeout' : err.message}) in ${durationMs}ms`);
        this._tripCircuitBreaker(model, 45);
        lastError = err;
      }
    }

    console.error('[MwalimuAIClient] All candidate models exhausted:', lastError?.message);
    throw lastError || new Error('ALL_AI_MODELS_UNAVAILABLE');
  }
}

// ─── 4. HIGH-CONCURRENCY DISPATCHER & SHORT COMMANDS ENGINE ───────────────────
export class MwalimuDispatcher {
  constructor({ quotaService, aiClient, paystackSecretKey, sendWhatsAppFunc }) {
    this.quota = quotaService;
    this.ai = aiClient;
    this.paystackKey = (paystackSecretKey || process.env.PAYSTACK_SECRET_KEY || '').trim();
    this.sendWhatsApp = sendWhatsAppFunc || sendWhatsAppMessage;

    // Deduplication Set: remembers message IDs for 90s to kill Meta retry storms
    this.processedMsgIds = new Map();
    // In-flight user lock to prevent concurrent double-answering
    this.inFlightUsers = new Set();
    // Pending dual-phone checkout store: Student Phone -> { planId, amountKes, timestamp }
    this.pendingCheckout = new Map();

    // Clean up stale cache periodically
    setInterval(() => {
      const now = Date.now();
      for (const [id, time] of this.processedMsgIds.entries()) {
        if (now - time > 90000) this.processedMsgIds.delete(id);
      }
      for (const [phone, sess] of this.pendingCheckout.entries()) {
        if (now - sess.timestamp > 15 * 60 * 1000) this.pendingCheckout.delete(phone);
      }
    }, 60000);
  }

  /**
   * Securely downloads media binary from Meta Cloud API.
   * Enforces 10MB upload limit and supported MIME types.
   */
  async _downloadMetaMedia(media) {
    if (!media || !media.id) return null;
    const token = (process.env.WHATSAPP_API_TOKEN || '').trim();
    if (!token) {
      console.warn('[MwalimuDispatcher] WHATSAPP_API_TOKEN not configured for media download');
      return null;
    }

    try {
      // Step 1: Query Meta Graph API for temporary binary URL (5-minute expiry)
      const metaUrlRes = await fetch(`https://graph.facebook.com/${WA_GRAPH_VERSION}/${media.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!metaUrlRes.ok) {
        console.error('[MwalimuDispatcher] Failed to fetch media URL from Meta:', await metaUrlRes.text());
        return null;
      }
      const metaData = await metaUrlRes.json();
      if (!metaData.url) return null;

      if (metaData.file_size && metaData.file_size > MAX_UPLOAD_SIZE_BYTES) {
        return { error: 'FILE_TOO_LARGE', fileSize: metaData.file_size };
      }

      // Step 2: Download raw binary stream with timeout
      const controller = new AbortController();
      const downloadTimer = setTimeout(() => controller.abort(), 18000);

      const binRes = await fetch(metaData.url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });
      clearTimeout(downloadTimer);

      if (!binRes.ok) return null;

      const arrayBuffer = await binRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
        return { error: 'FILE_TOO_LARGE', fileSize: buffer.length };
      }

      const mimeType = metaData.mime_type || media.mimeType || 'image/jpeg';

      return {
        base64: buffer.toString('base64'),
        mimeType,
        fileSize: buffer.length
      };
    } catch (err) {
      console.error('[MwalimuDispatcher] Media download exception:', err.message);
      return null;
    }
  }

  /**
   * Main inbound message processor.
   */
  async processInboundMessage({ messageId, fromPhone, textBody, media = null, interactiveButtonId = null }) {
    // 1. Deduplication (Kills Meta retry storms immediately)
    if (messageId && this.processedMsgIds.has(messageId)) {
      console.log(`[MwalimuDispatcher] Discarding duplicate Meta retry: ${messageId}`);
      return;
    }
    if (messageId) {
      this.processedMsgIds.set(messageId, Date.now());
    }

    const cleanPhone = String(fromPhone || '').replace(/\D/g, '');
    const rawText = (textBody || '').trim();
    const lowerText = rawText.toLowerCase();

    // 2. Fire-and-forget typing indicator & read receipt to immediately engage student
    if (messageId) {
      sendTypingIndicator(messageId).catch(() => {});
    }

    // 3. Handle Interactive Button Clicks
    const buttonId = interactiveButtonId || '';
    if (buttonId.startsWith('BUY_PLAN_') || buttonId.startsWith('PAY_SELF_') || buttonId.startsWith('PAY_OTHER_') || buttonId.startsWith('MENU_') || buttonId.startsWith('NEXT_') || buttonId.startsWith('QUIZ_')) {
      return await this._handleButtonAction(cleanPhone, buttonId);
    }

    // 4. Short Commands Engine (Clean, Immediate, Multi-Course)
    if (this._isHelpCommand(lowerText)) {
      return await this._handleHelpCommand(cleanPhone);
    }
    if (this._isStatusCommand(lowerText)) {
      return await this._handleStatusQuery(cleanPhone);
    }
    if (this._isPricingCommand(lowerText)) {
      return await this._sendBillingPaywallPrompt(cleanPhone);
    }
    if (this._isResetCommand(lowerText)) {
      return await this._handleResetCommand(cleanPhone);
    }
    if (this._isRestoreCommand(lowerText)) {
      const parts = rawText.split(/\s+/);
      const possibleReceipt = parts.length > 1 ? parts[1].trim() : null;
      return await this._handleRestorePass(cleanPhone, possibleReceipt);
    }

    // 5. Direct M-Pesa Receipt Detection (e.g. "SBA7XYZ123")
    const mpesaReceiptMatch = rawText.match(/^[A-Z0-9]{10}$/);
    if (mpesaReceiptMatch && !this._isCommonWord(mpesaReceiptMatch[0])) {
      return await this._handleRestorePass(cleanPhone, mpesaReceiptMatch[0]);
    }

    // 6. Handle Pending Dual-Phone Checkout (Student submitting Payer Phone Number)
    const pending = this.pendingCheckout.get(cleanPhone);
    if (pending && Date.now() - pending.timestamp < 15 * 60 * 1000) {
      if (lowerText === 'cancel') {
        this.pendingCheckout.delete(cleanPhone);
        await this.sendWhatsApp({
          to: cleanPhone,
          responseData: {
            type: 'text',
            text: { preview_url: false, body: '❌ *Checkout Cancelled.*\n\nWhat study question or topic would you like to explore?' }
          }
        });
        return;
      }

      const digitsOnly = rawText.replace(/\D/g, '');
      let payerClean = null;
      if (digitsOnly.length === 10 && (digitsOnly.startsWith('07') || digitsOnly.startsWith('01'))) {
        payerClean = '254' + digitsOnly.slice(1);
      } else if (digitsOnly.length === 9 && (digitsOnly.startsWith('7') || digitsOnly.startsWith('1'))) {
        payerClean = '254' + digitsOnly;
      } else if (digitsOnly.length === 12 && digitsOnly.startsWith('254')) {
        payerClean = digitsOnly;
      }

      if (payerClean) {
        this.pendingCheckout.delete(cleanPhone);
        const plan = MwalimuPlanManager.getPlan(pending.planId);
        return await this._triggerStkPush(cleanPhone, payerClean, plan.id);
      } else {
        await this.sendWhatsApp({
          to: cleanPhone,
          responseData: {
            type: 'text',
            text: {
              preview_url: false,
              body: `⚠️ *Please enter a valid 10-digit Kenyan phone number* (e.g. \`0712345678\` or \`0112345678\`), or reply *cancel*.`
            }
          }
        });
        return;
      }
    }

    // 7. Check Student Eligibility (Free 3 queries/day or Active Paid Pass)
    const eligibility = await this.quota.checkEligibility(cleanPhone);
    if (!eligibility.allowed) {
      return await this._sendBillingPaywallPrompt(cleanPhone);
    }

    // 8. Prevent duplicate in-flight processing for the same user
    if (this.inFlightUsers.has(cleanPhone)) {
      console.log(`[MwalimuDispatcher] Debouncing overlapping message from ${cleanPhone}`);
      return;
    }
    this.inFlightUsers.add(cleanPhone);

    // 9. Handle Media Attachments & 10MB Limit
    let mediaPayload = null;
    if (media) {
      if (media.fileSize > MAX_UPLOAD_SIZE_BYTES) {
        this.inFlightUsers.delete(cleanPhone);
        const sizeMb = (media.fileSize / (1024 * 1024)).toFixed(1);
        await this.sendWhatsApp({
          to: cleanPhone,
          responseData: {
            type: 'text',
            text: {
              preview_url: false,
              body: `⚠️ *Document Exceeds 10MB Limit*\n\n` +
                    `Your file is *${sizeMb}MB*. To keep Socratic tutoring fast, Mwalimu AI supports files up to *10MB*.\n\n` +
                    `💡 *Tip:* Send just the specific page, take a screenshot of the question, or split your PDF.`
            }
          }
        });
        return;
      }

      // Check supported MIME types
      const mime = (media.mimeType || '').toLowerCase();
      const isSupported = mime.startsWith('image/') ||
                          mime === 'application/pdf' ||
                          mime.startsWith('audio/') ||
                          mime.startsWith('text/');

      if (!isSupported && !mime.includes('octet-stream')) {
        this.inFlightUsers.delete(cleanPhone);
        await this.sendWhatsApp({
          to: cleanPhone,
          responseData: {
            type: 'text',
            text: {
              preview_url: false,
              body: `📄 *Attachment Notice*\n\n` +
                    `Mwalimu AI currently processes *Images*, *PDF study documents*, and *Voice notes*.\n\n` +
                    `💡 If you have a Word/PowerPoint document, please *Save as PDF* or take a *screenshot* of the question and send it here!`
            }
          }
        });
        return;
      }

      const downloaded = await this._downloadMetaMedia(media);
      if (downloaded?.error === 'FILE_TOO_LARGE') {
        this.inFlightUsers.delete(cleanPhone);
        await this.sendWhatsApp({
          to: cleanPhone,
          responseData: {
            type: 'text',
            text: { preview_url: false, body: '⚠️ *Document Exceeds 10MB Limit*\n\nPlease send a file under 10MB.' }
          }
        });
        return;
      }
      mediaPayload = downloaded;
    }

    // 10. Generate Socratic AI Response
    try {
      const user = await this.quota.getStudentState(cleanPhone);
      const queryPrompt = rawText || (mediaPayload?.mimeType?.startsWith('audio/')
        ? 'Please listen to this voice note and answer the student\'s study question step-by-step.'
        : 'Please analyze this attached study material/document and guide me through the key concepts and worked steps.');

      const answer = await this.ai.answerStudentQuery({
        studentPhone: cleanPhone,
        queryText: queryPrompt,
        mediaBase64: mediaPayload?.base64 || null,
        mediaMimeType: mediaPayload?.mimeType || 'image/jpeg',
        recentContext: user.recent_context || ''
      });

      // Record usage only on successful completion
      await this.quota.recordUsage(
        cleanPhone,
        `Student: ${queryPrompt.substring(0, 180)} | Tutor: ${answer.substring(0, 250)}`
      );

      // Send structured WhatsApp reply
      await this._sendInteractiveAnswer(cleanPhone, answer, eligibility);
    } catch (err) {
      console.error('[MwalimuDispatcher] AI Generation Exception:', err.message);
      await this.sendWhatsApp({
        to: cleanPhone,
        responseData: {
          type: 'text',
          text: {
            preview_url: false,
            body: '⚠️ *Mwalimu AI Server Notice:* Our AI compute nodes are currently handling high traffic. Your question was *NOT* deducted from your daily quota. Please re-send your question in 1 minute.'
          }
        }
      });
    } finally {
      this.inFlightUsers.delete(cleanPhone);
    }
  }

  /**
   * Dispatches the answer along with contextual action buttons.
   * Uses two-message chunking if total text exceeds Meta's 1024-character interactive limit.
   */
  async _sendInteractiveAnswer(to, answerText, eligibility) {
    const quotaNotice = eligibility.isPaid
      ? '⚡ *VIP Unlimited Pass Active*'
      : `⭐ *Free Daily Questions Left:* ${Math.max(0, (eligibility.remainingFree || 1) - 1)}/3`;

    const fullMessage = `${answerText}\n\n---\n${quotaNotice}`;

    if (fullMessage.length > 900) {
      // 1. Send full answer as standard text (WhatsApp supports up to 4096 chars)
      await this.sendWhatsApp({
        to,
        responseData: {
          type: 'text',
          text: { preview_url: false, body: fullMessage }
        }
      });

      // 2. Follow up with quick action buttons
      const followUpPayload = {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: '🎓 *What should we explore next?*' },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'NEXT_STEP', title: 'Next Step ⏩' } },
              { type: 'reply', reply: { id: 'MENU_EXAMPLE', title: 'Give Example 💡' } },
              { type: 'reply', reply: { id: 'MENU_PRICING', title: 'Get Unlimited ⚡' } }
            ]
          }
        }
      };

      await this.sendWhatsApp({ to, responseData: followUpPayload });
    } else {
      // Single message for short responses (< 900 characters)
      const interactivePayload = {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: fullMessage },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'NEXT_STEP', title: 'Next Step ⏩' } },
              { type: 'reply', reply: { id: 'MENU_EXAMPLE', title: 'Give Example 💡' } },
              { type: 'reply', reply: { id: 'MENU_PRICING', title: 'Get Unlimited ⚡' } }
            ]
          }
        }
      };

      await this.sendWhatsApp({ to, responseData: interactivePayload });
    }
  }

  // ─── COMMAND HELPERS & ROUTING ──────────────────────────────────────────────
  _isHelpCommand(text) {
    return ['help', '/help', 'menu', '/menu', 'start', '/start', 'hi', 'hello', 'habari', 'mambo', 'niaje', 'sasa', 'jambo', 'hey', '?'].includes(text);
  }

  _isStatusCommand(text) {
    return ['status', '/status', 'account', '/account', 'my pass', 'check', 'whoami', 'profile'].includes(text);
  }

  _isPricingCommand(text) {
    return ['prices', '/prices', 'pricing', 'buy', '/buy', 'upgrade', '/upgrade', 'plans', 'pay', 'packages'].includes(text);
  }

  _isResetCommand(text) {
    return ['reset', '/reset', 'clear', '/clear', 'new', 'new topic', 'fresh', 'restart'].includes(text);
  }

  _isRestoreCommand(text) {
    return text.startsWith('restore') || text.startsWith('/restore') ||
           text.startsWith('claim') || text.startsWith('/claim') ||
           text.startsWith('reconnect') || text.startsWith('verify');
  }

  _isCommonWord(word) {
    return ['CHEBYSHEV', 'ALGORITHM', 'QUESTIONS', 'PROBABILITY', 'DERIVATIVE', 'INTEGRAL', 'STATISTICS'].includes(word);
  }

  async _handleHelpCommand(phone) {
    const plans = Object.values(MwalimuPlanManager.getPlans());
    const minPrice = plans[0]?.priceKes || 20;

    const helpText = `🎓 *MWALIMU AI — UNIVERSAL UNIVERSITY TUTOR*\n\n` +
      `I am your 24/7 AI tutor for all your courses & revision:\n\n` +
      `📚 *All Subjects Supported:*\n` +
      `• *Maths & Statistics:* Step-by-step proofs & working\n` +
      `• *Computer Science:* Code, algorithms, debugging & SQL\n` +
      `• *Engineering:* Circuit analysis, mechanics & formulas\n` +
      `• *Medicine & Health:* Anatomy, physiology & pathology\n` +
      `• *Law:* IRAC analysis, case synthesis & Kenyan statutes\n` +
      `• *Business & Economics:* Accounting, finance & models\n` +
      `• *Sciences & Humanities:* Physics, chemistry, essays\n\n` +
      `📤 *How to Ask:*\n` +
      `1. Type your question directly\n` +
      `2. Send a *photo* of your CAT/exam past paper\n` +
      `3. Send a *PDF* document (up to 10MB)\n` +
      `4. Record a *voice note*\n\n` +
      `⚡ *Commands Menu:*\n` +
      `• \`/status\` — View active pass & free query balance\n` +
      `• \`/prices\` — Get unmetered passes from KSh ${minPrice}\n` +
      `• \`/restore\` — Reconnect your pass after paying\n` +
      `• \`/reset\` — Clear chat context for a new topic\n\n` +
      `⭐ *Free Daily Tier:* 3 free questions every day!`;

    await this.sendWhatsApp({
      to: phone,
      responseData: {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: helpText },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'MENU_PRICING', title: 'View Plans ⚡' } },
              { type: 'reply', reply: { id: 'MENU_STATUS', title: 'Check Status 📊' } }
            ]
          }
        }
      }
    });
  }

  async _handleStatusQuery(phone) {
    const user = await this.quota.getStudentState(phone);
    const eligibility = await this.quota.checkEligibility(phone);
    const localPhone = phone.startsWith('254') ? '0' + phone.slice(3) : phone;

    let statusBody = `🎓 *MWALIMU AI — ACCOUNT STATUS*\n\n` +
      `📱 *Student Number:* ${localPhone} (+${phone})\n`;

    if (eligibility.isPaid) {
      const expDate = new Date(user.valid_until).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
      statusBody += `⚡ *Access Tier:* 👑 *VIP Pro Pass (Active)*\n` +
                    `⏳ *Valid Until:* ${expDate} (EAT)\n` +
                    `📊 *Questions:* *Unlimited 24/7 Access*\n\n` +
                    `Send any assignment question or study document to start learning!`;
    } else {
      statusBody += `⭐ *Access Tier:* Free Tier\n` +
                    `📊 *Remaining Today:* ${eligibility.remainingFree}/3 free questions\n\n` +
                    `💡 Need unlimited questions? Type \`/prices\` or tap *Get Unlimited ⚡* below.`;
    }

    await this.sendWhatsApp({
      to: phone,
      responseData: {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: statusBody },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'MENU_PRICING', title: 'Get Unlimited ⚡' } },
              { type: 'reply', reply: { id: 'MENU_HELP', title: 'Help & Guides 📖' } }
            ]
          }
        }
      }
    });
  }

  async _handleResetCommand(phone) {
    await this.quota.resetStudentContext(phone);
    await this.sendWhatsApp({
      to: phone,
      responseData: {
        type: 'text',
        text: {
          preview_url: false,
          body: '🔄 *Topic Reset Complete.*\n\nRecent context memory has been cleared. What new study subject, assignment, or past paper would you like to explore?'
        }
      }
    });
  }

  async _sendBillingPaywallPrompt(phone, customHeader = null) {
    const text = MwalimuPlanManager.generatePaywallText(customHeader);
    const buttons = MwalimuPlanManager.generatePaywallButtons();

    await this.sendWhatsApp({
      to: phone,
      responseData: {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text },
          action: { buttons }
        }
      }
    });
  }

  async _handleButtonAction(phone, buttonId) {
    const plan = MwalimuPlanManager.getPlanByButtonId(buttonId);
    if (plan) {
      return await this._sendDualPhoneSelection(phone, plan);
    }

    if (buttonId.startsWith('PAY_SELF_')) {
      const planId = buttonId.replace('PAY_SELF_', '');
      return await this._triggerStkPush(phone, phone, planId);
    }

    if (buttonId.startsWith('PAY_OTHER_')) {
      const planId = buttonId.replace('PAY_OTHER_', '');
      const selectedPlan = MwalimuPlanManager.getPlan(planId);
      this.pendingCheckout.set(phone, {
        planId: selectedPlan.id,
        amountKes: selectedPlan.priceKes,
        timestamp: Date.now()
      });

      return await this.sendWhatsApp({
        to: phone,
        responseData: {
          type: 'text',
          text: {
            preview_url: false,
            body: `✍️ *Pay with Another M-Pesa Line*\n\n` +
                  `Selected: *${selectedPlan.name}* (KSh ${selectedPlan.priceKes})\n\n` +
                  `Please reply with the *10-digit M-Pesa phone number* (e.g. \`0712345678\` or \`0112345678\`) of the person paying.\n\n` +
                  `🔒 *Pass Guarantee:* Once PIN is entered, *THIS* WhatsApp account activates instantly!\n\n` +
                  `_(Reply "cancel" to cancel)_`
          }
        }
      });
    }

    if (buttonId === 'MENU_PRICING') {
      return await this._sendBillingPaywallPrompt(phone, '🎓 *Mwalimu AI Study Passes*');
    }
    if (buttonId === 'MENU_STATUS') {
      return await this._handleStatusQuery(phone);
    }
    if (buttonId === 'MENU_HELP') {
      return await this._handleHelpCommand(phone);
    }
    if (buttonId === 'NEXT_STEP') {
      return await this.processInboundMessage({
        messageId: `btn_${Date.now()}_${phone}`,
        fromPhone: phone,
        textBody: 'Please continue to the next step of the previous explanation with full working.'
      });
    }
    if (buttonId === 'MENU_EXAMPLE') {
      return await this.processInboundMessage({
        messageId: `btn_${Date.now()}_${phone}`,
        fromPhone: phone,
        textBody: 'Please give me a concrete, real-world example with numbers or a case study for that concept.'
      });
    }
  }

  async _sendDualPhoneSelection(phone, plan) {
    const localPhone = phone.startsWith('254') ? '0' + phone.slice(3) : phone;

    const message = `🎓 *${plan.name} (KSh ${plan.priceKes})*\n\n` +
      `How would you like to pay with M-Pesa?\n\n` +
      `• *This WhatsApp Line:* (${localPhone})\n` +
      `• *Another M-Pesa Number:* (Parent, Friend, or SIM 2)\n\n` +
      `🔒 *Your study pass is guaranteed to activate on THIS WhatsApp chat.*`;

    await this.sendWhatsApp({
      to: phone,
      responseData: {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: message },
          action: {
            buttons: [
              { type: 'reply', reply: { id: `PAY_SELF_${plan.id}`, title: 'This WhatsApp 📱' } },
              { type: 'reply', reply: { id: `PAY_OTHER_${plan.id}`, title: 'Other M-Pesa No 💳' } }
            ]
          }
        }
      }
    });
  }

  /**
   * Reconnects or Restores a pass.
   * Queries Paystack transactions linked to the student phone number.
   */
  async _handleRestorePass(phone, receiptCode = null) {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('254') ? cleanPhone : '254' + cleanPhone.replace(/^0/, '');

    await this.sendWhatsApp({
      to: cleanPhone,
      responseData: {
        type: 'text',
        text: { preview_url: false, body: '🔍 *Verifying payment records with Paystack & Safaricom...*' }
      }
    });

    try {
      // 1. Direct Paystack Reference verification if code is supplied
      if (receiptCode && this.paystackKey && !this.paystackKey.startsWith('sk_test_placeholder')) {
        const cleanCode = receiptCode.trim().toUpperCase();
        const pVerifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanCode)}`, {
          headers: { Authorization: `Bearer ${this.paystackKey}` }
        });
        const pVerifyData = await pVerifyRes.json().catch(() => ({}));

        if (pVerifyData?.data?.status === 'success') {
          const amtKes = Math.round((pVerifyData.data.amount || 0) / 100);
          let planId = 'daily_24h';
          if (amtKes >= 180) planId = 'semester_30d';
          else if (amtKes >= 45) planId = 'weekend_3d';

          const res = await this.quota.activateSubscription(cleanPhone, planId, cleanCode, amtKes);
          const expStr = new Date(res.validUntil).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

          return await this.sendWhatsApp({
            to: cleanPhone,
            responseData: {
              type: 'text',
              text: {
                preview_url: false,
                body: `🎉 *Payment Verified & Pass Restored!*\n\n` +
                      `Reference: *${cleanCode}*\n` +
                      `Plan: *${res.planName || planId}* (KSh ${amtKes})\n` +
                      `Valid Until: *${expStr}* (EAT)\n\n` +
                      `Your 24/7 Socratic tutor is ready! Send your question anytime.`
              }
            }
          });
        }
      }

      // 2. Query Paystack by student email customer identity
      if (this.paystackKey && !this.paystackKey.startsWith('sk_test_placeholder')) {
        const studentEmail = `student_${formattedPhone}@mwalimu.duncanmakoyo.com`;
        const custRes = await fetch(`https://api.paystack.co/customer/${encodeURIComponent(studentEmail)}`, {
          headers: { Authorization: `Bearer ${this.paystackKey}` }
        });
        const custData = await custRes.json().catch(() => ({}));

        if (custData?.data?.id) {
          const txRes = await fetch(`https://api.paystack.co/transaction?customer=${custData.data.id}&status=success&perPage=10`, {
            headers: { Authorization: `Bearer ${this.paystackKey}` }
          });
          const txData = await txRes.json().catch(() => ({}));
          const successTxs = txData?.data || [];

          if (successTxs.length > 0) {
            const latestTx = successTxs[0];
            const amtKes = Math.round((latestTx.amount || 0) / 100);
            let planId = latestTx.metadata?.plan || 'daily_24h';
            if (amtKes >= 180) planId = 'semester_30d';
            else if (amtKes >= 45) planId = 'weekend_3d';

            const ref = latestTx.reference || `PAY_${latestTx.id}`;
            const res = await this.quota.activateSubscription(cleanPhone, planId, ref, amtKes);
            const expStr = new Date(res.validUntil).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

            return await this.sendWhatsApp({
              to: cleanPhone,
              responseData: {
                type: 'text',
                text: {
                  preview_url: false,
                  body: `🎉 *Pass Restored Successfully!*\n\n` +
                        `Plan: *${res.planName || planId}* (KSh ${amtKes})\n` +
                        `Valid Until: *${expStr}* (EAT)\n\n` +
                        `Unlimited study access is active! Send any study question or document to begin.`
                }
              }
            });
          }
        }
      }

      // No successful payment found
      await this.sendWhatsApp({
        to: cleanPhone,
        responseData: {
          type: 'text',
          text: {
            preview_url: false,
            body: `⚠️ *No Recent Payment Found*\n\n` +
                  `We could not find an unactivated payment for *+${formattedPhone}*.\n\n` +
                  `• If you received a Safaricom SMS with a code (e.g. \`SBA7XYZ123\`), reply with:\n` +
                  `  *RESTORE <CODE>*\n\n` +
                  `• Or type \`/prices\` to get an instant pass.`
          }
        }
      });
    } catch (err) {
      console.error('[MwalimuDispatcher] Restore exception:', err.message);
    }
  }

  /**
   * Triggers an M-Pesa STK push via Paystack.
   * Strict server-side pricing from MwalimuPlanManager (zero client tampering).
   */
  async _triggerStkPush(studentPhone, payerPhone, planType) {
    const cleanStudent = studentPhone.replace(/\D/g, '');
    const cleanPayer = payerPhone.replace(/\D/g, '');
    const formattedStudent = cleanStudent.startsWith('254') ? cleanStudent : '254' + cleanStudent.replace(/^0/, '');
    const formattedPayer = cleanPayer.startsWith('254') ? cleanPayer : '254' + cleanPayer.replace(/^0/, '');
    const ref = `MWA_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const verifiedPlan = MwalimuPlanManager.getPlan(planType);
    const verifiedAmountKes = verifiedPlan.priceKes;

    const isDifferentPayer = cleanStudent !== cleanPayer;
    const payerNotice = isDifferentPayer
      ? `We dispatched an M-Pesa PIN prompt for *KSh ${verifiedAmountKes}* (${verifiedPlan.name}) to *0${cleanPayer.slice(-9)}*.\n\n🔒 *Guarantee:* Once they enter their M-Pesa PIN, *THIS* WhatsApp account will activate immediately!`
      : `We sent an M-Pesa PIN prompt for *KSh ${verifiedAmountKes}* (${verifiedPlan.name}) to *+${formattedStudent}*.\n\nEnter your M-Pesa PIN on your phone to unlock unlimited study access instantly.`;

    try {
      // Step 1: Send prompt notice to student
      await this.sendWhatsApp({
        to: cleanStudent,
        responseData: {
          type: 'text',
          text: {
            preview_url: false,
            body: `📱 *Requesting M-Pesa PIN Prompt...*\n\n${payerNotice}`
          }
        }
      });

      if (!this.paystackKey || this.paystackKey.startsWith('sk_test_placeholder')) {
        console.warn('[MwalimuBilling] PAYSTACK_SECRET_KEY not configured or test placeholder.');
        return;
      }

      // Step 2: Dispatch STK Charge to Paystack
      const paystackRes = await fetch('https://api.paystack.co/charge', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.paystackKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: verifiedAmountKes * 100, // Cents strictly enforced by backend
          email: `student_${formattedStudent}@mwalimu.duncanmakoyo.com`,
          currency: 'KES',
          channels: ['mobile_money'],
          mobile_money: {
            phone: `+${formattedPayer}`,
            provider: 'mpesa'
          },
          reference: ref,
          metadata: {
            service: 'mwalimu_ai',
            product: 'mwalimu_pass',
            venture: 'Mwalimu AI',
            plan: verifiedPlan.id,
            phone: formattedStudent, // The student who receives the pass
            payer_phone: formattedPayer
          }
        })
      });

      const resData = await paystackRes.json().catch(() => ({}));
      console.log(`[MwalimuBilling] Paystack STK dispatched: ${ref} (Payer: ${formattedPayer}, Student: ${formattedStudent}) | Status: ${resData.status}`);

      if (!paystackRes.ok) {
        console.error('[MwalimuBilling] Paystack charge error:', resData);
        await this.sendWhatsApp({
          to: cleanStudent,
          responseData: {
            type: 'text',
            text: {
              preview_url: false,
              body: `⚠️ *M-Pesa STK Notice:* We could not initiate the prompt right now (${resData.message || 'Network error'}).\n\nPlease try again or reply \`/prices\`.`
            }
          }
        });
      }
    } catch (err) {
      console.error('[MwalimuBilling] STK Push Exception:', err.message);
    }
  }
}
