"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo, LogoMark } from "@/components/ui/logo"
import { createClient } from "@/lib/supabase/client"
import { fetchApplicationsCompatible } from "@/lib/supabase/application-compat"
import { APP_ROUTES } from "@/lib/routes"
import { trackEvent } from "@/lib/telemetry-client"
import { CommandPalette } from "@/components/app/command-palette"
import { ThemeToggle } from "@/components/app/theme-toggle"
import {
  AIDecisionTreeView,
  ConfidenceLayersPanel,
  MotionThemeSelector,
  type MotionTheme,
} from "@/components/app/graphical-ui"
import { 
  LayoutDashboard, 
  FileText, 
  Briefcase, 
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  Sparkles,
  Keyboard,
  LayoutGrid,
  MonitorSmartphone,
  Target,
  HelpCircle,
  Check,
  Clock,
  AlertCircle,
  Trash2,
  Send,
  Lightbulb,
  ArrowRight,
  Mail,
  Bookmark,
  DollarSign,
  TrendingUp,
  Zap,
  ClipboardList,
  FileBarChart2,
  LineChart,
  Globe2,
  Shield,
  Building2,
  BookOpenCheck,
  BrainCircuit,
  Users2,
  LockKeyhole,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AppShellProps {
  children: React.ReactNode
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'reminder'
  read: boolean
  link?: string
  created_at: string
}

interface CopilotAction {
  title: string
  detail: string
  href: string
  priority: 'high' | 'medium' | 'low'
}

interface CopilotPayload {
  answer: string
  summary: string
  actionPlan: CopilotAction[]
  quickReplies: string[]
  confidence: number
}

interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  payload?: CopilotPayload
  error?: boolean
}

interface WorkspaceSummary {
  id: string
  name: string
  slug: string
}

type CopilotSurface =
  | 'global'
  | 'dashboard'
  | 'applications'
  | 'help'
  | 'control-tower'
  | 'program-office'
  | 'command-center'
  | 'forecast'
  | 'horizons'
  | 'resumes'
  | 'roles'
  | 'interviews'

type AssistantMode = 'strategy' | 'execution' | 'coach'
type DensityMode = 'comfortable' | 'compact'
type LayoutMode = 'balanced' | 'focus' | 'wide'

interface SurfaceQuickApplyAction {
  id: string
  label: string
  detail: string
  href?: string
  prompt?: string
}

const navigation = [
  { name: "Dashboard", href: APP_ROUTES.dashboard, icon: LayoutDashboard },
  { name: "AI Studio", href: APP_ROUTES.aiStudio, icon: BrainCircuit },
  { name: "Horizons", href: APP_ROUTES.horizons, icon: Globe2 },
  { name: "Control Tower", href: APP_ROUTES.controlTower, icon: Shield },
  { name: "Program Office", href: APP_ROUTES.programOffice, icon: Building2 },
  { name: "Command Center", href: APP_ROUTES.commandCenter, icon: Zap },
  { name: "Playbook", href: APP_ROUTES.playbook, icon: BookOpenCheck },
  { name: "Resumes", href: APP_ROUTES.resumes, icon: FileText },
  { name: "Roles", href: APP_ROUTES.roles, icon: ClipboardList },
  { name: "Applications", href: APP_ROUTES.applications, icon: Briefcase },
  { name: "Cover Letters", href: APP_ROUTES.coverLetters, icon: Mail },
  { name: "Saved Jobs", href: APP_ROUTES.savedJobs, icon: Bookmark },
  { name: "Interview Prep", href: APP_ROUTES.interviews, icon: MessageSquare },
  { name: "Career Goals", href: APP_ROUTES.goals, icon: Target },
  { name: "Insights", href: APP_ROUTES.insights, icon: TrendingUp },
  { name: "Forecast", href: APP_ROUTES.forecast, icon: LineChart },
  { name: "Reports", href: APP_ROUTES.reports, icon: FileBarChart2 },
  { name: "Salary Insights", href: APP_ROUTES.salaryInsights, icon: DollarSign },
  { name: "Workspaces", href: APP_ROUTES.workspaces, icon: Users2 },
  { name: "Security Center", href: APP_ROUTES.securityCenter, icon: LockKeyhole },
]

const bottomNav = [
  { name: "Settings", href: APP_ROUTES.settings, icon: Settings },
  { name: "Help", href: APP_ROUTES.help, icon: HelpCircle },
]

const mobilePrimaryNav = [
  { name: "Dashboard", href: APP_ROUTES.dashboard, icon: LayoutDashboard },
  { name: "AI", href: APP_ROUTES.aiStudio, icon: BrainCircuit },
  { name: "Tower", href: APP_ROUTES.controlTower, icon: Shield },
  { name: "Program", href: APP_ROUTES.programOffice, icon: Building2 },
  { name: "Forecast", href: APP_ROUTES.forecast, icon: LineChart },
  { name: "Reports", href: APP_ROUTES.reports, icon: FileBarChart2 },
]

const ASSISTANT_MODES: Record<
  AssistantMode,
  {
    label: string
    hint: string
    promptPrefix: string
    starters: string[]
  }
> = {
  strategy: {
    label: 'Strategy',
    hint: 'Top priorities and goal tradeoffs',
    promptPrefix:
      'Mode: Strategy. Give clear priorities, targets, and order of work.',
    starters: [
      'Build my simple 7-day plan.',
      'What are the highest-impact actions this week?',
      'What is my biggest risk right now?',
      'Set clear goals for the next 14 days.',
    ],
  },
  execution: {
    label: 'Execution',
    hint: 'Next steps for the next 24-72 hours',
    promptPrefix:
      'Mode: Execution. Return a clear task list in priority order.',
    starters: [
      'What should I do in the next 24 hours?',
      'Create a 3-day risk reduction plan.',
      'Build a mobile-first daily workflow.',
      'Give me a time-boxed sprint plan for this week.',
    ],
  },
  coach: {
    label: 'Coach',
    hint: 'Improve quality and interview performance',
    promptPrefix:
      'Mode: Coach. Give practical feedback to improve skills and communication.',
    starters: [
      'Help me improve answer quality this week.',
      'Create a resume improvement plan.',
      'Create an interview practice plan.',
      'How do I improve confidence and consistency quickly?',
    ],
  },
}

const SURFACE_LABELS: Record<CopilotSurface, string> = {
  global: 'Global Workspace',
  dashboard: 'Dashboard',
  applications: 'Applications',
  help: 'Playbook',
  'control-tower': 'Control Tower',
  'program-office': 'Program Office',
  'command-center': 'Command Center',
  forecast: 'Forecast Planner',
  horizons: 'Horizons Studio',
  resumes: 'Resumes',
  roles: 'Roles Workspace',
  interviews: 'Interview Prep',
}

const AI_DOCK_PROMPTS: Record<CopilotSurface, string[]> = {
  global: [
    "Build my weekly plan.",
    "Where is my biggest bottleneck right now?",
    "What should I do in the next 24 hours?",
  ],
  dashboard: [
    "Build a 7-day dashboard plan.",
    "What KPIs should I prioritize today?",
    "Give me a daily conversion checklist.",
  ],
  applications: [
    "Which applications need follow-up first?",
    "Create a 3-day response-rate recovery plan.",
    "How do I reduce stale application risk quickly?",
  ],
  help: [
    "Teach me the fastest end-to-end workflow.",
    "Give me a mobile-first weekly rhythm.",
    "What mistakes should I avoid this week?",
  ],
  "control-tower": [
    "Prioritize fixes for SLA and stale risk.",
    "Create a 48-hour risk reduction plan.",
    "How do I stabilize control-tower quality this week?",
  ],
  "program-office": [
    "Create a weekly review agenda.",
    "Set KPI targets for this week and next week.",
    "Build a weekly check-in cadence for my modules.",
  ],
  "command-center": [
    "Turn risk signals into a task list.",
    "What actions unlock the biggest conversion lift?",
    "Build a command-center plan for next 72 hours.",
  ],
  forecast: [
    "Compare conservative vs aggressive forecast scenarios.",
    "What weekly target gives me the strongest offer upside?",
    "Turn this forecast into a 7-day execution plan.",
  ],
  horizons: [
    "Design my H1-H3 expansion sequencing plan.",
    "How do I scale without hurting conversion quality?",
    "Create horizontal pod ownership and checkpoints.",
  ],
  resumes: [
    "Prioritize resume variants for fastest conversion lift.",
    "How do I raise ATS baseline above 80?",
    "Build a resume portfolio quality sprint.",
  ],
  roles: [
    "Which role gaps should I close first?",
    "Create a role intake and priority plan.",
    "How do I increase parsing coverage this week?",
  ],
  interviews: [
    "Generate a 7-day interview prep drill plan.",
    "Which interview skills need immediate focus?",
    "Build a confidence and response-quality loop.",
  ],
}

const DENSITY_STORAGE_KEY = "climb:ui:density"
const LAYOUT_STORAGE_KEY = "climb:ui:layout"
const MOTION_THEME_STORAGE_KEY = "climb:ui:motion-theme"

const SURFACE_QUICK_APPLY: Record<CopilotSurface, SurfaceQuickApplyAction[]> = {
  global: [
    {
      id: "global-plan",
      label: "Run weekly AI plan",
      detail: "Generate a 7-day plan aligned to active modules.",
      prompt: "Build my weekly execution plan with top 5 tasks and owners.",
    },
  ],
  dashboard: [
    {
      id: "dashboard-priority",
      label: "Apply dashboard priority set",
      detail: "Create and run top priorities for this week.",
      prompt: "Generate my dashboard priority ladder and top three actions.",
    },
    {
      id: "dashboard-open-forecast",
      label: "Open forecast simulator",
      detail: "Tune effort targets and conversion outcomes.",
      href: APP_ROUTES.forecast,
    },
  ],
  applications: [
    {
      id: "apps-recovery",
      label: "Recover stale pipeline",
      detail: "Generate a 48-hour risk-recovery sequence.",
      prompt: "Build a 48-hour recovery plan for stale, overdue, and no-action applications.",
    },
    {
      id: "apps-open",
      label: "Open kanban board",
      detail: "Jump to application pipeline board.",
      href: APP_ROUTES.applications,
    },
  ],
  help: [
    {
      id: "help-flow",
      label: "Start guided workflow",
      detail: "Open the full flow and best-practice checklist.",
      href: APP_ROUTES.playbook,
    },
  ],
  "control-tower": [
    {
      id: "tower-fixes",
      label: "Apply risk fix queue",
      detail: "Generate actions to clear SLA and stale risk.",
      prompt: "Create a short risk-fix queue for control tower and expected impact.",
    },
  ],
  "program-office": [
    {
      id: "program-review",
      label: "Create weekly review",
      detail: "Build KPI review agenda with owners and due dates.",
      prompt: "Generate this week's program review agenda with KPI owners.",
    },
  ],
  "command-center": [
    {
      id: "command-tasklist",
      label: "Build action task list",
      detail: "Convert risk signals into task list.",
      prompt: "Turn command-center signals into a 72-hour task list with priorities.",
    },
  ],
  forecast: [
    {
      id: "forecast-plan",
      label: "Apply forecast execution plan",
      detail: "Create 7-day execution plan from selected scenario.",
      prompt: "Convert this forecast into a practical 7-day execution plan with daily checkpoints.",
    },
  ],
  horizons: [
    {
      id: "horizons-sequence",
      label: "Build expansion sequence",
      detail: "Generate H1-H3 rollout sequence and dependencies.",
      prompt: "Design an H1-H3 expansion sequence and dependencies for this week.",
    },
  ],
  resumes: [
    {
      id: "resume-sprint",
      label: "Run resume quality sprint",
      detail: "Generate ATS and proof-signal improvement plan.",
      prompt: "Create a 5-day resume quality sprint focused on ATS and proof signals.",
    },
    {
      id: "resume-open",
      label: "Open resume workspace",
      detail: "Jump to resume module for edits.",
      href: APP_ROUTES.resumes,
    },
  ],
  roles: [
    {
      id: "roles-intake",
      label: "Create role intake plan",
      detail: "Prioritize role targets and gap closure steps.",
      prompt: "Create a role intake and prioritization plan for this week.",
    },
  ],
  interviews: [
    {
      id: "interview-cadence",
      label: "Apply interview cadence",
      detail: "Build 7-day interview prep sequence.",
      prompt: "Create a 7-day interview prep cadence with daily drills and checkpoints.",
    },
    {
      id: "interview-open",
      label: "Open interview practice",
      detail: "Jump to interview module.",
      href: APP_ROUTES.interviews,
    },
  ],
}

function resolveCopilotSurface(pathname: string | null): CopilotSurface {
  if (!pathname) return 'global'
  if (pathname.startsWith(APP_ROUTES.controlTower)) return 'control-tower'
  if (pathname.startsWith(APP_ROUTES.programOffice)) return 'program-office'
  if (pathname.startsWith(APP_ROUTES.commandCenter)) return 'command-center'
  if (pathname.startsWith(APP_ROUTES.forecast)) return 'forecast'
  if (pathname.startsWith(APP_ROUTES.horizons)) return 'horizons'
  if (pathname.startsWith(APP_ROUTES.roles)) return 'roles'
  if (pathname.startsWith(APP_ROUTES.resumes)) return 'resumes'
  if (pathname.startsWith(APP_ROUTES.interviews)) return 'interviews'
  if (pathname.startsWith(APP_ROUTES.applications)) return 'applications'
  if (pathname.startsWith(APP_ROUTES.playbook)) return 'help'
  if (pathname.startsWith(APP_ROUTES.dashboard)) return 'dashboard'
  return 'global'
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [aiInput, setAiInput] = useState("")
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([])
  const [aiQuickReplies, setAiQuickReplies] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMode, setAiMode] = useState<AssistantMode>('strategy')
  const [densityMode, setDensityMode] = useState<DensityMode>('comfortable')
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('balanced')
  const [motionTheme, setMotionTheme] = useState<MotionTheme>('enterprise')
  const [showShortcutMap, setShowShortcutMap] = useState(false)
  const [appliedSurfaceActions, setAppliedSurfaceActions] = useState<string[]>([])
  const [userName, setUserName] = useState("User")
  const [userInitial, setUserInitial] = useState("U")
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)

  const activeSurface = useMemo(() => resolveCopilotSurface(pathname), [pathname])
  const activeModeConfig = useMemo(() => ASSISTANT_MODES[aiMode], [aiMode])
  const dockPrompts = useMemo(() => AI_DOCK_PROMPTS[activeSurface] || AI_DOCK_PROMPTS.global, [activeSurface])
  const surfaceQuickApplyActions = useMemo(
    () => SURFACE_QUICK_APPLY[activeSurface] || SURFACE_QUICK_APPLY.global,
    [activeSurface]
  )
  const heatLayerTone = useMemo(() => {
    if (activeSurface === "control-tower" || activeSurface === "applications") return "risk"
    if (activeSurface === "forecast" || activeSurface === "command-center") return "performance"
    if (activeSurface === "resumes" || activeSurface === "interviews") return "quality"
    return "balanced"
  }, [activeSurface])

  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const storedDensity = window.localStorage.getItem(DENSITY_STORAGE_KEY)
    const storedLayout = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    const storedMotionTheme = window.localStorage.getItem(MOTION_THEME_STORAGE_KEY)
    if (storedDensity === "comfortable" || storedDensity === "compact") {
      setDensityMode(storedDensity)
    }
    if (storedLayout === "balanced" || storedLayout === "focus" || storedLayout === "wide") {
      setLayoutMode(storedLayout)
    }
    if (storedMotionTheme === "minimal" || storedMotionTheme === "cinematic" || storedMotionTheme === "enterprise") {
      setMotionTheme(storedMotionTheme)
    }
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.setAttribute("data-density", densityMode)
    window.localStorage.setItem(DENSITY_STORAGE_KEY, densityMode)
  }, [densityMode])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.setAttribute("data-layout", layoutMode)
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode)
  }, [layoutMode])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.setAttribute("data-motion-theme", motionTheme)
    window.localStorage.setItem(MOTION_THEME_STORAGE_KEY, motionTheme)
  }, [motionTheme])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages, aiLoading])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setShowCommandPalette((open) => !open)
        return
      }

      if (event.key === "?" && !event.metaKey && !event.ctrlKey) {
        const target = event.target as HTMLElement | null
        if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return
        event.preventDefault()
        setShowShortcutMap((open) => !open)
        return
      }

      if (!event.altKey) return

      if (event.key === "1") {
        event.preventDefault()
        router.push(APP_ROUTES.dashboard)
      } else if (event.key === "2") {
        event.preventDefault()
        router.push(APP_ROUTES.applications)
      } else if (event.key === "3") {
        event.preventDefault()
        router.push(APP_ROUTES.resumes)
      } else if (event.key === "4") {
        event.preventDefault()
        router.push(APP_ROUTES.interviews)
      } else if (event.key === "5") {
        event.preventDefault()
        setShowAIAssistant(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [router])

  useEffect(() => {
    if (!showAIAssistant) return
    if (aiMessages.length > 0) return
    setAiQuickReplies(activeModeConfig.starters.slice(0, 4))
  }, [activeModeConfig.starters, aiMessages.length, showAIAssistant])

  const commandPaletteItems = useMemo(() => {
    const navigationItems = navigation.map((item) => ({
      id: `nav-${item.href}`,
      label: item.name,
      description: `Go to ${item.name}`,
      href: item.href,
      icon: item.icon,
      group: "navigation" as const,
      keywords: [item.name, item.href],
    }))

    const createItems = [
      {
        id: "create-resume",
        label: "Create Resume",
        description: "Start a new ATS-ready resume",
        href: "/app/resumes/new",
        icon: FileText,
        group: "create" as const,
        shortcut: "R",
      },
      {
        id: "create-role",
        label: "Add New Role",
        description: "Parse and track a new job role",
        href: "/app/roles/new",
        icon: ClipboardList,
        group: "create" as const,
        shortcut: "N",
      },
      {
        id: "create-application",
        label: "Track Application",
        description: "Open applications board and add a new one",
        href: "/app/applications",
        icon: Briefcase,
        group: "create" as const,
      },
    ]

    const actionItems = [
      {
        id: "action-ai-assistant",
        label: "Open AI Assistant",
        description: "Ask for resume and interview guidance",
        icon: Sparkles,
        group: "actions" as const,
        onSelect: () => setShowAIAssistant(true),
      },
      {
        id: "action-notifications",
        label: "Open Notifications",
        description: "Review unread reminders and activity",
        icon: Bell,
        group: "actions" as const,
        onSelect: () => setShowNotifications(true),
      },
      {
        id: "action-settings",
        label: "Open Settings",
        description: "Manage profile, billing, and preferences",
        href: "/app/settings",
        icon: Settings,
        group: "actions" as const,
      },
    ]

    return [...navigationItems, ...createItems, ...actionItems]
  }, [])

  const fetchUserData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      setUserName(name.split(' ')[0])
      setUserInitial(name.charAt(0).toUpperCase())

      const fetchGoals = async () => {
        const primary = await supabase
          .from('career_goals')
          .select('id, title, completed, target_date')
          .eq('user_id', user.id)

        if (!primary.error) return primary.data || []

        if (!String(primary.error.message || '').toLowerCase().includes('target_date')) {
          throw primary.error
        }

        const fallback = await supabase
          .from('career_goals')
          .select('id, title, completed')
          .eq('user_id', user.id)

        if (fallback.error) throw fallback.error
        return (fallback.data || []).map((item: any) => ({ ...item, target_date: null }))
      }

      const [applications, resumesResult, goals] = await Promise.all([
        fetchApplicationsCompatible(supabase, user.id),
        supabase.from('resumes').select('id, ats_score').eq('user_id', user.id),
        fetchGoals(),
      ])

      const activeStatuses = new Set(['applied', 'screening', 'interview'])
      const activeApps = applications.filter((app: any) => activeStatuses.has(String(app.status || '')))
      const now = new Date()
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)

      const overdue = activeApps.filter((app: any) => {
        const due = app.next_action_at || app.follow_up_date
        if (!due) return false
        const date = new Date(due)
        return Number.isFinite(date.getTime()) && date < today
      }).length

      const stale = activeApps.filter((app: any) => {
        if (app.next_action_at || app.follow_up_date) return false
        const base = app.applied_date || app.created_at
        if (!base) return false
        const date = new Date(base)
        if (!Number.isFinite(date.getTime())) return false
        const ageDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
        return ageDays >= 14
      }).length

      const noAction = activeApps.filter((app: any) => !app.next_action_at && !app.follow_up_date).length
      const lowAts = (resumesResult.data || []).filter((resume: any) => {
        const score = Number(resume.ats_score)
        return Number.isFinite(score) && score < 75
      }).length

      const goalsDueSoon = (goals || []).filter((goal: any) => {
        if (goal.completed || !goal.target_date) return false
        const targetDate = new Date(goal.target_date)
        if (!Number.isFinite(targetDate.getTime())) return false
        const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 0 && diffDays <= 10
      }).length

      const appsThisWeek = applications.filter((app: any) => {
        const date = app.applied_date || app.created_at
        if (!date) return false
        const d = new Date(date)
        return Number.isFinite(d.getTime()) && d >= weekAgo
      }).length

      const notifs: Notification[] = []
      const nowIso = new Date().toISOString()

      if ((resumesResult.data || []).length === 0) {
        notifs.push({
          id: 'n-onboard-resume',
          title: 'Create your first resume',
          message: 'Kick off the enterprise workflow by creating one ATS-ready resume baseline.',
          type: 'info',
          read: false,
          link: '/app/resumes/new',
          created_at: nowIso,
        })
      }

      if (overdue > 0) {
        notifs.push({
          id: 'n-overdue-followups',
          title: `${overdue} overdue follow-up${overdue > 1 ? 's' : ''}`,
          message: 'Clear overdue actions to restore SLA compliance in your pipeline.',
          type: 'warning',
          read: false,
          link: '/app/applications',
          created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        })
      }

      if (stale > 0) {
        notifs.push({
          id: 'n-stale-pipeline',
          title: `${stale} stale application${stale > 1 ? 's' : ''}`,
          message: 'Refresh old active records with outreach or status updates this week.',
          type: 'reminder',
          read: false,
          link: '/app/command-center',
          created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        })
      }

      if (noAction > 0) {
        notifs.push({
          id: 'n-no-next-action',
          title: `${noAction} record${noAction > 1 ? 's' : ''} missing next action`,
          message: 'Set follow-up dates to prevent pipeline drift and improve execution discipline.',
          type: 'reminder',
          read: false,
          link: '/app/control-tower',
          created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        })
      }

      if (lowAts > 0) {
        notifs.push({
          id: 'n-low-ats',
          title: `${lowAts} resume${lowAts > 1 ? 's' : ''} below ATS target`,
          message: 'Run optimization to move all critical resumes above 75 ATS score.',
          type: 'info',
          read: false,
          link: '/app/resumes',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        })
      }

      if (goalsDueSoon > 0) {
        notifs.push({
          id: 'n-goals-due',
          title: `${goalsDueSoon} goal${goalsDueSoon > 1 ? 's' : ''} due in 10 days`,
          message: 'Break upcoming goals into weekly milestones to keep delivery predictable.',
          type: 'reminder',
          read: false,
          link: '/app/goals',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        })
      }

      if (applications.length > 0 && appsThisWeek === 0) {
        notifs.push({
          id: 'n-volume-cadence',
          title: 'No applications submitted this week',
          message: 'Maintain weekly volume to protect forecasted interview and offer outcomes.',
          type: 'warning',
          read: false,
          link: '/app/forecast',
          created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        })
      }

      if (notifs.length === 0) {
        notifs.push({
          id: 'n-healthy-pipeline',
          title: 'Operating rhythm is healthy',
          message: 'No critical risk signals detected. Keep the current weekly execution cadence.',
          type: 'success',
          read: false,
          link: '/app/program-office',
          created_at: nowIso,
        })
      }

      setNotifications(notifs.slice(0, 8))
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces', { cache: 'no-store' })
      if (!response.ok) return
      const data = await response.json().catch(() => null)
      const items = Array.isArray(data?.workspaces) ? data.workspaces : []
      const normalized = items
        .filter((item: any) => item?.id && item?.name)
        .map((item: any) => ({
          id: String(item.id),
          name: String(item.name),
          slug: String(item.slug || 'workspace'),
        }))
      setWorkspaces(normalized)
      if (!activeWorkspaceId && normalized.length > 0) {
        setActiveWorkspaceId(normalized[0].id)
      }
    } catch {
      // ignore workspace load issues
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    void trackEvent({
      event: 'signout',
      category: 'funnel',
      path: pathname || '/app',
    })
    router.push("/")
  }

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const submitAIMessage = async (rawMessage: string) => {
    const userMessage = rawMessage.trim()
    if (!userMessage || aiLoading) return

    const surfacedPrompt = [
      activeModeConfig.promptPrefix,
      `Current surface: ${SURFACE_LABELS[activeSurface]}.`,
      `User request: ${userMessage}`,
    ].join('\n')

    const history = [...aiMessages.slice(-6).map((item) => ({
      role: item.role,
      content: item.content,
    })), { role: 'user' as const, content: userMessage }]

    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setAiInput("")
    setAiLoading(true)
    void trackEvent({
      event: 'ai_prompt_sent',
      category: 'ai',
      workspaceId: activeWorkspaceId || undefined,
      metadata: { surface: activeSurface, mode: aiMode, promptLength: userMessage.length },
    })

    try {
      const response = await fetch('/api/agent/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: surfacedPrompt,
          history,
          surface: activeSurface,
          workspaceId: activeWorkspaceId || undefined,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const retrySuffix = data?.retryAfterSec
          ? ` Retry in about ${Math.max(1, Math.ceil(Number(data.retryAfterSec) / 60))} minute(s).`
          : ''
        throw new Error((data?.error || 'Copilot is currently unavailable.') + retrySuffix)
      }

      const payload = data?.response
      const normalized: CopilotPayload = {
        answer: String(payload?.answer || ''),
        summary: String(payload?.summary || ''),
        actionPlan: Array.isArray(payload?.actionPlan) ? payload.actionPlan : [],
        quickReplies: Array.isArray(payload?.quickReplies) ? payload.quickReplies : [],
        confidence: Number(payload?.confidence || 0.5),
      }

      const quickReplies = normalized.quickReplies.slice(0, 4)
      setAiQuickReplies(quickReplies)
      setAiMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: normalized.answer || 'I could not generate a full response. Try again with a narrower question.',
          payload: normalized,
        },
      ])
      void trackEvent({
        event: 'ai_prompt_succeeded',
        category: 'ai',
        workspaceId: activeWorkspaceId || undefined,
        metadata: { surface: activeSurface, mode: aiMode },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Copilot request failed.'
      setAiQuickReplies(activeModeConfig.starters.slice(0, 4))
      setAiMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `I hit an AI service issue. ${message}`,
          error: true,
        },
      ])
      void trackEvent({
        event: 'ai_prompt_failed',
        category: 'ai',
        workspaceId: activeWorkspaceId || undefined,
        metadata: { surface: activeSurface, mode: aiMode, error: message },
      })
    } finally {
      setAiLoading(false)
    }
  }

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitAIMessage(aiInput)
  }

  const runNaturalLanguageCommand = (query: string) => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return

    if (/(create|new|build).*(resume)/.test(normalized)) {
      router.push("/app/resumes/new")
      return
    }
    if (/(add|create|track).*(application|job)/.test(normalized)) {
      router.push("/app/applications?add=1")
      return
    }
    if (/(forecast|projection|scenario)/.test(normalized)) {
      router.push(APP_ROUTES.forecast)
      return
    }
    if (/(control|sla|risk|stale)/.test(normalized)) {
      router.push(APP_ROUTES.controlTower)
      return
    }
    if (/(interview|mock|practice)/.test(normalized)) {
      router.push(APP_ROUTES.interviews)
      return
    }

    setShowAIAssistant(true)
    void submitAIMessage(query)
  }

  const applySurfaceAction = (action: SurfaceQuickApplyAction) => {
    setAppliedSurfaceActions((prev) => Array.from(new Set([...prev, action.id])))
    if (action.prompt) {
      setShowAIAssistant(true)
      void submitAIMessage(action.prompt)
    }
    if (action.href) {
      router.push(action.href)
      setShowAIAssistant(false)
    }
    void trackEvent({
      event: "ai_surface_action_applied",
      category: "ai",
      workspaceId: activeWorkspaceId || undefined,
      metadata: { surface: activeSurface, actionId: action.id },
    })
  }

  const cycleDensityMode = () => {
    setDensityMode((prev) => (prev === "comfortable" ? "compact" : "comfortable"))
  }

  const cycleLayoutMode = () => {
    setLayoutMode((prev) => {
      if (prev === "balanced") return "focus"
      if (prev === "focus") return "wide"
      return "balanced"
    })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-green-500" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-saffron-500" />
      case 'reminder': return <Clock className="w-4 h-4 text-blue-500" />
      default: return <Lightbulb className="w-4 h-4 text-saffron-500" />
    }
  }

  return (
    <div className="min-h-dvh bg-mesh">
      <a
        href="#app-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] rounded-lg bg-background px-3 py-2 text-sm font-medium shadow-lg"
      >
        Skip to main content
      </a>
      {/* Dynamic background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className={cn(
            "absolute -top-24 right-[-8%] w-[640px] h-[640px] rounded-full blur-[150px] transition-colors duration-700",
            heatLayerTone === "risk"
              ? "bg-red-500/16"
              : heatLayerTone === "performance"
              ? "bg-saffron-500/16"
              : heatLayerTone === "quality"
              ? "bg-green-500/14"
              : "bg-saffron-500/14"
          )}
        />
        <div
          className={cn(
            "absolute top-[24%] -left-28 w-[520px] h-[520px] rounded-full blur-[140px] transition-colors duration-700",
            heatLayerTone === "risk"
              ? "bg-orange-500/14"
              : heatLayerTone === "performance"
              ? "bg-gold-500/14"
              : heatLayerTone === "quality"
              ? "bg-emerald-500/14"
              : "bg-gold-500/14"
          )}
        />
        <div
          className={cn(
            "absolute -bottom-28 right-[24%] w-[560px] h-[560px] rounded-full blur-[160px] transition-colors duration-700",
            heatLayerTone === "risk"
              ? "bg-red-700/16"
              : heatLayerTone === "performance"
              ? "bg-blue-500/14"
              : heatLayerTone === "quality"
              ? "bg-cyan-500/14"
              : "bg-navy-500/14"
          )}
        />
        <div className="absolute inset-0 bg-grid opacity-24" />
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            heatLayerTone === "risk"
              ? "bg-[radial-gradient(60%_70%_at_50%_100%,rgba(239,68,68,0.18),transparent_72%)]"
              : heatLayerTone === "performance"
              ? "bg-[radial-gradient(60%_70%_at_50%_100%,rgba(245,158,11,0.16),transparent_72%)]"
              : heatLayerTone === "quality"
              ? "bg-[radial-gradient(60%_70%_at_50%_100%,rgba(34,197,94,0.16),transparent_72%)]"
              : "bg-[radial-gradient(60%_70%_at_50%_100%,rgba(59,130,246,0.12),transparent_72%)]"
          )}
        />
      </div>

      {/* Mobile header — shows Climb logo */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 print:hidden safe-top">
        <div className="glass border-b border-border/60 px-3 sm:px-4 py-3 flex items-center justify-between">
          <button onClick={() => setMobileMenuOpen(true)} className="touch-target p-2 -ml-1 flex items-center justify-center" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/app/dashboard" className="flex items-center min-h-[44px]">
            <Logo size="sm" />
          </Link>
          <button 
            onClick={() => setShowNotifications(true)}
            className="touch-target p-2 -mr-1 relative flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-saffron-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/62 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-[min(18rem,85vw)] max-w-[320px] bg-background/95 backdrop-blur-2xl border-r border-border/70 p-4 overflow-y-auto safe-top safe-bottom shadow-[0_20px_52px_-30px_rgba(3,6,23,0.9)]">
            <div className="flex items-center justify-between mb-8">
              <Logo size="md" />
              <button onClick={() => setMobileMenuOpen(false)} className="touch-target p-2 -mr-2 flex items-center justify-center" aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}
                  className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    pathname?.startsWith(item.href)
                      ? "bg-gradient-to-r from-saffron-500/14 via-gold-500/10 to-transparent text-foreground border border-saffron-500/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/75"
                  )}>
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="mt-6 pt-6 border-t border-border space-y-1">
              <div className="px-3 py-1">
                <ThemeToggle className="w-full justify-start" showLabel />
              </div>
              <div className="px-3 py-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={cycleDensityMode}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-2 text-xs hover:bg-secondary"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {densityMode === "compact" ? "Compact" : "Comfort"}
                </button>
                <button
                  type="button"
                  onClick={cycleLayoutMode}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-2 text-xs hover:bg-secondary"
                >
                  <MonitorSmartphone className="h-3.5 w-3.5" />
                  {layoutMode}
                </button>
              </div>
              <div className="px-3 py-1">
                <MotionThemeSelector value={motionTheme} onChange={setMotionTheme} />
              </div>
              <button onClick={() => { setMobileMenuOpen(false); setShowAIAssistant(true) }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-saffron-500 to-gold-500 hover:opacity-95 w-full transition-all shadow-[0_14px_26px_-16px_rgba(127,203,36,0.82)]">
                <Sparkles className="w-5 h-5" />
                AI Assistant
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setShowShortcutMap(true)
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/75 w-full transition-all"
              >
                <Keyboard className="w-5 h-5" />
                Keyboard Shortcuts
              </button>
              {bottomNav.map((item) => (
                <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/75 transition-all">
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              <button onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/75 w-full transition-all">
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar — Climb logo top */}
      <aside className={cn("hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 border-r border-border/65 bg-background/78 backdrop-blur-2xl transition-all duration-300 print:hidden", sidebarCollapsed ? "w-20" : "w-64")}>
        {/* Logo — always visible */}
        <div className="p-4 border-b border-border/60">
          <Link href="/app/dashboard" className="block">
            {sidebarCollapsed ? (
              <LogoMark size={40} className="mx-auto" />
            ) : (
              <Logo size="md" />
            )}
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                pathname?.startsWith(item.href)
                  ? "bg-gradient-to-r from-saffron-500/14 via-gold-500/10 to-transparent text-foreground border border-saffron-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/75"
              )}>
              <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                pathname?.startsWith(item.href) ? "bg-gradient-to-br from-saffron-500/20 to-gold-500/20 text-saffron-700 dark:text-saffron-300" : "group-hover:bg-secondary/80"
              )}>
                <item.icon className="w-5 h-5" />
              </div>
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          {bottomNav.map((item) => (
            <Link key={item.name} href={item.href}
              className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                pathname?.startsWith(item.href)
                  ? "bg-gradient-to-r from-saffron-500/14 via-gold-500/10 to-transparent text-foreground border border-saffron-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/75"
              )}>
              <div className="flex items-center justify-center w-8 h-8"><item.icon className="w-5 h-5" /></div>
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          ))}
          <button onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/75 w-full transition-all group">
            <div className="flex items-center justify-center w-8 h-8"><LogOut className="w-5 h-5" /></div>
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>

        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-saffron-500/50 transition-all shadow-premium">
          {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "transition-all duration-300 print:ml-0 min-h-dvh flex flex-col",
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        {/* Top bar */}
        <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center justify-between px-4 xl:px-6 border-b border-border/65 bg-background/78 backdrop-blur-2xl print:hidden">
          {/* Left: Search */}
          <div className="min-w-0 flex-1 pr-3">
            <button
              type="button"
              onClick={() => setShowCommandPalette(true)}
              aria-label="Open command palette"
              className="relative w-full max-w-[44rem] rounded-xl border border-border/80 bg-background/85 px-4 py-2.5 text-left text-sm text-muted-foreground transition-all hover:bg-secondary/70 hover:border-saffron-500/36"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" />
              <span className="pl-7 block truncate">Run commands or ask AI in natural language...</span>
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-background/90 px-2 py-0.5 text-xs">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: AI + Notifications + Profile */}
          <div className="flex items-center gap-2 xl:gap-3">
            <span className="hidden 2xl:inline-flex items-center rounded-full border border-saffron-500/30 bg-saffron-500/10 px-2.5 py-1 text-[11px] font-semibold text-saffron-700 dark:text-saffron-300">
              AI Orchestrated
            </span>
            <div className="hidden xl:flex items-center gap-2 rounded-xl border border-border/70 bg-background/85 px-2 py-1.5">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Workspace</span>
              <select
                value={activeWorkspaceId || ""}
                onChange={(event) => {
                  const workspaceId = event.target.value || null
                  setActiveWorkspaceId(workspaceId)
                  const workspaceName = workspaces.find((item) => item.id === workspaceId)?.name || "workspace"
                  void trackEvent({
                    event: "workspace_switched",
                    category: "workspace",
                    workspaceId: workspaceId || undefined,
                    metadata: { workspaceName },
                  })
                }}
                className="bg-transparent text-xs text-foreground outline-none min-w-[120px]"
              >
                {workspaces.length === 0 ? (
                  <option value="">Personal</option>
                ) : (
                  workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="hidden 2xl:flex items-center gap-2 rounded-xl border border-border/70 bg-background/85 px-2 py-1.5">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Motion</span>
              <select
                value={motionTheme}
                onChange={(event) => setMotionTheme(event.target.value as MotionTheme)}
                className="bg-transparent text-xs text-foreground outline-none"
              >
                <option value="minimal">Minimal</option>
                <option value="cinematic">Cinematic</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={cycleDensityMode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/85 px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70"
              aria-label="Toggle interface density"
              title={`Density: ${densityMode}`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden 2xl:inline">{densityMode === "compact" ? "Compact" : "Comfort"}</span>
            </button>
            <button
              type="button"
              onClick={cycleLayoutMode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/85 px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70"
              aria-label="Cycle layout mode"
              title={`Layout: ${layoutMode}`}
            >
              <MonitorSmartphone className="h-4 w-4" />
              <span className="hidden 2xl:inline capitalize">{layoutMode}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowShortcutMap(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/85 px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70"
              aria-label="Open keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
              <span className="hidden 2xl:inline">Shortcuts</span>
            </button>
            <button
              onClick={() => setShowAIAssistant(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-saffron-500 to-gold-500 text-white hover:opacity-95 border border-white/20 transition-all shadow-[0_16px_30px_-18px_rgba(127,203,36,0.84)]">
              <Sparkles className="w-4 h-4" />
              <span className="hidden xl:inline">AI Assistant</span>
            </button>
            
            <button onClick={() => setShowNotifications(true)}
              className="relative p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-saffron-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">{unreadCount}</span>
              )}
            </button>

            <Link href="/app/settings" className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-secondary/70 transition-all border border-transparent hover:border-border/60">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-600 to-navy-900 flex items-center justify-center text-white text-sm font-medium">{userInitial}</div>
              <span className="text-sm font-medium hidden xl:block">{userName}</span>
            </Link>
          </div>
        </header>

        <section className="hidden lg:flex items-center gap-3 border-b border-border/60 bg-background/72 px-4 xl:px-6 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            AI Dock
          </span>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {dockPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setShowAIAssistant(true)
                  void submitAIMessage(prompt)
                  void trackEvent({
                    event: "ai_dock_prompt_run",
                    category: "ai",
                    metadata: { surface: activeSurface, prompt },
                  })
                }}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <main
          id="app-main-content"
          className={cn(
            "flex-1 min-h-0 pt-16 lg:pt-0 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0",
            layoutMode === "focus" && "max-w-6xl mx-auto w-full",
            layoutMode === "balanced" && "max-w-[1500px] mx-auto w-full",
            layoutMode === "wide" && "w-full"
          )}
        >
          {children}
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-background/92 backdrop-blur-2xl print:hidden shadow-[0_-16px_30px_-22px_rgba(17,24,58,0.55)]">
        <div className="grid grid-cols-6 px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]">
          {mobilePrimaryNav.map((item) => {
            const active = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors",
                  active ? "text-foreground bg-gradient-to-br from-saffron-500/14 to-gold-500/14 border border-saffron-500/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════ */}
      {/*  COMMAND PALETTE                           */}
      {/* ═══════════════════════════════════════════ */}
      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        items={commandPaletteItems}
        onNaturalLanguage={runNaturalLanguageCommand}
      />

      {/* ═══════════════════════════════════════════ */}
      {/*  NOTIFICATIONS SLIDE-OVER                  */}
      {/* ═══════════════════════════════════════════ */}
      {showNotifications && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-full sm:max-w-md bg-background/96 backdrop-blur-2xl border-l border-border/65 shadow-2xl flex flex-col safe-top safe-bottom safe-right">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-saffron-500/20 to-gold-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-saffron-600 dark:text-saffron-300" />
                </div>
                <div>
                  <h2 className="font-semibold">Notifications</h2>
                  <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-saffron-500 hover:text-saffron-600 font-medium touch-target">Mark all read</button>
                )}
                <button onClick={() => setShowNotifications(false)} className="touch-target p-2 rounded-lg hover:bg-secondary" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                  <h3 className="font-medium mb-1">All caught up!</h3>
                  <p className="text-sm text-muted-foreground">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => (
                    <div key={n.id} className={cn("p-4 hover:bg-secondary/35 transition-colors group", !n.read && "bg-gradient-to-r from-saffron-500/10 to-transparent border-l-2 border-saffron-500")}>
                      <div className="flex gap-3">
                        <div className="shrink-0 mt-0.5">{getNotificationIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</h4>
                            <button onClick={() => deleteNotification(n.id)} className="touch-target p-2 -m-1 rounded hover:bg-secondary shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center justify-center" aria-label="Delete notification">
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {(() => {
                                const diff = Date.now() - new Date(n.created_at).getTime()
                                if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
                                if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
                                return `${Math.floor(diff / 86400000)}d ago`
                              })()}
                            </span>
                            {!n.read && (
                              <button onClick={() => markAsRead(n.id)} className="text-xs text-saffron-500 hover:text-saffron-600 font-medium">Mark read</button>
                            )}
                            {n.link && (
                              <Link href={n.link} onClick={() => setShowNotifications(false)} className="text-xs text-saffron-500 hover:text-saffron-600 font-medium flex items-center gap-1">
                                Go <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/*  AI ASSISTANT SLIDE-OVER                   */}
      {/* ═══════════════════════════════════════════ */}
      {showAIAssistant && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setShowAIAssistant(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-full sm:max-w-xl bg-background/96 backdrop-blur-2xl border-l border-border/65 shadow-2xl flex flex-col safe-top safe-bottom safe-right text-foreground">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron-500 to-gold-500 flex items-center justify-center shadow-glow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold">Climb AI Matrix</h2>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-xs text-muted-foreground">Online — {SURFACE_LABELS[activeSurface]} context</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAIAssistant(false)} className="touch-target p-2 rounded-lg hover:bg-secondary" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 sm:px-5 py-3 border-b border-border bg-secondary/24">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ASSISTANT_MODES) as AssistantMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAiMode(mode)
                      if (aiMessages.length === 0) {
                        setAiQuickReplies(ASSISTANT_MODES[mode].starters.slice(0, 4))
                      }
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      aiMode === mode
                        ? "border-saffron-500/40 bg-gradient-to-r from-saffron-500/14 to-gold-500/14 text-saffron-700 dark:text-saffron-300"
                        : "border-border text-foreground hover:bg-secondary"
                    )}
                  >
                    {ASSISTANT_MODES[mode].label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {activeModeConfig.hint}
              </p>
              {surfaceQuickApplyActions.length > 0 && (
                <div className="mt-3 rounded-xl border border-border bg-background/75 p-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Context Quick Apply</p>
                  <div className="space-y-1.5">
                    {surfaceQuickApplyActions.slice(0, 3).map((action) => {
                      const applied = appliedSurfaceActions.includes(action.id)
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => applySurfaceAction(action)}
                          className={cn(
                            "w-full rounded-lg border p-2 text-left transition-colors",
                            applied
                              ? "border-green-500/30 bg-green-500/10"
                              : "border-border hover:border-saffron-500/40 hover:bg-secondary/60"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground">{action.label}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{action.detail}</p>
                            </div>
                            <span className={cn("text-[10px] rounded px-1.5 py-0.5", applied ? "bg-green-500/15 text-green-700" : "bg-saffron-500/15 text-saffron-700")}>
                              {applied ? "Applied" : "Apply"}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {aiMessages.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-saffron-500/20 to-gold-500/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-saffron-600 dark:text-saffron-300" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">How can I help you in {SURFACE_LABELS[activeSurface]}?</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    I&apos;m your AI assistant. Current mode: {activeModeConfig.label}. I can give clear priorities, next steps, and coaching tips.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeModeConfig.starters.slice(0, 4).map((text) => (
                      <button key={text}
                        onClick={() => { void submitAIMessage(text) }}
                        disabled={aiLoading}
                        className="p-3 min-h-[44px] text-sm text-left text-foreground rounded-xl border border-border hover:border-saffron-500/35 hover:bg-saffron-500/8 transition-all">
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                aiMessages.map((msg, i) => {
                  const showQuickReplies = msg.role === 'assistant' && i === aiMessages.length - 1 && aiQuickReplies.length > 0 && !aiLoading
                  return (
                    <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-saffron-500 to-gold-500 flex items-center justify-center mr-2 shrink-0 mt-1">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={cn("max-w-[88%] rounded-2xl px-4 py-3",
                      msg.role === 'user' ? 'bg-gradient-to-br from-navy-700 to-navy-900 text-white shadow-premium' : 'bg-card text-foreground border border-border/80 shadow-[0_10px_28px_-20px_rgba(13,22,44,0.55)]'
                    )}>
                      {msg.role === 'assistant' && msg.payload?.summary && (
                        <p className="text-[11px] uppercase tracking-wide text-foreground/70 mb-2">{msg.payload.summary}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                      {msg.role === 'assistant' && msg.payload?.actionPlan?.length ? (
                        <div className="mt-3 space-y-2">
                          {msg.payload.actionPlan.map((action, actionIndex) => (
                            <Link
                              key={`${action.title}-${actionIndex}`}
                              href={action.href}
                              onClick={() => setShowAIAssistant(false)}
                              className="block rounded-lg border border-border bg-background/60 p-2.5 hover:border-saffron-500/40 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="inline-flex items-center gap-2 mb-1">
                                    <span className={cn(
                                      "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded",
                                      action.priority === 'high'
                                        ? "bg-red-500/10 text-red-600"
                                        : action.priority === 'medium'
                                        ? "bg-saffron-500/10 text-saffron-600"
                                        : "bg-blue-500/10 text-blue-600"
                                    )}>
                                      {action.priority}
                                    </span>
                                    <p className="text-xs font-medium truncate">{action.title}</p>
                                  </div>
                                  <p className="text-xs text-foreground/75">{action.detail}</p>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      ) : null}

                      {msg.role === 'assistant' && msg.payload ? (
                        <div className="mt-2 space-y-2">
                          <p className="text-[11px] text-foreground/65">
                            Confidence: {Math.round(Math.max(0, Math.min(1, msg.payload.confidence)) * 100)}%
                          </p>
                          <ConfidenceLayersPanel
                            confidence={msg.payload.confidence}
                            evidence={msg.payload.actionPlan.map((item) => item.detail).filter(Boolean)}
                          />
                          <AIDecisionTreeView
                            rootLabel="AI recommendation root"
                            branches={msg.payload.actionPlan.slice(0, 3).map((action, actionIndex) => ({
                              id: `${action.title}-${actionIndex}`,
                              title: action.title,
                              confidence: Math.max(0.2, Math.min(1, msg.payload!.confidence - actionIndex * 0.12)),
                              explanation: action.detail,
                              href: action.href,
                              children: [
                                action.priority === "high" ? "Urgent impact" : "Planned impact",
                                `Surface: ${SURFACE_LABELS[activeSurface]}`,
                                `Mode: ${activeModeConfig.label}`,
                              ],
                            }))}
                          />
                        </div>
                      ) : null}

                      {showQuickReplies ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {aiQuickReplies.slice(0, 4).map((reply) => (
                            <button
                              key={reply}
                              type="button"
                              onClick={() => { void submitAIMessage(reply) }}
                              className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-xs text-foreground hover:bg-saffron-500/10 hover:border-saffron-500/40 transition-colors"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  )
                })
              )}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-saffron-500 to-gold-500 flex items-center justify-center mr-2 shrink-0 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-card border border-border/80 rounded-2xl px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-saffron-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-saffron-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-saffron-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            <form onSubmit={handleAISubmit} className="p-4 border-t border-border bg-background safe-bottom">
              <div className="flex gap-2">
                <input type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)}
                  placeholder={`Ask in ${activeModeConfig.label.toLowerCase()} mode for ${SURFACE_LABELS[activeSurface].toLowerCase()}...`}
                  className="input-field flex-1 py-3 min-h-[44px]" />
                <button type="submit" disabled={!aiInput.trim() || aiLoading}
                  className="btn-saffron touch-target px-4 disabled:opacity-50 shrink-0 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                AI guidance only. Double-check important decisions before acting.
              </p>
            </form>
          </div>
        </div>
      )}

      {showShortcutMap && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setShowShortcutMap(false)} />
          <div className="absolute left-1/2 top-1/2 w-[min(92vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background/96 p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Keyboard Shortcuts</h2>
                <p className="text-xs text-muted-foreground">Keyboard-first navigation and quick actions</p>
              </div>
              <button onClick={() => setShowShortcutMap(false)} className="touch-target rounded-lg p-2 hover:bg-secondary" aria-label="Close shortcuts">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid gap-2 text-sm">
              {[
                { keys: "⌘K / Ctrl+K", action: "Open command palette" },
                { keys: "?", action: "Open shortcut map" },
                { keys: "Alt+1", action: "Open dashboard" },
                { keys: "Alt+2", action: "Open applications" },
                { keys: "Alt+3", action: "Open resumes" },
                { keys: "Alt+4", action: "Open interviews" },
                { keys: "Alt+5", action: "Open AI assistant" },
              ].map((entry) => (
                <div key={entry.keys} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-muted-foreground">{entry.action}</span>
                  <kbd className="rounded border border-border bg-background/80 px-2 py-0.5 text-xs">{entry.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
