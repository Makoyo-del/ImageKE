import os
import sys
from playwright.sync_api import sync_playwright

# Ensure output encoding is UTF-8 to prevent encoding issues in Windows console
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass

WORKSPACE_DIR = r"c:\Users\USER\Desktop\Duncan Makoyo\DunMak"
OUTPUT_DIR = os.path.join(WORKSPACE_DIR, "Workshop content", "VAULT CONTENT")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Helper to generate the common HTML Wrapper
def get_html_wrapper(header_text, cells_html):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Poster</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
    <style>
        body {{
            margin: 0; padding: 0; background: #F4F4EE;
            width: 1080px; height: 1080px; overflow: hidden;
            font-family: 'Inter', sans-serif;
            color: #111111;
        }}
        .poster-container {{
            width: 1080px; height: 1080px;
            background: #F4F4EE;
            border: 24px solid #111111;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            padding: 56px; /* 24px border + 56px padding = 80px offset for margin safety check */
            position: relative;
        }}
        .header-bar {{
            border-bottom: 2px solid #111111;
            padding-bottom: 20px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 14px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #111111;
        }}
        .header-bar .tag {{
            color: #D61A3C;
        }}
        .bento-grid {{
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            border: 2px solid #111111;
            background: #111111;
            gap: 2px; /* visible borders via gap and background */
        }}
        .grid-cell {{
            background: #F4F4EE;
            padding: 32px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
        }}
        .cell-header {{
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: #666;
            margin-bottom: 12px;
        }}
        .cell-headline {{
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 40px;
            font-weight: 700;
            line-height: 1.15;
            margin: 0 0 12px 0;
            color: #111111;
        }}
        .cell-headline em {{
            color: #D61A3C;
            font-style: italic;
            font-weight: 700;
        }}
        .cell-text {{
            font-size: 14px;
            line-height: 1.6;
            color: #222;
            margin: 0;
        }}
        .bullet-list {{
            list-style: none;
            padding: 0;
            margin: 0;
        }}
        .bullet-item {{
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 10px;
            display: flex;
            align-items: flex-start;
        }}
        .bullet-dot {{
            color: #D61A3C;
            margin-right: 8px;
            font-weight: bold;
        }}
        .reject-box {{
            border: 1px solid #D61A3C;
            padding: 12px;
            background: rgba(214, 26, 60, 0.05);
            margin-bottom: 12px;
        }}
        .reject-label {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: #D61A3C;
            font-weight: 700;
            margin-bottom: 4px;
        }}
        .accept-box {{
            border: 1px solid #111111;
            padding: 12px;
            background: rgba(17, 17, 17, 0.02);
        }}
        .accept-label {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            color: #111111;
            font-weight: 700;
            margin-bottom: 4px;
        }}
        .cta-btn {{
            border: 2px solid #111111;
            background: #D61A3C;
            color: #F4F4EE;
            padding: 14px 20px;
            font-family: 'Inter', sans-serif;
            font-weight: 800;
            font-size: 12px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            text-decoration: none;
            display: inline-block;
            width: fit-content;
            margin-top: auto;
        }}
    </style>
</head>
<body>
    <div class="poster-container">
        <div class="header-bar">
            <span>{header_text}</span>
            <span class="tag">// ATS VAULT</span>
        </div>
        <div class="bento-grid">
            {cells_html}
        </div>
    </div>
</body>
</html>"""

# Define the data for the 10 posters
POSTERS_DATA = [
    {
        "filename": "design_01_ats_filter.jpg",
        "header": "ATS SCREENING // 2026",
        "cells": """
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE CONTEXT</div>
                    <h2 class="cell-headline">The *Invisible* Filter.</h2>
                </div>
                <p class="cell-text">75% of resumes are filtered out by Applicant Tracking Systems before a human recruiter ever sees them.</p>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE BOTTLENECK</div>
                    <ul class="bullet-list">
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Multi-columns parse as word soup</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Text boxes hide key content</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Fancy graphics block algorithms</li>
                    </ul>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE SOLUTION</div>
                    <h2 class="cell-headline" style="font-size:32px;">Single-Column *Swiss* Layout.</h2>
                    <p class="cell-text">Clean typography and strict left-alignment ensure 100% readability for automated parsers.</p>
                </div>
            </div>
            <div class="grid-cell" style="justify-content: space-between;">
                <div>
                    <div class="cell-header">ACTIONABLE VALUE</div>
                    <p class="cell-text" style="margin-bottom: 20px;">Use vetted frameworks engineered to pass automated screening.</p>
                </div>
                <a class="cta-btn" href="#">TEST YOUR RESUME →</a>
            </div>
        """
    },
    {
        "filename": "design_02_quantified_achievements.jpg",
        "header": "ACHIEVEMENT METRICS // 2026",
        "cells": """
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE REJECTION TRAP</div>
                    <h2 class="cell-headline">Delete *the Fluff*.</h2>
                </div>
                <p class="cell-text">Recruiters are tired of copy-pasted AI summaries. Adjectives carry zero weight. Metrics get interviews.</p>
            </div>
            <div class="grid-cell" style="padding: 20px;">
                <div class="reject-box">
                    <div class="reject-label">INSTANT REJECT</div>
                    <div class="cell-text" style="font-size:12px;">"Responsible for managing sales and overall revenue." (❌)</div>
                </div>
                <div class="accept-box">
                    <div class="accept-label">INTERVIEW SECURED</div>
                    <div class="cell-text" style="font-size:12px;">"Managed 8 sales reps to drive 34% YoY revenue growth, generating KES 12M." (✓)</div>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE METHOD</div>
                    <h2 class="cell-headline" style="font-size:32px;">The *XYZ* Formula.</h2>
                    <p class="cell-text">Accomplished [X], as measured by [Y], by doing [Z]. Put numbers before adjectives.</p>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">ACTIONABLE VALUE</div>
                    <p class="cell-text" style="margin-bottom: 20px;">Replace generic duties with business outcomes and raw data.</p>
                </div>
                <a class="cta-btn" href="#">UPGRADE CV TEXT →</a>
            </div>
        """
    },
    {
        "filename": "design_03_practical_ai.jpg",
        "header": "DIGITAL CAPABILITIES // 2026",
        "cells": """
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE SKILLS EVOLUTION</div>
                    <h2 class="cell-headline">The *New* Excel.</h2>
                </div>
                <p class="cell-text">Listing "ChatGPT" as a skill is like listing "Internet" in 2005. It is too basic. Show real workflow automation.</p>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">PRACTICAL SKILLS ONLY</div>
                    <ul class="bullet-list">
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Automating data cleaning with AI</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Writing custom API integrations</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Deploying internal LLM modules</li>
                    </ul>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE VALUE PROPOSITION</div>
                    <h2 class="cell-headline" style="font-size:32px;">*Build* Workflows.</h2>
                    <p class="cell-text">Recruiters hire people who can save them hours of manual work using modern AI scripts.</p>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">ACTIONABLE VALUE</div>
                    <p class="cell-text" style="margin-bottom: 20px;">Learn how to turn theoretical knowledge into practical operations.</p>
                </div>
                <a class="cta-btn" href="#">UPGRADE TECH SKILLS →</a>
            </div>
        """
    },
    {
        "filename": "design_04_six_second_scan.jpg",
        "header": "VISUAL HIERARCHY // 2026",
        "cells": """
            <div class="grid-cell">
                <div>
                    <div class="cell-header">RECRUITER SCAN</div>
                    <h2 class="cell-headline">The *6-Second* Scan.</h2>
                </div>
                <p class="cell-text">Hiring managers scan, they don't read. If your layout is chaotic, it goes to the bin instantly.</p>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">SCAN ANCHORS</div>
                    <ul class="bullet-list">
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Name & Title left-aligned</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Dates right-aligned, bolded</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Metrics bolded inside bullets</li>
                    </ul>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE HIERARCHY RULE</div>
                    <h2 class="cell-headline" style="font-size:32px;">Left *Alignment* Wins.</h2>
                    <p class="cell-text">Center-aligned blocks break the eye's scanning flow. Keep it strict and structured.</p>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">ACTIONABLE VALUE</div>
                    <p class="cell-text" style="margin-bottom: 20px;">Structure your visual flow so achievements jump out first.</p>
                </div>
                <a class="cta-btn" href="#">AUDIT STRUCTURE →</a>
            </div>
        """
    },
    {
        "filename": "design_05_open_to_work.jpg",
        "header": "PROFESSIONAL POSITIONING // 2026",
        "cells": """
            <div class="grid-cell">
                <div>
                    <div class="cell-header">POSITIONING ERROR</div>
                    <h2 class="cell-headline">The *Leverage* Shift.</h2>
                </div>
                <p class="cell-text">The green '#OpenToWork' badge can signal desperation and reduce your leverage in negotiations.</p>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">LEVERAGE ANALYSIS</div>
                    <ul class="bullet-list">
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Green Badge: Open to anything</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Private Settings: Selective professional</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Headline: Solutions provider</li>
                    </ul>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE PRINCIPLE</div>
                    <h2 class="cell-headline" style="font-size:32px;">Be the *Solution*.</h2>
                    <p class="cell-text">Recruiters search for specific capabilities, not general job seekers. Target their bottleneck.</p>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">ACTIONABLE VALUE</div>
                    <p class="cell-text" style="margin-bottom: 20px;">Rewrite your title to display target-oriented competence.</p>
                </div>
                <a class="cta-btn" href="#">OPTIMIZE PROFILE →</a>
            </div>
        """
    },
    {
        "filename": "design_06_ai_literacy.jpg",
        "header": "DIGITAL INTEGRATION // 2026",
        "cells": """
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE MODERN STANDARD</div>
                    <h2 class="cell-headline">The *Utility* Skill.</h2>
                </div>
                <p class="cell-text">Knowing AI is not enough. You must show how you use AI modules for data analysis and speed.</p>
            </div>
            <div class="grid-cell" style="padding: 20px;">
                <div class="reject-box">
                    <div class="reject-label">GENERIC LISTING</div>
                    <div class="cell-text" style="font-size:12px;">"Experienced in ChatGPT for writing." (❌)</div>
                </div>
                <div class="accept-box">
                    <div class="accept-label">UTILITY PROVEN</div>
                    <div class="cell-text" style="font-size:12px;">"Automated database scrubbing with LLMs, reducing manual error by 42%." (✓)</div>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE OBJECTIVE</div>
                    <h2 class="cell-headline" style="font-size:32px;">*Speed* & Code.</h2>
                    <p class="cell-text">Recruiters pay a premium for candidates who multiply their output with automated workflows.</p>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">ACTIONABLE VALUE</div>
                    <p class="cell-text" style="margin-bottom: 20px;">Redefine your tools as business multipliers on your CV.</p>
                </div>
                <a class="cta-btn" href="#">CHECK DIGITAL SKILLS →</a>
            </div>
        """
    },
    {
        "filename": "design_07_multicolumn_hazard.jpg",
        "header": "PARSER BLUEPRINT // 2026",
        "cells": """
            <div class="grid-cell">
                <div>
                    <div class="cell-header">FORMATTING HAZARD</div>
                    <h2 class="cell-headline">The *Scrambled* Text.</h2>
                </div>
                <p class="cell-text">ATS software reads left-to-right. Two-column templates merge columns, creating total gibberish.</p>
            </div>
            <div class="grid-cell" style="padding: 20px;">
                <div class="reject-box">
                    <div class="reject-label">PARSED OUTPUT (TWO COLUMNS)</div>
                    <div class="cell-text" style="font-size:11px;">"SQL Experience 2025 present Analyst at Equity"</div>
                </div>
                <div class="accept-box">
                    <div class="accept-label">PARSED OUTPUT (SINGLE COLUMN)</div>
                    <div class="cell-text" style="font-size:11px;">"Role: Analyst at Equity Bank. Skills: SQL."</div>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE DESIGN LAW</div>
                    <h2 class="cell-headline" style="font-size:32px;">Single *Column* Wins.</h2>
                    <p class="cell-text">Keep your layout linear. Do not force recruitment algorithms to guess your career flow.</p>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">ACTIONABLE VALUE</div>
                    <p class="cell-text" style="margin-bottom: 20px;">Ensure 100% parsing accuracy with a vetted single-column layout.</p>
                </div>
                <a class="cta-btn" href="#">TEST LAYOUT →</a>
            </div>
        """
    },
    {
        "filename": "design_08_quantifying_invisible.jpg",
        "header": "OPERATIONAL METRICS // 2026",
        "cells": """
            <div class="grid-cell">
                <div>
                    <div class="cell-header">NON-SALES ROLES</div>
                    <h2 class="cell-headline">Count *the Work*.</h2>
                </div>
                <p class="cell-text">No sales targets? No problem. Quantify your efficiency, volume, error reduction, and saved time.</p>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">METRIC AXES</div>
                    <ul class="bullet-list">
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Time: Reduced hours from X to Y</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Volume: Handled X records daily</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Accuracy: Achieved X% compliance</li>
                    </ul>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE IMPACT LAW</div>
                    <h2 class="cell-headline" style="font-size:32px;">*Time* Is Money.</h2>
                    <p class="cell-text">Saving an hour of manual workload is the exact financial equivalent of generating new revenue.</p>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">ACTIONABLE VALUE</div>
                    <p class="cell-text" style="margin-bottom: 20px;">Turn administrative tasks into measurable business value indicators.</p>
                </div>
                <a class="cta-btn" href="#">FIND YOUR METRICS →</a>
            </div>
        """
    },
    {
        "filename": "design_09_ai_backlash.jpg",
        "header": "VOCABULARY AUDIT // 2026",
        "cells": """
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE AI SIGNATURE</div>
                    <h2 class="cell-headline">The *ChatGPT* Signature.</h2>
                </div>
                <p class="cell-text">Recruiters instantly recognize generic, overly formal AI verbs. They signal lack of effort.</p>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">WORDS TO DELETE</div>
                    <ul class="bullet-list">
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>"Spearhead" (use Led / Built)</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>"Foster" (use Developed)</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>"Testament" (delete entirely)</li>
                    </ul>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE VOCABULARY LAW</div>
                    <h2 class="cell-headline" style="font-size:32px;">Speak *Like a Human*.</h2>
                    <p class="cell-text">Write your bullet points as if you are explaining your job to a peer in a meeting.</p>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">ACTIONABLE VALUE</div>
                    <p class="cell-text" style="margin-bottom: 20px;">Audit your verb choice and strip out artificial text elements.</p>
                </div>
                <a class="cta-btn" href="#">CLEANSE VERBS →</a>
            </div>
        """
    },
    {
        "filename": "design_10_digital_proof.jpg",
        "header": "DIRECT OUTREACH // 2026",
        "cells": """
            <div class="grid-cell">
                <div>
                    <div class="cell-header">BYPASS THE ATS</div>
                    <h2 class="cell-headline">The *Backdoor* Route.</h2>
                </div>
                <p class="cell-text">Stop sending flat PDFs into digital black holes. Send interactive links that prove capability.</p>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">PROOF ELEMENTS</div>
                    <ul class="bullet-list">
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Live interactive dashboards</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>3-slide business case studies</li>
                        <li class="bullet-item"><span class="bullet-dot">🔴</span>Vetted resume download links</li>
                    </ul>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">THE PORTFOLIO LAW</div>
                    <h2 class="cell-headline" style="font-size:32px;">Show *the Work*.</h2>
                    <p class="cell-text">A resume makes claims. A live, public project is undeniable proof of your technical speed.</p>
                </div>
            </div>
            <div class="grid-cell">
                <div>
                    <div class="cell-header">ACTIONABLE VALUE</div>
                    <p class="cell-text" style="margin-bottom: 20px;">Build a lightweight digital presence to display your active work.</p>
                </div>
                <a class="cta-btn" href="#">BUILD PORTFOLIO →</a>
            </div>
        """
    }
]

print("Launching Playwright to generate 10 high-resolution campaign JPEGs...")
with sync_playwright() as p:
    browser = p.chromium.launch()
    for poster in POSTERS_DATA:
        filename = poster["filename"]
        header = poster["header"]
        cells = poster["cells"]
        
        output_path = os.path.join(OUTPUT_DIR, filename)
        print(f"Generating {filename}...")
        
        # Prepare HTML structure
        html_content = get_html_wrapper(header, cells)
        
        # Open page in browser viewport
        page = browser.new_page(viewport={"width": 1080, "height": 1080})
        page.set_content(html_content)
        
        # Ensure fonts and resources are loaded
        page.wait_for_load_state("networkidle")
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(2000) # Small sleep to guarantee rendering
        
        # Save screenshot as JPEG
        page.screenshot(path=output_path, type="jpeg", quality=95)
        print(f"Saved: {output_path}")
        page.close()
        
    browser.close()

print("All 10 campaign JPEGs successfully generated inside 'Workshop content/VAULT CONTENT'!")
