---
name: "card-design"
description: "Integrate, design, and structure React card components using shadcn-inspired interface formats, Tailwind CSS, and TypeScript."
---

# Card Design Skill

Use this skill when designing or integrating modular React card components (like `interfaces-card.tsx`) into the codebase.

## 🛠️ Card Component Reference (`interfaces-card.tsx`)

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col rounded-xl border",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-4 py-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] border-b",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold text-lg", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-4", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center justify-stretch p-4 border-t", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
```

## 💻 Usage Example (`demo.tsx`)

```tsx
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/interfaces-card"
import { MoreHorizontal } from "lucide-react"

export default function CardDemo() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-8">
      <Card className="w-full max-w-sm shadow-sm">
        <CardHeader>
          <div>
            <CardTitle>Pro plan</CardTitle>
            <CardDescription>For growing teams that need more control.</CardDescription>
          </div>
          <CardAction>
            <button
              type="button"
              aria-label="More options"
              className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-foreground hover:bg-accent"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-3xl font-semibold">$24</span>
            <span className="text-sm text-muted-foreground">per member / month</span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Unlimited projects</li>
            <li>Advanced permissions</li>
            <li>Shared team library</li>
          </ul>
        </CardContent>
        <CardFooter className="gap-3">
          <button type="button" className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Upgrade
          </button>
          <button type="button" className="inline-flex h-10 w-full items-center justify-center rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent">
            Learn more
          </button>
        </CardFooter>
      </Card>
    </div>
  )
}
```

## ⚙️ Environment Setup & Guidelines

If the project does not support shadcn structure, Tailwind CSS, or TypeScript, follow these instructions to set it up:

1. **Install Tailwind CSS**:
   Follow the framework guide (Vite, Next.js, etc.) or run:
   ```bash
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```
2. **Setup Typescript**:
   ```bash
   npm install -D typescript @types/react @types/react-dom
   npx tsc --init
   ```
3. **Setup shadcn CLI**:
   Initialize shadcn UI in your project:
   ```bash
   npx shadcn@latest init
   ```
4. **Target Paths**:
   By default, copy components into the `/components/ui/` folder (or matching alias configured in `components.json`). This ensures components are located systematically and resolve their aliases correctly.

### 📋 Integration Workflow
1. Copy and paste `interfaces-card.tsx` to the `components/ui/` directory.
2. Install external dependency `lucide-react`.
3. Resolve import alias `@/lib/utils` or create utility function `cn` if missing:
   ```typescript
   import { clsx, type ClassValue } from "clsx"
   import { twMerge } from "tailwind-merge"
   
   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs))
   }
   ```
4. Query the user on prop structure, state requirements, assets (stock images/icons), responsive goals, and visual style alignment.
