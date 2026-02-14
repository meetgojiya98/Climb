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
            useGradient && "bg-gradient-to-r from-saffron-500 via-gold-400 to-navy-500 bg-clip-text text-transparent"
          )}
        >
          Climb
        </span>
      ) : null}
    </div>
  )
}

/**
 * High-definition brand mark with layered gradients and precision vectors.
 * 256x256 viewbox keeps edges crisp for retina and large hero usage.
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
      className={cn("shrink-0 drop-shadow-[0_14px_26px_rgba(17,24,58,0.36)]", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`base-${uid}`} x1="24" y1="232" x2="232" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#182554" />
          <stop offset="46%" stopColor="#2E47A7" />
          <stop offset="100%" stopColor="#13ACD9" />
        </linearGradient>
        <radialGradient id={`aura-${uid}`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(208 50) rotate(132) scale(168)">
          <stop offset="0%" stopColor="#FF7890" stopOpacity="0.48" />
          <stop offset="100%" stopColor="#FF4D67" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ridge-${uid}`} x1="54" y1="76" x2="208" y2="188" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE7EC" />
          <stop offset="42%" stopColor="#FF8CA0" />
          <stop offset="100%" stopColor="#FF4D67" />
        </linearGradient>
        <linearGradient id={`ridge-b-${uid}`} x1="92" y1="98" x2="214" y2="194" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#C5F6FF" stopOpacity="0.94" />
          <stop offset="100%" stopColor="#13ACD9" stopOpacity="0.68" />
        </linearGradient>
        <linearGradient id={`trail-${uid}`} x1="42" y1="180" x2="226" y2="222" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF4D67" />
          <stop offset="100%" stopColor="#13ACD9" />
        </linearGradient>
        <linearGradient id={`glass-${uid}`} x1="36" y1="16" x2="172" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="54%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id={`outer-${uid}`} x="-18%" y="-18%" width="136%" height="136%">
          <feDropShadow dx="0" dy="10" stdDeviation="11" floodColor="#0A102B" floodOpacity="0.48" />
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

        <path d="M14 170C54 147 88 140 126 145C166 150 204 167 244 198V244H14V170Z" fill="#0D183C" fillOpacity="0.56" />

        <path d="M48 186L104 78L138 136L172 94L224 186H48Z" fill={`url(#ridge-${uid})`} />
        <path d="M84 186L116 124L152 168L84 186Z" fill="#FFEFF2" fillOpacity="0.7" />
        <path d="M126 186L172 118L204 186H126Z" fill={`url(#ridge-b-${uid})`} />

        <path d="M116 156L156 114" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
        <path d="M154 114H184V144" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />

        <path d="M38 204C72 180 106 170 140 176C174 182 206 196 226 214" stroke={`url(#trail-${uid})`} strokeWidth="10" strokeLinecap="round" />
        <circle cx="66" cy="194" r="8.5" fill="#FF6F7C" />
        <circle cx="120" cy="186" r="7" fill="#FFA3A9" />
        <circle cx="172" cy="196" r="6" fill="#5BD9F9" />
        <circle cx="212" cy="210" r="5.5" fill="#C5F6FF" />

        <path d="M152 44L160 60L178 62L164 74L168 92L152 82L136 92L140 74L126 62L144 60Z" fill="#FFE7EC" fillOpacity="0.94" />
        <rect x="12.9" y="12.9" width="230.2" height="230.2" rx="57.2" stroke="url(#glass-${uid})" strokeWidth="1.8" />
      </g>
    </svg>
  )
}
