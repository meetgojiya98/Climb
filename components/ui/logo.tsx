"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
  /** Use "light" on dark backgrounds, "dark" on light backgrounds. Default uses gradient wordmark. */
  variant?: "default" | "light" | "dark"
  className?: string
}

export function Logo({ size = "md", showText = true, variant = "default", className }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: "text-lg", gap: "gap-2" },
    md: { icon: 40, text: "text-xl", gap: "gap-2.5" },
    lg: { icon: 48, text: "text-2xl", gap: "gap-3" },
    xl: { icon: 56, text: "text-3xl", gap: "gap-3" },
  }

  const { icon, text, gap } = sizes[size]
  const textColor = variant === "light" ? "text-white" : variant === "dark" ? "text-navy-900" : ""
  const useGradient = variant === "default"

  return (
    <div className={cn("flex items-center", gap, className)}>
      <LogoMark size={icon} className="shrink-0" />
      {showText && (
        <span
          className={cn(
            "font-bold tracking-tight",
            text,
            textColor,
            useGradient && "gradient-text"
          )}
        >
          Climb
        </span>
      )}
    </div>
  )
}

/**
 * High-definition Climb mark: navy base, saffron mountain peak, shine and soft glow.
 * Same asset used everywhere for consistency. viewBox 128x128 for crisp rendering at any size.
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "")
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 drop-shadow-[0_2px_6px_rgba(15,23,42,0.12)]", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`navy-${uid}`} x1="0" y1="128" x2="128" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id={`saffron-${uid}`} x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="35%" stopColor="#FBBF24" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id={`shine-${uid}`} x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="35%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feFlood floodColor="#F59E0B" floodOpacity="0.4" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Base */}
      <rect width="128" height="128" rx="32" fill={`url(#navy-${uid})`} />
      <rect width="128" height="128" rx="32" fill={`url(#shine-${uid})`} />
      {/* Mountain peak — main shape */}
      <g filter={`url(#glow-${uid})`}>
        <path
          d="M64 24 L96 76 L32 76 Z"
          fill={`url(#saffron-${uid})`}
        />
        <path
          d="M88 48 L112 76 L64 76 Z"
          fill="white"
          fillOpacity="0.28"
        />
      </g>
      {/* Base bar */}
      <rect x="24" y="88" width="80" height="8" rx="4" fill={`url(#saffron-${uid})`} fillOpacity="0.75" />
      {/* Steps / progress */}
      <circle cx="40" cy="104" r="5" fill={`url(#saffron-${uid})`} />
      <circle cx="64" cy="104" r="5" fill="white" fillOpacity="0.45" />
      <circle cx="88" cy="104" r="5" fill="white" fillOpacity="0.2" />
    </svg>
  )
}
