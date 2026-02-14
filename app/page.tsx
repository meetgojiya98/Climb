"use client"

import { useState } from "react"
import Link from "next/link"
import { Logo, LogoMark } from "@/components/ui/logo"
import {
  ArrowRight,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Clock3,
  LineChart,
  Menu,
  Rocket,
  Shield,
  Sparkles,
  Target,
  Workflow,
  X,
} from "lucide-react"

const executionLoop = [
  {
    step: "01",
    title: "Model Opportunity Map",
    detail: "AI parses each role and scores fit, risk, and leverage before you spend effort.",
  },
  {
    step: "02",
    title: "Deploy Application Assets",
    detail: "Generate aligned resume + narrative + outreach sequences with one command.",
  },
  {
    step: "03",
    title: "Run Control Cadence",
    detail: "Track SLA-style follow-ups and quality signals across every pipeline stage.",
  },
  {
    step: "04",
    title: "Forecast Outcome Delta",
    detail: "Use conversion telemetry to improve strategy weekly and compound outcomes.",
  },
]

const capabilityGrid = [
  {
    icon: BrainCircuit,
    title: "AI Strategy Engine",
    detail: "Role-level planning with executive-level tradeoffs and recommended next moves.",
    href: "/app/ai-studio",
  },
  {
    icon: Shield,
    title: "Control Tower",
    detail: "Pipeline command surface for stale risk, overdue follow-ups, and governance hygiene.",
    href: "/app/control-tower",
  },
  {
    icon: Building2,
    title: "Program Office",
    detail: "Cross-module operating reviews, ownership mapping, and weekly KPI governance.",
    href: "/app/program-office",
  },
  {
    icon: LineChart,
    title: "Forecast Planner",
    detail: "Scenario simulation for interview velocity, conversion constraints, and offer targeting.",
    href: "/app/forecast",
  },
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background overflow-x-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute -top-28 -left-16 h-[30rem] w-[30rem] rounded-full bg-saffron-500/18 blur-[120px]" />
        <div className="absolute top-20 right-[-6rem] h-[24rem] w-[24rem] rounded-full bg-gold-500/20 blur-[110px]" />
        <div className="absolute bottom-[-10rem] left-[28%] h-[34rem] w-[34rem] rounded-full bg-navy-500/14 blur-[150px]" />
        <div className="absolute inset-0 bg-grid opacity-24" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/74 backdrop-blur-2xl">
        <nav className="container-page py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="shrink-0">
            <Logo size="md" />
          </Link>

          <div className="hidden md:flex items-center gap-1 lg:gap-2 text-sm">
            <a href="#loop" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">Execution Loop</a>
            <a href="#capabilities" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">Capabilities</a>
            <Link href="/pricing" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">Pricing</Link>
            <Link href="/signin" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">Sign in</Link>
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
            <a href="#loop" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
              Execution Loop
            </a>
            <a href="#capabilities" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
              Capabilities
            </a>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
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
        <div className="grid gap-8 lg:grid-cols-[1.04fr_0.96fr] items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-saffron-500/35 bg-saffron-500/12 px-3 py-1.5 text-xs font-semibold text-saffron-700 dark:text-saffron-300 mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Version 3 • AI Career Command System
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-[-0.035em] leading-[1.02]">
              Stop applying randomly.
              <span className="gradient-text"> Operate with intent.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl">
              Climb v3 turns your job search into an AI-governed operating system: plan, execute, control, and forecast from a single command workspace.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="btn-saffron text-base px-6 py-3.5">
                Launch Workspace
                <Rocket className="h-5 w-5" />
              </Link>
              <Link href="/signin" className="btn-outline text-base px-6 py-3.5">
                Open Existing Account
              </Link>
            </div>

            <div className="mt-7 grid gap-2 sm:grid-cols-2 text-sm">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                End-to-end workflow guidance
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                AI strategy + execution copilots
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Mobile, iPad, desktop parity
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Forecast-driven optimization loops
              </div>
            </div>
          </div>

          <div className="card-elevated p-4 sm:p-5 lg:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-saffron-500/14 via-transparent to-gold-500/16 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Command Snapshot</p>
                  <h2 className="font-display text-xl mt-1">Weekly Operating Deck</h2>
                </div>
                <LogoMark size={34} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <article className="rounded-xl border border-border/80 bg-background/82 p-3">
                  <p className="text-xs text-muted-foreground">Pipeline Health</p>
                  <p className="mt-1 text-2xl font-semibold">89%</p>
                  <p className="text-xs text-green-600 mt-1">+9% week-over-week</p>
                </article>
                <article className="rounded-xl border border-border/80 bg-background/82 p-3">
                  <p className="text-xs text-muted-foreground">Interview Signal</p>
                  <p className="mt-1 text-2xl font-semibold">74%</p>
                  <p className="text-xs text-gold-700 dark:text-gold-300 mt-1">Stable upward trend</p>
                </article>
              </div>

              <div className="mt-4 rounded-xl border border-border/80 bg-background/82 p-3">
                <p className="text-xs text-muted-foreground mb-2">Priority sequence for today</p>
                <div className="space-y-2 text-sm">
                  {[
                    "Parse 5 high-fit roles and auto-rank by conversion probability.",
                    "Generate role-specific narrative packs for top 3 opportunities.",
                    "Trigger follow-up sweep for applications older than 72 hours.",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-saffron-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="loop" className="container-page pb-12 sm:pb-16 lg:pb-20">
        <div className="mb-8 lg:mb-10">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Execution Loop</p>
          <h2 className="font-display text-3xl sm:text-4xl">A structured rhythm you can repeat every week.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {executionLoop.map((item) => (
            <article key={item.step} className="card-interactive p-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-saffron-500/12 blur-2xl" />
              <div className="relative">
                <p className="font-display text-3xl gradient-text">{item.step}</p>
                <h3 className="font-display text-xl mt-3 mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="capabilities" className="container-page pb-12 sm:pb-16 lg:pb-20">
        <div className="mb-8 lg:mb-10">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Capabilities</p>
          <h2 className="font-display text-3xl sm:text-4xl">AI surfaces for strategy, control, and velocity.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {capabilityGrid.map((item) => (
            <Link key={item.title} href={item.href} className="card-interactive p-6 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-saffron-500/[0.09] to-gold-500/[0.11] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-500/20 to-gold-500/20 text-saffron-700 dark:text-saffron-300 mb-4">
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

      <section className="container-page pb-14 sm:pb-18 lg:pb-24">
        <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 px-5 sm:px-8 py-8 sm:py-10 lg:py-12 text-white relative overflow-hidden">
          <div className="absolute -top-16 -left-10 h-48 w-48 rounded-full bg-saffron-500/28 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-gold-500/22 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl leading-tight max-w-3xl">
              Ready to run your career as a measurable execution system?
            </h2>
            <p className="mt-3 text-white/75 max-w-2xl">
              Move from scattered effort to an AI-guided cadence that compounds weekly performance.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="btn-saffron text-base px-6 py-3.5">
                Start Climb v3
                <Workflow className="h-5 w-5" />
              </Link>
              <Link href="/pricing" className="btn-outline text-base px-6 py-3.5 border-white/25 bg-white/5 hover:bg-white/12">
                Explore Pricing
              </Link>
            </div>

            <div className="mt-5 inline-flex items-center gap-2 text-xs text-white/60">
              <Clock3 className="h-3.5 w-3.5" />
              Typical setup time: under 8 minutes
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
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/trust" className="hover:text-foreground transition-colors">Trust</Link>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Climb OS • Version 3</p>
        </div>
      </footer>
    </div>
  )
}
