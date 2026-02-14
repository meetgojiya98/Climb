"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import Link from "next/link"
import {
  Bot,
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

type MaturityDimension = {
  id: string
  label: string
  description: string
  href: string
}

type AIPlay = {
  title: string
  prompt: string
  outcome: string
  href: string
}

type AISurface = {
  module: string
  value: string
  bestUse: string
  href: string
}

type WorkflowBlueprintLite = {
  overview: string
  phases: Array<{
    name: string
    goal: string
    durationDays: number
    moduleHref: string
  }>
  dailyCadence: Array<{
    day: string
    focus: string
  }>
  quickPrompts: string[]
  confidence: number
}

type AIGuidePlan = {
  transformationName: string
  summary: string
  northStar: {
    goal: string
    target: string
    metric: string
  }
  roadmap: Array<{
    window: string
    objective: string
    actions: string[]
  }>
  automations: Array<{
    name: string
    trigger: string
    impact: string
    href: string
  }>
  guardrails: Array<{
    risk: string
    mitigation: string
  }>
  confidence: number
}

const STORAGE_KEY = "climb:enterprise-playbook-checklist:v1"
const MATURITY_STORAGE_KEY = "climb:enterprise-maturity:v1"

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

const AI_PLAYS: AIPlay[] = [
  {
    title: "Weekly Executive Brief",
    prompt: "Generate my 7-day enterprise execution plan with risk priorities and module links.",
    outcome: "Produces a priority-ordered weekly action plan tied to Control Tower, Forecast, and Reports.",
    href: "/app/command-center",
  },
  {
    title: "Pipeline Recovery",
    prompt: "What should I fix first to recover overdue follow-ups, stale records, and low response rate?",
    outcome: "Returns immediate recovery actions with high-priority operational fixes.",
    href: "/app/control-tower",
  },
  {
    title: "Quality Uplift",
    prompt: "Create a resume quality uplift sprint to move ATS baseline above 75 this week.",
    outcome: "Creates focused quality tasks linked to resume optimization and role-fit improvements.",
    href: "/app/resumes",
  },
  {
    title: "Forecast Optimization",
    prompt: "How do I improve projected offers in the next 8 weeks with realistic capacity?",
    outcome: "Gives scenario-based volume and conversion actions for measurable forecast lift.",
    href: "/app/forecast",
  },
  {
    title: "Interview Conversion",
    prompt: "Build an interview conversion sprint with daily drills and checkpoint metrics.",
    outcome: "Creates a weekly interview-prep operating plan tied to score and conversion indicators.",
    href: "/app/interviews",
  },
  {
    title: "Governance Cadence",
    prompt: "Design a program-office cadence for weekly governance, ownership, and decision reviews.",
    outcome: "Provides governance structure across workstreams with report-ready decision checkpoints.",
    href: "/app/program-office",
  },
]

const AI_SURFACES: AISurface[] = [
  {
    module: "AI Studio",
    value: "Unified readiness scoring, transformation planning, blueprint generation, and outcome simulation",
    bestUse: "Start each week here to align priorities, generate the AI transformation roadmap, and lock device-specific execution.",
    href: "/app/ai-studio",
  },
  {
    module: "Dashboard",
    value: "AI executive brief with priority actions and follow-up prompts",
    bestUse: "Start each day by generating an execution brief and opening high-priority links.",
    href: "/app/dashboard",
  },
  {
    module: "Applications",
    value: "AI control brief for pipeline risk and conversion optimization",
    bestUse: "Run this when response rate drops or stale/overdue records increase.",
    href: "/app/applications",
  },
  {
    module: "Resumes",
    value: "AI summary generation and quality focus areas",
    bestUse: "Regenerate summary after major role or experience updates.",
    href: "/app/resumes",
  },
  {
    module: "Interviews",
    value: "AI answer scoring, strengths, improvements, and rewrite coaching",
    bestUse: "Use per-question feedback to improve structure and impact signals.",
    href: "/app/interviews",
  },
  {
    module: "Global Assistant",
    value: "Cross-module enterprise copilot with actionable deep links",
    bestUse: "Ask for weekly plans, risk recovery, and forecast-focused action ladders.",
    href: "/app/dashboard",
  },
  {
    module: "Playbook",
    value: "AI command recipes for operating rhythm and governance",
    bestUse: "Copy prompts to standardize coaching across mobile, iPad, and desktop.",
    href: "/app/help",
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

const MATURITY_DIMENSIONS: MaturityDimension[] = [
  {
    id: "intake",
    label: "Role Intake",
    description: "How consistently roles are parsed and prioritized before applying.",
    href: "/app/roles/new",
  },
  {
    id: "quality",
    label: "Resume Quality",
    description: "How strong ATS and role-match quality are across resume variants.",
    href: "/app/resumes",
  },
  {
    id: "execution",
    label: "Execution Cadence",
    description: "How disciplined your weekly application and follow-up rhythm is.",
    href: "/app/applications",
  },
  {
    id: "control",
    label: "Operational Control",
    description: "How tightly follow-up SLAs and stale-risk management are handled.",
    href: "/app/control-tower",
  },
  {
    id: "governance",
    label: "Program Governance",
    description: "How well workstreams, goals, and operating reviews are managed.",
    href: "/app/program-office",
  },
  {
    id: "forecast",
    label: "Forecast Discipline",
    description: "How often outcomes are modeled and translated into action plans.",
    href: "/app/forecast",
  },
]

function matchesQuery(query: string, text: string): boolean {
  if (!query.trim()) return true
  return text.toLowerCase().includes(query.toLowerCase())
}

function buildDefaultMaturityState(): Record<string, number> {
  return MATURITY_DIMENSIONS.reduce((acc, item) => {
    acc[item.id] = 3
    return acc
  }, {} as Record<string, number>)
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)))
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openItems, setOpenItems] = useState<string[]>([])
  const [track, setTrack] = useState<PlaybookTrack["id"]>("candidate")
  const [checklistState, setChecklistState] = useState<ChecklistState>({})
  const [hydrated, setHydrated] = useState(false)
  const [maturityState, setMaturityState] = useState<Record<string, number>>(buildDefaultMaturityState())
  const [maturityHydrated, setMaturityHydrated] = useState(false)
  const [workflowIntent, setWorkflowIntent] = useState("Create a disciplined enterprise workflow with predictable weekly conversion progress.")
  const [workflowHours, setWorkflowHours] = useState(10)
  const [workflowLoading, setWorkflowLoading] = useState(false)
  const [workflowError, setWorkflowError] = useState<string | null>(null)
  const [workflowBlueprint, setWorkflowBlueprint] = useState<WorkflowBlueprintLite | null>(null)
  const [guideIntent, setGuideIntent] = useState(
    "Teach me the best end-to-end Climb operating flow and give me a practical roadmap to execute it with AI."
  )
  const [guideMode, setGuideMode] = useState<"candidate" | "coach" | "program">("candidate")
  const [guideLoading, setGuideLoading] = useState(false)
  const [guideError, setGuideError] = useState<string | null>(null)
  const [guidePlan, setGuidePlan] = useState<AIGuidePlan | null>(null)

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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MATURITY_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === "object") {
          const merged = buildDefaultMaturityState()
          MATURITY_DIMENSIONS.forEach((dimension) => {
            const value = Number((parsed as Record<string, unknown>)[dimension.id])
            if (Number.isFinite(value)) merged[dimension.id] = clampScore(value)
          })
          setMaturityState(merged)
        }
      }
    } catch {
      window.localStorage.removeItem(MATURITY_STORAGE_KEY)
    } finally {
      setMaturityHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!maturityHydrated) return
    try {
      window.localStorage.setItem(MATURITY_STORAGE_KEY, JSON.stringify(maturityState))
    } catch {
      // No-op for private browsing/local storage limits.
    }
  }, [maturityState, maturityHydrated])

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

  const maturityAverage = useMemo(() => {
    const total = MATURITY_DIMENSIONS.reduce((sum, item) => sum + Number(maturityState[item.id] || 0), 0)
    return total / MATURITY_DIMENSIONS.length
  }, [maturityState])

  const maturityPct = Math.round((maturityAverage / 5) * 100)

  const maturityTier = useMemo(() => {
    if (maturityAverage >= 4.3) return { label: "Enterprise", tone: "text-green-700 bg-green-500/10 border-green-500/30" }
    if (maturityAverage >= 3.2) return { label: "Growth", tone: "text-saffron-700 bg-saffron-500/10 border-saffron-500/30" }
    return { label: "Foundation", tone: "text-blue-700 bg-blue-500/10 border-blue-500/30" }
  }, [maturityAverage])

  const maturityRecommendations = useMemo(() => {
    const focused = MATURITY_DIMENSIONS
      .map((item) => ({ ...item, score: maturityState[item.id] || 3 }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)

    return focused.map((item) => ({
      title: `Upgrade ${item.label.toLowerCase()}`,
      detail:
        item.score <= 2
          ? "This area is below enterprise readiness. Prioritize this in the current weekly cycle."
          : "This area is stable but can be lifted to improve conversion consistency.",
      href: item.href,
    }))
  }, [maturityState])

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

  const updateMaturityScore = (id: string, score: number) => {
    setMaturityState((prev) => ({ ...prev, [id]: clampScore(score) }))
  }

  const resetMaturity = () => {
    setMaturityState(buildDefaultMaturityState())
    toast.success("Maturity assessment reset")
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

  const copyMaturityPlan = async () => {
    const lines = [
      `Maturity Score: ${maturityAverage.toFixed(1)} / 5 (${maturityTier.label})`,
      "",
      "Dimension Ratings:",
      ...MATURITY_DIMENSIONS.map((item) => `- ${item.label}: ${maturityState[item.id] || 3}/5`),
      "",
      "Top Upgrade Actions:",
      ...maturityRecommendations.map((item, index) => `${index + 1}. ${item.title} - ${item.detail}`),
    ]

    try {
      await navigator.clipboard.writeText(lines.join("\n"))
      toast.success("Maturity plan copied")
    } catch {
      toast.error("Unable to copy maturity plan")
    }
  }

  const generateWorkflowBlueprint = async () => {
    if (workflowLoading) return
    setWorkflowLoading(true)
    setWorkflowError(null)

    try {
      const response = await fetch("/api/agent/workflow-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: workflowIntent,
          weeklyHours: workflowHours,
          devices: ["mobile", "ipad", "desktop"],
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Unable to generate workflow blueprint")
      }

      const blueprint = data?.blueprint || {}
      setWorkflowBlueprint({
        overview: String(blueprint.overview || ""),
        phases: Array.isArray(blueprint.phases) ? blueprint.phases : [],
        dailyCadence: Array.isArray(blueprint.dailyCadence) ? blueprint.dailyCadence : [],
        quickPrompts: Array.isArray(blueprint.quickPrompts) ? blueprint.quickPrompts : [],
        confidence: Number(blueprint.confidence || 0.5),
      })
      toast.success("AI workflow blueprint generated")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Workflow blueprint failed"
      setWorkflowError(message)
      toast.error(message)
    } finally {
      setWorkflowLoading(false)
    }
  }

  const copyAIPlaybook = async () => {
    const lines = [
      "Climb AI Operating Commands",
      "",
      ...AI_PLAYS.map((play, index) => `${index + 1}. ${play.title}\nPrompt: ${play.prompt}\nOutcome: ${play.outcome}`),
    ]

    try {
      await navigator.clipboard.writeText(lines.join("\n\n"))
      toast.success("AI command playbook copied")
    } catch {
      toast.error("Unable to copy AI playbook")
    }
  }

  const generateAIGuidePlan = async () => {
    if (guideLoading) return
    setGuideLoading(true)
    setGuideError(null)

    const modeConfig =
      guideMode === "program"
        ? { operatingMode: "team", focusAreas: ["governance", "control", "forecast", "velocity"] }
        : guideMode === "coach"
        ? { operatingMode: "coach", focusAreas: ["quality", "interview", "control", "governance"] }
        : { operatingMode: "solo", focusAreas: ["velocity", "quality", "control", "forecast"] }

    try {
      const response = await fetch("/api/agent/ai-transformation-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: guideIntent,
          operatingMode: modeConfig.operatingMode,
          horizonWeeks: 12,
          riskTolerance: 50,
          focusAreas: modeConfig.focusAreas,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Unable to generate AI guide")
      }

      const plan = data?.plan || {}
      setGuidePlan({
        transformationName: String(plan.transformationName || "AI Operating Guide"),
        summary: String(plan.summary || ""),
        northStar: {
          goal: String(plan?.northStar?.goal || ""),
          target: String(plan?.northStar?.target || ""),
          metric: String(plan?.northStar?.metric || ""),
        },
        roadmap: Array.isArray(plan.roadmap) ? plan.roadmap : [],
        automations: Array.isArray(plan.automations) ? plan.automations : [],
        guardrails: Array.isArray(plan.guardrails) ? plan.guardrails : [],
        confidence: Number(plan.confidence || 0.5),
      })
      toast.success("AI flow guide generated")
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI guide failed"
      setGuideError(message)
      toast.error(message)
    } finally {
      setGuideLoading(false)
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

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-saffron-500/10 px-3 py-1 text-xs font-medium text-saffron-700">
              <Bot className="h-3.5 w-3.5" />
              AI Flow Instructor
            </div>
            <h2 className="text-lg sm:text-xl font-semibold mt-2">Generate a complete “how-to-use Climb” operating guide</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Inspired by top product patterns: Stripe-like clarity, Airbnb-like flow storytelling, and Meta-like execution speed.
            </p>
          </div>
          <button
            type="button"
            onClick={generateAIGuidePlan}
            disabled={guideLoading}
            className="btn-saffron text-sm disabled:opacity-60"
          >
            {guideLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {guideLoading ? "Generating Guide..." : "Generate AI Guide"}
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">What should this guide optimize for?</label>
              <textarea
                value={guideIntent}
                onChange={(event) => setGuideIntent(event.target.value)}
                className="input-field min-h-[92px] mt-1"
                placeholder="Describe what you want to learn and optimize."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Guide Mode</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  { id: "candidate" as const, label: "Candidate" },
                  { id: "coach" as const, label: "Coach" },
                  { id: "program" as const, label: "Program Office" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setGuideMode(mode.id)}
                    className={cn(
                      "rounded-xl border px-2.5 py-2 text-xs transition-colors",
                      guideMode === mode.id
                        ? "border-saffron-500/40 bg-saffron-500/10 text-saffron-700"
                        : "border-border hover:bg-secondary"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            {guideError && <p className="text-xs text-red-600">{guideError}</p>}
          </div>

          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            {!guidePlan ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Guide output includes</p>
                <p>• End-to-end roadmap for how to use every major module</p>
                <p>• Clear automation recommendations for daily/weekly rhythm</p>
                <p>• Guardrails so AI usage stays high quality and enterprise-safe</p>
                <p>• Role-specific operating sequence for mobile, iPad, and desktop</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">{guidePlan.transformationName}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{guidePlan.summary}</p>
                <div className="rounded-xl border border-border bg-background/70 p-3">
                  <p className="text-xs font-medium">North Star</p>
                  <p className="text-xs text-muted-foreground mt-1">{guidePlan.northStar.goal}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Target: {guidePlan.northStar.target}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Confidence {Math.round(Math.max(0, Math.min(1, guidePlan.confidence)) * 100)}%
                </p>
              </div>
            )}
          </div>
        </div>

        {guidePlan && (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {guidePlan.roadmap.slice(0, 3).map((phase) => (
              <article key={phase.window} className="rounded-xl border border-border p-3 sm:p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{phase.window}</p>
                <p className="text-sm font-medium mt-1">{phase.objective}</p>
                <div className="mt-2 space-y-1">
                  {phase.actions.slice(0, 3).map((action, index) => (
                    <p key={`${phase.window}-${index}`} className="text-xs text-muted-foreground">• {action}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}

        {guidePlan && (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border p-3 sm:p-4">
              <p className="text-sm font-medium mb-2">Automation Recommendations</p>
              <div className="space-y-2">
                {guidePlan.automations.slice(0, 4).map((item) => (
                  <Link key={item.name} href={item.href || "/app/help"} className="block rounded-lg border border-border p-2.5 hover:bg-secondary/30 transition-colors">
                    <p className="text-xs font-medium">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Trigger: {item.trigger}</p>
                    <p className="text-[11px] text-saffron-700 mt-1">{item.impact}</p>
                  </Link>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border p-3 sm:p-4">
              <p className="text-sm font-medium mb-2">Quality Guardrails</p>
              <div className="space-y-2">
                {guidePlan.guardrails.slice(0, 4).map((item) => (
                  <div key={item.risk} className="rounded-lg border border-border p-2.5">
                    <p className="text-xs font-medium">{item.risk}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{item.mitigation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">AI Workflow Architect</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Generate a personalized, enterprise-grade operating blueprint that explains exactly how to use Climb end-to-end.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={generateWorkflowBlueprint}
              disabled={workflowLoading}
              className="btn-saffron text-sm disabled:opacity-60"
            >
              {workflowLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {workflowLoading ? "Generating..." : "Generate Blueprint"}
            </button>
            <Link href="/app/ai-studio" className="btn-outline text-sm">
              Open AI Studio
            </Link>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr,0.45fr] mb-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Outcome Intent</label>
            <textarea
              value={workflowIntent}
              onChange={(event) => setWorkflowIntent(event.target.value)}
              className="input-field min-h-[92px] mt-1"
              placeholder="Describe the operating outcome you want this week."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Weekly Hours</label>
            <div className="rounded-xl border border-border p-3 mt-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Time Budget</span>
                <span>{workflowHours}h</span>
              </div>
              <input
                type="range"
                min={4}
                max={30}
                step={1}
                value={workflowHours}
                onChange={(event) => setWorkflowHours(Math.max(4, Math.min(30, Number(event.target.value))))}
                className="w-full accent-saffron-500"
              />
              <p className="text-[11px] text-muted-foreground mt-2">Includes mobile, iPad, and desktop execution windows.</p>
            </div>
          </div>
        </div>

        {workflowError && (
          <p className="text-xs text-red-600 mb-3">{workflowError}</p>
        )}

        {workflowBlueprint && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/20 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-medium">Blueprint Overview</p>
                <span className="text-xs text-muted-foreground">
                  Confidence {Math.round(Math.max(0, Math.min(1, workflowBlueprint.confidence)) * 100)}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{workflowBlueprint.overview}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {workflowBlueprint.phases.slice(0, 6).map((phase) => (
                <article key={phase.name} className="rounded-xl border border-border p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{phase.name}</p>
                    <span className="text-[11px] text-muted-foreground">{phase.durationDays}d</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{phase.goal}</p>
                  <Link href={phase.moduleHref || "/app/help"} className="inline-flex items-center gap-1.5 text-xs text-saffron-600 hover:underline mt-2">
                    Open module
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </article>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-border p-3 sm:p-4">
                <p className="text-sm font-medium mb-2">Daily Cadence</p>
                <div className="space-y-1.5">
                  {workflowBlueprint.dailyCadence.slice(0, 5).map((slot) => (
                    <p key={`${slot.day}-${slot.focus}`} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{slot.day}:</span> {slot.focus}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border p-3 sm:p-4">
                <p className="text-sm font-medium mb-2">Prompt Follow-ups</p>
                <div className="flex flex-wrap gap-1.5">
                  {workflowBlueprint.quickPrompts.slice(0, 4).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(prompt)
                          toast.success("Prompt copied")
                        } catch {
                          toast.error("Unable to copy prompt")
                        }
                      }}
                      className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-secondary"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Enterprise Maturity Assessment</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Score each operating dimension from 1-5 and generate a personalized upgrade plan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyMaturityPlan} className="btn-outline text-sm">
              <Copy className="h-4 w-4" />
              Copy Plan
            </button>
            <button type="button" onClick={resetMaturity} className="btn-outline text-sm">
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2 grid gap-3 sm:grid-cols-2">
            {MATURITY_DIMENSIONS.map((item) => (
              <div key={item.id} className="rounded-xl border border-border p-3 sm:p-4">
                <p className="font-medium text-sm sm:text-base">{item.label}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{item.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[1, 2, 3, 4, 5].map((score) => {
                    const active = (maturityState[item.id] || 3) === score
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => updateMaturityScore(item.id, score)}
                        className={cn(
                          "h-8 w-8 rounded-md border text-xs font-medium transition-colors",
                          active
                            ? "border-saffron-500 bg-saffron-500/15 text-saffron-700"
                            : "border-border text-muted-foreground hover:text-foreground"
                        )}
                        aria-label={`Set ${item.label} score to ${score}`}
                      >
                        {score}
                      </button>
                    )
                  })}
                </div>
                <Link href={item.href} className="inline-flex items-center gap-1.5 text-xs text-saffron-600 hover:underline mt-3">
                  Open module
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border p-4 sm:p-5 bg-secondary/20">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Maturity Score</p>
              <span className={cn("text-xs rounded-full border px-2 py-1 font-medium", maturityTier.tone)}>{maturityTier.label}</span>
            </div>
            <p className="text-3xl font-semibold mt-2">{maturityAverage.toFixed(1)} / 5</p>
            <div className="h-2 rounded-full bg-secondary overflow-hidden mt-3">
              <div className="h-full bg-gradient-to-r from-saffron-500 to-gold-500" style={{ width: `${maturityPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{maturityPct}% enterprise readiness</p>

            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium">Priority Upgrade Actions</p>
              {maturityRecommendations.map((item) => (
                <div key={item.title} className="rounded-lg bg-background/80 border border-border p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                  <Link href={item.href} className="inline-flex items-center gap-1.5 text-xs text-saffron-600 hover:underline mt-2">
                    Execute now
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
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

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">Next-Level AI Command Playbook</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Use these prompts in the AI Assistant to run Climb like an enterprise operating system.
            </p>
          </div>
          <button type="button" onClick={copyAIPlaybook} className="btn-outline text-sm">
            <Copy className="h-4 w-4" />
            Copy AI Commands
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {AI_PLAYS.map((play) => (
            <article key={play.title} className="rounded-xl border border-border p-3 sm:p-4 bg-secondary/20">
              <p className="font-medium">{play.title}</p>
              <p className="text-xs text-muted-foreground mt-2">Prompt</p>
              <p className="text-sm mt-1">{play.prompt}</p>
              <p className="text-xs text-muted-foreground mt-3">Expected Outcome</p>
              <p className="text-sm text-muted-foreground mt-1">{play.outcome}</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(play.prompt)
                      toast.success("Prompt copied")
                    } catch {
                      toast.error("Unable to copy prompt")
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs rounded-full border border-border px-2.5 py-1 hover:bg-secondary"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Prompt
                </button>
                <Link href={play.href} className="inline-flex items-center gap-1.5 text-xs text-saffron-600 hover:underline">
                  Open module
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">AI Across Every Module</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This map explains where AI is embedded and how to use each surface for maximum outcome lift.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {AI_SURFACES.map((item) => (
            <article key={item.module} className="rounded-xl border border-border bg-secondary/20 p-3 sm:p-4">
              <p className="font-medium">{item.module}</p>
              <p className="text-xs text-muted-foreground mt-2">AI Value</p>
              <p className="text-sm mt-1">{item.value}</p>
              <p className="text-xs text-muted-foreground mt-3">Best Use</p>
              <p className="text-sm text-muted-foreground mt-1">{item.bestUse}</p>
              <Link href={item.href} className="inline-flex items-center gap-1.5 text-xs text-saffron-600 hover:underline mt-3">
                Open module
                <ArrowRight className="h-3 w-3" />
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
