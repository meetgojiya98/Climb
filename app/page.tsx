"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import Link from "next/link"
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [pointer, setPointer] = useState<PointerState>({ x: 52, y: 30 })
  const [activeStep, setActiveStep] = useState(0)

  const pointerRef = useRef<PointerState>(pointer)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

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
      baseGradient.addColorStop(0, "hsla(186, 88%, 45%, 0.16)")
      baseGradient.addColorStop(0.45, "hsla(223, 52%, 20%, 0.12)")
      baseGradient.addColorStop(1, "hsla(94, 82%, 49%, 0.14)")
      context.fillStyle = baseGradient
      context.fillRect(0, 0, width, height)

      const ribbons = [
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
        glow.addColorStop(0, "hsla(94, 82%, 58%, 0.58)")
        glow.addColorStop(1, "hsla(0, 0%, 100%, 0)")
        context.fillStyle = glow
        context.beginPath()
        context.arc(x, y, glowRadius, 0, Math.PI * 2)
        context.fill()

        context.fillStyle = "hsla(186, 88%, 62%, 0.84)"
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
      pointerGlow.addColorStop(0, "hsla(186, 88%, 58%, 0.28)")
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
  }, [])

  const activeJourney = journeySteps[activeStep] || journeySteps[0]

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#020918] text-white">
      <div className="pointer-events-none fixed inset-0 -z-30 bg-[radial-gradient(circle_at_18%_12%,rgba(46,221,255,0.16),transparent_38%),radial-gradient(circle_at_82%_22%,rgba(128,249,69,0.14),transparent_32%),linear-gradient(180deg,#020918_0%,#050f24_42%,#061227_100%)]" />
      <div
        className="landing-v3-grid pointer-events-none fixed inset-0 -z-20"
        style={
          {
            "--spot-x": `${pointer.x}%`,
            "--spot-y": `${pointer.y}%`,
          } as CSSProperties
        }
      />

      <div className="fixed left-0 right-0 top-0 z-[80] h-[2px] bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-saffron-500 via-green-400 to-cyan-400 transition-[width] duration-200"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <header
        className={cn(
          "fixed left-0 right-0 top-0 z-[70] transition-colors duration-300",
          scrollProgress > 0.8
            ? "border-b border-white/10 bg-[#040d1f]/80 backdrop-blur-2xl"
            : "bg-transparent"
        )}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Logo size="md" />
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-white/78 lg:flex">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#modules" className="hover:text-white transition-colors">Modules</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/signin" className="hover:text-white transition-colors">Sign in</Link>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-saffron-500 via-green-400 to-cyan-400 px-5 py-2.5 font-medium text-[#062236] shadow-[0_18px_40px_-24px_rgba(66,220,186,0.9)]">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/5 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-white/10 bg-[#040d1f]/95 px-4 pb-5 pt-3 backdrop-blur-2xl lg:hidden">
            <div className="grid gap-2 text-sm">
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 text-white/85 hover:bg-white/10">How it Works</a>
              <a href="#modules" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 text-white/85 hover:bg-white/10">Modules</a>
              <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 text-white/85 hover:bg-white/10">Workflow</a>
              <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 text-white/85 hover:bg-white/10">Pricing</Link>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link href="/signin" onClick={() => setMobileMenuOpen(false)} className="inline-flex items-center justify-center rounded-lg border border-white/20 px-4 py-2.5">Sign in</Link>
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

            <div className="relative mt-12 h-[360px] sm:h-[430px] overflow-hidden rounded-[2rem] border border-white/12 bg-[#061329]/72">
              <div className="landing-v3-mod-grid absolute inset-0" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(43,211,247,0.22),transparent_42%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(136,252,84,0.18),transparent_34%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_78%,rgba(255,202,86,0.16),transparent_38%)]" />

              <span className="landing-v3-core-ring ring-a" />
              <span className="landing-v3-core-ring ring-b" />
              <span className="landing-v3-core-ring ring-c" />

              <div className="landing-v3-core-hub">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300/20 text-cyan-100">
                  <Sparkles className="h-4 w-4" />
                </span>
                <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-white/52">Climb Core</p>
              </div>

              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
                {moduleConstellation.map((module, index) => (
                  <g key={`link-${module.id}`}>
                    <path
                      id={`module-link-${module.id}`}
                      d={`M 50 50 Q ${(50 + module.x) / 2} ${(50 + module.y) / 2 - 8} ${module.x} ${module.y}`}
                      className="landing-v3-link"
                      style={{ animationDelay: `${index * 0.6}s` }}
                    />
                    <circle r="1.05" className="landing-v3-link-orb">
                      <animateMotion dur={`${5 + index * 0.8}s`} repeatCount="indefinite">
                        <mpath href={`#module-link-${module.id}`} />
                      </animateMotion>
                    </circle>
                  </g>
                ))}

                {moduleBridgePairs.map(([fromIndex, toIndex], index) => {
                  const from = moduleConstellation[fromIndex]
                  const to = moduleConstellation[toIndex]
                  if (!from || !to) return null
                  const controlX = (from.x + to.x) / 2
                  const controlY = (from.y + to.y) / 2 + (index % 2 === 0 ? -6 : 6)
                  return (
                    <path
                      key={`bridge-${from.id}-${to.id}`}
                      d={`M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`}
                      className="landing-v3-bridge"
                      style={{ animationDelay: `${index * 0.7}s` }}
                    />
                  )
                })}
              </svg>

              <div className="pointer-events-none absolute left-1/2 top-[14%] -translate-x-1/2 rounded-full border border-white/16 bg-[#08172f]/70 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-white/60">
                Dynamic module topology
              </div>

              {moduleConstellation.map((module, index) => {
                const Icon = module.icon
                return (
                  <Link
                    key={module.id}
                    href={module.href}
                    className="group absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${module.x}%`, top: `${module.y}%` }}
                  >
                    <div
                      className="landing-v3-module-pod"
                      style={{ animationDelay: `${index * 140}ms` }}
                    >
                      <div className="landing-v3-module-dot">
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

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.1rem] border border-white/14 bg-[linear-gradient(120deg,rgba(10,32,62,0.95),rgba(9,40,56,0.9),rgba(19,66,62,0.9))] px-6 py-10 sm:px-10 sm:py-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/72">Modern Climb Experience</p>
                <h3 className="mt-2 font-display text-3xl tracking-[-0.02em] text-white sm:text-4xl">
                  Built to feel like one fluid product,
                  <span className="block text-green-200">not a collection of dashboard cards.</span>
                </h3>
                <p className="mt-3 text-white/72">
                  If you want to compare this with the previous dashboard-style landing page, we can revert instantly by commit.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0a2140]">
                  Launch Workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/28 bg-white/8 px-6 py-3 text-sm font-semibold text-white">
                  Review Pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx global>{`
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

        .landing-v3-mod-grid {
          background-image:
            linear-gradient(rgba(126, 165, 209, 0.14) 1px, transparent 1px),
            linear-gradient(90deg, rgba(126, 165, 209, 0.14) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.9), transparent 88%);
          -webkit-mask-image: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.9), transparent 88%);
          animation: landingV3GridDrift 18s linear infinite;
        }

        .landing-v3-core-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          border-radius: 999px;
          border: 1px solid rgba(103, 241, 250, 0.34);
          transform: translate(-50%, -50%);
          transform-origin: center;
          pointer-events: none;
        }

        .landing-v3-core-ring.ring-a {
          width: 150px;
          height: 150px;
          animation: landingV3Spin 18s linear infinite;
        }

        .landing-v3-core-ring.ring-b {
          width: 228px;
          height: 228px;
          border-color: rgba(150, 252, 102, 0.26);
          border-style: dashed;
          animation: landingV3Spin 26s linear infinite reverse;
        }

        .landing-v3-core-ring.ring-c {
          width: 304px;
          height: 304px;
          border-color: rgba(255, 211, 111, 0.22);
          border-style: dashed;
          animation: landingV3Spin 34s linear infinite;
        }

        .landing-v3-core-hub {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 84px;
          height: 84px;
          border-radius: 999px;
          border: 1px solid rgba(126, 244, 255, 0.34);
          background: radial-gradient(circle, rgba(14, 42, 82, 0.92) 0%, rgba(9, 29, 58, 0.78) 100%);
          box-shadow: 0 0 0 18px rgba(42, 175, 218, 0.08), 0 0 38px rgba(99, 246, 221, 0.24);
          pointer-events: none;
          animation: landingV3Pulse 5.2s ease-in-out infinite;
        }

        .landing-v3-link {
          fill: none;
          stroke: rgba(71, 229, 245, 0.56);
          stroke-width: 1.25;
          stroke-linecap: round;
          stroke-dasharray: 4 8;
          animation: landingV3LinkDash 11s linear infinite;
        }

        .landing-v3-bridge {
          fill: none;
          stroke: rgba(146, 252, 97, 0.36);
          stroke-width: 0.9;
          stroke-linecap: round;
          stroke-dasharray: 2 8;
          animation: landingV3LinkDash 14s linear infinite reverse;
        }

        .landing-v3-link-orb {
          fill: rgba(95, 246, 255, 0.9);
          filter: drop-shadow(0 0 8px rgba(84, 232, 255, 0.86));
        }

        .landing-v3-module-pod {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          min-width: 178px;
          max-width: 220px;
          border-radius: 1rem;
          border: 1px solid rgba(200, 235, 255, 0.2);
          background: linear-gradient(145deg, rgba(11, 28, 57, 0.84), rgba(8, 21, 45, 0.76));
          padding: 0.55rem 0.7rem;
          box-shadow: 0 20px 44px -28px rgba(7, 19, 43, 0.82);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          animation: landingV3NodeFloat 6s ease-in-out infinite;
          transition: border-color 220ms ease, transform 220ms ease;
        }

        .landing-v3-module-pod:hover {
          border-color: rgba(90, 230, 255, 0.44);
          transform: translateY(-2px);
        }

        .landing-v3-module-dot {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(138deg, rgba(68, 219, 255, 0.34), rgba(130, 252, 106, 0.32));
          box-shadow: 0 0 0 1px rgba(156, 243, 255, 0.4), 0 0 16px rgba(76, 215, 255, 0.34);
          flex-shrink: 0;
        }

        .landing-v3-node {
          box-shadow: 0 12px 24px -16px rgba(10, 28, 70, 0.66);
        }

        @keyframes landingV3GridDrift {
          0% {
            background-position: 0 0, 0 0;
          }
          100% {
            background-position: 34px 34px, -34px -34px;
          }
        }

        @keyframes landingV3Spin {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        @keyframes landingV3LinkDash {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: -190;
          }
        }

        @keyframes landingV3Pulse {
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

        @keyframes landingV3NodeFloat {
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
