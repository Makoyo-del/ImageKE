---
name: slides
description: Executive HTML5/CSS3 presentation engine with embedded Chart.js, responsive keyboard navigation, design tokens, and Playwright high-resolution PDF/PNG export.
---
# Executive Presentation & Slide Engine (v4.0 — Enterprise Edition)

Use this skill whenever designing or generating high-stakes investor pitch decks, technical architecture presentations, client sales proposals, or interactive HTML slide decks for Duncan Makoyo.

---

## 🚨 1. CORE MANDATE & INTEGRITY RULES (ZERO EXCEPTIONS)
1. **NO WALLS OF TEXT**: Slides are visual amplifiers, not reading documents. Maximum 30 words per slide. Defer all deep analysis to visual charts, flowcharts, or high-impact bento cards.
2. **ZERO FAKE METRICS**: Never invent revenue projections or traction numbers. If creating a pitch deck, interrogate Duncan for verified data or model scenarios based on explicit financial math.
3. **SELF-CONTAINED RESPONSIVENESS**: Every slide deck must function as a standalone HTML document supporting keyboard navigation (`ArrowLeft` / `ArrowRight` / `Space`), fullscreen mode (`F`), progress tracking, and interactive Chart.js graphs.

---

## 🎨 2. DYNAMIC DECK ARCHETYPES & MODES

### Deck Mode 1: `INVESTOR_PITCH` (Seed / Series A / Enterprise Capital)
- **Narrative Arc**: Status Quo Bottleneck → The Unfair Mechanism → Traction Proof → Unit-Economics → The Ask.
- **Visual Theme**: `TECH_OBSIDIAN` or `APPLE_DAYLIGHT` with massive metric callouts and Chart.js growth curves.
- **Copy Formula**: Duarte Sparkline ("What is" frustration vs. "What could be" hope).

### Deck Mode 2: `TECHNICAL_ARCHITECTURE` (Engineering Reviews, HookBunker Audits, System Design)
- **Narrative Arc**: Production Failure Point → Architectural Blueprint → Protocol Breakdown → Latency Benchmarks.
- **Visual Theme**: `TECH_OBSIDIAN` with syntax-highlighted code capsules, latency badges, and SVG pipeline flows.

### Deck Mode 3: `CLIENT_PROPOSAL` (Enterprise Webhooks, WhatsApp Commerce Implementations)
- **Narrative Arc**: Commercial Leakage Audit → 0-Second Automation Architecture → Phased Rollout → Guaranteed ROI.
- **Visual Theme**: `APPLE_DAYLIGHT` with before/after audit cards and fixed-scope investment tiers.

---

## 📐 3. STRICT MATHEMATICAL & LAYOUT GUARDRAILS
1. **Aspect Ratio & Canvas Resolution**:
   - Standard 16:9 widescreen canvas: `1920px × 1080px`.
   - Scale-to-fit CSS: uses CSS `aspect-ratio: 16/9` with container centering and max-height constraints.
2. **Safe Margin & Copy Budgets**:
   - Outer Safe Margin: `80px` on all sides (keep all content inside the central `1760px × 920px`).
   - Title H1: Max 8 words (`font-size: clamp(36px, 4vw, 56px)`).
   - Bento Sub-card: Max 20 words or 3 short bullet points.
3. **Chart.js Theme Enforcement**:
   - Dark mode charts: gridlines `rgba(255,255,255,0.06)`, text `#A1A1AA`, primary line `#10B981` (Neon Emerald).
   - Light mode charts: gridlines `rgba(0,0,0,0.06)`, text `#475569`, primary line `#2563EB` (Royal Blue).

---

## 💻 4. REUSABLE STANDALONE PRESENTATION BLUEPRINT (`deck.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Executive Presentation — Duncan Makoyo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@600&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --bg-canvas: #09090B;
      --bg-surface: #121215;
      --border-subtle: rgba(255,255,255,0.08);
      --text-primary: #FAFAFA;
      --text-muted: #A1A1AA;
      --accent: #10B981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #000;
      color: var(--text-primary);
      font-family: 'Inter', sans-serif;
      overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      height: 100vh; width: 100vw;
    }
    .viewport {
      width: 1920px; height: 1080px;
      max-width: 100vw; max-height: 56.25vw;
      background: var(--bg-canvas);
      position: relative; overflow: hidden;
      display: flex; flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
    }
    .slide {
      display: none; width: 100%; height: 100%;
      padding: 80px 100px; flex-direction: column; justify-content: space-between;
    }
    .slide.active { display: flex; }
    .slide-header h1 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 52px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1;
    }
    .slide-header p {
      font-size: 20px; color: var(--text-muted); margin-top: 12px;
    }
    .slide-body { flex: 1; display: flex; align-items: center; gap: 48px; margin: 40px 0; }
    .slide-footer {
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1px solid var(--border-subtle); padding-top: 24px; font-size: 14px; color: var(--text-muted);
    }
    .progress-bar {
      position: absolute; bottom: 0; left: 0; height: 4px; background: var(--accent);
      transition: width 0.3s ease;
    }
  </style>
</head>
<body>
  <div class="viewport">
    <!-- Slide 01 -->
    <div class="slide active">
      <div class="slide-header">
        <span style="color:var(--accent); text-transform:uppercase; font-size:14px; letter-spacing:0.1em; font-weight:700;">Architecture Audit</span>
        <h1>WhatsApp Commerce Latency Bottleneck</h1>
        <p>Manual M-Pesa Till verification drops 68% of buyers at checkout.</p>
      </div>
      <div class="slide-body">
        <div style="flex: 1; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 20px; padding: 40px;">
          <h3 style="font-size: 24px; margin-bottom: 16px;">The Production Bottleneck</h3>
          <p style="color: var(--text-muted); font-size: 18px; line-height: 1.5;">When customers are forced to leave chat, copy an M-Pesa Till number, and wait for human confirmation, friction spikes exponentially.</p>
        </div>
        <div style="flex: 1; height: 100%; position: relative;">
          <canvas id="funnelChart"></canvas>
        </div>
      </div>
      <div class="slide-footer">
        <span>DUNCAN MAKOYO // SYSTEMS ARCHITECTURE</span>
        <span id="counter">01 / 05</span>
      </div>
    </div>
    <div class="progress-bar" id="progress" style="width: 20%;"></div>
  </div>

  <script>
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const progress = document.getElementById('progress');
    const counter = document.getElementById('counter');

    function showSlide(index) {
      slides[currentSlide].classList.remove('active');
      currentSlide = (index + slides.length) % slides.length;
      slides[currentSlide].classList.add('active');
      progress.style.width = `${((currentSlide + 1) / slides.length) * 100}%`;
      counter.innerText = `0${currentSlide + 1} / 0${slides.length}`;
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') showSlide(currentSlide + 1);
      if (e.key === 'ArrowLeft') showSlide(currentSlide - 1);
    });

    // Chart.js init
    const ctx = document.getElementById('funnelChart');
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Ad Click', 'Catalog View', 'Cart Checkout', 'M-Pesa STK', 'Payment Verified'],
          datasets: [{
            label: 'Conversion %',
            data: [100, 72, 48, 16, 12],
            backgroundColor: '#10B981'
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#A1A1AA' } },
            x: { grid: { display: false }, ticks: { color: '#A1A1AA' } }
          }
        }
      });
    }
  </script>
</body>
</html>
```

---

## 🛠️ 5. PLAYWRIGHT PDF / PNG BATCH EXPORT SCRIPT
Export entire decks to high-resolution PDF or individual Retina slide PNGs:

```python
import sys
from playwright.sync_api import sync_playwright

def export_deck(html_path, output_pdf):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto(f"file:///{html_path}")
        page.wait_for_load_state("networkidle")
        page.evaluate("() => document.fonts.ready")
        page.pdf(path=output_pdf, width="1920px", height="1080px", print_background=True)
        browser.close()
        print(f"✓ Deck exported to PDF: {output_pdf}")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        export_deck(sys.argv[1], sys.argv[2])
```

---

## 🔗 6. CROSS-SKILL SYNCHRONIZATION
- **Consumes from `design-system`**: Utilizes standard color tokens and CSS variables.
- **Synchronized with `social-architect`**: Can adapt high-performing LinkedIn breakdowns into client-facing pitch decks.
- **Integrates with `canvas-design`**: Imports architectural diagrams and vector blueprints as slide background assets.

---

## ⚙️ 7. MANDATORY AUTO-QA & VERIFICATION LOOP
Before delivering any slide deck:
1. **Overflow & Copy-Fitting Check**: Confirm no text card causes vertical scroll inside the 16:9 viewport.
2. **Keyboard Navigation Audit**: Verify `ArrowLeft`, `ArrowRight`, and `Space` advance and reverse slides cleanly.
3. **Chart.js Execution**: Confirm all charts render without canvas dimension collapse or console errors.
4. **Resolution Validation**: Verify exported PDF/PNGs display at crisp 1080p/4K resolution.
