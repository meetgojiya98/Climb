"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { fetchApplicationsCompatible } from "@/lib/supabase/application-compat"
import { LogoMark } from "@/components/ui/logo"
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

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
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

          {/* AI Tip Card */}
          <div className="mt-6 relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900" />
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-saffron-500/20 rounded-full blur-3xl" />
            
            <div className="relative p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-saffron-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-saffron-400" />
                </div>
                <span className="text-sm font-medium text-white">AI Tip</span>
              </div>
              <p className="text-sm text-white/80 mb-4">
                {data.resumes === 0 
                  ? "Create your first resume to get AI-powered optimization suggestions."
                  : data.applications === 0
                    ? "Start tracking your applications to see insights about your job search."
                    : "Tailor your resume for each application to improve your chances."
                }
              </p>
              <Link 
                href={data.resumes === 0 ? "/app/resumes/new" : "/app/resumes"} 
                className="inline-flex items-center gap-2 text-sm font-medium text-saffron-400 hover:text-saffron-300 transition-colors"
              >
                {data.resumes === 0 ? "Create Resume" : "View Resumes"} <ArrowRight className="w-4 h-4" />
              </Link>
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
