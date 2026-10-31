---
name: frontend-design
description: Distinctive, anti-cookie-cutter frontend visual engineering, high-craft UI architecture, stateful components, and production React/Vite implementations.
---
# Frontend Visual Engineering & Architecture Engine (v4.0 — Enterprise Edition)

Use this skill whenever building or refactoring modern frontend interfaces, web applications, dashboards, or high-converting landing pages. Enforces distinctive art direction, stateful resilience (loading skeletons, error boundaries, empty states), and zero-placeholder production code.

---

## 🚨 1. CORE MANDATE & INTEGRITY RULES (ZERO EXCEPTIONS)
1. **ZERO-PLACEHOLDER PRODUCTION CODE**: Never output mock `Lorem Ipsum`, `// TODO: implement later`, or dummy `[TBD]` strings. All interfaces must render real systems copy, real metrics, and operational logic.
2. **COMPLETE 4-STATE RESILIENCE**: Every data-driven component must explicitly handle 4 operational states:
   - **Default State**: Rich interactive presentation.
   - **Loading State**: Shimmer skeleton with matching layout bounds.
   - **Empty State**: Clear call-to-action inviting user action.
   - **Error State**: Graceful Error Boundary with actionable recovery.
3. **ZERO TEMPLATED CLICHÉS**: Avoid generic AI web design tropes. Implement custom spatial hierarchy, curated typography pairings, and tactile micro-interactions.

---

## 🎨 2. DYNAMIC FRONTEND ARCHETYPES & MODES

### Archetype 1: `TECHNICAL_CONSOLE` (HookBunker, Developer Tools, API Gateways)
- **Aesthetic**: Linear / Stripe Developer aesthetic. Dark obsidian surfaces (`#09090B`), subtle border highlights, glowing status badges, monospace tabular data (`JetBrains Mono`).
- **Signature Element**: Interactive live webhook simulator or payload inspection pane with syntax coloring.

### Archetype 2: `EXECUTIVE_FINTECH` (Equity Bank ATS Simulator, Financial OS, High-Trust Portals)
- **Aesthetic**: Apple Keynote / Stripe Press clarity. Cool Alabaster canvas (`#F8FAFC`), crisp white cards with multi-layered micro-shadows, Royal Blue (`#2563EB`) and Emerald accents.
- **Signature Element**: Live interactive scoring dials, step-by-step audit pipelines, and vector SVG comparison flows.

### Archetype 3: `HIGH_CONVERSION_SAAS` (WhatsApp Autonomous Commerce, Product Landing Pages)
- **Aesthetic**: High contrast, bold value thesis, sticky floating action bars, social proof strips, animated interactive demos.
- **Signature Element**: 0-second simulated chat checkout or interactive ROI/pricing calculator.

---

## 📐 3. STRICT TECHNICAL & PERFORMANCE GUARDRAILS
1. **Layout & Responsiveness**:
   - Zero horizontal scroll between `360px` (small mobile) and `2560px` (ultra-wide desktop).
   - Use CSS clamp math for responsive typography: `font-size: clamp(2rem, 5vw + 1rem, 4.5rem)`.
   - Grid-gap rhythm: strictly 16px, 24px, or 32px based on the 8-point system.
2. **Performance Budgets**:
   - Main thread interaction budget: Micro-interactions must execute in `<100ms`.
   - Cumulative Layout Shift (CLS): `< 0.05`. Use explicit width/height or aspect ratios on media and skeletons.
3. **Touch & Keyboard Accessibility**:
   - Interactive targets: minimum `44px × 44px`.
   - Visible focus indicator: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.

---

## 🧩 4. REUSABLE PRODUCTION PRIMITIVES (REACT + TAILWIND)

### A. Shimmer Skeleton Primitive (`components/ui/skeleton.tsx`)
```tsx
import { cn } from "@/lib/utils"

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent", className)}
      {...props}
    />
  )
}
```

### B. Standard Error Boundary Component (`components/common/ErrorBoundary.jsx`)
```jsx
import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive my-4">
          <h3 className="font-semibold text-lg">Component Rendering Failure</h3>
          <p className="text-sm mt-1 text-muted-foreground">{this.state.error?.message || "An unexpected error occurred."}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90"
          >
            Retry Component
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

### C. Stateful Empty State Blueprint
```tsx
export function EmptyState({ title, description, actionText, onAction }: { title: string; description: string; actionText?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card/50">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {actionText && onAction && (
        <button onClick={onAction} className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
          {actionText}
        </button>
      )}
    </div>
  )
}
```

---

## 🔗 5. CROSS-SKILL SYNCHRONIZATION
- **Consumes from `design-system`**: Strictly adopts CSS tokens and variables (`var(--bg-canvas)`, `var(--text-primary)`).
- **Integrates with `card-design`**: Utilizes modular card primitives for all dashboard views.
- **Synchronized with `social-architect`**: Implements customer-facing tools (e.g. ATS simulator at `duncanmakoyo.com/#/ats` or HookBunker console) that text posts link to.

---

## ⚙️ 6. MANDATORY AUTO-QA & VERIFICATION LOOP
Never commit frontend updates without running this verification sequence:
1. **Compilation & Build Test**:
   Execute `npm run build` in the workspace root. Ensure `dist/` builds with 0 syntax errors.
2. **Console & Reference Error Audit**:
   Verify no undefined variable references exist (e.g. check for scope leaks or missing imports).
3. **Viewport Responsiveness**:
   Test rendering at `375px`, `768px`, and `1440px` widths. Confirm no horizontal overflow.
4. **Contrast & Focus Verification**:
   Ensure all buttons have visible focus rings and all text meets WCAG AA `4.5:1` contrast ratio.
