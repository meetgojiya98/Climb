"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import Link from "next/link"
import {
  HelpCircle,
  Search,
  FileText,
  MessageSquare,
  Mail,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Target,
  Sparkles,
  Shield,
  LineChart,
  ClipboardCheck,
  Building2,
  CheckCircle2,
  Circle,
  ArrowRight,
  Rocket,
  Copy,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type ChecklistState = Record<string, boolean>

type FaqQuestion = {
  q: string
  a: string
}

type FaqCategory = {
  category: string
  questions: FaqQuestion[]
}

type FlowStep = {
  id: string
  phase: string
  owner: string
  kpi: string
  title: string
  detail: string
  href: string
  icon: ComponentType<{ className?: string }>
}

type TrackStep = {
  title: string
  detail: string
  href: string
}

type PlaybookTrack = {
  id: "candidate" | "coach" | "program"
  label: string
  subtitle: string
  operatingCadence: string
  steps: TrackStep[]
}

const STORAGE_KEY = "climb:enterprise-playbook-checklist:v1"

const FLOW_STEPS: FlowStep[] = [
  {
    id: "foundation",
    phase: "Phase 1",
    owner: "Candidate",
    kpi: "ATS quality >= 75",
    title: "Foundation Setup",
    detail: "Create baseline resume, define target role family, and align goals to a clear job-search thesis.",
    href: "/app/resumes/new",
    icon: FileText,
  },
  {
    id: "intelligence",
    phase: "Phase 2",
    owner: "Candidate",
    kpi: "5 qualified roles/week",
    title: "Role Intelligence",
    detail: "Parse high-fit roles, extract must-haves, and identify fit gaps before applying.",
    href: "/app/roles/new",
    icon: Target,
  },
  {
    id: "production",
    phase: "Phase 3",
    owner: "Candidate + AI",
    kpi: "Tailored pack per role",
    title: "Application Production",
    detail: "Generate tailored resume + cover letter + follow-up templates for each priority role.",
    href: "/app/cover-letters",
    icon: Sparkles,
  },
  {
    id: "operations",
    phase: "Phase 4",
    owner: "Control Tower",
    kpi: "SLA compliance > 85%",
    title: "Pipeline Operations",
    detail: "Track all records, enforce follow-up SLAs, and remove stale opportunities quickly.",
    href: "/app/control-tower",
    icon: Shield,
  },
  {
    id: "governance",
    phase: "Phase 5",
    owner: "Program Office",
    kpi: "Forecast on-track",
    title: "Governance + Forecast",
    detail: "Run weekly forecast scenarios and synchronize goals, execution, and quality workstreams.",
    href: "/app/program-office",
    icon: Building2,
  },
  {
    id: "executive",
    phase: "Phase 6",
    owner: "Leadership View",
    kpi: "Weekly decision loop",
    title: "Executive Reporting",
    detail: "Export decision-ready reports and iterate operating plans based on conversion signals.",
    href: "/app/reports",
    icon: BarChart3,
  },
]

const LAUNCH_CHECKLIST = [
  {
    id: "baseline-resume",
    title: "Create baseline resume",
    detail: "Build your first ATS-safe profile to establish quality baseline.",
    href: "/app/resumes/new",
  },
  {
    id: "role-definition",
    title: "Define target role stack",
    detail: "Capture 2-3 role archetypes with priority companies.",
    href: "/app/roles",
  },
  {
    id: "first-role-parse",
    title: "Parse first role",
    detail: "Run role parsing to identify must-haves and fit gaps.",
    href: "/app/roles/new",
  },
  {
    id: "tailored-pack",
    title: "Generate first tailored pack",
    detail: "Create role-specific resume, cover letter, and follow-up templates.",
    href: "/app/roles",
  },
  {
    id: "application-tracking",
    title: "Track first 5 applications",
    detail: "Start pipeline tracking with statuses and notes.",
    href: "/app/applications",
  },
  {
    id: "sla-control",
    title: "Configure follow-up rhythm",
    detail: "Set next-action dates for all active records.",
    href: "/app/control-tower",
  },
  {
    id: "forecast-baseline",
    title: "Run baseline forecast",
    detail: "Estimate 8-12 week outcomes from current conversion rates.",
    href: "/app/forecast",
  },
  {
    id: "goal-alignment",
    title: "Align measurable goals",
    detail: "Set strategic goals with completion targets.",
    href: "/app/goals",
  },
  {
    id: "program-review",
    title: "Review Program Office dashboard",
    detail: "Validate governance, execution, and quality workstreams.",
    href: "/app/program-office",
  },
  {
    id: "executive-export",
    title: "Export executive report",
    detail: "Generate weekly reporting package for decision reviews.",
    href: "/app/reports",
  },
] as const

const PLAYBOOK_TRACKS: PlaybookTrack[] = [
  {
    id: "candidate",
    label: "Candidate Track",
    subtitle: "For individual execution",
    operatingCadence: "Daily execution + weekly planning",
    steps: [
      {
        title: "Daily outreach block",
        detail: "Submit high-fit applications and update statuses every day.",
        href: "/app/applications",
      },
      {
        title: "Quality uplift sprint",
        detail: "Improve one resume section and one interview story each week.",
        href: "/app/resumes",
      },
      {
        title: "Friday forecast review",
        detail: "Compare projected offers against goals and adjust volume.",
        href: "/app/forecast",
      },
    ],
  },
  {
    id: "coach",
    label: "Coach Track",
    subtitle: "For mentors and advisors",
    operatingCadence: "Weekly review with action ownership",
    steps: [
      {
        title: "Pipeline hygiene review",
        detail: "Audit stale records, overdue follow-ups, and no-action opportunities.",
        href: "/app/control-tower",
      },
      {
        title: "Interview readiness assessment",
        detail: "Evaluate mock interview consistency and response quality.",
        href: "/app/interviews",
      },
      {
        title: "Decision brief",
        detail: "Share weekly forecast and strategy change recommendations.",
        href: "/app/reports",
      },
    ],
  },
  {
    id: "program",
    label: "Program Office Track",
    subtitle: "For enterprise operating discipline",
    operatingCadence: "Governance-led operating cycle",
    steps: [
      {
        title: "Workstream scorecard",
        detail: "Monitor velocity, quality, readiness, and goal completion KPIs.",
        href: "/app/program-office",
      },
      {
        title: "Risk response",
        detail: "Escalate forecast risk and trigger corrective execution plans.",
        href: "/app/command-center",
      },
      {
        title: "Executive report-out",
        detail: "Publish audit-friendly reports and reset next-week priorities.",
        href: "/app/reports",
      },
    ],
  },
]

const WEEKLY_RHYTHM = [
  {
    day: "Monday",
    title: "Prioritize",
    detail: "Set weekly targets, choose top roles, and schedule follow-up windows.",
  },
  {
    day: "Tuesday-Thursday",
    title: "Execute",
    detail: "Run application production, interview prep, and outreach consistently.",
  },
  {
    day: "Friday",
    title: "Review",
    detail: "Check forecast, compare KPI movement, and set next-week improvements.",
  },
]

const DEVICE_TIPS = [
  {
    title: "Mobile",
    icon: Smartphone,
    detail: "Use quick status updates, follow-up logging, and on-the-go reminders between meetings.",
  },
  {
    title: "iPad / Tablet",
    icon: Tablet,
    detail: "Use side-by-side review for role parsing, resume editing, and follow-up drafting.",
  },
  {
    title: "Desktop",
    icon: Monitor,
    detail: "Run deep work sessions for forecast modeling, report exports, and program governance.",
  },
]

const FAQ_ITEMS: FaqCategory[] = [
  {
    category: "Whole Workflow",
    questions: [
      {
        q: "What is the best order to use Climb modules?",
        a: "Start with resume + role parsing, then generate tailored packs, track applications, run Control Tower hygiene, and finish the week with Forecast plus Reports.",
      },
      {
        q: "How often should I run forecast and reporting?",
        a: "Run forecast at least once per week and export reports after your weekly review so you always operate with fresh data.",
      },
      {
        q: "How do I keep execution consistent?",
        a: "Use the launch checklist and role-based playbook in this guide, and maintain daily status updates with weekly governance checks.",
      },
    ],
  },
  {
    category: "Control Tower + Program Office",
    questions: [
      {
        q: "When should I use Control Tower?",
        a: "Use Control Tower for operational risk: overdue follow-ups, stale active records, and SLA discipline issues.",
      },
      {
        q: "When should I use Program Office?",
        a: "Use Program Office for governance: workstream health, quality trends, velocity, and strategic goal delivery.",
      },
      {
        q: "How do I reduce forecast risk quickly?",
        a: "Increase weekly volume, improve resume-role alignment, clear overdue actions, and tighten interview prep cadence.",
      },
    ],
  },
  {
    category: "Exports + Reporting",
    questions: [
      {
        q: "Can I export operational data for reviews?",
        a: "Yes. Use Forecast CSV export and executive reports to build weekly audit-friendly decision packs.",
      },
      {
        q: "What should I include in a weekly report?",
        a: "Include application velocity, response/interview/offer conversion, SLA compliance, risk flags, and next-week action plan.",
      },
    ],
  },
]

function matchesQuery(query: string, text: string): boolean {
  if (!query.trim()) return true
  return text.toLowerCase().includes(query.toLowerCase())
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openItems, setOpenItems] = useState<string[]>([])
  const [track, setTrack] = useState<PlaybookTrack["id"]>("candidate")
  const [checklistState, setChecklistState] = useState<ChecklistState>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === "object") {
          setChecklistState(parsed)
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checklistState))
    } catch {
      // No-op for private browsing/local storage limits.
    }
  }, [checklistState, hydrated])

  const filteredFAQ = useMemo(() => {
    return FAQ_ITEMS.map((category) => ({
      ...category,
      questions: category.questions.filter((item) =>
        matchesQuery(searchQuery, `${item.q} ${item.a} ${category.category}`)
      ),
    })).filter((category) => category.questions.length > 0)
  }, [searchQuery])

  const selectedTrack = useMemo(
    () => PLAYBOOK_TRACKS.find((item) => item.id === track) || PLAYBOOK_TRACKS[0],
    [track]
  )

  const completedCount = useMemo(() => {
    return LAUNCH_CHECKLIST.filter((item) => checklistState[item.id]).length
  }, [checklistState])

  const completionPct = Math.round((completedCount / LAUNCH_CHECKLIST.length) * 100)

  const toggleItem = (id: string) => {
    setOpenItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleChecklist = (id: string) => {
    setChecklistState((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const resetChecklist = () => {
    setChecklistState({})
    toast.success("Launch checklist reset")
  }

  const copyChecklist = async () => {
    const lines = LAUNCH_CHECKLIST.map((item, index) => {
      const checked = checklistState[item.id] ? "[x]" : "[ ]"
      return `${checked} ${index + 1}. ${item.title} - ${item.detail}`
    })

    try {
      await navigator.clipboard.writeText(lines.join("\n"))
      toast.success("Checklist copied")
    } catch {
      toast.error("Unable to copy checklist")
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 sm:space-y-10">
      <section className="card-elevated overflow-hidden relative p-5 sm:p-7 lg:p-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -right-8 h-40 w-40 rounded-full bg-saffron-500/10 blur-3xl" />
          <div className="absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-navy-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-grid opacity-30" />
        </div>

        <div className="relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-saffron-500/10 px-3 py-1.5 text-xs font-semibold text-saffron-700">
            <Rocket className="h-3.5 w-3.5" />
            Enterprise Operating Guide
          </div>
          <div className="max-w-4xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Learn the complete Climb workflow from setup to executive reporting.
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              This guide explains the full operating flow, the best way to use each module, and how to run a disciplined weekly execution system across mobile, iPad, and desktop.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/app/control-tower" className="btn-outline text-sm">
              Control Tower
            </Link>
            <Link href="/app/program-office" className="btn-outline text-sm">
              Program Office
            </Link>
            <Link href="/app/forecast" className="btn-outline text-sm">
              Forecast
            </Link>
            <Link href="/app/reports" className="btn-saffron text-sm">
              Reports
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated p-4 sm:p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Flow Coverage</p>
          <p className="text-2xl font-semibold mt-1">{FLOW_STEPS.length} phases</p>
          <p className="text-sm text-muted-foreground mt-1">From foundation to executive reporting</p>
        </div>
        <div className="card-elevated p-4 sm:p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Launch Progress</p>
          <p className="text-2xl font-semibold mt-1">{completionPct}%</p>
          <p className="text-sm text-muted-foreground mt-1">{completedCount}/{LAUNCH_CHECKLIST.length} actions completed</p>
        </div>
        <div className="card-elevated p-4 sm:p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Weekly Cadence</p>
          <p className="text-2xl font-semibold mt-1">3 blocks</p>
          <p className="text-sm text-muted-foreground mt-1">Prioritize, execute, and review rhythm</p>
        </div>
        <div className="card-elevated p-4 sm:p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Enterprise Modules</p>
          <p className="text-2xl font-semibold mt-1">6 core</p>
          <p className="text-sm text-muted-foreground mt-1">Control, forecast, governance, reporting stack</p>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold">End-to-End Application Flow</h2>
          <p className="text-sm text-muted-foreground mt-1">Run these phases in order for predictable, enterprise-grade outcomes.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FLOW_STEPS.map((step, index) => (
            <article key={step.id} className="card-interactive p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{step.phase}</p>
                  <h3 className="font-semibold mt-1">{index + 1}. {step.title}</h3>
                </div>
                <div className="h-9 w-9 rounded-lg bg-saffron-500/10 flex items-center justify-center shrink-0">
                  <step.icon className="h-4 w-4 text-saffron-600" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{step.detail}</p>
              <div className="mt-3 text-xs text-muted-foreground">Owner: <span className="font-medium text-foreground">{step.owner}</span></div>
              <div className="text-xs text-muted-foreground mt-1">Primary KPI: <span className="font-medium text-foreground">{step.kpi}</span></div>
              <Link href={step.href} className="inline-flex items-center gap-1.5 text-sm text-saffron-600 hover:underline mt-4">
                Open module
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 card-elevated p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">Launch Checklist</h2>
              <p className="text-sm text-muted-foreground">Use this to operationalize Climb from day one.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyChecklist} className="btn-outline text-sm">
                <Copy className="h-4 w-4" />
                Copy Plan
              </button>
              <button type="button" onClick={resetChecklist} className="btn-outline text-sm">
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          <div className="h-2 rounded-full bg-secondary overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-r from-saffron-500 to-gold-500" style={{ width: `${completionPct}%` }} />
          </div>

          <div className="space-y-2">
            {LAUNCH_CHECKLIST.map((item) => {
              const checked = Boolean(checklistState[item.id])
              return (
                <div key={item.id} className="rounded-xl border border-border p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleChecklist(item.id)}
                      className={cn(
                        "mt-0.5 h-6 w-6 rounded-full border flex items-center justify-center transition-colors",
                        checked ? "border-green-500 bg-green-500 text-white" : "border-border hover:border-saffron-500"
                      )}
                      aria-label={checked ? "Mark incomplete" : "Mark complete"}
                    >
                      {checked ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-medium text-sm sm:text-base", checked && "line-through text-muted-foreground")}>{item.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>
                      <Link href={item.href} className="inline-flex items-center gap-1.5 text-xs text-saffron-600 hover:underline mt-2">
                        Open module
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="text-lg font-semibold">Weekly Rhythm</h2>
          <p className="text-sm text-muted-foreground mt-1">The minimum cadence for consistent outcomes.</p>
          <div className="space-y-3 mt-4">
            {WEEKLY_RHYTHM.map((item) => (
              <div key={item.day} className="rounded-xl border border-border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.day}</p>
                <p className="font-medium mt-1">{item.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>
              </div>
            ))}
          </div>
          <Link href="/app/command-center" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline mt-4">
            Open Command Center
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Role-Based Enterprise Playbooks</h2>
            <p className="text-sm text-muted-foreground mt-1">Switch tracks based on who is running the workflow.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PLAYBOOK_TRACKS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTrack(item.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs sm:text-sm border transition-colors",
                  track === item.id
                    ? "border-saffron-500 bg-saffron-500/10 text-saffron-700"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-border p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
            <div>
              <p className="text-sm font-semibold">{selectedTrack.label}</p>
              <p className="text-xs text-muted-foreground">{selectedTrack.subtitle}</p>
            </div>
            <p className="text-xs text-muted-foreground">Cadence: {selectedTrack.operatingCadence}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {selectedTrack.steps.map((step, index) => (
              <div key={step.title} className="rounded-xl bg-secondary/40 p-3 sm:p-4">
                <p className="text-xs text-muted-foreground">Step {index + 1}</p>
                <p className="font-medium mt-1">{step.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{step.detail}</p>
                <Link href={step.href} className="inline-flex items-center gap-1.5 text-xs text-saffron-600 hover:underline mt-3">
                  Open module
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold">Optimized by Device</h2>
          <p className="text-sm text-muted-foreground mt-1">Run the right workflow on the right screen size.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {DEVICE_TIPS.map((tip) => (
            <article key={tip.title} className="card-interactive p-4 sm:p-5">
              <div className="h-10 w-10 rounded-xl bg-saffron-500/10 flex items-center justify-center">
                <tip.icon className="h-5 w-5 text-saffron-600" />
              </div>
              <h3 className="font-semibold mt-3">{tip.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{tip.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">Searchable Help & FAQ</h2>
            <p className="text-sm text-muted-foreground mt-1">Find tactical answers while running the operating flow.</p>
          </div>
          <div className="w-full sm:w-[360px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search workflow and feature help..."
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>

        {filteredFAQ.length === 0 ? (
          <div className="card-elevated p-6 text-center text-sm text-muted-foreground">
            No FAQ matches for &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="space-y-5">
            {filteredFAQ.map((category, categoryIndex) => (
              <div key={category.category}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">{category.category}</h3>
                <div className="card-elevated divide-y divide-border">
                  {category.questions.map((item, itemIndex) => {
                    const id = `${categoryIndex}-${itemIndex}`
                    const isOpen = openItems.includes(id)
                    return (
                      <div key={id}>
                        <button
                          type="button"
                          onClick={() => toggleItem(id)}
                          className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-3 hover:bg-secondary/30 transition-colors"
                        >
                          <span className="font-medium pr-3">{item.q}</span>
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          )}
                        </button>
                        {isOpen && <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-muted-foreground">{item.a}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Need deeper support?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              For enterprise rollout support, security requests, or operating model design, contact support.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="mailto:support@climb.ai" className="btn-saffron">
              <Mail className="h-4 w-4" />
              Contact Support
            </a>
            <Link href="/trust" className="btn-outline">
              <Shield className="h-4 w-4" />
              Security
            </Link>
          </div>
        </div>
      </section>

      <section className="card-elevated p-4 sm:p-5 text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="inline-flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-saffron-600" />
          This guide is optimized for mobile, iPad, and desktop operating workflows.
        </div>
        <div className="inline-flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Use this page as your weekly runbook.
        </div>
      </section>
    </div>
  )
}
