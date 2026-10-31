---
name: banner-design
description: Autonomous multi-platform banner design engine for social headers, digital ads, website heroes, and print. Generates high-converting, safe-zone compliant visuals via HTML5/CSS3/SVG and Playwright.
---
# Banner Design Engine (v4.0 — Enterprise Edition)

Use this skill whenever designing or generating banners, social headers (LinkedIn, X/Twitter, YouTube, Facebook), website hero headers, ad creatives (Google Display, Meta Ads), or print banners for Duncan Makoyo or client campaigns.

---

## 🚨 1. CORE MANDATE & INTEGRITY RULES (ZERO EXCEPTIONS)
1. **NO CLIP-ART OR PLACEHOLDER IMAGES**: Never insert broken image URLs or low-resolution stock placeholders. Use procedural SVG textures, high-craft CSS gradients, or dedicated generation pipelines.
2. **SAFE-ZONE NON-NEGOTIABLE**: Profile photos, UI overlays, and platform chrome must never cover headlines, logos, or CTAs. Every platform layout must strictly adhere to physical coordinate safe zones.
3. **ZERO UNCHECKED OVERFLOW**: Text must never clip or wrap unpredictably. Execute the Playwright DOM check before finalizing.

---

## 🎨 2. DYNAMIC THEME ENGINE
Select the theme that matches the platform and conversion intent, or follow the user's explicit directive:

### Mode A: `TECH_OBSIDIAN` (Developer Tools, APIs, Automation, GitHub, Technical Banners)
- **Background**: `#09090B` with radial glow `radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.15), transparent 50%)`.
- **Surfaces**: `#121215` with `1px solid rgba(255, 255, 255, 0.08)` and `border-radius: 12px`.
- **Accents**: Neon Emerald (`#10B981`), Electric Indigo (`#6366F1`), Alert Red (`#EF4444`).
- **Typography**: Headings: `Plus Jakarta Sans` / `Outfit` (700/800) | Code: `JetBrains Mono` | Body: `Inter`.

### Mode B: `EXECUTIVE_AUTHORITY` (LinkedIn Headers, Personal Branding, FinTech, Webinars)
- **Background**: `#F8FAFC` (Cool Alabaster) with subtle geometric wireframe or `#0F172A` (Deep Slate Navy).
- **Surfaces**: `#FFFFFF` with soft drop-shadow `0 10px 25px -5px rgba(15, 23, 42, 0.08)`.
- **Accents**: Royal Blue (`#2563EB`), Emerald Trust (`#059669`), Gold Sovereign (`#D97706`).
- **Typography**: Headings: `Inter` / `Plus Jakarta Sans` (800) | Subtitles: `Inter` (500).

### Mode C: `SWISS_EDITORIAL` (Provocative Hooks, Industry Manifestos, Print & Event Banners)
- **Background**: `#F4F4EE` (Warm Paper) | **Structure**: `2px solid #111111` (Sharp `0px` radius).
- **Accents**: Editorial Crimson (`#D61A3C`), Deep Carbon (`#111111`).
- **Typography**: Headings: `Playfair Display` (900 Italic) or `Instrument Serif` | Monospace tags: `Space Mono`.

### Mode D: `AD_CONVERSION` (Meta & Google Display Ads — High CTR)
- **Constraint**: Strict compliance with Meta's 20% text rule (text surface < 20% of canvas).
- **Accents**: High-contrast punchy CTA button with hover elevation and directional visual cues.

---

## 📐 3. PLATFORM DIMENSIONS & EXACT SAFE-ZONE BUDGETS

| Platform | Type | Exact Canvas (px) | Strict Safe-Zone Coordinates (Protected Area) |
| :--- | :--- | :--- | :--- |
| **LinkedIn Personal** | Header Banner | `1584 × 396` (4:1) | **Blocked**: Left `0–380px`, Bottom `0–180px` (Profile Avatar). **Safe Zone**: `x: 400px to 1520px`, `y: 40px to 350px`. Keep all text right-aligned or centered in right 70%. |
| **LinkedIn Company** | Page Cover | `1128 × 191` (5.9:1) | **Blocked**: Left `0–200px`, Bottom `0–100px`. Critical text in central band `y: 30px to 160px`. |
| **Twitter / X** | Header Banner | `1500 × 500` (3:1) | **Blocked**: Bottom-left `320px × 200px`. Critical text centered vertically between `x: 350px to 1420px`. |
| **YouTube** | Channel Art | `2560 × 1440` (16:9) | **Desktop/Mobile Safe Zone**: Central `1232 × 338px` (`x: 664px to 1896px`, `y: 551px to 889px`). Everything outside is cropped on mobile. |
| **Meta Ad / IG Post** | Square / Feed | `1080 × 1080` (1:1) | Outer `80px` margin clear. Central 80% focus. Max 20% text area. |
| **Website Hero Banner** | Desktop Hero | `1920 × 600` (~3:1) | Outer `120px` horizontal padding. Content flex row: Left 60% copy, Right 40% interactive UI mockup. |

---

## 🧩 4. VISUAL UI PRIMITIVES & COMPOSITION
Never make banners consisting solely of flat text over a solid color:
1. **The Code / Architecture Capsule**: A miniature dark window with macOS traffic lights (`• • •`), syntax-highlighted endpoint or webhook payload (`JetBrains Mono`).
2. **The Telemetry Delta Pill**: High-contrast performance badge (`▲ 99.98% RELIABILITY` or `0-SECOND DISPATCH`) with subtle glow.
3. **SVG Grid & Node Backdrop**: 40px isometric grid pattern with subtle opacity (`rgba(255,255,255,0.04)`), connected by glowing circuit traces.
4. **The Verified Authority Seal**: Subtle typographic signature badge (`DUNCAN MAKOYO // SYSTEMS ARCHITECT`).

---

## 💻 5. REUSABLE HTML5/CSS3 BANNER TEMPLATE
Use this standard container for Playwright capture:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1584px; height: 396px; /* Dynamic size */
      background: #09090B;
      color: #FAFAFA;
      font-family: 'Inter', sans-serif;
      overflow: hidden;
      display: flex;
      position: relative;
    }
    .grid-pattern {
      position: absolute; inset: 0;
      background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 32px 32px;
      pointer-events: none;
    }
    .radial-glow {
      position: absolute; right: -100px; top: -100px; width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.18), transparent 70%);
      pointer-events: none;
    }
    .safe-container {
      position: relative; z-index: 10;
      margin-left: 420px; /* Safe from LinkedIn avatar */
      padding: 48px 64px 48px 0;
      display: flex; justify-content: space-between; align-items: center; width: 100%;
    }
    .copy-block h1 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 44px; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em;
    }
    .copy-block p {
      font-size: 18px; color: #A1A1AA; margin-top: 12px; max-width: 580px; line-height: 1.4;
    }
    .terminal-capsule {
      background: #121215; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
      padding: 18px 24px; font-family: 'JetBrains Mono', monospace; font-size: 14px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
  </style>
</head>
<body>
  <div class="grid-pattern"></div>
  <div class="radial-glow"></div>
  <div class="safe-container">
    <div class="copy-block">
      <h1>Autonomous Webhooks &amp; FinTech Architecture</h1>
      <p>High-reliability webhook telemetry, WhatsApp commerce engines, and automated backend infrastructure for modern African enterprises.</p>
    </div>
    <div class="terminal-capsule">
      <div style="color: #10B981; margin-bottom: 6px;">✓ Daraja STK push 200 OK</div>
      <div style="color: #6366F1; margin-bottom: 6px;">✓ Webhook dispatched in 42ms</div>
      <div style="color: #FAFAFA;">→ duncanmakoyo.com</div>
    </div>
  </div>
</body>
</html>
```

---

## 🔗 6. CROSS-SKILL SYNCHRONIZATION
- **Consumes from `brand` & `design-system`**: Takes core palette tokens, typography rules, and authority logos.
- **Synchronized with `social-architect`**: Banner messaging directly reinforces the active campaign thesis without repeating exact text post hooks.
- **Integrates with `linkedin-campaign-poster-design`**: Shares the same Dynamic Theme CSS variable tokens (`TECH_OBSIDIAN`, `APPLE_DAYLIGHT`, `SWISS_EDITORIAL`).
- **Hands off to `LINKEDIN POSTING API`**: Renders assets directly into `C:\Users\USER\Desktop\Duncan Makoyo\LINKEDIN POSTING API\images\` for automated publishing.

---

## ⚙️ 7. MANDATORY AUTO-QA & RENDERING VERIFICATION LOOP
Never finalize a banner without executing this 4-step checklist:

1. **Exact Dimension Lock**: Verify HTML root has explicit CSS `width` and `height` matching platform specs.
2. **Safe-Zone Audit**: Ensure zero critical text falls within the blocked profile/mobile zones.
3. **Playwright High-DPI Screenshot**:
   - Set `viewport: { width: targetWidth, height: targetHeight }`.
   - Set `deviceScaleFactor: 2` (produces ultra-crisp Retina PNG).
   - Wait for `document.fonts.ready` and `networkidle`.
4. **Legibility & Contrast Check**: Text-to-background contrast ratio must measure >= `4.5:1` using WCAG AA formula.
