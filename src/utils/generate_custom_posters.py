import os
import base64
import sys
from playwright.sync_api import sync_playwright

# Ensure output encoding is UTF-8
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DESIGN_DIR = os.path.join(WORKSPACE_DIR, "Workshop content", "masterclass content")
PORTRAIT_DIR = os.path.join(WORKSPACE_DIR, "workshop portraits")

os.makedirs(DESIGN_DIR, exist_ok=True)

# Helper to load and base64-encode images safely
def get_base64_img(filename):
    path = os.path.join(PORTRAIT_DIR, filename)
    if os.path.exists(path):
        with open(path, "rb") as f:
            return f"data:image/jpeg;base64,{base64.b64encode(f.read()).decode('utf-8')}"
    return None

portrait_1 = get_base64_img("1.jpeg") or "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop"
portrait_2 = get_base64_img("2.jpeg") or "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop"

# Mandatory Copy Parameters
MANDATORY_INFO = {
    "title": "FREE LIVE MASTERCLASS",
    "subtitle": "How to Use AI to Land More Interviews",
    "desc": "Build ATS-friendly CVs that recruiters actually respond to.",
    "date": "Saturday, 18 July 2026",
    "time": "2:00 PM EAT",
    "platform": "Live on Google Meet",
    "free_info": "FREE // No payment required. Limited to 100 seats.",
    "cta_url": "https://duncanmakoyo.com/#/workshop",
    "presenter_name": "Duncan Makoyo",
    "presenter_title": "Career Mentor & AI Job Search Strategist",
    "contact": "WhatsApp: 0794 877 125"
}

# ──────────────────────────────────────────────────────────────────────────────
# CONCEPT 1: APPLE-INSPIRED MINIMALISM (Clean Silver, Charcoal, and Emerald Accent)
# ──────────────────────────────────────────────────────────────────────────────

C1_SQUARE_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Concept 1 - Square</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;700&display=swap');
        body {{
            margin: 0; padding: 0; background: #F3F4F6;
            width: 1080px; height: 1080px; overflow: hidden;
            font-family: 'Inter', -apple-system, sans-serif;
            color: #1F2937;
        }}
        .poster-container {{
            width: 1080px; height: 1080px;
            background: #FAFAF9;
            box-sizing: border-box;
            padding: 60px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
        }}
        .accent-bar {{
            height: 6px; width: 120px; background: #10B981; border-radius: 3px; margin-bottom: 20px;
        }}
        .header-tag {{
            font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800;
            color: #10B981; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px;
        }}
        .main-title {{
            font-family: 'Outfit', sans-serif; font-size: 48px; font-weight: 800;
            line-height: 1.15; color: #111827; margin: 0 0 12px 0; letter-spacing: -1px;
        }}
        .main-desc {{
            font-size: 20px; color: #4B5563; line-height: 1.5; margin: 0; max-width: 600px;
        }}
        .content-section {{
            display: flex; gap: 40px; margin: 30px 0; height: 500px;
        }}
        .left-col {{
            flex: 1.2; display: flex; flex-direction: column; justify-content: space-between;
        }}
        .right-col {{
            flex: 0.8; position: relative;
            background: #E5E7EB; border-radius: 24px; overflow: hidden;
            border: 1px solid #D1D5DB; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
        }}
        .portrait-img {{
            width: 100%; height: 100%; object-fit: cover;
        }}
        .portrait-overlay {{
            position: absolute; bottom: 0; left: 0; right: 0;
            background: linear-gradient(to top, rgba(17,24,39,0.85) 0%, rgba(17,24,39,0) 100%);
            padding: 24px; color: #FFFFFF;
        }}
        .presenter-name {{ font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; margin: 0 0 4px 0; }}
        .presenter-title {{ font-size: 14px; color: #D1D5DB; margin: 0; }}
        .list-card {{
            background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px;
            padding: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.02);
        }}
        .card-title {{
            font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700;
            color: #111827; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;
        }}
        .bullet-list {{
            list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
        }}
        .bullet-item {{
            font-size: 14px; color: #4B5563; display: flex; align-items: center; gap: 8px;
        }}
        .bullet-dot {{ width: 6px; height: 6px; background: #10B981; border-radius: 50%; }}
        .schedule-grid {{
            display: flex; gap: 16px; background: #F3F4F6; border-radius: 16px; padding: 18px 24px; border: 1px solid #E5E7EB;
        }}
        .schedule-item {{
            flex: 1; font-size: 14px; color: #374151;
        }}
        .schedule-label {{ font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }}
        .schedule-val {{ font-weight: 600; display: flex; align-items: center; gap: 6px; }}
        .footer-cta {{
            display: flex; align-items: center; justify-content: space-between;
            border-top: 1px solid #E5E7EB; padding-top: 30px;
        }}
        .cta-btn {{
            background: #10B981; color: #FFFFFF; font-family: 'Outfit', sans-serif;
            font-size: 18px; font-weight: 800; text-decoration: none; padding: 16px 36px;
            border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(16,185,129,0.3);
            letter-spacing: 0.5px;
        }}
        .cta-url-box {{
            text-align: right;
        }}
        .cta-url {{
            font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800;
            color: #111827; text-decoration: none; display: block; margin-bottom: 4px;
        }}
        .cta-sub {{ font-size: 12px; color: #6B7280; margin: 0; }}
        .free-badge {{
            position: absolute; top: 60px; right: 60px;
            background: #10B981; color: #FFFFFF; font-family: 'Outfit', sans-serif;
            font-size: 14px; font-weight: 800; padding: 6px 16px; border-radius: 30px;
            letter-spacing: 1px; box-shadow: 0 4px 6px rgba(16,185,129,0.2);
        }}
    </style>
</head>
<body>
    <div class="poster-container">
        <div class="free-badge">FREE SEATS</div>
        
        <div>
            <div class="header-tag">{MANDATORY_INFO["title"]}</div>
            <h1 class="main-title">{MANDATORY_INFO["subtitle"]}</h1>
            <p class="main-desc">{MANDATORY_INFO["desc"]}</p>
        </div>

        <div class="content-section">
            <div class="left-col">
                <div class="list-card">
                    <h3 class="card-title">💡 What You'll Master</h3>
                    <ul class="bullet-list">
                        <li class="bullet-item"><span class="bullet-dot"></span>Build one Master CV</li>
                        <li class="bullet-item"><span class="bullet-dot"></span>Create tailored CVs</li>
                        <li class="bullet-item"><span class="bullet-dot"></span>Use ChatGPT professionally</li>
                        <li class="bullet-item"><span class="bullet-dot"></span>Match job descriptions</li>
                        <li class="bullet-item"><span class="bullet-dot"></span>Generate cover letters</li>
                        <li class="bullet-item"><span class="bullet-dot"></span>Beat ATS filters</li>
                    </ul>
                </div>

                <div class="list-card" style="background: #F0FDF4; border-color: #A7F3D0;">
                    <h3 class="card-title" style="color: #065F46;">🎁 Free Resources Included</h3>
                    <ul class="bullet-list" style="grid-template-columns: 1fr 1fr;">
                        <li class="bullet-item" style="color: #065F46;"><span class="bullet-dot" style="background: #059669;"></span>AI Prompt Library</li>
                        <li class="bullet-item" style="color: #065F46;"><span class="bullet-dot" style="background: #059669;"></span>ATS CV Template</li>
                        <li class="bullet-item" style="color: #065F46;"><span class="bullet-dot" style="background: #059669;"></span>Cover Letter Prompts</li>
                        <li class="bullet-item" style="color: #065F46;"><span class="bullet-dot" style="background: #059669;"></span>Job Matching Framework</li>
                    </ul>
                </div>

                <div class="schedule-grid">
                    <div class="schedule-item">
                        <div class="schedule-label">Date</div>
                        <div class="schedule-val">📅 {MANDATORY_INFO["date"]}</div>
                    </div>
                    <div class="schedule-item" style="border-left: 1px solid #D1D5DB; padding-left: 16px;">
                        <div class="schedule-label">Time</div>
                        <div class="schedule-val">⏰ {MANDATORY_INFO["time"]}</div>
                    </div>
                    <div class="schedule-item" style="border-left: 1px solid #D1D5DB; padding-left: 16px;">
                        <div class="schedule-label">Platform</div>
                        <div class="schedule-val">🎥 Google Meet</div>
                    </div>
                </div>
            </div>
            
            <div class="right-col">
                <img class="portrait-img" src="{portrait_1}" alt="Duncan Makoyo">
                <div class="portrait-overlay">
                    <h4 class="presenter-name">{MANDATORY_INFO["presenter_name"]}</h4>
                    <p class="presenter-title">{MANDATORY_INFO["presenter_title"]}</p>
                </div>
            </div>
        </div>

        <div class="footer-cta">
            <div>
                <a href="{MANDATORY_INFO["cta_url"]}" class="cta-btn">Claim Your FREE Seat →</a>
            </div>
            <div class="cta-url-box">
                <a href="{MANDATORY_INFO["cta_url"]}" class="cta-url">duncanmakoyo.com/#/workshop</a>
                <p class="cta-sub">{MANDATORY_INFO["free_info"]} | {MANDATORY_INFO["contact"]}</p>
            </div>
        </div>
    </div>
</body>
</html>
"""

C1_VERTICAL_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Concept 1 - Vertical</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;700&display=swap');
        body {{
            margin: 0; padding: 0; background: #F3F4F6;
            width: 1080px; height: 1920px; overflow: hidden;
            font-family: 'Inter', -apple-system, sans-serif;
            color: #1F2937;
        }}
        .poster-container {{
            width: 1080px; height: 1920px;
            background: #FAFAF9;
            box-sizing: border-box;
            padding: 80px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
        }}
        .header-tag {{
            font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800;
            color: #10B981; letter-spacing: 6px; text-transform: uppercase; margin-bottom: 12px;
        }}
        .main-title {{
            font-family: 'Outfit', sans-serif; font-size: 64px; font-weight: 800;
            line-height: 1.15; color: #111827; margin: 0 0 16px 0; letter-spacing: -1.5px;
        }}
        .main-desc {{
            font-size: 24px; color: #4B5563; line-height: 1.5; margin: 0 0 40px 0; max-width: 800px;
        }}
        .portrait-card {{
            position: relative; height: 600px; background: #E5E7EB; border-radius: 32px; overflow: hidden;
            border: 1px solid #D1D5DB; box-shadow: 0 20px 40px rgba(0,0,0,0.06); margin-bottom: 40px;
        }}
        .portrait-img {{ width: 100%; height: 100%; object-fit: cover; }}
        .portrait-overlay {{
            position: absolute; bottom: 0; left: 0; right: 0;
            background: linear-gradient(to top, rgba(17,24,39,0.9) 0%, rgba(17,24,39,0) 100%);
            padding: 40px; color: #FFFFFF;
        }}
        .presenter-name {{ font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 800; margin: 0 0 4px 0; }}
        .presenter-title {{ font-size: 18px; color: #D1D5DB; margin: 0; }}
        
        .list-card {{
            background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 20px;
            padding: 32px; box-shadow: 0 10px 20px rgba(0,0,0,0.02); margin-bottom: 30px;
        }}
        .card-title {{
            font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 700;
            color: #111827; margin: 0 0 18px 0; display: flex; align-items: center; gap: 10px;
        }}
        .bullet-list {{
            list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        }}
        .bullet-item {{
            font-size: 18px; color: #4B5563; display: flex; align-items: center; gap: 10px;
        }}
        .bullet-dot {{ width: 8px; height: 8px; background: #10B981; border-radius: 50%; }}
        
        .schedule-grid {{
            display: flex; gap: 20px; background: #F3F4F6; border-radius: 20px; padding: 24px 32px; border: 1px solid #E5E7EB; margin-bottom: 40px;
        }}
        .schedule-item {{ flex: 1; font-size: 18px; color: #374151; }}
        .schedule-label {{ font-size: 13px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }}
        .schedule-val {{ font-weight: 600; display: flex; align-items: center; gap: 8px; }}
        
        .footer-section {{
            border-top: 1px solid #E5E7EB; padding-top: 40px; display: flex; flex-direction: column; align-items: center; text-align: center;
        }}
        .cta-btn {{
            background: #10B981; color: #FFFFFF; font-family: 'Outfit', sans-serif;
            font-size: 24px; font-weight: 800; text-decoration: none; padding: 20px 60px;
            border-radius: 16px; box-shadow: 0 15px 30px rgba(16,185,129,0.3);
            letter-spacing: 0.5px; margin-bottom: 24px; display: inline-block;
        }}
        .cta-url {{
            font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 800;
            color: #111827; text-decoration: none; margin-bottom: 8px; display: block;
        }}
        .cta-sub {{ font-size: 16px; color: #6B7280; margin: 0; }}
        .free-tag {{
            position: absolute; top: 80px; right: 80px;
            background: #10B981; color: #FFFFFF; font-family: 'Outfit', sans-serif;
            font-size: 16px; font-weight: 800; padding: 8px 20px; border-radius: 30px;
            letter-spacing: 1px; box-shadow: 0 4px 6px rgba(16,185,129,0.2);
        }}
    </style>
</head>
<body>
    <div class="poster-container">
        <div class="free-tag">FREE SEATS</div>
        
        <div>
            <div class="header-tag">{MANDATORY_INFO["title"]}</div>
            <h1 class="main-title">{MANDATORY_INFO["subtitle"]}</h1>
            <p class="main-desc">{MANDATORY_INFO["desc"]}</p>
        </div>

        <div class="portrait-card">
            <img class="portrait-img" src="{portrait_1}" alt="Duncan Makoyo">
            <div class="portrait-overlay">
                <h4 class="presenter-name">{MANDATORY_INFO["presenter_name"]}</h4>
                <p class="presenter-title">{MANDATORY_INFO["presenter_title"]}</p>
            </div>
        </div>

        <div>
            <div class="list-card">
                <h3 class="card-title">💡 What You'll Master</h3>
                <ul class="bullet-list">
                    <li class="bullet-item"><span class="bullet-dot"></span>Build one Master CV</li>
                    <li class="bullet-item"><span class="bullet-dot"></span>Create tailored CVs</li>
                    <li class="bullet-item"><span class="bullet-dot"></span>Use ChatGPT</li>
                    <li class="bullet-item"><span class="bullet-dot"></span>Match job descriptions</li>
                    <li class="bullet-item"><span class="bullet-dot"></span>Generate cover letters</li>
                    <li class="bullet-item"><span class="bullet-dot"></span>Beat ATS filters</li>
                </ul>
            </div>

            <div class="list-card" style="background: #F0FDF4; border-color: #A7F3D0;">
                <h3 class="card-title" style="color: #065F46;">🎁 Free Resources Included</h3>
                <ul class="bullet-list">
                    <li class="bullet-item" style="color: #065F46;"><span class="bullet-dot" style="background: #059669;"></span>AI Prompt Library</li>
                    <li class="bullet-item" style="color: #065F46;"><span class="bullet-dot" style="background: #059669;"></span>ATS CV Template</li>
                    <li class="bullet-item" style="color: #065F46;"><span class="bullet-dot" style="background: #059669;"></span>Cover Letter Prompts</li>
                    <li class="bullet-item" style="color: #065F46;"><span class="bullet-dot" style="background: #059669;"></span>Job Matching Framework</li>
                </ul>
            </div>

            <div class="schedule-grid">
                <div class="schedule-item">
                    <div class="schedule-label">Date</div>
                    <div class="schedule-val">📅 {MANDATORY_INFO["date"]}</div>
                </div>
                <div class="schedule-item" style="border-left: 1px solid #D1D5DB; padding-left: 20px;">
                    <div class="schedule-label">Time</div>
                    <div class="schedule-val">⏰ {MANDATORY_INFO["time"]}</div>
                </div>
                <div class="schedule-item" style="border-left: 1px solid #D1D5DB; padding-left: 20px;">
                    <div class="schedule-label">Platform</div>
                    <div class="schedule-val">🎥 Google Meet</div>
                </div>
            </div>
        </div>

        <div class="footer-section">
            <a href="{MANDATORY_INFO["cta_url"]}" class="cta-btn">Claim Your FREE Seat Now</a>
            <a href="{MANDATORY_INFO["cta_url"]}" class="cta-url">duncanmakoyo.com/#/workshop</a>
            <p class="cta-sub">{MANDATORY_INFO["free_info"]} | {MANDATORY_INFO["contact"]}</p>
        </div>
    </div>
</body>
</html>
"""

# ──────────────────────────────────────────────────────────────────────────────
# CONCEPT 2: EDITORIAL MAGAZINE / SWISS FORMALISM (Stark Charcoal, Orange Accent)
# ──────────────────────────────────────────────────────────────────────────────

C2_SQUARE_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Concept 2 - Square</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Space+Mono:wght@400;700&display=swap');
        body {{
            margin: 0; padding: 0; background: #0B0F19;
            width: 1080px; height: 1080px; overflow: hidden;
            font-family: 'Space Mono', monospace;
            color: #F8FAFC;
        }}
        .poster-container {{
            width: 1080px; height: 1080px;
            box-sizing: border-box;
            padding: 60px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
        }}
        .grid-line {{
            position: absolute;
            background: #1E293B;
        }}
        .header-section {{
            display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 2px solid #FF6B00; padding-bottom: 20px;
        }}
        .editorial-tag {{
            background: #FF6B00; color: #0B0F19; font-weight: 700; font-size: 14px;
            padding: 4px 12px; letter-spacing: 2px;
        }}
        .main-title {{
            font-family: 'Playfair Display', Georgia, serif; font-size: 56px; font-weight: 700;
            line-height: 1.1; margin: 30px 0 10px 0; color: #FFFFFF;
        }}
        .main-title em {{ font-style: italic; color: #FF6B00; }}
        .main-desc {{
            font-size: 16px; color: #94A3B8; line-height: 1.6; max-width: 700px; margin: 0;
        }}
        .grid-columns {{
            display: flex; gap: 40px; margin: 30px 0; height: 480px;
        }}
        .left-col {{
            flex: 0.9; display: flex; flex-direction: column; justify-content: space-between;
        }}
        .center-col {{
            flex: 0.9; display: flex; flex-direction: column; justify-content: space-between;
            border-left: 1px solid #1E293B; padding-left: 40px;
        }}
        .right-col {{
            flex: 1.2; position: relative; border-radius: 8px; overflow: hidden;
            border: 2px solid #FF6B00; filter: grayscale(100%) contrast(120%);
        }}
        .portrait-img {{ width: 100%; height: 100%; object-fit: cover; }}
        .col-header {{
            font-size: 13px; font-weight: 700; color: #FF6B00; text-transform: uppercase;
            letter-spacing: 2px; margin-bottom: 15px; border-bottom: 1px solid #1E293B; padding-bottom: 8px;
        }}
        .info-list {{
            list-style: none; padding: 0; margin: 0;
        }}
        .info-item {{
            font-size: 14px; color: #E2E8F0; margin-bottom: 12px; display: flex; gap: 10px;
        }}
        .info-num {{ color: #FF6B00; font-weight: 700; }}
        .schedule-card {{
            background: #111827; border: 1px solid #FF6B00; padding: 20px;
        }}
        .schedule-line {{
            font-size: 14px; color: #E2E8F0; margin-bottom: 8px; display: flex; justify-content: space-between;
        }}
        .schedule-line:last-child {{ margin-bottom: 0; }}
        .footer-cta {{
            border-top: 1px solid #1E293B; padding-top: 30px;
            display: flex; justify-content: space-between; align-items: flex-end;
        }}
        .cta-left {{
            display: flex; flex-direction: column; gap: 8px;
        }}
        .cta-btn {{
            background: transparent; color: #FF6B00; border: 2px solid #FF6B00;
            font-family: 'Space Mono', monospace; font-size: 18px; font-weight: 700;
            text-decoration: none; padding: 12px 30px; text-transform: uppercase;
            transition: all 0.2s; display: inline-block; text-align: center;
        }}
        .cta-url {{
            font-size: 24px; font-weight: 700; color: #FFFFFF; text-decoration: none;
        }}
        .cta-url span {{ color: #FF6B00; }}
        .cta-sub {{ font-size: 12px; color: #64748B; margin: 0; }}
    </style>
</head>
<body>
    <div class="poster-container">
        <!-- Vertical grid lines -->
        <div class="grid-line" style="width: 1px; top: 0; bottom: 0; left: 80px;"></div>
        <div class="grid-line" style="width: 1px; top: 0; bottom: 0; right: 80px;"></div>

        <div class="header-section">
            <div>
                <span class="editorial-tag">LIVE SEMINAR</span>
            </div>
            <div style="font-size: 13px; color: #94A3B8; text-transform: uppercase; letter-spacing: 2px;">
                CAP // 100 SEATS ONLY
            </div>
        </div>

        <div>
            <h1 class="main-title">AI for Job Search: <em>Masterclass</em></h1>
            <p class="main-desc">{MANDATORY_INFO["desc"]}</p>
        </div>

        <div class="grid-columns">
            <div class="left-col">
                <div>
                    <div class="col-header">// YOU WILL LEARN</div>
                    <ul class="info-list">
                        <li class="info-item"><span class="info-num">01/</span> Build one Master CV</li>
                        <li class="info-item"><span class="info-num">02/</span> Create tailored CVs</li>
                        <li class="info-item"><span class="info-num">03/</span> Use ChatGPT professionally</li>
                        <li class="info-item"><span class="info-num">04/</span> Match job descriptions</li>
                    </ul>
                </div>
                <div class="schedule-card">
                    <div class="schedule-line"><span>DATE:</span> <strong>18.07.2026</strong></div>
                    <div class="schedule-line"><span>TIME:</span> <strong>14:00 EAT</strong></div>
                    <div class="schedule-line"><span>PLAT:</span> <strong style="color: #FF6B00;">GOOGLE MEET</strong></div>
                </div>
            </div>

            <div class="center-col">
                <div>
                    <div class="col-header">// RESOURCES</div>
                    <ul class="info-list">
                        <li class="info-item"><span class="info-num">[A]</span> AI Prompt Library</li>
                        <li class="info-item"><span class="info-num">[B]</span> ATS CV Template</li>
                        <li class="info-item"><span class="info-num">[C]</span> Cover Letter Prompts</li>
                        <li class="info-item"><span class="info-num">[D]</span> Job Framework</li>
                    </ul>
                </div>
                <div>
                    <div class="col-header" style="margin-bottom: 8px;">// SPEAKER</div>
                    <div style="font-size: 15px; font-weight: 700; color: #FFFFFF;">{MANDATORY_INFO["presenter_name"]}</div>
                    <div style="font-size: 11px; color: #94A3B8; line-height: 1.3; margin-top: 4px;">{MANDATORY_INFO["presenter_title"]}</div>
                </div>
            </div>

            <div class="right-col">
                <img class="portrait-img" src="{portrait_2}" alt="Duncan Makoyo">
            </div>
        </div>

        <div class="footer-cta">
            <div class="cta-left">
                <a href="{MANDATORY_INFO["cta_url"]}" class="cta-url">duncanmakoyo.com/<span>#</span>/workshop</a>
                <p class="cta-sub">FREE REGISTRATION | {MANDATORY_INFO["contact"]}</p>
            </div>
            <div>
                <a href="{MANDATORY_INFO["cta_url"]}" class="cta-btn">Claim Free Seat</a>
            </div>
        </div>
    </div>
</body>
</html>
"""

C2_VERTICAL_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Concept 2 - Vertical</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Space+Mono:wght@400;700&display=swap');
        body {{
            margin: 0; padding: 0; background: #0B0F19;
            width: 1080px; height: 1920px; overflow: hidden;
            font-family: 'Space Mono', monospace;
            color: #F8FAFC;
        }}
        .poster-container {{
            width: 1080px; height: 1920px;
            box-sizing: border-box;
            padding: 80px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
        }}
        .header-section {{
            display: flex; justify-content: space-between; align-items: flex-start;
            border-bottom: 2px solid #FF6B00; padding-bottom: 24px;
        }}
        .editorial-tag {{
            background: #FF6B00; color: #0B0F19; font-weight: 700; font-size: 16px;
            padding: 6px 16px; letter-spacing: 2px;
        }}
        .main-title {{
            font-family: 'Playfair Display', Georgia, serif; font-size: 80px; font-weight: 700;
            line-height: 1.1; margin: 40px 0 20px 0; color: #FFFFFF;
        }}
        .main-title em {{ font-style: italic; color: #FF6B00; }}
        .main-desc {{
            font-size: 20px; color: #94A3B8; line-height: 1.6; max-width: 850px; margin-bottom: 40px;
        }}
        .portrait-card {{
            position: relative; height: 650px; background: #1E293B; border-radius: 8px; overflow: hidden;
            border: 2px solid #FF6B00; filter: grayscale(100%) contrast(120%); margin-bottom: 50px;
        }}
        .portrait-img {{ width: 100%; height: 100%; object-fit: cover; }}
        
        .grid-columns {{
            display: flex; gap: 40px; margin-bottom: 50px;
        }}
        .left-col {{
            flex: 1; display: flex; flex-direction: column; gap: 30px;
        }}
        .right-col {{
            flex: 1; display: flex; flex-direction: column; gap: 30px;
            border-left: 1px solid #1E293B; padding-left: 40px;
        }}
        .col-header {{
            font-size: 14px; font-weight: 700; color: #FF6B00; text-transform: uppercase;
            letter-spacing: 2px; margin-bottom: 18px; border-bottom: 1px solid #1E293B; padding-bottom: 8px;
        }}
        .info-list {{
            list-style: none; padding: 0; margin: 0;
        }}
        .info-item {{
            font-size: 16px; color: #E2E8F0; margin-bottom: 14px; display: flex; gap: 12px;
        }}
        .info-num {{ color: #FF6B00; font-weight: 700; }}
        
        .schedule-card {{
            background: #111827; border: 1px solid #FF6B00; padding: 24px; border-radius: 4px;
        }}
        .schedule-line {{
            font-size: 16px; color: #E2E8F0; margin-bottom: 10px; display: flex; justify-content: space-between;
        }}
        .schedule-line:last-child {{ margin-bottom: 0; }}
        
        .footer-cta {{
            border-top: 1px solid #1E293B; padding-top: 40px;
            display: flex; flex-direction: column; align-items: center; gap: 24px; text-align: center;
        }}
        .cta-btn {{
            background: transparent; color: #FF6B00; border: 2px solid #FF6B00;
            font-family: 'Space Mono', monospace; font-size: 22px; font-weight: 700;
            text-decoration: none; padding: 18px 48px; text-transform: uppercase;
            letter-spacing: 1px; display: inline-block;
        }}
        .cta-url {{
            font-size: 36px; font-weight: 700; color: #FFFFFF; text-decoration: none;
        }}
        .cta-url span {{ color: #FF6B00; }}
        .cta-sub {{ font-size: 14px; color: #64748B; margin: 0; }}
    </style>
</head>
<body>
    <div class="poster-container">
        <div>
            <div class="header-section">
                <div>
                    <span class="editorial-tag">LIVE SEMINAR</span>
                </div>
                <div style="font-size: 15px; color: #94A3B8; text-transform: uppercase; letter-spacing: 2px;">
                    CAP // 100 SEATS
                </div>
            </div>

            <h1 class="main-title">AI for Job Search: <em>Masterclass</em></h1>
            <p class="main-desc">{MANDATORY_INFO["desc"]}</p>
        </div>

        <div class="portrait-card">
            <img class="portrait-img" src="{portrait_2}" alt="Duncan Makoyo">
        </div>

        <div class="grid-columns">
            <div class="left-col">
                <div>
                    <div class="col-header">// YOU WILL LEARN</div>
                    <ul class="info-list">
                        <li class="info-item"><span class="info-num">01/</span> Build one Master CV</li>
                        <li class="info-item"><span class="info-num">02/</span> Create tailored CVs</li>
                        <li class="info-item"><span class="info-num">03/</span> Use ChatGPT professionally</li>
                        <li class="info-item"><span class="info-num">04/</span> Match job descriptions</li>
                        <li class="info-item"><span class="info-num">05/</span> Beat ATS filters</li>
                    </ul>
                </div>
                <div class="schedule-card">
                    <div class="schedule-line"><span>DATE:</span> <strong>18.07.2026</strong></div>
                    <div class="schedule-line"><span>TIME:</span> <strong>14:00 EAT</strong></div>
                    <div class="schedule-line"><span>PLAT:</span> <strong style="color: #FF6B00;">GOOGLE MEET</strong></div>
                </div>
            </div>

            <div class="right-col">
                <div>
                    <div class="col-header">// FREE RESOURCES</div>
                    <ul class="info-list">
                        <li class="info-item"><span class="info-num">[A]</span> AI Prompt Library</li>
                        <li class="info-item"><span class="info-num">[B]</span> ATS CV Template</li>
                        <li class="info-item"><span class="info-num">[C]</span> Cover Letter Prompts</li>
                        <li class="info-item"><span class="info-num">[D]</span> Job Framework</li>
                    </ul>
                </div>
                <div>
                    <div class="col-header" style="margin-bottom: 12px;">// PRESENTED BY</div>
                    <div style="font-size: 20px; font-weight: 700; color: #FFFFFF;">{MANDATORY_INFO["presenter_name"]}</div>
                    <div style="font-size: 13px; color: #94A3B8; line-height: 1.4; margin-top: 6px;">{MANDATORY_INFO["presenter_title"]}</div>
                </div>
            </div>
        </div>

        <div class="footer-cta">
            <a href="{MANDATORY_INFO["cta_url"]}" class="cta-btn">Claim Free Seat Now</a>
            <a href="{MANDATORY_INFO["cta_url"]}" class="cta-url">duncanmakoyo.com/<span>#</span>/workshop</a>
            <p class="cta-sub">FREE REGISTRATION | {MANDATORY_INFO["contact"]}</p>
        </div>
    </div>
</body>
</html>
"""

# ──────────────────────────────────────────────────────────────────────────────
# CONCEPT 3: MODERN BENTO SaaS LAUNCH (Charcoal, Deep Indigo, and Cyan Accent)
# ──────────────────────────────────────────────────────────────────────────────

C3_SQUARE_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Concept 3 - Square</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        body {{
            margin: 0; padding: 0; background: #030712;
            width: 1080px; height: 1080px; overflow: hidden;
            font-family: 'Inter', sans-serif;
            color: #E5E7EB;
        }}
        .poster-container {{
            width: 1080px; height: 1080px;
            box-sizing: border-box;
            padding: 60px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            background: radial-gradient(circle at 50% 0%, #0F172A 0%, #030712 70%);
        }}
        .bento-grid {{
            display: grid;
            grid-template-columns: 1.2fr 0.8fr;
            grid-template-rows: auto auto auto;
            gap: 24px;
            margin: 30px 0;
            height: 600px;
        }}
        .bento-card {{
            background: rgba(15, 23, 42, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
            padding: 24px;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
            position: relative;
            overflow: hidden;
        }}
        .header-tag {{
            font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800;
            color: #06B6D4; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px;
        }}
        .main-title {{
            font-family: 'Outfit', sans-serif; font-size: 52px; font-weight: 800;
            line-height: 1.15; color: #FFFFFF; margin: 0 0 12px 0; letter-spacing: -1px;
        }}
        .main-desc {{
            font-size: 18px; color: #9CA3AF; line-height: 1.5; margin: 0; max-width: 750px;
        }}
        .card-header {{
            font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 700;
            color: #FFFFFF; margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;
        }}
        .bullet-list {{
            list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr; gap: 10px;
        }}
        .bullet-item {{
            font-size: 14px; color: #9CA3AF; display: flex; align-items: center; gap: 10px;
        }}
        .bullet-check {{ color: #06B6D4; font-weight: 800; }}
        
        .mock-ui {{
            background: #030712; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px;
            padding: 16px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;
        }}
        .mock-ui-header {{
            display: flex; gap: 6px; margin-bottom: 12px;
        }}
        .mock-dot {{ width: 8px; height: 8px; border-radius: 50%; }}
        .mock-bar {{ height: 10px; background: rgba(255, 255, 255, 0.08); border-radius: 5px; }}
        
        .schedule-line {{
            display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 10px;
        }}
        .schedule-line:last-child {{ border: none; margin-bottom: 0; padding-bottom: 0; }}
        .schedule-label {{ color: #9CA3AF; }}
        .schedule-val {{ color: #FFFFFF; font-weight: 600; }}
        
        .footer-cta {{
            display: flex; justify-content: space-between; align-items: center;
            border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 30px;
        }}
        .cta-btn {{
            background: #06B6D4; color: #030712; font-family: 'Outfit', sans-serif;
            font-size: 18px; font-weight: 800; text-decoration: none; padding: 16px 36px;
            border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(6,182,212,0.3);
            letter-spacing: 0.5px;
        }}
        .cta-url-box {{ text-align: right; }}
        .cta-url {{
            font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800;
            color: #FFFFFF; text-decoration: none; display: block; margin-bottom: 4px;
        }}
        .cta-sub {{ font-size: 12px; color: #9CA3AF; margin: 0; }}
        
        .presenter-card {{
            display: flex; align-items: center; gap: 12px;
        }}
        .presenter-avatar {{
            width: 48px; height: 48px; border-radius: 50%; border: 2px solid #06B6D4; object-fit: cover;
        }}
        .presenter-info {{ font-size: 12px; }}
    </style>
</head>
<body>
    <div class="poster-container">
        <div>
            <div class="header-tag">{MANDATORY_INFO["title"]}</div>
            <h1 class="main-title">{MANDATORY_INFO["subtitle"]}</h1>
            <p class="main-desc">{MANDATORY_INFO["desc"]}</p>
        </div>

        <div class="bento-grid">
            <div class="bento-card" style="grid-row: span 2;">
                <div class="mock-ui">
                    <div>
                        <div class="mock-ui-header">
                            <span class="mock-dot" style="background: #EF4444;"></span>
                            <span class="mock-dot" style="background: #F59E0B;"></span>
                            <span class="mock-dot" style="background: #10B981;"></span>
                        </div>
                        <div class="mock-bar" style="width: 60%; margin-bottom: 12px;"></div>
                        <div class="mock-bar" style="width: 85%; margin-bottom: 8px;"></div>
                        <div class="mock-bar" style="width: 40%; margin-bottom: 24px;"></div>
                    </div>
                    <div style="background: rgba(6, 182, 212, 0.1); border: 1px dashed #06B6D4; border-radius: 8px; padding: 12px; text-align: center;">
                        <span style="font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #06B6D4; display: block;">ATS PARSE CONFIRMED</span>
                        <span style="font-size: 28px; font-weight: 800; color: #FFFFFF; font-family: 'Outfit', sans-serif;">98% MATCH SCORE</span>
                    </div>
                    <div class="presenter-card" style="margin-top: 16px;">
                        <img class="presenter-avatar" src="{portrait_1}" alt="Duncan Makoyo">
                        <div class="presenter-info">
                            <div style="font-weight: 700; color: #FFFFFF;">{MANDATORY_INFO["presenter_name"]}</div>
                            <div style="color: #9CA3AF;">{MANDATORY_INFO["presenter_title"]}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bento-card">
                <div class="card-header">📊 You'll Learn</div>
                <ul class="bullet-list">
                    <li class="bullet-item"><span class="bullet-check">✓</span>Build one Master CV</li>
                    <li class="bullet-item"><span class="bullet-check">✓</span>Create tailored CVs</li>
                    <li class="bullet-item"><span class="bullet-check">✓</span>Use ChatGPT professionally</li>
                    <li class="bullet-item"><span class="bullet-check">✓</span>Match job descriptions</li>
                </ul>
            </div>

            <div class="bento-card">
                <div class="card-header">⏰ Event Details</div>
                <div class="schedule-line">
                    <span class="schedule-label">Date</span>
                    <span class="schedule-val">Sat, 18 July 2026</span>
                </div>
                <div class="schedule-line">
                    <span class="schedule-label">Time</span>
                    <span class="schedule-val">2:00 PM EAT</span>
                </div>
                <div class="schedule-line">
                    <span class="schedule-label">Platform</span>
                    <span class="schedule-val" style="color: #06B6D4;">Google Meet</span>
                </div>
            </div>
        </div>

        <div class="footer-cta">
            <div>
                <a href="{MANDATORY_INFO["cta_url"]}" class="cta-btn">Claim Your Seat Now</a>
            </div>
            <div class="cta-url-box">
                <a href="{MANDATORY_INFO["cta_url"]}" class="cta-url">duncanmakoyo.com/#/workshop</a>
                <p class="cta-sub">{MANDATORY_INFO["free_info"]} | {MANDATORY_INFO["contact"]}</p>
            </div>
        </div>
    </div>
</body>
</html>
"""

C3_VERTICAL_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Concept 3 - Vertical</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        body {{
            margin: 0; padding: 0; background: #030712;
            width: 1080px; height: 1920px; overflow: hidden;
            font-family: 'Inter', sans-serif;
            color: #E5E7EB;
        }}
        .poster-container {{
            width: 1080px; height: 1920px;
            box-sizing: border-box;
            padding: 80px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            background: radial-gradient(circle at 50% 0%, #0F172A 0%, #030712 60%);
        }}
        .header-tag {{
            font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800;
            color: #06B6D4; letter-spacing: 6px; text-transform: uppercase; margin-bottom: 12px;
        }}
        .main-title {{
            font-family: 'Outfit', sans-serif; font-size: 64px; font-weight: 800;
            line-height: 1.15; color: #FFFFFF; margin: 0 0 16px 0; letter-spacing: -1.5px;
        }}
        .main-desc {{
            font-size: 24px; color: #9CA3AF; line-height: 1.5; margin: 0 0 40px 0; max-width: 850px;
        }}
        
        .bento-card {{
            background: rgba(15, 23, 42, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 36px;
            backdrop-filter: blur(10px);
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            margin-bottom: 30px;
            position: relative;
            overflow: hidden;
        }}
        .card-header {{
            font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 700;
            color: #FFFFFF; margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px;
        }}
        .bullet-list {{
            list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
        }}
        .bullet-item {{
            font-size: 18px; color: #9CA3AF; display: flex; align-items: center; gap: 12px;
        }}
        .bullet-check {{ color: #06B6D4; font-weight: 800; }}
        
        .mock-ui {{
            background: #030712; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px;
            padding: 24px; display: flex; align-items: center; justify-content: space-between; gap: 20px;
        }}
        .score-pill {{
            background: rgba(6, 182, 212, 0.1); border: 1px dashed #06B6D4; border-radius: 12px;
            padding: 16px 24px; text-align: center;
        }}
        .presenter-card {{
            display: flex; align-items: center; gap: 16px;
        }}
        .presenter-avatar {{
            width: 64px; height: 64px; border-radius: 50%; border: 2px solid #06B6D4; object-fit: cover;
        }}
        
        .schedule-grid {{
            display: flex; gap: 20px;
        }}
        .schedule-item {{
            flex: 1; background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px; padding: 24px; text-align: center;
        }}
        .schedule-label {{ font-size: 14px; color: #9CA3AF; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }}
        .schedule-val {{ font-size: 20px; font-weight: 700; color: #FFFFFF; }}
        
        .footer-cta {{
            border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 40px;
            display: flex; flex-direction: column; align-items: center; gap: 24px; text-align: center;
        }}
        .cta-btn {{
            background: #06B6D4; color: #030712; font-family: 'Outfit', sans-serif;
            font-size: 24px; font-weight: 800; text-decoration: none; padding: 20px 60px;
            border-radius: 16px; box-shadow: 0 15px 30px rgba(6,182,212,0.3);
            letter-spacing: 0.5px; display: inline-block;
        }}
        .cta-url {{
            font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 800;
            color: #FFFFFF; text-decoration: none;
        }}
        .cta-sub {{ font-size: 16px; color: #9CA3AF; margin: 0; }}
    </style>
</head>
<body>
    <div class="poster-container">
        <div>
            <div class="header-tag">{MANDATORY_INFO["title"]}</div>
            <h1 class="main-title">{MANDATORY_INFO["subtitle"]}</h1>
            <p class="main-desc">{MANDATORY_INFO["desc"]}</p>
        </div>

        <div>
            <div class="bento-card">
                <div class="mock-ui">
                    <div class="presenter-card">
                        <img class="presenter-avatar" src="{portrait_1}" alt="Duncan Makoyo">
                        <div>
                            <div style="font-size: 22px; font-weight: 700; color: #FFFFFF; font-family: 'Outfit', sans-serif;">{MANDATORY_INFO["presenter_name"]}</div>
                            <div style="font-size: 14px; color: #9CA3AF; margin-top: 2px;">{MANDATORY_INFO["presenter_title"]}</div>
                        </div>
                    </div>
                    <div class="score-pill">
                        <span style="font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 700; color: #06B6D4; display: block; margin-bottom: 2px;">ATS PARSED</span>
                        <span style="font-size: 24px; font-weight: 800; color: #FFFFFF; font-family: 'Outfit', sans-serif;">98% MATCH</span>
                    </div>
                </div>
            </div>

            <div class="bento-card">
                <div class="card-header">📊 You'll Learn</div>
                <ul class="bullet-list">
                    <li class="bullet-item"><span class="bullet-check">✓</span>Build Master CV</li>
                    <li class="bullet-item"><span class="bullet-check">✓</span>Create tailored CVs</li>
                    <li class="bullet-item"><span class="bullet-check">✓</span>Use ChatGPT</li>
                    <li class="bullet-item"><span class="bullet-check">✓</span>Match job descriptions</li>
                    <li class="bullet-item"><span class="bullet-check">✓</span>Generate cover letters</li>
                    <li class="bullet-item"><span class="bullet-check">✓</span>Beat ATS filters</li>
                </ul>
            </div>

            <div class="bento-card" style="background: rgba(6, 182, 212, 0.05); border-color: rgba(6, 182, 212, 0.2);">
                <div class="card-header" style="color: #06B6D4;">🎁 Free Resources Included</div>
                <ul class="bullet-list">
                    <li class="bullet-item" style="color: #E5E7EB;"><span class="bullet-check" style="color: #06B6D4;">✓</span>AI Prompt Library</li>
                    <li class="bullet-item" style="color: #E5E7EB;"><span class="bullet-check" style="color: #06B6D4;">✓</span>ATS CV Template</li>
                    <li class="bullet-item" style="color: #E5E7EB;"><span class="bullet-check" style="color: #06B6D4;">✓</span>Cover Letter Prompts</li>
                    <li class="bullet-item" style="color: #E5E7EB;"><span class="bullet-check" style="color: #06B6D4;">✓</span>Job Matching Framework</li>
                </ul>
            </div>

            <div class="schedule-grid">
                <div class="schedule-item">
                    <div class="schedule-label">Date</div>
                    <div class="schedule-val">{MANDATORY_INFO["date"]}</div>
                </div>
                <div class="schedule-item">
                    <div class="schedule-label">Time</div>
                    <div class="schedule-val">{MANDATORY_INFO["time"]}</div>
                </div>
                <div class="schedule-item">
                    <div class="schedule-label">Platform</div>
                    <div class="schedule-val" style="color: #06B6D4;">Google Meet</div>
                </div>
            </div>
        </div>

        <div class="footer-cta">
            <a href="{MANDATORY_INFO["cta_url"]}" class="cta-btn">Claim Your Seat Now</a>
            <a href="{MANDATORY_INFO["cta_url"]}" class="cta-url">duncanmakoyo.com/#/workshop</a>
            <p class="cta-sub">{MANDATORY_INFO["free_info"]} | {MANDATORY_INFO["contact"]}</p>
        </div>
    </div>
</body>
</html>
"""

# Store definitions of all posters
POSTERS = [
    {
        "name": "c1_apple_minimalism_1x1.png",
        "html": C1_SQUARE_HTML,
        "width": 1080,
        "height": 1080
    },
    {
        "name": "c1_apple_minimalism_9x16.png",
        "html": C1_VERTICAL_HTML,
        "width": 1080,
        "height": 1920
    },
    {
        "name": "c2_swiss_formalism_1x1.png",
        "html": C2_SQUARE_HTML,
        "width": 1080,
        "height": 1080
    },
    {
        "name": "c2_swiss_formalism_9x16.png",
        "html": C2_VERTICAL_HTML,
        "width": 1080,
        "height": 1920
    },
    {
        "name": "c3_bento_saas_1x1.png",
        "html": C3_SQUARE_HTML,
        "width": 1080,
        "height": 1080
    },
    {
        "name": "c3_bento_saas_9x16.png",
        "html": C3_VERTICAL_HTML,
        "width": 1080,
        "height": 1920
    }
]

print("Launching Playwright to render 6 high-resolution custom posters...")
with sync_playwright() as p:
    browser = p.chromium.launch()
    for poster in POSTERS:
        name = poster["name"]
        width = poster["width"]
        height = poster["height"]
        html_content = poster["html"]
        
        print(f"Rendering {name} ({width}x{height})...")
        page = browser.new_page(viewport={"width": width, "height": height})
        
        # Inject content directly
        page.set_content(html_content)
        
        # Wait for all network resources and fonts to load
        page.wait_for_load_state("networkidle")
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(3000) # Safety buffer to ensure correct layout rendering
        
        # Take screenshot of viewport
        output_path = os.path.join(DESIGN_DIR, name)
        page.screenshot(path=output_path, type="png")
        print(f"Successfully saved to: Workshop content/masterclass content/{name}")
        page.close()
        
    browser.close()

print("All 6 high-resolution posters successfully generated inside the masterclass content folder!")
