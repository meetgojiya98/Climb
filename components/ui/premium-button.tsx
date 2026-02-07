"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background hover:opacity-90 shadow-premium-sm hover:shadow-premium-md",
        primary:
          "bg-foreground text-background hover:opacity-90",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-accent hover:border-border/80",
        gradient:
          "bg-gradient-to-r from-climb to-climb-secondary text-white shadow-[0_4px_20px_hsla(var(--climb),0.3)] hover:shadow-[0_6px_30px_hsla(var(--climb),0.4)] hover:-translate-y-0.5",
        ghost: 
          "hover:bg-accent hover:text-accent-foreground",
        outline:
          "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
        link: 
          "text-foreground underline-offset-4 hover:underline",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-11 px-6 py-2 rounded-xl",
        sm: "h-9 px-4 rounded-lg text-sm",
        lg: "h-14 px-8 rounded-xl text-base",
        xl: "h-16 px-10 rounded-2xl text-lg",
        icon: "h-11 w-11 rounded-xl",
        "icon-sm": "h-9 w-9 rounded-lg",
        "icon-lg": "h-14 w-14 rounded-xl",
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
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const PremiumButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : leftIcon ? (
          leftIcon
        ) : null}
        {children}
        {!loading && rightIcon}
      </Comp>
    )
  }
)
PremiumButton.displayName = "PremiumButton"

export { PremiumButton, buttonVariants }
