---
name: linkedin-campaign-poster-design
description: Autonomous, Canva-grade visual design engine for generating high-converting LinkedIn posters, UI mockups, technical architecture diagrams, and carousels via HTML5/CSS3/SVG and Playwright.
---
# Autonomous Visual Design Engine (v4.0 — Enterprise Edition)

Use this skill whenever designing or generating scroll-stopping LinkedIn campaign posters, technical architecture diagrams, data visualizations, and carousel slides. 

Do NOT default to a single static aesthetic. Act as an Art Director: analyze the post topic first, select the optimal **Theme Token Set**, combine **Layout Archetypes** with **Visual UI Primitives**, and execute a **Playwright DOM Overflow Audit** before saving the final Retina PNG.

---

## 🎨 1. DYNAMIC THEME ENGINE (CSS VARIABLE TOKENS)
Select the theme that matches the psychological hook of the content, or follow the user's explicit request. Load Google Fonts dynamically in the `<head>`.

### Theme A: `TECH_OBSIDIAN` (Default for AI, Backend, APIs, Automation, Code)
- **Vibe**: Linear / Vercel / Stripe Developer aesthetic. Sleek, authoritative, high-tech.
- **Canvas Background**: `#09090B` with a subtle top radial glow `radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.12), transparent 60%)`.
- **Card Surface (Primary)**: `#121215` with `1px solid rgba(255, 255, 255, 0.08)` border and `border-radius: 16px`.
- **Card Surface (Elevated)**: `#18181C` with top highlight `border-top: 1px solid rgba(255, 255, 255, 0.15)`.
- **Text Primary**: `#FAFAFA` | **Text Muted**: `#A1A1AA`.
- **Accent Primary**: `#10B981` (Neon Emerald) or `#6366F1` (Electric Indigo).
- **Accent Danger/Flaw**: `#EF4444` (Crimson Alert).
- **Fonts**: Heading: `Plus Jakarta Sans` or `Outfit` (700/800) | Body: `Inter` (400/500/600) | Code/Metrics: `JetBrains Mono` (600).

### Theme B: `APPLE_DAYLIGHT` (Default for Career Strategy, Executive CVs, SaaS Metrics, FinTech)
- **Vibe**: Apple Keynote / Stripe Press. Ultra-clean, high-trust, executive clarity.
- **Canvas Background**: `#F8FAFC` (Cool Alabaster).
- **Card Surface**: `#FFFFFF` with `1px solid #E2E8F0`, `border-radius: 20px`, and soft layered shadow `0 10px 30px -10px rgba(15, 23, 42, 0.06)`.
- **Text Primary**: `#0F172A` (Deep Slate) | **Text Muted**: `#475569`.
- **Accent Primary**: `#2563EB` (Royal Tech Blue) or `#059669` (Emerald).
- **Fonts**: Heading: `Inter` or `Plus Jakarta Sans` (800, tight tracking `-0.03em`) | Body: `Inter` (500) | Mono: `JetBrains Mono`.

### Theme C: `SWISS_EDITORIAL` (Default for Contrarian Essays, Industry Manifesto, Provocative Hooks)
- **Vibe**: Financial Times / High-Contrast Print Brutalism.
- **Canvas Background**: `#F4F4EE` | **Card Surface**: `#ECECE4` | **Structure**: `1.5px solid #111111` (Sharp `0px` radius).
- **Text Primary**: `#111111` | **Accent Primary**: `#D61A3C` (Editorial Crimson).
- **Fonts**: Heading: `Playfair Display` (900, italic accents) or `Instrument Serif` | Body: `Inter` (600) | Tags: `Space Mono`.

---

## 📐 2. MATHEMATICAL LAYOUT & COPY-FITTING RULES (CRITICAL)
LLMs frequently break designs by putting too much text into fixed boxes. Enforce these CSS and copy rules strictly:

1. **Canvas Dimensions**:
   - Single Poster / Carousel Slide: `1080px × 1350px` (4:5 Portrait — mandatory default for maximum mobile feed dominance).
   - Square Option: `1080px × 1080px` (only if requested).
2. **Safe Zones & Grid Math**:
   - Outer Canvas Padding: `56px` on all sides.
   - Grid Gap: `20px` to `24px` between Bento cards.
   - Inner Card Padding: `28px` to `36px`.
3. **Strict Copy-Fitting Budgets (Never Exceed)**:
   - **Eyebrow / Metadata Pill**: Max 35 characters (`text-transform: uppercase; letter-spacing: 0.1em; font-size: 14px;`).
   - **H1 Hero Headline**: Max 8–12 words. Use `font-size: clamp(44px, 5vw, 68px); line-height: 1.08; letter-spacing: -0.03em; text-wrap: balance;`.
   - **Bento Card Title**: Max 5 words (`font-size: 24px; font-weight: 700;`).
   - **Bento Card Body**: Max 22 words or 3 short bullet points (`font-size: 18px; line-height: 1.45;`). Never render walls of paragraph text.
4. **Visual Contrast Rule**: Every headline must highlight 1–2 power words using a color span, a pill background highlight, or a gradient text clip.

---

## 🧩 3. VISUAL UI PRIMITIVES (NEVER MAKE "JUST TEXT IN BOXES")
To achieve Canva/Dribbble quality, populate at least 50% of the canvas with visual UI components rather than plain text paragraphs:

- **Terminal / Code Window**: Dark card with `• • •` red/yellow/green macOS header dots, line numbers, and syntax-colored code or JSON payloads (`JetBrains Mono`).
- **Chat / Webhook Simulation**: Simulated WhatsApp or Slack message bubbles with timestamps and green double-check ticks (`✓✓`) to show automation speed.
- **Architecture Node Pipeline**: Connected boxes using inline SVG arrows (`stroke-dasharray`, glowing arrowhead markers) showing `Input → Parser → LLM → Output`.
- **Metric Progress & Delta Badges**: Trend pills (`▲ +84.2%` in `#10B981` with a `rgba(16,185,129,0.15)` background pill) and horizontal comparison progress bars (`width: 85%` vs `width: 12%`).
- **Bad vs. Good Diff Blocks**: Code-diff style blocks (`- Passive CV line` in muted red background with strikethrough vs. `+ Quantified STAR impact` in glowing green background).

---

## 🏛️ 4. THE 5 HIGH-CONVERTING ARCHETYPES

### 1. The Asymmetric Bento System (Architecture & Breakdowns)
- **Grid**: 12-column CSS Grid. Top row: 1 full-width or 7+5 split. Bottom row: 5+7 split or 4+4+4 triple card.
- **Requirement**: At least one cell must contain a **Visual UI Primitive** (terminal snippet, SVG diagram, or bar chart), not just text.

### 2. The Red/Green Split Audit (Before vs. After / Amateur vs. Pro)
- **Structure**: Top Hero Headline + Two vertical comparison cards side-by-side (or stacked with an overlapping `VS` badge).
- **Left/Top Card (The Flaw)**: Muted border, red status pill (`❌ 92% REJECTION RATE`), visual flaws highlighted with red callout tags.
- **Right/Bottom Card (The Standard)**: Elevated glowing border (`1px solid #10B981`), green status pill (`✅ PRODUCTION READY`), crisp quantified metrics.

### 3. The Giant Metric Impact (Case Studies & ROI)
- **Structure**: Massive central or top-left focal number (`120px–150px` in `JetBrains Mono` or `Outfit` ExtraBold) + unit label + 3 horizontal data proof strips below + mini SVG sparkline or bar comparison.

### 4. The Pipeline Flowchart (System Design & Automation)
- **Structure**: Step-by-step vertical or serpentine flow (`Step 01 → Step 02 → Step 03 → Output`). Uses inline SVG connectors, latency badges (`120ms`), and tool badges.

### 5. The Contrarian Executive Memo (High-Engagement Hook)
- **Structure**: Minimalist high-contrast layout, oversized typography (`text-wrap: balance`), highlighted pull-quote, and a structured 3-point takeaway checklist at the bottom.

---

## 👤 5. BRAND FOOTER & AUTHORITY SIGNATURE
Every poster must anchor authority at the bottom (`height: 64px`, flex row, `justify-content: space-between`, `align-items: center`):
- **Left**: Author Identity Badge (Initials avatar or clean typographic mark: **DUNCAN MAKOYO** // *Systems & AI Engineering*).
- **Right**: Action prompt or page counter (e.g., `SAVE FOR REFERENCE 🔖` or `01 / 05 →`).

---

## ⚙️ 6. PLAYWRIGHT RENDERING & AUTO-QA PIPELINE (MANDATORY)
Never output a broken or overflowing image. Follow this exact rendering protocol:

1. **High-DPI Viewport**: Launch Playwright Chromium with `viewport: { width: 1080, height: 1350 }` and `deviceScaleFactor: 2` (produces crisp `2160 × 2700` Retina PNGs that LinkedIn compression won't blur).
2. **Wait for Fonts**: Always await `document.fonts.ready` and `networkidle` so Google Fonts never fallback to Times New Roman or Arial.
3. **Automated Overflow Guard (Inject into HTML before screenshot)**:
   Run this script inside `page.evaluate()` before capturing the screenshot:
   ```javascript
   () => {
     const body = document.body;
     let scale = 1.0;
     while ((body.scrollHeight > 1350 || body.scrollWidth > 1080) && scale > 0.75) {
       scale -= 0.02;
       body.style.transform = `scale(${scale})`;
       body.style.transformOrigin = 'top left';
       body.style.width = `${1080 / scale}px`;
       body.style.height = `${1350 / scale}px`;
     }
     return { finalScale: scale, scrollHeight: body.scrollHeight };
   }
   ```
