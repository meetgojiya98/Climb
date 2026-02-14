"use client"

import { useState } from "react"
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

const operatingFlow = [
  {
    step: "01",
    title: "Ingest and prioritize opportunities",
    detail:
      "AI parses roles, maps fit, and ranks where your effort will compound fastest.",
  },
  {
    step: "02",
    title: "Generate high-conviction assets",
    detail:
      "Deploy role-specific resume, narrative, and outreach assets with one coordinated run.",
  },
  {
    step: "03",
    title: "Execute with control loops",
    detail:
      "Keep every thread moving with SLA-style follow-up timing and risk alerts.",
  },
  {
    step: "04",
    title: "Forecast and improve weekly",
    detail:
      "Use conversion telemetry to tune strategy and lock in measurable week-over-week gains.",
  },
]

const horizonCards = [
  {
    icon: BrainCircuit,
    title: "AI Studio",
    detail: "Strategic AI planning, execution ladders, and coaching loops in one surface.",
    href: "/app/ai-studio",
  },
  {
    icon: Shield,
    title: "Control Tower",
    detail: "Pipeline governance with stale risk, bottlenecks, and response-rate diagnostics.",
    href: "/app/control-tower",
  },
  {
    icon: Building2,
    title: "Program Office",
    detail: "Executive review layer for ownership, cadence, and operating scorecards.",
    href: "/app/program-office",
  },
  {
    icon: LineChart,
    title: "Forecast Engine",
    detail: "Scenario modeling for interview velocity, offer probability, and decision timing.",
    href: "/app/forecast",
  },
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background overflow-x-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute -top-28 -left-24 h-[31rem] w-[31rem] rounded-full bg-saffron-500/18 blur-[130px]" />
        <div className="absolute top-20 right-[-6rem] h-[25rem] w-[25rem] rounded-full bg-gold-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10rem] left-[30%] h-[33rem] w-[33rem] rounded-full bg-navy-500/18 blur-[155px]" />
        <div className="absolute inset-0 bg-grid opacity-20" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/65 bg-background/78 backdrop-blur-2xl">
        <nav className="container-page py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="shrink-0">
            <Logo size="md" />
          </Link>

          <div className="hidden md:flex items-center gap-1 lg:gap-2 text-sm">
            <a href="#how-it-works" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              How It Works
            </a>
            <a href="#capabilities" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              Capabilities
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
          <div className="md:hidden border-t border-border/65 bg-background/92 px-4 py-4 flex flex-col gap-1">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg"
            >
              How It Works
            </a>
            <a
              href="#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg"
            >
              Capabilities
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
        <div className="grid gap-8 lg:grid-cols-[1.04fr_0.96fr] items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-saffron-500/35 bg-saffron-500/10 px-3 py-1.5 text-xs font-semibold text-saffron-700 dark:text-saffron-300 mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Version 4 • Enterprise AI Career Operating System
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-[-0.035em] leading-[1.02]">
              Replace chaotic job search effort
              <span className="gradient-text"> with AI operating precision.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl">
              Climb v4 unifies strategy, execution, and governance into one enterprise-grade workspace designed for measurable outcomes across desktop, tablet, and mobile.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="btn-saffron text-base px-6 py-3.5">
                Launch Version 4
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/pricing" className="btn-outline text-base px-6 py-3.5">
                Explore Plans
              </Link>
            </div>

            <div className="mt-7 grid gap-2 sm:grid-cols-2 text-sm">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                AI-first workflow orchestration
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Control Tower and Program Office
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Forecast-driven weekly optimization
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Mobile/iPad/desktop consistency
              </div>
            </div>
          </div>

          <div className="card-elevated p-4 sm:p-5 lg:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-saffron-500/14 via-transparent to-gold-500/14 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Executive Snapshot</p>
                  <h2 className="font-display text-xl mt-1">AI Command Board</h2>
                </div>
                <LogoMark size={34} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <article className="rounded-xl border border-border/80 bg-background/84 p-3">
                  <p className="text-xs text-muted-foreground">Opportunity Fit Index</p>
                  <p className="mt-1 text-2xl font-semibold">91%</p>
                  <p className="text-xs text-green-600 mt-1">+11% week-over-week</p>
                </article>
                <article className="rounded-xl border border-border/80 bg-background/84 p-3">
                  <p className="text-xs text-muted-foreground">Interview Readiness</p>
                  <p className="mt-1 text-2xl font-semibold">78%</p>
                  <p className="text-xs text-saffron-600 mt-1">Strong positive momentum</p>
                </article>
              </div>

              <div className="mt-4 rounded-xl border border-border/80 bg-background/84 p-3">
                <p className="text-xs text-muted-foreground mb-2">Mission queue for today</p>
                <div className="space-y-2 text-sm">
                  {[
                    "Autoprioritize 6 qualified roles by conversion confidence.",
                    "Generate role-specific resume + narrative packs for top 3 opportunities.",
                    "Run 72-hour follow-up sweep and close stale pipeline gaps.",
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

      <section id="how-it-works" className="container-page pb-12 sm:pb-16 lg:pb-20 scroll-mt-28">
        <div className="mb-8 lg:mb-10">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">How It Works</p>
          <h2 className="font-display text-3xl sm:text-4xl">Run one repeatable operating flow every week.</h2>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            This is the fastest way to use Climb: prioritize, produce, execute, and optimize. Each stage is connected to AI guidance and measurable KPIs.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {operatingFlow.map((item) => (
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

      <section id="capabilities" className="container-page pb-12 sm:pb-16 lg:pb-20 scroll-mt-28">
        <div className="mb-8 lg:mb-10">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Capabilities</p>
          <h2 className="font-display text-3xl sm:text-4xl">Enterprise modules tuned for high-conviction execution.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {horizonCards.map((item) => (
            <Link key={item.title} href={item.href} className="card-interactive p-6 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-saffron-500/[0.08] to-gold-500/[0.1] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
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
          <div className="absolute -top-16 -left-10 h-48 w-48 rounded-full bg-saffron-500/26 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-gold-500/24 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold mb-4">
              <Bot className="h-3.5 w-3.5" />
              AI Upgrade: Version 4 Copilot Framework
            </div>
            <h2 className="font-display text-3xl sm:text-4xl leading-tight max-w-3xl">
              Ready to run your career as an AI-governed enterprise system?
            </h2>
            <p className="mt-3 text-white/75 max-w-2xl">
              Replace fragmented effort with an operating rhythm that compounds quality, velocity, and offer confidence every week.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="btn-saffron text-base px-6 py-3.5">
                Start Climb v4
                <Workflow className="h-5 w-5" />
              </Link>
              <Link
                href="/pricing"
                className="btn-outline text-base px-6 py-3.5 border-white/25 bg-white/5 hover:bg-white/12"
              >
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
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Climb OS • Version 4</p>
        </div>
      </footer>
    </div>
  )
}
