---
name: design
description: Master Creative Director and Design Systems Orchestrator coordinating brand identity, UI styling, vector art, corporate identity packages, presentation slides, banners, and marketing assets.
---
# Master Design Orchestrator (v4.0 — Enterprise Edition)

Use this skill as the master creative director whenever orchestrating end-to-end design workflows spanning multiple design sub-domains (Brand Identity, UI/UX Engineering, Social Visuals, Pitch Decks, Corporate Identity Deliverables, and Vector Art).

---

## 🚨 1. CORE MANDATE & INTEGRITY RULES (ZERO EXCEPTIONS)
1. **DETERMINISTIC ROUTING OVER RANDOM INVOCATION**: Never randomly guess sub-skills. Route requests systematically to the specialized v4.0 skill engineered for that domain.
2. **ZERO UNCHECKED PLACEHOLDERS**: All output mockups, code, and graphics must be production-ready. No mock `lorem ipsum`, no broken asset URLs, no fabricated metrics.
3. **CROSS-PLATFORM POWERSHELL COMPATIBILITY**: On Windows, execute scripts with `python` (not `python3`) and ensure UTF-8 console output encoding.

---

## 🗺️ 2. DYNAMIC WORKSPACE DESIGN DISPATCH MATRIX

Route incoming creative briefs to the designated specialized skill:

| Creative Requirement | Dedicated v4.0 Skill | Primary Artifacts Produced |
| :--- | :--- | :--- |
| **Brand Voice, Guidelines & Token Synching** | `brand` | `assets/design-tokens.json`, `docs/brand-guidelines.md` |
| **Token Architecture & CSS Variable Engine** | `design-system` | Semantic token layers, CSS `@theme` variables |
| **Component Engineering (Tailwind + Radix)** | `ui-styling` & `card-design` | Production React components, accessible primitives |
| **Distinctive UI Layouts & Web Architecture** | `frontend-design` | Full-page layouts, error states, interactive consoles |
| **LinkedIn Posters, B2B Graphics & Carousels** | `linkedin-campaign-poster-design` | High-converting 4:5 Retina PNG posters (`2160×2700`) |
| **Social Headers, Ad Banners & Hero Covers** | `banner-design` | Safe-zone locked headers (LinkedIn, X, YouTube, Ads) |
| **Interactive HTML Pitch Decks & Data Slides** | `slides` | 16:9 widescreen HTML presentations with Chart.js |
| **Vector Blueprints, Infographics & Art Canvas** | `canvas-design` | Standalone SVG/PNG blueprints and museum-grade art |
| **Design Intelligence & Stack Best Practices** | `ui-ux-pro-max` | Comprehensive search across 67 styles and 161 palettes |

---

## 📐 3. MASTER TECHNICAL & MATHEMATICAL GUARDRAILS
1. **Unified Token Hierarchy**: Every asset generated must align with the workspace's 3 primary dynamic themes:
   - `TECH_OBSIDIAN` (`#09090B`, `#10B981` / `#6366F1`, `Plus Jakarta Sans`, `JetBrains Mono`)
   - `APPLE_DAYLIGHT` (`#F8FAFC`, `#2563EB` / `#059669`, `Inter`, `JetBrains Mono`)
   - `SWISS_EDITORIAL` (`#F4F4EE`, `#111111`, `#D61A3C`, `Playfair Display`, `Space Mono`)
2. **Double-Resolution Retina Standard**: All Playwright screenshots must use `deviceScaleFactor: 2` to eliminate rasterization blur on high-DPI screens.
3. **Accessible Contrast (WCAG AA)**: Minimum text contrast ratio of `4.5:1` across all visual outputs.

---

## 🧩 4. END-TO-END EXECUTION WORKFLOWS

### Workflow A: Complete Brand & Product Launch Package
```
1. [brand]: Define core voice, Anti-AI firewall rules, and color palettes.
2. [design-system]: Compile tokens to assets/design-tokens.json and design-tokens.css.
3. [frontend-design] + [card-design]: Build landing page & dashboard in React/Vite.
4. [banner-design]: Generate LinkedIn, Twitter, and YouTube channel headers.
5. [social-architect] + [linkedin-campaign-poster-design]: Produce B2B announcement campaign.
```

### Workflow B: High-Stakes Investor / Client Pitch Deck
```
1. [social-architect]: Structure the 5-stage persuasive argument (Problem -> Mechanism -> ROI).
2. [design-system]: Pull brand CSS variables and typography tokens.
3. [slides]: Generate responsive 16:9 HTML presentation with interactive Chart.js charts.
4. [Playwright]: Export high-resolution presentation slides or multi-page PDF.
```

---

## 🛠️ 5. REUSABLE LOCAL SCRIPT EXECUTION BLUEPRINT
When executing internal design utility scripts on Windows, run directly from workspace paths:

```powershell
# Search design intelligence database
python .agents/skills/ui-ux-pro-max/scripts/search.py "fintech analytics dashboard" --design-system

# Sync brand guidelines to CSS design tokens
node .agents/skills/brand/scripts/sync-brand-to-tokens.cjs

# Verify asset standards
node .agents/skills/brand/scripts/validate-asset.cjs <path-to-image>
```

---

## 🔗 6. CROSS-SKILL SYNCHRONIZATION PROTOCOL
- **Lead Art Director**: Enforces brand consistency across all 11 sub-skills in the workspace.
- **Copywriting Alignment**: Ensures visual headlines synchronize with `social-architect` copy hooks without literal word-for-word duplication.
- **Publishing Pipeline**: Channels finalized creatives directly into `C:\Users\USER\Desktop\Duncan Makoyo\LINKEDIN POSTING API\images\` for scheduled or live API dispatch.

---

## ⚙️ 7. MANDATORY MASTER AUTO-QA & VERIFICATION CHECKLIST
Before declaring any multi-disciplinary design deliverable complete:
1. **Asset Naming & Path Check**: Assets must use descriptive kebab-case naming (`{campaign}-{theme}-{dimensions}.png`).
2. **Visual Inspection**: Open the generated output in browser or preview tool to inspect typography, safe zones, and padding.
3. **Lint & Build Pass**: For code assets, run `npm run build` or `npx tsc --noEmit` to ensure zero compilation or syntax errors.
4. **Authority Signature**: Confirm that public-facing collateral includes Duncan Makoyo's clean brand signature badge.
