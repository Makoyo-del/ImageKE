import os
import sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700;800&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet">
<style>
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    width: 1080px;
    height: 1350px;
    background-color: #09090B;
    color: #FAFAFA;
    font-family: 'Inter', sans-serif;
    padding: 56px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
}

/* Ambient Radial Glow */
.ambient-glow {
    position: absolute;
    top: -120px;
    left: 50%;
    transform: translateX(-50%);
    width: 900px;
    height: 500px;
    background: radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, rgba(99, 102, 241, 0.08) 50%, transparent 70%);
    pointer-events: none;
    z-index: 0;
}

.grid-mesh {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
    background-size: 36px 36px;
    pointer-events: none;
    z-index: 0;
}

.canvas {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 968px;
    justifyContent: space-between;
}

/* HEADER SECTION */
.header-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.pill-row {
    display: flex;
    align-items: center;
    justifyContent: space-between;
}

.eyebrow-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    padding: 6px 14px;
    border-radius: 9999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: #10B981;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #10B981;
    box-shadow: 0 0 10px #10B981;
}

.benchmark-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: #A1A1AA;
    letter-spacing: 0.05em;
}

.headline {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 52px;
    font-weight: 800;
    line-height: 1.08;
    letter-spacing: -0.03em;
    color: #FAFAFA;
    text-wrap: balance;
}

.headline span.accent {
    background: linear-gradient(135deg, #10B981 0%, #34D399 50%, #6366F1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.subheadline {
    font-size: 19px;
    color: #A1A1AA;
    line-height: 1.45;
    max-width: 900px;
}

/* MAIN BENTO SECTION */
.bento-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin: 24px 0;
}

.bento-card {
    background: #121215;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 26px 28px;
    display: flex;
    flex-direction: column;
    justifyContent: space-between;
    position: relative;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.bento-card.highlight {
    background: #15151A;
    border: 1px solid rgba(16, 185, 129, 0.35);
    box-shadow: 0 12px 36px rgba(16, 185, 129, 0.08);
}

.card-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #10B981;
    margin-bottom: 8px;
}

.card-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: #FAFAFA;
    margin-bottom: 10px;
    letter-spacing: -0.01em;
}

.card-body {
    font-size: 15px;
    color: #A1A1AA;
    line-height: 1.5;
}

/* TERMINAL PRIMITIVE */
.terminal-window {
    background: #0B0B0E;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    margin-top: 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
}

.terminal-header {
    background: #18181D;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.mac-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}
.dot-red { background: #EF4444; }
.dot-yellow { background: #F59E0B; }
.dot-green { background: #10B981; }

.terminal-title {
    color: #71717A;
    font-size: 11px;
    margin-left: 6px;
    letter-spacing: 0.04em;
}

.terminal-body {
    padding: 14px 16px;
    line-height: 1.6;
}

.cmd-line { color: #FAFAFA; }
.cmd-agent { color: #6366F1; font-weight: 700; }
.cmd-success { color: #10B981; font-weight: 600; }
.cmd-muted { color: #71717A; }

/* METRICS STRIP */
.metrics-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    background: #121215;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 20px 24px;
}

.metric-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.metric-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 32px;
    font-weight: 800;
    color: #10B981;
    line-height: 1;
}

.metric-label {
    font-size: 13px;
    font-weight: 600;
    color: #FAFAFA;
}

.metric-desc {
    font-size: 12px;
    color: #71717A;
    line-height: 1.35;
}

/* ARCHITECTURE PIPELINE STRIP */
.pipeline-card {
    grid-column: span 2;
    background: #121215;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 22px 28px;
}

.pipeline-nodes {
    display: flex;
    align-items: center;
    justifyContent: space-between;
    margin-top: 14px;
}

.pipeline-node {
    background: #18181D;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 10px 16px;
    text-align: center;
    flex: 1;
}

.node-step {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #10B981;
    font-weight: 700;
}

.node-name {
    font-size: 13px;
    font-weight: 700;
    color: #FAFAFA;
    margin-top: 2px;
}

.node-arrow {
    padding: 0 10px;
    color: #71717A;
    font-size: 18px;
    font-weight: 700;
}

/* FOOTER SECTION */
.footer-row {
    width: 100%;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 22px;
    display: flex;
    align-items: center;
    justifyContent: space-between;
}

.author-badge {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.author-name {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: #FAFAFA;
}

.author-role {
    font-size: 13px;
    color: #A1A1AA;
    font-family: 'JetBrains Mono', monospace;
}

.footer-action {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.3);
    padding: 10px 18px;
    border-radius: 9999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: #10B981;
    letter-spacing: 0.05em;
}
</style>
</head>
<body>
<div class="ambient-glow"></div>
<div class="grid-mesh"></div>

<div class="canvas">
    <!-- 1. HEADER -->
    <div class="header-section">
        <div class="pill-row">
            <div class="eyebrow-pill">
                <div class="status-dot"></div>
                ENGINEERING PLAYBOOK // GOOGLE ANTIGRAVITY
            </div>
            <div class="benchmark-badge">GEMINI 2.5 ARCHITECTURE</div>
        </div>
        <div class="headline">
            Autonomous Systems Engineering with <span class="accent">Google Antigravity</span>
        </div>
        <div class="subheadline">
            Moving beyond single-prompt generation to deterministic, multi-agent workspace orchestration with full-context AST manipulation.
        </div>
    </div>

    <!-- 2. METRICS PROOF STRIP -->
    <div class="metrics-strip">
        <div class="metric-item">
            <div class="metric-val">1.0M+</div>
            <div class="metric-label">Context Window</div>
            <div class="metric-desc">Ingests full repository state, AST trees & schemas in a single turn.</div>
        </div>
        <div class="metric-item">
            <div class="metric-val">0-Jank</div>
            <div class="metric-label">DOM & QA Loop</div>
            <div class="metric-desc">Automated Playwright checks before any code is approved.</div>
        </div>
        <div class="metric-item">
            <div class="metric-val">3.4×</div>
            <div class="metric-label">Sprint Velocity</div>
            <div class="metric-desc">Parallel agent task decomposition with zero-context fragmentation.</div>
        </div>
    </div>

    <!-- 3. BENTO GRID -->
    <div class="bento-grid">
        <!-- CARD 1: THE EXECUTION TERMINAL -->
        <div class="bento-card highlight">
            <div>
                <div class="card-tag">PRIMITIVE 01 // AUTONOMOUS LOOP</div>
                <div class="card-title">Direct Workspace Action</div>
                <div class="card-body">
                    Antigravity operates directly on the local filesystem, executing terminal commands, file refactoring, and linter resolution without manual copy-pasting.
                </div>
            </div>
            <div class="terminal-window">
                <div class="terminal-header">
                    <div class="mac-dot dot-red"></div>
                    <div class="mac-dot dot-yellow"></div>
                    <div class="mac-dot dot-green"></div>
                    <span class="terminal-title">agy-runtime // task-executor</span>
                </div>
                <div class="terminal-body">
                    <div class="cmd-line"><span class="cmd-agent">❯ agy</span> run build:verify</div>
                    <div class="cmd-muted">→ Ingesting 12 workspace skills...</div>
                    <div class="cmd-muted">→ AST validation: OK (0 errors)</div>
                    <div class="cmd-success">✓ Production bundle sealed in 420ms</div>
                </div>
            </div>
        </div>

        <!-- CARD 2: THE 3-STAGE REASONING PIPELINE -->
        <div class="bento-card">
            <div>
                <div class="card-tag">PRIMITIVE 02 // AGENT DECOMPOSITION</div>
                <div class="card-title">Virtual Agent Triad</div>
                <div class="card-body">
                    Complex initiatives exceed single-shot reasoning. Antigravity decomposes every epic into a synchronized 3-role engine:
                </div>
                <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 10px;">
                    <div style="background: #18181D; padding: 10px 14px; border-radius: 8px; border-left: 3px solid #6366F1;">
                        <span style="font-weight: 700; color: #FAFAFA; font-size: 13px;">01. Architect Agent</span>
                        <p style="color: #71717A; font-size: 12px; margin-top: 2px;">Decomposes specs into dependency graphs & schemas.</p>
                    </div>
                    <div style="background: #18181D; padding: 10px 14px; border-radius: 8px; border-left: 3px solid #10B981;">
                        <span style="font-weight: 700; color: #FAFAFA; font-size: 13px;">02. Builder Agent</span>
                        <p style="color: #71717A; font-size: 12px; margin-top: 2px;">Executes multi-file refactoring and component styling.</p>
                    </div>
                    <div style="background: #18181D; padding: 10px 14px; border-radius: 8px; border-left: 3px solid #F59E0B;">
                        <span style="font-weight: 700; color: #FAFAFA; font-size: 13px;">03. Validator Agent</span>
                        <p style="color: #71717A; font-size: 12px; margin-top: 2px;">Runs linter, build audits & Playwright DOM checks.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- CARD 3: PIPELINE FLOW -->
        <div class="pipeline-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="card-tag" style="margin-bottom: 0;">WORKFLOW ORCHESTRATION</div>
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #71717A;">ZERO HUMAN CHAT INTERVENTION</span>
            </div>
            <div class="pipeline-nodes">
                <div class="pipeline-node">
                    <div class="node-step">01. INTENT</div>
                    <div class="node-name">Natural Spec</div>
                </div>
                <div class="node-arrow">→</div>
                <div class="pipeline-node" style="border-color: rgba(99, 102, 241, 0.4);">
                    <div class="node-step" style="color: #6366F1;">02. DECOMPOSE</div>
                    <div class="node-name">AST Mapping</div>
                </div>
                <div class="node-arrow">→</div>
                <div class="pipeline-node" style="border-color: rgba(16, 185, 129, 0.4);">
                    <div class="node-step" style="color: #10B981;">03. EXECUTE</div>
                    <div class="node-name">Parallel Coding</div>
                </div>
                <div class="node-arrow">→</div>
                <div class="pipeline-node">
                    <div class="node-step">04. VALIDATE</div>
                    <div class="node-name">Self-Correction</div>
                </div>
            </div>
        </div>
    </div>

    <!-- 4. FOOTER -->
    <div class="footer-row" style="width: 100% !important; display: flex !important; justify-content: space-between !important; align-items: center !important;">
        <div class="author-badge">
            <span class="author-name">DUNCAN MAKOYO</span>
            <span class="author-role">// SYSTEMS ARCHITECT &amp; AI ENGINEER</span>
        </div>
        <div class="footer-action">
            SAVE ARCHITECTURE 🔖
        </div>
    </div>
</div>
</body>
</html>
"""

output_dir = r"C:\Users\USER\Desktop\Duncan Makoyo\LINKEDIN POSTING API\images"
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "google_antigravity_gemini_architecture.png")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(
        viewport={"width": 1080, "height": 1350},
        device_scale_factor=2 # Produces 2160x2700 Retina image
    )
    page.set_content(html_content)
    page.wait_for_load_state("networkidle")
    page.evaluate("() => document.fonts.ready")
    coords = page.evaluate("""() => {
        const f = document.querySelector('.footer-row');
        const cs = window.getComputedStyle(f);
        return {
            footerHTML: f.outerHTML,
            display: cs.display,
            justify: cs.justifyContent,
            width: cs.width,
            childrenCount: f.children.length
        };
    }""")
    print("Debug Footer:", coords)
    page.screenshot(path=output_path, type="png")
    browser.close()

size_kb = os.path.getsize(output_path) / 1024
print(f"✓ Retina poster successfully generated: {output_path} ({size_kb:.1f} KB)")
