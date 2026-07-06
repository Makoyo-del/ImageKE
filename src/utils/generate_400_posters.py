import os
import urllib.request
from PIL import Image, ImageDraw, ImageFont

# Define paths
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONTS_DIR = os.path.join(WORKSPACE_DIR, "src", "assets", "fonts")
OUTPUT_DIR = os.path.join(WORKSPACE_DIR, "Workshop content")

os.makedirs(FONTS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Font URLs
FONT_URLS = {
    "Inter-ExtraBold.ttf": "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYMZhrj72A.ttf",
    "Inter-Medium.ttf": "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZhrj72A.ttf"
}

# Download fonts if missing
for font_name, url in FONT_URLS.items():
    font_path = os.path.join(FONTS_DIR, font_name)
    if not os.path.exists(font_path):
        print(f"Downloading {font_name}...")
        try:
            urllib.request.urlretrieve(url, font_path)
            print(f"Successfully downloaded {font_name}")
        except Exception as e:
            print(f"Error downloading {font_name}: {e}")

extra_bold_path = os.path.join(FONTS_DIR, "Inter-ExtraBold.ttf")
medium_path = os.path.join(FONTS_DIR, "Inter-Medium.ttf")

# Design Constants
CANVAS_SIZE = (1080, 1080)
BG_COLOR = "#0B0F19"       # Deep slate blue
TEXT_COLOR = "#FFFFFF"     # White
ACCENT_COLOR = "#F97316"   # Orange
SUB_COLOR = "#94A3B8"      # Slate-400

HEADLINE_FONT_SIZE = 70    # Adjusted to ensure long 1:1 layouts never overflow
SUB_FONT_SIZE = 30
LEFT_MARGIN = 100
RIGHT_MARGIN = 100
MAX_TEXT_WIDTH = CANVAS_SIZE[0] - LEFT_MARGIN - RIGHT_MARGIN  # 880px

HEADLINE_Y_START = 200
SUB_Y_START = 720

def wrap_text(text, font, max_width, draw):
    lines = []
    for paragraph in text.split('\n'):
        words = paragraph.split(' ')
        current_line = []
        for word in words:
            test_line = ' '.join(current_line + [word])
            bbox = draw.textbbox((0, 0), test_line, font=font)
            width = bbox[2] - bbox[0]
            if width <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
        if current_line:
            lines.append(' '.join(current_line))
    return lines

def generate_poster(data, h_font, s_font):
    img = Image.new("RGB", CANVAS_SIZE, color=BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 1. Render Headline (Top Section)
    headline_lines = wrap_text(data["headline"], h_font, MAX_TEXT_WIDTH, draw)
    y_offset = HEADLINE_Y_START
    line_height = int(HEADLINE_FONT_SIZE * 1.15)

    for line in headline_lines:
        if line.endswith('.'):
            text_without_dot = line[:-1]
            draw.text((LEFT_MARGIN, y_offset), text_without_dot, font=h_font, fill=TEXT_COLOR)
            bbox = draw.textbbox((LEFT_MARGIN, y_offset), text_without_dot, font=h_font)
            dot_x = bbox[2]
            draw.text((dot_x, y_offset), ".", font=h_font, fill=ACCENT_COLOR)
        else:
            parts = line.split('.')
            current_x = LEFT_MARGIN
            for i, part in enumerate(parts):
                if not part and i == len(parts) - 1:
                    break
                draw.text((current_x, y_offset), part, font=h_font, fill=TEXT_COLOR)
                part_bbox = draw.textbbox((current_x, y_offset), part, font=h_font)
                current_x = part_bbox[2]
                if i < len(parts) - 1:
                    draw.text((current_x, y_offset), ".", font=h_font, fill=ACCENT_COLOR)
                    dot_bbox = draw.textbbox((current_x, y_offset), ".", font=h_font)
                    current_x = dot_bbox[2]
        y_offset += line_height

    # 2. Render Supporting Statement (Bottom Section)
    sub_lines = wrap_text(data["sub"], s_font, MAX_TEXT_WIDTH, draw)
    y_offset = SUB_Y_START
    sub_line_height = int(SUB_FONT_SIZE * 1.35)

    for line in sub_lines:
        if line.endswith('.'):
            text_without_dot = line[:-1]
            draw.text((LEFT_MARGIN, y_offset), text_without_dot, font=s_font, fill=SUB_COLOR)
            bbox = draw.textbbox((LEFT_MARGIN, y_offset), text_without_dot, font=s_font)
            dot_x = bbox[2]
            draw.text((dot_x, y_offset), ".", font=s_font, fill=ACCENT_COLOR)
        else:
            draw.text((LEFT_MARGIN, y_offset), line, font=s_font, fill=SUB_COLOR)
        y_offset += sub_line_height

    output_path = os.path.join(OUTPUT_DIR, data["filename"])
    img.save(output_path, "PNG")

# Complete list of 400 unique quotes
POSTERS_DATA = []

# Helper function to bulk add quotes with category prefix
def add_quotes(quotes_list, category):
    for i, q in enumerate(quotes_list, len(POSTERS_DATA) + 1):
        filename = f"poster_{i:03d}_{category}.png"
        POSTERS_DATA.append({
            "headline": q[0],
            "sub": q[1],
            "filename": filename
        })

# ─── 1. DIGITAL SKILLS (01 - 40) ───
add_quotes([
    ("CODE IS NOT THE GOAL.\nSYSTEM DESIGN IS.", "Writing code is a commodity. Designing resilient systems that scale is where true professional value lies."),
    ("SKILLS DEPRECIATE\nFASTER THAN EVER.", "Continuous learning is no longer a career choice; it is an active survival mechanism in digital ecosystems."),
    ("API INTEGRATION IS\nA TRUST AGREEMENT.", "A broken webhook is a lost client. Build resilient proxies to protect your transaction flows."),
    ("DATA PLAYS NO\nFAVORITES.", "Decisions made on gut feelings are gambling. Decisive professionals build databases to prove hypothesis."),
    ("AUTOMATION DOES NOT\nREPLACE THOUGHT.", "It amplifies it. Automating a broken process just creates chaos at scale."),
    ("UNDERSTAND THE STACK\nTOP TO BOTTOM.", "Specialization is useful, but the highest-paid engineers can navigate from raw database queries to CSS layouts."),
    ("SPEED IS A PRODUCT\nFEATURE.", "If your interface takes three seconds to load, your user has already closed the tab. Optimize every byte."),
    ("ERROR HANDLING IS\nNOT AN AFTERTHOUGHT.", "Graceful failures define the difference between a prototype and production-ready enterprise software."),
    ("THE BEST CODE\nIS NO CODE.", "Before writing a new service, verify if you can solve the problem by simplifying the architecture."),
    ("DOCUMENTATION IS\nYOUR LEGACY.", "If your team cannot run your project without calling you, you haven't built a system—you've built a bottleneck."),
    ("CLEAN ARCHITECTURE\nPREVENTS CHAOS.", "Bloated code bases are the result of short-term shortcuts. Refactor continuously to keep systems agile."),
    ("DATABASES ARE THE\nHEART OF SAAS.", "Indexes, schemas, and optimization are what make a backend fast. Never leave query planning to chance."),
    ("ASYNCHRONOUS JOBS\nSAVE USER EXPERIENCE.", "Offload heavy tasks, emails, and API calls to background crons. Keep your HTTP thread pool clean."),
    ("LOG EVERYTHING.\nAUDIT EVERYWHERE.", "When a system fails in production, detailed telemetry logs are the difference between minutes and days of downtime."),
    ("GIT INSTRUCTIONS ARE\nCOMMITMENTS.", "Clean git history, small commits, and descriptive messages make collaboration smooth and prevent merge conflicts."),
    ("TESTING IS NOT\nOPTIONAL.", "If you don't test your code, your users will test it for you—often at the expense of your brand reputation."),
    ("RATE LIMITS PREVENT\nSYSTEM COLLAPSE.", "Protect your ingestion endpoints from abuse and DDoS attacks. Throttle early, throttle hard."),
    ("DECOUPLING SERVICES\nIS THE GOLD STANDARD.", "Monoliths are easy to start, but microservices or decoupled modules are what allow teams to ship independently."),
    ("ESTABLISH A STAGING\nENVIRONMENT.", "Never deploy changes directly to production without testing them in an environment that mirrors live data."),
    ("SECURITY IS A PROCESS.\nNOT A CHECKBOX.", "Encryption, JWT tokens, and strict RLS policies are the baseline. Regular security audits are mandatory."),
    ("MOBILE EXPERIENCE IS\nPRIMARY EXPERIENCE.", "Most of your users will view your web app on a mobile screen. Design for touch targets and small widths first."),
    ("ACCESSIBILITY IS\nESSENTIAL DESIGN.", "WCAG compliance is not a chore. High contrast and clean semantic HTML make your app usable for everyone."),
    ("STATE MANAGEMENT IS\nTHE ROOT OF BUGS.", "Keep client-side state local and sync with server data explicitly. Avoid global state whenever possible."),
    ("CDN EDGE CACHING IS\nA MAGIC WAND.", "Serve static assets and static pages close to your users to reduce server load and page response times."),
    ("USSD PROTOCOL IS\nALIVE AND KICKING.", "In emerging markets, USSD codes drive transaction volume where mobile internet coverage is poor. Optimize for it."),
    ("COMPRESS EVERYTHING\nBEFORE SHIPPING.", "Images, videos, and scripts must be minimized. Large bundles destroy mobile load speeds."),
    ("VERSION YOUR APIS\nFROM DAY ONE.", "Change is inevitable. Versioning endpoints ensures that legacy integrations never break when you update logic."),
    ("THE BROWSER IS A\nRUNTIME ENVIRONMENT.", "Optimize memory usage and DOM nodes. A memory leak in a React app can freeze low-end mobile devices."),
    ("SQL IS A SUPERPOWER.", "Relying solely on ORMs leads to sub-optimal queries. Master raw SQL joins, subqueries, and window functions."),
    ("STATIC TYPING SECURES\nDEVELOPER VELOCITY.", "TypeScript or type annotations prevent runtime reference errors and make code refactoring predictable."),
    ("INFRASTRUCTURE AS CODE\nIS MANDATORY.", "Configure your servers, databases, and routes programmatically. Manual server setups are impossible to replicate."),
    ("CACHE INVALIDATION IS\nTHE HARDEST PROBLEM.", "Stale data breaks customer trust. Design robust cache busting strategies for every operational layer."),
    ("GRACEFUL DEGRADATION\nKEEPS APPS ONLINE.", "If a third-party API goes down, show cached data or a polite message. Never let the whole application crash."),
    ("MONITOR SYSTEM LATENCY\nIN REAL TIME.", "Keep an eye on database response times and API endpoints. High latency is a precursor to system failure."),
    ("MODULAR COMPONENTS\nSPEED UP BUILDING.", "Create a reusable component library first. Do not reinvent the button, card, or modal on every page."),
    ("DEPENDENCY DEBT IS\nA SILENT KILLER.", "Do not install a massive library for a simple function. Write helper functions locally to keep bundles small."),
    ("CONFIG FILES BELONG\nIN ENVIRONMENT VARS.", "Never hardcode keys, URLs, or secrets in your codebase. Keep configs decoupled from execution logic."),
    ("SEPARATION OF CONCERNS\nIS RATIONAL DESIGN.", "Keep business logic out of your UI components. Keep database queries out of your route handlers."),
    ("THE CLI IS YOUR\nFASTEST INTERFACE.", "Master terminal shortcuts, shell scripts, and build tools. GUI interfaces slow down professional velocity."),
    ("BUILD FOR OFFLINE\nCAPABILITY.", "Use service workers and local storage to keep your application functional even when network connectivity drops.")
], "digital_skills")

# ─── 2. AI & ETHICAL USE (41 - 80) ───
add_quotes([
    ("AI SHOULD EMPOWER.\nNOT REPLACE.", "Use artificial intelligence to automate execution, but never outsource your critical thinking or strategic vision."),
    ("ETHICAL AI IS\nNOT OPTIONAL.", "As systems automate decisions, engineers have a fiduciary duty to eliminate bias and protect user data privacy."),
    ("PROMPTING IS THE\nNEW PROGRAMMING.", "The language of execution has shifted from syntax to intent. Clarity of thought is the ultimate developer tool."),
    ("BIAS IN.\nBIAS OUT.", "Machine learning models mirror our past mistakes. Ethical developers audit training data with extreme skepticism."),
    ("TRANSPARENCY BUILDS\nLASTING TRUST.", "Always declare when a decision, content piece, or interaction has been generated by an automated model."),
    ("AI IS A CO-PILOT.\nYOU STEER.", "Never push generated code to production without understanding every line. You are responsible for the execution."),
    ("THE COGNITIVE OVERHEAD\nOF GENERATION.", "Generating content is easy; validating its correctness, context, and security is the real professional challenge."),
    ("PROTECT YOUR\nINTELLECTUAL PROPERTY.", "Never feed proprietary client code or sensitive user data into public AI models. Maintain absolute boundary limits."),
    ("AUTOMATING HUMAN\nDECISIONS.", "When algorithms decide credit scores, job applications, or legal outcomes, human audit oversight must remain mandatory."),
    ("AI WITHOUT EMOTION\nIS HOLLOW.", "Use machines for structural efficiency. Save your human empathy, relationships, and storytelling for leadership."),
    ("LLM HALLUCINATIONS\nARE SYSTEM RISKS.", "Language models are probabilistic. Always verify mathematical formulas, historical dates, and legal contracts."),
    ("DATA ETHICS IS\nHUMAN ETHICS.", "Users trust you with their digital footprints. Do not sell, expose, or use their data without explicit consent."),
    ("AI MODEL LOCK-IN\nIS A STRATEGIC TRAP.", "Design your integrations with API abstraction layers so you can swap models without rewriting application code."),
    ("LOCAL MODELS SECURE\nDATA PRIVACY.", "For sensitive documents, run lightweight open-source models on your local servers instead of public APIs."),
    ("THE SPEED OF AI IS\nA NOISE MULTIPLIER.", "AI allows the creation of low-value spam in seconds. Focus on semantic depth and human-vetted authority."),
    ("MODEL DRIFT IS A\nREAL PHENOMENON.", "API models change over time. Run automated regressions regularly to ensure prompt outputs remain stable."),
    ("DESIGN FOR HUMAN\nINTERVENTION.", "The best automated workflows include a 'human-in-the-loop' step to verify critical decisions before execution."),
    ("AI AS A REASONING\nENGINE.", "Use LLMs to classify, summarize, and structure unstructured data, not as a source of absolute truth."),
    ("Vector search is\nonly half the battle.", "A database is useless without clean data. Spend time structuring document metadata before building vector search."),
    ("AI SAFETY IS A\nDESIGN REQUIREMENT.", "Implement strict guardrails to prevent your customer-facing chatbots from generating toxic or off-brand responses."),
    ("THE COST OF INFERENCE\nMUST BE CALCULATED.", "API calls add up quickly at scale. Cache common responses and optimize prompt lengths to manage costs."),
    ("DO NOT BE AN AI\nWRAPPER BRAND.", "If your only feature is an API call, you have no moat. Build deep integration pipelines and unique datasets."),
    ("AI DEPRECIATES MANUAL\nROUTINES.", "Convert repetitive human lookup workflows into automated pipelines. Save human resources for creative growth."),
    ("ANALYZE CODE GENERATED\nBY AUTOMATION.", "AI-generated code often introduces subtle logic bugs or security flaws. Treat it like code written by a junior intern."),
    ("AI DOES NOT HAVE\nBRAND VOICE.", "Model outputs are generic by default. Inject your brand guidelines, constraints, and tone explicitly into your prompts."),
    ("THE DEBATE ON DATA\nOWNERSHIP.", "Scraping public data without permission is facing legal headwinds. Respect robots.txt and user terms of service."),
    ("AI REVOLUTIONIZES\nSEARCH STRATEGICALLY.", "AEO (Answer Engine Optimization) is replacing classic SEO. Provide direct, structured data to be cited by AI engines."),
    ("ETHICAL ENGINEERS\nREFUSE DARK PATTERNS.", "Never use AI to trick users into subscriptions, manipulate reviews, or generate deceptive marketing materials."),
    ("AI LITERACY IS\nA CAREER MOAT.", "Professionals who know how to build alongside AI will replace those who refuse to adapt. Learn the mechanics."),
    ("PROTECT CUSTOMER\nCOMMUNICATION.", "A customer care bot must have a fast fallback to a human agent. Nothing frustrates users more than looping bots."),
    ("AI AS A PRODUCTIVE\nFRAMEWORK.", "Use AI to brainstorm, sketch code, and draft templates, but finalize the final architecture with human handcrafting."),
    ("AUDIT YOUR THIRD-PARTY\nAI PROVIDERS.", "Ensure your AI vendors comply with local data regulations like GDPR, CCPA, or regional data protection acts."),
    ("TEMPLATIZED THINKING\nIS COGNITIVE DECAY.", "Relying on templates for strategic plans or unique problems leads to mediocre execution. Think from first principles."),
    ("AI SPEED VS HUMAN\nQUALITY.", "High velocity is useless if the direction is wrong. Take time to validate strategy before automating execution."),
    ("MODELS DO NOT UNDERSTAND\nCONTEXT.", "An LLM knows syntax, not business reality. Feed relevant context explicitly into the model for accurate results."),
    ("EMBEDDINGS ARE ONLY\nAS GOOD AS CHUNKING.", "Poor document chunking leads to irrelevant search results. Focus on semantic parsing of data sources."),
    ("THE ETHICS OF BIOMETRICS\nAND FACIAL TECH.", "As surveillance tools automate, developers must advocate for consent-based architectures and strict privacy laws."),
    ("AI WILL NOT RUN\nYOUR DATABASE.", "AI can draft SQL, but indexing, tuning, and replication require human systems engineers. Learn the hard skills."),
    ("EMPATHY CANNOT BE\nALGORITHMIC.", "A machine can mimic polite language, but genuine user care requires human listening and emotional intelligence."),
    ("AI AUDITS SECURE\nCOMPLIANCE.", "Document how automated decisions are made. If a model denies a service, you must be able to explain the reasoning.")
], "ai_ethics")

# ─── 3. PERSONAL BRANDING & VISIBILITY (81 - 120) ───
add_quotes([
    ("DOING GREAT WORK\nIS NOT ENOUGH.", "If no one knows you did it, it doesn't count. Build in public to let your output speak for itself."),
    ("YOUR AUDIENCE IS\nYOUR EQUITY.", "A professional network is the only career asset that cannot be wiped out by a company layoff."),
    ("CLARITY TRUMPS\nCLEVERNESS.", "Your LinkedIn bio should tell a hiring manager exactly what value you deliver within three seconds."),
    ("CONSISTENCY BEATS\nINTENSITY.", "One thought-provoking post every week is vastly superior to a sudden burst of updates followed by silence."),
    ("YOUR PERSONAL BRAND\nIS A FILTER.", "It should attract the exact clients who value your style, and repel those who demand cheap commodity labor."),
    ("HELPING PROFESSIONALS\nGET SEEN.", "Optimize your digital footprint. An ATS-compatible CV is your passport to global remote roles."),
    ("OWN YOUR\nCUSTOM DOMAIN.", "Never host your portfolio solely on a third-party platform. Your name should be your digital home."),
    ("DIAL IN ON\nYOUR NICHE.", "Trying to speak to everyone means you speak to no one. Be the undisputed expert for one specific problem."),
    ("AUTHENTICITY CANNOT\nBE OUTSOURCED.", "People connect with people, not polished corporate jargon. Share your failures alongside your wins."),
    ("STAND FOR A\nPUNCHY HYPOTHESIS.", "Generic advice gets ignored. Share contrarian viewpoints backed by data to provoke meaningful discussion."),
    ("YOUR PROFILE INBOX IS\nYOUR SALES CHANNEL.", "Treat direct messages with respect. Respond promptly, offer value first, and avoid spammy copy-paste pitches."),
    ("WRITE VALUE-DRIVEN\nPOSTS.", "Do not just post updates about your coffee or certifications. Share insights, frameworks, and lessons learned."),
    ("YOUR WORK IS\nYOUR PROOF OF WORK.", "Share links to github repositories, live websites, case studies, or design systems. Make your skills undeniable."),
    ("NETWORKING IS AN\nINVESTMENT IN PEOPLE.", "Check in on colleagues without asking for anything. Build social capital before you need to spend it."),
    ("A BRAND MOAT IS\nA HEURISTIC MOAT.", "When people hear a specific term or topic, they should automatically associate it with your name. Own the term."),
    ("AVOID GENERIC TITLE\nBUZZWORDS.", "Replace words like 'Experienced Visionary Leader' with what you build: 'Developer Proxy Architect' or 'Mobile Growth Officer'."),
    ("DESIGN YOUR PERSONAL\nLOGO AND STYLE.", "Consistency in fonts, colors, and layout makes your digital footprint instantly recognizable across channels."),
    ("YOUR BRAND IS AN\nACCUMULATION OF ASSISTED.", "Help enough people solve small problems, and your reputation will grow organically through word-of-mouth recommendations."),
    ("CURATE A WEEKLY\nNEWSLETTER.", "Owning an email list is the only way to communicate directly with your audience without relying on platform algorithms."),
    ("A PUNCHY HEADLINE\nOPENS DOORS.", "Use formulas like: *I help [Audience] achieve [Result] using [Mechanic]* to make your value proposition immediately obvious."),
    ("PERSONAL BRANDS SECURE\nFREELANCE PIPELINES.", "Clients prefer to hire individuals they feel they know over faceless agencies. Humanize your services."),
    ("AVOID THE TRAP OF\nFALSE GURUS.", "Always ground your public branding in actual shipped work and verified metrics. E-E-A-T requires execution."),
    ("POST CASE STUDIES,\nNOT PROMOTIONS.", "Instead of announcing 'I am proud to build X', show the breakdown: 'How we reduced latency by 40% on API ingestion'."),
    ("ENGAGE IN MEANINGFUL\nCOMMENT DISCUSSIONS.", "Write insightful replies to other creators' posts. It is the fastest way to get seen by their networks."),
    ("YOUR CV IS A\nMARKETING LEAFLET.", "It is not a autobiography. Tailor it to present your skills as the solution to a specific hiring manager's problem."),
    ("CASE STUDIES DEMAND\nMETRICS.", "Never say 'improved performance'. Say: 'Reduced STK Push callback latency from 3.2s to 1.8s, driving 15% conversion lift'."),
    ("CHOOSE YOUR PLATFORMS\nSTRATEGICALLY.", "Do not try to be on five networks at once. Master one primary channel (e.g. LinkedIn for B2B) before expanding."),
    ("A BRAND IS A\nPROMISE OF CONSISTENCY.", "Deliver high-quality work, meet deadlines, and communicate clearly. Your reputation is built on reliability."),
    ("TEACH WHAT YOU\nLEARN INSTANTLY.", "The best way to solidify your knowledge is to write a tutorial or guide explaining a concept you just mastered."),
    ("YOUR AVATAR IS A\nTRUST ANCHOR.", "Use a clean, professional headshot with good lighting. Do not use dark, low-res, or overly cropped photos."),
    ("CREATE A VALUE-DRIVEN\nLEAD MAGNET.", "Offer a free template, checklist, or script in exchange for an email address. Build your marketing funnel."),
    ("YOUR PERSONAL SITE\nIS A PORTFOLIO.", "Keep it clean, fast, and responsive. Test its loading speed. A slow personal site ruins your professional pitch."),
    ("BRAND BUILDING IS A\nMARATHON.", "Do not expect overnight virality. Focus on building high-trust relationships with 100 people first."),
    ("SEEK ALIGNMENT OVER\nPOPULARITY.", "It is better to have 500 highly targeted followers who hire you than 50,000 random accounts that ignore your offers."),
    ("DO NOT BE AFRAID OF\nCONTRARIAN OPINIONS.", "If you agree with everyone, you have nothing unique to say. Share data-backed perspectives that challenge trends."),
    ("YOUR BIO IS\nYOUR LANDING PAGE.", "Treat it like a product funnel. Have a clear call-to-action (CTA) pointing to your website or booking link."),
    ("SHARE SAMPLES OF\nYOUR INTELLECTUAL PROPERTY.", "Post snippet files, diagrams, or architecture designs. Visual breakdowns get shared widely on social channels."),
    ("YOUR REPUTATION IS\nYOUR SHIELD.", "When things go wrong, a track record of integrity and quality work protects your business from temporary setbacks."),
    ("OWN YOUR PORTFOLIO\nPLATFORM.", "A Git repository is excellent, but a clean domain with a case-study layout makes it readable for non-technical clients."),
    ("MARKET THOUGHTFULLY.\nNOT AGGRESSIVELY.", "Offer insights that solve problems. Let clients reach out to you because they trust your expertise.")
], "personal_branding")

# ─── 4. CAREER GROWTH & STRATEGY (121 - 160) ───
add_quotes([
    ("A LAYOFF IS\nNOT A FAILURE.", "It is a market reallocation of your talent. Ensure your career assets are portable and decoupled from your employer."),
    ("NEGOTIATE FOR\nREVENUE IMPACT.", "If you want a higher salary, tie your role directly to user acquisition, retention, or cost reduction."),
    ("SKILL STACKING\nCREATES UNICORNS.", "An engineer who understands marketing is 10x more valuable than an engineer who only writes code."),
    ("NEVER STAY\nCOMFORTABLE.", "If you are the smartest person in the room, you are in the wrong room. Find environments that push your limits."),
    ("PORTFOLIO OVER\nCERTIFICATES.", "Hiring managers care about what you have shipped, not the online courses you have completed. Build real things."),
    ("THE 6-SECOND SCAN\nIS REAL.", "Your CV doesn't get read; it gets scanned. Put your highest-impact metrics in the top third of the page."),
    ("THE HIDDEN JOB\nMARKET IS REAL.", "Over 70% of high-tier roles are filled through relationships and referrals, not public job boards."),
    ("TRANSITIONS REQUIRE\nCOURAGE.", "To move into a new domain, rewrite your past achievements to focus on transferable execution skills."),
    ("PORTABLE IP IS\nYOUR VALUE.", "Every script, checklist, and strategy framework you develop should be stored in your personal knowledge base."),
    ("OPTIMIZE FOR LEVERAGE.\nNOT LABOR.", "The goal is to move from selling hours of work to selling high-impact decisions and systems."),
    ("YOUR CURRENT JOB IS\nA TRAINING GROUND.", "Learn how systems fail, how decisions are made, and how products scale on someone else's payroll."),
    ("DOCUMENT YOUR IMPACT\nWEEKLY.", "Write down what you achieved, what metrics you moved, and what blockers you solved. Never construct a CV from memory."),
    ("THE BEST TIME TO LOOK\nFOR A JOB IS NOW.", "Never wait until you are unhappy or laid off to start interviews. Interviewing is a skill that requires practice."),
    ("BUILD RELATIONSHIPS\nWITH SPECIALIZED HEADHUNTERS.", "A good recruiter can bypass public application filters and place your CV directly on the hiring manager's desk."),
    ("SKILLS ARE TRANSFERABLE.\nINDUSTRIES CHANGE.", "Focus on core problem-solving, project management, and engineering principles rather than tool-specific execution."),
    ("YOUR VALUE IS DEFINED\nBY YOUR REPLACEMENT COST.", "If anyone can learn your job in two weeks, you have no leverage. Master complex, multi-domain skill stacks."),
    ("LEARN TO WRITE\nEXECUTIVE MEMOS.", "Write clear, concise updates that managers can read in 30 seconds. Communication is your fastest promotion lever."),
    ("NEVER NEGOTIATE SALARY\nFIRST.", "First prove your fit, solve their immediate business pain points, and get them to fall in love with your profile."),
    ("EQUITY OVER\nSALARY.", "If you join an early-stage startup, negotiate for equity. Capital ownership is how generational wealth is built."),
    ("THE TRAP OF\nTITLE INFLATION.", "A fancy title with a low salary and no leverage is a bad deal. Focus on compensation, autonomy, and skill acquisition."),
    ("CAREER ROADMAPS REQUIRE\nSTRATEGIC ADJUSTMENTS.", "Review your trajectory every 12 months. If you aren't acquiring new skills or earning more, make a pivot."),
    ("SAY 'NO' TO LOW-VALUE\nTASKS.", "Do not become the default person who takes notes, fixes office hardware, or runs errands. Focus on revenue-moving tasks."),
    ("PROMOTIONS ARE WON\nBEFORE THEY ARE ANNOUNCED.", "Do the job of the next level for six months. Prove you can execute before demanding the title change."),
    ("ACQUIRE ACCOUNTABILITY.", "Take responsibility for high-stakes projects. High risk leads to high leverage and career visibility."),
    ("YOUR MANAGER IS\nYOUR CLIENT.", "Understand their metrics, solve their headaches, and make them look good to executive leadership. That is how you secure sponsors."),
    ("THE BROWSER IS YOUR\nGLOBAL OFFICE.", "Global remote roles pay 3-5x local rates. Optimize your CV for remote compliance and global communication standards."),
    ("MASTER RESUME KEYS,\nNOT BUZZWORDS.", "Ensure your resume contains the exact search phrases found in the target job description. Bypassing ATS is the first step."),
    ("DEVELOP A SIGNATURE\nMETHODOLOGY.", "Package your work process into a named framework (e.g. 'Resilient Ingestion Framework'). It makes your expertise tangible."),
    ("THE PORTABLE WORKSHOP\nAPPROACH.", "Run internal training workshops for your team. It establishes you as an authority and builds team leadership points."),
    ("AVOID THE COMFORT OF\nLEGACY TECH.", "If your employer uses tech from ten years ago, update your skills in your personal sandbox. Do not let your skillset rust."),
    ("NEGOTIATE FOR FLEXIBILITY.", "Autonomy, remote work, and flexible hours are often worth more than a minor bump in cash compensation."),
    ("YOUR CAREER IS\nA PRODUCT.", "You are the founder. Your services are the product. Design features, optimize marketing, and increase pricing strategically."),
    ("THE POWER OF\nPORTFOLIO PROJECTS.", "A working web app with real users is worth 100 CV bullet points. Shipped products prove execution ability."),
    ("FIND SPONSORS.\nNOT JUST MENTORS.", "Mentors give advice. Sponsors use their corporate capital to place you in high-visibility roles. Seek sponsors."),
    ("TREAT REJECTION AS\nA DATA POINT.", "If an interview fails, ask for specific feedback. Analyze the gap in your skills or strategy, adjust, and apply again."),
    ("UNDERSTAND THE BUSINESS\nBUSINESS MODEL.", "Learn how your employer makes money. Aligning your projects with their main revenue engine makes you indispensable."),
    ("DO NOT ESCAPE THE\nHARD PROBLEMS.", "The bugs that everyone avoids are your career opportunities. Solved disasters build legends."),
    ("DEVELOP AN UNCOMMON\nSKILL PAIRING.", "Combine Javascript development with copywriting, or database administration with product marketing. Moat building."),
    ("BUILD PORTABLE\nSYSTEM CHECKLISTS.", "Keep a private database of templates, checklists, and code snippets. Take it with you from job to job."),
    ("CAREER VELOCITY IS\nDECISION VELOCITY.", "Do not hesitate when opportunities arise. Say yes to challenges and figure out the execution on the go.")
], "career_growth")

# ─── 5. PROFESSIONAL GROWTH & LEADERSHIP (161 - 200) ───
add_quotes([
    ("LEADERSHIP HAS\nNO TITLE.", "You do not need permission to lead. Solve problems that others ignore, and ownership will follow naturally."),
    ("RADICAL CANDOR\nBUILDS SYSTEMS.", "Politeness that conceals critical flaws is ruinous. Tell your team the truth with absolute kindness."),
    ("MEETINGS ARE\nNOT REAL WORK.", "If a meeting doesn't result in a decision or an assignment, it should have been an asynchronous update."),
    ("DELEGATION\nREQUIRES TRUST.", "Micromanaging is proof of structural insecurity. Build systems that empower others to make decisions."),
    ("PROTECT YOUR\nCRITICAL FOCUS.", "Deep work requires long blocks of uninterrupted time. Protect your schedule from low-priority requests."),
    ("FEEDBACK IS\nA GIFT.", "Praise builds confidence, but critical feedback is the raw material for professional mastery. Seek it out."),
    ("OWN THE OUTCOME.\nNOT THE TASK.", "A junior employee completes tasks. A leader takes responsibility for achieving the target, regardless of obstacles."),
    ("RESILIENCE IS\nA HARD SKILL.", "Every project will face delays, bugs, or budget cuts. The ability to pivot without panic is leadership."),
    ("THE COST OF\nINACTION IS HIGH.", "Delaying a decision out of fear is a decision in itself. Gather 70% of the data, make the call, and iterate."),
    ("INTEGRITY IS YOUR\nONLY CURRENCY.", "It takes years to build a professional reputation, and exactly one shortcut to destroy it. Guard it fiercely."),
    ("CHALLENGE STATUS QUO\nWITH SOLUTIONS.", "Complaining about a broken system without presenting a better alternative is just whining. Bring the fix."),
    ("EMPOWER YOUR TEAM\nTO FAIL SAFELY.", "If your team is afraid of making mistakes, they will never innovate. Create fallback nets, not blame cultures."),
    ("ALIGNMENT REQUIRES\nCONSTANT REPETITION.", "A leader must repeat the core mission, metrics, and goals until the team can recite them in their sleep."),
    ("SOLVE DISAGREEMENTS\nWITH DATA.", "Stop debating opinions. Run a split test, look at the logs, or audit customer feedback. Let the facts decide."),
    ("THE BEST LEADERS\nCREATE LEADERS.", "Do not try to be the hero who solves everything. Mentor your team so they can replace you, allowing you to scale."),
    ("PROTECT YOUR TEAM\nFROM NOISE.", "Filter out political overhead, shifting corporate directives, and chaotic requests. Keep your team focused."),
    ("CELEBRATE WINS,\nANALYZE LOSSES.", "Give the team credit for success, and take personal responsibility when things fail. That is leadership."),
    ("NEGOTIATE EXPECTATIONS\nUP FRONT.", "Vague scope leads to failed projects. Define the exact definition of done before starting any task."),
    ("LEAD BY\nEXECUTION.", "Do not order people to do things you refuse to do yourself. True leaders roll up their sleeves when needed."),
    ("CLARITY IS\nKINDNESS.", "Vague instructions, shifting deadlines, and hidden performance metrics are toxic. Be direct and transparent."),
    ("THE ART OF\nACTIVE LISTENING.", "Ask open-ended questions, repeat what you heard to verify understanding, and let others finish their thoughts."),
    ("MANAGE YOUR ENERGY.\nNOT JUST TIME.", "Time is finite; energy can be managed. Schedule high-focus tasks during your peak energy hours."),
    ("UNDERSTAND TEAM\nDYNAMICS.", "A high-performance team is not a group of clones. Balance analytical minds with creative builders."),
    ("THE TRAP OF\nCONSENSUS DECISIONS.", "Waiting for everyone to agree leads to slow, mediocre choices. Listen to feedback, make the decision, and lead."),
    ("CHOOSE RESILIENT\nPARTNERS.", "Surround yourself with contractors, vendors, and colleagues who deliver under pressure. Reliability is gold."),
    ("DOCUMENT YOUR DECISION\nLOGS.", "Keep a record of why key architectural or strategic decisions were made. It prevents repetitive debates months later."),
    ("A LEADER ADMITS\nMISTAKES IMMEDIATELY.", "If you make a bad call, own it, fix the course, and move on. Defending a bad decision destroys trust."),
    ("SAY THANK YOU\nPUBLICLY.", "Acknowledge team contributions in public channels. Genuine appreciation is a massive performance multiplier."),
    ("DEVELOP STRATEGIC\nFORESIGHT.", "Do not just look at next week's tasks. Reserve time to analyze industry trends, tech shifts, and market changes."),
    ("EMPATHY IS A\nSTRATEGIC CAPABILITY.", "Understanding your team's personal challenges and motivators allows you to align their work for peak performance."),
    ("CULTIVATE A SOLUTIONS\nMINDSET.", "When someone brings you a problem, they must bring three proposed solutions alongside it."),
    ("NEVER DELEGATE\nWITHOUT ACCOUNTABILITY.", "Assigning a task without an owner and a deadline is just a wish. Assign clear responsibilities."),
    ("THE POWER OF\nANONYMOUS FEEDBACK.", "Run quarterly anonymous surveys to understand the real health of your team and identify toxic bottlenecks."),
    ("STRATEGY IS\nELIMINATION.", "A good strategy is not a list of 20 things to do. It is deciding what 3 things to focus on and what 17 to ignore."),
    ("DEVELOP METRIC\nOWNERSHIP.", "Ensure every team member owns a specific key performance indicator (KPI) that they report on regularly."),
    ("LEADERSHIP IS\nINFLUENCE.", "You do not need a hierarchical title to influence decisions. Build authority through competence and value delivery."),
    ("KEEP YOUR PROMISES.\nALWAYS.", "If you tell a team member or client you will do something, do it. Trust is built in drops and lost in buckets."),
    ("EMBRACE DIFFICULT\nCONVERSATIONS.", "Do not let issues fester. Address performance gaps or interpersonal conflicts immediately before they escalate."),
    ("A LEADER STANDS\nAS A BUFFER.", "Protect your team from external distractions and corporate noise so they can focus on shipping value."),
    ("THE LEGACY OF\nLEADERSHIP.", "The goal is to build a system or team that continues to perform at a high level even after you depart.")
], "professional_growth")

# ─── 6. PRODUCTIVITY & EXECUTION (201 - 240) ───
add_quotes([
    ("PERFECTION IS THE\nENEMY OF SHIPPING.", "Waiting for perfect conditions means you will never launch. Build a functional version, deploy it, and iterate based on live user data."),
    ("FOCUS IS A\nDECREASING RESOURCE.", "Every notification you allow is a leak in your professional focus. Build boundaries around your deep-work hours."),
    ("SYSTEMS OUTPERFORM\nMOTIVATION.", "Motivation gets you started for a day. Resilient daily systems and automated checklists keep you execution-ready for a decade."),
    ("COMPLEXITY IS EASY.\nSIMPLICITY IS HARD.", "Anyone can build a convoluted system with dozens of dependencies. True expertise is reducing a complex problem to its elegant core."),
    ("DELEGATION REQUIRES\nDOCUMENTATION.", "You cannot delegate effectively if the process only exists in your head. Write down the framework before you assign the task."),
    ("THE 80/20 RULE\nIN ACTION.", "Identify the 20% of your efforts that drive 80% of your revenue or user growth. Eliminate the rest without guilt."),
    ("MEASURE THE COI.\nCOST OF INACTION.", "Delaying a project or refactor is not free. It is an active cost in technical debt, lost traffic, and missed conversions."),
    ("BUILDING IS ONLY\n50% OF THE JOB.", "The other 50% is distribution. If you don't market what you build, you have built a secret, not a product."),
    ("PRIORITIZE VALUE\nOVER VOLUME.", "Doing ten low-impact tasks looks busy. Executing one high-leverage initiative creates career inflection points."),
    ("REFUSE TO\nMULTITASK.", "Context switching is a silent killer of engineering productivity. Finish one feature before opening the branch for the next."),
    ("THE POWER OF\nTIME BLOCKING.", "Reserve specific hours for coding, meetings, and email. Do not let external requests dictate your calendar."),
    ("ESTABLISH A 'DONE'\nCHECKLIST.", "Define the exact criteria for a finished task to prevent scope creep and infinite iterations."),
    ("AUTOMATE REPETITIVE\nTASKS INSTANTLY.", "If you have to do a manual task three times, write a script, build a template, or create a macro to handle it."),
    ("THE COGNITIVE COST\nOF OPEN CLUES.", "Unfinished tasks leak energy. Keep a clean workspace, a small inbox, and archive completed tasks."),
    ("SAY 'NO' TO MEETINGS\nWITHOUT AGENDAS.", "If the organizer cannot define the meeting's objective, refuse to attend. Protect your execution blocks."),
    ("THE TWO-MINUTE RULE.", "If a task takes less than two minutes to complete, do it immediately. Do not add it to your todo list."),
    ("BATCH YOUR\nCOMMUNICATIONS.", "Check Slack, WhatsApp, and emails three times a day instead of keeping notifications open. Maintain flow state."),
    ("KEEP A REJECTION\nLOG.", "Track every failed pitch, rejected job, or broken deal. It removes the emotional sting and reveals patterns."),
    ("THE VALUE OF\nSHUT-DOWN ROUTINES.", "End your workday with a 15-minute review. Plan tomorrow's top three tasks, close all tabs, and disconnect."),
    ("DEEP WORK IS\nYOUR MOAT.", "The ability to focus for 4 hours on a complex problem is rare. Guard it like your primary asset."),
    ("REST IS A\nPERFORMANCE TOOL.", "Burnout reduces execution quality. Treat sleep, walks, and workouts as critical parts of your daily schedule."),
    ("CLEAN YOUR WORKSPACE\nEVERY NIGHT.", "A messy desk or cluttered desktop creates visual noise that increases morning cognitive drag."),
    ("USE SINGLE-TASKING\nAPPS.", "Close background apps, browser tabs, and music streams when working on complex code or strategic proposals."),
    ("DOCUMENT AS you\nBUILD.", "Do not wait until the end of a project to write documentation. Write comments, specs, and readmes inline."),
    ("ELIMINATE THE NOISE\nOF THE NEWS.", "Consuming daily news cycles creates anxiety and leaks focus. Focus on what you can control and build."),
    ("THE POWER OF\nREPETITIVE DRILLS.", "Practice core skills regularly. The faster you can type, query, and design, the more time you save for strategy."),
    ("SET MICRO-DEADLINES.", "Give yourself exactly two hours to finish a task that usually takes a day. Speed forces focus and cuts gold-plating."),
    ("USE VERSION CONTROL\nFOR IDEAS.", "Keep a draft folder for copy, branding ideas, and code snippets. Never delete thoughts; just archive them."),
    ("AUTOMATE DEPLOYMENT\nPIPELINES.", "Deploying code manually is a risk. Build automated CI/CD pipelines to ship changes safely and fast."),
    ("THE 5-MINUTE START\nRULE.", "If you are procrastinating on a task, commit to working on it for exactly five minutes. The momentum will carry you."),
    ("TRACK YOUR METRICS\nWITH TELEMETRY.", "Know how your server, site, or campaign is performing. Rely on dashboards, not guesses, to identify issues."),
    ("THE TRAP OF\nADMINISTRATIVE WORK.", "Do not spend your best energy on invoicing, scheduling, or filing. Outsource or automate admin tasks."),
    ("KEEP A DECISION\nJOURNAL.", "Write down key decisions, expected outcomes, and real results. It calibrates your judgment over time."),
    ("THE STRATEGY OF\nTHE CLEAN SHEET.", "When a system becomes too complex, start from scratch in a test sandbox to design a simpler version."),
    ("REFUSE LOW-VALUE\nCONSULTATION.", "Do not book free introductory calls with unqualified prospects. Value your time and set clear entry barriers."),
    ("THE POWER OF\nVISUAL ARCHITECTURES.", "Draw diagrams of your systems and funnels. Visual maps speed up team comprehension and reveal leaks."),
    ("AUTOMATE DATA BACKUPS.", "If your database is not backed up automatically every 24 hours, you are risking catastrophic failure. Build the backup cron."),
    ("THE VALUATION OF\nSKILL EXECUTION.", "Your execution speed is your product's speed. Optimize your IDE, templates, and libraries for fast development."),
    ("LIMIT W.I.P.\nWORK IN PROGRESS.", "Keep active tasks under three at any time. Too many active branches slow down overall completion rates."),
    ("SHIP THE MINIMAL\nVALUABLE UPGRADE.", "Do not hold back a useful feature waiting for a massive release. Ship incremental improvements to users weekly.")
], "productivity")

# ─── 7. PRODUCT & GROWTH STRATEGY (241 - 280) ───
add_quotes([
    ("A BEAUTIFUL UI\nCANNOT SAVE BAD CODE.", "Visual aesthetics are a multiplier. If your core logic is broken or fails to solve a real user pain point, your product will fail."),
    ("RETENTION IS THE\nONLY REAL METRIC.", "Acquiring users is easy with marketing spend. Keeping them active over months is the true test of product-market fit."),
    ("CONSTRAINTS BREED\nCREATIVITY.", "Unlimited budgets create bloated products. Tight constraints force you to build the absolute most critical, high-impact features first."),
    ("FEEDBACK IS\nCONCRETE DATA.", "Stop arguing about design choices in meetings. Build a prototype, put it in front of users, and watch their behavior."),
    ("BILLING INTEGRATION\nIS ENGINE POWER.", "A premium product needs frictionless payment pipelines. Make Daraja and Paystack checkout seamless to optimize conversion."),
    ("SOLVE YOUR OWN\nPAIN POINTS.", "The most successful products start as internal utilities designed to save the developer time. Scale from there."),
    ("CHURN IS A\nSILENT BRAND LEAK.", "High churn rates mean you are pouring water into a leaky bucket. Fix customer satisfaction before scaling advertising."),
    ("VALUE PROP MUST FIT\nIN ONE LINE.", "If a visitor cannot explain what your product does within five seconds of landing, your copy has failed."),
    ("THE HOOK DETERMINES\nTHE VISIT.", "In a world of short attention spans, your hero section must arrest attention immediately or risk bounce rates."),
    ("BUILD PRODUCTS.\nNOT PORTFOLIOS.", "Side projects that solve real problems for real people carry 10x more career weight than clean repository templates."),
    ("THE TRAP OF THE\n'ONE EXTRA FEATURE'.", "Do not delay launching to add one more feature. Launch the core loop first and let users tell you what is missing."),
    ("UNDERSTAND THE ACQUISITION\nCOSTS.", "If it costs KES 500 to acquire a customer who only spends KES 200, you don't have a business—you have a cash drain."),
    ("BUILD FOR A\nSPECIFIC CUSTOMER.", "Trying to serve everyone leads to a generic product. Design for a single user persona first."),
    ("PRICING IS A\nPRODUCT FEATURE.", "Low pricing signals low quality. Set premium prices and deliver exceptional value to match them."),
    ("MONITOR CONVERSION\nFUNNELS IN DETAIL.", "Find the exact step where users drop off. Fixing a checkout leak is easier than buying more traffic."),
    ("USE DYNAMIC A/B\nTESTING.", "Test different headlines, CTAs, and pricing options. Let real user conversions decide your layout."),
    ("THE VALUE OF\nSELF-SERVE ONBOARDING.", "If a user needs to call you to set up an account, your onboarding flow is broken. Automate the setup."),
    ("CUSTOMER SUPPORT IS\nA RETENTION ENGINE.", "Solve issues fast, politely, and effectively. Exceptional support turns unhappy users into loyal advocates."),
    ("BUILD A VIRAL\nLOOP INTO SAAS.", "Design referral bonuses, shareable dashboards, or collaborative tools that encourage users to invite their networks."),
    ("EMPOWER YOUR USERS\nWITH DATA.", "Show users analytics, usage metrics, and progress logs. Value visualization drives engagement."),
    ("THE COST OF CUSTOM\nDEVELOPMENT.", "Avoid building custom features for single clients unless it fits your main product roadmap. Keep the core product clean."),
    ("MONITOR SYSTEM UPTIME\nPUBLICLY.", "Host a public status page. Transparency during outages builds user trust and reduces support ticket volume."),
    ("OPTIMIZE CHECKOUT\nFOR LOCALS.", "In Kenya, integrate M-Pesa STK Push. In global markets, support card networks. Frictionless billing drives sales."),
    ("DO NOT IGNORE\nSEO METRICS.", "Organic search traffic is long-term equity. Build clean, fast, keyword-optimized pages to attract search volume."),
    ("THE POWER OF\nPRODUCT EDUCATION.", "Create tutorials, videos, and documentation. Educated users get more value and stay subscribed longer."),
    ("USE SIMPLE ANALYTICS\nFIRST.", "Do not install complex tracking scripts that slow down page loads. Start with lightweight analytics tools."),
    ("OPTIMIZE YOUR PAGE\nSPEED INDEX.", "A 1-second delay in page load can drop conversions by 7%. Keep your assets, images, and bundles minimized."),
    ("THE VALUE OF\nAN EMAIL SEQUENCE.", "Set up automated onboarding emails to guide new signups through your app's key features during their first week."),
    ("DO NOT BE AFRAID\nTO DEPRECATE.", "Remove features that only 1% of users use. It simplifies your code and interface, reducing maintenance debt."),
    ("PRICING TIERING IS\nAN ANCHOR STRATEGY.", "Use a high-priced 'Enterprise' tier to make your 'Pro' tier look like an easy, high-value decision."),
    ("BUILD RESILIENT WEBHOOK\nHANDLERS.", "Ensure your webhook ingestion endpoints return HTTP 200 immediately. Process payloads in background jobs."),
    ("THE VALUE OF\nCUSTOMER INTELLIGENCE.", "Call your top ten users once a quarter. Ask what they use the most and what features they hate."),
    ("AUTOMATE USER FEEDBACK\nGATHERING.", "Prompt users for ratings or feature requests at key success moments within your application."),
    ("THE MOAT OF\nHIGH SWITCHING COSTS.", "Make it easy for users to import data, but provide so much integrated value that leaving is costly."),
    ("DO NOT COPY\nCOMPETITORS BLINDLY.", "Competitors might be testing bad features or losing money. Focus on your users and your data."),
    ("THE STRATEGY OF\nTHE SINGLE CALL TO ACTION.", "Every landing page must have exactly one primary goal. Do not distract users with multiple options."),
    ("OPTIMIZE COPY FOR\nCOGNITIVE EASE.", "Use simple words, short sentences, and clean lists. Avoid complex jargon that slows down reading."),
    ("THE TRAP OF THE\nFREE TIER.", "A free plan attracts support overhead and non-paying users. Use a limited free trial instead to qualify leads."),
    ("BUILD A ROBUST\nBILLING SYSTEM.", "Integrate platforms like Paystack or Stripe to manage subscriptions, upgrades, downgrades, and cancellations automatically."),
    ("PRODUCT DESIGN IS\nPRODUCT STRATEGY.", "A clean, intuitive interface makes your app easy to use, reducing churn and onboarding friction.")
], "growth_strategy")

# ─── 8. HIGH-PERFORMANCE NETWORKING (281 - 320) ───
add_quotes([
    ("YOUR NETWORK IS\nYOUR LEVERAGE.", "Knowing who to call when a critical system fails or when seeking a strategic partner is the ultimate professional cheat code."),
    ("WARM INTRODUCTIONS\nTRUMP COLD CALLS.", "Build relationships in your industry long before you need to ask for a favor or a job referral."),
    ("GIVE VALUE BEFORE\nYOU ASK FOR IT.", "The best way to build a network is to solve small problems for influential people without expecting immediate return."),
    ("YOUR ALUMNI NETWORK\nIS GOLD.", "Keep in touch with past colleagues and classmates. They are your primary source of vetted, high-trust opportunities."),
    ("ATTEND EVENTS WITH\nA CLEAR PLAN.", "Do not just stand in the corner collecting business cards. Identify three key people you want to speak with and prepare questions."),
    ("CURATE YOUR\nDIGITAL PRESENCE.", "When someone Googles your name, your personal website and LinkedIn should tell a cohesive story of professional competence."),
    ("NEVER BURN\nA BRIDGE.", "Industries are surprisingly small. A colleague you treat poorly today could be the hiring manager or gatekeeper tomorrow."),
    ("MENTORSHIP IS A\nTWO-WAY STREET.", "The best mentors are looking for energetic proteges who can offer fresh insights, digital skills, and execution support."),
    ("BUILD A PERSONAL\nADVISORY BOARD.", "Surround yourself with 3-5 high-trust professionals from different disciplines who can give you objective career guidance."),
    ("FOLLOW UP WITHIN\n24 HOURS.", "Meeting someone is only step one. Sending a brief, personalized message summarizing your conversation secures the connection."),
    ("BUILD IN PUBLIC\nTO ATTRACT PEERS.", "Sharing your coding challenges and shipped products naturally attracts developers, designers, and hiring managers."),
    ("curate your LinkedIn\nfeed deliberately.", "Mute accounts that post noise. Follow and engage with industry leaders to keep your strategic thinking sharp."),
    ("ASK FOR ADVICE,\nGET A PARTNERSHIP.", "When reaching out to senior leaders, ask for their perspective on a specific industry challenge. Build a relationship."),
    ("BUILD RELATIONSHIPS\nWITH INDUSTRY RECRUITERS.", "Recruiters are gatekeepers to the hidden job market. Keep them updated on your skills and career milestones."),
    ("BE CONSISTENT IN\nCOMMUNITY GROUPS.", "Participate actively in developer meetups, slack communities, or WhatsApp groups. Visibility builds trust."),
    ("THE VALUE OF\nTHE COFFEE CHAT.", "Invite professionals you admire for brief, 15-minute chats. Keep it focused, respectful, and value-driven."),
    ("Curate B2B partnerships\nthoughtfully.", "Collaborate with brands that serve the same target audience but don't compete directly with your services."),
    ("BE CAREFUL WHO\nYOU TRUST.", "A professional network requires boundaries. Share sensitive strategic plans only with verified, high-trust peers."),
    ("curate your contact\ndatabase regularly.", "Keep an organized contact list with notes on where you met, what they specialize in, and when you last checked in."),
    ("OFFER TO SHARE\nYOUR CODE SAMPLES.", "Providing reusable libraries or templates to developer peers is a fast way to build reputational currency."),
    ("THE STRATEGY OF\nTHE ALUMNI CHECK-IN.", "Send an annual update to past managers and teammates. Keep yourself top-of-mind for future roles."),
    ("BE POLITE TO\nADMINISTRATIVE STAFF.", "Executive assistants, branch staff, and support teams are the true gatekeepers of access. Treat everyone with respect."),
    ("curate your B2B\npitch deck.", "When presenting to potential partners, focus on their metrics, their audience, and how the partnership helps them win."),
    ("BE PROMPT IN\nCOMMUNICATION.", "Answering emails and Slack messages quickly is a competitive advantage. It signals professionalism and respect."),
    ("curate your target\nclient list.", "Identify 20 companies you want to work with. Research their challenges and build targeted outreach strategies."),
    ("THE VALUE OF\nTHE PRO-BONO PROJECT.", "Doing a short, high-visibility project for a non-profit or industry leader is an investment in case studies and referrals."),
    ("BE APPRECIATIVE OF\nHELP RECEIVED.", "Always send a thank-you note when someone makes an introduction, reviews your CV, or gives you career advice."),
    ("curate your social\nproof diligently.", "Display screenshots of customer ratings, recommendations, and feedback on your personal website and landing pages."),
    ("THE STRATEGY OF\nTHE SPECIFIC REQUEST.", "When asking for help, make it easy to say yes. Ask for a specific introduction or a defined 10-minute chat."),
    ("BUILD HIGH-TRUST B2B\nRELATIONSHIPS.", "Deliver exceptional results for your first B2B clients. Word-of-mouth is the ultimate organic acquisition channel."),
    ("BE CLEAR ABOUT\nYOUR BOUNDARIES.", "Do not let professional networking bleed into your personal focus hours. Protect your calendar from unnecessary meetings."),
    ("curate your portfolio\ncase studies.", "Showcase projects where you solved complex, high-stakes problems. Case studies prove you are worth their time."),
    ("THE VALUE OF\nTHE KNOWLEDGE SHARE.", "Run open webinars or write public articles detailing your technical workflow. Educate your network."),
    ("BE SUPPORTIVE OF\nPEERS IN TRANSITION.", "Help colleagues who have been laid off or are searching for roles. Professional networks are built on reciprocity."),
    ("curate your target\naudience persona.", "Know exactly who you are speaking to on social channels. Tailor your copy to their specific challenges."),
    ("THE STRATEGY OF\nTHE PERSONAL INTRODUCTION.", "Connect two professionals in your network who could benefit from knowing each other. Build social capital."),
    ("BE RESPECTFUL OF\nSENIOR LEADERS' TIME.", "When meeting executives, get straight to the point, present options, and ask for their decision. Value brevity."),
    ("curate your public B2B\ntestimonials.", "Gather quotes from clients detailing the exact financial or operational impact of your consulting work."),
    ("THE VALUE OF\nTHE PRIVATE mastermind.", "Join or build a small group of 4-6 peers who meet monthly to discuss challenges, share resources, and keep each other accountable."),
    ("BE INSPIRED BY\nINDUSTRY LEADERS.", "Study the career trajectories, systems, and communication styles of top B2B professionals. Adapt their strategies.")
], "networking")

# ─── 9. FINANCIAL LITERACY & NEGOTIATION (321 - 360) ───
add_quotes([
    ("YOUR RATE IS AN\nAGREEMENT OF VALUE.", "If you charge commodity rates, clients will treat you like a commodity. Price based on the economic value you create."),
    ("SALARY NEGOTIATION\nIS NOT A CONFLICT.", "It is a collaborative search for a win-win agreement. Align your compensation with their business outcomes."),
    ("DIVERSIFY YOUR\nREVENUE PIPELINES.", "Relying on a single salary is high risk. Build side assets, consulting gigs, or digital products to secure independence."),
    ("UNDERSTAND\nCONTRACTUAL LIMITS.", "Never sign an agreement without reading the termination clauses, IP ownership terms, and payment terms."),
    ("KNOW YOUR COST\nOF DELIVERY.", "Before quoting a fixed fee for a website or software build, calculate your exact hours, hosting fees, and API costs."),
    ("THE PRICE IS NEVER\nTHE PROBLEM.", "If a client says your services are too expensive, it means you have failed to clearly communicate the value of the outcome."),
    ("BUILD AN EMERGENCY\nCASH RUNWAY.", "Having six months of expenses in a high-yield account gives you the power to say 'no' to bad clients and toxic roles."),
    ("REINVEST IN YOUR\nSKILL CAPITAL.", "The highest return on investment is not in stocks or crypto; it is in acquiring high-leverage skills that increase your earnings."),
    ("CHARGE FOR THE\nDIAGNOSIS.", "Do not give away free strategy sessions. True professionals charge for the audit and project roadmapping phases."),
    ("AUTOMATE YOUR\nFINANCIAL FLOWS.", "Set up automatic transfers to savings, investments, and tax reserves the moment a payment hits your bank account."),
    ("THE VALUE OF\nTHE FIXED-FEE PROJECT.", "Avoid hourly rates for consulting. Quote a fixed fee based on project value, encouraging efficiency and execution speed."),
    ("UNDERSTAND TAX\nCOMPLIANCE EARLY.", "Learn local tax laws, deduct business expenses, and file filings on time. Financial compliance is business security."),
    ("REDUCE FIX OVERHEAD\nIN SAAS.", "Keep server costs, software subscriptions, and administrative fees minimal. High cash runway secures building speed."),
    ("INVEST IN LIQUID\nASSETS FIRST.", "Before buying real estate, build a highly liquid portfolio of cash, money market funds, and government treasury bonds."),
    ("THE TRAP OF THE\n'EXPERT FOR EQUITY' DEAL.", "Never build software solely for equity unless you have verified funding, active sales, and equal control. Protect your labor."),
    ("MONITOR SYSTEM COSTS\nWITH CRITICAL TELEMETRY.", "Check your database hosting, API calls, and domain renewals. Stop leaks before they bleed your runway."),
    ("VALUE PROP FOR\nHIGH-TICKET SALES.", "When selling to enterprise clients, show how your system reduces costs, saves time, or increases sales conversions."),
    ("DO NOT IGNORE\nBILLING CHURN METRICS.", "Failed credit card payments are a major source of churn. Set up automated email reminders for expiring cards."),
    ("OPTIMIZE PAYMENT GATEWAY\nROUTING.", "Route transactions through gateways with the lowest fees and highest success rates. In Kenya, support local options."),
    ("REINVEST B2B EARNINGS\nINTO BRAND ASSETS.", "Use consulting revenue to fund custom illustrations, professional copywriting, and high-performance website setups."),
    ("THE TRAP OF\nUNSECURED CREDITS.", "Never deliver final code, files, or assets to a client until the final milestone payment has cleared your bank account."),
    ("MONITOR YOUR LIFETIME\nVALUE (LTV) TO CAC RATIO.", "Ensure your customer's lifetime value is at least 3x the cost of acquiring them. That is the baseline for sustainable growth."),
    ("THE STRATEGY OF\nTHE ANNUAL PRICE RISE.", "Increase your pricing by 5-10% annually to match inflation and reflect your increased skill capital and domain expertise."),
    ("BE CLEAR ABOUT\nEXTRA WORK FEES.", "Scope creep must be billed. If the client asks for features outside the contract, send a change request order immediately."),
    ("UNDERSTAND THE BUSINESS\nOF DIGITAL IP.", "Building digital products allows you to sell the same system infinite times, decoupling your earnings from your hours."),
    ("INVEST IN R&D\nDELIBERATELY.", "Dedicate 10% of your business revenues to researching new tech stack variants, building sandboxes, and learning tools."),
    ("THE VALUE OF\nTHE CONSULTING RETAINER.", "Convert project clients into monthly retainers for ongoing support, securing predictable, recurring cash flow."),
    ("AVOID THE COMFORT\nOF CONSUMER DEBT.", "Never buy depreciating assets or personal lifestyle items on credit. Keep your debt limited to assets that generate cash flow."),
    ("THE POWER OF\nAUTOMATED INVOICING.", "Use invoicing platforms to send bills, track payments, and automatically trigger friendly reminders for overdue invoices."),
    ("NEGOTIATE NET-15\nOR NET-30 TERMS.", "Ensure your B2B agreements specify clear payment terms. Delayed receivables destroy cash flow and project velocity."),
    ("BUILD PORTABLE BUSINESS\nTEMPLATES.", "Keep standard proposal decks, contract templates, and scoping sheets. It reduces B2B administrative overhead."),
    ("THE VALUATION OF\nYOUR INTELLECTUAL CAPITAL.", "Your knowledge base, templates, and systems are business assets. Value them and protect them with intellectual property laws."),
    ("MONITOR SAAS MONTHLY\nRECURRING REVENUE (MRR).", "Track your MRR growth, active users, and customer churn. MRR is the ultimate metric for SaaS valuation."),
    ("THE STRATEGY OF\nTHE BATCH DISCOUNT.", "Offer clients discounts for paying for 6 or 12 months of services upfront, securing cash capital for reinvestment."),
    ("BE HONEST ABOUT\nYOUR FINANCIAL GAPS.", "If you are struggling with cash flow, reduce expenses immediately. Do not rely on prospective deals to save you."),
    ("CURATE A LEAN\nCOST STRUCTURE.", "Review your business bank statements monthly. Cancel software subscriptions, domains, and tools you no longer use."),
    ("THE VALUE OF\nTHE UPSELL COMPONENT.", "Every service should have a natural addon. If they buy a resume, upsell a LinkedIn rewrite. Maximize order value."),
    ("DO NOT BE AFRAID\nTO CHARGE PREMIUMS.", "High-paying clients are often easier to work with, respect boundaries more, and value quality execution over discounts."),
    ("AUTOMATE SUBSCRIPTION BILLING\nRECOVERY.", "Use tools that automatically retry failed subscription cards at optimized times (e.g. paydays) to recover revenue."),
    ("INTEGRITY IN FINANCIALS\nIS ABSOLUTE.", "Keep clear accounting logs, separate personal and business expenses, and pay your taxes. Trust is your ultimate asset.")
], "financials")

# ─── 10. LEADERSHIP & MINDSET (361 - 400) ───
add_quotes([
    ("IMPOSTER SYNDROME\nIS A GOOD SIGN.", "It means you are pushing boundaries and taking on challenges that force you to grow. Embrace the discomfort."),
    ("THE BEST LEADERS\nLISTEN FIRST.", "You cannot solve a team or product bottleneck if you are always the loudest person speaking in the room."),
    ("FAILURES ARE\nCOSTLY LESSONS.", "Do not hide mistakes. Run a post-mortem to analyze the root cause, document the findings, and prevent recurrence."),
    ("CURATE YOUR\nINFORMATION INTAKE.", "Just like junk food ruins your body, consuming low-value social media feeds ruins your strategic thinking capacity."),
    ("WORK ETHIC IS\nTHE BASELINE.", "Hard work is required just to enter the game. Leverage, strategy, and systems are what allow you to win it."),
    ("DEFEND YOUR HEALTH\nFIERCELY.", "Burnout is not a badge of honor. High performance requires physical stamina, regular sleep, and mental clarity."),
    ("BE EXTREMELY EASY\nTO WORK WITH.", "Being brilliant but difficult is a liability. Clean code, prompt communication, and reliability win long term."),
    ("THE PATH IS\nNOT LINEAR.", "Careers move in zig-zags. A lateral move that teaches you high-value digital skills is often better than a standard promotion."),
    ("FOCUS ON IMPACT.\nNOT INTENT.", "Good intentions do not rescue failing projects. Hold yourself and your team accountable to measurable outcomes."),
    ("SHIP IT.\nLEARN. REPEAT.", "The loop of execution is the ultimate teacher. The faster you complete this cycle, the faster you achieve mastery."),
    ("BE GRATEFUL FOR\nTHE HARD PROBLEMS.", "Easy tasks are automated or outsourced. Complex, frustrating problems are the ones that command premium fees."),
    ("CURATE YOUR COGNITIVE\nENVIRONMENT.", "Mute toxic networks, limit negative discussions, and surround yourself with builders. Mindset is contagious."),
    ("THE VALUE OF\nTHE 100-YEAR PERSPECTIVE.", "Will this delay, bug, or failed deal matter in five years? Keep your perspective wide to reduce stress."),
    ("DO NOT TAKE\nCRITICISM PERSONALLY.", "Audit criticism for constructive data. If it has value, use it to improve. If it is noise, filter it out."),
    ("LEADERSHIP IS\nRESPONSIBILITY.", "When things fail, it is your fault. When things succeed, give the credit to your team. That is the deal."),
    ("THE MOAT OF\nUNWAVERING FOCUS.", "Say 'no' to shiny opportunities that distract you from your main goal. Commit to one direction for 18 months."),
    ("BE PROUD OF\nYOUR PROGRESS.", "Celebrate the small wins. Tracking your growth over months builds the confidence needed for high-stakes challenges."),
    ("DO NOT BE AFRAID\nOF INCONVENIENCE.", "The path to mastery is paved with uncomfortable setups, late refactors, and complex integration testing. Roll up your sleeves."),
    ("THE STRATEGY OF\nTHE CALM MIND.", "Panic destroys decision quality. Take three deep breaths, analyze the data logs, and act with deliberate speed."),
    ("DEVELOP STRATEGIC\nPATIENCE.", "Building a business, a brand, or a career takes time. Work intensely on daily tasks, but remain patient for the outcome."),
    ("BE INSPIRED BY\nCOMPETITORS.", "Watch what other builders are shipping. Learn from their designs, adapt their systems, and build better variations."),
    ("THE VALUE OF\nTHE RECOVERY BLOCK.", "Schedule regular downtime away from screens. Walks, reading, and offline hobbies recharge your strategic capacity."),
    ("DO NOT COMPARE\nYOUR START TO THEIR MIDDLE.", "Every industry expert was once a junior developer struggling with syntax. Focus on your personal growth loop."),
    ("INTEGRITY IN LEADERSHIP\nIS NON-NEGOTIABLE.", "If you lose your integrity, you lose your team's trust. Guard your professional ethics with absolute resolve."),
    ("THE STRATEGY OF\nTHE SMALL GROUP.", "Build deep, high-trust relationships with 4-5 fellow builders. A small, aligned mastermind is a career multiplier."),
    ("BE COMPASSIONATE\nTO YOURSELF.", "You will make mistakes, miss deadlines, or write bad queries. Forgive yourself, learn the lesson, and return to building."),
    ("THE VALUE OF\nTHE MENTORSHIP ROLE.", "Teach others. Explaining complex architectures to junior developers calibrates your own systems understanding."),
    ("DO NOT RUSH\nTHE INFLECTION POINT.", "Keep shipping daily improvements. The cumulative effect of 1% upgrades leads to sudden, exponential breakthroughs."),
    ("THE MOAT OF\nA RESILIENT SYSTEM.", "Build systems that run without you. That is the difference between owning a job and owning an enterprise."),
    ("BE RECEPTIVE TO\nCONTRARIAN DATA.", "If the metrics prove your hypothesis was wrong, change your direction. Do not defend a failing strategy out of pride."),
    ("THE STRATEGY OF\nTHE CALM DEPLOYMENT.", "Deploy code early in the morning when the team is active. Never ship complex database migrations on Friday nights."),
    ("BE MINDFUL OF\nYOUR BIASES.", "Audit your decisions for confirmation bias or sunk cost fallacies. Let data calibrate your trajectory."),
    ("THE VALUE OF\nTHE PUBLIC COMMITMENT.", "Declare your goals to your team or your audience. The public accountability forces consistency."),
    ("DO NOT BE SILENT\nABOUT COGNITIVE OVERLOAD.", "If you are burning out, step back and adjust your commitments. A healthy builder is a high-performance builder."),
    ("THE STRATEGY OF\nTHE DOCUMENTED LOGS.", "Write post-mortem reports for system failures. Teach the team how to prevent recurrence, raising collective intelligence."),
    ("BE CONFIDENT IN\nYOUR VALUE PROP.", "You have spent years acquiring digital skills. Do not lower your rates or accept bad terms out of insecurity."),
    ("THE VALUE OF\nTHE STRATEGIC ROADMAP.", "Know where your product or career is headed. A clear vision filters out irrelevant requests and distraction opportunities."),
    ("DO NOT ESCAPE THE\nCREATIVE FLOW.", "When you are in the zone, protect it. Turn off notifications and build until the architecture is complete."),
    ("THE MOAT OF\nAN UNCOMPROMISING BRAND.", "Never sacrifice quality or ethics for short-term profit. A clean reputation is your highest-margin asset."),
    ("KEEP SHIPPING.\nKEEP LEARNING.", "The ultimate career engine is execution. Set your goals, build your systems, and write your digital history.")
], "leadership_mindset")

def main():
    h_font, s_font = None, None
    try:
        h_font = ImageFont.truetype(extra_bold_path, HEADLINE_FONT_SIZE)
        s_font = ImageFont.truetype(medium_path, SUB_FONT_SIZE)
    except Exception as e:
        print(f"Fonts not found, fallback to default: {e}")
        h_font = s_font = ImageFont.load_default()

    total_posters = len(POSTERS_DATA)
    print(f"Starting generation of {total_posters} square posters (1 to 400)...")
    for idx, item in enumerate(POSTERS_DATA, 1):
        # Progress indicator every 20 posters to avoid spamming the log
        if idx % 20 == 0 or idx == 1 or idx == total_posters:
            print(f"Generating [{idx}/{total_posters}]: {item['filename']}...")
        generate_poster(item, h_font, s_font)
    print(f"Successfully generated all {total_posters} posters in: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
