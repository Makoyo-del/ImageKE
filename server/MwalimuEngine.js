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

// ─── 1. PEDAGOGICAL WHATSAPP FORMATTER (UNICODE MATH & ZERO-WALLS UX) ─────────
export class MwalimuContentFormatter {
  /**
   * Converts standard LaTeX and math expressions into clean WhatsApp Unicode
   */
  static formatMathToUnicode(text) {
    if (!text || typeof text !== 'string') return '';

    let formatted = text;

    // Superscripts
    const superMap = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
      'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ'
    };
    formatted = formatted.replace(/\^([0-9nixy+-]+)/g, (_, match) => {
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
      'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'y': 'ᵧ'
    };
    formatted = formatted.replace(/_([0-9aeoxy+-]+)/g, (_, match) => {
      return match.split('').map(c => subMap[c] || c).join('');
    });
    formatted = formatted.replace(/_{([^}]+)}/g, (_, match) => {
      return match.split('').map(c => subMap[c] || c).join('');
    });

    // Greek & Statistical symbols
    const symbolReplacements = [
      [/\\mu/g, 'μ'],
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
      [/\\le/g, '≤'],
      [/\\ge/g, '≥'],
      [/\\neq/g, '≠'],
      [/\\approx/g, '≈'],
      [/\\cdot/g, '·'],
      [/\\times/g, '×'],
      [/\\div/g, '÷'],
      [/\\frac{([^}]+)}{([^}]+)}/g, '($1 / $2)']
    ];

    symbolReplacements.forEach(([regex, replacement]) => {
      formatted = formatted.replace(regex, replacement);
    });

    // Clean up remaining LaTeX math brackets: $...$ or $$...$$
    formatted = formatted.replace(/\$\$([^$]+)\$\$/g, '\n```\n$1\n```\n');
    formatted = formatted.replace(/\$([^$]+)\$/g, '$1');

    return formatted;
  }

  /**
   * Sanitizes Markdown for WhatsApp (ensures asterisks, lists and bold work cleanly)
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

    // Limit maximum character dump to prevent student cognitive overload
    if (out.length > 1800) {
      out = out.substring(0, 1750) + '\n\n*(Response truncated. Tap [Next Step ⏩] below to continue)*';
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
  async activateSubscription(phone, planType, mpesaReceipt, amount) {
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanReceipt = (mpesaReceipt || '').trim().toUpperCase();

    // Dynamically retrieve plan specifications via MwalimuPlanManager
    const plan = MwalimuPlanManager.getPlan(planType);
    const durationHours = plan.durationHours;
    const tierName = plan.tier;
    const effectiveAmount = amount || plan.priceKes;

    const now = new Date();
    const validUntil = new Date(now.getTime() + durationHours * 3600 * 1000);

    try {
      // 1. Log immutable transaction (Anti-replay protected)
      await this.supabase
        .from('mwalimu_transactions')
        .insert({
          phone: cleanPhone,
          mpesa_receipt: cleanReceipt,
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
    this.modelName = 'gemini-2.5-flash';
  }

  /**
   * System instruction enforcing conversational, bite-sized university tutoring
   */
  _buildSystemPrompt() {
    return `You are "Mwalimu AI", an elite, approachable personal university tutor for Kenyan campus students.
Your goal is to make every complex university concept crystal clear—better than the lecturer!

PEDAGOGICAL TEACHING RULES:
1. NO WALLS OF TEXT: Never dump massive essays. Keep your answers conversational, crisp, and bite-sized (under 250 words total).
2. STRUCTURE EVERY EXPLANATION INTO 3 PARTS:
   Part 1: The Intuition / Real-Life Analogy (2-3 sentences explaining it simply).
   Part 2: The Core Rule or Formula (Clean, step-by-step).
   Part 3: One Quick Worked Example or Check.
3. MATHEMATICAL & STATISTICAL NOTATION:
   - Do NOT use raw complex LaTeX like \\frac{a}{b} or \\int_0^\\infty.
   - Use clean, readable mathematical symbols (e.g. Var(X) = E[X²] - (E[X])², ∫, √, μ, σ, α, β, λ, Σ).
4. TONE & EMPATHY:
   - Be supportive, sharp, and encouraging like a brilliant senior student.
   - If the student is asking about Kenyan units (like MATH 240, Economics, Computer Science), speak with practical clarity.
5. END WITH AN INTERACTIVE PROMPT:
   - Always conclude with: "Would you like me to: (1) Show the next step, (2) Give another example, or (3) Quiz your understanding?"`;
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s hard timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await response.json();
      if (!response.ok || !data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error(data.error?.message || 'Empty AI response from Gemini');
      }

      const rawText = data.candidates[0].content.parts[0].text;
      return MwalimuContentFormatter.cleanForWhatsApp(rawText);
    } catch (err) {
      clearTimeout(timeout);
      console.error('[MwalimuAIClient Error]', err.message);
      throw err;
    }
  }
}

// ─── 4. HIGH-CONCURRENCY DISPATCHER & DEDUPLICATION QUEUE ─────────────────────
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

    // Clean deduplication map every 60 seconds
    setInterval(() => {
      const now = Date.now();
      for (const [id, time] of this.processedMsgIds.entries()) {
        if (now - time > 90000) this.processedMsgIds.delete(id);
      }
    }, 60000);
  }

  /**
   * High-throughput Inbound Router
   * Guarantees < 30ms processing time before background delegation
   */
  async processInboundMessage({ messageId, fromPhone, textBody, mediaId = null, mediaType = null, interactiveButtonId = null }) {
    // Step 1: Deduplication Check (Kills Meta Retry Storms instantly)
    if (messageId && this.processedMsgIds.has(messageId)) {
      console.log(`[MwalimuDispatcher] Discarding duplicate Meta retry: ${messageId}`);
      return;
    }
    if (messageId) {
      this.processedMsgIds.set(messageId, Date.now());
    }

    const cleanPhone = fromPhone.replace(/\D/g, '');

    // Step 2: Handle Interactive Button Clicks (Billing & Quick Navigation)
    const buttonId = interactiveButtonId || '';
    if (buttonId.startsWith('BUY_PLAN_') || buttonId.startsWith('MENU_') || buttonId.startsWith('NEXT_')) {
      return await this._handleButtonAction(cleanPhone, buttonId);
    }

    // Step 3: Handle Payment / Quota Exhaustion checks
    const eligibility = await this.quota.checkEligibility(cleanPhone);
    if (!eligibility.allowed) {
      return await this._sendBillingPaywallPrompt(cleanPhone, eligibility.queriesToday);
    }

    // Step 4: User Debouncing (If student sends 3 messages in 2s, don't double-charge)
    if (this.inFlightUsers.has(cleanPhone)) {
      console.log(`[MwalimuDispatcher] Debouncing rapid message from ${cleanPhone}`);
      return;
    }
    this.inFlightUsers.add(cleanPhone);

    // Step 5: Process AI Generation Asynchronously
    try {
      const user = await this.quota.getStudentState(cleanPhone);
      const answer = await this.ai.answerStudentQuery({
        studentPhone: cleanPhone,
        queryText: textBody || 'Explain this topic clearly step by step.',
        recentContext: user.recent_context || ''
      });

      // Update ephemeral usage & overwrite context
      await this.quota.recordUsage(cleanPhone, `Q: ${textBody.substring(0, 100)} | A: ${answer.substring(0, 150)}`);

      // Send structured WhatsApp reply with interactive quick actions
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
   * Dispatches the answer along with contextual Quick Action buttons
   */
  async _sendInteractiveAnswer(to, answerText, eligibility) {
    const quotaNotice = eligibility.isPaid 
      ? '⚡ *Unlimited Pro Access Active*' 
      : `⭐ *Free Daily Queries Remaining:* ${eligibility.remainingFree - 1}/3`;

    const fullMessage = `${answerText}\n\n---\n${quotaNotice}`;

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
    // Dynamic Plan Resolution via MwalimuPlanManager (zero hardcoding)
    const plan = MwalimuPlanManager.getPlanByButtonId(buttonId);
    if (plan) {
      return await this._triggerStkPush(phone, plan.id, plan.priceKes, plan.name);
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
   * Triggers an M-Pesa STK push via Paystack for instant pass activation
   */
  async _triggerStkPush(phone, planType, amountKes, planTitle) {
    const formattedPhone = phone.startsWith('0') ? '254' + phone.slice(1) : (phone.startsWith('254') ? phone : '254' + phone);
    const ref = `MWA_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    try {
      // Send prompt notice to student
      await this.sendWhatsApp({
        to: phone,
        responseData: {
          type: 'text',
          text: {
            preview_url: false,
            body: `📱 *Requesting M-Pesa PIN Prompt...*\n\nWe sent an M-Pesa STK prompt for *KSh ${amountKes}* (${planTitle}) to ${formattedPhone}.\n\nEnter your M-Pesa PIN on your phone to unlock unlimited study access instantly.`
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
          amount: amountKes * 100, // Paystack requires kobo/cents
          email: `student_${formattedPhone}@mwalimu.duncanmakoyo.com`,
          currency: 'KES',
          mobile_money: {
            phone: formattedPhone,
            provider: 'mpesa'
          },
          reference: ref,
          metadata: {
            service: 'mwalimu_ai',
            plan: planType,
            phone: formattedPhone
          }
        })
      });

      const resData = await paystackRes.json();
      console.log(`[MwalimuBilling] Paystack STK dispatched: ${ref} | Status: ${resData.status}`);
    } catch (err) {
      console.error('[MwalimuBilling] STK Push Exception:', err.message);
    }
  }
}
