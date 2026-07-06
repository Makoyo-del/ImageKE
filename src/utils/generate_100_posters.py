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

HEADLINE_FONT_SIZE = 76    # Heavy headline impact
SUB_FONT_SIZE = 32
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
    print(f"Generated: {data['filename']}")

# Complete 100 Quotes Dataset
POSTERS_DATA = [
    # ─── DIGITAL SKILLS (01 - 10) ───
    {
        "headline": "CODE IS NOT THE GOAL.\nSYSTEM DESIGN IS.",
        "sub": "Writing code is a commodity. Designing resilient systems that scale is where true professional value lies.",
        "filename": "poster_01_digital_skills.png"
    },
    {
        "headline": "SKILLS DEPRECIATE\nFASTER THAN EVER.",
        "sub": "Continuous learning is no longer a career choice; it is an active survival mechanism in digital ecosystems.",
        "filename": "poster_02_digital_skills.png"
    },
    {
        "headline": "API INTEGRATION IS\nA TRUST AGREEMENT.",
        "sub": "A broken webhook is a lost client. Build resilient proxies to protect your transaction flows.",
        "filename": "poster_03_digital_skills.png"
    },
    {
        "headline": "DATA PLAYS NO\nFAVORITES.",
        "sub": "Decisions made on gut feelings are gambling. Decisive professionals build databases to prove hypothesis.",
        "filename": "poster_04_digital_skills.png"
    },
    {
        "headline": "AUTOMATION DOES NOT\nREPLACE THOUGHT.",
        "sub": "It amplifies it. Automating a broken process just creates chaos at scale.",
        "filename": "poster_05_digital_skills.png"
    },
    {
        "headline": "UNDERSTAND THE STACK\nTOP TO BOTTOM.",
        "sub": "Specialization is useful, but the highest-paid engineers can navigate from raw database queries to CSS layouts.",
        "filename": "poster_06_digital_skills.png"
    },
    {
        "headline": "SPEED IS A PRODUCT\nFEATURE.",
        "sub": "If your interface takes three seconds to load, your user has already closed the tab. Optimize every byte.",
        "filename": "poster_07_digital_skills.png"
    },
    {
        "headline": "ERROR HANDLING IS\nNOT AN AFTERTHOUGHT.",
        "sub": "Graceful failures define the difference between a prototype and production-ready enterprise software.",
        "filename": "poster_08_digital_skills.png"
    },
    {
        "headline": "THE BEST CODE\nIS NO CODE.",
        "sub": "Before writing a new service, verify if you can solve the problem by simplifying the architecture.",
        "filename": "poster_09_digital_skills.png"
    },
    {
        "headline": "DOCUMENTATION IS\nYOUR LEGACY.",
        "sub": "If your team cannot run your project without calling you, you haven't built a system—you've built a bottleneck.",
        "filename": "poster_10_digital_skills.png"
    },

    # ─── AI & ETHICAL USE (11 - 20) ───
    {
        "headline": "AI SHOULD EMPOWER.\nNOT REPLACE.",
        "sub": "Use artificial intelligence to automate execution, but never outsource your critical thinking or strategic vision.",
        "filename": "poster_11_ai_ethics.png"
    },
    {
        "headline": "ETHICAL AI IS\nNOT OPTIONAL.",
        "sub": "As systems automate decisions, engineers have a fiduciary duty to eliminate bias and protect user data privacy.",
        "filename": "poster_12_ai_ethics.png"
    },
    {
        "headline": "PROMPTING IS THE\nNEW PROGRAMMING.",
        "sub": "The language of execution has shifted from syntax to intent. Clarity of thought is the ultimate developer tool.",
        "filename": "poster_13_ai_ethics.png"
    },
    {
        "headline": "BIAS IN.\nBIAS OUT.",
        "sub": "Machine learning models mirror our past mistakes. Ethical developers audit training data with extreme skepticism.",
        "filename": "poster_14_ai_ethics.png"
    },
    {
        "headline": "TRANSPARENCY BUILDS\nLASTING TRUST.",
        "sub": "Always declare when a decision, content piece, or interaction has been generated by an automated model.",
        "filename": "poster_15_ai_ethics.png"
    },
    {
        "headline": "AI IS A CO-PILOT.\nYOU STEER.",
        "sub": "Never push generated code to production without understanding every line. You are responsible for the execution.",
        "filename": "poster_16_ai_ethics.png"
    },
    {
        "headline": "THE COGNITIVE OVERHEAD\nOF GENERATION.",
        "sub": "Generating content is easy; validating its correctness, context, and security is the real professional challenge.",
        "filename": "poster_17_ai_ethics.png"
    },
    {
        "headline": "PROTECT YOUR\nINTELLECTUAL PROPERTY.",
        "sub": "Never feed proprietary client code or sensitive user data into public AI models. Maintain absolute boundary limits.",
        "filename": "poster_18_ai_ethics.png"
    },
    {
        "headline": "AUTOMATING HUMAN\nDECISIONS.",
        "sub": "When algorithms decide credit scores, job applications, or legal outcomes, human audit oversight must remain mandatory.",
        "filename": "poster_19_ai_ethics.png"
    },
    {
        "headline": "AI WITHOUT EMOTION\nIS HOLLOW.",
        "sub": "Use machines for structural efficiency. Save your human empathy, relationships, and storytelling for leadership.",
        "filename": "poster_20_ai_ethics.png"
    },

    # ─── PERSONAL BRANDING & VISIBILITY (21 - 30) ───
    {
        "headline": "DOING GREAT WORK\nIS NOT ENOUGH.",
        "sub": "If no one knows you did it, it doesn't count. Build in public to let your output speak for itself.",
        "filename": "poster_21_personal_branding.png"
    },
    {
        "headline": "YOUR AUDIENCE IS\nYOUR EQUITY.",
        "sub": "A professional network is the only career asset that cannot be wiped out by a company layoff.",
        "filename": "poster_22_personal_branding.png"
    },
    {
        "headline": "CLARITY TRUMPS\nCLEVERNESS.",
        "sub": "Your LinkedIn bio should tell a hiring manager exactly what value you deliver within three seconds.",
        "filename": "poster_23_personal_branding.png"
    },
    {
        "headline": "CONSISTENCY BEATS\nINTENSITY.",
        "sub": "One thought-provoking post every week is vastly superior to a sudden burst of updates followed by silence.",
        "filename": "poster_24_personal_branding.png"
    },
    {
        "headline": "YOUR PERSONAL BRAND\nIS A FILTER.",
        "sub": "It should attract the exact clients who value your style, and repel those who demand cheap commodity labor.",
        "filename": "poster_25_personal_branding.png"
    },
    {
        "headline": "HELPING PROFESSIONALS\nGET SEEN.",
        "sub": "Optimize your digital footprint. An ATS-compatible CV is your passport to global remote roles.",
        "filename": "poster_26_personal_branding.png"
    },
    {
        "headline": "OWN YOUR\nCUSTOM DOMAIN.",
        "sub": "Never host your portfolio solely on a third-party platform. Your name should be your digital home.",
        "filename": "poster_27_personal_branding.png"
    },
    {
        "headline": "DIAL IN ON\nYOUR NICHE.",
        "sub": "Trying to speak to everyone means you speak to no one. Be the undisputed expert for one specific problem.",
        "filename": "poster_28_personal_branding.png"
    },
    {
        "headline": "AUTHENTICITY CANNOT\nBE OUTSOURCED.",
        "sub": "People connect with people, not polished corporate jargon. Share your failures alongside your wins.",
        "filename": "poster_29_personal_branding.png"
    },
    {
        "headline": "STAND FOR A\nPUNCHY HYPOTHESIS.",
        "sub": "Generic advice gets ignored. Share contrarian viewpoints backed by data to provoke meaningful discussion.",
        "filename": "poster_30_personal_branding.png"
    },

    # ─── CAREER GROWTH & STRATEGY (31 - 40) ───
    {
        "headline": "A LAYOFF IS\nNOT A FAILURE.",
        "sub": "It is a market reallocation of your talent. Ensure your career assets are portable and decoupled from your employer.",
        "filename": "poster_31_career_growth.png"
    },
    {
        "headline": "NEGOTIATE FOR\nREVENUE IMPACT.",
        "sub": "If you want a higher salary, tie your role directly to user acquisition, retention, or cost reduction.",
        "filename": "poster_32_career_growth.png"
    },
    {
        "headline": "SKILL STACKING\nCREATES UNICORNS.",
        "sub": "An engineer who understands marketing is 10x more valuable than an engineer who only writes code.",
        "filename": "poster_33_career_growth.png"
    },
    {
        "headline": "NEVER STAY\nCOMFORTABLE.",
        "sub": "If you are the smartest person in the room, you are in the wrong room. Find environments that push your limits.",
        "filename": "poster_34_career_growth.png"
    },
    {
        "headline": "PORTFOLIO OVER\nCERTIFICATES.",
        "sub": "Hiring managers care about what you have shipped, not the online courses you have completed. Build real things.",
        "filename": "poster_35_career_growth.png"
    },
    {
        "headline": "THE 6-SECOND SCAN\nIS REAL.",
        "sub": "Your CV doesn't get read; it gets scanned. Put your highest-impact metrics in the top third of the page.",
        "filename": "poster_36_career_growth.png"
    },
    {
        "headline": "THE HIDDEN JOB\nMARKET IS REAL.",
        "sub": "Over 70% of high-tier roles are filled through relationships and referrals, not public job boards.",
        "filename": "poster_37_career_growth.png"
    },
    {
        "headline": "TRANSITIONS REQUIRE\nCOURAGE.",
        "sub": "To move into a new domain, rewrite your past achievements to focus on transferable execution skills.",
        "filename": "poster_38_career_growth.png"
    },
    {
        "headline": "PORTABLE IP IS\nYOUR VALUE.",
        "sub": "Every script, checklist, and strategy framework you develop should be stored in your personal knowledge base.",
        "filename": "poster_39_career_growth.png"
    },
    {
        "headline": "OPTIMIZE FOR LEVERAGE.\nNOT LABOR.",
        "sub": "The goal is to move from selling hours of work to selling high-impact decisions and systems.",
        "filename": "poster_40_career_growth.png"
    },

    # ─── PROFESSIONAL GROWTH & LEADERSHIP (41 - 50) ───
    {
        "headline": "LEADERSHIP HAS\nNO TITLE.",
        "sub": "You do not need permission to lead. Solve problems that others ignore, and ownership will follow naturally.",
        "filename": "poster_41_professional_growth.png"
    },
    {
        "headline": "RADICAL CANDOR\nBUILDS SYSTEMS.",
        "sub": "Politeness that conceals critical flaws is ruinous. Tell your team the truth with absolute kindness.",
        "filename": "poster_42_professional_growth.png"
    },
    {
        "headline": "MEETINGS ARE\nNOT REAL WORK.",
        "sub": "If a meeting doesn't result in a decision or an assignment, it should have been an asynchronous update.",
        "filename": "poster_43_professional_growth.png"
    },
    {
        "headline": "DELEGATION\nREQUIRES TRUST.",
        "sub": "Micromanaging is proof of structural insecurity. Build systems that empower others to make decisions.",
        "filename": "poster_44_professional_growth.png"
    },
    {
        "headline": "PROTECT YOUR\nCRITICAL FOCUS.",
        "sub": "Deep work requires long blocks of uninterrupted time. Protect your schedule from low-priority requests.",
        "filename": "poster_45_professional_growth.png"
    },
    {
        "headline": "FEEDBACK IS\nA GIFT.",
        "sub": "Praise builds confidence, but critical feedback is the raw material for professional mastery. Seek it out.",
        "filename": "poster_46_professional_growth.png"
    },
    {
        "headline": "OWN THE OUTCOME.\nNOT THE TASK.",
        "sub": "A junior employee completes tasks. A leader takes responsibility for achieving the target, regardless of obstacles.",
        "filename": "poster_47_professional_growth.png"
    },
    {
        "headline": "RESILIENCE IS\nA HARD SKILL.",
        "sub": "Every project will face delays, bugs, or budget cuts. The ability to pivot without panic is leadership.",
        "filename": "poster_48_professional_growth.png"
    },
    {
        "headline": "THE COST OF\nINACTION IS HIGH.",
        "sub": "Delaying a decision out of fear is a decision in itself. Gather 70% of the data, make the call, and iterate.",
        "filename": "poster_49_professional_growth.png"
    },
    {
        "headline": "INTEGRITY IS YOUR\nONLY CURRENCY.",
        "sub": "It takes years to build a professional reputation, and exactly one shortcut to destroy it. Guard it fiercely.",
        "filename": "poster_50_professional_growth.png"
    },

    # ─── PRODUCTIVITY & EXECUTION (51 - 60) ───
    {
        "headline": "PERFECTION IS THE\nENEMY OF SHIPPING.",
        "sub": "Waiting for perfect conditions means you will never launch. Build a functional version, deploy it, and iterate based on live user data.",
        "filename": "poster_51_productivity.png"
    },
    {
        "headline": "FOCUS IS A\nDECREASING RESOURCE.",
        "sub": "Every notification you allow is a leak in your professional focus. Build boundaries around your deep-work hours.",
        "filename": "poster_52_productivity.png"
    },
    {
        "headline": "SYSTEMS OUTPERFORM\nMOTIVATION.",
        "sub": "Motivation gets you started for a day. Resilient daily systems and automated checklists keep you execution-ready for a decade.",
        "filename": "poster_53_productivity.png"
    },
    {
        "headline": "COMPLEXITY IS EASY.\nSIMPLICITY IS HARD.",
        "sub": "Anyone can build a convoluted system with dozens of dependencies. True expertise is reducing a complex problem to its elegant core.",
        "filename": "poster_54_productivity.png"
    },
    {
        "headline": "DELEGATION REQUIRES\nDOCUMENTATION.",
        "sub": "You cannot delegate effectively if the process only exists in your head. Write down the framework before you assign the task.",
        "filename": "poster_55_productivity.png"
    },
    {
        "headline": "THE 80/20 RULE\nIN ACTION.",
        "sub": "Identify the 20% of your efforts that drive 80% of your revenue or user growth. Eliminate the rest without guilt.",
        "filename": "poster_56_productivity.png"
    },
    {
        "headline": "MEASURE THE COI.\nCOST OF INACTION.",
        "sub": "Delaying a project or refactor is not free. It is an active cost in technical debt, lost traffic, and missed conversions.",
        "filename": "poster_57_productivity.png"
    },
    {
        "headline": "BUILDING IS ONLY\n50% OF THE JOB.",
        "sub": "The other 50% is distribution. If you don't market what you build, you have built a secret, not a product.",
        "filename": "poster_58_productivity.png"
    },
    {
        "headline": "PRIORITIZE VALUE\nOVER VOLUME.",
        "sub": "Doing ten low-impact tasks looks busy. Executing one high-leverage initiative creates career inflection points.",
        "filename": "poster_59_productivity.png"
    },
    {
        "headline": "REFUSE TO\nMULTITASK.",
        "sub": "Context switching is a silent killer of engineering productivity. Finish one feature before opening the branch for the next.",
        "filename": "poster_60_productivity.png"
    },

    # ─── PRODUCT & GROWTH STRATEGY (61 - 70) ───
    {
        "headline": "A BEAUTIFUL UI\nCANNOT SAVE BAD CODE.",
        "sub": "Visual aesthetics are a multiplier. If your core logic is broken or fails to solve a real user pain point, your product will fail.",
        "filename": "poster_61_growth_strategy.png"
    },
    {
        "headline": "RETENTION IS THE\nONLY REAL METRIC.",
        "sub": "Acquiring users is easy with marketing spend. Keeping them active over months is the true test of product-market fit.",
        "filename": "poster_62_growth_strategy.png"
    },
    {
        "headline": "CONSTRAINTS BREED\nCREATIVITY.",
        "sub": "Unlimited budgets create bloated products. Tight constraints force you to build the absolute most critical, high-impact features first.",
        "filename": "poster_63_growth_strategy.png"
    },
    {
        "headline": "FEEDBACK IS\nCONCRETE DATA.",
        "sub": "Stop arguing about design choices in meetings. Build a prototype, put it in front of users, and watch their behavior.",
        "filename": "poster_64_growth_strategy.png"
    },
    {
        "headline": "BILLING INTEGRATION\nIS ENGINE POWER.",
        "sub": "A premium product needs frictionless payment pipelines. Make Daraja and Paystack checkout seamless to optimize conversion.",
        "filename": "poster_65_growth_strategy.png"
    },
    {
        "headline": "SOLVE YOUR OWN\nPAIN POINTS.",
        "sub": "The most successful products start as internal utilities designed to save the developer time. Scale from there.",
        "filename": "poster_66_growth_strategy.png"
    },
    {
        "headline": "CHURN IS A\nSILENT BRAND LEAK.",
        "sub": "High churn rates mean you are pouring water into a leaky bucket. Fix customer satisfaction before scaling advertising.",
        "filename": "poster_67_growth_strategy.png"
    },
    {
        "headline": "VALUE PROP MUST FIT\nIN ONE LINE.",
        "sub": "If a visitor cannot explain what your product does within five seconds of landing, your copy has failed.",
        "filename": "poster_68_growth_strategy.png"
    },
    {
        "headline": "THE HOOK DETERMINES\nTHE VISIT.",
        "sub": "In a world of short attention spans, your hero section must arrest attention immediately or risk bounce rates.",
        "filename": "poster_69_growth_strategy.png"
    },
    {
        "headline": "BUILD PRODUCTS.\nNOT PORTFOLIOS.",
        "sub": "Side projects that solve real problems for real people carry 10x more career weight than clean repository templates.",
        "filename": "poster_70_growth_strategy.png"
    },

    # ─── HIGH-PERFORMANCE NETWORKING (71 - 80) ───
    {
        "headline": "YOUR NETWORK IS\nYOUR LEVERAGE.",
        "sub": "Knowing who to call when a critical system fails or when seeking a strategic partner is the ultimate professional cheat code.",
        "filename": "poster_71_networking.png"
    },
    {
        "headline": "WARM INTRODUCTIONS\nTRUMP COLD CALLS.",
        "sub": "Build relationships in your industry long before you need to ask for a favor or a job referral.",
        "filename": "poster_72_networking.png"
    },
    {
        "headline": "GIVE VALUE BEFORE\nYOU ASK FOR IT.",
        "sub": "The best way to build a network is to solve small problems for influential people without expecting immediate return.",
        "filename": "poster_73_networking.png"
    },
    {
        "headline": "YOUR ALUMNI NETWORK\nIS GOLD.",
        "sub": "Keep in touch with past colleagues and classmates. They are your primary source of vetted, high-trust opportunities.",
        "filename": "poster_74_networking.png"
    },
    {
        "headline": "ATTEND EVENTS WITH\nA CLEAR PLAN.",
        "sub": "Do not just stand in the corner collecting business cards. Identify three key people you want to speak with and prepare questions.",
        "filename": "poster_75_networking.png"
    },
    {
        "headline": "CURATE YOUR\nDIGITAL PRESENCE.",
        "sub": "When someone Googles your name, your personal website and LinkedIn should tell a cohesive story of professional competence.",
        "filename": "poster_76_networking.png"
    },
    {
        "headline": "NEVER BURN\nA BRIDGE.",
        "sub": "Industries are surprisingly small. A colleague you treat poorly today could be the hiring manager or gatekeeper tomorrow.",
        "filename": "poster_77_networking.png"
    },
    {
        "headline": "MENTORSHIP IS A\nTWO-WAY STREET.",
        "sub": "The best mentors are looking for energetic proteges who can offer fresh insights, digital skills, and execution support.",
        "filename": "poster_78_networking.png"
    },
    {
        "headline": "BUILD A PERSONAL\nADVISORY BOARD.",
        "sub": "Surround yourself with 3-5 high-trust professionals from different disciplines who can give you objective career guidance.",
        "filename": "poster_79_networking.png"
    },
    {
        "headline": "FOLLOW UP WITHIN\n24 HOURS.",
        "sub": "Meeting someone is only step one. Sending a brief, personalized message summarizing your conversation secures the connection.",
        "filename": "poster_80_networking.png"
    },

    # ─── FINANCIAL LITERACY & NEGOTIATION (81 - 90) ───
    {
        "headline": "YOUR RATE IS AN\nAGREEMENT OF VALUE.",
        "sub": "If you charge commodity rates, clients will treat you like a commodity. Price based on the economic value you create.",
        "filename": "poster_81_financials.png"
    },
    {
        "headline": "SALARY NEGOTIATION\nIS NOT A CONFLICT.",
        "sub": "It is a collaborative search for a win-win agreement. Align your compensation with their business outcomes.",
        "filename": "poster_82_financials.png"
    },
    {
        "headline": "DIVERSIFY YOUR\nREVENUE PIPELINES.",
        "sub": "Relying on a single salary is high risk. Build side assets, consulting gigs, or digital products to secure independence.",
        "filename": "poster_83_financials.png"
    },
    {
        "headline": "UNDERSTAND\nCONTRACTUAL LIMITS.",
        "sub": "Never sign an agreement without reading the termination clauses, IP ownership terms, and payment terms.",
        "filename": "poster_84_financials.png"
    },
    {
        "headline": "KNOW YOUR COST\nOF DELIVERY.",
        "sub": "Before quoting a fixed fee for a website or software build, calculate your exact hours, hosting fees, and API costs.",
        "filename": "poster_85_financials.png"
    },
    {
        "headline": "THE PRICE IS NEVER\nTHE PROBLEM.",
        "sub": "If a client says your services are too expensive, it means you have failed to clearly communicate the value of the outcome.",
        "filename": "poster_86_financials.png"
    },
    {
        "headline": "BUILD AN EMERGENCY\nCASH RUNWAY.",
        "sub": "Having six months of expenses in a high-yield account gives you the power to say 'no' to bad clients and toxic roles.",
        "filename": "poster_87_financials.png"
    },
    {
        "headline": "REINVEST IN YOUR\nSKILL CAPITAL.",
        "sub": "The highest return on investment is not in stocks or crypto; it is in acquiring high-leverage skills that increase your earnings.",
        "filename": "poster_88_financials.png"
    },
    {
        "headline": "CHARGE FOR THE\nDIAGNOSIS.",
        "sub": "Do not give away free strategy sessions. True professionals charge for the audit and project roadmapping phases.",
        "filename": "poster_89_financials.png"
    },
    {
        "headline": "AUTOMATE YOUR\nFINANCIAL FLOWS.",
        "sub": "Set up automatic transfers to savings, investments, and tax reserves the moment a payment hits your bank account.",
        "filename": "poster_90_financials.png"
    },

    # ─── LEADERSHIP & MINDSET (91 - 100) ───
    {
        "headline": "IMPOSTER SYNDROME\nIS A GOOD SIGN.",
        "sub": "It means you are pushing boundaries and taking on challenges that force you to grow. Embrace the discomfort.",
        "filename": "poster_91_leadership_mindset.png"
    },
    {
        "headline": "THE BEST LEADERS\nLISTEN FIRST.",
        "sub": "You cannot solve a team or product bottleneck if you are always the loudest person speaking in the room.",
        "filename": "poster_92_leadership_mindset.png"
    },
    {
        "headline": "FAILURES ARE\nCOSTLY LESSONS.",
        "sub": "Do not hide mistakes. Run a post-mortem to analyze the root cause, document the findings, and prevent recurrence.",
        "filename": "poster_93_leadership_mindset.png"
    },
    {
        "headline": "CURATE YOUR\nINFORMATION INTAKE.",
        "sub": "Just like junk food ruins your body, consuming low-value social media feeds ruins your strategic thinking capacity.",
        "filename": "poster_94_leadership_mindset.png"
    },
    {
        "headline": "WORK ETHIC IS\nTHE BASELINE.",
        "sub": "Hard work is required just to enter the game. Leverage, strategy, and systems are what allow you to win it.",
        "filename": "poster_95_leadership_mindset.png"
    },
    {
        "headline": "DEFEND YOUR HEALTH\nFIERCELY.",
        "sub": "Burnout is not a badge of honor. High performance requires physical stamina, regular sleep, and mental clarity.",
        "filename": "poster_96_leadership_mindset.png"
    },
    {
        "headline": "BE EXTREMELY EASY\nTO WORK WITH.",
        "sub": "Being brilliant but difficult is a liability. Clean code, prompt communication, and reliability win long term.",
        "filename": "poster_97_leadership_mindset.png"
    },
    {
        "headline": "THE PATH IS\nNOT LINEAR.",
        "sub": "Careers move in zig-zags. A lateral move that teaches you high-value digital skills is often better than a standard promotion.",
        "filename": "poster_98_leadership_mindset.png"
    },
    {
        "headline": "FOCUS ON IMPACT.\nNOT INTENT.",
        "sub": "Good intentions do not rescue failing projects. Hold yourself and your team accountable to measurable outcomes.",
        "filename": "poster_99_leadership_mindset.png"
    },
    {
        "headline": "SHIP IT.\nLEARN. REPEAT.",
        "sub": "The loop of execution is the ultimate teacher. The faster you complete this cycle, the faster you achieve mastery.",
        "filename": "poster_100_leadership_mindset.png"
    }
]

def main():
    h_font, s_font = None, None
    try:
        h_font = ImageFont.truetype(extra_bold_path, HEADLINE_FONT_SIZE)
        s_font = ImageFont.truetype(medium_path, SUB_FONT_SIZE)
    except Exception as e:
        print(f"Fonts not found, fallback to default: {e}")
        h_font = s_font = ImageFont.load_default()

    print(f"Starting generation of {len(POSTERS_DATA)} square posters...")
    for idx, item in enumerate(POSTERS_DATA, 1):
        print(f"[{idx}/100] ", end="")
        generate_poster(item, h_font, s_font)
    print("All 100 posters generated successfully.")

if __name__ == "__main__":
    main()
