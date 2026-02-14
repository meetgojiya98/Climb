"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Gauge,
  Menu,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
} from 'lucide-react'

type BillingCycle = 'monthly' | 'annual'

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
    id: 'free',
    name: 'Free',
    tagline: 'Best for first-time optimization.',
    monthlyPrice: 0,
    annualPrice: 0,
    ctaLabel: 'Get started',
    ctaHref: '/signup',
    features: [
      '3 role workspaces per month',
      '1 tailored resume version per role',
      'Basic cover letter generation',
      'Application tracker and reminders',
      'PDF export',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For high-intent job seekers.',
    monthlyPrice: 9,
    annualPrice: 79,
    ctaLabel: 'Start free trial',
    ctaHref: '/signup',
    featured: true,
    features: [
      'Unlimited role workspaces',
      'Unlimited tailored resumes + letters',
      'Advanced insights and forecast planner',
      'Executive reports (CSV + JSON)',
      'DOCX + PDF export suite',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For teams and coaching programs.',
    monthlyPrice: 29,
    annualPrice: 299,
    ctaLabel: 'Contact sales',
    ctaHref: '/trust',
    features: [
      'Everything in Pro',
      'Control Tower + Program Office workflows',
      'Enterprise operating controls and governance',
      'Priority support and onboarding',
      'Audit-friendly process cadence',
    ],
  },
]

const matrixRows = [
  {
    label: 'Resume tailoring engine',
    free: 'Basic',
    pro: 'Advanced',
    enterprise: 'Advanced + governance',
  },
  {
    label: 'Forecast and conversion modeling',
    free: false,
    pro: true,
    enterprise: true,
  },
  {
    label: 'Control Tower and Program Office',
    free: false,
    pro: true,
    enterprise: true,
  },
  {
    label: 'Export suite (PDF + DOCX + reporting files)',
    free: 'PDF',
    pro: 'Full',
    enterprise: 'Full + cadence packs',
  },
  {
    label: 'Workflow governance controls',
    free: false,
    pro: 'Light',
    enterprise: 'Full',
  },
]

const faqs = [
  {
    q: 'Can I switch from monthly to annual anytime?',
    a: 'Yes. Billing mode changes are immediate and your remaining value is applied automatically.',
  },
  {
    q: 'Do you offer enterprise onboarding?',
    a: 'Yes. Enterprise includes structured setup support for operating cadence, reporting, and governance.',
  },
  {
    q: 'Is there a contract for Pro?',
    a: 'No long-term commitment is required on Pro. Annual billing just unlocks better unit economics.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. Reports and forecast data can be exported, and all plans support account-level data portability.',
  },
]

function formatPrice(plan: Plan, cycle: BillingCycle): string {
  const price = cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice
  if (price === null) return 'Custom'
  return `$${price}`
}

function matrixCell(value: string | boolean): JSX.Element {
  if (typeof value === 'boolean') {
    return value ? <Check className="h-4 w-4 text-green-600" /> : <span className="text-muted-foreground">—</span>
  }
  return <span>{value}</span>
}

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cycle, setCycle] = useState<BillingCycle>('monthly')

  const annualSavings = useMemo(() => {
    const pro = plans.find((plan) => plan.id === 'pro')
    if (!pro || pro.monthlyPrice === null || pro.annualPrice === null) return 0
    return Math.max(0, pro.monthlyPrice * 12 - pro.annualPrice)
  }, [])

  return (
    <div className="min-h-screen bg-mesh overflow-x-hidden">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-saffron-500/10 blur-[90px]" />
        <div className="absolute bottom-0 right-0 h-[26rem] w-[26rem] rounded-full bg-navy-500/10 blur-[110px]" />
        <div className="absolute inset-0 bg-grid opacity-30" />
      </div>

      <header className="border-b sticky top-0 z-40 bg-background/90 backdrop-blur-xl">
        <nav className="container-page py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="shrink-0">
            <Logo size="md" />
          </Link>

          <div className="hidden md:flex items-center gap-1 lg:gap-2 text-sm">
            <a href="#plans" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">Plans</a>
            <a href="#how-it-works" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">How it works</a>
            <a href="#compare" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">Compare</a>
            <a href="#faq" className="px-3 py-2 rounded-lg hover:bg-secondary transition-colors">FAQ</a>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/signin" className="btn-outline text-sm">Sign in</Link>
            <Link href="/signup" className="btn-saffron text-sm">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="md:hidden touch-target p-2 rounded-lg hover:bg-secondary"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div className="md:hidden border-t px-4 py-4 flex flex-col gap-1 bg-background">
            <a href="#plans" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">Plans</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">How it works</a>
            <a href="#compare" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">Compare</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">FAQ</a>
            <div className="pt-2 grid grid-cols-2 gap-2">
              <Link href="/signin" onClick={() => setMobileMenuOpen(false)} className="btn-outline text-sm justify-center">Sign in</Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="btn-saffron text-sm justify-center">Start free</Link>
            </div>
          </div>
        )}
      </header>

      <section className="container-page pt-12 sm:pt-16 lg:pt-24 pb-8 sm:pb-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-saffron-500/10 text-saffron-700 px-3 py-1.5 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Enterprise-ready pricing
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Scale from solo applications to enterprise-grade execution.
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
            Choose the operating model that fits your stage, then upgrade without migration pain as your workflow matures.
          </p>
        </div>

        <div className="mt-8 inline-flex rounded-xl border border-border p-1 bg-background/70">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${cycle === 'monthly' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle('annual')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${cycle === 'annual' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Annual
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Annual billing saves ${annualSavings} on Pro.</p>
      </section>

      <section id="plans" className="container-page pb-10 sm:pb-14 lg:pb-20">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-2xl border p-5 sm:p-6 lg:p-7 relative overflow-hidden ${
                plan.featured ? 'border-saffron-500/50 bg-saffron-500/5 shadow-[0_12px_40px_-24px_rgba(245,158,11,0.45)]' : 'bg-card border-border'
              }`}
            >
              {plan.featured && (
                <span className="absolute right-4 top-4 rounded-full bg-saffron-500 text-navy-900 text-xs font-semibold px-3 py-1">
                  Most Popular
                </span>
              )}
              <h2 className="text-xl font-semibold mb-1">{plan.name}</h2>
              <p className="text-sm text-muted-foreground mb-4">{plan.tagline}</p>

              <div className="mb-5">
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold leading-none">{formatPrice(plan, cycle)}</span>
                  <span className="text-sm text-muted-foreground pb-1">
                    {cycle === 'annual' ? '/year' : '/month'}
                  </span>
                </div>
                {plan.id === 'enterprise' && (
                  <p className="text-xs text-muted-foreground mt-1">Includes operating controls and advanced governance.</p>
                )}
              </div>

              <Link href={plan.ctaHref} className={plan.featured ? 'btn-saffron w-full justify-center' : 'btn-outline w-full justify-center'}>
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

      <section id="how-it-works" className="container-page pb-10 sm:pb-14 lg:pb-20">
        <div className="card-elevated p-5 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-semibold">How it works</h2>
            <p className="text-muted-foreground mt-2">Build a repeatable, measurable job-search operating system in four steps.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'Map target roles', desc: 'Parse role requirements and prioritize high-fit opportunities.', icon: Workflow },
              { title: 'Generate application pack', desc: 'Create tailored resumes and letters aligned to each posting.', icon: Sparkles },
              { title: 'Operate with control towers', desc: 'Track conversion, follow-up SLAs, and quality signals.', icon: Gauge },
              { title: 'Report and improve', desc: 'Export leadership-grade reports and iterate on forecast scenarios.', icon: ShieldCheck },
            ].map((step, index) => (
              <div key={step.title} className="rounded-xl border border-border p-4 bg-secondary/30">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-saffron-500/10 text-saffron-700">
                  <step.icon className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Step {index + 1}</p>
                <h3 className="font-medium mb-1.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="compare" className="container-page pb-10 sm:pb-14 lg:pb-20">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 sm:px-6 lg:px-8 py-5 border-b border-border">
            <h2 className="text-xl sm:text-2xl font-semibold">Feature comparison</h2>
            <p className="text-sm text-muted-foreground mt-1">Transparent capability coverage across every plan.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left">
                  <th className="px-5 sm:px-6 py-3 font-medium">Capability</th>
                  <th className="px-5 sm:px-6 py-3 font-medium">Free</th>
                  <th className="px-5 sm:px-6 py-3 font-medium">Pro</th>
                  <th className="px-5 sm:px-6 py-3 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-none">
                    <td className="px-5 sm:px-6 py-3.5 font-medium">{row.label}</td>
                    <td className="px-5 sm:px-6 py-3.5">{matrixCell(row.free)}</td>
                    <td className="px-5 sm:px-6 py-3.5">{matrixCell(row.pro)}</td>
                    <td className="px-5 sm:px-6 py-3.5">{matrixCell(row.enterprise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container-page pb-10 sm:pb-14 lg:pb-20">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: 'Operational rigor',
              desc: 'Weekly cadence and follow-up governance for predictable execution.',
              icon: ShieldCheck,
            },
            {
              title: 'Decision velocity',
              desc: 'Control Tower and Program Office views for faster decision loops.',
              icon: Gauge,
            },
            {
              title: 'Team alignment',
              desc: 'Shared reporting language for coaches, candidates, and hiring strategy.',
              icon: Building2,
            },
            {
              title: 'Scalable process',
              desc: 'Move from ad-hoc workflows to repeatable enterprise process design.',
              icon: Workflow,
            },
          ].map((pillar) => (
            <div key={pillar.title} className="card-interactive p-5">
              <pillar.icon className="h-5 w-5 text-saffron-600 mb-3" />
              <h3 className="font-medium mb-1.5">{pillar.title}</h3>
              <p className="text-sm text-muted-foreground">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="container-page pb-12 sm:pb-16 lg:pb-24">
        <div className="card-elevated p-5 sm:p-6 lg:p-8">
          <h2 className="text-2xl sm:text-3xl font-semibold mb-6">Frequently asked questions</h2>
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-border p-4">
                <h3 className="font-medium mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-secondary/50 p-4">
            <div>
              <p className="font-medium">Need a custom deployment path?</p>
              <p className="text-sm text-muted-foreground">We can scope an enterprise operating blueprint for your workflow.</p>
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
