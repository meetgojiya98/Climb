"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { fetchApplicationsCompatible } from "@/lib/supabase/application-compat"
import { LogoMark } from "@/components/ui/logo"
import { AIMissionConsole } from "@/components/app/ai-mission-console"
import {
  AIPromptResultFlow,
  CohortCompareView,
  CompanySignalCards,
  CommandCanvas,
  ConversionSankeyChart,
  ExecutiveStoryboard,
  GeoOpportunityMap,
  InteractiveFunnel,
  InterviewPlaybackTimeline,
  LiveKpiWall,
  PipelineReplay,
  RiskRadarOverlay,
  StageHealthGauges,
  SkillRoleFitMatrix3D,
  TemplateImpactGallery,
  ThemeStudioLivePreview,
  OpportunityTreemap,
  JourneyMapUI,
  TimelineHeatmap,
  WorkspaceCommandGraph,
  type FunnelStage,
  type KpiMetric,
} from "@/components/app/graphical-ui"
import { deriveForecastMetrics, projectPipeline } from "@/lib/forecast"
import { 
  FileText, 
  Briefcase, 
  Target, 
  TrendingUp, 
  Plus, 
  ArrowRight, 
  Sparkles,
  MessageSquare,
  ChevronRight,
  Zap,
  ArrowUpRight,
  Activity,
  LineChart,
  ShieldCheck,
  Building2,
  BookOpenCheck,
  Globe2,
  RefreshCw,
} from "lucide-react"

interface DashboardData {
  resumes: number
  applications: number
  interviews: number
  goals: { total: number; completed: number }
  applicationsThisWeek: number
  recentApplications: Array<{
    id: string
    company: string
    position: string
    status: string
    applied_date: string
  }>
  recentResumes: Array<{
    id: string
    title: string
    updated_at: string
    ats_score: number | null
  }>
  forecast: {
    weeklyTarget: number
    projectedInterviews8w: number
    projectedOffers8w: number
  }
  userName: string
}

interface CopilotAction {
  title: string
  detail: string
  href: string
  priority: 'high' | 'medium' | 'low'
}

interface CopilotBrief {
  summary: string
  answer: string
  actionPlan: CopilotAction[]
  quickReplies: string[]
  confidence: number
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showStoryboard, setShowStoryboard] = useState(false)
  const [data, setData] = useState<DashboardData>({
    resumes: 0,
    applications: 0,
    interviews: 0,
    goals: { total: 0, completed: 0 },
    applicationsThisWeek: 0,
    recentApplications: [],
    recentResumes: [],
    forecast: {
      weeklyTarget: 5,
      projectedInterviews8w: 0,
      projectedOffers8w: 0,
    },
    userName: "there"
  })
  const [aiBrief, setAiBrief] = useState<CopilotBrief | null>(null)
  const [aiBriefLoading, setAiBriefLoading] = useState(false)
  const [aiBriefError, setAiBriefError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const userName = user.user_metadata?.full_name?.split(' ')[0] || "there"

      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const [
        resumesResult,
        goalsResult,
        recentResumesResult,
        allApplications,
      ] = await Promise.all([
        supabase.from('resumes').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('career_goals').select('id, completed').eq('user_id', user.id),
        supabase.from('resumes').select('id, title, updated_at, ats_score')
          .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(3),
        fetchApplicationsCompatible(supabase, user.id),
      ])

      const goals = goalsResult.data || []
      const orderedApplications = [...(allApplications || [])].sort((a: any, b: any) => {
        const aTime = new Date(a.applied_date || a.created_at || 0).getTime()
        const bTime = new Date(b.applied_date || b.created_at || 0).getTime()
        return bTime - aTime
      })

      const applicationsThisWeek = orderedApplications.filter((app: any) => {
        const d = new Date(app.applied_date || app.created_at || 0)
        return Number.isFinite(d.getTime()) && d >= weekAgo
      }).length

      const recentApps = orderedApplications.slice(0, 4).map((app: any) => ({
        id: app.id,
        company: app.company || 'Unknown Company',
        position: app.position || 'Untitled Role',
        status: app.status || 'applied',
        applied_date: app.applied_date || app.created_at || new Date().toISOString(),
      }))

      const forecastMetrics = deriveForecastMetrics(orderedApplications as any)
      const forecastProjection = projectPipeline({
        applicationsPerWeek: Math.max(1, Math.round(forecastMetrics.avgApplicationsPerWeek + 1)),
        weeks: 8,
        responseRate: forecastMetrics.responseRate,
        interviewRate: forecastMetrics.interviewRate,
        offerRate: forecastMetrics.offerRate,
        qualityLiftPct: 5,
      })

      setData({
        resumes: resumesResult.count || 0,
        applications: orderedApplications.length,
        interviews: orderedApplications.filter((a: any) => a.status === 'interview').length || 0,
        goals: {
          total: goals.length,
          completed: goals.filter((g: any) => g.completed).length
        },
        applicationsThisWeek,
        recentApplications: recentApps,
        recentResumes: recentResumesResult.data || [],
        forecast: {
          weeklyTarget: Math.max(5, Math.round(forecastMetrics.avgApplicationsPerWeek + 2)),
          projectedInterviews8w: forecastProjection.expectedInterviews,
          projectedOffers8w: forecastProjection.expectedOffers,
        },
        userName
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAIBrief = useCallback(async (customPrompt?: string) => {
    if (aiBriefLoading) return
    setAiBriefLoading(true)
    setAiBriefError(null)

    try {
      const message = customPrompt || [
        `Generate an enterprise operating brief for dashboard execution.`,
        `Resumes: ${data.resumes}.`,
        `Applications: ${data.applications}.`,
        `Applications this week: ${data.applicationsThisWeek}.`,
        `Interviews: ${data.interviews}.`,
        `Goals completed: ${data.goals.completed} of ${data.goals.total}.`,
        `Weekly target: ${data.forecast.weeklyTarget}.`,
        `Projected offers in 8 weeks: ${data.forecast.projectedOffers8w}.`,
      ].join(' ')

      const response = await fetch('/api/agent/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          surface: 'dashboard',
          history: [],
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to generate AI executive brief')
      }

      const normalized: CopilotBrief = {
        summary: String(payload?.response?.summary || ''),
        answer: String(payload?.response?.answer || ''),
        actionPlan: Array.isArray(payload?.response?.actionPlan) ? payload.response.actionPlan : [],
        quickReplies: Array.isArray(payload?.response?.quickReplies) ? payload.response.quickReplies : [],
        confidence: Number(payload?.response?.confidence || 0.5),
      }

      setAiBrief(normalized)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI brief failed'
      setAiBriefError(message)
    } finally {
      setAiBriefLoading(false)
    }
  }, [
    aiBriefLoading,
    data.applications,
    data.applicationsThisWeek,
    data.forecast.projectedOffers8w,
    data.forecast.weeklyTarget,
    data.goals.completed,
    data.goals.total,
    data.interviews,
    data.resumes,
  ])

  useEffect(() => {
    if (loading || aiBrief || aiBriefLoading) return
    if (data.resumes === 0 && data.applications === 0) return
    void generateAIBrief()
  }, [aiBrief, aiBriefLoading, data.applications, data.resumes, generateAIBrief, loading])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-blue-500/10 text-blue-500'
      case 'screening': return 'bg-saffron-500/10 text-saffron-500'
      case 'interview': return 'bg-purple-500/10 text-purple-500'
      case 'offer': return 'bg-green-500/10 text-green-500'
      case 'rejected': return 'bg-red-500/10 text-red-500'
      default: return 'bg-gray-500/10 text-gray-500'
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const stats = [
    { 
      label: "Resumes", 
      value: data.resumes.toString(), 
      href: "/app/resumes",
      icon: FileText,
      color: "saffron"
    },
    { 
      label: "Applications", 
      value: data.applications.toString(), 
      href: "/app/applications",
      icon: Briefcase,
      color: "navy"
    },
    { 
      label: "Interviews", 
      value: data.interviews.toString(), 
      href: "/app/applications",
      icon: MessageSquare,
      color: "purple"
    },
    { 
      label: "Goals", 
      value: `${data.goals.completed}/${data.goals.total}`, 
      href: "/app/goals",
      icon: Target,
      color: "green"
    },
  ]

  const suggestedSteps = [
    data.forecast.projectedOffers8w < 1 && data.applications > 0 && {
      label: "Run forecast and increase weekly target",
      href: "/app/forecast",
      priority: 0,
    },
    data.resumes === 0 && { label: "Create your first resume", href: "/app/resumes/new", priority: 1 },
    data.applicationsThisWeek < 3 && data.applications > 0 && { label: "Apply to 2–3 more jobs this week", href: "/app/applications", priority: 2 },
    data.goals.total === 0 && { label: "Set your first career goal", href: "/app/goals", priority: 3 },
    data.resumes > 0 && { label: "Practice interview questions", href: "/app/interviews", priority: 4 },
    data.applications === 0 && data.resumes > 0 && { label: "Track your first application", href: "/app/applications", priority: 5 },
  ].filter(Boolean) as { label: string; href: string; priority: number }[]
  const topSuggestions = suggestedSteps.slice(0, 4)
  const forecastHealth = useMemo(() => {
    if (data.forecast.projectedOffers8w >= 3) return { label: "Strong", color: "text-green-600" }
    if (data.forecast.projectedOffers8w >= 1) return { label: "On Track", color: "text-saffron-600" }
    return { label: "Needs Focus", color: "text-red-500" }
  }, [data.forecast.projectedOffers8w])
  const primaryFocus = topSuggestions[0]
  const operatingJourney = [
    {
      title: "1. AI Studio",
      detail: "Generate readiness and transformation plans.",
      href: "/app/ai-studio",
      icon: Sparkles,
    },
    {
      title: "2. Horizons",
      detail: "Scale features across H1-H3 expansion lanes.",
      href: "/app/horizons",
      icon: Globe2,
    },
    {
      title: "3. Production",
      detail: "Create tailored resumes and applications.",
      href: "/app/resumes",
      icon: Briefcase,
    },
    {
      title: "4. Control Tower",
      detail: "Clear overdue, stale, and no-action risks.",
      href: "/app/control-tower",
      icon: ShieldCheck,
    },
    {
      title: "5. Forecast",
      detail: "Model outcomes and lock weekly targets.",
      href: "/app/forecast",
      icon: LineChart,
    },
    {
      title: "6. Program Office",
      detail: "Run governance reviews and KPI ownership.",
      href: "/app/program-office",
      icon: Building2,
    },
    {
      title: "7. Playbook",
      detail: "Use role-based runbooks for consistency.",
      href: "/app/help",
      icon: BookOpenCheck,
    },
  ]

  const kpiWallMetrics = useMemo<KpiMetric[]>(() => {
    const responseRate = data.applications > 0 ? Math.round((data.interviews / data.applications) * 100) : 0
    const goalCompletion = data.goals.total > 0 ? Math.round((data.goals.completed / data.goals.total) * 100) : 0
    return [
      { id: "applications", label: "Pipeline Volume", value: data.applications, deltaPct: 5.4 },
      { id: "response", label: "Response Rate", value: responseRate, deltaPct: 2.1, unit: "%" },
      { id: "forecast", label: "8w Offer Forecast", value: data.forecast.projectedOffers8w, deltaPct: 4.8 },
      { id: "goals", label: "Goal Completion", value: goalCompletion, deltaPct: 1.9, unit: "%" },
    ]
  }, [data.applications, data.forecast.projectedOffers8w, data.goals.completed, data.goals.total, data.interviews])

  const funnelStages = useMemo<FunnelStage[]>(() => {
    const applied = Math.max(data.applications - data.interviews, 0)
    const interview = Math.max(data.interviews, 0)
    const offers = Math.max(data.forecast.projectedOffers8w, 0)
    return [
      { id: "applied", label: "Applied", count: applied, href: "/app/applications" },
      { id: "screening", label: "Screening / Interview", count: interview, href: "/app/interviews" },
      { id: "offer", label: "Offer Track", count: offers, href: "/app/forecast" },
    ]
  }, [data.applications, data.forecast.projectedOffers8w, data.interviews])

  const heatmapValues = useMemo(() => {
    return Array.from({ length: 42 }, (_, index) => {
      const rhythm = Math.round(Math.abs(Math.sin((index + 1) / 5)) * 4)
      const recencyBoost = index > 34 ? Math.max(0, Math.round(data.applicationsThisWeek / 2)) : 0
      const conversionBoost = index % 7 === 0 ? Math.max(0, Math.round(data.interviews / 2)) : 0
      return Math.max(0, rhythm + recencyBoost + conversionBoost)
    })
  }, [data.applicationsThisWeek, data.interviews])

  const commandGraphNodes = [
    { id: "dashboard", label: "Dashboard", href: "/app/dashboard", x: 50, y: 16 },
    { id: "ai-studio", label: "AI Studio", href: "/app/ai-studio", x: 20, y: 34 },
    { id: "resumes", label: "Resumes", href: "/app/resumes", x: 35, y: 60 },
    { id: "applications", label: "Applications", href: "/app/applications", x: 62, y: 56 },
    { id: "interviews", label: "Interviews", href: "/app/interviews", x: 78, y: 36 },
    { id: "forecast", label: "Forecast", href: "/app/forecast", x: 50, y: 84 },
  ]

  const commandGraphEdges = [
    { from: "dashboard", to: "ai-studio" },
    { from: "dashboard", to: "resumes" },
    { from: "dashboard", to: "applications" },
    { from: "applications", to: "interviews" },
    { from: "interviews", to: "forecast" },
    { from: "resumes", to: "applications" },
    { from: "ai-studio", to: "forecast" },
  ]

  const sankeyNodes = [
    { id: "sources", label: "Job Sources", column: 0 },
    { id: "applications", label: "Applications", column: 1 },
    { id: "screening", label: "Screening", column: 2 },
    { id: "interviews", label: "Interviews", column: 2 },
    { id: "offers", label: "Offers", column: 3 },
  ]

  const sankeyLinks = [
    { from: "sources", to: "applications", value: Math.max(8, data.applications + 6) },
    { from: "applications", to: "screening", value: Math.max(4, Math.round(data.applications * 0.44)) },
    { from: "applications", to: "interviews", value: Math.max(2, data.interviews) },
    { from: "screening", to: "offers", value: Math.max(1, Math.round(data.forecast.projectedOffers8w * 0.7)) },
    { from: "interviews", to: "offers", value: Math.max(1, data.forecast.projectedOffers8w) },
  ]

  const replayFrames = [
    {
      label: "Week 1",
      stages: [
        { label: "Applied", value: Math.max(3, Math.round(data.applications * 0.35)) },
        { label: "Screening", value: Math.max(2, Math.round(data.interviews * 0.6)) },
        { label: "Interview", value: Math.max(1, Math.round(data.interviews * 0.4)) },
        { label: "Offer", value: Math.max(0, Math.round(data.forecast.projectedOffers8w * 0.2)) },
      ],
    },
    {
      label: "Week 2",
      stages: [
        { label: "Applied", value: Math.max(4, Math.round(data.applications * 0.52)) },
        { label: "Screening", value: Math.max(2, Math.round(data.interviews * 0.7)) },
        { label: "Interview", value: Math.max(1, Math.round(data.interviews * 0.7)) },
        { label: "Offer", value: Math.max(1, Math.round(data.forecast.projectedOffers8w * 0.45)) },
      ],
    },
    {
      label: "Week 3",
      stages: [
        { label: "Applied", value: Math.max(5, Math.round(data.applications * 0.68)) },
        { label: "Screening", value: Math.max(2, Math.round(data.interviews * 0.9)) },
        { label: "Interview", value: Math.max(1, data.interviews) },
        { label: "Offer", value: Math.max(1, Math.round(data.forecast.projectedOffers8w * 0.7)) },
      ],
    },
    {
      label: "Week 4",
      stages: [
        { label: "Applied", value: Math.max(6, data.applications) },
        { label: "Screening", value: Math.max(3, Math.round(data.interviews * 1.05)) },
        { label: "Interview", value: Math.max(2, Math.round(data.interviews * 1.2)) },
        { label: "Offer", value: Math.max(1, data.forecast.projectedOffers8w) },
      ],
    },
  ]

  const geoPoints = [
    { id: "sf", city: "San Francisco", x: 16, y: 42, roles: Math.max(8, data.applications + 3), responseRate: Math.max(12, data.interviews * 8), salaryBand: "$165k-$230k" },
    { id: "nyc", city: "New York", x: 74, y: 38, roles: Math.max(7, data.applications + 1), responseRate: Math.max(10, data.interviews * 7), salaryBand: "$150k-$220k" },
    { id: "austin", city: "Austin", x: 52, y: 58, roles: Math.max(4, Math.round(data.applications * 0.7)), responseRate: Math.max(8, data.interviews * 6), salaryBand: "$135k-$195k" },
    { id: "seattle", city: "Seattle", x: 19, y: 24, roles: Math.max(5, Math.round(data.applications * 0.8)), responseRate: Math.max(9, data.interviews * 7), salaryBand: "$155k-$215k" },
    { id: "remote", city: "Remote US", x: 44, y: 36, roles: Math.max(10, data.applications + 5), responseRate: Math.max(15, data.interviews * 9), salaryBand: "$140k-$205k" },
  ]

  const skillRows = ["System Design", "Leadership", "Execution", "Product Sense", "Communication"]
  const skillRoles = ["Staff Eng", "PM", "Analytics", "Platform"]
  const skillMatrix = [
    [82, 66, 58, 74],
    [70, 78, 61, 69],
    [88, 72, 76, 84],
    [63, 81, 69, 60],
    [76, 74, 71, 73],
  ]

  const storyboardSlides = [
    {
      id: "story-1",
      title: "Pipeline has steady top-funnel volume with moderate conversion.",
      summary: "Prioritize follow-up cadence and role-fit targeting to lift interview share this week.",
      kpi: `${data.applications} Active`,
    },
    {
      id: "story-2",
      title: "Forecast shows realistic offer upside with quality improvements.",
      summary: `Current 8-week projection is ${data.forecast.projectedOffers8w} offers with weekly target ${data.forecast.weeklyTarget}.`,
      kpi: `${data.forecast.projectedOffers8w} Offers`,
    },
    {
      id: "story-3",
      title: "Execution focus should shift to stale-risk cleanup and interview prep.",
      summary: "Run a 48-hour recovery sprint and 7-day interview cadence to protect momentum.",
      kpi: `${data.interviews} Interviews`,
    },
  ]

  const journeySteps = operatingJourney.slice(0, 5).map((item, index) => ({
    id: `journey-${index + 1}`,
    title: item.title,
    detail: item.detail,
    href: item.href,
    progress: Math.max(18, Math.min(100, 28 + index * 16 + (data.applicationsThisWeek > 0 ? 8 : 0))),
  }))

  const cohortItems = [
    {
      id: "cohort-a",
      name: "Template Cohort A",
      metrics: [
        { label: "Response Rate", value: Math.max(8, Math.round((data.interviews / Math.max(1, data.applications)) * 100)) },
        { label: "Interview Rate", value: Math.max(6, Math.round((data.interviews / Math.max(1, data.applications)) * 85)) },
        { label: "Offer Projection", value: Math.max(1, data.forecast.projectedOffers8w) },
      ],
    },
    {
      id: "cohort-b",
      name: "Template Cohort B",
      metrics: [
        { label: "Response Rate", value: Math.max(10, Math.round((data.interviews / Math.max(1, data.applications)) * 100) + 5) },
        { label: "Interview Rate", value: Math.max(8, Math.round((data.interviews / Math.max(1, data.applications)) * 82) + 4) },
        { label: "Offer Projection", value: Math.max(1, data.forecast.projectedOffers8w + 1) },
      ],
    },
    {
      id: "cohort-c",
      name: "Template Cohort C",
      metrics: [
        { label: "Response Rate", value: Math.max(7, Math.round((data.interviews / Math.max(1, data.applications)) * 100) - 3) },
        { label: "Interview Rate", value: Math.max(6, Math.round((data.interviews / Math.max(1, data.applications)) * 78)) },
        { label: "Offer Projection", value: Math.max(1, data.forecast.projectedOffers8w) },
      ],
    },
  ]

  const promptFlowNodes = aiBrief?.actionPlan?.slice(0, 3).map((item, index) => ({
    id: `prompt-${index}`,
    prompt: item.title,
    result: item.detail,
    score: Math.max(55, Math.min(99, Math.round((aiBrief.confidence * 100) - index * 6))),
  })) || [
    {
      id: "prompt-1",
      prompt: "Prioritize roles by conversion potential.",
      result: "Focused on top-fit roles and increased response quality.",
      score: 86,
    },
    {
      id: "prompt-2",
      prompt: "Build a 7-day follow-up plan.",
      result: "Cleared stale records and improved stage progression.",
      score: 81,
    },
    {
      id: "prompt-3",
      prompt: "Generate role-specific resume actions.",
      result: "Raised ATS alignment and interview readiness.",
      score: 84,
    },
  ]

  const playbackMarkers = [
    { id: "marker-1", label: "Strong intro", second: 34, intensity: 0.5 },
    { id: "marker-2", label: "Filler spike", second: 112, intensity: 0.9 },
    { id: "marker-3", label: "Metric proof", second: 168, intensity: 0.75 },
    { id: "marker-4", label: "Clear close", second: 228, intensity: 0.6 },
  ]

  const treemapItems = useMemo(() => {
    const byCompany = new Map<string, number>()
    for (const app of data.recentApplications) {
      const name = app.company || "Unknown"
      byCompany.set(name, (byCompany.get(name) || 0) + 1)
    }
    const items = Array.from(byCompany.entries()).map(([name, count], index) => ({
      id: `tree-${index}`,
      label: name,
      value: Math.max(8, count * 14),
      subtitle: "Opportunity cluster",
    }))
    if (items.length === 0) {
      return [
        { id: "tree-default-1", label: "High Fit Roles", value: 26, subtitle: "Best conversion upside" },
        { id: "tree-default-2", label: "Stretch Roles", value: 15, subtitle: "Long-term upside" },
        { id: "tree-default-3", label: "Fast Response Roles", value: 19, subtitle: "Quick interview loops" },
      ]
    }
    return items.slice(0, 6)
  }, [data.recentApplications])

  const companySignals = useMemo(() => {
    if (data.recentApplications.length === 0) {
      return [
        { id: "c-1", name: "High Growth Co", hiringSignal: 78, responseVelocity: 64, freshness: 72 },
        { id: "c-2", name: "Enterprise Co", hiringSignal: 71, responseVelocity: 59, freshness: 68 },
        { id: "c-3", name: "Platform Co", hiringSignal: 84, responseVelocity: 70, freshness: 75 },
      ]
    }
    return data.recentApplications.slice(0, 6).map((app, index) => ({
      id: `sig-${app.id}`,
      name: app.company,
      hiringSignal: Math.max(45, 72 - index * 4 + (data.applicationsThisWeek > 0 ? 6 : 0)),
      responseVelocity: Math.max(38, 63 - index * 3),
      freshness: Math.max(42, 76 - index * 4),
    }))
  }, [data.applicationsThisWeek, data.recentApplications])

  const riskAxes = [
    { label: "Volume Risk", value: Math.max(10, 80 - data.applicationsThisWeek * 7) },
    { label: "Follow-up Risk", value: Math.max(8, 74 - data.interviews * 3) },
    { label: "Quality Risk", value: Math.max(10, 68 - data.resumes * 4) },
    { label: "Interview Risk", value: Math.max(10, 72 - data.interviews * 6) },
    { label: "Offer Risk", value: Math.max(6, 64 - data.forecast.projectedOffers8w * 10) },
  ]

  const stageHealth = [
    {
      label: "Applied",
      score: Math.max(20, Math.min(98, Math.round((data.applicationsThisWeek / Math.max(1, data.forecast.weeklyTarget)) * 100))),
      detail: "Current weekly volume",
    },
    {
      label: "Screening",
      score: Math.max(24, Math.min(98, Math.round((data.interviews / Math.max(1, data.applications)) * 100) + 20)),
      detail: "Response conversion",
    },
    {
      label: "Interview",
      score: Math.max(18, Math.min(98, Math.round((data.interviews / Math.max(1, data.applications)) * 100) + 26)),
      detail: "Interview readiness",
    },
    {
      label: "Offer",
      score: Math.max(15, Math.min(98, data.forecast.projectedOffers8w * 18)),
      detail: "Offer probability",
    },
  ]

  const templateGallery = [
    { id: "tpl-1", name: "Impact Narrative", category: "Resume", conversionLift: 18, atsLift: 12 },
    { id: "tpl-2", name: "Concise Operator", category: "Resume", conversionLift: 14, atsLift: 10 },
    { id: "tpl-3", name: "Follow-up Precision", category: "Email", conversionLift: 16, atsLift: 0 },
    { id: "tpl-4", name: "Leadership Storyline", category: "Resume", conversionLift: 11, atsLift: 9 },
    { id: "tpl-5", name: "Decision Memo Cover", category: "Cover Letter", conversionLift: 13, atsLift: 0 },
    { id: "tpl-6", name: "Technical Proof Stack", category: "Resume", conversionLift: 17, atsLift: 14 },
  ]

  return (
    <div className="section-shell space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div className={`transition-all duration-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-1">
              {getGreeting()}, {data.userName}! 👋
            </h1>
            <p className="text-muted-foreground">
              {data.applications === 0 
                ? "Ready to start your job search journey?"
                : `You have ${data.applications} active application${data.applications !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowStoryboard((value) => !value)}
              className="btn-outline"
            >
              {showStoryboard ? "Hide Storyboard" : "Storyboard Mode"}
            </button>
            <Link href="/app/horizons" className="btn-outline">
              <Globe2 className="w-4 h-4" />
              Horizons
            </Link>
            <Link href="/app/forecast" className="btn-outline">
              <LineChart className="w-4 h-4" />
              Forecast
            </Link>
            <Link href="/app/resumes/new" className="btn-saffron">
              <Plus className="w-4 h-4" />
              New Resume
            </Link>
          </div>
        </div>
      </div>

      <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 transition-all duration-500 delay-75 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <Link href="/app/control-tower" className="card-interactive p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Control Tower</p>
              <p className="text-xs text-muted-foreground mt-1">SLA and follow-up governance</p>
              <p className="text-xs mt-2 text-muted-foreground">
                {data.applications > 0 ? "Active and ready for execution review." : "Add applications to activate insights."}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-saffron-500/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-saffron-600" />
            </div>
          </div>
        </Link>
        <Link href="/app/program-office" className="card-interactive p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Program Office</p>
              <p className="text-xs text-muted-foreground mt-1">Workstream and governance cadence</p>
              <p className="text-xs mt-2 text-muted-foreground">
                {data.goals.total > 0 ? `${data.goals.completed}/${data.goals.total} goals in flight.` : "Create goals to unlock program governance."}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-navy-500/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-navy-600" />
            </div>
          </div>
        </Link>
        <Link href="/app/forecast" className="card-interactive p-4 sm:p-5 sm:col-span-2 xl:col-span-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Forecast Planner</p>
              <p className="text-xs text-muted-foreground mt-1">Conversion and capacity modeling</p>
              <p className={`text-xs mt-2 ${forecastHealth.color}`}>
                {data.forecast.projectedOffers8w} projected offers in 8 weeks.
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <LineChart className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </Link>
        <Link href="/app/help" className="card-interactive p-4 sm:p-5 sm:col-span-2 xl:col-span-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Operating Playbook</p>
              <p className="text-xs text-muted-foreground mt-1">Complete workflow and best-practice guide</p>
              <p className="text-xs mt-2 text-muted-foreground">
                Use launch checklist, cadence plan, and enterprise flow map.
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <BookOpenCheck className="w-4 h-4 text-purple-600" />
            </div>
          </div>
        </Link>
      </div>

      <div className={`grid gap-4 xl:grid-cols-2 transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <LiveKpiWall metrics={kpiWallMetrics} />
        <InteractiveFunnel stages={funnelStages} />
      </div>

      <div className={`grid gap-4 xl:grid-cols-2 transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <TimelineHeatmap values={heatmapValues} />
        <WorkspaceCommandGraph nodes={commandGraphNodes} edges={commandGraphEdges} />
      </div>

      {showStoryboard && (
        <div className={`transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <ExecutiveStoryboard slides={storyboardSlides} />
        </div>
      )}

      <div className={`grid gap-4 xl:grid-cols-2 transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <ConversionSankeyChart nodes={sankeyNodes} links={sankeyLinks} />
        <PipelineReplay frames={replayFrames} />
      </div>

      <div className={`grid gap-4 xl:grid-cols-2 transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <GeoOpportunityMap points={geoPoints} />
        <SkillRoleFitMatrix3D skills={skillRows} roles={skillRoles} values={skillMatrix} />
      </div>

      <div className={`transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <CommandCanvas nodes={commandGraphNodes} edges={commandGraphEdges} />
      </div>

      <div className={`grid gap-4 xl:grid-cols-2 transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <JourneyMapUI steps={journeySteps} />
        <CohortCompareView cohorts={cohortItems} />
      </div>

      <div className={`grid gap-4 xl:grid-cols-2 transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <AIPromptResultFlow nodes={promptFlowNodes} />
        <InterviewPlaybackTimeline durationSec={300} markers={playbackMarkers} />
      </div>

      <div className={`grid gap-4 xl:grid-cols-2 transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <OpportunityTreemap items={treemapItems} />
        <CompanySignalCards companies={companySignals} />
      </div>

      <div className={`grid gap-4 xl:grid-cols-2 transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <RiskRadarOverlay axes={riskAxes} />
        <StageHealthGauges stages={stageHealth} />
      </div>

      <div className={`grid gap-4 xl:grid-cols-2 transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <TemplateImpactGallery templates={templateGallery} />
        <ThemeStudioLivePreview />
      </div>

      {/* This week + Stats */}
      <div className={`grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6 transition-all duration-500 delay-100 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="card-interactive p-5 relative overflow-hidden group bg-gradient-to-br from-saffron-500/10 to-gold-500/5 border border-saffron-500/20">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-saffron-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-saffron-500" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-saffron-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-2xl lg:text-3xl font-bold mb-1">{data.applicationsThisWeek}</div>
            <div className="text-sm text-muted-foreground">Applications this week</div>
            {data.applicationsThisWeek < 3 && data.applications > 0 && (
              <p className="text-xs text-saffron-600 mt-2">Tip: 5–10/week boosts odds</p>
            )}
          </div>
        </div>
        {stats.map((stat, i) => (
          <Link 
            key={i} 
            href={stat.href}
            className="card-interactive p-5 relative overflow-hidden group"
          >
            <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl transition-opacity opacity-0 group-hover:opacity-100 ${
              stat.color === 'saffron' ? 'bg-saffron-500/20' : 
              stat.color === 'navy' ? 'bg-navy-500/10' :
              stat.color === 'purple' ? 'bg-purple-500/10' : 'bg-green-500/10'
            }`} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  stat.color === 'saffron' ? 'bg-saffron-500/10' : 
                  stat.color === 'navy' ? 'bg-navy-500/10' :
                  stat.color === 'purple' ? 'bg-purple-500/10' : 'bg-green-500/10'
                }`}>
                  <stat.icon className={`w-5 h-5 ${
                    stat.color === 'saffron' ? 'text-saffron-500' : 
                    stat.color === 'navy' ? 'text-navy-600' :
                    stat.color === 'purple' ? 'text-purple-500' : 'text-green-500'
                  }`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl lg:text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className={`card-elevated p-5 transition-all duration-500 delay-150 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LineChart className="w-4 h-4 text-saffron-500" />
              <h2 className="font-semibold">8-Week Enterprise Forecast</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Weekly target {data.forecast.weeklyTarget} applications. Current projection: {data.forecast.projectedInterviews8w} interviews and {data.forecast.projectedOffers8w} offers.
            </p>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground mr-2">Pipeline confidence:</span>
            <span className={`font-semibold ${forecastHealth.color}`}>{forecastHealth.label}</span>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full ${
              data.forecast.projectedOffers8w >= 3 ? 'bg-green-500' : data.forecast.projectedOffers8w >= 1 ? 'bg-saffron-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, (data.forecast.projectedOffers8w / 4) * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/app/forecast" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline">
            Open forecast planner
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link href="/app/reports" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline">
            Review executive report
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className={`card-elevated p-5 transition-all duration-500 delay-200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-4">
          <div>
            <h2 className="font-semibold">AI Operating Journey</h2>
            <p className="text-sm text-muted-foreground">Follow this sequence to use the full Climb workflow end-to-end.</p>
          </div>
          <Link href="/app/help" className="text-sm text-saffron-600 hover:underline inline-flex items-center gap-1">
            Open full playbook
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {operatingJourney.map((step) => (
            <Link key={step.title} href={step.href} className="rounded-xl border border-border p-3 hover:bg-secondary/40 transition-colors">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-500/10 text-saffron-600">
                <step.icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium mt-2">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{step.detail}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className={`transition-all duration-500 [transition-delay:220ms] ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <AIMissionConsole
          surface="dashboard"
          title="AI Mission Console"
          description="Run high-impact daily missions with strategy, execution, or coaching mode."
          missions={[
            {
              id: "dashboard-brief",
              title: "Daily Executive Brief",
              objective: "Start the day with clear priorities and KPI focus.",
              prompt: "Generate my daily executive brief with top 3 actions and expected impact.",
              href: "/app/dashboard",
              priority: "high",
            },
            {
              id: "risk-burndown",
              title: "Risk Burn-down",
              objective: "Clear high-risk pipeline blockers in the next 48 hours.",
              prompt: "Create a 2-day risk burn-down plan for overdue, stale, and no-action records.",
              href: "/app/control-tower",
              priority: "high",
            },
            {
              id: "forecast-lift",
              title: "Forecast Lift Plan",
              objective: "Improve projected offers over the next 8 weeks.",
              prompt: "Build a realistic plan to improve forecasted offers using volume and quality lift levers.",
              href: "/app/forecast",
              priority: "medium",
            },
            {
              id: "quality-sprint",
              title: "Quality Sprint",
              objective: "Raise ATS and interview conversion consistency this week.",
              prompt: "Create a weekly quality sprint across resumes and interview practice.",
              href: "/app/resumes",
              priority: "medium",
            },
          ]}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className={`lg:col-span-2 transition-all duration-500 delay-200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="card-elevated">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Recent Applications</h2>
                <p className="text-sm text-muted-foreground">Your latest job applications</p>
              </div>
              <Link href="/app/applications" className="text-sm text-saffron-500 hover:text-saffron-600 flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4">
                    <div className="w-10 h-10 bg-secondary rounded-xl" />
                    <div className="flex-1">
                      <div className="h-4 bg-secondary rounded w-1/3 mb-2" />
                      <div className="h-3 bg-secondary rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : data.recentApplications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-saffron-500/10 flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-6 h-6 text-saffron-500" />
                </div>
                <h3 className="font-medium mb-1">No applications yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Start tracking your job applications</p>
                <Link href="/app/applications" className="btn-saffron text-sm">
                  <Plus className="w-4 h-4" />
                  Add Application
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentApplications.map((app) => (
                  <Link 
                    key={app.id} 
                    href="/app/applications"
                    className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-navy-500/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-navy-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{app.position}</div>
                      <div className="text-sm text-muted-foreground truncate">{app.company}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Enterprise Pulse */}
        <div className={`transition-all duration-500 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="card-elevated">
            <div className="p-5 border-b border-border">
              <h2 className="font-semibold">Enterprise Pulse</h2>
              <p className="text-sm text-muted-foreground">Current operating signals and focus</p>
            </div>
            <div className="p-4 space-y-2">
              <Link href="/app/forecast" className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-navy-500/10">
                  <LineChart className="w-5 h-5 text-navy-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Weekly Target Progress</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {data.applicationsThisWeek}/{data.forecast.weeklyTarget} applications this week
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>

              <Link href="/app/control-tower" className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-saffron-500/10">
                  <Activity className="w-5 h-5 text-saffron-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Offer Signal</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {data.forecast.projectedOffers8w} projected offers in 8 weeks
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>

              <Link href={primaryFocus?.href || "/app/program-office"} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-500/10">
                  <Zap className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Primary Focus</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {primaryFocus?.label || "Maintain weekly execution cadence"}
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            </div>
          </div>

          {/* Suggested next steps */}
          {topSuggestions.length > 0 && (
            <div className="mt-6 card-elevated">
              <div className="p-5 border-b border-border">
                <h2 className="font-semibold">Suggested next steps</h2>
                <p className="text-sm text-muted-foreground">Prioritized for your progress</p>
              </div>
              <div className="p-4 space-y-2">
                {topSuggestions.map((step, i) => (
                  <Link key={i} href={step.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all group">
                    <span className="w-6 h-6 rounded-full bg-saffron-500/20 text-saffron-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm font-medium flex-1">{step.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* AI Executive Brief */}
          <div className="mt-6 relative overflow-hidden rounded-2xl border border-saffron-500/25">
            <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900" />
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-saffron-500/20 rounded-full blur-3xl" />
            
            <div className="relative p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-saffron-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-saffron-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">AI Executive Brief</p>
                    <p className="text-xs text-white/60">Dashboard strategy guidance</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { void generateAIBrief() }}
                  disabled={aiBriefLoading}
                  className="inline-flex items-center gap-1.5 text-xs rounded-full border border-white/15 px-2.5 py-1 text-white/80 hover:text-white hover:border-saffron-400/50 transition-colors disabled:opacity-60"
                >
                  {aiBriefLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {aiBrief ? 'Refresh' : 'Generate'}
                </button>
              </div>

              {aiBriefError && (
                <p className="text-xs text-red-300">{aiBriefError}</p>
              )}

              {!aiBrief ? (
                <p className="text-sm text-white/80">
                  Generate an AI executive brief to get prioritized actions across control tower, forecast, and governance workflows.
                </p>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-wide text-saffron-300">{aiBrief.summary}</p>
                  <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{aiBrief.answer}</p>
                  <div className="space-y-2">
                    {aiBrief.actionPlan.slice(0, 3).map((action, index) => (
                      <Link
                        key={`${action.title}-${index}`}
                        href={String(action.href || '/app/dashboard')}
                        className="block rounded-lg border border-white/15 bg-white/5 p-2.5 hover:border-saffron-400/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="inline-flex items-center gap-2">
                              <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                action.priority === 'high'
                                  ? 'bg-red-500/20 text-red-200'
                                  : action.priority === 'medium'
                                  ? 'bg-saffron-500/20 text-saffron-200'
                                  : 'bg-blue-500/20 text-blue-200'
                              }`}>
                                {action.priority}
                              </span>
                              <p className="text-xs font-medium text-white truncate">{action.title}</p>
                            </div>
                            <p className="text-xs text-white/70 mt-1">{action.detail}</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-white/60 shrink-0 mt-0.5" />
                        </div>
                      </Link>
                    ))}
                  </div>
                  {aiBrief.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {aiBrief.quickReplies.slice(0, 3).map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => { void generateAIBrief(prompt) }}
                          className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/75 hover:text-white hover:border-saffron-400/40 transition-colors"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-white/55">
                    Confidence {Math.round(Math.max(0, Math.min(1, aiBrief.confidence)) * 100)}%
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Resumes */}
      {data.recentResumes.length > 0 && (
        <div className={`transition-all duration-500 delay-400 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="card-elevated">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Recent Resumes</h2>
                <p className="text-sm text-muted-foreground">Your latest resume versions</p>
              </div>
              <Link href="/app/resumes" className="text-sm text-saffron-500 hover:text-saffron-600 flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.recentResumes.map((resume) => (
                <Link
                  key={resume.id}
                  href={`/app/resumes/${resume.id}`}
                  className="p-4 rounded-xl border border-border hover:border-saffron-500/30 hover:bg-secondary/30 transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-saffron-500" />
                    <span className="font-medium truncate">{resume.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Updated {new Date(resume.updated_at).toLocaleDateString()}</span>
                    {resume.ats_score && (
                      <span className={resume.ats_score >= 80 ? 'text-green-500' : 'text-saffron-500'}>
                        ATS: {resume.ats_score}%
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom CTA - Only show if user has no data */}
      {!loading && data.resumes === 0 && data.applications === 0 && (
        <div className={`transition-all duration-500 delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-saffron-500 via-saffron-400 to-gold-400" />
            <div className="absolute inset-0 bg-grid opacity-10" />
            
            <div className="relative p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <LogoMark size={48} />
                <div>
                  <h3 className="text-lg font-semibold text-navy-900">Ready to land your next role?</h3>
                  <p className="text-navy-900/70">Let AI optimize your resume for better results.</p>
                </div>
              </div>
              <Link href="/app/resumes/new" className="btn-primary whitespace-nowrap">
                <Zap className="w-4 h-4" />
                Create Your First Resume
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
