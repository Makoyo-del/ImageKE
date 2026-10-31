---
name: canvas-design
description: Autonomous vector art, technical infographics, architectural blueprints, and museum-grade PDF/PNG document generation engine with deterministic layout math.
---
# Canvas & Visual Art Engine (v4.0 — Enterprise Edition)

Use this skill whenever designing or generating standalone visual artwork, architectural blueprints, technical infographics, executive report covers, or museum-grade documents in PNG or PDF format.

---

## 🚨 1. CORE MANDATE & INTEGRITY RULES (ZERO EXCEPTIONS)
1. **DETERMINISTIC CRAFTSMANSHIP**: Every piece must look meticulously engineered, labored over by an elite systems architect and generative designer. No lazy templates or disjointed clip-art.
2. **MATHEMATICAL PRECISION**: Strict spatial budgets. 30–40% breathing room (negative space) is mandatory. Text and visual elements must never overlap or bleed into outer safety boundaries.
3. **ZERO PLACEHOLDER TEXT**: Never output `Lorem Ipsum` or filler copy. All typography must serve as structural information encoding real systems, data protocols, or mathematical logic.

---

## 🎨 2. DYNAMIC CONTEXT & AESTHETIC ROUTER
Select the canvas mode that embodies the subject's conceptual soul:

### Mode 1: `TECHNICAL_BLUEPRINT` (System Architecture, Cloud Topologies, Engineering Schematics)
- **Palette**: Deep Blueprint Navy (`#0A1128`) or Obsidian (`#09090B`) with Neon Cyan (`#00F2FE`), Emerald (`#10B981`), and Cadence White (`#F8FAFC`).
- **Texture**: Fine engineering coordinate grid (24px or 32px), subtle measurement callout lines (`dim: 420px`), dimension markers, and node-link network traces.
- **Typography**: `JetBrains Mono` or `Space Mono` for technical callouts; `Plus Jakarta Sans` for titles.

### Mode 2: `BAUHAUS_SWISS` (Executive Manifestos, Contrarian Essays, High-Contrast Editorial Art)
- **Palette**: Warm Alabaster Paper (`#F4F4EE`), Deep Carbon Black (`#111111`), Editorial Vermilion (`#D61A3C`), International Klein Blue (`#002FA7`).
- **Structure**: Rigid asymmetrical Swiss grid, zero border-radius (`0px`), thick hairline dividers (`1.5px solid #111111`).
- **Typography**: `Playfair Display` (Ultra-heavy 900) paired with razor-sharp `Inter` and `Space Mono`.

### Mode 3: `KINETIC_DATA_SYSTEMS` (Telemetry, Financial Math, Flowcharts, Algorithmic Visuals)
- **Palette**: Dark Slate (`#0B0F19`), Amber Pulse (`#F59E0B`), Electric Violet (`#8B5CF6`), Emerald Delta (`#10B981`).
- **Structure**: SVG sparklines, concentric circle radar meters, connected pipeline nodes with latency tags.
- **Typography**: `Inter` Bold headings + `JetBrains Mono` tabular figures.

### Mode 4: `ANALOG_MINIMALISM` (High-End Publications, Strategic Whitepapers, Coffee-Table Decks)
- **Palette**: Cool Alabaster (`#F8FAFC`), Soft Graphite (`#334155`), Muted Slate (`#64748B`), Accent Bronze (`#92400E`).
- **Structure**: Generous negative space (50%+), subtle grain texture, restrained hairline typography.
- **Typography**: `Instrument Serif` or `Outfit` with wide letter spacing (`letter-spacing: 0.15em`).

---

## 📐 3. STRICT MATHEMATICAL GUARDRAILS
1. **Canvas Dimension Standards**:
   - Portrait Mobile / Poster: `1080px × 1350px` (4:5 Aspect Ratio).
   - Widescreen / Landscape: `1920px × 1080px` (16:9 Aspect Ratio) or `2560px × 1440px`.
   - Print Quality / Multi-page: `2480px × 3508px` (A4 @ 300 DPI) for PDF generation.
2. **Spatial Safety & Negative Space**:
   - Outer Safety Margin: Strict `10% to 15%` padding along all 4 edges (no critical marks inside the margin).
   - Negative Space Budget: Minimum `35%` of the canvas must remain empty of dense graphical marks to allow eye rest.
   - Text Overlap Prevention: Text containers must have solid or scrim backgrounds when positioned near dense SVG vectors. Contrast ratio must exceed `4.5:1`.

---

## 🧩 4. REUSABLE SVG & PROCEDURAL CANVAS PATTERNS

### High-DPI Procedural SVG Blueprint Pattern:
```html
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg" style="background:#09090B;">
  <defs>
    <!-- 32px Grid Pattern -->
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
    <!-- Glowing Node Gradients -->
    <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10B981" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#6366F1" stop-opacity="0.8"/>
    </linearGradient>
    <filter id="blurFilter" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
    </filter>
  </defs>

  <!-- Background Grid -->
  <rect width="1080" height="1350" fill="#09090B"/>
  <rect width="1080" height="1350" fill="url(#grid)"/>

  <!-- Subtle Radial Ambient Light -->
  <circle cx="540" cy="300" r="400" fill="url(#neonGlow)" filter="url(#blurFilter)" opacity="0.12"/>

  <!-- Architectural Vector Nodes & Connectors -->
  <g stroke="rgba(255,255,255,0.15)" stroke-width="1.5" fill="none">
    <path d="M 180 350 L 540 350 L 900 350" stroke-dasharray="6,6"/>
    <circle cx="180" cy="350" r="6" fill="#10B981"/>
    <circle cx="540" cy="350" r="8" fill="#6366F1"/>
    <circle cx="900" cy="350" r="6" fill="#10B981"/>
  </g>
</svg>
```

---

## 💻 5. PLAYWRIGHT RETINA EXPORT SCRIPT
Always render canvas outputs via Playwright with double-resolution (`deviceScaleFactor: 2`) for crisp print and digital presentation:

```python
import sys
from playwright.sync_api import sync_playwright

def render_canvas(html_path, output_png, width=1080, height=1350):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(
            viewport={"width": width, "height": height},
            device_scale_factor=2 # Produces 2160x2700 Retina output
        )
        page.goto(f"file:///{html_path}")
        page.wait_for_load_state("networkidle")
        page.evaluate("() => document.fonts.ready")
        page.screenshot(path=output_png, full_page=False)
        browser.close()
        print(f"✓ Canvas rendered to: {output_png}")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        render_canvas(sys.argv[1], sys.argv[2])
```

---

## 🔗 6. CROSS-SKILL SYNCHRONIZATION
- **Sync with `brand`**: Consumes brand token palettes, logo glyphs, and typography constraints.
- **Sync with `linkedin-campaign-poster-design`**: Supplies underlying geometric vector patterns and architectural diagrams.
- **Sync with `slides`**: Exports cover slides, section dividers, and high-impact infographic illustrations into HTML presentation decks.

---

## ⚙️ 7. MANDATORY AUTO-QA & SELF-CORRECTION LOOP
Before declaring a canvas artifact complete:
1. **Safety Margin Inspection**: Ensure all typography, logos, and critical node pins are positioned at least `10%` inward from the outer edges.
2. **Text Overlap Check**: Ensure no text lines collide with background vectors or image elements.
3. **Font Rendering Validation**: Verify Google Fonts loaded successfully; fallback fonts (Times New Roman or Arial) are strictly prohibited.
4. **Resolution Verification**: Verify final exported PNG is rendered at minimum `2x` Retina resolution.