---
name: ui-ux-pro-max
description: Master UI/UX design intelligence database containing 67 styles, 161 color palettes, 57 font pairings, 99 UX guidelines, and 25 chart types across 22 technology stacks.
---
# UI/UX Pro Max — Design Intelligence Engine (v4.0 — Enterprise Edition)

Use this skill whenever conducting design research, selecting visual styles, extracting color palettes, choosing typography pairings, auditing UX/accessibility issues, or generating hierarchical design systems (`MASTER.md` + page-level overrides).

---

## 🚨 1. CORE MANDATE & INTEGRITY RULES (ZERO EXCEPTIONS)
1. **FULL-SPECTRUM INTELLIGENCE**: Governs responsive web, mobile apps (React Native/Flutter), and desktop enterprise interfaces. Never artificially restrict guidelines to mobile only.
2. **PRIORITIZE WORKSPACE SYSTEM THEMES**: Seamlessly map search recommendations to the workspace's primary design themes (`TECH_OBSIDIAN`, `APPLE_DAYLIGHT`, `SWISS_EDITORIAL`).
3. **ZERO FLUFF & WINDOWS POWERSHELL READY**: Always invoke scripts using `python` with proper UTF-8 stdout handling.

---

## 🎨 2. DYNAMIC DESIGN TIERS & OPERATIONAL MODES

| Tier | Application Scope | Recommended Archetype | Primary Stack Guidelines |
| :--- | :--- | :--- | :--- |
| **Tier 1: `ENTERPRISE_CONSOLE`** | HookBunker, Webhook telemetry, Developer dashboards | `TECH_OBSIDIAN` (High data density, tabular monospace, real-time pulse dots) | React / Vite, Tailwind CSS, TanStack Table, Lucide Icons |
| **Tier 2: `EXECUTIVE_FINTECH`** | ATS Career Simulators, Financial OS, Portfolio sites | `APPLE_DAYLIGHT` (Alabaster, high-trust cards, quantified metric pills) | Next.js / Vite, Tailwind CSS, Radix UI, Chart.js |
| **Tier 3: `AUTONOMOUS_COMMERCE`** | WhatsApp catalog checkouts, Mobile Web stores | High-velocity Mobile UX (48dp touch targets, instant visual feedback) | React Native, Meta Cloud API, Tailwind Mobile |
| **Tier 4: `EDITORIAL_CREATIVE`** | Social campaign posters, B2B infographics, pitch decks | `SWISS_EDITORIAL` (Asymmetric grid, brutalist contrast, serif headlines) | Playwright, HTML5/Canvas, CSS Grid |

---

## 📐 3. STRICT TECHNICAL & USABILITY GUARDRAILS
1. **Accessibility Standards (WCAG 2.1 AA)**:
   - Primary text contrast: minimum `4.5:1` against background.
   - Secondary text contrast: minimum `3:1` against background.
   - Touch targets: minimum `44pt × 44pt` (iOS) / `48dp × 48dp` (Android/Web).
2. **Spatial Grid Discipline**:
   - Strict `4px / 8px` spatial rhythm for paddings, gaps, and margins (`8px`, `16px`, `24px`, `32px`, `48px`, `64px`).
3. **Vector-Only Icon Rule**:
   - Emojis (🎨, 🚀, ⚙️) are strictly forbidden as structural UI navigation icons. Use Phosphor (`@phosphor-icons/react`), Heroicons (`@heroicons/react`), or Lucide (`lucide-react`).

---

## 💻 4. SEARCH CLI PATTERNS & USAGE BLUEPRINTS

### A. Generate Complete Design System (Master + Overrides Pattern)
```powershell
# Generate and persist master design system for a project
python .agents/skills/ui-ux-pro-max/scripts/search.py "fintech analytics dashboard modern minimal" --design-system --persist -p "HookBunker" -f markdown

# Generate with design dials (variance, motion, density)
python .agents/skills/ui-ux-pro-max/scripts/search.py "internal dev telemetry" --design-system --variance 8 --motion 6 --density 9 -p "HookBunker Console"
```

### B. Query Specific Design Intelligence Domains
```powershell
# Search color palettes
python .agents/skills/ui-ux-pro-max/scripts/search.py "fintech security trust" --domain color

# Search typography pairings
python .agents/skills/ui-ux-pro-max/scripts/search.py "professional modern tech" --domain typography

# Search UX anti-patterns & guidelines
python .agents/skills/ui-ux-pro-max/scripts/search.py "loading state accessibility" --domain ux

# Search Chart.js recommendations
python .agents/skills/ui-ux-pro-max/scripts/search.py "real-time webhook latency" --domain chart
```

---

## 🧩 5. MASTER UX VERIFICATION CHECKLIST

Before approving any interface design or code:
- [ ] **Icons**: All navigation glyphs are clean SVG vectors; zero emoji-as-icon hacks.
- [ ] **Touch Targets**: All buttons, links, and form controls have at least `44px × 44px` hit areas.
- [ ] **Contrast**: Text elements meet WCAG AA standards in both light and dark themes.
- [ ] **Micro-Interactions**: Hover, active, and focus states trigger within `150ms` without shifting layout bounds.
- [ ] **Safe-Zones**: Fixed headers, bottom bars, and modals respect OS notches and navigation home bars.
- [ ] **Error States**: Form fields announce validation errors inline and via ARIA live regions.

---

## 🔗 6. CROSS-SKILL SYNCHRONIZATION PROTOCOL
- **Primary Intelligence Provider**: Supplies color palettes, font pairings, and layout structures to `frontend-design`, `ui-styling`, and `card-design`.
- **Synchronized with `design-system`**: Translates search outputs directly into 3-tier CSS custom properties.
- **Empowers `linkedin-campaign-poster-design` & `banner-design`**: Supplies chart blueprints and aesthetic tokens for high-converting social campaign graphics.

---

## ⚙️ 7. MANDATORY AUTO-QA & VERIFICATION LOOP
1. **Search CLI Smoke Test**: Verify Python scripts execute without `ModuleNotFoundError` or charmap codec errors.
2. **Hierarchy Validation**: If `--persist` is used, ensure `design-system/MASTER.md` is generated and cleanly readable.
3. **Responsive Stress Test**: Verify proposed layouts on simulated small screen (`375px`) and wide desktop (`1440px`).
