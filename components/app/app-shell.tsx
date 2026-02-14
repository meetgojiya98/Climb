"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Logo, LogoMark } from "@/components/ui/logo"
import { createClient } from "@/lib/supabase/client"
import { fetchApplicationsCompatible } from "@/lib/supabase/application-compat"
import { CommandPalette } from "@/components/app/command-palette"
import { ThemeToggle } from "@/components/app/theme-toggle"
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
  User,
  Menu,
  X,
  Sparkles,
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
  Shield,
  Building2,
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

const navigation = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "Control Tower", href: "/app/control-tower", icon: Shield },
  { name: "Program Office", href: "/app/program-office", icon: Building2 },
  { name: "Command Center", href: "/app/command-center", icon: Zap },
  { name: "Resumes", href: "/app/resumes", icon: FileText },
  { name: "Roles", href: "/app/roles", icon: ClipboardList },
  { name: "Applications", href: "/app/applications", icon: Briefcase },
  { name: "Cover Letters", href: "/app/cover-letters", icon: Mail },
  { name: "Saved Jobs", href: "/app/saved-jobs", icon: Bookmark },
  { name: "Interview Prep", href: "/app/interviews", icon: MessageSquare },
  { name: "Career Goals", href: "/app/goals", icon: Target },
  { name: "Insights", href: "/app/insights", icon: TrendingUp },
  { name: "Forecast", href: "/app/forecast", icon: LineChart },
  { name: "Reports", href: "/app/reports", icon: FileBarChart2 },
  { name: "Salary Insights", href: "/app/salary-insights", icon: DollarSign },
]

const bottomNav = [
  { name: "Settings", href: "/app/settings", icon: Settings },
  { name: "Help", href: "/app/help", icon: HelpCircle },
]

const mobilePrimaryNav = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "Tower", href: "/app/control-tower", icon: Shield },
  { name: "Program", href: "/app/program-office", icon: Building2 },
  { name: "Forecast", href: "/app/forecast", icon: LineChart },
  { name: "Reports", href: "/app/reports", icon: FileBarChart2 },
]

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
  const [aiMessages, setAiMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [userName, setUserName] = useState("User")
  const [userInitial, setUserInitial] = useState("U")

  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages, aiLoading])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setShowCommandPalette((open) => !open)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

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

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
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

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiInput.trim() || aiLoading) return

    const userMessage = aiInput.trim()
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setAiInput("")
    setAiLoading(true)

    setTimeout(() => {
      const responses: Record<string, string> = {
        resume: "Great question about resumes! Here's my advice:\n\n• **Tailor for each role** — Mirror the job description keywords\n• **Quantify achievements** — \"Grew revenue 40%\" beats \"Helped grow revenue\"\n• **ATS-friendly formatting** — Avoid tables, headers in images, fancy fonts\n• **Action verbs** — Led, Built, Designed, Optimized, Delivered\n• **Keep it to 1–2 pages** — Relevance matters more than length\n\nWant me to help you optimize a specific section? Go to **Resumes → Create Resume** to get started!",
        interview: "Here's how to nail your next interview:\n\n• **STAR Method** — Structure answers: Situation, Task, Action, Result\n• **Research deeply** — Know the company's mission, products, and recent news\n• **Prepare 5 stories** — Versatile stories that answer multiple question types\n• **Ask great questions** — \"What does success look like in 90 days?\"\n• **Practice with timer** — Keep answers to 1–2 minutes\n\nHead to **Interview Prep** to practice with real questions and get AI feedback!",
        application: "Stay organized with your job search:\n\n• **Track everything** — Even roles you're unsure about\n• **Follow up** — 1 week after applying, 1 day after interviews\n• **Batch applications** — Apply to 5–10 roles per week\n• **Status updates** — Move cards through your pipeline\n• **Take notes** — Log who you spoke with and key takeaways\n\nGo to **Applications** to add and track your active roles!",
        goal: "Setting strong career goals:\n\n• **Be specific** — \"Get a Senior PM role at a FAANG company\" > \"Get promoted\"\n• **Set deadlines** — Goals without timelines are just wishes\n• **Break it down** — Turn big goals into weekly milestones\n• **Track progress** — Review and adjust monthly\n• **Celebrate wins** — Even small progress matters\n\nHead to **Career Goals** to map out your career path!",
        default: "I'm your AI career assistant! I can help you with:\n\n🎯 **Resume optimization** — ATS tips, keyword strategy, formatting\n💼 **Application tracking** — Stay organized, follow up on time\n🎙 **Interview preparation** — Practice questions, STAR method, feedback\n📈 **Career planning** — Goal setting, skill development, networking\n\nWhat would you like to work on today?"
      }

      let response = responses.default
      const lower = userMessage.toLowerCase()
      if (lower.includes('resume') || lower.includes('cv') || lower.includes('ats')) {
        response = responses.resume
      } else if (lower.includes('interview') || lower.includes('prepare') || lower.includes('practice')) {
        response = responses.interview
      } else if (lower.includes('application') || lower.includes('track') || lower.includes('job') || lower.includes('apply')) {
        response = responses.application
      } else if (lower.includes('goal') || lower.includes('career') || lower.includes('plan') || lower.includes('grow')) {
        response = responses.goal
      }

      setAiMessages(prev => [...prev, { role: 'assistant', content: response }])
      setAiLoading(false)
    }, 800 + Math.random() * 700)
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
    <div className="min-h-screen bg-mesh">
      {/* Dynamic background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-saffron-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-navy-500/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-grid opacity-30" />
      </div>

      {/* Mobile header — shows Climb logo */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 print:hidden safe-top">
        <div className="glass border-b border-border px-3 sm:px-4 py-3 flex items-center justify-between">
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
              <span className="absolute top-1 right-1 w-4 h-4 bg-saffron-500 rounded-full text-[10px] font-bold text-navy-900 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-[min(18rem,85vw)] max-w-[320px] bg-background border-r border-border p-4 overflow-y-auto safe-top safe-bottom">
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
                    pathname?.startsWith(item.href) ? "bg-gradient-to-r from-saffron-500/10 to-transparent text-saffron-600" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
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
              <button onClick={() => { setMobileMenuOpen(false); setShowAIAssistant(true) }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-saffron-500 hover:bg-saffron-500/10 w-full transition-all">
                <Sparkles className="w-5 h-5" />
                AI Assistant
              </button>
              {bottomNav.map((item) => (
                <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              <button onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-all">
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar — Climb logo top */}
      <aside className={cn("hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 border-r border-border bg-background/80 backdrop-blur-xl transition-all duration-300 print:hidden", sidebarCollapsed ? "w-20" : "w-64")}>
        {/* Logo — always visible */}
        <div className="p-4 border-b border-border">
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
                pathname?.startsWith(item.href) ? "bg-gradient-to-r from-saffron-500/10 to-transparent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}>
              <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                pathname?.startsWith(item.href) ? "bg-saffron-500/20 text-saffron-600" : "group-hover:bg-secondary"
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
                pathname?.startsWith(item.href) ? "bg-gradient-to-r from-saffron-500/10 to-transparent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}>
              <div className="flex items-center justify-center w-8 h-8"><item.icon className="w-5 h-5" /></div>
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          ))}
          <button onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary w-full transition-all group">
            <div className="flex items-center justify-center w-8 h-8"><LogOut className="w-5 h-5" /></div>
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>

        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-6 h-6 bg-background border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-saffron-500/50 transition-all shadow-sm">
          {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main content */}
      <div className={cn("transition-all duration-300 print:ml-0", sidebarCollapsed ? "lg:ml-20" : "lg:ml-64")}>
        {/* Top bar */}
        <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center justify-between px-4 xl:px-6 border-b border-border bg-background/80 backdrop-blur-xl print:hidden">
          {/* Left: Search */}
          <div className="min-w-0 flex-1 pr-3">
            <button
              type="button"
              onClick={() => setShowCommandPalette(true)}
              className="relative w-full max-w-[44rem] rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-left text-sm text-muted-foreground transition-all hover:bg-secondary/60 hover:border-saffron-500/30"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" />
              <span className="pl-7 block truncate">Search commands, pages, and actions...</span>
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-2 py-0.5 text-xs">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: AI + Notifications + Profile */}
          <div className="flex items-center gap-2 xl:gap-3">
            <ThemeToggle />
            <button
              onClick={() => setShowAIAssistant(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-saffron-500/10 to-saffron-500/5 text-saffron-600 hover:from-saffron-500/20 hover:to-saffron-500/10 border border-saffron-500/20 transition-all">
              <Sparkles className="w-4 h-4" />
              <span className="hidden xl:inline">AI Assistant</span>
            </button>
            
            <button onClick={() => setShowNotifications(true)}
              className="relative p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-saffron-500 rounded-full text-[10px] font-bold text-navy-900 flex items-center justify-center">{unreadCount}</span>
              )}
            </button>

            <Link href="/app/settings" className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-secondary transition-all">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-700 to-navy-900 flex items-center justify-center text-white text-sm font-medium">{userInitial}</div>
              <span className="text-sm font-medium hidden xl:block">{userName}</span>
            </Link>
          </div>
        </header>

        <main className="pt-16 lg:pt-0 min-h-screen pb-24 lg:pb-0 safe-bottom">{children}</main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl safe-bottom print:hidden">
        <div className="grid grid-cols-5 px-1.5 py-1.5">
          {mobilePrimaryNav.map((item) => {
            const active = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors",
                  active ? "text-saffron-600 bg-saffron-500/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
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
      />

      {/* ═══════════════════════════════════════════ */}
      {/*  NOTIFICATIONS SLIDE-OVER                  */}
      {/* ═══════════════════════════════════════════ */}
      {showNotifications && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
          <div className="absolute top-0 right-0 bottom-0 w-full sm:max-w-md bg-background border-l border-border shadow-2xl flex flex-col safe-top safe-bottom safe-right">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-saffron-500/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-saffron-500" />
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
                    <div key={n.id} className={cn("p-4 hover:bg-secondary/30 transition-colors group", !n.read && "bg-saffron-500/5 border-l-2 border-saffron-500")}>
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
          <div className="absolute top-0 right-0 bottom-0 w-full sm:max-w-lg bg-background border-l border-border shadow-2xl flex flex-col safe-top safe-bottom safe-right">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saffron-500 to-gold-400 flex items-center justify-center shadow-glow-sm">
                  <Sparkles className="w-5 h-5 text-navy-900" />
                </div>
                <div>
                  <h2 className="font-semibold">Climb AI Assistant</h2>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-xs text-muted-foreground">Online — Ready to help</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAIAssistant(false)} className="touch-target p-2 rounded-lg hover:bg-secondary" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {aiMessages.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-saffron-500/20 to-gold-400/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-saffron-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">How can I help you today?</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    I&apos;m your career AI. Ask me about resumes, interviews, applications, or career planning.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { text: "Optimize my resume", icon: "📄" },
                      { text: "Interview tips", icon: "🎙" },
                      { text: "Track applications", icon: "💼" },
                      { text: "Career growth advice", icon: "📈" },
                    ].map((s, i) => (
                      <button key={i}
                        onClick={() => { setAiInput(s.text); }}
                        className="p-3 min-h-[44px] text-sm text-left rounded-xl border border-border hover:border-saffron-500/30 hover:bg-saffron-500/5 transition-all flex items-center gap-2">
                        <span>{s.icon}</span>
                        <span>{s.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                aiMessages.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-saffron-500 to-gold-400 flex items-center justify-center mr-2 shrink-0 mt-1">
                        <Sparkles className="w-3.5 h-3.5 text-navy-900" />
                      </div>
                    )}
                    <div className={cn("max-w-[80%] rounded-2xl px-4 py-3",
                      msg.role === 'user' ? 'bg-navy-900 text-white' : 'bg-secondary'
                    )}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-saffron-500 to-gold-400 flex items-center justify-center mr-2 shrink-0 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-navy-900" />
                  </div>
                  <div className="bg-secondary rounded-2xl px-4 py-3">
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
                  placeholder="Ask me anything about your career..."
                  className="input-field flex-1 py-3 min-h-[44px]" />
                <button type="submit" disabled={!aiInput.trim() || aiLoading}
                  className="btn-saffron touch-target px-4 disabled:opacity-50 shrink-0 flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">AI responses are for guidance only</p>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
