import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-navy-800 to-navy-600 text-primary-foreground hover:opacity-95 shadow-[0_16px_28px_-18px_rgba(32,52,116,0.72)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_14px_28px_-18px_rgba(220,38,38,0.7)]",
        outline:
          "border border-input bg-background/85 hover:bg-accent hover:text-accent-foreground shadow-[0_12px_20px_-18px_rgba(17,24,58,0.55)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[0_12px_20px_-18px_rgba(17,24,58,0.45)]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        climb: "bg-gradient-to-r from-saffron-500 to-gold-500 text-climb-foreground hover:opacity-95 shadow-[0_16px_28px_-18px_rgba(127,203,36,0.82)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-[12px] px-3",
        lg: "h-11 rounded-[16px] px-8",
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
