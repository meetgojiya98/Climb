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
 * Version 4 mark:
 * - Cobalt chassis with chroma field
 * - Ascending vector motif for growth
 * - Layered rings for orchestration/AI loops
 * Built with a 256x256 viewBox for crisp high-DPI rendering.
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
        "shrink-0 drop-shadow-[0_14px_30px_rgba(8,14,36,0.5)]",
        className
      )}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={`v4-base-${uid}`}
          x1="24"
          y1="236"
          x2="228"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#161A33" />
          <stop offset="52%" stopColor="#263B7A" />
          <stop offset="100%" stopColor="#334D95" />
        </linearGradient>

        <radialGradient
          id={`v4-aurora-${uid}`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(202 52) rotate(128) scale(176)"
        >
          <stop offset="0%" stopColor="#42DDFF" stopOpacity="0.52" />
          <stop offset="100%" stopColor="#42DDFF" stopOpacity="0" />
        </radialGradient>

        <linearGradient
          id={`v4-core-${uid}`}
          x1="60"
          y1="60"
          x2="198"
          y2="196"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FF7A5A" />
          <stop offset="54%" stopColor="#FF5C3E" />
          <stop offset="100%" stopColor="#0BC3F8" />
        </linearGradient>

        <linearGradient
          id={`v4-path-${uid}`}
          x1="72"
          y1="184"
          x2="192"
          y2="92"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFC5B3" />
          <stop offset="48%" stopColor="#FF7A5A" />
          <stop offset="100%" stopColor="#59E3FF" />
        </linearGradient>

        <linearGradient
          id={`v4-glass-${uid}`}
          x1="38"
          y1="16"
          x2="178"
          y2="168"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="56%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>

        <filter id={`v4-shadow-${uid}`} x="-18%" y="-18%" width="136%" height="136%">
          <feDropShadow
            dx="0"
            dy="10"
            stdDeviation="10"
            floodColor="#090F25"
            floodOpacity="0.55"
          />
        </filter>

        <clipPath id={`v4-clip-${uid}`}>
          <rect x="12" y="12" width="232" height="232" rx="56" />
        </clipPath>
      </defs>

      <g filter={`url(#v4-shadow-${uid})`}>
        <rect
          x="12"
          y="12"
          width="232"
          height="232"
          rx="56"
          fill={`url(#v4-base-${uid})`}
        />
      </g>

      <g clipPath={`url(#v4-clip-${uid})`}>
        <rect
          x="12"
          y="12"
          width="232"
          height="232"
          rx="56"
          fill={`url(#v4-aurora-${uid})`}
        />
        <rect
          x="12"
          y="12"
          width="232"
          height="232"
          rx="56"
          fill={`url(#v4-glass-${uid})`}
        />

        <circle
          cx="126"
          cy="132"
          r="72"
          stroke={`url(#v4-core-${uid})`}
          strokeWidth="15"
          strokeLinecap="round"
          opacity="0.95"
        />
        <circle
          cx="126"
          cy="132"
          r="49"
          stroke="url(#v4-core-${uid})"
          strokeWidth="6"
          strokeOpacity="0.42"
        />

        <path
          d="M72 182C92 164 110 152 132 148C154 144 174 128 194 92"
          stroke={`url(#v4-path-${uid})`}
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M188 92H212V116"
          stroke="#8BE9FF"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M66 204C92 190 122 184 154 188C181 192 206 202 224 214"
          stroke={`url(#v4-path-${uid})`}
          strokeWidth="8"
          strokeOpacity="0.55"
          strokeLinecap="round"
        />

        <circle cx="88" cy="170" r="7" fill="#FFD2C3" />
        <circle cx="126" cy="151" r="6.3" fill="#FF8669" />
        <circle cx="164" cy="131" r="5.7" fill="#6CE7FF" />

        <rect
          x="12.9"
          y="12.9"
          width="230.2"
          height="230.2"
          rx="55.2"
          stroke={`url(#v4-glass-${uid})`}
          strokeWidth="1.8"
        />
      </g>
    </svg>
  )
}
