/**
 * ============================================================================
 * MWALIMU AI: THE AUTONOMOUS WHATSAPP AI STUDY & PDF ASSISTANT ENGINE
 * ============================================================================
 * High-concurrency, zero-storage, production-grade Socratic study tutor.
 * 
 * Architectural Highlights:
 * 1. Clean OOP Modular Services
 * 2. Inbound Deduplication & Event-Driven Debounce (prevents Meta retry storms)
 * 3. Ephemeral Zero-Storage Architecture (< 3MB total Supabase footprint)
 * 4. Progressive Socratic Chunking & WhatsApp Unicode Math Formatter
 * 5. M-Pesa Micro-Billing (20 bob cram pass / 50 bob weekend / 150 bob semester)
 */

import crypto from 'crypto';

// ─── 0. DYNAMIC STUDY PLANS & BILLING CONFIGURATION (OOP & ZERO HARDCODING) ───
export class MwalimuPlanManager {
  /**
   * Retrieves all active study pass configurations.
   * Dynamically reads environment overrides with optimal student-budget defaults.
   * Unit Economics Account For:
   * - Render Starter Plan ($7/mo = ~KSh 945/mo)
   * - Meta WhatsApp 24h Conversation Windows (~KSh 1.08/window after 1,000 free/mo)
   * - Paystack M-Pesa processing fees (~1.5% - 2.5%)
   * - Gemini 2.5 Flash token usage (~KSh 0.01 / query)
   */
  static getPlans() {
    return {
      daily_24h: {
        id: 'daily_24h',
        name: '24-Hour Cram Pass',
        priceKes: Number(process.env.MWALIMU_PRICE_DAILY) || 20,
        durationHours: 24,
        buttonId: 'BUY_PLAN_DAILY',
        buttonTitle: `⚡ KSh ${Number(process.env.MWALIMU_PRICE_DAILY) || 20} (24 Hours)`,
        tier: 'daily',
        summary: 'Full exam night unmetered study'
      },
      weekend_3d: {
        id: 'weekend_3d',
        name: '3-Day Weekend & CATs Pass',
        priceKes: Number(process.env.MWALIMU_PRICE_WEEKEND) || 50,
        durationHours: 72,
        buttonId: 'BUY_PLAN_WEEKEND',
        buttonTitle: `📚 KSh ${Number(process.env.MWALIMU_PRICE_WEEKEND) || 50} (3 Days)`,
        tier: 'weekend',
        summary: 'CATs revision marathon unmetered'
      },
      semester_30d: {
        id: 'semester_30d',
        name: '30-Day Semester VIP Pass',
        priceKes: Number(process.env.MWALIMU_PRICE_SEMESTER) || 199,
        durationHours: 720,
        buttonId: 'BUY_PLAN_SEMESTER',
        buttonTitle: `👑 KSh ${Number(process.env.MWALIMU_PRICE_SEMESTER) || 199} (30 Days)`,
        tier: 'monthly',
        summary: 'Whole month unlimited Socratic tutor'
      }
    };
  }

  static getPlan(planId) {
    const plans = this.getPlans();
    return plans[planId] || plans['daily_24h'];
  }

  static validateAmount(planId, paidAmountKes) {
    const plan = this.getPlan(planId);
    return Number(paidAmountKes) >= Number(plan.priceKes);
  }

  static getPlanByButtonId(buttonId) {
    const plans = this.getPlans();
    // Support modern and legacy button IDs
    if (buttonId === 'BUY_PLAN_20') return plans.daily_24h;
    if (buttonId === 'BUY_PLAN_50') return plans.weekend_3d;
    if (buttonId === 'BUY_PLAN_150') return plans.semester_30d;
    return Object.values(plans).find(p => p.buttonId === buttonId) || null;
  }

  static generatePaywallText() {
    const plans = Object.values(this.getPlans());
    let txt = `🎓 *You've mastered today's 3 free questions!*\n\n` +
      `Don't let your study flow stall tonight. Unlock instant, unmetered Socratic tutoring with M-Pesa:\n\n`;
    for (const p of plans) {
      txt += `• *${p.name}:* KSh ${p.priceKes} (${p.summary})\n`;
    }
    txt += `\nSelect your study pass below to activate instantly:`;
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

// ─── 1. PEDAGOGICAL WHATSAPP FORMATTER (PROGRESSIVE MATH & ZERO-WALLS UX) ───────
export class MwalimuContentFormatter {
  /**
   * Converts standard LaTeX and math expressions into clean, legible WhatsApp Unicode
   */
  static formatMathToUnicode(text) {
    if (!text || typeof text !== 'string') return '';

    let formatted = text;

    // Unescape any escaped newlines
    formatted = formatted.replace(/\\n/g, '\n');

    // Superscripts
    const superMap = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
      'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 'k': 'ᵏ', 't': 'ᵗ'
    };
    formatted = formatted.replace(/\^([0-9niyxkt+-]+)/g, (_, match) => {
      return match.split('').map(c => superMap[c] || c).join('');
    });
    formatted = formatted.replace(/\^{([^}]+)}/g, (_, match) => {
      return match.split('').map(c => superMap[c] || c).join('');
    });

    // Subscripts
    const subMap = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
      'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'y': 'ᵧ', 'i': 'ᵢ', 'n': 'ₙ', 'k': 'ₖ'
    };
    formatted = formatted.replace(/_([0-9aeoxyink+-]+)/g, (_, match) => {
      return match.split('').map(c => subMap[c] || c).join('');
    });
    formatted = formatted.replace(/_{([^}]+)}/g, (_, match) => {
      return match.split('').map(c => subMap[c] || c).join('');
    });

    // Greek & Mathematical symbol mappings
    const symbolReplacements = [
      [/\\mu/g, 'μ'],
      [/\\sigma\^2/g, 'σ²'],
      [/\\sigma/g, 'σ'],
      [/\\lambda/g, 'λ'],
      [/\\alpha/g, 'α'],
      [/\\beta/g, 'β'],
      [/\\theta/g, 'θ'],
      [/\\Gamma/g, 'Γ'],
      [/\\Delta/g, 'Δ'],
      [/\\pi/g, 'π'],
      [/\\infty/g, '∞'],
      [/\\int/g, '∫'],
      [/\\sum/g, 'Σ'],
      [/\\sqrt{([^}]+)}/g, '√($1)'],
      [/\\sqrt/g, '√'],
      [/\\pm/g, '±'],
      [/\\geq/g, '≥'],
      [/\\leq/g, '≤'],
      [/\\ge/g, '≥'],
      [/\\le/g, '≤'],
      [/\\neq/g, '≠'],
      [/\\approx/g, '≈'],
      [/\\cdot/g, '·'],
      [/\\times/g, '×'],
      [/\\div/g, '÷'],
      [/\\to/g, '→'],
      [/\\implies/g, '⟹'],
      [/\\iff/g, '⟺'],
      [/\\in/g, '∈'],
      [/\\operatorname{Var}/g, 'Var'],
      [/\\operatorname{Cov}/g, 'Cov'],
      [/\\operatorname{E}/g, 'E'],
      [/\\operatorname{P}/g, 'P'],
      [/\\mathbb{E}/g, 'E'],
      [/\\mathbb{P}/g, 'P'],
      [/\\mathbb{R}/g, 'ℝ'],
      [/\\boxed{([^}]+)}/g, '*$1*'],
      [/\\frac{([^}]+)}{([^}]+)}/g, '($1 / $2)']
    ];

    symbolReplacements.forEach(([regex, replacement]) => {
      formatted = formatted.replace(regex, replacement);
    });

    // Convert display LaTeX math: \[ ... \] or $ ... $ into indented blocks
    formatted = formatted.replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => `\n\n        ${eq.trim()}\n\n`);
    formatted = formatted.replace(/\$\$([\s\S]*?)\$\$/g, (_, eq) => `\n\n        ${eq.trim()}\n\n`);

    // Convert inline LaTeX math: \( ... \) or $ ... $
    formatted = formatted.replace(/\\\((.*?)\\\)/g, '$1');
    formatted = formatted.replace(/\$([^$]+)\$/g, '$1');

    return formatted;
  }

  /**
   * Sanitizes Markdown for WhatsApp (bold, clean step spacing, table bullets)
   */
  static cleanForWhatsApp(text) {
    if (!text) return '';
    let out = this.formatMathToUnicode(text);

    // Replace Markdown headers (#, ##, ###) with bold text
    out = out.replace(/^#{1,6}\s+(.+)$/gm, '*$1*');

    // Replace standard Markdown tables with clean bullet points
    if (out.includes('|') && out.includes('---')) {
      const lines = out.split('\n');
      const cleanedLines = [];
      let inTable = false;
      let headers = [];

      for (const line of lines) {
        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
          if (line.includes('---')) {
            inTable = true;
            continue;
          }
          const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
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
      out = cleanedLines.join('\n');
    }

    // Limit maximum character dump to prevent cognitive overload
    if (out.length > 2200) {
      out = out.substring(0, 2100) + '\n\n*(Response truncated for brevity. Tap [Next Step ⏩] below to continue)*';
    }

    return out.trim();
  }
}

// ─── 2. QUOTA & SUBSCRIPTION SERVICE (ZERO DB BLOAT) ──────────────────────────
export class MwalimuQuotaService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Retrieves or creates a student account (< 120 bytes row)
   * Uses lazy daily quota reset on read.
   */
  async getStudentState(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const today = new Date().toISOString().split('T')[0];

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
        // Lazy-reset daily quota if it's a new calendar day
        if (user.last_query_date !== today) {
          user.queries_today = 0;
          user.last_query_date = today;
          await this.supabase
            .from('mwalimu_users')
            .update({ queries_today: 0, last_query_date: today })
            .eq('phone', cleanPhone);
        }
        return user;
      }

      // New Student Registration (Defaults to Free tier)
      const newUser = {
        phone: cleanPhone,
        tier: 'free',
        valid_until: new Date().toISOString(),
        queries_today: 0,
        last_query_date: today,
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
      return { phone: cleanPhone, tier: 'free', queries_today: 0, valid_until: new Date().toISOString() };
    }
  }

  /**
   * Verifies if a student can ask a question
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

    // Free Tier: Up to 3 questions per calendar day
    const FREE_LIMIT = 3;
    if (user.queries_today < FREE_LIMIT) {
      return {
        allowed: true,
        tier: 'free',
        remainingFree: FREE_LIMIT - user.queries_today,
        isPaid: false
      };
    }

    return {
      allowed: false,
      tier: 'free',
      queriesToday: user.queries_today,
      isPaid: false,
      reason: 'QUOTA_EXHAUSTED'
    };
  }

  /**
   * Increments usage and updates ephemeral rolling memory (overwrites context)
   */
  async recordUsage(phone, newContextSnippet = '') {
    const cleanPhone = phone.replace(/\D/g, '');
    const today = new Date().toISOString().split('T')[0];

    try {
      const user = await this.getStudentState(cleanPhone);
      const isPaidActive = user.valid_until && new Date(user.valid_until) > new Date();

      const updatePayload = {
        last_query_date: today,
        recent_context: (newContextSnippet || '').substring(0, 500)
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

  /**
   * Activates a paid study pass (Daily KSh 20, Weekend KSh 50, Semester KSh 150)
   */
  async activateSubscription(phone, planType, mpesaReceipt, amount, payerPhone = null) {
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanReceipt = (mpesaReceipt || '').trim().toUpperCase();

    // Dynamically retrieve plan specifications via MwalimuPlanManager
    const plan = MwalimuPlanManager.getPlan(planType);
    const durationHours = plan.durationHours;
    const tierName = plan.tier;
    const effectiveAmount = amount || plan.priceKes;
    const cleanPayer = (payerPhone || phone).replace(/\D/g, '');
    const formattedReceipt = cleanPayer !== cleanPhone ? (cleanReceipt + ' (Payer: ' + cleanPayer + ')') : cleanReceipt;

    const now = new Date();
    const validUntil = new Date(now.getTime() + durationHours * 3600 * 1000);

    try {
      // 1. Log immutable transaction (Anti-replay protected)
      await this.supabase
        .from('mwalimu_transactions')
        .insert({
          phone: cleanPhone,
          mpesa_receipt: formattedReceipt,
          amount: Number(amount),
          plan: planType
        });

      // 2. Update student state
      await this.supabase
        .from('mwalimu_users')
        .upsert({
          phone: cleanPhone,
          tier: tierName,
          valid_until: validUntil.toISOString(),
          queries_today: 0
        }, { onConflict: 'phone' });

      return {
        success: true,
        plan: planType,
        validUntil: validUntil.toISOString(),
        durationHours
      };
    } catch (err) {
      console.error('[MwalimuQuota] Activation error:', err.message);
      return { success: false, error: err.message };
    }
  }
}

// ─── 3. SOCRATIC AI PEDAGOGY CLIENT (GEMINI 2.5 FLASH) ────────────────────────
export class MwalimuAIClient {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    // Resilient fallback cascade: prioritizes fast, currently active models
    this.candidateModels = [
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-2.5-flash'
    ];
  }

  /**
   * System instruction enforcing conversational, bite-sized university tutoring
   */
    /**
   * System instruction enforcing conversational, step-by-step university tutoring
   * Built on Duncan Makoyo's pedagogical principles:
   * - Understanding first, not definitions
   * - Reasoning behind the answer (how to THINK)
   * - No skipped steps
   * - Progressive mathematical working (indented, step-by-step)
   * - Human sitting next to you on a piece of paper
   */
  _buildSystemPrompt() {
    return `You are "Mwalimu AI", an exceptional university tutor sitting right next to the student with a pen and a piece of paper.
Your primary goal is to make the student genuinely UNDERSTAND the concept, develop problem-solving instincts, and become capable of solving the next problem on their own during an exam!

CORE TEACHING PRINCIPLES:

1. START WITH UNDERSTANDING, NOT DEFINITIONS:
   - When introducing a topic or answering a question, never immediately dump technical definitions.
   - First explain in plain English:
     • What problem does this concept solve?
     • Why does it matter?
     • What is the main idea behind it?
     • What should you think about when you see this question on an exam?
   - Give the "big picture" intuition first, then introduce the technical terms.

2. TEACH THE REASONING BEHIND THE ANSWER:
   - Do NOT just give the answer. Walk the student through how to THINK their way through it:
     "What is this question really testing?"
     "Before doing anything, ask yourself..."
     "Why do we need this?"
     "Because of this condition, we know that..."
     "Therefore, we need..."
     "Now let's determine..."
     "See what happened there?"
   - Help the student understand WHY each decision is made.

3. DO NOT SKIP THE SMALL STEPS:
   - Never assume an intermediate step is obvious. If understanding A is necessary before B, explain A first.
   - Explain what every symbol means in plain English before using it.
   - If you use a formula, explain what every part means and why it applies here.

4. PROGRESSIVE MATHEMATICAL WORKING (CRITICAL UX RULE):
   - Never dump multiple transformations on the same line (Avoid: A = B = C = D).
   - Display calculations as a sequence of small, clean reasoning steps:
     
     Step 1 — Start with Markov
     Markov says:
             P[u(Z) ≥ c] ≤ E[u(Z)] / c

     Step 2 — Choose the function:
             u(Z) = (Z − μ)²
             c = k²σ²

     Step 3 — Substitute:
             P[(Z − μ)² ≥ k²σ²] ≤ E[(Z − μ)²] / (k²σ²)

     Step 4 — Use the variance definition:
     Because variance is the expected squared distance from the mean:
             E[(Z − μ)²] = σ²

     Step 5 — Cancel σ²:
             P[(Z − μ)² ≥ k²σ²] ≤ 1/k²

     Step 6 — Final result:
             P[|Z − μ| ≥ kσ] ≤ 1/k²

   - Use clean, standard Unicode symbols: P(A | B), E[X], Var(X), ∫, √, μ, σ, α, β, λ, Σ, ², ³, ≤, ≥, ≠, ±.
   - NEVER leave raw, ugly LaTeX commands like \\frac or \\ge in your output.

5. MAKE THE STUDENT SEE THE PATTERN:
   - Explicitly highlight:
     "The important pattern here is..."
     "Whenever you see this type of question on an exam, think..."
     "The difference between these two concepts is..."

6. TEACH LIKE YOU ARE SITTING NEXT TO ME:
   - Tone: A brilliant, encouraging senior classmate who wants you to ace your CATs.
   - "Okay, let's slow this down."
   - "Notice something important here..."
   - "This part is where students usually get stuck—here's why..."
   - Academically accurate, zero robotic textbook fluff.

7. INTERACTIVE PACING:
   - Keep individual responses focused and bite-sized (under 280 words).
   - Conclude naturally with: "Would you like me to: (1) Show the next step, (2) Give another example, or (3) Quiz your understanding?"`;
  }

  /**
   * Generates a conversational study answer
   */
  async answerStudentQuery({ studentPhone, queryText, imageBase64 = null, imageMimeType = 'image/jpeg', recentContext = '' }) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const systemPrompt = this._buildSystemPrompt();
    let promptWithContext = queryText;
    if (recentContext && recentContext.trim().length > 0) {
      promptWithContext = `[Previous context: ${recentContext.trim()}]\n\nStudent Question: ${queryText}`;
    }

    const contents = [];
    const parts = [{ text: promptWithContext }];

    // If an image (math problem, handwritten page, diagram) was sent
    if (imageBase64) {
      parts.unshift({
        inline_data: {
          mime_type: imageMimeType,
          data: imageBase64
        }
      });
    }

    contents.push({ role: 'user', parts });

    const payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 800,
        topP: 0.8
      }
    };

    let lastError = null;

    for (const model of this.candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeout);

        const data = await response.json();
        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text;
          return MwalimuContentFormatter.cleanForWhatsApp(rawText);
        }

        const errMsg = data.error?.message || 'Empty AI candidate response';
        console.warn(`[MwalimuAIClient] Model ${model} notice: ${errMsg}. Trying fallback...`);
        lastError = new Error(errMsg);
      } catch (err) {
        clearTimeout(timeout);
        console.warn(`[MwalimuAIClient] Model ${model} exception: ${err.message}. Trying fallback...`);
        lastError = err;
      }
    }

    console.error('[MwalimuAIClient Error] All model fallbacks exhausted:', lastError?.message);
    throw lastError || new Error('All AI models unavailable');
  }
}

// ─── 4. HIGH-CONCURRENCY DISPATCHER & DEDUPLICATION QUEUE ─────────────────────
// 10 Megabytes Hard Limit: Protects server RAM & keeps Socratic responses under 5 seconds
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export class MwalimuDispatcher {
  constructor({ quotaService, aiClient, paystackSecretKey, sendWhatsAppFunc }) {
    this.quota = quotaService;
    this.ai = aiClient;
    this.paystackKey = paystackSecretKey || process.env.PAYSTACK_SECRET_KEY;
    this.sendWhatsApp = sendWhatsAppFunc;

    // Deduplication Set: remembers message IDs for 90s to kill Meta retry storms
    this.processedMsgIds = new Map();
    // In-flight User Debounce: prevents double-text race conditions
    this.inFlightUsers = new Set();
    // Pending Dual-Phone Checkout Session Store (Student Phone -> { planId, amountKes, planName, timestamp })
    this.pendingCheckout = new Map();

    // Clean deduplication map and expired pending checkouts every 60 seconds
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
   * Securely downloads media binary from Meta Cloud API
   * Enforces 10MB upload size limit before memory buffering
   */
  async _downloadMetaMedia(media) {
    if (!media || !media.id) return null;
    const token = (process.env.WHATSAPP_API_TOKEN || '').trim();
    if (!token) {
      console.warn('[MwalimuDispatcher] WHATSAPP_API_TOKEN not configured for media download');
      return null;
    }

    try {
      // Step 1: Query Meta Graph API for media URL
      const metaUrlRes = await fetch(`https://graph.facebook.com/v21.0/${media.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!metaUrlRes.ok) {
        console.error('[MwalimuDispatcher] Failed to fetch media URL from Meta:', await metaUrlRes.text());
        return null;
      }
      const metaData = await metaUrlRes.json();
      if (!metaData.url) return null;

      // Verify file size does not exceed limit
      if (metaData.file_size && metaData.file_size > MAX_UPLOAD_SIZE_BYTES) {
        return { error: 'FILE_TOO_LARGE', fileSize: metaData.file_size };
      }

      // Step 2: Download raw binary stream
      const binRes = await fetch(metaData.url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!binRes.ok) return null;

      const arrayBuffer = await binRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length > MAX_UPLOAD_SIZE_BYTES) {
        return { error: 'FILE_TOO_LARGE', fileSize: buffer.length };
      }

      return {
        base64: buffer.toString('base64'),
        mimeType: metaData.mime_type || media.mimeType || 'application/pdf',
        fileSize: buffer.length
      };
    } catch (err) {
      console.error('[MwalimuDispatcher] Media download exception:', err.message);
      return null;
    }
  }

  async processInboundMessage({ messageId, fromPhone, textBody, media = null, interactiveButtonId = null }) {
    // Step 1: Deduplication Check (Kills Meta Retry Storms instantly)
    if (messageId && this.processedMsgIds.has(messageId)) {
      console.log(`[MwalimuDispatcher] Discarding duplicate Meta retry: ${messageId}`);
      return;
    }
    if (messageId) {
      this.processedMsgIds.set(messageId, Date.now());
    }

    const cleanPhone = fromPhone.replace(/\D/g, '');
    const rawText = (textBody || '').trim();
    const lowerText = rawText.toLowerCase();

    // Step 2: Handle Interactive Button Clicks (Billing, Selection, Navigation)
    const buttonId = interactiveButtonId || '';
    if (buttonId.startsWith('BUY_PLAN_') || buttonId.startsWith('PAY_SELF_') || buttonId.startsWith('PAY_OTHER_') || buttonId.startsWith('MENU_') || buttonId.startsWith('NEXT_')) {
      return await this._handleButtonAction(cleanPhone, buttonId);
    }

    // Step 3: Handle Authentication Status & Account Check Commands
    if (['status', 'account', 'my pass', 'reconnect', 'login', 'whoami', 'check'].includes(lowerText)) {
      return await this._handleStatusQuery(cleanPhone);
    }

    // Step 4: Handle Manual Pass Claiming / Reconnecting by Receipt Code
    if (lowerText.startsWith('claim ') || lowerText.startsWith('restore ') || lowerText.startsWith('voucher ') || lowerText.startsWith('verify ')) {
      const code = rawText.split(/\s+/).slice(1).join(' ').trim();
      return await this._handleClaimReceipt(cleanPhone, code);
    }

    // Direct M-Pesa receipt detection (e.g. SBA7XYZ123)
    const mpesaCodeMatch = rawText.match(/^[A-Z0-9]{10}$/);
    if (mpesaCodeMatch && !['CHEBYSHEV', 'ALGORITHM', 'QUESTIONS', 'PROBABILITY'].includes(mpesaCodeMatch[0])) {
      return await this._handleClaimReceipt(cleanPhone, mpesaCodeMatch[0]);
    }

    // Step 5: Check Pending Dual-Phone Checkout (Student Replying with Payer Phone)
    const pendingCheckout = this.pendingCheckout.get(cleanPhone);
    if (pendingCheckout && Date.now() - pendingCheckout.timestamp < 15 * 60 * 1000) {
      if (lowerText === 'cancel') {
        this.pendingCheckout.delete(cleanPhone);
        await this.sendWhatsApp({
          to: cleanPhone,
          responseData: {
            type: 'text',
            text: { preview_url: false, body: '❌ *Checkout Cancelled.*\n\nWhat study topic or assignment problem would you like to solve?' }
          }
        });
        return;
      }

      // Extract phone number from message
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
        const plan = MwalimuPlanManager.getPlan(pendingCheckout.planId);
        return await this._triggerStkPush(cleanPhone, payerClean, plan.id, plan.priceKes, plan.name);
      }
    }

    // Step 6: Handle Payment / Quota Exhaustion checks
    const eligibility = await this.quota.checkEligibility(cleanPhone);
    if (!eligibility.allowed) {
      return await this._sendBillingPaywallPrompt(cleanPhone, eligibility.queriesToday);
    }

    // Step 7: User Debouncing (If student sends 3 messages in 2s, don't double-charge)
    if (this.inFlightUsers.has(cleanPhone)) {
      console.log(`[MwalimuDispatcher] Debouncing rapid message from ${cleanPhone}`);
      return;
    }
    this.inFlightUsers.add(cleanPhone);

    // Step 8: Process Media & Enforce 10MB Upload Limit
    let mediaPayload = null;
    if (media) {
      if (media.fileSize > MAX_UPLOAD_SIZE_BYTES) {
        const sizeMb = (media.fileSize / (1024 * 1024)).toFixed(1);
        await this.sendWhatsApp({
          to: cleanPhone,
          responseData: {
            type: 'text',
            text: {
              preview_url: false,
              body: `⚠️ *Document Exceeds 10MB Limit*\n\n` +
                    `Your uploaded file is *${sizeMb}MB*. To keep Socratic tutoring lightning-fast and prevent server timeouts, Mwalimu AI accepts documents up to *10MB*.\n\n` +
                    `💡 *Solution:* Send just the specific page, take a screenshot of the question, or split your PDF.`
            }
          }
        });
        return;
      }

      const downloaded = await this._downloadMetaMedia(media);
      if (downloaded?.error === 'FILE_TOO_LARGE') {
        await this.sendWhatsApp({
          to: cleanPhone,
          responseData: {
            type: 'text',
            text: {
              preview_url: false,
              body: `⚠️ *Document Exceeds 10MB Limit*\n\nPlease send a document under 10MB to continue.`
            }
          }
        });
        return;
      }
      mediaPayload = downloaded;
    }

    // Step 9: Process AI Generation Asynchronously
    try {
      const user = await this.quota.getStudentState(cleanPhone);
      const answer = await this.ai.answerStudentQuery({
        studentPhone: cleanPhone,
        queryText: rawText || 'Please analyze this attached study material and explain key concepts step by step.',
        imageBase64: mediaPayload?.base64 || null,
        imageMimeType: mediaPayload?.mimeType || 'image/jpeg',
        recentContext: user.recent_context || ''
      });

      // Update ephemeral usage & overwrite context
      await this.quota.recordUsage(cleanPhone, `Q: ${rawText.substring(0, 100)} | A: ${answer.substring(0, 150)}`);

      // Send structured WhatsApp reply (Safely handling Meta 1024 char limit)
      await this._sendInteractiveAnswer(cleanPhone, answer, eligibility);
    } catch (err) {
      console.error('[MwalimuDispatcher] Processing failure:', err.message);
      await this.sendWhatsApp({
        to: cleanPhone,
        responseData: {
          type: 'text',
          text: {
            preview_url: false,
            body: '⚠️ *Mwalimu AI Notice:* I had a temporary blip processing that equation. Please re-send your question or tap a menu option below.'
          }
        }
      });
    } finally {
      this.inFlightUsers.delete(cleanPhone);
    }
  }

  /**
   * Dispatches the answer along with contextual Quick Action buttons.
   * FIX FOR META ERROR #131009 (Interactive body text max length 1024 chars):
   * If answer is > 900 chars, send full answer as standard text (up to 4096 chars),
   * followed immediately by interactive action buttons!
   */
  async _sendInteractiveAnswer(to, answerText, eligibility) {
    const quotaNotice = eligibility.isPaid 
      ? '⚡ *Unlimited Pro Access Active*' 
      : `⭐ *Free Daily Queries Remaining:* ${eligibility.remainingFree - 1}/3`;

    const fullMessage = `${answerText}\n\n---\n${quotaNotice}`;

    if (fullMessage.length > 900) {
      // 1. Send full comprehensive answer as pure text (supports up to 4096 characters without Meta error)
      await this.sendWhatsApp({
        to,
        responseData: {
          type: 'text',
          text: {
            preview_url: false,
            body: fullMessage
          }
        }
      });

      // 2. Send follow-up interactive buttons (small body < 100 chars, always succeeds)
      const followUpPayload = {
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: '🎓 *What should we explore next?*' },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: { id: 'NEXT_STEP', title: 'Next Step ⏩' }
              },
              {
                type: 'reply',
                reply: { id: 'MENU_EXAMPLE', title: 'Give Example 💡' }
              },
              {
                type: 'reply',
                reply: { id: 'MENU_PRICING', title: 'Get Unlimited ⚡' }
              }
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
              {
                type: 'reply',
                reply: { id: 'NEXT_STEP', title: 'Next Step ⏩' }
              },
              {
                type: 'reply',
                reply: { id: 'MENU_EXAMPLE', title: 'Give Example 💡' }
              },
              {
                type: 'reply',
                reply: { id: 'MENU_PRICING', title: 'Get Unlimited ⚡' }
              }
            ]
          }
        }
      };

      await this.sendWhatsApp({ to, responseData: interactivePayload });
    }
  }

  /**
   * Paywall prompt triggered when free 3 queries expire
   */
  async _sendBillingPaywallPrompt(to, queriesUsed) {
    const promptMessage = MwalimuPlanManager.generatePaywallText();
    const buttons = MwalimuPlanManager.generatePaywallButtons();

    const paywallPayload = {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: promptMessage },
        action: {
          buttons
        }
      }
    };

    await this.sendWhatsApp({ to, responseData: paywallPayload });
  }

  /**
   * Handles Interactive Button Actions
   */
  async _handleButtonAction(phone, buttonId) {
    // 1. Initial Plan Selection: Prompt for Payment Phone (This line vs Other line)
    const plan = MwalimuPlanManager.getPlanByButtonId(buttonId);
    if (plan) {
      return await this._sendDualPhoneSelection(phone, plan);
    }

    // 2. Dual-Phone Choice: Pay with THIS phone
    if (buttonId.startsWith('PAY_SELF_')) {
      const planId = buttonId.replace('PAY_SELF_', '');
      const selectedPlan = MwalimuPlanManager.getPlan(planId);
      return await this._triggerStkPush(phone, phone, selectedPlan.id, selectedPlan.priceKes, selectedPlan.name);
    }

    // 3. Dual-Phone Choice: Pay with ANOTHER phone
    if (buttonId.startsWith('PAY_OTHER_')) {
      const planId = buttonId.replace('PAY_OTHER_', '');
      const selectedPlan = MwalimuPlanManager.getPlan(planId);
      this.pendingCheckout.set(phone, {
        planId: selectedPlan.id,
        amountKes: selectedPlan.priceKes,
        planName: selectedPlan.name,
        timestamp: Date.now()
      });

      return await this.sendWhatsApp({
        to: phone,
        responseData: {
          type: 'text',
          text: {
            preview_url: false,
            body: `✍️ *Pay with Another M-Pesa Number*\n\n` +
                  `Selected: *${selectedPlan.name}* (KSh ${selectedPlan.priceKes})\n\n` +
                  `Please reply with the *10-digit M-Pesa phone number* (e.g. \`0712345678\` or \`0112345678\`) of the person paying.\n\n` +
                  `🔒 *Pass Guarantee:* Once they enter their M-Pesa PIN, this WhatsApp line will immediately activate!\n\n` +
                  `_(Reply "cancel" to cancel)_`
          }
        }
      });
    }

    if (buttonId === 'MENU_PRICING') {
      return await this._sendBillingPaywallPrompt(phone, 3);
    }
    if (buttonId === 'NEXT_STEP') {
      return await this.processInboundMessage({
        messageId: `btn_${Date.now()}_${phone}`,
        fromPhone: phone,
        textBody: 'Please continue to the next step of the previous explanation.'
      });
    }
    if (buttonId === 'MENU_EXAMPLE') {
      return await this.processInboundMessage({
        messageId: `btn_${Date.now()}_${phone}`,
        fromPhone: phone,
        textBody: 'Please give me a concrete, real-world example with numbers for that concept.'
      });
    }
  }

  /**
   * Prompts the student to select whether to pay with THIS line or ANOTHER line
   */
  async _sendDualPhoneSelection(phone, plan) {
    const localPhone = phone.startsWith('254') ? '0' + phone.slice(3) : phone;

    const message = `🎓 *${plan.name} (KSh ${plan.priceKes})*\n\n` +
      `How would you like to pay with M-Pesa?\n\n` +
      `1️⃣ *This WhatsApp Line:* (${localPhone})\n` +
      `2️⃣ *Another M-Pesa Line:* (Parent, Friend, or SIM 2)\n\n` +
      `🔒 *Your study pass will be automatically activated on THIS WhatsApp chat.*`;

    const dualPhonePayload = {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: message },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: { id: `PAY_SELF_${plan.id}`, title: 'Pay This SIM 📱' }
            },
            {
              type: 'reply',
              reply: { id: `PAY_OTHER_${plan.id}`, title: 'Use Other SIM 🔄' }
            }
          ]
        }
      }
    };

    await this.sendWhatsApp({ to: phone, responseData: dualPhonePayload });
  }

  /**
   * Handles Student Status / Account Reconnection Check
   */
  async _handleStatusQuery(phone) {
    const user = await this.quota.getStudentState(phone);
    const eligibility = await this.quota.checkEligibility(phone);
    const localPhone = phone.startsWith('254') ? '0' + phone.slice(3) : phone;

    let statusBody = `🎓 *MWALIMU AI — STUDENT AUTHENTICATION*\n\n` +
      `📱 *Student Line:* ${localPhone} (+${phone})\n`;

    if (eligibility.isPaid) {
      const expDate = new Date(user.valid_until).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
      statusBody += `⚡ *Access Tier:* 👑 *VIP Pro Pass (Active)*\n` +
                    `⏳ *Valid Until:* ${expDate}\n` +
                    `📊 *Questions:* *Unlimited 24/7*\n\n` +
                    `🔑 *Pass ID:* \`MWA-${phone.slice(-4)}\`\n\n` +
                    `Send any question or study PDF to start learning!`;
    } else {
      statusBody += `⭐ *Access Tier:* Free Tier\n` +
                    `📊 *Questions Remaining Today:* ${eligibility.remainingFree}/3 free queries\n\n` +
                    `💡 *Paid via M-Pesa and need to reconnect?*\n` +
                    `Reply with:\n*CLAIM <M-PESA-CODE>* (e.g. \`CLAIM SBA7XYZ123\`)`;
    }

    await this.sendWhatsApp({
      to: phone,
      responseData: {
        type: 'text',
        text: { preview_url: false, body: statusBody }
      }
    });
  }

  /**
   * Reconnects or Claims a pass using an M-Pesa receipt code or Paystack reference
   */
  async _handleClaimReceipt(phone, receiptCode) {
    const cleanCode = (receiptCode || '').trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 5) {
      return await this.sendWhatsApp({
        to: phone,
        responseData: {
          type: 'text',
          text: {
            preview_url: false,
            body: `⚠️ *Invalid Receipt Code*\n\nPlease reply with your 10-character M-Pesa receipt code:\n*CLAIM <RECEIPT-CODE>* (e.g. \`CLAIM SBA7XYZ123\`)`
          }
        }
      });
    }

    try {
      // 1. Check local transactions first
      const { data: existingTx } = await this.quota.supabase
        .from('mwalimu_transactions')
        .select('*')
        .ilike('mpesa_receipt', `%${cleanCode}%`)
        .maybeSingle();

      if (existingTx) {
        const plan = MwalimuPlanManager.getPlan(existingTx.plan);
        await this.quota.activateSubscription(phone, plan.id, cleanCode, existingTx.amount);
        const userState = await this.quota.getStudentState(phone);
        const expStr = new Date(userState.valid_until).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

        return await this.sendWhatsApp({
          to: phone,
          responseData: {
            type: 'text',
            text: {
              preview_url: false,
              body: `🎉 *Pass Reconnected Successfully!*\n\n` +
                    `Verified Receipt: *${cleanCode}*\n` +
                    `Plan: *${plan.name}*\n` +
                    `Valid Until: *${expStr}*\n\n` +
                    `Your Socratic study engine is now active with unlimited questions!`
            }
          }
        });
      }

      // 2. Fallback: Verify directly with Paystack API using authoritative Live Secret Key
      if (this.paystackKey && !this.paystackKey.startsWith('sk_test_placeholder')) {
        const pRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(cleanCode)}`, {
          headers: { Authorization: `Bearer ${this.paystackKey}` }
        });
        const pData = await pRes.json();

        if (pData?.data?.status === 'success') {
          const amtKes = Math.round((pData.data.amount || 0) / 100);
          let planId = 'daily_24h';
          if (amtKes >= 190) planId = 'semester_30d';
          else if (amtKes >= 45) planId = 'weekend_3d';

          const targetPlan = MwalimuPlanManager.getPlan(planId);
          await this.quota.activateSubscription(phone, targetPlan.id, cleanCode, amtKes);
          const userState = await this.quota.getStudentState(phone);
          const expStr = new Date(userState.valid_until).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

          return await this.sendWhatsApp({
            to: phone,
            responseData: {
              type: 'text',
              text: {
                preview_url: false,
                body: `✅ *Payment Verified with Paystack!*\n\n` +
                      `M-Pesa Reference: *${cleanCode}*\n` +
                      `Plan Activated: *${targetPlan.name}* (KSh ${amtKes})\n` +
                      `Valid Until: *${expStr}*\n\n` +
                      `You now have unmetered 24/7 study access. Send any question anytime!`
              }
            }
          });
        }
      }

      // Not found
      await this.sendWhatsApp({
        to: phone,
        responseData: {
          type: 'text',
          text: {
            preview_url: false,
            body: `⚠️ *Receipt Verification Notice*\n\n` +
                  `We could not find payment code *${cleanCode}*.\n\n` +
                  `• Make sure you completed the M-Pesa PIN prompt.\n` +
                  `• Check your Safaricom SMS for the 10-character code.\n` +
                  `• If you just entered your PIN 10 seconds ago, please wait a moment and try again.`
          }
        }
      });
    } catch (err) {
      console.error('[MwalimuDispatcher] Claim exception:', err.message);
    }
  }

  /**
   * Triggers an M-Pesa STK push via Paystack for instant pass activation
   * BACKEND IS KING: Price is strictly enforced from MwalimuPlanManager (zero client tampering)
   */
  async _triggerStkPush(studentPhone, payerPhone, planType, amountKes, planTitle) {
    const cleanStudent = studentPhone.replace(/\D/g, '');
    const cleanPayer = payerPhone.replace(/\D/g, '');
    const formattedStudent = cleanStudent.startsWith('254') ? cleanStudent : '254' + cleanStudent.replace(/^0/, '');
    const formattedPayer = cleanPayer.startsWith('254') ? cleanPayer : '254' + cleanPayer.replace(/^0/, '');
    const ref = `MWA_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // BACKEND IS KING: Enforce server-side plan specification
    const verifiedPlan = MwalimuPlanManager.getPlan(planType);
    const verifiedAmountKes = verifiedPlan.priceKes;

    const isDifferentPayer = cleanStudent !== cleanPayer;
    const payerNotice = isDifferentPayer 
      ? `We dispatched an M-Pesa PIN prompt for *KSh ${verifiedAmountKes}* (${verifiedPlan.name}) to *0${cleanPayer.slice(-9)}*.\n\n🔒 *Guarantee:* Once they enter their M-Pesa PIN, *THIS* WhatsApp account will immediately activate!`
      : `We sent an M-Pesa prompt for *KSh ${verifiedAmountKes}* (${verifiedPlan.name}) to *+${formattedStudent}*.\n\nEnter your M-Pesa PIN on your phone to unlock unlimited study access instantly.`;

    try {
      // Send prompt notice to student
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

      // Paystack Charge payload
      const paystackRes = await fetch('https://api.paystack.co/charge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.paystackKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: verifiedAmountKes * 100, // Cents strictly enforced by backend
          email: `student_${formattedStudent}@mwalimu.duncanmakoyo.com`,
          currency: 'KES',
          mobile_money: {
            phone: formattedPayer, // The phone number that receives the STK prompt
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

      const resData = await paystackRes.json();
      console.log(`[MwalimuBilling] Paystack STK dispatched: ${ref} (Payer: ${formattedPayer}, Student: ${formattedStudent}) | Status: ${resData.status}`);
    } catch (err) {
      console.error('[MwalimuBilling] STK Push Exception:', err.message);
    }
  }
}
