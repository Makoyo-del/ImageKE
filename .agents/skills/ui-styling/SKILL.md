---
name: ui-styling
description: Production Tailwind CSS, shadcn/ui, and Radix UI engineering system implementing accessible primitives, CSS variable theming, and zero-runtime-overhead interfaces.
---
# UI Styling & Component Architecture Engine (v4.0 — Enterprise Edition)

Use this skill whenever styling user interfaces, configuring Tailwind CSS (v3 or v4), integrating shadcn/ui and Radix primitives, implementing dark/light mode theming, or building accessible form and data-table components.

---

## 🚨 1. CORE MANDATE & INTEGRITY RULES (ZERO EXCEPTIONS)
1. **ACCESSIBILITY-FIRST (WCAG 2.1 AA)**: All components must support full keyboard navigation (`Tab`, `Enter`, `Space`, `Escape`), visible focus rings, ARIA roles, and a minimum 4.5:1 text contrast ratio.
2. **ZERO HARDCODED ARBITRARY CLASSES**: Do not litter code with arbitrary values like `bg-[#09090b]`. Bind every element to semantic CSS variables (`bg-background`, `text-foreground`, `border-border`, `bg-card`).
3. **ZERO RUNTIME JANK**: Prioritize CSS transitions and hardware-accelerated transforms (`transform: translateZ(0)`). Prevent Cumulative Layout Shift (CLS) on interactive elements.

---

## 🎨 2. DYNAMIC THEMING & COMPONENT MODES

### Mode 1: `TAILWIND_V4_CSS` (Modern CSS-First Architecture)
Utilizes `@theme` directives in `src/index.css` without requiring heavy JS configuration files:
```css
@import "tailwindcss";

@theme {
  --color-canvas: #09090B;
  --color-surface: #121215;
  --color-surface-elevated: #18181C;
  --color-emerald-neon: #10B981;
  --color-indigo-electric: #6366F1;
  --font-heading: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### Mode 2: `TAILWIND_V3_SEMANTIC` (`tailwind.config.js` with HSL CSS Variables)
Configured to support dynamic opacity and real-time theme swapping:
```javascript
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

---

## 📐 3. STRICT TECHNICAL & ACCESSIBILITY GUARDRAILS
1. **Interactive Hit Areas**:
   - All interactive controls (buttons, links, toggles) must maintain a minimum bounding box of `44px × 44px`.
2. **Focus Management**:
   - Every interactive element must feature non-destructive focus indicators:
     `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
3. **Form Validation & Error States**:
   - Forms must couple with Zod and React Hook Form. Form errors must be announced with `aria-live="polite"` and visual warning badges.

---

## 🧩 4. REUSABLE PRODUCTION PRIMITIVES (SHADCN + RADIX)

### A. Accessible Button Primitive (`components/ui/button.tsx`)
```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### B. Form Validation Schema Pattern (Zod + React Hook Form)
```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const formSchema = z.object({
  phoneNumber: z.string().regex(/^(?:254|\+254|0)?(7|1)\d{8}$/, "Valid Kenyan Safaricom/Airtel number required"),
  amount: z.number().min(10, "Minimum transaction is KSh 10"),
})

export type FormValues = z.infer<typeof formSchema>
```

---

## 🛠️ 5. PYTHON AUTOMATION SCRIPTS
Execute local automation helpers within the skill folder:
```powershell
# Add shadcn components automatically
python .agents/skills/ui-styling/scripts/shadcn_add.py button dialog card

# Generate custom Tailwind configuration
python .agents/skills/ui-styling/scripts/tailwind_config_gen.py --colors brand:emerald --fonts display:PlusJakartaSans
```

---

## 🔗 6. CROSS-SKILL SYNCHRONIZATION
- **Consumes from `design-system`**: Integrates primitive and semantic tokens into Tailwind CSS classes.
- **Supplies to `card-design` & `frontend-design`**: Provides standardized component variants and utility functions.
- **Supports `linkedin-campaign-poster-design`**: Supplies clean HTML/CSS snippets for UI simulation cards.

---

## ⚙️ 7. MANDATORY AUTO-QA & BUILD VERIFICATION LOOP
Before declaring styling work complete:
1. **Compilation Check**: Run `npm run build` to confirm zero CSS syntax or PostCSS errors.
2. **Keyboard Navigation Audit**: Verify all interactive elements are reachable via `Tab` with visible focus rings.
3. **Responsive Breakpoint Verification**: Test layouts at mobile (`375px`), tablet (`768px`), and desktop (`1280px`).
4. **Dark/Light Mode Check**: Toggle theme class to confirm zero unstyled or low-contrast elements.
