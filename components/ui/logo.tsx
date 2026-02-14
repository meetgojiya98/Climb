"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  showText?: boolean
  variant?: "default" | "light" | "dark"
  className?: string
}

export function Logo({
  size = "md",
  showText = true,
  variant = "default",
  className,
}: LogoProps) {
  const sizes = {
    sm: { icon: 34, text: "text-lg", gap: "gap-2" },
    md: { icon: 42, text: "text-[1.4rem]", gap: "gap-2.5" },
    lg: { icon: 52, text: "text-[1.8rem]", gap: "gap-3" },
    xl: { icon: 62, text: "text-[2.1rem]", gap: "gap-3.5" },
  }

  const { icon, text, gap } = sizes[size]
  const textColor =
    variant === "light"
      ? "text-white"
      : variant === "dark"
      ? "text-navy-900"
      : ""
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
            useGradient &&
              "bg-gradient-to-r from-saffron-500 via-saffron-400 to-gold-400 bg-clip-text text-transparent"
          )}
        >
          Climb
        </span>
      ) : null}
    </div>
  )
}

/**
 * Mark design:
 * - Shielded platform shape for stability
 * - Three ascending bars for progression
 * - Orbit arc for AI guidance loops
 * 256x256 viewBox for high-DPI crispness.
 */
export function LogoMark({
  size = 40,
  className,
}: {
  size?: number
  className?: string
}) {
  const uid = useId().replace(/:/g, "")

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "shrink-0 drop-shadow-[0_14px_30px_rgba(10,18,33,0.5)]",
        className
      )}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={`base-${uid}`}
          x1="22"
          y1="232"
          x2="232"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#161C34" />
          <stop offset="54%" stopColor="#2A3C72" />
          <stop offset="100%" stopColor="#35508F" />
        </linearGradient>

        <radialGradient
          id={`aura-${uid}`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(200 54) rotate(130) scale(180)"
        >
          <stop offset="0%" stopColor="#2ED7EE" stopOpacity="0.46" />
          <stop offset="100%" stopColor="#2ED7EE" stopOpacity="0" />
        </radialGradient>

        <linearGradient
          id={`accent-${uid}`}
          x1="60"
          y1="58"
          x2="198"
          y2="196"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFBC3C" />
          <stop offset="50%" stopColor="#FF9F16" />
          <stop offset="100%" stopColor="#10BCD4" />
        </linearGradient>

        <linearGradient
          id={`glass-${uid}`}
          x1="34"
          y1="18"
          x2="184"
          y2="170"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="56%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <filter id={`outer-${uid}`} x="-18%" y="-18%" width="136%" height="136%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0B1328" floodOpacity="0.55" />
        </filter>

        <clipPath id={`clip-${uid}`}>
          <rect x="12" y="12" width="232" height="232" rx="56" />
        </clipPath>
      </defs>

      <g filter={`url(#outer-${uid})`}>
        <rect x="12" y="12" width="232" height="232" rx="56" fill={`url(#base-${uid})`} />
      </g>

      <g clipPath={`url(#clip-${uid})`}>
        <rect x="12" y="12" width="232" height="232" rx="56" fill={`url(#aura-${uid})`} />
        <rect x="12" y="12" width="232" height="232" rx="56" fill={`url(#glass-${uid})`} />

        <path
          d="M62 184L128 70L194 184"
          stroke={`url(#accent-${uid})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <rect x="88" y="124" width="18" height="46" rx="9" fill="#FFC85D" />
        <rect x="119" y="106" width="18" height="64" rx="9" fill="#FFAA2E" />
        <rect x="150" y="90" width="18" height="80" rx="9" fill="#43DDF3" />

        <path
          d="M68 182C96 165 126 158 156 164C180 168 204 182 220 198"
          stroke={`url(#accent-${uid})`}
          strokeWidth="8"
          strokeOpacity="0.56"
          strokeLinecap="round"
        />

        <path
          d="M72 82C96 56 126 44 156 50C186 56 212 78 220 108"
          stroke={`url(#accent-${uid})`}
          strokeWidth="7"
          strokeOpacity="0.7"
          strokeLinecap="round"
        />

        <circle cx="84" cy="86" r="5.7" fill="#FFD68C" />
        <circle cx="162" cy="52" r="5" fill="#78EFFF" />

        <rect
          x="12.9"
          y="12.9"
          width="230.2"
          height="230.2"
          rx="55.2"
          stroke={`url(#glass-${uid})`}
          strokeWidth="1.8"
        />
      </g>
    </svg>
  )
}
