import os
import urllib.request
from PIL import Image, ImageDraw, ImageFont

# Define paths
WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
FONTS_DIR = os.path.join(WORKSPACE_DIR, "src", "assets", "fonts")
OUTPUT_DIR = os.path.join(WORKSPACE_DIR, "Workshop content")

# Create directories if they don't exist
os.makedirs(FONTS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Font URLs (Direct Google Fonts TTF downloads)
FONT_URLS = {
    "Inter-ExtraBold.ttf": "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYMZhrj72A.ttf",
    "Inter-Medium.ttf": "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZhrj72A.ttf"
}

# Download fonts if they don't exist
for font_name, url in FONT_URLS.items():
    font_path = os.path.join(FONTS_DIR, font_name)
    if not os.path.exists(font_path):
        print(f"Downloading {font_name}...")
        try:
            urllib.request.urlretrieve(url, font_path)
            print(f"Successfully downloaded {font_name}")
        except Exception as e:
            print(f"Error downloading {font_name}: {e}")

# Check downloaded fonts
extra_bold_path = os.path.join(FONTS_DIR, "Inter-ExtraBold.ttf")
medium_path = os.path.join(FONTS_DIR, "Inter-Medium.ttf")

# Design Constants
CANVAS_SIZE = (1080, 1080)
BG_COLOR = "#0F172A"       # Deep Navy
TEXT_COLOR = "#FFFFFF"     # White
ACCENT_COLOR = "#F97316"   # Orange
SUB_COLOR = "#94A3B8"      # Slate-400

HEADLINE_FONT_SIZE = 82
SUB_FONT_SIZE = 34
LEFT_MARGIN = 100
RIGHT_MARGIN = 100
MAX_TEXT_WIDTH = CANVAS_SIZE[0] - LEFT_MARGIN - RIGHT_MARGIN  # 880px

HEADLINE_Y_START = 180
SUB_Y_START = 720

def load_fonts():
    try:
        h_font = ImageFont.truetype(extra_bold_path, HEADLINE_FONT_SIZE)
        s_font = ImageFont.truetype(medium_path, SUB_FONT_SIZE)
        return h_font, s_font
    except Exception as e:
        print(f"Error loading fonts: {e}. Falling back to default.")
        return ImageFont.load_default(), ImageFont.load_default()

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
