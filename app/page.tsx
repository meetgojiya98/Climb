"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Logo, LogoMark } from "@/components/ui/logo"
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Clock3,
  LineChart,
  Menu,
  Shield,
  Sparkles,
  Target,
  Workflow,
  X,
} from "lucide-react"

const flowCards = [
  {
    step: "Discover",
    title: "Map your best-fit opportunities",
    detail:
      "AI parses each role, scores fit, and surfaces the highest-conversion opportunities first.",
  },
  {
    step: "Build",
    title: "Generate assets with precision",
    detail:
      "Create resume, narrative, and outreach sequences aligned to each opportunity in one run.",
  },
  {
    step: "Execute",
    title: "Operate with control loops",
    detail:
      "Track follow-up SLAs, stale risk, and momentum blockers across every active application.",
  },
  {
    step: "Optimize",
    title: "Forecast and compound outcomes",
    detail:
      "Use conversion telemetry to tune weekly priorities and improve interview-to-offer lift.",
  },
]

const modules = [
  {
    icon: BrainCircuit,
    title: "AI Studio",
    detail:
      "Strategy and execution copilots that translate intent into measurable action plans.",
    href: "/app/ai-studio",
  },
  {
    icon: Shield,
    title: "Control Tower",
    detail:
      "Centralize pipeline risk, cadence discipline, and response velocity across all roles.",
    href: "/app/control-tower",
  },
  {
    icon: Building2,
    title: "Program Office",
    detail:
      "Run weekly operating reviews with ownership, KPI tracking, and escalation signals.",
    href: "/app/program-office",
  },
  {
    icon: LineChart,
    title: "Forecast Engine",
    detail:
      "Model interview volume, conversion constraints, and probable offer windows.",
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
  "2 new high-fit roles detected in the last sync window.",
  "Response velocity improved after follow-up batch execution.",
  "Interview confidence increased after coaching loop completion.",
  "Pipeline risk reduced with overdue-thread recovery.",
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [liveSnapshot, setLiveSnapshot] = useState<LiveSnapshotState>({
    pipelineHealth: 92,
    pipelineTrend: 10.0,
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
          interviewConfidence: clamp(current.interviewConfidence + interviewShift, 70, 92),
          interviewTrend: clamp(
            Number((current.interviewTrend + interviewTrendShift).toFixed(1)),
            2.4,
            13.8
          ),
          structurePhase: (current.structurePhase + 1) % 1000,
          sequenceStart: (current.sequenceStart + 1) % liveSequenceTemplates.length,
          signalIndex: (current.signalIndex + 1) % liveSignalTemplates.length,
          updatedAt: new Date(),
        }
      })
    }

    updateLiveSnapshot()
    const intervalId = window.setInterval(updateLiveSnapshot, 6000)

    return () => window.clearInterval(intervalId)
  }, [])

  const liveSequence = Array.from({ length: 3 }, (_, index) => {
    const sequenceIndex = (liveSnapshot.sequenceStart + index) % liveSequenceTemplates.length
    return liveSequenceTemplates[sequenceIndex]
  })

  const floatingStructures = Array.from({ length: 7 }, (_, index) => {
    const leftBase = 10 + index * 12
    const topBase = index % 2 === 0 ? 16 + index * 3.4 : 22 + index * 3.1
    const driftX = Math.sin((liveSnapshot.structurePhase + index) * 0.62) * 4.5
    const driftY = Math.cos((liveSnapshot.structurePhase + index) * 0.52) * 3.8
    const size = 6 + (index % 4) * 2.6
    const opacity = 0.24 + ((Math.sin((liveSnapshot.structurePhase + index) * 0.72) + 1) / 2) * 0.34

    return {
      id: `structure-${index}`,
      left: `calc(${leftBase}% + ${driftX.toFixed(2)}px)`,
      top: `calc(${topBase}% + ${driftY.toFixed(2)}px)`,
      size: `${size}px`,
      opacity,
      accentClass: index % 2 === 0 ? "bg-saffron-400/70" : "bg-gold-400/70",
      delayClass: ["delay-100", "delay-200", "delay-300", "delay-400", "delay-500"][index % 5],
    }
  })

  const liveControlMetrics = [
    {
      label: "Execution Throughput",
      value: clamp(Math.round(liveSnapshot.pipelineHealth * 0.88 + liveSnapshot.structurePhase % 7), 68, 98),
    },
    {
      label: "Automation Coverage",
      value: clamp(Math.round(liveSnapshot.interviewConfidence * 0.9 + (liveSnapshot.structurePhase % 5) * 2), 58, 95),
    },
    {
      label: "Risk Burn-down",
      value: clamp(Math.round(liveSnapshot.pipelineTrend * 5.4), 24, 92),
    },
  ]

  return (
    <div className="min-h-dvh bg-background overflow-x-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute -top-28 -left-16 h-[30rem] w-[30rem] rounded-full bg-saffron-500/18 blur-[130px]" />
        <div className="absolute top-20 right-[-7rem] h-[26rem] w-[26rem] rounded-full bg-gold-500/18 blur-[120px]" />
        <div className="absolute bottom-[-10rem] left-[30%] h-[34rem] w-[34rem] rounded-full bg-navy-500/14 blur-[160px]" />
        <div className="absolute inset-0 bg-grid opacity-20" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/78 backdrop-blur-2xl">
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
              <Link href="/signin" onClick={() => setMobileMenuOpen(false)} className="btn-outline justify-center text-sm">
                Sign in
              </Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="btn-saffron justify-center text-sm">
                Start free
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <section className="container-page pt-14 sm:pt-18 lg:pt-24 pb-10 sm:pb-14 lg:pb-20">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-saffron-500/35 bg-saffron-500/10 px-3 py-1.5 text-xs font-semibold text-saffron-700 dark:text-saffron-300 mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Enterprise AI Career Operating System
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-[-0.035em] leading-[1.02]">
              Turn your job search into
              <span className="gradient-text"> a controlled operating engine.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl">
              Climb combines AI strategy, execution workflows, and operational governance so every week runs with focus and measurable outcomes.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="btn-saffron text-base px-6 py-3.5">
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
                AI prioritization and execution ladders
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Control and governance modules
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Forecast-driven optimization
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Desktop, tablet, and mobile parity
              </div>
            </div>
          </div>

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
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Live Operating Snapshot</p>
                  <h2 className="font-display text-xl mt-1">Weekly Mission Board</h2>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {liveSnapshot.updatedAt
                      ? `Last synced ${liveSnapshot.updatedAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}`
                      : "Initializing telemetry..."}
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
                  <LogoMark size={34} />
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
                <p className="text-xs text-muted-foreground mb-2">Today&apos;s AI-guided sequence</p>
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
        </div>
      </section>

      <section id="how-it-works" className="container-page pb-12 sm:pb-16 lg:pb-20 scroll-mt-28">
        <div className="mb-8 lg:mb-10">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">How It Works</p>
          <h2 className="font-display text-3xl sm:text-4xl">A repeatable flow for consistent career progress.</h2>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            Use this four-step loop each week. It keeps your workload focused and your output tied to results.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {flowCards.map((item) => (
            <article key={item.step} className="card-interactive p-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-saffron-500/12 blur-2xl" />
              <div className="relative">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.step}</p>
                <h3 className="font-display text-xl mt-3 mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="modules" className="container-page pb-12 sm:pb-16 lg:pb-20 scroll-mt-28">
        <div className="mb-8 lg:mb-10">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Core Modules</p>
          <h2 className="font-display text-3xl sm:text-4xl">AI and ops surfaces that work as one system.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((item) => (
            <Link key={item.title} href={item.href} className="card-interactive p-6 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-saffron-500/[0.09] to-gold-500/[0.12] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-500/22 to-gold-500/22 text-saffron-700 dark:text-saffron-300 mb-4">
                  <item.icon className="h-5 w-5" />
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

      <section id="workflow" className="container-page pb-14 sm:pb-18 lg:pb-24 scroll-mt-28">
        <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 px-5 sm:px-8 py-8 sm:py-10 lg:py-12 text-white relative overflow-hidden">
          <div className="absolute -top-16 -left-10 h-48 w-48 rounded-full bg-saffron-500/28 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-gold-500/24 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold mb-4">
              <Bot className="h-3.5 w-3.5" />
              AI Mission Control
            </div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight max-w-3xl">
              Ready to run your next week with more signal and less noise?
            </h2>
            <p className="mt-3 text-white/75 max-w-2xl">
              Start with guided prioritization, execute with cadence, and improve with forecast feedback after every cycle.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="btn-saffron text-base px-6 py-3.5">
                Start Climb
                <Workflow className="h-5 w-5" />
              </Link>
              <Link href="/pricing" className="btn-outline text-base px-6 py-3.5 border-white/25 bg-white/5 hover:bg-white/12">
                Explore Pricing
              </Link>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 text-xs text-white/60">
              <Clock3 className="h-3.5 w-3.5" />
              Typical workspace setup: under 8 minutes
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
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Climb OS</p>
        </div>
      </footer>
    </div>
  )
}
