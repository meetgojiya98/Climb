"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
  variant?: "default" | "light" | "dark"
  className?: string
}

export function Logo({ size = "md", showText = true, variant = "default", className }: LogoProps) {
  const sizes = {
    sm: { icon: 34, text: "text-lg", gap: "gap-2" },
    md: { icon: 42, text: "text-[1.4rem]", gap: "gap-2.5" },
    lg: { icon: 50, text: "text-[1.8rem]", gap: "gap-3" },
    xl: { icon: 58, text: "text-[2.1rem]", gap: "gap-3.5" },
  }

  const { icon, text, gap } = sizes[size]
  const textColor = variant === "light" ? "text-white" : variant === "dark" ? "text-navy-900" : ""
  const useGradient = variant === "default"

  return (
    <div className={cn("flex items-center", gap, className)}>
      <LogoMark size={icon} className="shrink-0" />
      {showText ? (
        <span
          className={cn(
            "font-display font-semibold tracking-[-0.03em] leading-none",
            text,
            textColor,
            useGradient && "bg-gradient-to-r from-saffron-400 via-saffron-500 to-gold-400 bg-clip-text text-transparent"
          )}
        >
          Climb
        </span>
      ) : null}
    </div>
  )
}

/**
 * Version 3 mark:
 * - Graphite base
 * - Aurora ring
 * - Upward vector to convey trajectory
 * Keeps crisp output on high-DPI displays via 256x256 viewBox.
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "")

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 drop-shadow-[0_14px_28px_rgba(14,23,38,0.45)]", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`base-${uid}`} x1="26" y1="232" x2="228" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#131B2A" />
          <stop offset="56%" stopColor="#1D2A42" />
          <stop offset="100%" stopColor="#273857" />
        </linearGradient>
        <radialGradient id={`aura-${uid}`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(196 52) rotate(130) scale(170)">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ring-${uid}`} x1="56" y1="54" x2="206" y2="204" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#79FDB0" />
          <stop offset="50%" stopColor="#19D56D" />
          <stop offset="100%" stopColor="#08B8F0" />
        </linearGradient>
        <linearGradient id={`path-${uid}`} x1="70" y1="176" x2="188" y2="102" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B3FFD0" />
          <stop offset="60%" stopColor="#38EC8A" />
          <stop offset="100%" stopColor="#08B8F0" />
        </linearGradient>
        <linearGradient id={`glass-${uid}`} x1="42" y1="20" x2="182" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="56%" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id={`outer-${uid}`} x="-18%" y="-18%" width="136%" height="136%">
          <feDropShadow dx="0" dy="9" stdDeviation="10" floodColor="#0A111D" floodOpacity="0.5" />
        </filter>
        <clipPath id={`clip-${uid}`}>
          <rect x="12" y="12" width="232" height="232" rx="58" />
        </clipPath>
      </defs>

      <g filter={`url(#outer-${uid})`}>
        <rect x="12" y="12" width="232" height="232" rx="58" fill={`url(#base-${uid})`} />
      </g>

      <g clipPath={`url(#clip-${uid})`}>
        <rect x="12" y="12" width="232" height="232" rx="58" fill={`url(#aura-${uid})`} />
        <rect x="12" y="12" width="232" height="232" rx="58" fill={`url(#glass-${uid})`} />

        <circle cx="128" cy="132" r="70" stroke={`url(#ring-${uid})`} strokeWidth="17" strokeLinecap="round" />

        <path d="M74 172C94 154 112 146 132 142C151 138 168 126 188 102" stroke={`url(#path-${uid})`} strokeWidth="11" strokeLinecap="round" />
        <path d="M184 100H206V122" stroke="#7AF8CF" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />

        <circle cx="86" cy="164" r="7.2" fill="#8AFBBE" />
        <circle cx="125" cy="146" r="6.4" fill="#61F0A5" />
        <circle cx="162" cy="129" r="5.8" fill="#34D3FF" />

        <path d="M56 204C92 184 124 176 160 182C186 186 212 196 228 210" stroke="url(#path-${uid})" strokeOpacity="0.55" strokeWidth="8" strokeLinecap="round" />
        <rect x="12.9" y="12.9" width="230.2" height="230.2" rx="57.2" stroke="url(#glass-${uid})" strokeWidth="1.8" />
      </g>
    </svg>
  )
}
