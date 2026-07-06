---
name: linkedin-campaign-poster-design
description: Design minimalist, high-contrast LinkedIn posters that provoke curiosity and challenge conventional job-search advice using a two-section typographic hierarchy.
---
# LinkedIn Campaign Poster Design System

Use this skill when designing or generating minimalist, high-contrast LinkedIn campaign posters that provoke curiosity and challenge conventional job-search advice.

## Design Rules & Brief

### 1. Canvas
* **Dimensions**: Square (1080 × 1080 px)
* **Negative Space**: Plenty of negative space around text (margins of at least 100px)
* **Alignment**: Clean, left-aligned layout

### 2. Color Palette
* **Background**: Deep Navy (`#0F172A`), Charcoal (`#111827`), or White (`#FFFFFF`). Maintain consistency across all posters in a series.
* **Accent (use sparingly)**: Bright Blue (`#2563EB`), Emerald (`#10B981`), or Orange (`#F97316`) for punctuation/key highlights.
* **Avoid**: Gradients, bright backgrounds, and excessive colors.

### 3. Layout Hierarchy
* **Top Section (60%)**: Large, bold headline (Maximum: 4–8 words, left aligned).
* **Bottom Section (40%)**: One short supporting statement (Maximum: 2–3 lines).

### 4. Typography
* **Typeface**: Heavy sans-serif (e.g. Inter ExtraBold, Satoshi Bold, General Sans, Manrope ExtraBold).
* **Headline**: Extremely large (e.g., 72pt - 84pt), tight spacing, maximum impact.
* **Supporting Text**: Medium weight, much smaller (e.g., 32pt - 36pt), easy to read.

### 5. Composition
* No icons, stock photos, illustrations, unnecessary shapes, or decorative elements.
* The poster wins through typography, alignment, and negative space alone.

---

## Technical Implementation (Pillow / PIL)

When generating these posters programmatically using Python:
1. **Font Download**: Fetch TTF versions directly from Google Fonts static CDN if not cached locally.
2. **Text Wrapping**: Dynamically calculate line breaks using font bounding boxes (`draw.textbbox` or `draw.textlength`) to respect the 100px left/right margins.
3. **Accent Punctuation**: Parse the text for periods (`.`) and render them in the Accent Color (`#F97316`) while rendering the words in White (`#FFFFFF`).
4. **Spacing**: Use standard line-height multipliers (e.g., `1.15` for headlines, `1.35` for supporting text) to maintain readability.

### Reference Implementation
A reference script is located in `examples/generate_posters.py`.
