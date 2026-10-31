---
name: brand
description: Master brand governance, visual identity, design token synchronization, and voice architecture for Duncan Makoyo, HookBunker, and enterprise venture assets.
---
# Brand Architecture & Governance Engine (v4.0 — Enterprise Edition)

Use this skill whenever defining, reviewing, or updating brand voice, visual identity tokens, messaging frameworks, typography scales, or brand compliance for Duncan Makoyo and his ecosystem ventures (`HookBunker`, WhatsApp Commerce, ATS Career Engineering, Solopreneur Financial OS).

---

## 🚨 1. CORE MANDATE & INTEGRITY RULES (ZERO EXCEPTIONS)
1. **ZERO FABRICATION**: Never invent fake metrics, imaginary client testimonials, or fictional compliance certs. State architectural benchmarks or ask Duncan directly.
2. **THE ANTI-AI FIREWALL**: Enforce zero-tolerance bans on AI clichés (`delve`, `beacon`, `supercharge`, `revolutionize`, `testament`, `game-changer`, etc.). All copy must sound like an elite systems engineer speaking to peers.
3. **SINGLE SOURCE OF TRUTH**: Brand tokens flow unidirectionally: `brand` guidelines → `design-tokens.json` → `design-tokens.css` → codebases and visual designs.

---

## 🎯 2. DYNAMIC CONTEXT & BRAND IDENTITY ROUTER
Route brand decisions into one of 4 active venture identities:

| Identity Key | Domain / Audience | Visual Palette & Theme | Core Voice Persona |
| :--- | :--- | :--- | :--- |
| **`FOUNDER_ARCHITECT`** | Duncan Makoyo Personal Authority (LinkedIn, Consulting, System Architecture) | `TECH_OBSIDIAN` or `SWISS_EDITORIAL` | Pragmatic systems architect, zero fluff, production post-mortems, unit-economic realities. |
| **`HOOKBUNKER_SYSTEMS`** | HookBunker Developer Platform (Webhooks, API Gateway, Developer Console) | `TECH_OBSIDIAN` (Obsidian `#09090B`, Emerald `#10B981`, JetBrains Mono) | Highly technical, resilient, zero-drop delivery, latency-obsessed (`<50ms`), explicit error handling. |
| **`COMMERCE_AUTONOMY`** | WhatsApp Autonomous Commerce & Daraja M-Pesa Integration | `TECH_OBSIDIAN` with WhatsApp Emerald (`#25D366`) and Daraja Green | ROI-focused, revenue recovery, zero-second dispatch, checkout velocity. |
| **`EXECUTIVE_FINTECH`** | Career & ATS Engineering (Equity Bank, Kenyan FinTech Leaders) | `APPLE_DAYLIGHT` (Alabaster `#F8FAFC`, Royal Blue `#2563EB`, Inter) | Executive rigor, quantified STAR impact, ATS vector mechanics, institutional trust. |

---

## 📐 3. STRICT TECHNICAL & LINGUISTIC GUARDRAILS
1. **Vocabulary Firewall**:
   - Banned words: `delve`, `testament`, `beacon`, `realm`, `supercharge`, `game-changer`, `tapestry`, `seamless`, `skyrocket`, `foster`, `bespoke`, `holistic`.
   - Required replacement: Exact technical protocols (`HTTP 429`, `HMAC-SHA256`, `Redis dead-letter queue`, `single-column DOM`).
2. **Typography Standards**:
   - Primary Heading: `Plus Jakarta Sans` (Tech/Modern) or `Inter` (Executive) or `Playfair Display` (Editorial).
   - Body Copy: `Inter` (System neutral, high legibility across mobile displays).
   - Technical / Monospace: `JetBrains Mono` or `Space Mono`.
3. **Color Contrast Budget**:
   - Primary text on background: Minimum WCAG AA `4.5:1` (Target: `7:1` for dark obsidian mode).
   - Graphical controls / border lines: Minimum `3:1` contrast ratio.

---

## 🧩 4. THREE-TIER TOKEN SPECIFICATION
Enforce the standard 3-tier token hierarchy across all projects:

```
[ Tier 1: Primitives ]  -->  [ Tier 2: Semantics ]  -->  [ Tier 3: Components ]
--color-slate-950: #09090B    --bg-canvas: var(--color-slate-950)   --card-bg: var(--bg-canvas)
--color-emerald-500: #10B981  --color-accent: var(--color-emerald)  --btn-primary-bg: var(--color-accent)
--font-mono: 'JetBrains Mono' --font-code: var(--font-mono)         --terminal-font: var(--font-code)
```

### Exported Token Locations:
- Source configuration: `assets/design-tokens.json`
- Generated CSS variables: `src/styles/design-tokens.css` or `assets/design-tokens.css`

---

## 🛠️ 5. REUSABLE SCRIPTS & AUTOMATION BLUEPRINTS

### A. Brand Token Synchronization
Execute token generation and validation via built-in scripts:
```powershell
# Sync brand guidelines to JSON and CSS tokens
node .agents/skills/brand/scripts/sync-brand-to-tokens.cjs

# Validate asset naming, size, and format against brand standards
node .agents/skills/brand/scripts/validate-asset.cjs <path-to-asset>

# Extract and compare palette compliance
node .agents/skills/brand/scripts/extract-colors.cjs --palette
```

### B. Standard Brand Footprint Signature
Every visual or document asset must include the clean, unpretentious signature:
```html
<div class="brand-signature">
  <span class="brand-name">DUNCAN MAKOYO</span>
  <span class="brand-divider">//</span>
  <span class="brand-title">SYSTEMS &amp; AI ARCHITECTURE</span>
</div>
```

---

## 🔗 6. CROSS-SKILL SYNCHRONIZATION PROTOCOL
- **Sync with `social-architect`**: Brand voice guidelines enforce the tone, sentence cadence, and anti-AI firewall for all LinkedIn posts.
- **Sync with `design-system` & `ui-styling`**: Passes down semantic tokens (colors, radii, spacing, fonts) to Tailwind CSS variables and React component themes.
- **Sync with `linkedin-campaign-poster-design` & `banner-design`**: Governs logo placement, clear space margins, and brand signature formatting.

---

## ⚙️ 7. MANDATORY AUTO-QA & BRAND AUDIT LOOP
Before approving any brand asset, document, or landing page:
1. **Linguistic Scan**: Search output for banned buzzwords or robotic transitions.
2. **Token Integrity Check**: Ensure no hardcoded raw hex values exist in component CSS; all styles must reference CSS variables.
3. **Contrast Audit**: Verify text-to-background contrast ratio meets or exceeds `4.5:1`.
4. **Voice Interrogation**: Ensure candidate metrics and case study figures are either verified from client data or explicitly flagged as an engineering benchmark.
