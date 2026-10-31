---
name: card-design
description: Enterprise React card component engineering system with shadcn/ui, Radix UI primitives, Tailwind CSS, TypeScript safety, and high-craft interaction states.
---
# React Card Component Engineering System (v4.0 — Enterprise Edition)

Use this skill whenever designing, structuring, or coding modular React card components (`MetricCard`, `TerminalCard`, `BentoCard`, `DiffAuditCard`, `ActionCard`) for web applications, developer dashboards, or digital storefronts.

---

## 🚨 1. CORE MANDATE & INTEGRITY RULES (ZERO EXCEPTIONS)
1. **ZERO HARDCODED HEX VALUES**: Every card component must use semantic Tailwind CSS variables (`bg-card`, `text-card-foreground`, `border-border`, `bg-muted`) to ensure automatic light/dark mode parity.
2. **STRICT TYPESCRIPT INTERFACES**: No loose `any` props. Every component must export typed props extending `React.ComponentProps<"div">`.
3. **HIGH-CRAFT INTERACTION STATES**: Every card must provide visible hover, focus-visible, and disabled states without causing layout shifts or bounding-box jitter.

---

## 🧩 2. DYNAMIC CARD ARCHETYPE ROUTER
Select the card archetype that fulfills the feature requirement:

| Card Archetype | Best For | Key Visual & Interactive Features |
| :--- | :--- | :--- |
| **`TELEMETRY_METRIC_CARD`** | Analytics, Latency, Real-time Webhook telemetry | Glowing trend pill (`▲ +84.2%`), sparkline or mini progress bar, live pulse dot (`animate-pulse`), monospace metrics. |
| **`TERMINAL_CODE_CARD`** | Developer consoles, API payloads, HookBunker logs | macOS window chrome (`• • •`), syntax-highlighted code block, 1-click clipboard copy button, status badge. |
| **`BENTO_GRID_CARD`** | Feature showcases, architectural breakdowns, landing pages | Container query `@container`, subtle gradient border on hover, icon pill, balanced title + description hierarchy. |
| **`DIFF_AUDIT_CARD`** | ATS CV reviews, code-diff comparisons, before/after audits | Split or stacked view: Red strikethrough flaw vs. Green glowing benchmark standard. |
| **`ACTION_FORM_CARD`** | Settings, authentication, payment checkout | Accessible header actions, integrated loading state (`lucide-react` Loader2), keyboard accessible button footer. |

---

## 📐 3. STRICT TECHNICAL & ACCESSIBILITY GUARDRAILS
1. **Container Query Discipline**:
   Use `@container` classes on card containers so card headers and content dynamically switch between stacked and horizontal layouts based on their own width rather than viewport breakpoints:
   ```tsx
   <div className="@container flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm">
   ```
2. **Touch Target Standard**:
   Interactive buttons or action icons inside cards must have a hit area of at least `44px × 44px` (or `p-2` with `size-5` icon).
3. **WCAG AA Contrast**:
   Ensure text inside cards meets minimum `4.5:1` contrast ratio. Use `text-muted-foreground` only for secondary metadata, never for core operational figures.

---

## 💻 4. PRODUCTION COMPONENT PRIMITIVES (TYPESCRIPT + TAILWIND)

### A. Core Modular Card Primitives (`components/ui/card.tsx`)
```tsx
import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-200 hover:border-border/80",
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("p-6 pt-0", className)} {...props} />
  )
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-6 pt-0 border-t border-border/50 mt-4", className)}
      {...props}
    />
  )
}
```

### B. Specialized Telemetry Metric Card (`components/ui/metric-card.tsx`)
```tsx
import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react"

interface MetricCardProps extends React.ComponentProps<"div"> {
  title: string
  value: string | number
  delta?: string
  trend?: "up" | "down" | "neutral"
  subtext?: string
}

export function MetricCard({ title, value, delta, trend = "neutral", subtext, className, ...props }: MetricCardProps) {
  return (
    <Card className={className} {...props}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Activity className="size-4" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="font-mono text-3xl font-bold tracking-tight">{value}</span>
          {delta && (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                trend === "up"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : trend === "down"
                  ? "bg-rose-500/10 text-rose-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {trend === "up" ? <ArrowUpRight className="size-3" /> : trend === "down" ? <ArrowDownRight className="size-3" /> : null}
              {delta}
            </span>
          )}
        </div>
        {subtext && <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
  )
}
```

---

## 🔗 5. CROSS-SKILL SYNCHRONIZATION
- **Consumes from `design-system` & `brand`**: Inherits spacing, typography tokens, and CSS color variables.
- **Supplies to `frontend-design` & `ui-styling`**: Provides the structural foundation for dashboards, landing page bento grids, and admin consoles.
- **Coordinates with `linkedin-campaign-poster-design`**: Renders HTML/CSS card mockups that are screenshotted into LinkedIn posters.

---

## ⚙️ 6. MANDATORY AUTO-QA & BUILD VERIFICATION LOOP
Before marking card component development complete:
1. **TypeScript Typecheck**: Run `npx tsc --noEmit` or verify IDE diagnostics to ensure zero type errors.
2. **Light & Dark Theme Test**: Verify cards look crisp in both themes (ensure borders remain visible against dark backgrounds).
3. **Interactive Jitter Test**: Hover over cards and buttons to ensure CSS transitions do not cause sudden shifts in layout bounds.
4. **Responsive Flex Check**: Test card container at widths `320px`, `480px`, and `768px` to ensure text wraps cleanly without horizontal overflow.
