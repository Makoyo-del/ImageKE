# Workspace Rules - UI/UX Pro Max Integration

You must automatically integrate the UI/UX Pro Max skill rules, guidelines, and standards for any frontend design and development tasks in this workspace.

## 🛠️ Auto-Trigger Guidelines

Always load and consult the **ui-ux-pro-max** skill whenever designing, building, or refactoring:
- Websites & Landing pages
- SaaS applications
- Admin & Analytics dashboards
- CRM, ERP, & Client portals
- Frontend components & Design systems
- Mobile application interfaces

---

## 🎨 Design & Quality Standards

Ensure every generated frontend adheres to these core principles:
1. **Exceptional Visual Hierarchy**: Clear scan paths, card structures, and focal points.
2. **Spacing Consistency**: Maintain a strict spacing scale (e.g., multiples of 4px/8px).
3. **Typography Hierarchy**: Distinct, premium typeface scales (contrast between headers and body).
4. **Accessibility (WCAG AA)**: Clear color contrast ratios, focus states, and aria labels.
5. **Responsive Layouts**: Fluid design across 375px, 768px, 1024px, and 1440px widths.
6. **Modern Aesthetics**: Sleek color systems, micro-interactions (hover states, smooth transitions), and clean information architecture.
7. **Clean & Reusable Components**: Developer-friendly structure, descriptive classnames, and modular components.

---

## 🔄 Development Workflow

Follow this structured approach for all frontend projects:
1. **Analyze Requirements**: Extract product type, audience, key actions, and target technology stack.
2. **Consult UI/UX Pro Max Database**: Execute the design system search script:
   ```bash
   python .agents/skills/ui-ux-pro-max/scripts/search.py "<requirements>" --design-system
   ```
3. **Formulate Architecture**: Mentally wireframe the page structure and define a scalable component hierarchy.
4. **Implementation**: Code production-quality, responsive frontends.
5. **Self-Review Checklist**: Evaluate against UX best practices (e.g. contrast, hover transitions, cursor pointers on clickables).
6. **Refine**: Polish any visual or functional gaps before completing the task.

---

# UI/UX Pro Max Enforcement Policy

The UI/UX Pro Max skill is mandatory for every frontend task.

This includes, but is not limited to:
* Websites
* Landing pages
* Dashboards
* Admin panels
* SaaS products
* CRM systems
* ERP systems
* Mobile applications
* Design systems
* Client portals
* Marketing pages
* Portfolio websites
* Ecommerce interfaces
* Internal tools

## Mandatory Workflow

Before writing any frontend code:
1. Load the UI/UX Pro Max skill.
2. Search the local knowledge base for relevant guidance.
3. Select the most appropriate design language.
4. Build the design system first.
5. Design the page hierarchy.
6. Design the component hierarchy.
7. Implement the UI.
8. Review against the UI/UX Pro Max rules.
9. Refactor until the design meets professional standards.

Skipping any of these steps is not allowed.

---

## Design Requirements

Every frontend must exhibit:
* Clear visual hierarchy
* Consistent spacing using an 8px grid
* Strong typography hierarchy
* Responsive layouts
* WCAG AA accessibility
* Professional color systems
* High contrast where appropriate
* Consistent component sizing
* Reusable design tokens
* Excellent empty states
* Meaningful loading states
* Helpful error states
* Smooth micro-interactions
* Proper animation timing
* Logical information architecture
* High conversion UX for marketing pages
* Excellent usability for SaaS applications

---

## Design Language Selection

Before implementation, determine the most suitable design style.

Examples include:
* Minimal
* Modern SaaS
* Apple-inspired
* Linear
* Stripe-inspired
* Vercel-inspired
* Glassmorphism
* Neumorphism
* Bento Grid
* Enterprise Dashboard
* Fintech
* AI-native
* Data-heavy Analytics
* Material Design

Do not randomly mix styles. Choose one primary style and remain consistent.

---

## Self-Review

Before completing any frontend work, verify:
* Is the layout visually balanced?
* Is the hierarchy obvious within 3 seconds?
* Does every primary action stand out?
* Are spacing and alignment consistent?
* Would this look at home among products from Vercel, Stripe, Notion, Linear, Framer, or Raycast?
* Does it feel polished enough for production?
* Can components be reused elsewhere?
* Is the interface intuitive without explanation?

If any answer is "No", refine the design before presenting it.

---

## Output Standard

Never produce prototype-quality UI. Always generate production-ready frontend code that is:
* Modular
* Maintainable
* Responsive
* Accessible
* Component-based
* Consistent
* Visually polished

The objective is to produce interfaces that meet or exceed the quality of leading modern SaaS products.

---

# Canvas Design & Frontend Design Integration Policy

For any visual art, poster creation, or frontend layout tasks, you must automatically integrate the guidelines from `canvas-design` and `frontend-design` skills:

1. **Design Philosophy Pass (`canvas-design`)**:
   - For any static graphic design or poster creation, you must create a visual philosophy/manifesto (e.g., "Brutalist Joy", "Chromatic Silence") before visual generation.
   - Restrain text to a 90% visual / 10% essential text ratio.

2. **Distinctive Opinionated Design (`frontend-design`)**:
   - Act as an opinionated design lead. Make deliberate, customized palette, typography, and layout choices.
   - Avoid generic AI-generated design templates (e.g., warm cream with high-contrast serif, near-black with bright acid-green, or broadsheet newspaper columns) unless specifically requested.
   - Take at least one justified aesthetic risk per project.

3. **Strict Spatial Layout Integrity (Zero Overlaps, Zero Clipping, Visible Contrast)**:
   - Allow a 10-15% safety margin on all sides of the canvas to prevent text from being cut off. Scale down text tracking or size dynamically to prevent right/left margin overflow.
   - Typography Over Image Safety (Legibility Rule): Never place raw text directly over photographic backgrounds unless there is a contrast ratio of at least 4.5:1. Use solid/semi-transparent backings or gradient scrims if placing text near/over images.
   - Body copy and text blocks must never overlap with image containers or photography. Clear and wrap elements dynamically.
   - Crop safety: Ensure the subject's head is never cut off at the top when applying geometric/circular masks. Use high-quality rounded rectangles, clean borders, or custom geometric masks (pill/arched shapes).
   - High contrast and visibility are mandatory for all footer elements, URLs, and secondary CTAs (like "CLICK TO APPLY" or "REGISTER NOW"). Never use dark/low-opacity text on dark backgrounds.
   - Negative Space & Composition: Keep at least 30-40% of the canvas clear of heavy graphical noise to provide breathing room. Establish a clear visual hierarchy (hook -> secondary details -> CTA).




