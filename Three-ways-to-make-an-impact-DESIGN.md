---
version: "alpha"
name: "Three ways to make an impact"
description: "Three Ways Feature Section is designed for highlighting product capabilities and value points. Key features include reusable structure, responsive behavior, and production-ready presentation. It is suitable for component libraries and responsive product interfaces."
colors:
  primary: "#FFE66C"
  secondary: "#A9C8FF"
  tertiary: "#B7FF76"
  neutral: "#000000"
  background: "#FFE66C"
  surface: "#000000"
  text-primary: "#131313"
  text-secondary: "#FFFFFF"
  border: "#131313"
  accent: "#FFE66C"
typography:
  display-lg:
    fontFamily: "System Font"
    fontSize: "230px"
    fontWeight: 600
    lineHeight: "230px"
    letterSpacing: "-0.05em"
  body-md:
    fontFamily: "System Font"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "22.75px"
spacing:
  base: "4px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  gap: "12px"
  card-padding: "24px"
  section-padding: "24px"
components:
  card:
    rounded: "30px"
    padding: "24px"
---

## Overview

- **Composition cues:**
  - Layout: Grid
  - Content Width: Bounded
  - Framing: Open
  - Grid: Strong

## Colors

The color system uses dark mode with #FFE66C as the main accent and #000000 as the neutral foundation.

- **Primary (#FFE66C):** Main accent and emphasis color.
- **Secondary (#A9C8FF):** Supporting accent for secondary emphasis.
- **Tertiary (#B7FF76):** Reserved accent for supporting contrast moments.
- **Neutral (#000000):** Neutral foundation for backgrounds, surfaces, and supporting chrome.

- **Usage:** Background: #FFE66C; Surface: #000000; Text Primary: #131313; Text Secondary: #FFFFFF; Border: #131313; Accent: #FFE66C

## Typography

Typography relies on System Font across display, body, and utility text.

- **Display (`display-lg`):** System Font, 230px, weight 600, line-height 230px, letter-spacing -0.05em.
- **Body (`body-md`):** System Font, 14px, weight 400, line-height 22.75px.

## Layout

Layout follows a grid composition with reusable spacing tokens. Preserve the grid, bounded structural frame before changing ornament or component styling. Use 4px as the base rhythm and let larger gaps step up from that cadence instead of introducing unrelated spacing values.

Treat the page as a grid / bounded composition, and keep that framing stable when adding or remixing sections.

- **Layout type:** Grid
- **Content width:** Bounded
- **Base unit:** 4px
- **Scale:** 4px, 8px, 12px, 16px, 18px, 20px, 24px, 32px
- **Section padding:** 24px
- **Card padding:** 24px
- **Gaps:** 12px, 24px

## Elevation & Depth

Depth is communicated through elevated, border contrast, and reusable shadow or blur treatments. Keep those recipes consistent across hero panels, cards, and controls so the page reads as one material system.

Surfaces should read as elevated first, with borders, shadows, and blur only reinforcing that material choice.

- **Surface style:** Elevated
- **Borders:** 1px #131313; 1px #FFFFFF; 1px #000000; 2px #000000
- **Shadows:** rgba(169, 200, 255, 0.3) 0px 25px 50px 0px

### Techniques
- **Gradient border shell:** Use a thin gradient border shell around the main card. Wrap the surface in an outer shell with 24px padding and a 30px radius. Drive the shell with linear-gradient(rgb(255, 92, 53), rgb(255, 92, 53)), linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(0, 0, 0, 0.15)) so the edge reads like premium depth instead of a flat stroke. Keep the actual stroke understated so the gradient shell remains the hero edge treatment. Inset the real content surface inside the wrapper with a slightly smaller radius so the gradient only appears as a hairline frame.

## Shapes

Shapes rely on a tight radius system anchored by 30px and scaled across cards, buttons, and supporting surfaces. Icon geometry should stay compatible with that soft-to-controlled silhouette.

Use the radius family intentionally: larger surfaces can open up, but controls and badges should stay within the same rounded DNA instead of inventing sharper or pill-only exceptions.

- **Corner radii:** 30px, 9999px

## Components

Reuse the existing card surface recipe for content blocks.

### Cards and Surfaces
- **Card surface:** border 1px solid rgba(0, 0, 0, 0), radius 30px, padding 24px, shadow none.
- **Card surface:** border 1px solid rgba(0, 0, 0, 0), radius 30px, padding 24px, shadow none.

## Do's and Don'ts

Use these constraints to keep future generations aligned with the current system instead of drifting into adjacent styles.

### Do
- Do use the primary palette as the main accent for emphasis and action states.
- Do keep spacing aligned to the detected 4px rhythm.
- Do reuse the Elevated surface treatment consistently across cards and controls.
- Do keep corner radii within the detected 30px, 9999px family.

### Don't
- Don't introduce extra accent colors outside the core palette roles unless the page needs a new semantic state.
- Don't mix unrelated shadow or blur recipes that break the current depth system.
- Don't exceed the detected moderate motion intensity without a deliberate reason.

## Motion

Motion feels controlled and interface-led across text, layout, and section transitions. Timing clusters around 150ms and 700ms. Easing favors ease and 0.2. Hover behavior focuses on color and text changes. Scroll choreography uses GSAP ScrollTrigger for section reveals and pacing.

**Motion Level:** moderate

**Durations:** 150ms, 700ms, 500ms

**Easings:** ease, 0.2, 1), cubic-bezier(0.2, 0, cubic-bezier(0

**Hover Patterns:** color, text

**Scroll Patterns:** gsap-scrolltrigger
