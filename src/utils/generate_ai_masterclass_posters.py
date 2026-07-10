import os
import base64
import sys
from playwright.sync_api import sync_playwright
from verify_poster_standards import run_poster_audits

try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass



# Define paths
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IMAGE_PATH = os.path.join(WORKSPACE_DIR, "workshop portraits", "1.jpeg")
OUTPUT_DIR = os.path.join(WORKSPACE_DIR, "Workshop content", "masterclass content")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load and encode the image
if not os.path.exists(IMAGE_PATH):
    raise FileNotFoundError(f"Source portrait image not found at {IMAGE_PATH}")

with open(IMAGE_PATH, "rb") as img_file:
    b64_image = base64.b64encode(img_file.read()).decode("utf-8")

# Common attributes
TARGET_LINK = "https://duncanmakoyo.com/#/workshop"
IMAGE_DATA_URI = f"data:image/jpeg;base64,{b64_image}"

# Poster 1: Cyber Brutalism (Neon Orange & Dark Slate)
POSTER_1_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Masterclass - Cyber Brutalism Poster</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Mono:wght@500&display=swap');
        body {{
            margin: 0;
            padding: 0;
            background: #08080C;
            width: 1080px;
            height: 1350px;
            overflow: hidden;
        }}
        .poster-container {{
            width: 1080px;
            height: 1350px;
            position: relative;
            background: #08080C;
            box-sizing: border-box;
        }}
        svg {{
            width: 100%;
            height: 100%;
            display: block;
        }}
    </style>
</head>
<body>
    <div class="poster-container">
        <svg viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect width="1080" height="1350" fill="#08080C"/>
            
            <!-- SVG Border (More reliable than CSS border to prevent clipping) -->
            <rect x="4" y="4" width="1072" height="1342" stroke="#FF5A00" stroke-width="8" fill="none"/>
            
            <!-- Grid Lines -->
            <line x1="80" y1="0" x2="80" y2="1350" stroke="#1F1F2E" stroke-width="2"/>
            <line x1="1000" y1="0" x2="1000" y2="1350" stroke="#1F1F2E" stroke-width="2"/>
            <line x1="0" y1="80" x2="1080" y2="80" stroke="#1F1F2E" stroke-width="2"/>
            <line x1="0" y1="1270" x2="1080" y2="1270" stroke="#1F1F2E" stroke-width="2"/>

            <!-- Corner Accents -->
            <rect x="80" y="80" width="40" height="40" fill="#FF5A00"/>
            <rect x="960" y="80" width="40" height="40" fill="#FF5A00"/>
            <rect x="80" y="1230" width="40" height="40" fill="#FF5A00"/>
            <rect x="960" y="1230" width="40" height="40" fill="#FF5A00"/>

            <!-- Header Badge -->
            <text x="140" y="145" fill="#FF5A00" font-family="'DM Mono'" font-size="20" letter-spacing="4">SYSTEM // ARCHITECTURE</text>
            <text x="940" y="145" fill="#94A3B8" font-family="'DM Mono'" font-size="20" text-anchor="end">BATCH // 2026</text>

            <!-- Main Heading (Syne font - Scaled to prevent right margin bleed) -->
            <g font-family="'Syne', 'Arial Black', sans-serif" font-weight="800" font-size="48" fill="#FFFFFF">
                <text x="140" y="270">CODE IS A</text>
                <text x="140" y="350" fill="#FF5A00">COMMODITY.</text>
                <text x="140" y="440">SYSTEM DESIGN</text>
                <text x="140" y="520">IS VALUE.</text>
            </g>

            <!-- Portrait Frame -->
            <g transform="translate(560, 600)">
                <!-- Orange shadow card -->
                <rect x="20" y="20" width="420" height="480" fill="#FF5A00"/>
                <!-- Main Border card -->
                <rect width="420" height="480" fill="#13131F" stroke="#FFFFFF" stroke-width="4"/>
                <!-- Clipped Image (Resized to match frame exactly to prevent DOM overlap) -->
                <clipPath id="frame1">
                    <rect x="4" y="4" width="412" height="472"/>
                </clipPath>
                <image href="{IMAGE_DATA_URI}" x="4" y="4" width="412" height="472" preserveAspectRatio="xMidYMid slice" clip-path="url(#frame1)"/>
            </g>

            <!-- Supporting Value Prop (Optimized to prevent overlap) -->
            <g font-family="'DM Mono'" font-size="18" fill="#94A3B8">
                <text x="140" y="700">// THE MASTERCLASS FOCUS</text>
                <text x="140" y="750" fill="#FFFFFF" font-weight="bold">Stop building micro-features.</text>
                <text x="140" y="790">Architect enterprise-scale systems.</text>
                <text x="140" y="830">Master proxy caching, orchestration,</text>
                <text x="140" y="870">and multi-agent deployments.</text>
            </g>

            <!-- Left tech block indicators -->
            <rect x="140" y="960" width="20" height="20" fill="#FF5A00"/>
            <text x="180" y="976" fill="#FFFFFF" font-family="'DM Mono'" font-size="18">01 // PRODUCTION GRADE</text>
            <rect x="140" y="1000" width="20" height="20" fill="#FF5A00"/>
            <text x="180" y="1016" fill="#FFFFFF" font-family="'DM Mono'" font-size="18">02 // SCALE SCENARIOS</text>

            <!-- CTA Section (Repositioned down to avoid overlap with image shadow) -->
            <g transform="translate(140, 1120)">
                <!-- CTA Button -->
                <rect width="400" height="80" fill="#FF5A00" stroke="#FF5A00" stroke-width="2"/>
                <text x="200" y="48" fill="#08080C" font-family="'Syne', 'Arial Black', sans-serif" font-weight="800" font-size="26" text-anchor="middle" letter-spacing="2">SECURE YOUR SEAT →</text>
            </g>

            <!-- Footer (High contrast) -->
            <text x="140" y="1235" fill="#FF5A00" font-family="'DM Mono'" font-size="18" font-weight="bold">HTTPS://DUNCANMAKOYO.COM/WORKSHOP</text>
            <text x="940" y="1235" fill="#FFFFFF" font-family="'DM Mono'" font-size="18" font-weight="bold" text-anchor="end">[CLICK TO ENROLL]</text>
        </svg>
    </div>
</body>
</html>
"""

# Poster 2: Glassmorphic Future (Teal & Purple Soft Gradient)
POSTER_2_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Masterclass - Glassmorphic Future Poster</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        body {{
            margin: 0;
            padding: 0;
            background: #05050A;
            width: 1080px;
            height: 1350px;
            overflow: hidden;
            font-family: 'Outfit', sans-serif;
        }}
        .poster-container {{
            width: 1080px;
            height: 1350px;
            position: relative;
            background: #05050A;
        }}
        svg {{
            width: 100%;
            height: 100%;
            display: block;
        }}
    </style>
</head>
<body>
    <div class="poster-container">
        <svg viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <!-- Glowing Gradients -->
                <radialGradient id="glow1" cx="20%" cy="20%" r="50%">
                    <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="#05050A" stop-opacity="0"/>
                </radialGradient>
                <radialGradient id="glow2" cx="80%" cy="70%" r="50%">
                    <stop offset="0%" stop-color="#06B6D4" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#05050A" stop-opacity="0"/>
                </radialGradient>
                <radialGradient id="glow3" cx="50%" cy="95%" r="40%">
                    <stop offset="0%" stop-color="#EC4899" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#05050A" stop-opacity="0"/>
                </radialGradient>
                
                <!-- Clip Paths -->
                <clipPath id="avatar-clip">
                    <rect width="360" height="450" rx="40"/>
                </clipPath>
                
                <!-- Gradients for Text & Accents -->
                <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FFFFFF"/>
                    <stop offset="60%" stop-color="#E2E8F0"/>
                    <stop offset="100%" stop-color="#06B6D4"/>
                </linearGradient>
                <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#8B5CF6"/>
                    <stop offset="50%" stop-color="#EC4899"/>
                    <stop offset="100%" stop-color="#06B6D4"/>
                </linearGradient>
                <linearGradient id="cardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.02"/>
                </linearGradient>
            </defs>

            <!-- Background & Glows -->
            <rect width="1080" height="1350" fill="#05050A"/>
            <rect width="1080" height="1350" fill="url(#glow1)"/>
            <rect width="1080" height="1350" fill="url(#glow2)"/>
            <rect width="1080" height="1350" fill="url(#glow3)"/>

            <!-- Header logo/text -->
            <text x="100" y="120" fill="#06B6D4" font-family="'Outfit'" font-weight="900" font-size="28" letter-spacing="6">AI MASTERCLASS</text>
            <rect x="100" y="145" width="220" height="3" fill="url(#btnGrad)"/>

            <!-- Main Title -->
            <g font-family="'Outfit'" font-weight="900" font-size="76">
                <text x="100" y="270" fill="url(#textGrad)">FROM CODE TO CASH:</text>
                <text x="100" y="365" fill="#FFFFFF">AUTOMATE &</text>
                <text x="100" y="460" fill="url(#btnGrad)">MONETIZE.</text>
            </g>

            <!-- Glowing decorative line -->
            <path d="M 100,530 Q 300,560 500,530 T 980,530" stroke="url(#btnGrad)" stroke-width="4" stroke-linecap="round" opacity="0.8"/>

            <!-- Glassmorphic Card (Left Side) -->
            <g transform="translate(100, 600)">
                <!-- Glass panel -->
                <rect width="460" height="420" rx="24" fill="#FFFFFF" fill-opacity="0.03" stroke="url(#cardBorder)" stroke-width="2"/>
                
                <!-- Subtitle / Value Prop -->
                <text x="40" y="60" fill="#06B6D4" font-family="'Outfit'" font-weight="700" font-size="22" letter-spacing="3">REVENUE ACCELERATION</text>
                
                <g font-family="'Outfit'" font-size="24" fill="#E2E8F0">
                    <text x="40" y="130">Learn how to build AI-powered</text>
                    <text x="40" y="170">pipelines, automate corporate</text>
                    <text x="40" y="210">workflows, and deploy high-ticket</text>
                    <text x="40" y="250">SaaS platforms that generate</text>
                    <text x="40" y="290">consistent recurring revenue.</text>
                </g>
                
                <!-- Tiny tech icons inside card -->
                <circle cx="60" cy="360" r="15" fill="#8B5CF6" opacity="0.3"/>
                <circle cx="60" cy="360" r="6" fill="#8B5CF6"/>
                <circle cx="110" cy="360" r="15" fill="#06B6D4" opacity="0.3"/>
                <circle cx="110" cy="360" r="6" fill="#06B6D4"/>
                <circle cx="160" cy="360" r="15" fill="#EC4899" opacity="0.3"/>
                <circle cx="160" cy="360" r="6" fill="#EC4899"/>
            </g>

            <!-- Portrait Image with glass border (Right Side) -->
            <g transform="translate(620, 600)">
                <!-- Blurred Glass Backing -->
                <rect x="-10" y="-10" width="380" height="470" rx="48" fill="#FFFFFF" fill-opacity="0.02" stroke="url(#cardBorder)" stroke-width="2"/>
                <!-- Main Avatar Image -->
                <g clip-path="url(#avatar-clip)">
                    <image href="{IMAGE_DATA_URI}" x="-30" y="-40" width="410" height="520"/>
                </g>
            </g>

            <!-- CTA Button -->
            <g transform="translate(100, 1100)">
                <!-- Button container with glow -->
                <rect width="880" height="80" rx="40" fill="url(#btnGrad)"/>
                <text x="440" y="49" fill="#FFFFFF" font-family="'Outfit'" font-weight="900" font-size="28" text-anchor="middle" letter-spacing="3">JOIN THE MASTERCLASS TODAY →</text>
            </g>

            <!-- Footer Info (High Contrast Fix) -->
            <text x="100" y="1260" fill="#06B6D4" font-family="'Outfit'" font-weight="700" font-size="20" letter-spacing="1">HTTPS://DUNCANMAKOYO.COM/WORKSHOP</text>
            <text x="980" y="1260" fill="#FFFFFF" font-family="'Outfit'" font-weight="700" font-size="20" text-anchor="end" letter-spacing="1">CLICK TO APPLY</text>
        </svg>
    </div>
</body>
</html>
"""

# Poster 3: Swiss Editorial (Minimal Cream & Crimson Red)
POSTER_3_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Masterclass - Swiss Editorial Poster</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@400;700&display=swap');
        body {{
            margin: 0;
            padding: 0;
            background: #F4F2EC;
            width: 1080px;
            height: 1350px;
            overflow: hidden;
            font-family: 'Inter', sans-serif;
        }}
        .poster-container {{
            width: 1080px;
            height: 1350px;
            position: relative;
            background: #F4F2EC;
            border: 1px solid #1C1D1F;
            box-sizing: border-box;
        }}
        svg {{
            width: 100%;
            height: 100%;
            display: block;
        }}
    </style>
</head>
<body>
    <div class="poster-container">
        <svg viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect width="1080" height="1350" fill="#F4F2EC"/>
            
            <!-- Grid Lines & Borders -->
            <line x1="100" y1="0" x2="100" y2="1350" stroke="#1C1D1F" stroke-width="1"/>
            <line x1="980" y1="0" x2="980" y2="1350" stroke="#1C1D1F" stroke-width="1"/>
            <line x1="0" y1="100" x2="1080" y2="100" stroke="#1C1D1F" stroke-width="1"/>
            <line x1="0" y1="1250" x2="1080" y2="1250" stroke="#1C1D1F" stroke-width="1"/>

            <!-- Header Swiss Cross & Branding -->
            <g transform="translate(100, 45)">
                <rect width="30" height="10" fill="#E11D48"/>
                <rect x="10" y="-10" width="10" height="30" fill="#E11D48"/>
            </g>
            <text x="150" y="60" fill="#1C1D1F" font-family="'Inter'" font-weight="700" font-size="20" letter-spacing="4">DESIGN FOR INTELLIGENCE</text>
            <text x="980" y="60" fill="#1C1D1F" font-family="'Inter'" font-weight="400" font-size="16" text-anchor="end">SWISS // CONCEPT 03</text>

            <!-- Main Heading (Playfair Display) -->
            <g font-family="'Playfair Display'" font-weight="700" font-size="82" fill="#1C1D1F">
                <text x="100" y="240">Re-imagining</text>
                <text x="100" y="340" fill="#E11D48" font-style="italic">User Experience</text>
                <text x="100" y="440">in the Age of</text>
                <text x="100" y="540">Agentic AI.</text>
            </g>

            <!-- Horizontal Divider -->
            <line x1="100" y1="600" x2="980" y2="600" stroke="#1C1D1F" stroke-width="2"/>

            <!-- Value Prop Description (Fixed text width to prevent image overlap) -->
            <g font-family="'Inter'" font-size="20" fill="#3A3B3F">
                <text x="100" y="660" font-weight="700" fill="#1C1D1F">THE CONTEXT // 2026</text>
                <text x="100" y="715">We are moving beyond simple chat</text>
                <text x="100" y="755">interfaces. Designing intelligent,</text>
                <text x="100" y="795">multi-modal interfaces demands a</text>
                <text x="100" y="835">structural design philosophy.</text>
                <text x="100" y="875">Learn to build systems that think,</text>
                <text x="100" y="915">react, and deliver true value.</text>
            </g>

            <!-- Black & White Portrait with red highlight overlay -->
            <g transform="translate(600, 640)">
                <!-- Red shadow border -->
                <rect x="15" y="15" width="380" height="480" fill="#E11D48"/>
                <!-- Photo Container -->
                <rect width="380" height="480" stroke="#1C1D1F" stroke-width="2"/>
                <!-- Clipping Mask -->
                <clipPath id="avatar-clip-swiss">
                    <rect x="1" y="1" width="378" height="478"/>
                </clipPath>
                <!-- Gray-scaled portrait -->
                <g clip-path="url(#avatar-clip-swiss)" filter="url(#grayscale)">
                    <image href="{IMAGE_DATA_URI}" x="-20" y="-30" width="420" height="540"/>
                    <!-- Slight Red tint block -->
                    <rect width="380" height="480" fill="#E11D48" fill-opacity="0.08"/>
                </g>
            </g>

            <!-- Grayscale filter definition -->
            <defs>
                <filter id="grayscale">
                    <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0
                                                         0.33 0.33 0.33 0 0
                                                         0.33 0.33 0.33 0 0
                                                         0    0    0    1 0"/>
                </filter>
            </defs>

            <!-- CTA / Enroll Action -->
            <g transform="translate(100, 1060)">
                <!-- Red dot -->
                <circle cx="20" cy="-20" r="12" fill="#E11D48"/>
                <text x="50" y="-12" fill="#1C1D1F" font-family="'Inter'" font-weight="700" font-size="28" letter-spacing="2">REGISTER NOW →</text>
                
                <line x1="0" y1="10" x2="400" y2="10" stroke="#E11D48" stroke-width="3"/>
            </g>

            <!-- Footer Details (High Contrast) -->
            <text x="100" y="1210" fill="#1C1D1F" font-family="'Inter'" font-weight="700" font-size="18">HTTPS://DUNCANMAKOYO.COM/WORKSHOP</text>
            <text x="980" y="1210" fill="#E11D48" font-family="'Inter'" font-weight="700" font-size="16" text-anchor="end">CLICK ON DESIGN TO OPEN LINK</text>
        </svg>
    </div>
</body>
</html>
"""

# Poster 4: Chroma Flow (Liquid Gradients & Deep Violet)
POSTER_4_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Masterclass - Chroma Flow Poster</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap');
        body {{
            margin: 0;
            padding: 0;
            background: #080614;
            width: 1080px;
            height: 1350px;
            overflow: hidden;
            font-family: 'Space Grotesk', sans-serif;
        }}
        .poster-container {{
            width: 1080px;
            height: 1350px;
            position: relative;
            background: #080614;
        }}
        svg {{
            width: 100%;
            height: 100%;
            display: block;
        }}
    </style>
</head>
<body>
    <div class="poster-container">
        <svg viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <!-- Radial flow gradients -->
                <radialGradient id="chromaGlow" cx="30%" cy="80%" r="60%">
                    <stop offset="0%" stop-color="#F43F5E" stop-opacity="0.4"/>
                    <stop offset="50%" stop-color="#EC4899" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="#080614" stop-opacity="0"/>
                </radialGradient>
                <radialGradient id="amberGlow" cx="80%" cy="30%" r="50%">
                    <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.35"/>
                    <stop offset="100%" stop-color="#080614" stop-opacity="0"/>
                </radialGradient>
                
                <linearGradient id="chromaText" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#F43F5E"/>
                    <stop offset="50%" stop-color="#EC4899"/>
                    <stop offset="100%" stop-color="#F59E0B"/>
                </linearGradient>

                <!-- High-quality Rounded Rect Clip to prevent crop of head top -->
                <clipPath id="avatar-clip-chroma">
                    <rect width="400" height="460" rx="40" ry="40"/>
                </clipPath>
            </defs>

            <!-- Background -->
            <rect width="1080" height="1350" fill="#080614"/>
            <rect width="1080" height="1350" fill="url(#chromaGlow)"/>
            <rect width="1080" height="1350" fill="url(#amberGlow)"/>

            <!-- Header -->
            <text x="100" y="110" fill="#F8FAFC" font-family="'Space Grotesk'" font-weight="700" font-size="24" letter-spacing="8">ADVANCED AI CURRICULUM</text>
            <line x1="100" y1="130" x2="300" y2="130" stroke="#F43F5E" stroke-width="4"/>

            <!-- Main Heading (Chroma style) -->
            <g font-family="'Space Grotesk'" font-weight="700" font-size="76" fill="#F8FAFC">
                <text x="100" y="240">MASTER THE MODELS.</text>
                <text x="100" y="335" fill="url(#chromaText)">OWN THE INTEGRATION.</text>
            </g>

            <!-- Rounded Portrait Frame with glow border (Fixes circular head crop defect) -->
            <g transform="translate(560, 420)">
                <!-- Glowing Back Card -->
                <rect x="-4" y="-4" width="408" height="468" rx="44" stroke="url(#chromaText)" stroke-width="6" fill="none" opacity="0.8"/>
                <!-- Photo Masked in Rounded Rect (Resized to prevent DOM overlap) -->
                <g clip-path="url(#avatar-clip-chroma)">
                    <image href="{IMAGE_DATA_URI}" x="0" y="0" width="400" height="460" preserveAspectRatio="xMidYMid slice"/>
                </g>
            </g>

            <!-- Value Prop & Highlights (Left Side) -->
            <g transform="translate(100, 460)">
                <!-- Short highlights list -->
                <text x="0" y="50" fill="#F43F5E" font-weight="700" font-size="22" letter-spacing="4">THE DEEP DIVE</text>
                
                <g font-family="'Space Grotesk'" font-size="24" fill="#D1D5DB">
                    <text x="0" y="120">Understand LLM internals,</text>
                    <text x="0" y="160">context windows, tokenomics,</text>
                    <text x="0" y="200">and prompt engineering.</text>
                    <text x="0" y="240">The definitive training for</text>
                    <text x="0" y="280">technical leaders seeking</text>
                    <text x="0" y="320">maximum system leverage.</text>
                </g>
            </g>

            <!-- Interactive Features / Metrics -->
            <g transform="translate(100, 880)">
                <line x1="0" y1="0" x2="880" y2="0" stroke="#374151" stroke-width="1"/>
                
                <!-- Stat 1 -->
                <text x="0" y="50" fill="#F8FAFC" font-weight="700" font-size="36">100%</text>
                <text x="0" y="90" fill="#9CA3AF" font-size="18">PRACTICAL CODE</text>

                <!-- Stat 2 -->
                <text x="300" y="50" fill="#F8FAFC" font-weight="700" font-size="36">SYSTEMS</text>
                <text x="300" y="90" fill="#9CA3AF" font-size="18">SCALABLE ARCHITECTURE</text>

                <!-- Stat 3 -->
                <text x="650" y="50" fill="#F59E0B" font-weight="700" font-size="36">REVENUE</text>
                <text x="650" y="90" fill="#9CA3AF" font-size="18">ROI DESIGN</text>
            </g>

            <!-- CTA Callout Button -->
            <g transform="translate(100, 1080)">
                <rect width="880" height="90" rx="12" fill="#FFFFFF" fill-opacity="0.03" stroke="url(#chromaText)" stroke-width="2"/>
                <text x="440" y="55" fill="#F8FAFC" font-family="'Space Grotesk'" font-weight="700" font-size="28" text-anchor="middle" letter-spacing="3">APPLY FOR THE BATCH TODAY →</text>
            </g>

            <!-- Footer Details (High Contrast Fix) -->
            <text x="100" y="1250" fill="#F43F5E" font-weight="700" font-size="20" letter-spacing="1">HTTPS://DUNCANMAKOYO.COM/WORKSHOP</text>
            <text x="980" y="1250" fill="#FFFFFF" font-weight="700" font-size="20" text-anchor="end" letter-spacing="1">CLICK POSTER TO REGISTER</text>
        </svg>
    </div>
</body>
</html>
"""

# Poster 5: Technical Broadsheet (Monospace blueprint Grid)
POSTER_5_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Masterclass - Technical Broadsheet Poster</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        body {{
            margin: 0;
            padding: 0;
            background: #090E17;
            width: 1080px;
            height: 1350px;
            overflow: hidden;
            font-family: 'Space Mono', monospace;
        }}
        .poster-container {{
            width: 1080px;
            height: 1350px;
            position: relative;
            background: #090E17;
            border: 2px dashed #F59E0B;
            box-sizing: border-box;
            overflow: hidden;
        }}
        svg {{
            width: 100%;
            height: 100%;
            display: block;
        }}
    </style>
</head>
<body>
    <div class="poster-container">
        <svg viewBox="0 0 1080 1350" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Background -->
            <rect width="1080" height="1350" fill="#090E17"/>

            <!-- Blueprint Grid Grid -->
            <path d="M 0,90 L 1080,90 M 0,180 L 1080,180 M 0,270 L 1080,270 M 0,360 L 1080,360 M 0,450 L 1080,450 M 0,540 L 1080,540 M 0,630 L 1080,630 M 0,720 L 1080,720 M 0,810 L 1080,810 M 0,900 L 1080,900 M 0,990 L 1080,990 M 0,1080 L 1080,1080 M 0,1170 L 1080,1170 M 0,1260 L 1080,1260" stroke="#141E30" stroke-width="1"/>
            <path d="M 90,0 L 90,1350 M 180,0 L 180,1350 M 270,0 L 270,1350 M 360,0 L 360,1350 M 450,0 L 450,1350 M 540,0 L 540,1350 M 630,0 L 630,1350 M 720,0 L 720,1350 M 810,0 L 810,1350 M 900,0 L 900,1350 M 990,0 L 990,1350" stroke="#141E30" stroke-width="1"/>

            <!-- Dotted Borders -->
            <rect x="40" y="40" width="1000" height="1270" stroke="#334155" stroke-width="2" stroke-dasharray="10 5"/>

            <!-- Header Info -->
            <text x="80" y="115" fill="#F59E0B" font-family="'Space Mono'" font-weight="700" font-size="22" letter-spacing="4">>_ EXECUTION STACK</text>
            <text x="1000" y="115" fill="#64748B" font-family="'Space Mono'" font-size="18" text-anchor="end">STATUS: READY</text>

            <!-- Main Heading (Monospace style) -->
            <g font-family="'Space Mono'" font-weight="700" font-size="64" fill="#FFFFFF">
                <text x="80" y="240">> ENGINE: MULTI-AGENT</text>
                <text x="80" y="330">  ORCHESTRATION &</text>
                <text x="80" y="420" fill="#F59E0B">  PRODUCTION SCALING.</text>
            </g>

            <!-- Center schematic details / divider -->
            <line x1="80" y1="480" x2="1000" y2="480" stroke="#334155" stroke-width="2"/>

            <!-- Base64 Portrait inside Terminal-like frame (Left Side) -->
            <g transform="translate(80, 540)">
                <!-- Frame border -->
                <rect width="380" height="480" fill="#0C1322" stroke="#F59E0B" stroke-width="2"/>
                <!-- Top bar of window -->
                <rect x="0" y="0" width="380" height="30" fill="#1E293B" stroke="#F59E0B" stroke-width="2"/>
                <!-- Windows circle icons -->
                <circle cx="20" cy="15" r="6" fill="#EF4444"/>
                <circle cx="40" cy="15" r="6" fill="#F59E0B"/>
                <circle cx="60" cy="15" r="6" fill="#10B981"/>
                <text x="360" y="20" fill="#94A3B8" font-family="'Space Mono'" font-size="12" text-anchor="end">instructor.jpg</text>
                
                <!-- Clipped Image inside window -->
                <clipPath id="avatar-clip-sheet">
                    <rect x="2" y="32" width="376" height="446"/>
                </clipPath>
                <!-- Render image with cold bluish tint (Resized to prevent DOM overlap) -->
                <g clip-path="url(#avatar-clip-sheet)">
                    <image href="{IMAGE_DATA_URI}" x="2" y="32" width="376" height="446" preserveAspectRatio="xMidYMid slice"/>
                    <rect x="2" y="32" width="376" height="446" fill="#3B82F6" fill-opacity="0.08"/>
                </g>
            </g>

            <!-- Technical details layout (Right Side) -->
            <g transform="translate(500, 540)" font-family="'Space Mono'">
                <!-- Title block -->
                <rect width="500" height="40" fill="#1E293B"/>
                <text x="20" y="26" fill="#F59E0B" font-size="18" font-weight="700">[ COURSE SYLLABUS ]</text>
                
                <!-- Details -->
                <g font-size="20" fill="#94A3B8">
                    <text x="20" y="90">> LLM APIs & PROMPTING</text>
                    <text x="20" y="130">> VECTOR DB INTEGRATION</text>
                    <text x="20" y="170">> AUTONOMOUS AGENT CHAINS</text>
                    <text x="20" y="210">> TRANSACTION CACHING</text>
                    <text x="20" y="250">> LOAD BALANCING AI</text>
                </g>

                <!-- Value proposition text block -->
                <g font-size="18" fill="#F8FAFC">
                    <text x="20" y="340">Master the engineering stack</text>
                    <text x="20" y="380">required to deploy robust,</text>
                    <text x="20" y="420">cost-efficient, and secure</text>
                    <text x="20" y="460">AI features into production.</text>
                </g>
            </g>

            <!-- Divider -->
            <line x1="80" y1="1080" x2="1000" y2="1080" stroke="#334155" stroke-width="2"/>

            <!-- Terminal Prompt CTA -->
            <g transform="translate(80, 1120)">
                <rect width="920" height="80" fill="#0C1322" stroke="#F59E0B" stroke-width="2"/>
                <text x="30" y="48" fill="#F59E0B" font-size="26" font-weight="700">$ claim_spot --user=guest --link=workshop</text>
                <!-- Blinking cursor box -->
                <rect x="730" y="22" width="20" height="36" fill="#F59E0B"/>
            </g>

            <!-- Footer -->
            <text x="80" y="1255" fill="#F59E0B" font-size="16" font-weight="bold">HTTPS://DUNCANMAKOYO.COM/WORKSHOP</text>
            <text x="1000" y="1255" fill="#64748B" font-size="16" text-anchor="end">> CLICK INTERACTIVE CANVAS TO START</text>
        </svg>
    </div>
</body>
</html>
"""

# Showcase Dashboard: Premium Web Gallery (Updated paths to include /masterclass content/)
SHOWCASE_DASHBOARD_HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Masterclass - Interactive Posters Showcase</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;600;900&display=swap');
        body {{
            margin: 0;
            padding: 0;
            background-color: #030307;
            color: #FFFFFF;
            font-family: 'Outfit', sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-sizing: border-box;
            padding-bottom: 60px;
        }}
        header {{
            text-align: center;
            margin: 60px 20px 40px;
            max-width: 800px;
        }}
        h1 {{
            font-size: 3rem;
            font-weight: 900;
            margin: 0 0 16px;
            background: linear-gradient(135deg, #FF5A00, #EC4899, #06B6D4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -1px;
        }}
        p.subtitle {{
            font-size: 1.25rem;
            color: #94A3B8;
            margin: 0;
            font-weight: 300;
            line-height: 1.6;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
            gap: 40px;
            width: 100%;
            max-width: 1400px;
            padding: 20px;
            box-sizing: border-box;
        }}
        .card {{
            background: #0E0F17;
            border: 1px solid #1E293B;
            border-radius: 20px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }}
        .card:hover {{
            transform: translateY(-8px);
            border-color: #475569;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
        }}
        .card-header {{
            padding: 20px;
            border-bottom: 1px solid #1E293B;
        }}
        .card-title {{
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0 0 4px;
            color: #F8FAFC;
        }}
        .card-tag {{
            font-size: 0.85rem;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 600;
        }}
        .iframe-container {{
            width: 100%;
            aspect-ratio: 1080/1350;
            border: none;
            overflow: hidden;
        }}
        iframe {{
            width: 100%;
            height: 100%;
            border: none;
        }}
        .card-actions {{
            padding: 20px;
            display: flex;
            gap: 12px;
            border-top: 1px solid #1E293B;
            background: #09090E;
        }}
        .btn {{
            flex: 1;
            padding: 12px 20px;
            border-radius: 10px;
            text-align: center;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.95rem;
            transition: background 0.2s ease, color 0.2s ease;
        }}
        .btn-primary {{
            background: #FFFFFF;
            color: #030307;
        }}
        .btn-primary:hover {{
            background: #E2E8F0;
        }}
        .btn-secondary {{
            background: transparent;
            color: #94A3B8;
            border: 1px solid #334155;
        }}
        .btn-secondary:hover {{
            background: #1E293B;
            color: #FFFFFF;
        }}
        footer {{
            margin-top: 80px;
            text-align: center;
            color: #475569;
            font-size: 0.95rem;
        }}
        footer a {{
            color: #94A3B8;
            text-decoration: none;
        }}
        footer a:hover {{
            color: #FFFFFF;
            text-decoration: underline;
        }}
    </style>
</head>
<body>
    <header>
        <h1>AI Masterclass Poster Suite</h1>
        <p class="subtitle">Five unique, clickable designs utilizing Cyber Brutalism, Glassmorphism, Swiss Editorial, Chroma Flow, and Technical Broadsheet philosophies.</p>
    </header>

    <main class="grid">
        <!-- Card 1 -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Cyber Brutalism</h3>
                <span class="card-tag">Aesthetic 01 // Asymmetric Grids</span>
            </div>
            <div class="iframe-container">
                <iframe src="Workshop content/masterclass content/poster_1_cyber_brutalism.html" scrolling="no"></iframe>
            </div>
            <div class="card-actions">
                <a href="Workshop content/masterclass content/poster_1_cyber_brutalism.png" target="_blank" class="btn btn-primary">Download PNG</a>
                <a href="Workshop content/masterclass content/poster_1_cyber_brutalism.html" target="_blank" class="btn btn-secondary">Interactive HTML</a>
            </div>
        </div>

        <!-- Card 2 -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Glassmorphic Future</h3>
                <span class="card-tag">Aesthetic 02 // Glowing Orbs</span>
            </div>
            <div class="iframe-container">
                <iframe src="Workshop content/masterclass content/poster_2_glassmorphic.html" scrolling="no"></iframe>
            </div>
            <div class="card-actions">
                <a href="Workshop content/masterclass content/poster_2_glassmorphic.png" target="_blank" class="btn btn-primary">Download PNG</a>
                <a href="Workshop content/masterclass content/poster_2_glassmorphic.html" target="_blank" class="btn btn-secondary">Interactive HTML</a>
            </div>
        </div>

        <!-- Card 3 -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Swiss Editorial</h3>
                <span class="card-tag">Aesthetic 03 // Typographic Hierarchy</span>
            </div>
            <div class="iframe-container">
                <iframe src="Workshop content/masterclass content/poster_3_swiss_editorial.html" scrolling="no"></iframe>
            </div>
            <div class="card-actions">
                <a href="Workshop content/masterclass content/poster_3_swiss_editorial.png" target="_blank" class="btn btn-primary">Download PNG</a>
                <a href="Workshop content/masterclass content/poster_3_swiss_editorial.html" target="_blank" class="btn btn-secondary">Interactive HTML</a>
            </div>
        </div>

        <!-- Card 4 -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Chroma Flow</h3>
                <span class="card-tag">Aesthetic 04 // Gradient Fluids</span>
            </div>
            <div class="iframe-container">
                <iframe src="Workshop content/masterclass content/poster_4_chroma_flow.html" scrolling="no"></iframe>
            </div>
            <div class="card-actions">
                <a href="Workshop content/masterclass content/poster_4_chroma_flow.png" target="_blank" class="btn btn-primary">Download PNG</a>
                <a href="Workshop content/masterclass content/poster_4_chroma_flow.html" target="_blank" class="btn btn-secondary">Interactive HTML</a>
            </div>
        </div>

        <!-- Card 5 -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Technical Broadsheet</h3>
                <span class="card-tag">Aesthetic 05 // Blueprint Grid</span>
            </div>
            <div class="iframe-container">
                <iframe src="Workshop content/masterclass content/poster_5_tech_broadsheet.html" scrolling="no"></iframe>
            </div>
            <div class="card-actions">
                <a href="Workshop content/masterclass content/poster_5_tech_broadsheet.png" target="_blank" class="btn btn-primary">Download PNG</a>
                <a href="Workshop content/masterclass content/poster_5_tech_broadsheet.html" target="_blank" class="btn btn-secondary">Interactive HTML</a>
            </div>
        </div>
    </main>

    <footer>
        <p>Built using Python & Playwright. View the landing page at <a href="{TARGET_LINK}" target="_blank">duncanmakoyo.com/#/workshop</a></p>
    </footer>
</body>
</html>
"""

# Write HTML files
posters_to_write = {
    "poster_1_cyber_brutalism.html": POSTER_1_HTML,
    "poster_2_glassmorphic.html": POSTER_2_HTML,
    "poster_3_swiss_editorial.html": POSTER_3_HTML,
    "poster_4_chroma_flow.html": POSTER_4_HTML,
    "poster_5_tech_broadsheet.html": POSTER_5_HTML
}

print("Generating 5 interactive HTML/SVG templates...")
for filename, html_content in posters_to_write.items():
    file_path = os.path.join(OUTPUT_DIR, filename)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"Generated: {filename}")

# Write showcase dashboard
showcase_path = os.path.join(WORKSPACE_DIR, "AI_Masterclass_Showcase.html")
with open(showcase_path, "w", encoding="utf-8") as f:
    f.write(SHOWCASE_DASHBOARD_HTML)
print("Generated Showcase Dashboard HTML.")

# Use Playwright to render the PNG screenshots
print("Launching Chromium via Playwright to render PNGs...")
with sync_playwright() as p:
    browser = p.chromium.launch()
    # 1080x1350 is the exact design size
    page = browser.new_page(viewport={"width": 1080, "height": 1350})
    
    html_files = [
        ("poster_1_cyber_brutalism.html", "poster_1_cyber_brutalism.png"),
        ("poster_2_glassmorphic.html", "poster_2_glassmorphic.png"),
        ("poster_3_swiss_editorial.html", "poster_3_swiss_editorial.png"),
        ("poster_4_chroma_flow.html", "poster_4_chroma_flow.png"),
        ("poster_5_tech_broadsheet.html", "poster_5_tech_broadsheet.png")
    ]
    
    for html_name, png_name in html_files:
        local_path = os.path.join(OUTPUT_DIR, html_name)
        file_url = f"file://{os.path.abspath(local_path)}"
        print(f"Rendering {html_name} -> {png_name}...")
        page.goto(file_url)
        # Give fonts/images plenty of time to render fully
        page.wait_for_timeout(3000)
        
        # Run programmatic graphic design audits
        run_poster_audits(page, html_name)

        
        # Capture the poster container element specifically to ensure exact dimensions without margins
        poster_elem = page.locator(".poster-container")
        if poster_elem.count() > 0:
            poster_elem.screenshot(path=os.path.join(OUTPUT_DIR, png_name))
        else:
            page.screenshot(path=os.path.join(OUTPUT_DIR, png_name))
            
        print(f"Saved PNG to: {png_name}")
        
    browser.close()

print("All posters successfully rendered as high-resolution PNGs!")
