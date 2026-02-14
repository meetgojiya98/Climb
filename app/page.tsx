"use client"

import {
  useEffect,
  useState,
  type MouseEvent,
  type TouchEvent,
} from "react"
import Link from "next/link"
import { Logo, LogoMark } from "@/components/ui/logo"
import {
  Activity,
  ArrowRight,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Clock3,
  Gauge,
  Layers3,
  LineChart,
  Menu,
  Radar,
  Rocket,
  Shield,
  Sparkles,
  Target,
  Wand2,
  Workflow,
  X,
} from "lucide-react"

const flowCards = [
  {
    step: "Discover",
    title: "Map your best-fit opportunities",
    detail:
      "AI reads each role, scores your fit, and shows the best chances first.",
  },
  {
    step: "Build",
    title: "Generate assets with precision",
    detail:
      "Create resume, cover letter, and outreach drafts for each role in one place.",
  },
  {
    step: "Execute",
    title: "Operate with control loops",
    detail:
      "Track follow-ups, stale applications, and blockers across your active pipeline.",
  },
  {
    step: "Optimize",
    title: "Forecast and compound outcomes",
    detail:
      "Use weekly results to adjust priorities and improve interview-to-offer rate.",
  },
]

const modules = [
  {
    icon: BrainCircuit,
    title: "AI Studio",
    detail: "Ask AI for clear plans and next steps.",
    href: "/app/ai-studio",
  },
  {
    icon: Shield,
    title: "Control Tower",
    detail: "See pipeline risk, reply speed, and progress in one place.",
    href: "/app/control-tower",
  },
  {
    icon: Building2,
    title: "Program Office",
    detail: "Run weekly reviews with owners, goals, and status.",
    href: "/app/program-office",
  },
  {
    icon: LineChart,
    title: "Forecast Engine",
    detail: "Estimate interview volume and likely offer windows.",
    href: "/app/forecast",
  },
]

const liveSequenceTemplates = [
  "Prioritize top-fit roles by conversion potential.",
  "Generate tailored resume and narrative packs for top opportunities.",
  "Run follow-up cadence on all applications older than 72 hours.",
  "Trigger interview prep drills for roles in final-round stages.",
  "Escalate stale applications with low response probability.",
  "Reallocate focus to roles with rising conversion signal.",
]

const liveSignalTemplates = [
  "2 strong-fit roles found in the latest sync.",
  "Reply speed improved after today's follow-ups.",
  "Interview confidence improved after practice sessions.",
  "Pipeline risk dropped after clearing overdue tasks.",
]

const trustRibbonItems = [
  "Dynamic control dashboard",
  "Live AI mission updates",
  "Glass visual command cards",
  "Interactive pipeline maps",
  "Mobile and desktop visual parity",
  "Action-first weekly workflows",
]

const headlineWords = ["Turn", "your", "job", "search", "into"]
const headlineAccentWords = ["a", "clear", "weekly", "system."]

const bentoPanels = [
  {
    icon: Layers3,
    title: "Signal Layer",
    detail: "Visualize priorities, momentum, and blockers in one lane.",
    statLabel: "Signal clarity",
    statValue: "94%",
  },
  {
    icon: Radar,
    title: "Response Layer",
    detail: "Spot where follow-ups and interviews need action this week.",
    statLabel: "Reply velocity",
    statValue: "+18%",
  },
  {
    icon: Gauge,
    title: "Outcome Layer",
    detail: "Track effort-to-interview conversion with clear trend signals.",
    statLabel: "Offer forecast",
    statValue: "2.4 / mo",
  },
]

type LiveSnapshotState = {
  pipelineHealth: number
  pipelineTrend: number
  interviewConfidence: number
  interviewTrend: number
  structurePhase: number
  sequenceStart: number
  signalIndex: number
  updatedAt: Date | null
}

type PointerState = {
  x: number
  y: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function buildSparklinePoints(seed: number, phase: number) {
  const total = 10

  return Array.from({ length: total }, (_, index) => {
    const x = index * 12
    const base = 24 - ((seed + index * 7) % 11)
    const wave = Math.sin((phase + index + seed) * 0.45) * 2.6
    const y = clamp(base + wave, 5, 26)
    return `${x},${y.toFixed(2)}`
  }).join(" ")
}

function applyTilt(target: HTMLElement, clientX: number, clientY: number) {
  const rect = target.getBoundingClientRect()
  const px = (clientX - rect.left) / rect.width
  const py = (clientY - rect.top) / rect.height
  const tiltX = (0.5 - py) * 8
  const tiltY = (px - 0.5) * 10

  target.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`)
  target.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`)
  target.style.setProperty("--glow-x", `${(px * 100).toFixed(2)}%`)
  target.style.setProperty("--glow-y", `${(py * 100).toFixed(2)}%`)
}

function resetTilt(target: HTMLElement) {
  target.style.setProperty("--tilt-x", "0deg")
  target.style.setProperty("--tilt-y", "0deg")
  target.style.setProperty("--glow-x", "50%")
  target.style.setProperty("--glow-y", "50%")
}

function applyMagneticOffset(target: HTMLElement, clientX: number, clientY: number) {
  const rect = target.getBoundingClientRect()
  const px = (clientX - rect.left) / rect.width - 0.5
  const py = (clientY - rect.top) / rect.height - 0.5

  target.style.setProperty("--magnetic-x", `${(px * 14).toFixed(2)}px`)
  target.style.setProperty("--magnetic-y", `${(py * 10).toFixed(2)}px`)
}

function resetMagneticOffset(target: HTMLElement) {
  target.style.setProperty("--magnetic-x", "0px")
  target.style.setProperty("--magnetic-y", "0px")
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [spotlight, setSpotlight] = useState<PointerState>({ x: 50, y: 18 })
  const [auroraShift, setAuroraShift] = useState<PointerState>({ x: 0, y: 0 })
  const [liveSnapshot, setLiveSnapshot] = useState<LiveSnapshotState>({
    pipelineHealth: 92,
    pipelineTrend: 10,
    interviewConfidence: 79,
    interviewTrend: 6.4,
    structurePhase: 0,
    sequenceStart: 0,
    signalIndex: 0,
    updatedAt: null,
  })

  useEffect(() => {
    const updateLiveSnapshot = () => {
      setLiveSnapshot((current) => {
        const pipelineShift = Math.floor(Math.random() * 3) - 1
        const interviewShift = Math.floor(Math.random() * 3) - 1
        const pipelineTrendShift = Math.random() * 1.4 - 0.6
        const interviewTrendShift = Math.random() * 1.1 - 0.5

        return {
          pipelineHealth: clamp(current.pipelineHealth + pipelineShift, 86, 98),
          pipelineTrend: clamp(
            Number((current.pipelineTrend + pipelineTrendShift).toFixed(1)),
            4.5,
            18.5
          ),
          interviewConfidence: clamp(
            current.interviewConfidence + interviewShift,
            70,
            92
          ),
          interviewTrend: clamp(
            Number((current.interviewTrend + interviewTrendShift).toFixed(1)),
            2.4,
            13.8
          ),
          structurePhase: (current.structurePhase + 1) % 1000,
          sequenceStart:
            (current.sequenceStart + 1) % liveSequenceTemplates.length,
          signalIndex: (current.signalIndex + 1) % liveSignalTemplates.length,
          updatedAt: new Date(),
        }
      })
    }

    updateLiveSnapshot()
    const intervalId = window.setInterval(updateLiveSnapshot, 6000)

    return () => window.clearInterval(intervalId)
  }, [])

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
    let frameId = 0

    const updatePointerEffects = (clientX: number, clientY: number) => {
      if (frameId !== 0) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        const viewportWidth = window.innerWidth || 1
        const viewportHeight = window.innerHeight || 1
        const xRatio = clientX / viewportWidth
        const yRatio = clientY / viewportHeight

        setSpotlight({
          x: Number((xRatio * 100).toFixed(2)),
          y: Number((yRatio * 100).toFixed(2)),
        })
        setAuroraShift({
          x: Number(((xRatio - 0.5) * 30).toFixed(2)),
          y: Number(((yRatio - 0.5) * 24).toFixed(2)),
        })

        frameId = 0
      })
    }

    const handleMouseMove = (event: globalThis.MouseEvent) => {
      updatePointerEffects(event.clientX, event.clientY)
    }

    const handleTouchMove = (event: globalThis.TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) {
        return
      }

      updatePointerEffects(touch.clientX, touch.clientY)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("touchmove", handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("touchmove", handleTouchMove)

      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [])

  const liveSequence = Array.from({ length: 3 }, (_, index) => {
    const sequenceIndex =
      (liveSnapshot.sequenceStart + index) % liveSequenceTemplates.length
    return liveSequenceTemplates[sequenceIndex]
  })

  const floatingStructures = Array.from({ length: 9 }, (_, index) => {
    const leftBase = 6 + index * 10
    const topBase = index % 2 === 0 ? 12 + index * 4 : 22 + index * 3
    const driftX =
      Math.sin((liveSnapshot.structurePhase + index) * 0.64) * 4.8 +
      auroraShift.x * 0.2
    const driftY =
      Math.cos((liveSnapshot.structurePhase + index) * 0.56) * 4 +
      auroraShift.y * 0.2
    const size = 7 + (index % 4) * 3
    const opacity =
      0.24 +
      ((Math.sin((liveSnapshot.structurePhase + index) * 0.72) + 1) / 2) * 0.36

    return {
      id: `structure-${index}`,
      left: `calc(${leftBase}% + ${driftX.toFixed(2)}px)`,
      top: `calc(${topBase}% + ${driftY.toFixed(2)}px)`,
      size: `${size}px`,
      opacity,
      accentClass: index % 2 === 0 ? "bg-saffron-400/70" : "bg-gold-400/70",
      delayClass: ["delay-100", "delay-200", "delay-300", "delay-400", "delay-500"][
        index % 5
      ],
    }
  })

  const liveControlMetrics = [
    {
      label: "Work Throughput",
      value: clamp(
        Math.round(
          liveSnapshot.pipelineHealth * 0.88 +
            (liveSnapshot.structurePhase % 7)
        ),
        68,
        98
      ),
    },
    {
      label: "Automation Use",
      value: clamp(
        Math.round(
          liveSnapshot.interviewConfidence * 0.9 +
            (liveSnapshot.structurePhase % 5) * 2
        ),
        58,
        95
      ),
    },
    {
      label: "Risk Reduction",
      value: clamp(Math.round(liveSnapshot.pipelineTrend * 5.4), 24, 92),
    },
  ]

  const heroParallax = {
    y: Number((scrollProgress * 0.42).toFixed(2)),
    leftScale: Number((1 - scrollProgress * 0.0007).toFixed(4)),
    rightScale: Number((1 - scrollProgress * 0.00055).toFixed(4)),
    titleShift: Number((scrollProgress * -0.14).toFixed(2)),
  }

  const particleField = Array.from({ length: 22 }, (_, index) => {
    const left = (index * 11.8 + (liveSnapshot.structurePhase * 0.23 + index * 4)) % 104
    const top = ((index * 17.6 + liveSnapshot.structurePhase * 0.34) % 100) - 6
    const size = 1.6 + (index % 4) * 1.15
    const opacity = 0.18 + ((Math.sin((liveSnapshot.structurePhase + index * 5) * 0.2) + 1) / 2) * 0.45
    const duration = 4.5 + (index % 5) * 1.1

    return {
      id: `particle-${index}`,
      left: `${left.toFixed(2)}%`,
      top: `${top.toFixed(2)}%`,
      size: `${size.toFixed(2)}px`,
      opacity,
      duration: `${duration.toFixed(2)}s`,
      delay: `${(index % 6) * 0.3}s`,
    }
  })

  const graphicalMetricStrip = [
    {
      label: "Live Missions",
      value: 26 + (liveSnapshot.structurePhase % 9),
      tone: "text-saffron-700 dark:text-saffron-300",
      sparkColorClass: "stroke-saffron-500",
      seed: 1,
    },
    {
      label: "Signals Processed",
      value: 1840 + (liveSnapshot.structurePhase % 160) * 3,
      tone: "text-cyan-600 dark:text-cyan-300",
      sparkColorClass: "stroke-cyan-500",
      seed: 3,
    },
    {
      label: "Role Packs Built",
      value: 310 + (liveSnapshot.structurePhase % 60),
      tone: "text-emerald-600 dark:text-emerald-300",
      sparkColorClass: "stroke-emerald-500",
      seed: 6,
    },
    {
      label: "Follow-ups Sent",
      value: 430 + (liveSnapshot.structurePhase % 74),
      tone: "text-gold-700 dark:text-gold-300",
      sparkColorClass: "stroke-gold-500",
      seed: 8,
    },
  ]

  const handleCardMouseMove = (event: MouseEvent<HTMLElement>) => {
    applyTilt(event.currentTarget, event.clientX, event.clientY)
  }

  const handleCardTouchMove = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0]
    if (!touch) {
      return
    }

    applyTilt(event.currentTarget, touch.clientX, touch.clientY)
  }

  const handleCardMouseLeave = (event: MouseEvent<HTMLElement>) => {
    resetTilt(event.currentTarget)
  }

  const handleMagneticMouseMove = (event: MouseEvent<HTMLElement>) => {
    applyMagneticOffset(event.currentTarget, event.clientX, event.clientY)
  }

  const handleMagneticMouseLeave = (event: MouseEvent<HTMLElement>) => {
    resetMagneticOffset(event.currentTarget)
  }

  return (
    <div className="min-h-dvh bg-background overflow-x-hidden">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]">
        <div className="landing-progress-bar h-full" style={{ width: `${scrollProgress}%` }} />
      </div>

      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="landing-spotlight"
          style={{ left: `${spotlight.x}%`, top: `${spotlight.y}%` }}
        />
        <div
          className="absolute -top-24 -left-14 h-[32rem] w-[32rem] rounded-full bg-saffron-500/20 blur-[140px]"
          style={{
            transform: `translate3d(${(auroraShift.x * -0.75).toFixed(2)}px, ${(auroraShift.y * -0.8).toFixed(2)}px, 0)`,
          }}
        />
        <div
          className="absolute top-20 right-[-7rem] h-[28rem] w-[28rem] rounded-full bg-gold-500/20 blur-[130px]"
          style={{
            transform: `translate3d(${(auroraShift.x * 0.6).toFixed(2)}px, ${(auroraShift.y * -0.55).toFixed(2)}px, 0)`,
          }}
        />
        <div
          className="absolute bottom-[-11rem] left-[28%] h-[36rem] w-[36rem] rounded-full bg-navy-500/14 blur-[170px]"
          style={{
            transform: `translate3d(${(auroraShift.x * 0.3).toFixed(2)}px, ${(auroraShift.y * 0.45).toFixed(2)}px, 0)`,
          }}
        />
        <div
          className="absolute inset-0 landing-gradient-shift opacity-[0.15]"
          style={{
            transform: `translate3d(${(auroraShift.x * 0.18).toFixed(2)}px, ${(auroraShift.y * 0.12).toFixed(2)}px, 0)`,
          }}
        />
        {particleField.map((particle) => (
          <span
            key={particle.id}
            className="landing-particle"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              opacity: particle.opacity,
              animationDuration: particle.duration,
              animationDelay: particle.delay,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-grid opacity-20" />
      </div>

      <header className="landing-nav-shell sticky top-0 z-40 border-b border-border/70 bg-background/72 backdrop-blur-2xl">
        <nav className="container-page py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="shrink-0">
            <Logo size="md" />
          </Link>

          <div className="hidden md:flex items-center gap-1 lg:gap-2 text-sm">
            <a href="#how-it-works" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              How It Works
            </a>
            <a href="#modules" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              Modules
            </a>
            <a href="#workflow" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              Workflow
            </a>
            <Link href="/pricing" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              Pricing
            </Link>
            <Link href="/signin" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="btn-saffron text-sm">
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="md:hidden touch-target p-2 rounded-lg hover:bg-secondary"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {mobileMenuOpen ? (
          <div className="md:hidden border-t border-border/70 bg-background/92 px-4 py-4 flex flex-col gap-1">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg"
            >
              How It Works
            </a>
            <a
              href="#modules"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg"
            >
              Modules
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg"
            >
              Workflow
            </a>
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg"
            >
              Pricing
            </Link>
            <div className="pt-2 grid grid-cols-2 gap-2">
              <Link
                href="/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-outline justify-center text-sm"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-saffron justify-center text-sm"
              >
                Start free
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <section className="container-page landing-morph-surface pt-14 sm:pt-18 lg:pt-24 pb-10 sm:pb-14 lg:pb-16">
        <div
          className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] items-start"
          style={{ transform: `translate3d(0, ${heroParallax.y * 0.12}px, 0)` }}
        >
          <div style={{ transform: `translate3d(0, ${heroParallax.titleShift}px, 0) scale(${heroParallax.leftScale})` }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-saffron-500/35 bg-saffron-500/10 px-3 py-1.5 text-xs font-semibold text-saffron-700 dark:text-saffron-300 mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              AI Job Search System
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-[-0.035em] leading-[1.02]">
              <span className="flex flex-wrap gap-x-2 gap-y-1">
                {headlineWords.map((word, index) => (
                  <span
                    key={word}
                    className="landing-kinetic-word"
                    style={{ animationDelay: `${index * 85}ms` }}
                  >
                    {word}
                  </span>
                ))}
              </span>
              <span className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                {headlineAccentWords.map((word, index) => (
                  <span
                    key={word}
                    className="landing-kinetic-word gradient-text"
                    style={{ animationDelay: `${(headlineWords.length + index) * 85}ms` }}
                  >
                    {word}
                  </span>
                ))}
              </span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl">
              Climb helps you plan, apply, follow up, and improve each week with simple AI guidance.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="btn-saffron text-base px-6 py-3.5 magnetic-cta"
                onMouseMove={handleMagneticMouseMove}
                onMouseLeave={handleMagneticMouseLeave}
              >
                Launch Workspace
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/pricing" className="btn-outline text-base px-6 py-3.5">
                Explore Plans
              </Link>
            </div>

            <div className="mt-7 grid gap-2 sm:grid-cols-2 text-sm">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                AI help for clear next steps
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Simple control views
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Forecast-based planning
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Works on desktop, tablet, and mobile
              </div>
            </div>
          </div>

          <div
            className="space-y-4"
            style={{
              transform: `translate3d(0, ${heroParallax.y * -0.08}px, 0) scale(${heroParallax.rightScale})`,
            }}
          >
            <div className="card-elevated p-4 sm:p-5 lg:p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-saffron-500/16 via-transparent to-gold-500/14 pointer-events-none" />
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                  className="absolute top-[30%] left-[-22%] h-[1px] w-[150%] bg-gradient-to-r from-transparent via-saffron-400/45 to-transparent"
                  style={{
                    transform: `translateX(${((liveSnapshot.structurePhase % 8) - 4) * 5}px)`,
                    transition: "transform 0.8s ease",
                  }}
                />
                <div
                  className="absolute top-[58%] left-[-30%] h-[1px] w-[155%] bg-gradient-to-r from-transparent via-gold-400/45 to-transparent"
                  style={{
                    transform: `translateX(${((liveSnapshot.structurePhase % 10) - 5) * -4}px)`,
                    transition: "transform 0.8s ease",
                  }}
                />
                {floatingStructures.map((structure) => (
                  <span
                    key={structure.id}
                    className={`absolute rounded-full blur-[0.6px] float ${structure.accentClass} ${structure.delayClass}`}
                    style={{
                      left: structure.left,
                      top: structure.top,
                      width: structure.size,
                      height: structure.size,
                      opacity: structure.opacity,
                    }}
                  />
                ))}
              </div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Live Snapshot</p>
                    <h2 className="font-display text-xl mt-1">Weekly Mission Board</h2>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {liveSnapshot.updatedAt
                        ? `Last updated ${liveSnapshot.updatedAt.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}`
                        : "Starting live updates..."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-70" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                      </span>
                      Live
                    </span>
                    <div className="relative flex h-10 w-10 items-center justify-center">
                      <span className="landing-orbit-ring landing-orbit-ring-slow" />
                      <span className="landing-orbit-ring landing-orbit-ring-fast" />
                      <LogoMark size={34} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <article className="rounded-xl border border-border/80 bg-background/84 p-3">
                    <p className="text-xs text-muted-foreground">Pipeline Health</p>
                    <p className="mt-1 text-2xl font-semibold">{liveSnapshot.pipelineHealth}%</p>
                    <p className="text-xs text-green-600 mt-1">+{liveSnapshot.pipelineTrend.toFixed(1)}% week-over-week</p>
                  </article>
                  <article className="rounded-xl border border-border/80 bg-background/84 p-3">
                    <p className="text-xs text-muted-foreground">Interview Confidence</p>
                    <p className="mt-1 text-2xl font-semibold">{liveSnapshot.interviewConfidence}%</p>
                    <p className="text-xs text-saffron-700 mt-1">+{liveSnapshot.interviewTrend.toFixed(1)} pts in 7 days</p>
                  </article>
                </div>

                <div className="mt-4 rounded-xl border border-border/80 bg-background/84 p-3">
                  <div className="mb-2 rounded-lg border border-saffron-500/20 bg-saffron-500/10 px-2.5 py-2">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Live Signal</p>
                    <p className="text-sm mt-1">{liveSignalTemplates[liveSnapshot.signalIndex]}</p>
                  </div>
                  <div className="mb-3 space-y-2">
                    {liveControlMetrics.map((metric) => (
                      <div key={metric.label}>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{metric.label}</span>
                          <span className="font-medium text-foreground">{metric.value}%</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 transition-all duration-700"
                            style={{ width: `${metric.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Today&apos;s AI step list</p>
                  <div className="space-y-2 text-sm">
                    {liveSequence.map((item) => (
                      <div key={item} className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-saffron-700 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <article
              className="landing-product-mockup card-elevated relative overflow-hidden p-4 sm:p-5"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              onTouchMove={handleCardTouchMove}
            >
              <div className="module-tilt-glow" />
              <div className="relative z-[1]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Interactive Preview</p>
                    <h3 className="font-display text-lg mt-1">3D Operations Mockup</h3>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-saffron-500/30 bg-saffron-500/10 text-saffron-700 dark:text-saffron-300">
                    <Rocket className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
                  <div className="rounded-xl border border-border/80 bg-background/84 p-3">
                    <p className="text-xs text-muted-foreground">Pipeline Lift Plan</p>
                    <p className="mt-2 text-sm">Run precision applications, outreach, and follow-up loops by score.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1">
                        <Activity className="h-3.5 w-3.5 text-emerald-500" />
                        Live fit score
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1">
                        <Wand2 className="h-3.5 w-3.5 text-cyan-500" />
                        AI rewrite ready
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-background/84 p-3 text-right">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Projected Lift</p>
                    <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-300">+31%</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="container-page pb-10 sm:pb-12 lg:pb-14">
        <div className="landing-metric-strip grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-border/70 bg-card/70 px-4 py-4 sm:px-5 sm:py-5">
          {graphicalMetricStrip.map((item) => (
            <article key={item.label} className="rounded-xl border border-border/70 bg-background/78 px-3 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                <span className="landing-metric-pulse" />
              </div>
              <p className={`mt-1 text-2xl font-semibold ${item.tone}`}>{item.value.toLocaleString()}</p>
              <svg
                viewBox="0 0 108 30"
                className="mt-2 h-7 w-full"
                role="img"
                aria-label={`${item.label} trend`}
              >
                <polyline
                  points={buildSparklinePoints(item.seed, liveSnapshot.structurePhase)}
                  className={`fill-none stroke-[2.25] ${item.sparkColorClass}`}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="container-page pb-12 sm:pb-16 lg:pb-20 scroll-mt-28">
        <div className="mb-8 lg:mb-10">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">How It Works</p>
          <h2 className="font-display text-3xl sm:text-4xl">A simple flow you can repeat every week.</h2>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            Use this four-step loop each week. It keeps your workload focused and your output tied to results.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {flowCards.map((item, index) => (
            <article key={item.step} className="card-interactive p-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-saffron-500/12 blur-2xl" />
              {index < flowCards.length - 1 ? <span className="landing-flow-connector" /> : null}
              <div className="relative">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.step}</p>
                <h3 className="font-display text-xl mt-3 mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="modules" className="container-page pb-12 sm:pb-16 lg:pb-16 scroll-mt-28">
        <div className="mb-8 lg:mb-10">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Core Modules</p>
          <h2 className="font-display text-3xl sm:text-4xl">Simple tools that work together.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="module-tilt-card p-6 group relative overflow-hidden"
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              onTouchMove={handleCardTouchMove}
            >
              <div className="module-tilt-glow" />
              <div className="absolute inset-0 bg-gradient-to-br from-saffron-500/[0.09] to-gold-500/[0.12] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="landing-icon-motion mb-4">
                  <span className="landing-icon-ring" />
                  <span className="landing-icon-ring landing-icon-ring-fast" />
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-500/22 to-gold-500/22 text-saffron-700 dark:text-saffron-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="font-display text-2xl">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-saffron-700 dark:text-saffron-300">
                  Open module
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pb-10 sm:pb-14 lg:pb-16">
        <div className="landing-cinematic-divider" />
      </section>

      <section className="container-page pb-12 sm:pb-16 lg:pb-18">
        <div className="mb-6 lg:mb-8">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Visual Control Plane</p>
          <h2 className="font-display text-3xl sm:text-4xl">Glass bento views for fast decisions.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {bentoPanels.map((panel, index) => (
            <article key={panel.title} className="landing-bento-card p-5 relative overflow-hidden">
              <div className="landing-bento-shine" />
              <div className="relative z-[1]">
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-saffron-500/35 bg-saffron-500/12 text-saffron-700 dark:text-saffron-300">
                    <panel.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Zone {index + 1}</span>
                </div>
                <h3 className="font-display text-xl mt-4">{panel.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{panel.detail}</p>
                <div className="mt-5 rounded-xl border border-border/70 bg-background/72 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">{panel.statLabel}</p>
                  <p className="text-lg font-semibold mt-1">{panel.statValue}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container-page pb-12 sm:pb-16 lg:pb-20">
        <div className="landing-marquee-shell rounded-2xl border border-border/70 bg-card/70 px-3 py-3 sm:px-4 sm:py-4">
          <div className="landing-marquee-track">
            {[...trustRibbonItems, ...trustRibbonItems].map((item, index) => (
              <span key={`${item}-${index}`} className="landing-marquee-chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="container-page pb-14 sm:pb-18 lg:pb-24 scroll-mt-28">
        <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 px-5 sm:px-8 py-8 sm:py-10 lg:py-12 text-white relative overflow-hidden">
          <div className="absolute -top-16 -left-10 h-48 w-48 rounded-full bg-saffron-500/28 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-gold-500/24 blur-3xl" />
          <svg
            className="landing-workflow-graph absolute inset-0 h-full w-full"
            viewBox="0 0 1200 460"
            role="presentation"
            aria-hidden
          >
            <path d="M90 340 C 280 250, 420 260, 610 180 S 940 110, 1110 165" className="landing-workflow-path" />
            <path d="M85 390 C 240 330, 410 350, 590 300 S 930 260, 1110 285" className="landing-workflow-path is-faint" />
            <circle cx="90" cy="340" r="4.5" className="landing-workflow-node" />
            <circle cx="610" cy="180" r="4.5" className="landing-workflow-node" />
            <circle cx="1110" cy="165" r="4.5" className="landing-workflow-node" />
            <circle className="landing-workflow-travel" r="5">
              <animateMotion dur="4.6s" repeatCount="indefinite" path="M90 340 C 280 250, 420 260, 610 180 S 940 110, 1110 165" />
            </circle>
            <circle className="landing-workflow-travel travel-delayed" r="4">
              <animateMotion dur="5.6s" repeatCount="indefinite" path="M85 390 C 240 330, 410 350, 590 300 S 930 260, 1110 285" />
            </circle>
          </svg>
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold mb-4">
              <Bot className="h-3.5 w-3.5" />
              AI Guide
            </div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight max-w-3xl">
              Ready for a better week with clearer priorities?
            </h2>
            <p className="mt-3 text-white/75 max-w-2xl">
              Start with AI guidance, take action daily, and improve with weekly feedback.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="btn-saffron text-base px-6 py-3.5 magnetic-cta"
                onMouseMove={handleMagneticMouseMove}
                onMouseLeave={handleMagneticMouseLeave}
              >
                Start Climb
                <Workflow className="h-5 w-5" />
              </Link>
              <Link href="/pricing" className="btn-outline text-base px-6 py-3.5 border-white/25 bg-white/5 hover:bg-white/12">
                Explore Pricing
              </Link>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 text-xs text-white/60">
              <Clock3 className="h-3.5 w-3.5" />
              Most users finish setup in under 8 minutes
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 bg-background/82 backdrop-blur-xl">
        <div className="container-page py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/trust" className="hover:text-foreground transition-colors">
              Trust
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Climb</p>
        </div>
      </footer>
    </div>
  )
}
