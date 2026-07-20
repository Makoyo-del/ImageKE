---
version: "1.0.0"
name: "Swiss Editorial / Structured Bento"
description: "A premium, highly structured, brutalist but elegant design system combining Swiss International typography and visible structural bento grids."
colors:
  background: "#F4F4EE"
  primary: "#111111"
  accent: "#D61A3C"
  border: "#111111"
typography:
  display:
    fontFamily: "Playfair Display, GT Alpina, Serif"
    fontWeight: "normal or bold"
  body:
    fontFamily: "Helvetica Neue, Inter, Roboto, sans-serif"
    letterSpacing: "normal"
  utility:
    fontFamily: "Helvetica Neue, Inter, Roboto, sans-serif"
    textTransform: "uppercase"
    letterSpacing: "0.15em"
    fontWeight: "bold"
layout:
  grid: "Bento Box"
  border: "1px or 2px solid #111111"
  alignment: "left"
---

# Swiss Editorial / Structured Bento Design System
## GLOBAL MASTER DESIGN SYSTEM

Welcome to the Swiss Editorial / Structured Bento design system. This document is the absolute source of truth for all design decisions, styling parameters, layout grids, components, and visuals generated for this workspace.

---

## 1. CORE DESIGN PHILOSOPHY

* **Aesthetic**: Swiss International Style meets Modern SaaS Editorial.
* **Vibe**: Premium, highly structured, brutalist but elegant, intelligence-focused, and highly legible.
* **Rule of Law**: Content is king. Structure is dictated by visible grid lines. No gradients, no soft drop-shadows, no rounded corners (unless on specific UI buttons), no cluttered backgrounds.

---

## 2. MASTER COLOR PALETTE (STRICT TOKENS)

Only the following color tokens may be used:

| Token | Hex Code | Role & Usage |
| :--- | :--- | :--- |
| **Base Surface** | `#F4F4EE` | Warm, paper-like off-white/beige. Used for all main page and card backgrounds. **Never** use pure white `#FFFFFF` for the main background. |
| **Structural / Primary Text** | `#111111` | Deep charcoal/black. Used for all grid lines, borders, body text, headings, and primary icons. |
| **Editorial Accent** | `#D61A3C` | Vibrant, editorial crimson red. Used strictly for high-impact emphasis, italicized keywords in main headers, primary calls-to-action (CTAs), and micro-accents (like bullet dots). |

---

## 3. TYPOGRAPHY SYSTEM (TWO-FONT RULE)

### Headline & Display Font
* **Typeface**: High-contrast, elegant Serif (e.g., *Playfair Display*, *GT Alpina*, or system serif fallback).
* **Usage**: Reserved exclusively for H1s and major title banners.
* **Behavior**: Mix standard weight with bold, and frequently inject italicized red for key action words within the black headline.
* **Example**:
  > Designing *the future* of structural interfaces.

### Body & Utility Font
* **Typeface**: Stark, clean, geometric Sans-Serif (e.g., *Helvetica Neue*, *Inter*, *Roboto*, or system sans-serif fallback).
* **Usage**: Body copy, descriptions, metadata, tags, UI labels, buttons, and subheaders.
* **Behavior**:
  * **Metadata/Tags**: Must be `ALL CAPS`, bold, with wide tracking (letter spacing).
  * **Utility Text**: Format with double-slashes to establish structural context (e.g., `THE CONTEXT // 2026`).

---

## 4. LAYOUT & STRUCTURAL GRID (THE BENTO BOX)

* **Visible Borders**: The layout must be built on a strict, visible grid system. Use `1px` or `2px` solid `#111111` lines to divide the canvas into distinct rectangular sections (Bento Box style).
* **Bleed Lines**: Grid lines should often extend to the absolute edges of the canvas, creating margins and framing the central content perfectly.
* **Alignment**: Strict left-alignment for almost all text. Do not center-align body text.
* **Padding**: Generous, mathematically consistent padding inside every grid cell to let the typography breathe.

```
+-------------------------------------------------------------+
| SECTION BANNER // 2026                        THE INDEX     |
+------------------------------+------------------------------+
| H1: The Editorial *Modern*   | METADATA // DETAILS          |
|                              |                              |
| This layout uses 1px solid   | - Strict left alignment      |
| borders to frame each element| - High typography contrast   |
| in a Bento style.            | - Accent dot indicator 🔴     |
+------------------------------+------------------------------+
```

---

## 5. MICRO-INTERACTIONS & VISUAL ASSETS

* **Icons**: Minimalist, 2D line-art icons. Black strokes. Optionally highlight one small element of the icon with the red accent color.
* **Buttons/Links**: Keep them stark. Often just bold sans-serif text followed by a thin arrow (e.g., `REGISTER NOW →`) accompanied by a solid red dot (🔴), or a solid red rectangular button with white text.
* **Vertical Text**: Utilize vertical alignment for side-banners or secondary CTAs (e.g., a right-hand narrow column with rotated text reading `"JOIN THE CONVERSATION"`).

---

## 6. CODE IMPLEMENTATION GUIDELINE (CSS / TAILWIND)

### CSS Variables
```css
:root {
  --color-bg: #F4F4EE;
  --color-primary: #111111;
  --color-accent: #D61A3C;
  --font-serif: "Playfair Display", "GT Alpina", Georgia, serif;
  --font-sans: "Helvetica Neue", "Inter", "Roboto", sans-serif;
  --grid-border: 1px solid var(--color-primary);
}
```

### Tailwind Config Override
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        background: '#F4F4EE',
        primary: '#111111',
        accent: '#D61A3C',
      },
      fontFamily: {
        serif: ['Playfair Display', 'GT Alpina', 'Georgia', 'serif'],
        sans: ['Helvetica Neue', 'Inter', 'Roboto', 'sans-serif'],
      },
      borderWidth: {
        '1': '1px',
      }
    },
  },
}
```
