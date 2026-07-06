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
CANVAS_SIZE = (1584, 396)
BG_COLOR = "#0B0F19"       # Deep slate blue
TEXT_COLOR = "#FFFFFF"     # White
ACCENT_COLOR = "#F97316"   # Orange
SUB_COLOR = "#94A3B8"      # Slate-400
HIGHLIGHT_COLOR = "#38BDF8" # Light Blue for digital products

# Font sizes
HEADLINE_SIZE = 52
SUBTEXT_SIZE = 22
CTA_SIZE = 20

def generate_banner():
    # Load fonts
    try:
        h_font = ImageFont.truetype(extra_bold_path, HEADLINE_SIZE)
        s_font = ImageFont.truetype(medium_path, SUBTEXT_SIZE)
        c_font = ImageFont.truetype(extra_bold_path, CTA_SIZE)
    except Exception as e:
        print(f"Fonts not found: {e}. Falling back to default.")
        h_font = s_font = c_font = ImageFont.load_default()

    # Create base image
    img = Image.new("RGB", CANVAS_SIZE, color=BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Left boundary for text (desktop/mobile profile photo safe zone)
    # Profile pic takes about 0 to 450px on desktop (including overlay space)
    text_x = 520

    # Draw a subtle structural grid line to anchor the text section
    draw.line([(text_x - 40, 60), (text_x - 40, 336)], fill="#1E293B", width=2)
    draw.ellipse([(text_x - 42, 60 - 2), (text_x - 38, 60 + 2)], fill=ACCENT_COLOR)

    # 1. Accent Label (Marketing & Growth Specialist)
    draw.text((text_x, 60), "MARKETING OFFICER & DIGITAL ARCHITECT", font=c_font, fill=ACCENT_COLOR)

    # 2. Main Headline
    # Line 1: DRIVING ADOPTION.
    # Line 2: AMPLIFYING VISIBILITY.
    y_offset = 100
    line_spacing = int(HEADLINE_SIZE * 1.15)

    headlines = [
        "DRIVING ADOPTION.",
        "AMPLIFYING VISIBILITY."
    ]

    for line in headlines:
        parts = line.split('.')
        current_x = text_x
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
        y_offset += line_spacing

    # 3. Supporting copy
    y_offset = 236
    sub_line_spacing = int(SUBTEXT_SIZE * 1.4)
    
    subtext_lines = [
        "Campaigns at Equity Bank | Executing USSD, Mobile Apps & Chatbot Marketing",
        "Founder of ImageKE | Helping professionals get seen, optimized & hired"
    ]

    for line in subtext_lines:
        draw.text((text_x, y_offset), line, font=s_font, fill=SUB_COLOR)
        y_offset += sub_line_spacing

    # 4. Contact / CTA Row
    y_offset = 312
    email_label = "CONNECT: "
    email_val = "duncan@duncanmakoyo.com"
    
    # Draw email label in sub-color
    draw.text((text_x, y_offset), email_label, font=s_font, fill=SUB_COLOR)
    label_bbox = draw.textbbox((text_x, y_offset), email_label, font=s_font)
    email_x = label_bbox[2]
    
    # Draw email value in white/orange
    draw.text((email_x, y_offset), email_val, font=s_font, fill=TEXT_COLOR)

    # Save output
    output_path = os.path.join(OUTPUT_DIR, "linkedin_banner.png")
    img.save(output_path, "PNG")
    print(f"Successfully generated LinkedIn banner at: {output_path}")

if __name__ == "__main__":
    generate_banner()
