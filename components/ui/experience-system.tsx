"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"
import { Activity, CheckCircle2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type SurfaceTheme =
  | "landing"
  | "dashboard"
  | "control"
  | "forecast"
  | "studio"
  | "auth"
  | "marketing"
  | "generic"

function resolveSurfaceTheme(pathname: string | null): SurfaceTheme {
  if (!pathname || pathname === "/" || pathname.startsWith("/landing")) return "landing"
  if (pathname.startsWith("/app/dashboard")) return "dashboard"
  if (pathname.startsWith("/app/control")) return "control"
  if (pathname.startsWith("/app/forecast")) return "forecast"
  if (pathname.startsWith("/app/ai-studio")) return "studio"
  if (pathname.startsWith("/signin") || pathname.startsWith("/signup")) return "auth"
  if (pathname.startsWith("/pricing") || pathname.startsWith("/templates") || pathname.startsWith("/trust")) {
    return "marketing"
  }
  return "generic"
}

function resolveAmbientTone(
  preference: "auto" | "app" | "marketing" | "landing",
  surface: SurfaceTheme
): "app" | "marketing" | "landing" {
  if (preference !== "auto") return preference
  if (surface === "landing") return "landing"
  if (surface === "marketing" || surface === "auth") return "marketing"
  return "app"
}

function buildTrendPoints(seed: number, value: number, delta: number): string {
  const safeValue = Math.max(4, value)
  const points = Array.from({ length: 9 }, (_, index) => {
    const x = index * 10
    const wave = Math.sin((seed + index) * 0.72) * 2.8
    const slope = delta * 0.2 * index
    const y = 22 - ((safeValue % 18) * 0.32 + wave + slope)
    return `${x},${Math.max(2, Math.min(24, y)).toFixed(2)}`
  })
  return points.join(" ")
}

export function SurfaceThemeOrchestrator() {
  const pathname = usePathname()
  const theme = useMemo(() => resolveSurfaceTheme(pathname), [pathname])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.setAttribute("data-surface", theme)
  }, [theme])

  return null
}

export function CinematicRouteTransition({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const pathname = usePathname()
  const [animating, setAnimating] = useState(true)

  useEffect(() => {
    setAnimating(true)
    const timer = window.setTimeout(() => setAnimating(false), 560)
    return () => window.clearTimeout(timer)
  }, [pathname])

  return <div className={cn("route-cinematic-frame", animating && "is-animating", className)}>{children}</div>
}

export function AmbientTextureLayer({
  mode = "auto",
  className,
}: {
  mode?: "auto" | "app" | "marketing" | "landing"
  className?: string
}) {
  const pathname = usePathname()
  const surface = useMemo(() => resolveSurfaceTheme(pathname), [pathname])
  const ambientTone = useMemo(() => resolveAmbientTone(mode, surface), [mode, surface])
  const [pointer, setPointer] = useState({ x: 56, y: 18 })

  useEffect(() => {
    let raf = 0
    const onPointerMove = (event: MouseEvent) => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        const x = (event.clientX / Math.max(window.innerWidth, 1)) * 100
        const y = (event.clientY / Math.max(window.innerHeight, 1)) * 100
        setPointer({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) })
        raf = 0
      })
    }

    window.addEventListener("mousemove", onPointerMove)
    return () => {
      window.removeEventListener("mousemove", onPointerMove)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])

  const style = {
    "--ambient-x": `${pointer.x}%`,
    "--ambient-y": `${pointer.y}%`,
  } as CSSProperties

  return (
    <div
      aria-hidden
      style={style}
      className={cn("experience-ambient", `experience-ambient-${ambientTone}`, className)}
    >
      <span className="experience-ambient-blob blob-a" />
      <span className="experience-ambient-blob blob-b" />
      <span className="experience-ambient-blob blob-c" />
      <span className="experience-ambient-glint" />
      <span className="experience-ambient-noise" />
    </div>
  )
}

export function MicroTrendMeter({
  label,
  value,
  delta,
  seed = 1,
  className,
}: {
  label: string
  value: number
  delta: number
  seed?: number
  className?: string
}) {
  const points = useMemo(() => buildTrendPoints(seed, value, delta), [seed, value, delta])
  const positive = delta >= 0

  return (
    <div className={cn("micro-trend-pill", className)}>
      <div className="min-w-0">
        <p className="micro-trend-label">{label}</p>
        <p className="micro-trend-value">{value.toLocaleString()}</p>
      </div>
      <div className="micro-trend-viz">
        <svg viewBox="0 0 80 26" className="micro-trend-svg" aria-hidden>
          <polyline
            points={points}
            className={cn("micro-trend-line", positive ? "is-positive" : "is-negative")}
          />
        </svg>
        <span className={cn("micro-trend-delta", positive ? "is-positive" : "is-negative")}>
          {positive ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

type GlyphTone = "mint" | "amber" | "ice" | "violet"

export function ClimbGlyph({
  tone = "mint",
  size = 20,
  className,
}: {
  tone?: GlyphTone
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn("climb-glyph", `tone-${tone}`, className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24">
        <path d="M4 18 L9 7 L12 12 L16 5 L20 18" className="glyph-path" />
        <circle cx="9" cy="7" r="1.5" className="glyph-dot" />
        <circle cx="12" cy="12" r="1.5" className="glyph-dot" />
        <circle cx="16" cy="5" r="1.5" className="glyph-dot" />
      </svg>
    </span>
  )
}

type MorphState = "idle" | "running" | "done"

export function MorphActionPill({
  label,
  runningLabel = "Applying...",
  successLabel = "Applied",
  onActivate,
  className,
}: {
  label: string
  runningLabel?: string
  successLabel?: string
  onActivate?: () => void
  className?: string
}) {
  const [state, setState] = useState<MorphState>("idle")
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current = []
    }
  }, [])

  const handleClick = () => {
    if (state === "running") return
    onActivate?.()
    setState("running")
    timersRef.current.push(
      window.setTimeout(() => setState("done"), 850),
      window.setTimeout(() => setState("idle"), 2400)
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn("morph-action-pill", `state-${state}`, className)}
      aria-live="polite"
    >
      <span className="morph-icon">
        {state === "done" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : state === "running" ? (
          <Activity className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
      </span>
      <span className="morph-label">
        {state === "done" ? successLabel : state === "running" ? runningLabel : label}
      </span>
    </button>
  )
}

export interface SignalNode {
  id: string
  label: string
  detail: string
  x: number
  y: number
  value: number
}

const defaultSignalNodes: SignalNode[] = [
  {
    id: "capture",
    label: "Capture",
    detail: "Role intake and fit scoring.",
    x: 14,
    y: 72,
    value: 74,
  },
  {
    id: "writer",
    label: "Writer",
    detail: "Resume and narrative generation.",
    x: 42,
    y: 46,
    value: 82,
  },
  {
    id: "ops",
    label: "Ops",
    detail: "Follow-up cadence and SLA monitoring.",
    x: 69,
    y: 34,
    value: 89,
  },
  {
    id: "forecast",
    label: "Forecast",
    detail: "Effort-to-outcome simulation.",
    x: 88,
    y: 62,
    value: 78,
  },
]

export function SignalConstellation({
  nodes = defaultSignalNodes,
  compact = false,
  className,
}: {
  nodes?: SignalNode[]
  compact?: boolean
  className?: string
}) {
  const [activeId, setActiveId] = useState(nodes[0]?.id || "")

  useEffect(() => {
    if (!nodes.some((node) => node.id === activeId)) {
      setActiveId(nodes[0]?.id || "")
    }
  }, [activeId, nodes])

  const active = nodes.find((node) => node.id === activeId) || nodes[0]

  return (
    <section className={cn("signal-constellation", compact && "is-compact", className)}>
      <div className="signal-constellation-grid" aria-hidden>
        <svg viewBox="0 0 100 100" className="signal-constellation-links">
          {nodes.map((node, index) => {
            if (index === 0) return null
            const source = nodes[0]
            return (
              <path
                key={`${source.id}-${node.id}`}
                d={`M ${source.x} ${source.y} C ${(source.x + node.x) / 2} ${source.y - 10}, ${(source.x + node.x) / 2} ${node.y + 10}, ${node.x} ${node.y}`}
                className={cn(
                  "signal-link",
                  active?.id === node.id || active?.id === source.id ? "is-active" : ""
                )}
              />
            )
          })}
        </svg>
        {nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            className={cn("signal-node", active?.id === node.id && "is-active")}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onMouseEnter={() => setActiveId(node.id)}
            onFocus={() => setActiveId(node.id)}
            aria-label={node.label}
          >
            <span className="signal-node-core" />
            <span className="signal-node-chip">{node.label}</span>
          </button>
        ))}
      </div>

      <div className="signal-constellation-footer">
        <div>
          <p className="signal-constellation-title">{active?.label || "Signal"}</p>
          <p className="signal-constellation-detail">{active?.detail || "Select a signal node."}</p>
        </div>
        <span className="signal-constellation-score">
          <Activity className="h-3.5 w-3.5" />
          {active?.value || 0}%
        </span>
      </div>
    </section>
  )
}
