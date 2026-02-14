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
    sm: { icon: 34, text: "text-lg", gap: "gap-2" },
    md: { icon: 42, text: "text-xl", gap: "gap-2.5" },
    lg: { icon: 50, text: "text-2xl", gap: "gap-3" },
    xl: { icon: 58, text: "text-3xl", gap: "gap-3.5" },
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
            "font-black tracking-[0.015em] leading-none",
            text,
            textColor,
            useGradient && "bg-gradient-to-r from-saffron-500 via-gold-500 to-saffron-600 bg-clip-text text-transparent"
          )}
        >
          Climb
        </span>
      )}
    </div>
  )
}

/**
 * Ultra-HD Climb mark with layered gradients and precision geometry.
 * Uses a 256x256 viewBox for crisp rendering on high-density displays.
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
      className={cn("shrink-0 drop-shadow-[0_8px_22px_rgba(15,23,42,0.3)]", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`base-${uid}`} x1="20" y1="236" x2="236" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B1221" />
          <stop offset="52%" stopColor="#132039" />
          <stop offset="100%" stopColor="#1A2A4C" />
        </linearGradient>
        <radialGradient id={`orb-${uid}`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(206 52) rotate(126) scale(152)">
          <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`peak-${uid}`} x1="54" y1="70" x2="146" y2="184" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="45%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id={`peak-secondary-${uid}`} x1="112" y1="94" x2="198" y2="184" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF3C4" stopOpacity="0.88" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`trail-${uid}`} x1="52" y1="170" x2="208" y2="224" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id={`glass-${uid}`} x1="42" y1="24" x2="188" y2="164" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.26" />
          <stop offset="48%" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id={`outer-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#020617" floodOpacity="0.42" />
        </filter>
        <filter id={`inner-glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0.96 0 1 0 0 0.74 0 0 1 0 0.15 0 0 0 0.95 0" result="warmGlow" />
          <feMerge>
            <feMergeNode in="warmGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={`clip-${uid}`}>
          <rect x="10" y="10" width="236" height="236" rx="58" />
        </clipPath>
      </defs>

      <g filter={`url(#outer-${uid})`}>
        <rect x="10" y="10" width="236" height="236" rx="58" fill={`url(#base-${uid})`} />
      </g>
      <g clipPath={`url(#clip-${uid})`}>
        <rect x="10" y="10" width="236" height="236" rx="58" fill={`url(#orb-${uid})`} />
        <rect x="10" y="10" width="236" height="236" rx="58" fill={`url(#glass-${uid})`} />

        <path d="M10 172 C54 150 94 140 132 146 C170 152 210 170 246 192 V246 H10 V172 Z" fill="#0A162B" fillOpacity="0.58" />

        <g filter={`url(#inner-glow-${uid})`}>
          <path d="M48 180 L112 74 L178 180 H48 Z" fill={`url(#peak-${uid})`} />
          <path d="M104 92 L146 146 L122 146 L98 122 L84 146 H64 L104 92 Z" fill="#FFF8DC" fillOpacity="0.64" />
          <path d="M114 180 L174 104 L222 180 H114 Z" fill={`url(#peak-secondary-${uid})`} />
        </g>

        <path d="M34 202 C68 178 102 170 136 176 C170 182 200 196 222 214" stroke={`url(#trail-${uid})`} strokeWidth="10" strokeLinecap="round" />
        <circle cx="62" cy="191" r="9" fill="#FACC15" />
        <circle cx="111" cy="184" r="7.5" fill="#FBBF24" />
        <circle cx="160" cy="194" r="6" fill="#F59E0B" />
        <circle cx="206" cy="211" r="5.5" fill="#FDE68A" />

        <path d="M152 46 L160 62 L178 64 L164 76 L168 94 L152 84 L136 94 L140 76 L126 64 L144 62 Z" fill="#FFF3C4" fillOpacity="0.95" />
        <rect x="10" y="10" width="236" height="236" rx="58" stroke="url(#glass-${uid})" strokeWidth="2.2" />
      </g>
    </svg>
  )
}
