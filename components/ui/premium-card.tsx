"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, HTMLMotionProps } from "framer-motion"

interface PremiumCardProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "interactive" | "elevated" | "glass" | "gradient-border"
  hover?: boolean
  glow?: boolean
}

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ className, variant = "default", hover = true, glow = false, children, ...props }, ref) => {
    const variants = {
      default: "bg-card border border-border/50 shadow-premium-sm",
      interactive: "bg-card border border-border/50 shadow-premium-sm cursor-pointer",
      elevated: "bg-card border border-border/30 shadow-premium-lg",
      glass: "bg-white/70 dark:bg-black/50 backdrop-blur-xl border border-white/20",
      "gradient-border": "bg-card relative before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-r before:from-climb before:to-climb-secondary before:-z-10",
    }

    const hoverVariants = {
      default: hover ? "hover:shadow-premium-md hover:-translate-y-0.5" : "",
      interactive: "hover:shadow-premium-md hover:-translate-y-1 hover:border-border active:scale-[0.99]",
      elevated: hover ? "hover:shadow-premium-xl hover:-translate-y-1" : "",
      glass: hover ? "hover:bg-white/80 dark:hover:bg-black/60" : "",
      "gradient-border": hover ? "hover:shadow-premium-md hover:-translate-y-0.5" : "",
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-2xl transition-all duration-200",
          variants[variant],
          hoverVariants[variant],
          glow && "shadow-glow",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
PremiumCard.displayName = "PremiumCard"

const PremiumCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)}
    {...props}
  />
))
PremiumCardHeader.displayName = "PremiumCardHeader"

const PremiumCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-xl font-semibold tracking-tight", className)}
    {...props}
  />
))
PremiumCardTitle.displayName = "PremiumCardTitle"

const PremiumCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
PremiumCardDescription.displayName = "PremiumCardDescription"

const PremiumCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
PremiumCardContent.displayName = "PremiumCardContent"

const PremiumCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
PremiumCardFooter.displayName = "PremiumCardFooter"

export {
  PremiumCard,
  PremiumCardHeader,
  PremiumCardFooter,
  PremiumCardTitle,
  PremiumCardDescription,
  PremiumCardContent,
}
