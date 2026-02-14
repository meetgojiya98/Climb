"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import {
  ArrowRight,
  Check,
  ChevronRight,
  Menu,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
} from "lucide-react"

type BillingCycle = "monthly" | "annual"

type Plan = {
  id: string
  name: string
  tagline: string
  monthlyPrice: number | null
  annualPrice: number | null
  ctaLabel: string
  ctaHref: string
  featured?: boolean
  features: string[]
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For focused individual execution.",
    monthlyPrice: 0,
    annualPrice: 0,
    ctaLabel: "Start free",
    ctaHref: "/signup",
    features: [
      "Core AI role parsing",
      "Resume + cover letter generation",
      "Application tracker",
      "Dashboard essentials",
      "PDF exports",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For high-output operators scaling fast.",
    monthlyPrice: 18,
    annualPrice: 149,
    ctaLabel: "Start trial",
    ctaHref: "/signup",
    featured: true,
    features: [
      "Everything in Starter",
      "Unlimited role workspaces",
      "AI mission console",
      "Forecast scenario modeling",
      "Control Tower automation",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For teams and governed execution workflows.",
    monthlyPrice: 59,
    annualPrice: 599,
    ctaLabel: "Contact sales",
    ctaHref: "/trust",
    features: [
      "Everything in Pro",
      "Program Office governance",
      "Executive reporting packs",
      "Priority onboarding",
      "Compliance and workflow controls",
    ],
  },
]

const capabilityRows = [
  { label: "AI role parsing + fit diagnostics", starter: true, pro: true, enterprise: true },
  { label: "Control Tower workflow", starter: false, pro: true, enterprise: true },
  { label: "Program Office governance", starter: false, pro: false, enterprise: true },
  { label: "Forecast simulator", starter: "Light", pro: "Advanced", enterprise: "Advanced +" },
  { label: "Export suite", starter: "PDF", pro: "PDF + DOCX", enterprise: "Full reports" },
]

const faqs = [
  {
    q: "Can I switch plans later?",
    a: "Yes. You can upgrade or downgrade at any time while preserving workspace history.",
  },
  {
    q: "Is there a trial for Pro?",
    a: "Yes. Pro includes a trial period so you can test AI workflows and forecasting tools.",
  },
  {
    q: "What does Enterprise onboarding include?",
    a: "You get rollout support for governance, cadence setup, and reporting standards.",
  },
  {
    q: "Can I export and move my data?",
    a: "Yes. Your account data remains portable and exportable across plan changes.",
  },
]

function formatPrice(plan: Plan, cycle: BillingCycle): string {
  const price = cycle === "annual" ? plan.annualPrice : plan.monthlyPrice
  return price === null ? "Custom" : `$${price}`
}

function renderCell(value: string | boolean) {
  if (typeof value === "boolean") {
    return value ? <Check className="h-4 w-4 text-green-600" /> : <span className="text-muted-foreground">-</span>
  }
  return <span>{value}</span>
}

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cycle, setCycle] = useState<BillingCycle>("monthly")

  const annualSavings = useMemo(() => {
    const pro = plans.find((plan) => plan.id === "pro")
    if (!pro || pro.monthlyPrice === null || pro.annualPrice === null) return 0
    return Math.max(0, pro.monthlyPrice * 12 - pro.annualPrice)
  }, [])

  return (
    <div className="min-h-screen min-h-[100dvh] bg-mesh overflow-x-hidden">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-saffron-500/18 blur-[95px]" />
        <div className="absolute top-[16%] right-0 h-[24rem] w-[24rem] rounded-full bg-gold-500/18 blur-[110px]" />
        <div className="absolute bottom-[-7rem] right-[26%] h-[24rem] w-[24rem] rounded-full bg-navy-500/12 blur-[120px]" />
        <div className="absolute inset-0 bg-grid opacity-20" />
      </div>

      <header className="border-b border-border/70 sticky top-0 z-40 bg-background/78 backdrop-blur-2xl">
        <nav className="container-page py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="shrink-0">
            <Logo size="md" />
          </Link>

          <div className="hidden md:flex items-center gap-1 lg:gap-2 text-sm">
            <a href="#plans" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              Plans
            </a>
            <a href="#capabilities" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              Capabilities
            </a>
            <a href="#faq" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              FAQ
            </a>
            <Link href="/#how-it-works" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
              How it works
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/signin" className="btn-outline text-sm">
              Sign in
            </Link>
            <Link href="/signup" className="btn-saffron text-sm">
              Start free
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
          <div className="md:hidden border-t border-border/70 px-4 py-4 flex flex-col gap-1 bg-background/90">
            <a href="#plans" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
              Plans
            </a>
            <a href="#capabilities" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
              Capabilities
            </a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
              FAQ
            </a>
            <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
              How it works
            </Link>
            <div className="pt-2 grid grid-cols-2 gap-2">
              <Link href="/signin" onClick={() => setMobileMenuOpen(false)} className="btn-outline text-sm justify-center">
                Sign in
              </Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="btn-saffron text-sm justify-center">
                Start free
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <section className="container-page pt-12 sm:pt-16 lg:pt-24 pb-8 sm:pb-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-saffron-500/30 bg-saffron-500/10 px-3 py-1.5 text-xs font-semibold text-saffron-700 dark:text-saffron-300 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Transparent plans for every operating stage
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-[-0.03em] mb-4">
            Choose the plan that matches your execution velocity.
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
            Start with core AI workflow tooling and scale into enterprise governance, forecasting, and reporting.
          </p>
        </div>

        <div className="mt-8 inline-flex rounded-xl border border-border p-1 bg-background/80 shadow-[0_14px_26px_-22px_rgba(10,18,33,0.45)]">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              cycle === "monthly" ? "bg-gradient-to-r from-saffron-500/20 to-gold-500/20 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("annual")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              cycle === "annual" ? "bg-gradient-to-r from-saffron-500/20 to-gold-500/20 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Annual saves ${annualSavings} on Pro.</p>
      </section>

      <section id="plans" className="container-page pb-10 sm:pb-14 lg:pb-20 scroll-mt-28">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-2xl border p-5 sm:p-6 lg:p-7 relative overflow-hidden ${
                plan.featured
                  ? "border-saffron-500/55 bg-gradient-to-br from-saffron-500/12 to-gold-500/12 shadow-[0_24px_48px_-30px_rgba(255,155,19,0.55)]"
                  : "bg-card/92 border-border"
              }`}
            >
              {plan.featured ? (
                <span className="absolute right-4 top-4 rounded-full bg-saffron-500 text-white text-xs font-semibold px-3 py-1">
                  Recommended
                </span>
              ) : null}
              <h2 className="font-display text-2xl mb-1">{plan.name}</h2>
              <p className="text-sm text-muted-foreground mb-4">{plan.tagline}</p>

              <div className="mb-5">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-display leading-none">{formatPrice(plan, cycle)}</span>
                  <span className="text-sm text-muted-foreground pb-1">{cycle === "annual" ? "/year" : "/month"}</span>
                </div>
              </div>

              <Link href={plan.ctaHref} className={plan.featured ? "btn-saffron w-full justify-center" : "btn-outline w-full justify-center"}>
                {plan.ctaLabel}
              </Link>

              <ul className="mt-5 space-y-2.5 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="container-page pb-10 sm:pb-14 lg:pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "AI workflow speed",
              description: "Cut cycle time from role parsing to submission-ready assets.",
              icon: Workflow,
            },
            {
              title: "Governance at scale",
              description: "Keep quality and follow-up discipline while execution volume grows.",
              icon: ShieldCheck,
            },
            {
              title: "Forecast confidence",
              description: "Use conversion telemetry to plan realistic output and outcomes.",
              icon: Sparkles,
            },
          ].map((item) => (
            <article key={item.title} className="card-interactive p-5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-500/20 to-gold-500/20 text-saffron-700 dark:text-saffron-300 mb-3">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="capabilities" className="container-page pb-10 sm:pb-14 lg:pb-20 scroll-mt-28">
        <div className="rounded-2xl border border-border bg-card/92 overflow-hidden">
          <div className="px-5 sm:px-6 lg:px-8 py-5 border-b border-border">
            <h2 className="font-display text-xl sm:text-2xl">Capability matrix</h2>
            <p className="text-sm text-muted-foreground mt-1">Transparent feature coverage across tiers.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/46 text-left">
                  <th className="px-5 sm:px-6 py-3 font-medium">Capability</th>
                  <th className="px-5 sm:px-6 py-3 font-medium">Starter</th>
                  <th className="px-5 sm:px-6 py-3 font-medium">Pro</th>
                  <th className="px-5 sm:px-6 py-3 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {capabilityRows.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-none">
                    <td className="px-5 sm:px-6 py-3.5 font-medium">{row.label}</td>
                    <td className="px-5 sm:px-6 py-3.5">{renderCell(row.starter)}</td>
                    <td className="px-5 sm:px-6 py-3.5">{renderCell(row.pro)}</td>
                    <td className="px-5 sm:px-6 py-3.5">{renderCell(row.enterprise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="faq" className="container-page pb-12 sm:pb-16 lg:pb-24 scroll-mt-28">
        <div className="card-elevated p-5 sm:p-6 lg:p-8">
          <h2 className="font-display text-2xl sm:text-3xl mb-6">Frequently asked questions</h2>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.q} className="rounded-xl border border-border p-4 bg-background/78">
                <h3 className="font-medium mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-secondary/55 p-4">
            <div>
              <p className="font-medium">Need a custom rollout plan?</p>
              <p className="text-sm text-muted-foreground">We can scope a deployment blueprint for your team workflow.</p>
            </div>
            <Link href="/signup" className="btn-saffron whitespace-nowrap">
              Start free
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
