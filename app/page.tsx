"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Logo } from "@/components/ui/logo"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  BrainCircuit,
  Building2,
  CheckCircle2,
  LineChart,
  Menu,
  Shield,
  Sparkles,
  Target,
  Workflow,
  X,
} from "lucide-react"

type PointerState = {
  x: number
  y: number
}

type JourneyStep = {
  id: string
  step: string
  title: string
  detail: string
  output: string
}

type FlowModule = {
  id: string
  title: string
  detail: string
  href: string
  x: number
  y: number
  icon: React.ComponentType<{ className?: string }>
}

const journeySteps: JourneyStep[] = [
  {
    id: "capture",
    step: "Step 1",
    title: "Capture and rank opportunities",
    detail:
      "Pull in roles, clean duplicates, and prioritize by conversion potential before you spend effort.",
    output: "Clear weekly role stack",
  },
  {
    id: "build",
    step: "Step 2",
    title: "Generate role-specific assets",
    detail:
      "Create focused resume, outreach copy, and interview prep from a single role context.",
    output: "Ready-to-send role pack",
  },
  {
    id: "execute",
    step: "Step 3",
    title: "Run follow-up execution loops",
    detail:
      "Track stale applications, trigger follow-ups, and keep momentum high through SLA-style cadence.",
    output: "Reliable response momentum",
  },
  {
    id: "optimize",
    step: "Step 4",
    title: "Review and optimize each week",
    detail:
      "Use outcomes to refine strategy, rebalance effort, and improve interview-to-offer conversion.",
    output: "Compounding weekly lift",
  },
]

const moduleConstellation: FlowModule[] = [
  {
    id: "studio",
    title: "AI Studio",
    detail: "Generate better assets and decisions faster.",
    href: "/app/ai-studio",
    x: 16,
    y: 64,
    icon: BrainCircuit,
  },
  {
    id: "tower",
    title: "Control Tower",
    detail: "Track risk, stale lanes, and next actions.",
    href: "/app/control-tower",
    x: 36,
    y: 34,
    icon: Shield,
  },
  {
    id: "office",
    title: "Program Office",
    detail: "Run your weekly execution plan with owners.",
    href: "/app/program-office",
    x: 60,
    y: 62,
    icon: Building2,
  },
  {
    id: "forecast",
    title: "Forecast",
    detail: "Estimate interviews and offers before they happen.",
    href: "/app/forecast",
    x: 82,
    y: 38,
    icon: LineChart,
  },
]

const moduleBridgePairs: Array<[number, number]> = [
  [0, 1],
  [1, 3],
  [0, 2],
  [2, 3],
]

const moduleHoloLayout: Record<
  string,
  { left: string; top: string; delay: string; tone: "mint" | "cyan" | "gold" | "lime" }
> = {
  studio: { left: "17%", top: "66%", delay: "0s", tone: "cyan" },
  tower: { left: "34%", top: "36%", delay: "0.12s", tone: "mint" },
  office: { left: "62%", top: "62%", delay: "0.2s", tone: "lime" },
  forecast: { left: "83%", top: "40%", delay: "0.28s", tone: "gold" },
}

const workflowSignals = [
  {
    label: "Role quality signal",
    detail: "Higher fit scoring across your weekly priority stack.",
    value: 86,
    delta: "+24%",
  },
  {
    label: "Asset readiness",
    detail: "Faster resume + outreach turnaround per target role.",
    value: 74,
    delta: "-41% prep time",
  },
  {
    label: "Follow-up consistency",
    detail: "More applications are touched before they go cold.",
    value: 79,
    delta: "+19% reply rate",
  },
  {
    label: "Interview conversion",
    detail: "Clearer prep and sequencing improves conversion.",
    value: 71,
    delta: "+27%",
  },
]

const inlineMetrics = [
  { label: "Live Missions", value: "34", trend: "+6 this week" },
  { label: "Signals Processed", value: "1,942", trend: "+14%" },
  { label: "Role Packs Built", value: "326", trend: "Steady lift" },
  { label: "Follow-ups Sent", value: "468", trend: "+21%" },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export default function HomePage() {
  const { resolvedTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [pointer, setPointer] = useState<PointerState>({ x: 52, y: 30 })
  const [activeStep, setActiveStep] = useState(0)

  const pointerRef = useRef<PointerState>(pointer)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isLightTheme = mounted && resolvedTheme === "light"

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    pointerRef.current = pointer
  }, [pointer])

  useEffect(() => {
    const updateProgress = () => {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      if (scrollable <= 0) {
        setScrollProgress(0)
        return
      }
      const progress = clamp((window.scrollY / scrollable) * 100, 0, 100)
      setScrollProgress(progress)
    }

    updateProgress()
    window.addEventListener("scroll", updateProgress, { passive: true })

    return () => window.removeEventListener("scroll", updateProgress)
  }, [])

  useEffect(() => {
    let raf = 0

    const updatePointer = (clientX: number, clientY: number) => {
      if (raf !== 0) return

      raf = window.requestAnimationFrame(() => {
        const next = {
          x: Number(((clientX / Math.max(window.innerWidth, 1)) * 100).toFixed(2)),
          y: Number(((clientY / Math.max(window.innerHeight, 1)) * 100).toFixed(2)),
        }
        setPointer(next)
        raf = 0
      })
    }

    const onMouseMove = (event: MouseEvent) => {
      updatePointer(event.clientX, event.clientY)
    }

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      updatePointer(touch.clientX, touch.clientY)
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("touchmove", onTouchMove, { passive: true })

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("touchmove", onTouchMove)
      if (raf !== 0) window.cancelAnimationFrame(raf)
    }
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % journeySteps.length)
    }, 3200)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    let frame = 0
    let rafId = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight

      if (width === 0 || height === 0) {
        rafId = window.requestAnimationFrame(draw)
        return
      }

      frame += 1
      context.clearRect(0, 0, width, height)

      const { x: pointerXRatio, y: pointerYRatio } = pointerRef.current
      const pointerX = (pointerXRatio / 100) * width
      const pointerY = (pointerYRatio / 100) * height

      const baseGradient = context.createLinearGradient(0, 0, width, height)
      if (isLightTheme) {
        baseGradient.addColorStop(0, "hsla(186, 74%, 52%, 0.15)")
        baseGradient.addColorStop(0.45, "hsla(215, 64%, 78%, 0.16)")
        baseGradient.addColorStop(1, "hsla(94, 72%, 44%, 0.13)")
      } else {
        baseGradient.addColorStop(0, "hsla(186, 88%, 45%, 0.16)")
        baseGradient.addColorStop(0.45, "hsla(223, 52%, 20%, 0.12)")
        baseGradient.addColorStop(1, "hsla(94, 82%, 49%, 0.14)")
      }
      context.fillStyle = baseGradient
      context.fillRect(0, 0, width, height)

      const ribbons = isLightTheme
        ? [
            { y: 0.2, amp: 24, speed: 0.016, width: 2.2, hue: 190, alpha: 0.2 },
            { y: 0.39, amp: 20, speed: 0.013, width: 1.8, hue: 108, alpha: 0.18 },
            { y: 0.58, amp: 18, speed: 0.018, width: 1.6, hue: 205, alpha: 0.16 },
            { y: 0.76, amp: 14, speed: 0.021, width: 1.4, hue: 170, alpha: 0.15 },
          ]
        : [
            { y: 0.2, amp: 24, speed: 0.016, width: 2.2, hue: 186, alpha: 0.28 },
            { y: 0.39, amp: 20, speed: 0.013, width: 1.8, hue: 94, alpha: 0.24 },
            { y: 0.58, amp: 18, speed: 0.018, width: 1.6, hue: 202, alpha: 0.2 },
            { y: 0.76, amp: 14, speed: 0.021, width: 1.4, hue: 174, alpha: 0.17 },
          ]

      ribbons.forEach((ribbon, index) => {
        context.beginPath()
        for (let x = -20; x <= width + 20; x += 12) {
          const y =
            height * ribbon.y +
            Math.sin(x * 0.01 + frame * ribbon.speed + index * 1.1) * ribbon.amp +
            Math.cos(x * 0.004 + frame * 0.007 + index * 0.8) * ribbon.amp * 0.35

          if (x <= -20) {
            context.moveTo(x, y)
          } else {
            context.lineTo(x, y)
          }
        }

        context.strokeStyle = `hsla(${ribbon.hue}, 92%, 62%, ${ribbon.alpha})`
        context.lineWidth = ribbon.width
        context.stroke()

        context.lineTo(width + 20, height)
        context.lineTo(-20, height)
        context.closePath()

        const fill = context.createLinearGradient(0, height * ribbon.y, 0, height)
        fill.addColorStop(0, `hsla(${ribbon.hue}, 84%, 58%, 0.08)`)
        fill.addColorStop(1, "hsla(0, 0%, 100%, 0)")
        context.fillStyle = fill
        context.fill()
      })

      const pulseCount = 22
      for (let index = 0; index < pulseCount; index += 1) {
        const drift = frame * 0.012 + index * 0.7
        const x =
          (((index + 1) / (pulseCount + 1)) * width +
            Math.sin(drift * 1.2) * (14 + (index % 3) * 4) +
            width) %
          width
        const y =
          height * (0.16 + (index % 6) * 0.12) +
          Math.cos(drift * 0.9) * (10 + (index % 4) * 3)
        const glowRadius = 8 + (index % 3) * 4
        const coreRadius = 1.4 + (index % 2) * 0.9

        const glow = context.createRadialGradient(x, y, 0, x, y, glowRadius)
        glow.addColorStop(0, isLightTheme ? "hsla(98, 70%, 44%, 0.35)" : "hsla(94, 82%, 58%, 0.58)")
        glow.addColorStop(1, "hsla(0, 0%, 100%, 0)")
        context.fillStyle = glow
        context.beginPath()
        context.arc(x, y, glowRadius, 0, Math.PI * 2)
        context.fill()

        context.fillStyle = isLightTheme ? "hsla(194, 84%, 43%, 0.72)" : "hsla(186, 88%, 62%, 0.84)"
        context.beginPath()
        context.arc(x, y, coreRadius, 0, Math.PI * 2)
        context.fill()
      }

      const pointerGlow = context.createRadialGradient(
        pointerX,
        pointerY,
        0,
        pointerX,
        pointerY,
        Math.max(width, height) * 0.42
      )
      pointerGlow.addColorStop(0, isLightTheme ? "hsla(192, 88%, 44%, 0.2)" : "hsla(186, 88%, 58%, 0.28)")
      pointerGlow.addColorStop(1, "hsla(0, 0%, 100%, 0)")
      context.fillStyle = pointerGlow
      context.fillRect(0, 0, width, height)

      rafId = window.requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener("resize", resize)
    rafId = window.requestAnimationFrame(draw)

    return () => {
      window.removeEventListener("resize", resize)
      window.cancelAnimationFrame(rafId)
    }
  }, [isLightTheme])

  const activeJourney = journeySteps[activeStep] || journeySteps[0]

  return (
    <div
      className={cn(
        "landing-page relative min-h-screen overflow-x-clip",
        isLightTheme
          ? "landing-theme-light bg-[#f3f8ff] text-slate-900"
          : "landing-theme-dark bg-[#020918] text-white"
      )}
    >
      <div
        className={cn(
          "pointer-events-none fixed inset-0 -z-30",
          isLightTheme
            ? "bg-[radial-gradient(circle_at_18%_12%,rgba(80,204,255,0.2),transparent_40%),radial-gradient(circle_at_82%_22%,rgba(120,231,96,0.18),transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef6ff_46%,#e6f0ff_100%)]"
            : "bg-[radial-gradient(circle_at_18%_12%,rgba(46,221,255,0.16),transparent_38%),radial-gradient(circle_at_82%_22%,rgba(128,249,69,0.14),transparent_32%),linear-gradient(180deg,#020918_0%,#050f24_42%,#061227_100%)]"
        )}
      />
      <div
        className="landing-v3-grid pointer-events-none fixed inset-0 -z-20"
        style={
          {
            "--spot-x": `${pointer.x}%`,
            "--spot-y": `${pointer.y}%`,
          } as CSSProperties
        }
      />

      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-[80] h-[2px]",
          isLightTheme ? "bg-slate-300/70" : "bg-white/10"
        )}
      >
        <div
          className="h-full bg-gradient-to-r from-saffron-500 via-green-400 to-cyan-400 transition-[width] duration-200"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-[70] transition-colors duration-300",
          scrollProgress > 0.8
            ? isLightTheme
              ? "border-b border-slate-900/10 bg-[#f8fbff]/85 backdrop-blur-2xl"
              : "border-b border-white/10 bg-[#040d1f]/80 backdrop-blur-2xl"
            : "bg-transparent"
        )}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Logo size="md" />
          </Link>

          <nav
            className={cn(
              "hidden items-center gap-7 text-sm lg:flex",
              isLightTheme ? "text-slate-700" : "text-white/78"
            )}
          >
            <a href="#how-it-works" className={cn("transition-colors", isLightTheme ? "hover:text-slate-950" : "hover:text-white")}>How it Works</a>
            <a href="#modules" className={cn("transition-colors", isLightTheme ? "hover:text-slate-950" : "hover:text-white")}>Modules</a>
            <a href="#workflow" className={cn("transition-colors", isLightTheme ? "hover:text-slate-950" : "hover:text-white")}>Workflow</a>
            <Link href="/pricing" className={cn("transition-colors", isLightTheme ? "hover:text-slate-950" : "hover:text-white")}>Pricing</Link>
            <Link href="/signin" className={cn("transition-colors", isLightTheme ? "hover:text-slate-950" : "hover:text-white")}>Sign in</Link>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-saffron-500 via-green-400 to-cyan-400 px-5 py-2.5 font-medium text-[#062236] shadow-[0_18px_40px_-24px_rgba(66,220,186,0.9)]">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-xl border lg:hidden",
              isLightTheme
                ? "border-slate-900/14 bg-white/72 text-slate-900"
                : "border-white/20 bg-white/5"
            )}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div
            className={cn(
              "border-t px-4 pb-5 pt-3 backdrop-blur-2xl lg:hidden",
              isLightTheme
                ? "border-slate-900/10 bg-[#f8fbff]/95"
                : "border-white/10 bg-[#040d1f]/95"
            )}
          >
            <div className="grid gap-2 text-sm">
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className={cn("rounded-lg px-3 py-2", isLightTheme ? "text-slate-700 hover:bg-slate-900/10" : "text-white/85 hover:bg-white/10")}>How it Works</a>
              <a href="#modules" onClick={() => setMobileMenuOpen(false)} className={cn("rounded-lg px-3 py-2", isLightTheme ? "text-slate-700 hover:bg-slate-900/10" : "text-white/85 hover:bg-white/10")}>Modules</a>
              <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className={cn("rounded-lg px-3 py-2", isLightTheme ? "text-slate-700 hover:bg-slate-900/10" : "text-white/85 hover:bg-white/10")}>Workflow</a>
              <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className={cn("rounded-lg px-3 py-2", isLightTheme ? "text-slate-700 hover:bg-slate-900/10" : "text-white/85 hover:bg-white/10")}>Pricing</Link>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link href="/signin" onClick={() => setMobileMenuOpen(false)} className={cn("inline-flex items-center justify-center rounded-lg border px-4 py-2.5", isLightTheme ? "border-slate-900/14 text-slate-900" : "border-white/20")}>Sign in</Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-saffron-500 via-green-400 to-cyan-400 px-4 py-2.5 font-medium text-[#062236]">Start free</Link>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main>
        <section className="relative px-4 pb-20 pt-32 sm:px-6 sm:pt-36 lg:px-8 lg:pb-24 lg:pt-40">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.04fr_0.96fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/75">
                <Sparkles className="h-3.5 w-3.5 text-green-300" />
                Career Workflow Platform
              </p>

              <h1 className="mt-6 font-display text-4xl leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl">
                A seamless operating canvas
                <span className="block bg-gradient-to-r from-saffron-400 via-green-300 to-cyan-300 bg-clip-text text-transparent">
                  for your career execution.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/72 sm:text-lg">
                Climb is redesigned as one continuous visual workflow. Capture roles, generate assets, run follow-ups,
                and improve weekly outcomes without jumping between disconnected screens.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-saffron-500 via-green-400 to-cyan-400 px-7 py-3.5 text-base font-semibold text-[#072534] shadow-[0_28px_52px_-28px_rgba(66,220,186,0.88)]">
                  Launch Workspace
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/22 bg-white/5 px-7 py-3.5 text-base font-medium text-white/90 hover:bg-white/12 transition-colors">
                  Explore Plans
                </Link>
              </div>

              <div className="mt-10 grid gap-3 text-sm text-white/70 sm:grid-cols-2">
                <div className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-300" />
                  AI guidance with clear next actions
                </div>
                <div className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                  Workflow continuity across modules
                </div>
                <div className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-saffron-300" />
                  Forecast-informed weekly planning
                </div>
                <div className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-300" />
                  Desktop, tablet, and mobile parity
                </div>
              </div>
            </div>

            <div className="relative h-[420px] sm:h-[500px] lg:h-[560px]">
              <div className="absolute inset-0 overflow-hidden rounded-[2.2rem] border border-white/12 bg-[#06122a]/55 shadow-[0_50px_120px_-70px_rgba(10,32,77,0.95)] backdrop-blur-sm">
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.13),transparent_38%)]" />
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#0b2644]/58" />
              </div>

              <div className="absolute inset-0">
                <div className="pointer-events-none absolute left-[8%] top-[10%] rounded-full border border-white/22 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white/82">
                  Live operating canvas
                </div>

                <div className="pointer-events-none absolute right-[9%] top-[11%] flex items-center gap-2 rounded-full border border-green-400/35 bg-green-400/8 px-3 py-1 text-[11px] font-semibold text-green-200">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-300" />
                  </span>
                  Live
                </div>

                <div className="pointer-events-none absolute inset-0">
                  {moduleConstellation.map((module, index) => {
                    const Icon = module.icon
                    const isActive = activeStep % moduleConstellation.length === index
                    return (
                      <div
                        key={module.id}
                        className={cn(
                          "absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500",
                          isActive ? "scale-105" : "scale-100 opacity-90"
                        )}
                        style={{ left: `${module.x}%`, top: `${module.y}%` }}
                      >
                        <div className={cn("landing-v3-node inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs", isActive ? "border-cyan-300/45 bg-cyan-300/10 text-cyan-100" : "border-white/25 bg-[#07142a]/65 text-white/80") }>
                          <Icon className="h-3.5 w-3.5" />
                          {module.title}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pointer-events-none absolute bottom-[10%] left-[8%] right-[8%] rounded-2xl border border-white/14 bg-[#08172f]/70 px-4 py-3 backdrop-blur-md">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/58">Current sequence</p>
                  <p className="mt-1 text-sm text-white/88">{activeJourney.title}</p>
                  <p className="mt-1 text-xs text-white/62">{activeJourney.output}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl border-y border-white/10 py-6">
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 text-center">
              {inlineMetrics.map((metric) => (
                <div key={metric.label} className="w-[170px]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">{metric.label}</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{metric.value}</p>
                  <p className="mt-0.5 text-xs text-green-300">{metric.trend}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="relative px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[0.84fr_1.16fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">How It Works</p>
              <h2 className="mt-3 font-display text-3xl tracking-[-0.02em] text-white sm:text-5xl">
                One continuous weekly loop.
              </h2>
              <p className="mt-4 max-w-md text-base text-white/68">
                No dashboard hopping. One flow that starts with intake and ends with better outcomes every week.
              </p>

              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/5 px-3 py-2 text-xs text-white/72">
                <Workflow className="h-3.5 w-3.5 text-cyan-300" />
                Active now: {activeJourney.step} · {activeJourney.title}
              </div>

              <div className="mt-6 flex items-center gap-2">
                {journeySteps.map((step, index) => (
                  <span
                    key={step.id}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      index === activeStep ? "w-12 bg-gradient-to-r from-saffron-400 via-green-300 to-cyan-300" : "w-6 bg-white/20"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-10">
              {journeySteps.map((step, index) => (
                <article key={step.id} className="relative border-l border-white/14 pl-7">
                  <span
                    className={cn(
                      "absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full border transition-colors",
                      index === activeStep
                        ? "border-cyan-300 bg-cyan-300"
                        : "border-white/40 bg-[#08182e]"
                    )}
                  />
                  <p className="text-xs uppercase tracking-[0.14em] text-white/46">{step.step}</p>
                  <h3 className="mt-1 font-display text-2xl text-white">{step.title}</h3>
                  <p className="mt-2 text-white/68">{step.detail}</p>
                  <p className="mt-3 inline-flex items-center gap-2 text-sm text-green-300">
                    <Target className="h-4 w-4" />
                    {step.output}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="modules" className="relative border-y border-white/8 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.16em] text-white/50">Modules</p>
              <h2 className="mt-3 font-display text-3xl tracking-[-0.02em] text-white sm:text-5xl">
                Every module in one visual system.
              </h2>
              <p className="mt-4 text-base text-white/68">
                Instead of independent cards, modules now sit on a shared dynamic topology so the product feels like one connected platform.
              </p>
            </div>

            <div className="relative mt-12 h-[380px] sm:h-[460px] overflow-hidden rounded-[2rem] border border-white/12 bg-[#051227]/78">
              <div className="landing-v4-cosmic-fog absolute inset-0" />
              <div className="landing-v4-gridplane absolute inset-x-0 bottom-0 h-[72%]" />
              <div className="landing-v4-vignette absolute inset-0" />

              <div className="pointer-events-none absolute left-1/2 top-[12%] -translate-x-1/2 rounded-full border border-cyan-200/18 bg-[#08172f]/70 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">
                Seamless tool graph
              </div>

              <div className="landing-v4-core">
                <span className="landing-v4-core-badge">
                  <Sparkles className="h-4 w-4" />
                </span>
                <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-cyan-100/65">Climb Flow Core</p>
              </div>

              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
                {moduleConstellation.map((module, index) => {
                  const layout = moduleHoloLayout[module.id]
                  if (!layout) return null
                  const x = Number(layout.left.replace("%", ""))
                  const y = Number(layout.top.replace("%", ""))
                  const controlY = y < 50 ? 26 : 72

                  return (
                    <g key={`stream-${module.id}`}>
                      <path
                        id={`holo-stream-${module.id}`}
                        d={`M 50 52 C ${(50 + x) / 2} ${controlY}, ${(50 + x) / 2} ${(controlY + y) / 2} ${x} ${y}`}
                        className="landing-v4-stream"
                        style={{ animationDelay: `${index * 0.4}s` }}
                      />
                      <circle r="1.05" className="landing-v4-stream-orb">
                        <animateMotion dur={`${4.6 + index * 0.75}s`} repeatCount="indefinite">
                          <mpath href={`#holo-stream-${module.id}`} />
                        </animateMotion>
                      </circle>
                    </g>
                  )
                })}

                {moduleBridgePairs.map(([fromIndex, toIndex], index) => {
                  const from = moduleConstellation[fromIndex]
                  const to = moduleConstellation[toIndex]
                  const fromLayout = from ? moduleHoloLayout[from.id] : undefined
                  const toLayout = to ? moduleHoloLayout[to.id] : undefined
                  if (!fromLayout || !toLayout || !from || !to) return null

                  const fromX = Number(fromLayout.left.replace("%", ""))
                  const fromY = Number(fromLayout.top.replace("%", ""))
                  const toX = Number(toLayout.left.replace("%", ""))
                  const toY = Number(toLayout.top.replace("%", ""))
                  const controlX = (fromX + toX) / 2
                  const controlY = (fromY + toY) / 2 + (index % 2 === 0 ? -7 : 7)

                  return (
                    <path
                      key={`bridge-${from.id}-${to.id}`}
                      d={`M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`}
                      className="landing-v4-bridge"
                      style={{ animationDelay: `${index * 0.5}s` }}
                    />
                  )
                })}
              </svg>

              {moduleConstellation.map((module) => {
                const Icon = module.icon
                const layout = moduleHoloLayout[module.id]
                if (!layout) return null
                return (
                  <Link
                    key={module.id}
                    href={module.href}
                    className="group absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: layout.left, top: layout.top }}
                  >
                    <div
                      className={cn(
                        "landing-v4-module-shard",
                        layout.tone === "mint" && "tone-mint",
                        layout.tone === "cyan" && "tone-cyan",
                        layout.tone === "gold" && "tone-gold",
                        layout.tone === "lime" && "tone-lime"
                      )}
                      style={{ animationDelay: layout.delay }}
                    >
                      <div className="landing-v4-module-icon">
                        <Icon className="h-3.5 w-3.5 text-cyan-100" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{module.title}</p>
                        <p className="text-xs leading-relaxed text-white/62">{module.detail}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="relative px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/50">Workflow</p>
                <h2 className="mt-3 font-display text-3xl tracking-[-0.02em] text-white sm:text-5xl">
                  Dynamic operational signals, not static panels.
                </h2>
                <p className="mt-4 text-base text-white/68">
                  You can read signal strength in one glance, then execute the next best step directly from the same flow.
                </p>

                <div className="mt-8 space-y-3 text-sm text-white/72">
                  <p className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-300" />
                    Role-fit prioritization updates live.
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                    Follow-up and risk state stay in sync.
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-saffron-300" />
                    Weekly forecast adjusts from execution data.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {workflowSignals.map((signal, index) => (
                  <article key={signal.label} className="border-b border-white/12 pb-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">{signal.label}</p>
                        <p className="mt-1 text-sm text-white/62">{signal.detail}</p>
                      </div>
                      <p className="text-sm font-semibold text-green-300">{signal.delta}</p>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-saffron-400 via-green-300 to-cyan-300 transition-all duration-700"
                        style={{ width: `${signal.value}%`, transitionDelay: `${index * 80}ms` }}
                      />
                    </div>
                  </article>
                ))}

                <div className="pt-2">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 text-base font-semibold text-cyan-200 hover:text-cyan-100"
                  >
                    Start building your weekly operating rhythm
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6 lg:px-8">
          <div
            className={cn(
              "mx-auto max-w-7xl overflow-hidden rounded-[1.6rem] border px-6 py-8 sm:px-10 sm:py-10",
              isLightTheme
                ? "border-slate-900/12 bg-white/80 shadow-[0_40px_90px_-70px_rgba(29,75,140,0.45)]"
                : "border-white/14 bg-[linear-gradient(120deg,rgba(8,26,52,0.95),rgba(8,40,62,0.9),rgba(16,62,58,0.9))]"
            )}
          >
            <div className="grid gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/72">Launch Sequence</p>
                <h3 className="mt-2 font-display text-3xl tracking-[-0.02em] text-white sm:text-4xl">
                  Take the next step with clear controls and trusted defaults.
                </h3>
                <p className="mt-3 max-w-2xl text-white/72">
                  Start a workspace, review plan options, and operate with transparent privacy and trust controls from day one.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0a2140]">
                    Launch Workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/28 bg-white/8 px-6 py-3 text-sm font-semibold text-white">
                    Review Pricing
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/14 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/55">Privacy</p>
                  <p className="mt-1 text-sm text-white/88">Data controls and export options are always available.</p>
                </div>
                <div className="rounded-xl border border-white/14 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/55">Trust</p>
                  <p className="mt-1 text-sm text-white/88">Security posture and product reliability are visible.</p>
                </div>
                <div className="rounded-xl border border-white/14 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/55">Compliance</p>
                  <p className="mt-1 text-sm text-white/88">Clear terms and policy references for teams.</p>
                </div>
                <div className="rounded-xl border border-white/14 bg-white/5 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/55">Support</p>
                  <p className="mt-1 text-sm text-white/88">Guided help center and onboarding resources.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 sm:px-6 lg:px-8">
          <div
            className={cn(
              "mx-auto flex max-w-7xl flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between",
              isLightTheme ? "border-slate-900/12 text-slate-600" : "border-white/10 text-white/58"
            )}
          >
            <p className="text-sm">
              © {new Date().getFullYear()} Climb. Career workflow platform.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <Link href="/legal/privacy" className={cn("transition-colors", isLightTheme ? "hover:text-slate-900" : "hover:text-white")}>
                Privacy
              </Link>
              <Link href="/trust" className={cn("transition-colors", isLightTheme ? "hover:text-slate-900" : "hover:text-white")}>
                Trust
              </Link>
              <Link href="/legal/terms" className={cn("transition-colors", isLightTheme ? "hover:text-slate-900" : "hover:text-white")}>
                Terms
              </Link>
              <Link href="/app/help" className={cn("transition-colors", isLightTheme ? "hover:text-slate-900" : "hover:text-white")}>
                Help
              </Link>
            </div>
          </div>
        </section>
      </main>

      <style jsx global>{`
        .landing-theme-light {
          color-scheme: light;
        }

        .landing-theme-light [class*="text-white"] {
          color: rgba(15, 23, 42, 0.92) !important;
        }

        .landing-theme-light [class*="border-white"] {
          border-color: rgba(15, 23, 42, 0.16) !important;
        }

        .landing-theme-light [class*="bg-white/"] {
          background-color: rgba(255, 255, 255, 0.72) !important;
        }

        .landing-theme-light [class*="bg-[#0"] {
          background-color: rgba(246, 250, 255, 0.84) !important;
        }

        .landing-theme-light .landing-v3-grid {
          background-image:
            linear-gradient(rgba(109, 137, 168, 0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(109, 137, 168, 0.18) 1px, transparent 1px),
            radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 24%), rgba(64, 199, 255, 0.2), transparent 40%);
        }

        .landing-theme-light .landing-v4-cosmic-fog {
          background:
            radial-gradient(circle at 50% 45%, rgba(56, 216, 255, 0.18), transparent 44%),
            radial-gradient(circle at 12% 16%, rgba(134, 252, 90, 0.14), transparent 34%),
            radial-gradient(circle at 86% 76%, rgba(255, 205, 104, 0.14), transparent 38%);
        }

        .landing-theme-light .landing-v4-gridplane {
          background-image:
            linear-gradient(rgba(84, 134, 191, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(84, 134, 191, 0.2) 1px, transparent 1px);
          opacity: 0.46;
        }

        .landing-theme-light .landing-v4-vignette {
          background:
            radial-gradient(52% 42% at 50% 42%, transparent 42%, rgba(182, 212, 239, 0.54) 100%),
            linear-gradient(180deg, rgba(236, 246, 255, 0.12), rgba(220, 236, 252, 0.64));
        }

        .landing-theme-light .landing-v4-core {
          border-color: rgba(20, 125, 170, 0.34);
          background:
            radial-gradient(circle at 50% 30%, rgba(52, 213, 255, 0.24), transparent 62%),
            radial-gradient(circle at 50% 80%, rgba(101, 252, 126, 0.18), transparent 72%),
            rgba(235, 246, 255, 0.9);
          box-shadow:
            0 0 0 20px rgba(79, 199, 238, 0.08),
            0 0 46px rgba(56, 216, 255, 0.2);
        }

        .landing-theme-light .landing-v4-core-badge {
          color: rgba(5, 74, 109, 0.92);
          border-color: rgba(69, 177, 221, 0.42);
        }

        .landing-theme-light .landing-v4-stream {
          stroke: rgba(31, 147, 191, 0.54);
        }

        .landing-theme-light .landing-v4-stream-orb {
          fill: rgba(18, 146, 186, 0.84);
          filter: drop-shadow(0 0 8px rgba(70, 193, 227, 0.7));
        }

        .landing-theme-light .landing-v4-bridge {
          stroke: rgba(84, 168, 59, 0.38);
        }

        .landing-theme-light .landing-v4-module-shard {
          border-color: rgba(132, 168, 205, 0.28);
          background:
            linear-gradient(145deg, rgba(245, 251, 255, 0.96), rgba(233, 245, 255, 0.9));
          box-shadow: 0 24px 42px -34px rgba(68, 103, 153, 0.42);
        }

        .landing-theme-light .landing-v4-module-shard:hover {
          border-color: rgba(60, 180, 225, 0.44);
        }

        .landing-theme-light .landing-v4-module-icon {
          border-color: rgba(95, 180, 214, 0.38);
          background: linear-gradient(138deg, rgba(70, 223, 255, 0.2), rgba(138, 252, 106, 0.24));
        }

        .landing-theme-light .landing-v4-module-icon svg {
          color: rgba(9, 95, 132, 0.95);
        }

        .landing-theme-light .landing-v3-node {
          box-shadow: 0 12px 24px -18px rgba(44, 79, 130, 0.52);
        }

        .landing-v3-grid {
          background-image:
            linear-gradient(rgba(135, 162, 198, 0.11) 1px, transparent 1px),
            linear-gradient(90deg, rgba(135, 162, 198, 0.11) 1px, transparent 1px),
            radial-gradient(circle at var(--spot-x, 50%) var(--spot-y, 24%), rgba(80, 228, 221, 0.22), transparent 36%);
          background-size: 44px 44px, 44px 44px, auto;
          background-position: 0 0, 0 0, center;
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.08) 100%);
          -webkit-mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.08) 100%);
        }

        .landing-v4-cosmic-fog {
          background:
            radial-gradient(circle at 50% 45%, rgba(56, 216, 255, 0.24), transparent 44%),
            radial-gradient(circle at 12% 16%, rgba(134, 252, 90, 0.2), transparent 34%),
            radial-gradient(circle at 86% 76%, rgba(255, 205, 104, 0.18), transparent 38%);
        }

        .landing-v4-gridplane {
          transform: perspective(520px) rotateX(54deg) scale(1.18);
          transform-origin: center bottom;
          background-image:
            linear-gradient(rgba(133, 177, 229, 0.16) 1px, transparent 1px),
            linear-gradient(90deg, rgba(133, 177, 229, 0.16) 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: 0.62;
          animation: landingV4GridFlow 16s linear infinite;
        }

        .landing-v4-vignette {
          background:
            radial-gradient(52% 42% at 50% 42%, transparent 42%, rgba(2, 10, 26, 0.7) 100%),
            linear-gradient(180deg, rgba(2, 8, 24, 0.12), rgba(2, 8, 24, 0.68));
        }

        .landing-v4-core {
          position: absolute;
          left: 50%;
          top: 51%;
          transform: translate(-50%, -50%);
          width: 118px;
          height: 118px;
          border-radius: 999px;
          border: 1px solid rgba(134, 244, 255, 0.4);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 50% 30%, rgba(52, 213, 255, 0.26), transparent 62%),
            radial-gradient(circle at 50% 80%, rgba(101, 252, 126, 0.2), transparent 72%),
            rgba(8, 28, 58, 0.76);
          box-shadow:
            0 0 0 20px rgba(79, 199, 238, 0.08),
            0 0 56px rgba(56, 216, 255, 0.24);
          animation: landingV4CorePulse 6s ease-in-out infinite;
          pointer-events: none;
        }

        .landing-v4-core-badge {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(190, 247, 255, 0.95);
          background: linear-gradient(138deg, rgba(66, 217, 255, 0.3), rgba(145, 252, 109, 0.3));
          border: 1px solid rgba(168, 248, 255, 0.34);
        }

        .landing-v4-stream {
          fill: none;
          stroke: rgba(82, 230, 255, 0.58);
          stroke-width: 1.1;
          stroke-linecap: round;
          stroke-dasharray: 4 8;
          animation: landingV4StreamFlow 12s linear infinite;
        }

        .landing-v4-stream-orb {
          fill: rgba(126, 244, 255, 0.94);
          filter: drop-shadow(0 0 8px rgba(76, 222, 255, 0.82));
        }

        .landing-v4-bridge {
          fill: none;
          stroke: rgba(143, 252, 102, 0.32);
          stroke-width: 0.95;
          stroke-dasharray: 2 9;
          stroke-linecap: round;
          animation: landingV4StreamFlow 16s linear infinite reverse;
        }

        .landing-v4-module-shard {
          display: inline-flex;
          align-items: center;
          gap: 0.62rem;
          min-width: 176px;
          max-width: 232px;
          border-radius: 1.1rem;
          border: 1px solid rgba(195, 230, 255, 0.2);
          background:
            linear-gradient(145deg, rgba(11, 30, 63, 0.88), rgba(7, 19, 40, 0.76));
          padding: 0.6rem 0.72rem;
          box-shadow: 0 24px 46px -30px rgba(5, 16, 41, 0.86);
          backdrop-filter: blur(11px);
          -webkit-backdrop-filter: blur(11px);
          animation: landingV4ShardFloat 6.4s ease-in-out infinite;
          transition: border-color 220ms ease, transform 220ms ease;
        }

        .landing-v4-module-shard:hover {
          border-color: rgba(108, 236, 255, 0.5);
          transform: translateY(-3px);
        }

        .landing-v4-module-shard.tone-cyan {
          box-shadow: 0 24px 50px -32px rgba(64, 207, 255, 0.38);
        }

        .landing-v4-module-shard.tone-mint {
          box-shadow: 0 24px 50px -32px rgba(126, 247, 106, 0.32);
        }

        .landing-v4-module-shard.tone-gold {
          box-shadow: 0 24px 50px -32px rgba(248, 202, 97, 0.32);
        }

        .landing-v4-module-shard.tone-lime {
          box-shadow: 0 24px 50px -32px rgba(145, 245, 106, 0.3);
        }

        .landing-v4-module-icon {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(138deg, rgba(70, 223, 255, 0.34), rgba(138, 252, 106, 0.32));
          border: 1px solid rgba(163, 245, 255, 0.4);
          flex-shrink: 0;
        }

        .landing-v3-node {
          box-shadow: 0 12px 24px -16px rgba(10, 28, 70, 0.66);
        }

        @keyframes landingV4GridFlow {
          0% {
            background-position: 0 0, 0 0;
          }
          100% {
            background-position: 28px 36px, -28px -36px;
          }
        }

        @keyframes landingV4StreamFlow {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -220;
          }
        }

        @keyframes landingV4CorePulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.95;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.06);
            opacity: 1;
          }
        }

        @keyframes landingV4ShardFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  )
}
