---
name: design-system
description: Three-layer design token architecture, CSS variable engines, modular typography scales, and multi-theme design tokens for enterprise applications and marketing visuals.
---
# Design System & Token Architecture Engine (v4.0 — Enterprise Edition)

Use this skill whenever architecting, generating, or validating design tokens (primitives, semantics, component tokens), CSS custom properties, spacing scales, and multi-theme configurations (`TECH_OBSIDIAN`, `APPLE_DAYLIGHT`, `SWISS_EDITORIAL`).

---

## 🚨 1. CORE MANDATE & INTEGRITY RULES (ZERO EXCEPTIONS)
1. **THREE-LAYER TOKEN ARCHITECTURE ONLY**: Never bind components directly to raw hex values. All styles must follow: `Primitive (Raw Value) → Semantic (Intent/Role) → Component (Contextual Application)`.
2. **MULTI-THEME COMPATIBILITY**: Every token set must declare both light and dark theme mappings using CSS custom properties with alpha-channel support (`hsl(var(--primary) / <alpha>)` or CSS color-mix).
3. **ZERO HARDCODED MAGIC NUMBERS**: Spacing, radii, shadows, and font sizes must strictly derive from the defined modular scales.

---

## 🎨 2. THE 3 WORKSPACE SYSTEM THEMES

### Theme 1: `TECH_OBSIDIAN` (Default for AI, Automation, APIs, HookBunker)
```css
:root[data-theme="tech-obsidian"], .theme-obsidian {
  --bg-canvas: #09090B;
  --bg-surface: #121215;
  --bg-surface-elevated: #18181C;
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-highlight: rgba(255, 255, 255, 0.15);
  
  --text-primary: #FAFAFA;
  --text-secondary: #A1A1AA;
  --text-muted: #71717A;
  
  --accent-primary: #10B981; /* Neon Emerald */
  --accent-secondary: #6366F1; /* Electric Indigo */
  --accent-alert: #EF4444; /* Crimson */

  --font-heading: 'Plus Jakarta Sans', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius-card: 16px;
  --radius-pill: 9999px;
}
```

### Theme 2: `APPLE_DAYLIGHT` (Default for FinTech, Executive CVs, Career Tools)
```css
:root[data-theme="apple-daylight"], .theme-daylight {
  --bg-canvas: #F8FAFC;
  --bg-surface: #FFFFFF;
  --bg-surface-elevated: #F1F5F9;
  --border-subtle: #E2E8F0;
  --border-highlight: #CBD5E1;
  
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  
  --accent-primary: #2563EB; /* Royal Tech Blue */
  --accent-secondary: #059669; /* Trust Emerald */
  --accent-alert: #DC2626;

  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --radius-card: 20px;
  --radius-pill: 9999px;
}
```

### Theme 3: `SWISS_EDITORIAL` (Default for Contrarian Manifestos, Print Art)
```css
:root[data-theme="swiss-editorial"], .theme-editorial {
  --bg-canvas: #F4F4EE;
  --bg-surface: #ECECE4;
  --bg-surface-elevated: #E4E4DC;
  --border-subtle: #111111;
  --border-highlight: #111111;
  
  --text-primary: #111111;
  --text-secondary: #262626;
  --text-muted: #525252;
  
  --accent-primary: #D61A3C; /* Editorial Crimson */
  --accent-secondary: #002FA7; /* Klein Blue */
  --accent-alert: #D61A3C;

  --font-heading: 'Playfair Display', serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'Space Mono', monospace;
  --radius-card: 0px; /* Sharp Swiss Brutalism */
  --radius-pill: 0px;
}
```

---

## 📐 3. STRICT MODULAR SCALES & MATHEMATICAL BUDGETS
1. **8-Point Spacing Grid Scale**:
   - `space-1`: `4px`
   - `space-2`: `8px`
   - `space-3`: `12px`
   - `space-4`: `16px`
   - `space-6`: `24px`
   - `space-8`: `32px`
   - `space-12`: `48px`
   - `space-16`: `64px`
2. **Modular Typography Scale (1.250 Major Third)**:
   - `text-xs`: `12px` (`0.75rem`), line-height: `16px`
   - `text-sm`: `14px` (`0.875rem`), line-height: `20px`
   - `text-base`: `16px` (`1.0rem`), line-height: `24px`
   - `text-lg`: `20px` (`1.25rem`), line-height: `28px`
   - `text-xl`: `25px` (`1.563rem`), line-height: `32px`
   - `text-2xl`: `31px` (`1.953rem`), line-height: `38px`
   - `text-3xl`: `39px` (`2.441rem`), line-height: `46px`
   - `text-4xl`: `49px` (`3.052rem`), line-height: `56px`

---

## 🧩 4. REUSABLE TOKEN GENERATOR & VALIDATOR SCRIPTS

### A. Token Compilation (`scripts/generate-tokens.cjs`)
Reads JSON token tree and outputs production CSS custom properties:
```powershell
node .agents/skills/design-system/scripts/generate-tokens.cjs --config assets/design-tokens.json -o assets/design-tokens.css
```

### B. Anti-Hardcode Token Linting Script
Scan source code to identify and reject raw hardcoded hex codes:
```powershell
node .agents/skills/design-system/scripts/validate-tokens.cjs --dir src/
```

---

## 🔗 5. CROSS-SKILL SYNCHRONIZATION PROTOCOL
- **Receives from `brand`**: Consumes core color swatches and typography families.
- **Supplies to `ui-styling` & `card-design`**: Feeds Tailwind CSS variables and `@theme` configuration.
- **Powers `linkedin-campaign-poster-design` & `banner-design`**: Injects dynamic CSS variables directly into HTML poster rendering pipelines.

---

## ⚙️ 6. MANDATORY AUTO-QA & TOKEN AUDIT LOOP
Before approving any code or design update:
1. **Token Reference Check**: Verify that zero component CSS declarations contain raw hex values (e.g. `#10B981`); all must use `var(--accent-primary)`.
2. **Theme Switching Audit**: Test interface switching between `tech-obsidian` and `apple-daylight` to ensure all foreground text and border lines remain legible.
3. **Contrast Score**: Run WCAG AA evaluation to guarantee all semantic color combinations achieve at least `4.5:1` contrast for text.
