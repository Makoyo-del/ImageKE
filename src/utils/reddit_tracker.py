import os
import sys
import json
import time
import urllib.request
import urllib.parse
import ssl
import argparse
from typing import List, Dict, Tuple, Optional

# Ensure UTF-8 output formatting on Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ==========================================
# ENV LOADER (Zero External Dependencies)
# ==========================================
def load_env_file(env_path: str = ".env"):
    """Load variables from .env file into os.environ if present."""
    if not os.path.exists(env_path):
        alt_paths = [
            os.path.join(os.path.dirname(__file__), ".env"),
            os.path.join(os.path.dirname(__file__), "..", ".env"),
            os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        ]
        for alt in alt_paths:
            if os.path.exists(alt):
                env_path = alt
                break

    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'").strip('"')
                    if key and not os.getenv(key):
                        os.environ[key] = val
        except Exception as e:
            print(f"[!] Error loading .env from {env_path}: {e}")

load_env_file()

# ==========================================
# CONFIGURATION DEFAULTS FROM ENV
# ==========================================
USER_AGENT = os.getenv("REDDIT_USER_AGENT", "windows:com.dunmak.leadradar:v1.0.0 (by /u/RedditLeadBot)")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

BUSINESS_NAME = os.getenv("BUSINESS_NAME", "My Business")
BUSINESS_DESCRIPTION = os.getenv("BUSINESS_DESCRIPTION", "An AI tool that automates lead tracking and social monitoring.")
BUSINESS_WEBSITE = os.getenv("BUSINESS_WEBSITE", "")

raw_subs = os.getenv("TARGET_SUBREDDITS", "SaaS, smallbusiness, marketing, startups, entrepreneur")
SUBREDDITS = [s.strip().replace("r/", "") for s in raw_subs.split(",") if s.strip()]

raw_keywords = os.getenv("BUSINESS_KEYWORDS", "looking for, recommend, best tool for, alternative to, hire, agency, need help with, anyone use, suggestions for")
BUYER_KEYWORDS = [k.strip().lower() for k in raw_keywords.split(",") if k.strip()]

INTENT_THRESHOLD = int(os.getenv("INTENT_THRESHOLD", "60"))

# Real-time lead event queue for UI SSE streaming
RECENT_LEADS_STREAM: List[Dict] = []

# ==========================================
# RATE-LIMITING & PUBLIC REDDIT INGESTION ENGINE
# ==========================================
_LAST_REQUEST_TIMESTAMP: float = 0.0

def _rate_limit_delay(min_seconds: float = 2.0):
    """Enforce minimum delay between HTTP requests to comply with rate limits."""
    global _LAST_REQUEST_TIMESTAMP
    elapsed = time.time() - _LAST_REQUEST_TIMESTAMP
    if elapsed < min_seconds:
        time.sleep(min_seconds - elapsed)
    _LAST_REQUEST_TIMESTAMP = time.time()

def fetch_subreddit_posts_rss(subreddit: str) -> List[Dict]:
    """Fallback fetcher using Reddit's public RSS feed with rate limiting."""
    import xml.etree.ElementTree as ET
    _rate_limit_delay(2.0)
    url = f"https://www.reddit.com/r/{subreddit}/new/.rss"
    headers = {"User-Agent": USER_AGENT}
    req = urllib.request.Request(url, headers=headers)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    posts = []
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            if response.status == 200:
                content = response.read()
                root = ET.fromstring(content)
                ns = {'atom': 'http://www.w3.org/2005/Atom'}
                for entry in root.findall('atom:entry', ns):
                    title = entry.findtext('atom:title', '', ns)
                    link_elem = entry.find('atom:link', ns)
                    link = link_elem.attrib.get('href', '') if link_elem is not None else ''
                    entry_id = entry.findtext('atom:id', '', ns)
                    author = entry.findtext('atom:author/atom:name', '', ns)
                    posts.append({
                        "id": entry_id,
                        "title": title,
                        "text": title,
                        "url": link,
                        "author": author,
                        "subreddit": subreddit,
                        "num_comments": 0,
                        "score": 0
                    })
    except urllib.error.HTTPError as he:
        if he.code == 429:
            print(f"[!] HTTP 429 Rate Limit hit on r/{subreddit}. Pausing 10s...")
            time.sleep(10.0)
    except Exception as e:
        pass
    return posts

def fetch_subreddit_posts(subreddit: str, limit: int = 15) -> List[Dict]:
    """Fetch recent posts from public JSON feed with rate limiting and RSS fallback."""
    _rate_limit_delay(2.0)
    url = f"https://www.reddit.com/r/{subreddit}/new.json?limit={limit}"
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json"
    }

    req = urllib.request.Request(url, headers=headers)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                posts = []
                for item in data.get("data", {}).get("children", []):
                    post_data = item.get("data", {})
                    posts.append({
                        "id": post_data.get("id"),
                        "title": post_data.get("title", ""),
                        "text": post_data.get("selftext", ""),
                        "url": f"https://reddit.com{post_data.get('permalink')}",
                        "author": post_data.get("author"),
                        "created_utc": post_data.get("created_utc"),
                        "subreddit": subreddit,
                        "num_comments": post_data.get("num_comments", 0),
                        "score": post_data.get("score", 0)
                    })
                if posts:
                    return posts
    except urllib.error.HTTPError as he:
        if he.code == 429:
            print(f"[!] HTTP 429 Rate Limit hit on r/{subreddit}. Pausing 10s...")
            time.sleep(10.0)
    except Exception as e:
        pass

    return fetch_subreddit_posts_rss(subreddit)

# ==========================================
# GEMINI AI INTENT & REPLY GENERATOR
# ==========================================
def evaluate_buyer_intent_keyword(post: Dict) -> Dict:
    """Keyword-based intent evaluation fallback."""
    content = (post["title"] + " " + post["text"]).lower()
    matched_keywords = [kw for kw in BUYER_KEYWORDS if kw in content]
    
    intent_score = len(matched_keywords) * 25
    if any(k in content for k in ["looking for", "hire", "need help", "recommend"]):
        intent_score += 25
        
    score = min(intent_score, 100)
    
    draft = (
        f"Hey there! If you're looking for solutions around this, {BUSINESS_NAME} ({BUSINESS_WEBSITE}) "
        f"might be worth checking out. It focuses on {BUSINESS_DESCRIPTION}. Hope this helps!"
    )
    
    return {
        "is_lead": score >= INTENT_THRESHOLD or len(matched_keywords) > 0,
        "score": score,
        "reason": f"Matched buyer keywords: {', '.join(matched_keywords)}" if matched_keywords else "General intent detected",
        "matched_keywords": matched_keywords,
        "drafted_reply": draft,
        "gemini_ok": False
    }

def analyze_with_gemini(post: Dict, api_key: str = "") -> Dict:
    """Use Gemini AI to analyze post intent & draft a natural value-first Reddit reply."""
    key = api_key or GEMINI_API_KEY
    if not key:
        fallback = evaluate_buyer_intent_keyword(post)
        fallback["reason"] = "⚠️ Gemini API key missing. Using fallback keyword match."
        return fallback

    # Use standard stable endpoint with gemini-2.0-flash supported by new AQ. keys
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
    
    prompt = f"""
You are an expert Reddit Marketing & Lead Generation Strategist. Analyze the following Reddit post to determine if the author is a prospective buyer or lead for the described business.

[BUSINESS PROFILE]
Business Name: {BUSINESS_NAME}
Business Description: {BUSINESS_DESCRIPTION}
Business Website: {BUSINESS_WEBSITE}

[REDDIT POST TO ANALYZE]
Subreddit: r/{post['subreddit']}
Title: {post['title']}
Content: {post['text']}

[TASK]
1. Evaluate intent: Is this user looking for tools, advice, agency help, or solutions related to {BUSINESS_NAME}?
2. Score buyer intent from 0 to 100%.
3. Draft a helpful, authentic, 2-paragraph Reddit reply:
   - Paragraph 1: Provide genuine, high-value advice addressing their specific problem directly.
   - Paragraph 2: Naturally suggest 2-3 approaches/tools, subtly including {BUSINESS_NAME} ({BUSINESS_WEBSITE}) as one option. Do NOT sound spammy or overly salesy.

[OUTPUT FORMAT]
Return ONLY a valid raw JSON object with no markdown surrounding it:
{{
  "is_lead": true/false,
  "intent_score": 85,
  "reason": "Short 1-sentence explanation of intent score",
  "drafted_reply": "The drafted 2-paragraph Reddit reply..."
}}
"""

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"}
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=12) as response:
            if response.status == 200:
                raw_res = json.loads(response.read().decode("utf-8"))
                text_out = raw_res["candidates"][0]["content"]["parts"][0]["text"].strip()
                data = json.loads(text_out)
                score = int(data.get("intent_score", 0))
                return {
                    "is_lead": score >= INTENT_THRESHOLD,
                    "score": score,
                    "reason": data.get("reason", "AI intent verified"),
                    "matched_keywords": ["Gemini AI Scored"],
                    "drafted_reply": data.get("drafted_reply", ""),
                    "gemini_ok": True
                }
    except urllib.error.HTTPError as he:
        err_msg = f"HTTP Error {he.code}"
        try:
            err_json = json.loads(he.read().decode("utf-8"))
            err_msg = err_json.get("error", {}).get("message", err_msg)
        except:
            pass
        print(f"[!] Gemini AI HTTP Error: {err_msg}")
        fallback = evaluate_buyer_intent_keyword(post)
        fallback["reason"] = f"⚠️ Gemini API Key invalid ({err_msg}). Using fallback keyword match."
        return fallback
    except Exception as e:
        print(f"[!] Gemini AI API Error (falling back to keyword evaluation): {e}")
        fallback = evaluate_buyer_intent_keyword(post)
        fallback["reason"] = f"⚠️ Gemini connection error ({e}). Using fallback keyword match."
        return fallback

    return evaluate_buyer_intent_keyword(post)

# ==========================================
# TELEGRAM DISPATCHER
# ==========================================
def send_telegram_alert(bot_token: str, chat_id: str, alert_text: str):
    """Send markdown alert directly to Telegram."""
    token = bot_token or TELEGRAM_BOT_TOKEN
    cid = chat_id or TELEGRAM_CHAT_ID
    if not token or not cid:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({
        "chat_id": cid,
        "text": alert_text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": False
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=8) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"[!] Telegram Alert Error: {e}")
        return False

# ==========================================
# MONITOR LOOP & CLI
# ==========================================
def run_monitor(poll_interval_seconds: int = 60, telegram_token: str = "", telegram_chat_id: str = ""):
    """Continuous monitoring loop with rate limiting & live stream queue."""
    global RECENT_LEADS_STREAM
    print("=" * 60)
    print("🚀 REDDIT BUYER INTENT & AI RADAR TRACKER RUNNING")
    print(f"Subreddits: {', '.join(SUBREDDITS)}")
    print(f"Business Profile: {BUSINESS_NAME}")
    print(f"Intent Score Threshold: >= {INTENT_THRESHOLD}%")
    print(f"Telegram Notifications: {'ENABLED' if (telegram_token or TELEGRAM_BOT_TOKEN) else 'DISABLED (Terminal Only)'}")
    print(f"Gemini AI Engine: {'ACTIVE' if GEMINI_API_KEY else 'DISABLED (Keyword Mode)'}")
    print("=" * 60)

    seen_posts = set()

    while True:
        try:
            for sub in SUBREDDITS:
                posts = fetch_subreddit_posts(sub)
                for post in posts:
                    if post["id"] in seen_posts:
                        continue
                    seen_posts.add(post["id"])

                    analysis = analyze_with_gemini(post)
                    if analysis["is_lead"]:
                        lead_data = {
                            "id": post["id"],
                            "subreddit": post["subreddit"],
                            "title": post["title"],
                            "text": post["text"],
                            "url": post["url"],
                            "author": post.get("author", "anonymous"),
                            "score": analysis["score"],
                            "reason": analysis["reason"],
                            "drafted_reply": analysis["drafted_reply"],
                            "timestamp": time.strftime("%H:%M:%S")
                        }
                        
                        RECENT_LEADS_STREAM.insert(0, lead_data)
                        if len(RECENT_LEADS_STREAM) > 50:
                            RECENT_LEADS_STREAM.pop()

                        alert = (
                            f"🚨 *NEW HIGH-INTENT LEAD IN r/{post['subreddit']}*\n\n"
                            f"📌 *Title:* {post['title']}\n"
                            f"🎯 *AI Intent Score:* {analysis['score']}%\n"
                            f"💡 *Why:* {analysis['reason']}\n"
                            f"🔗 *Link:* {post['url']}\n\n"
                            f"✍️ *Pre-Drafted AI Reply (Tap to Copy):*\n"
                            f"```\n{analysis['drafted_reply']}\n```"
                        )
                        print("\n" + "=" * 60)
                        print(alert)
                        print("=" * 60)
                        
                        send_telegram_alert(telegram_token, telegram_chat_id, alert)
        except Exception as e:
            print(f"[!] Monitor Loop Error: {e}")

        time.sleep(poll_interval_seconds)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reddit Buyer Intent & AI Lead Radar Tracker")
    parser.add_argument("--watch", action="store_true", help="Run 24/7 continuous monitoring loop")
    parser.add_argument("--interval", type=int, default=60, help="Polling interval in seconds (default: 60)")
    parser.add_argument("--token", type=str, default="", help="Telegram Bot Token for alerts")
    parser.add_argument("--chat-id", type=str, default="", help="Telegram Chat ID for alerts")
    args = parser.parse_args()

    if args.watch:
        try:
            run_monitor(poll_interval_seconds=args.interval, telegram_token=args.token, telegram_chat_id=args.chat_id)
        except KeyboardInterrupt:
            print("\n[!] Tracker stopped by user.")
    else:
        print("=" * 60)
        print("🔍 RUNNING SINGLE SCAN & GEMINI AI ANALYSIS PREVIEW")
        print("=" * 60)
        found_leads = 0
        for sub in SUBREDDITS[:2]:
            posts = fetch_subreddit_posts(sub, limit=5)
            for post in posts:
                res = analyze_with_gemini(post)
                if res["is_lead"]:
                    found_leads += 1
                    print(f"\n🚨 [HIGH INTENT LEAD DETECTED] r/{sub}")
                    print(f"   📌 Title: {post['title']}")
                    print(f"   🎯 Intent Score: {res['score']}% | Reason: {res['reason']}")
                    print(f"   🔗 Link: {post['url']}")
                    print(f"   ✍️ Drafted Reply Preview:\n   {res['drafted_reply'][:150]}...")

        print("\n" + "=" * 60)
        print(f"Total leads detected in scan: {found_leads}")
        print("💡 To run 24/7 continuous monitoring:")
        print('   python "src/utils/reddit_tracker.py" --watch')
        print("💡 Launch Web Setup Dashboard:")
        print('   python "reddit plan/gui_setup.py"')
        print("=" * 60)
