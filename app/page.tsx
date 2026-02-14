"use client"

import { useState } from "react"
import Link from "next/link"
import { Logo, LogoMark } from "@/components/ui/logo"
import {
  ArrowRight,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronRight,
  LineChart,
  Menu,
  Rocket,
  Shield,
  Sparkles,
  Workflow,
  X,
} from "lucide-react"

const workflowSteps = [
  {
    id: "01",
    title: "Capture Target Roles",
    detail: "Parse role requirements with AI and prioritize your highest-fit opportunities.",
  },
  {
    id: "02",
    title: "Generate Execution Pack",
    detail: "Create resume, cover letter, talking points, and interview plan for each role.",
  },
  {
    id: "03",
    title: "Run Operating Cadence",
    detail: "Use Control Tower and Program Office to enforce follow-ups and governance loops.",
  },
  {
    id: "04",
    title: "Forecast & Improve",
    detail: "Track conversion metrics, identify blockers, and adjust strategy weekly.",
  },
]

const modules = [
  {
    title: "AI Studio",
    description: "Context-aware copilots for role fit, narrative quality, and interview conversion.",
    icon: BrainCircuit,
    href: "/app/ai-studio",
  },
  {
    title: "Control Tower",
    description: "Real-time pipeline control, SLA-style follow-ups, and risk escalation signals.",
    icon: Shield,
    href: "/app/control-tower",
  },
  {
    title: "Program Office",
    description: "Cross-workstream governance with executive-ready progress and bottleneck views.",
    icon: Building2,
    href: "/app/program-office",
  },
  {
    title: "Forecast Planner",
    description: "Scenario modeling to estimate interview likelihood and weekly target attainment.",
    icon: LineChart,
    href: "/app/forecast",
  },
]

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background overflow-x-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-20 h-[28rem] w-[28rem] rounded-full bg-saffron-500/14 blur-[120px]" />
        <div className="absolute top-28 right-[-4rem] h-[24rem] w-[24rem] rounded-full bg-gold-500/16 blur-[110px]" />
        <div className="absolute bottom-[-8rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-navy-500/14 blur-[150px]" />
        <div className="absolute inset-0 bg-grid opacity-25" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/72 backdrop-blur-2xl">
        <nav className="container-page py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="shrink-0">
            <Logo size="md" />
          </Link>

          <div className="hidden md:flex items-center gap-1 lg:gap-2 text-sm">
            <a href="#workflow" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">Workflow</a>
            <a href="#modules" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">Modules</a>
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
          <div className="md:hidden border-t border-border/70 bg-background/90 px-4 py-4 flex flex-col gap-1">
            <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
              Workflow
            </a>
            <a href="#modules" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
              Modules
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

      <section className="container-page pt-14 sm:pt-16 lg:pt-24 pb-10 sm:pb-14 lg:pb-20">
        <div className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-saffron-500/30 bg-saffron-500/10 px-3 py-1.5 text-xs font-semibold text-saffron-700 dark:text-saffron-300 mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Enterprise AI Career Operations
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-[-0.03em] leading-[1.02]">
              Run your career like a
              <span className="gradient-text"> high-performing operating system</span>.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl">
              Climb upgrades job search from ad-hoc effort to a governed AI workflow with measurable outcomes, structured execution, and continuous optimization.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="btn-saffron text-base px-6 py-3.5">
                Launch Workspace
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/signin" className="btn-outline text-base px-6 py-3.5">
                Open Dashboard
              </Link>
            </div>

            <div className="mt-7 grid gap-2 sm:grid-cols-2 text-sm">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                AI role-matching + interview planning
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Control Tower + Program Office governance
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Mobile, iPad, and desktop-ready UX
              </div>
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Forecast-driven weekly execution
              </div>
            </div>
          </div>

          <div className="card-elevated p-4 sm:p-5 lg:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-saffron-500/10 via-transparent to-gold-500/12 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Live Mission Deck</p>
                  <h2 className="font-display text-xl mt-1">AI Execution Preview</h2>
                </div>
                <LogoMark size={34} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl border border-border/80 bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">Pipeline Health</p>
                  <p className="mt-1 text-2xl font-semibold">86%</p>
                  <p className="text-xs text-green-600 mt-1">+11% this week</p>
                </article>
                <article className="rounded-xl border border-border/80 bg-background/80 p-3">
                  <p className="text-xs text-muted-foreground">Interview Signal</p>
                  <p className="mt-1 text-2xl font-semibold">72%</p>
                  <p className="text-xs text-saffron-700 dark:text-saffron-300 mt-1">Above cohort baseline</p>
                </article>
              </div>

              <div className="mt-4 rounded-xl border border-border/80 bg-background/80 p-3">
                <p className="text-xs text-muted-foreground mb-2">Recommended next 24 hours</p>
                <div className="space-y-2 text-sm">
                  {[
                    "Prioritize 3 high-fit PM roles from your parsed queue.",
                    "Generate tailored resume variants and outreach drafts.",
                    "Schedule follow-up reminders for roles older than 72h.",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-saffron-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="container-page pb-12 sm:pb-16 lg:pb-20">
        <div className="mb-8 lg:mb-10">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">How It Works</p>
          <h2 className="font-display text-3xl sm:text-4xl">End-to-end flow, not isolated features.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step) => (
            <article key={step.id} className="card-interactive p-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-saffron-500/10 blur-2xl" />
              <div className="relative">
                <p className="font-display text-3xl gradient-text">{step.id}</p>
                <h3 className="font-display text-xl mt-3 mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="modules" className="container-page pb-12 sm:pb-16 lg:pb-20">
        <div className="mb-8 lg:mb-10">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Platform Modules</p>
          <h2 className="font-display text-3xl sm:text-4xl">Enterprise surfaces built for speed and control.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((module) => (
            <Link
              key={module.title}
              href={module.href}
              className="card-interactive p-6 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-saffron-500/[0.08] to-gold-500/[0.08] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-500/18 to-gold-500/18 text-saffron-700 dark:text-saffron-300 mb-4">
                  <module.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-2xl">{module.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>
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
          <div className="absolute -top-16 -left-10 h-48 w-48 rounded-full bg-saffron-500/25 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-gold-500/20 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-3xl sm:text-4xl leading-tight max-w-3xl">
              Build a governed AI workflow and turn career progress into measurable execution.
            </h2>
            <p className="mt-3 text-white/75 max-w-2xl">
              Move from random applications to coordinated planning, controlled execution, and forecast-driven iteration.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="btn-saffron text-base px-6 py-3.5">
                Start Free Workspace
                <Rocket className="h-5 w-5" />
              </Link>
              <Link href="/pricing" className="btn-outline text-base px-6 py-3.5 border-white/25 bg-white/5 hover:bg-white/12">
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="container-page py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/trust" className="hover:text-foreground transition-colors">Trust</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Climb OS
          </p>
        </div>
      </footer>
    </div>
  )
}
