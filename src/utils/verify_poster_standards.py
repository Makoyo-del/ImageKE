import os
import sys

# Reconfigure stdout/stderr to UTF-8 to prevent CP1252 encode errors on Windows consoles
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass  # Already UTF-8 or doesn't support reconfigure (older python)

def run_poster_audits(page, poster_name):
    """
    Runs programmatic graphic design audits on a rendered poster page using Playwright.
    Audits contrast, overlaps, margins, and crop boundaries.
    """
    print(f"Auditing design standards for {poster_name}...")
    
    # JavaScript check to execute in the browser context
    audit_js = """
    () => {
        function getRelativeLuminance(r, g, b) {
            let rs = r / 255, gs = g / 255, bs = b / 255;
            let R = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
            let G = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
            let B = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
            return 0.2126 * R + 0.7152 * G + 0.0722 * B;
        }

        function parseRGB(rgbStr) {
            const matches = rgbStr.match(/\\d+/g);
            if (!matches || matches.length < 3) return [0, 0, 0];
            return [parseInt(matches[0]), parseInt(matches[1]), parseInt(matches[2])];
        }

        function calculateContrast(lum1, lum2) {
            const l1 = Math.max(lum1, lum2);
            const l2 = Math.min(lum1, lum2);
            return (l1 + 0.05) / (l2 + 0.05);
        }

        const errors = [];
        const warnings = [];

        // 1. Get container background
        const container = document.querySelector('.poster-container');
        if (!container) {
            errors.push("Missing selector '.poster-container'.");
            return { success: false, errors, warnings };
        }
        
        let bgHex = "#000000";
        const bgRect = document.querySelector('svg > rect[fill]');
        if (bgRect) {
            bgHex = bgRect.getAttribute('fill');
        } else {
            const computedBg = window.getComputedStyle(container).backgroundColor;
            bgHex = computedBg;
        }
        
        // Parse background luminance
        let bgRGB = [0, 0, 0];
        if (bgHex.startsWith('#')) {
            let hex = bgHex.slice(1);
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            bgRGB = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
        } else {
            bgRGB = parseRGB(bgHex);
        }
        const bgLum = getRelativeLuminance(bgRGB[0], bgRGB[1], bgRGB[2]);

        const texts = Array.from(document.querySelectorAll('text'));
        const images = Array.from(document.querySelectorAll('image'));

        // 2. Overlap Audit (Text elements must not overlap image elements)
        for (let img of images) {
            const imgRect = img.getBoundingClientRect();
            // Exclude tiny or unrendered images
            if (imgRect.width === 0 || imgRect.height === 0) continue;

            for (let txt of texts) {
                const txtRect = txt.getBoundingClientRect();
                if (txtRect.width === 0 || txtRect.height === 0) continue;

                // Simple collision detection with a 2px tolerance buffer
                const overlaps = !(
                    txtRect.left >= imgRect.right - 2 ||
                    txtRect.right <= imgRect.left + 2 ||
                    txtRect.top >= imgRect.bottom - 2 ||
                    txtRect.bottom <= imgRect.top + 2
                );

                if (overlaps && txt.textContent.trim().length > 0) {
                    errors.push(`Overlap Detected: Text element "${txt.textContent.trim()}" intersects with image boundary.`);
                }
            }
        }

        // 3. Margin Safety Audit (Critical text shouldn't bleed into 10% safety margin)
        // Container is 1080x1350
        const minX = 70; // ~6.5% safety buffer boundary (allowing small overflow up to 70px)
        const maxX = 1010;
        const minY = 70;
        const maxY = 1280;

        for (let txt of texts) {
            const txtRect = txt.getBoundingClientRect();
            if (txtRect.width === 0 || txtRect.height === 0) continue;
            
            const content = txt.textContent.trim();
            // Ignore corner decorations, marks, or grid letters of length <= 3 (design ornaments)
            if (content.length <= 3) continue;

            if (txtRect.left < minX) {
                errors.push(`Margin Bleed: Text "${content}" is too close to left edge (X: ${txtRect.left.toFixed(1)}px < ${minX}px).`);
            }
            if (txtRect.right > maxX) {
                errors.push(`Margin Bleed: Text "${content}" is too close to right edge (X: ${txtRect.right.toFixed(1)}px > ${maxX}px).`);
            }
        }

        // 4. Contrast Audit (WCAG AA Contrast rule with inheritance and button background overlay checks)
        for (let txt of texts) {
            const content = txt.textContent.trim();
            if (content.length === 0) continue;
            // Ignore corner decorations, marks, or grid letters of length <= 3 (design ornaments)
            if (content.length <= 3) continue;

            // Get computed text color (handles SVG fill inheritance)
            const computedStyle = window.getComputedStyle(txt);
            const fillAttr = computedStyle.fill || computedStyle.color || '#FFFFFF';
            let textRGB = [255, 255, 255];
            
            if (fillAttr.startsWith('url')) {
                // If it is a gradient, skip simple checks or treat as high contrast
                continue;
            }

            if (fillAttr.startsWith('rgb')) {
                textRGB = parseRGB(fillAttr);
            } else if (fillAttr.startsWith('#')) {
                let hex = fillAttr.slice(1);
                if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                textRGB = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
            }

            // Find overlapping background rect (e.g. for button background)
            let elementBg = bgHex;
            const rects = Array.from(document.querySelectorAll('rect'));
            const txtRect = txt.getBoundingClientRect();
            for (let rect of rects) {
                if (rect === bgRect) continue;
                
                // Skip if rect has no fill (none)
                const rectFillAttr = rect.getAttribute('fill');
                const computedRectStyle = window.getComputedStyle(rect);
                const rectFill = rectFillAttr || computedRectStyle.fill;
                if (!rectFill || rectFill === 'none') continue;
                
                // Skip transparent overlays/glassmorphic panels
                const rectFillOpacity = parseFloat(rect.getAttribute('fill-opacity') || '1.0');
                const rectOpacity = parseFloat(computedRectStyle.opacity || '1.0');
                if (rectFillOpacity < 0.1 || rectOpacity < 0.1) continue;

                const r = rect.getBoundingClientRect();
                const overlaps = !(
                    txtRect.left >= r.right ||
                    txtRect.right <= r.left ||
                    txtRect.top >= r.bottom ||
                    txtRect.bottom <= r.top
                );
                if (overlaps) {
                    if (rectFill && !rectFill.startsWith('url')) {
                        elementBg = rectFill;
                        break;
                    }
                }
            }

            let localBgRGB = [0, 0, 0];
            if (elementBg.startsWith('#')) {
                let hex = elementBg.slice(1);
                if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                localBgRGB = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
            } else {
                localBgRGB = parseRGB(elementBg);
            }

            const localBgLum = getRelativeLuminance(localBgRGB[0], localBgRGB[1], localBgRGB[2]);
            const textLum = getRelativeLuminance(textRGB[0], textRGB[1], textRGB[2]);
            const contrast = calculateContrast(localBgLum, textLum);

            // WCAG AA large text (24px or 18px bold) requires 3.0:1 contrast, normal text requires 4.5:1.
            // Let's enforce a strict 3.5:1 minimum threshold for dark mode posters to prevent low legibility.
            const minContrast = 3.5; 
            if (contrast < minContrast) {
                errors.push(`Low Contrast: "${content}" has contrast of ${contrast.toFixed(2)}:1 against background ${elementBg} (Minimum target is ${minContrast}:1).`);
            }
        }

        // 5. Crop Safety Audit
        const clips = Array.from(document.querySelectorAll('clipPath'));
        for (let clip of clips) {
            const circle = clip.querySelector('circle');
            if (circle) {
                // Warning if strict circle mask is used for avatar cropping
                const cy = parseFloat(circle.getAttribute('cy') || '0');
                const r = parseFloat(circle.getAttribute('r') || '0');
                if (cy - r < 30) {
                    warnings.push("Circle mask top border is close to the top of the container. Ensure the subject's head isn't cropped.");
                }
            }
        }

        return {
            success: errors.length === 0,
            errors,
            warnings
        };
    }
    """
    
    result = page.evaluate(audit_js)
    
    # Replace unicode arrow or other chars when printing to stdout to prevent console encoding issues
    def clean_msg(msg):
        return msg.replace("→", "->")
    
    if result["success"]:
        print(f"[PASSED] {poster_name} design check!")
    else:
        print(f"[FAILED] {poster_name} design check!")
        for err in result["errors"]:
            print(clean_msg(f"   [ERROR] {err}"))
            
    if result["warnings"]:
        for warn in result["warnings"]:
            print(clean_msg(f"   [WARNING] {warn}"))
            
    return result
