"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { AIOpsBrief } from "@/components/app/ai-ops-brief"
import { AIMissionConsole } from "@/components/app/ai-mission-console"
import { KeywordRadarChart } from "@/components/app/graphical-ui"
import { 
  Plus, 
  FileText, 
  Trash2, 
  Eye,
  Bot,
  RefreshCw,
  ArrowRight,
  ClipboardCheck,
  Gauge,
  Sparkles,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  Zap,
  Copy,
} from "lucide-react"

interface Resume {
  id: string
  title: string
  target_role: string | null
  ats_score: number | null
  status: string
  created_at: string
  updated_at: string
}

type PortfolioPriority = "quality" | "coverage" | "targeting" | "conversion"

interface ResumePortfolioPlan {
  overview: string
  northStar: {
    goal: string
    target: string
    metric: string
  }
  tracks: Array<{
    title: string
    objective: string
    targetRoles: string[]
    resumeMoves: string[]
    proofSignals: string[]
    moduleHref: string
  }>
  kpis: Array<{
    name: string
    target: string
    current: string
    owner: string
    why: string
  }>
  weeklyCadence: Array<{
    day: string
    focus: string
    action: string
    moduleHref: string
  }>
  aiPrompts: string[]
  confidence: number
}

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [portfolioObjective, setPortfolioObjective] = useState(
    "Build an enterprise resume portfolio that improves role-fit quality and conversion outcomes."
  )
  const [portfolioTargetRole, setPortfolioTargetRole] = useState("")
  const [portfolioPriority, setPortfolioPriority] = useState<PortfolioPriority>("quality")
  const [portfolioHorizon, setPortfolioHorizon] = useState(8)
  const [portfolioHours, setPortfolioHours] = useState(8)
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [portfolioError, setPortfolioError] = useState<string | null>(null)
  const [portfolioPlan, setPortfolioPlan] = useState<ResumePortfolioPlan | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)

  useEffect(() => {
    fetchResumes()
  }, [])

  const fetchResumes = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('resumes').select('*').eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      if (error) throw error
      setResumes(data || [])
    } catch (error) {
      console.error('Error fetching resumes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('resumes').delete().eq('id', id)
      if (error) throw error
      setResumes(resumes.filter(r => r.id !== id))
      setDeleteId(null)
    } catch (error) {
      console.error('Error deleting resume:', error)
    }
  }

  const handleDuplicate = async (resume: Resume) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('resumes').insert({
        user_id: user.id,
        title: `${resume.title} (Copy)`,
        target_role: resume.target_role,
        status: 'draft',
      })
      if (error) throw error
      await fetchResumes()
    } catch (error) {
      console.error('Error duplicating resume:', error)
    }
  }

  const filteredResumes = resumes.filter(resume =>
    resume.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (resume.target_role && resume.target_role.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const completeCount = resumes.filter((resume) => resume.status === "complete").length
  const draftCount = resumes.filter((resume) => resume.status === "draft").length
  const atsSamples = resumes.filter((resume) => resume.ats_score !== null)
  const avgATS = atsSamples.length > 0
    ? Math.round(atsSamples.reduce((sum, resume) => sum + (resume.ats_score || 0), 0) / atsSamples.length)
    : null
  const lowAtsCount = resumes.filter((resume) => Number.isFinite(resume.ats_score) && Number(resume.ats_score) < 75).length
  const roleCoverage = new Set(
    resumes
      .map((resume) => String(resume.target_role || "").trim().toLowerCase())
      .filter(Boolean)
  ).size

  const generatePortfolioPlan = async () => {
    if (portfolioLoading) return
    setPortfolioLoading(true)
    setPortfolioError(null)

    try {
      const response = await fetch("/api/agent/resume-portfolio-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective: portfolioObjective,
          targetRole: portfolioTargetRole || undefined,
          priority: portfolioPriority,
          horizonWeeks: portfolioHorizon,
          weeklyHours: portfolioHours,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Unable to generate resume portfolio plan")
      }

      const plan = data?.plan || {}
      setPortfolioPlan({
        overview: String(plan?.overview || ""),
        northStar: {
          goal: String(plan?.northStar?.goal || ""),
          target: String(plan?.northStar?.target || ""),
          metric: String(plan?.northStar?.metric || ""),
        },
        tracks: Array.isArray(plan?.tracks) ? plan.tracks : [],
        kpis: Array.isArray(plan?.kpis) ? plan.kpis : [],
        weeklyCadence: Array.isArray(plan?.weeklyCadence) ? plan.weeklyCadence : [],
        aiPrompts: Array.isArray(plan?.aiPrompts) ? plan.aiPrompts : [],
        confidence: Number(plan?.confidence || 0.5),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Resume portfolio plan failed"
      setPortfolioError(message)
    } finally {
      setPortfolioLoading(false)
    }
  }

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedPrompt(prompt)
      setTimeout(() => setCopiedPrompt(null), 1200)
    } catch {
      setCopiedPrompt(null)
    }
  }

  const aiOpsPrompt = [
    "Generate an enterprise resume-operations brief.",
    `Total resumes: ${resumes.length}. Completed: ${completeCount}. Drafts: ${draftCount}.`,
    `Average ATS: ${avgATS === null ? "not available" : `${avgATS}%`}. Low ATS resumes: ${lowAtsCount}.`,
    `Role coverage across resume target roles: ${roleCoverage}.`,
    `Current portfolio planning priority: ${portfolioPriority}.`,
    "Prioritize actions that improve ATS, role-fit evidence quality, and conversion outcomes.",
  ].join(" ")

  const keywordCoverage = useMemo(() => {
    const qualityBase = avgATS ?? 62
    const coverageBase = Math.min(95, 42 + resumes.length * 8)
    const targetingBase = Math.min(92, 38 + roleCoverage * 12)
    const clarityBase = Math.max(48, qualityBase - 6)
    const jdBoost = portfolioPriority === "targeting" ? 8 : portfolioPriority === "coverage" ? 5 : 3

    return [
      { label: "Core Skills", resume: Math.min(96, qualityBase), jd: Math.min(99, qualityBase + jdBoost + 6) },
      { label: "Domain Terms", resume: Math.min(96, coverageBase), jd: Math.min(99, coverageBase + jdBoost + 10) },
      { label: "Metrics Proof", resume: Math.min(96, clarityBase), jd: Math.min(99, clarityBase + jdBoost + 12) },
      { label: "Leadership", resume: Math.min(96, targetingBase), jd: Math.min(99, targetingBase + jdBoost + 8) },
      { label: "Tooling Stack", resume: Math.min(96, qualityBase - 4), jd: Math.min(99, qualityBase + jdBoost + 7) },
      { label: "Outcome Impact", resume: Math.min(96, qualityBase - 2), jd: Math.min(99, qualityBase + jdBoost + 9) },
    ]
  }, [avgATS, portfolioPriority, resumes.length, roleCoverage])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-green-500 bg-green-500/10'
      case 'draft': return 'text-saffron-500 bg-saffron-500/10'
      default: return 'text-muted-foreground bg-secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete': return CheckCircle
      case 'draft': return Clock
      default: return AlertCircle
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">My Resumes</h1>
          <p className="text-muted-foreground">Create, optimize, and manage ATS-ready resumes</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/resumes/new" className="btn-saffron">
            <Plus className="w-4 h-4" />
            Create Resume
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-saffron-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-saffron-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{resumes.length}</div>
              <div className="text-sm text-muted-foreground">Total Resumes</div>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{completeCount}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{avgATS !== null ? `${avgATS}%` : '—'}</div>
              <div className="text-sm text-muted-foreground">Avg ATS Score</div>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-navy-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-navy-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{draftCount}</div>
              <div className="text-sm text-muted-foreground">Drafts</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Tips Banner */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-navy-900 via-navy-950 to-navy-900" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-saffron-500/20 rounded-full blur-3xl" />
        <div className="relative p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-saffron-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-saffron-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">AI Resume Tips</h3>
              <p className="text-sm text-white/70">Use keywords from the job description. Quantify your achievements with numbers. Keep it to 1–2 pages.</p>
            </div>
          </div>
          <Link href="/app/resumes/new" className="btn-saffron shrink-0">
            <Zap className="w-4 h-4" />
            Create Optimized Resume
          </Link>
        </div>
      </div>

      <AIOpsBrief
        surface="resumes"
        title="AI Resume Operations Strategist"
        description="Generate a prioritized quality and conversion ladder across your resume portfolio."
        defaultPrompt={aiOpsPrompt}
        prompts={[
          "Which resume should I optimize first this week?",
          "Build a 5-day ATS uplift sprint for my portfolio.",
          "How do I map role keywords to stronger proof signals?",
        ]}
      />

      <KeywordRadarChart skills={keywordCoverage} />

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-saffron-500/10 px-3 py-1 text-xs font-medium text-saffron-700">
              <Bot className="h-3.5 w-3.5" />
              AI Resume Portfolio Architect
            </div>
            <h2 className="font-semibold mt-2">Build a multi-track resume strategy with KPI checkpoints</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Generate an enterprise portfolio plan with role tracks, weekly cadence, and AI commands for mobile, iPad, and desktop execution.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { void generatePortfolioPlan() }}
            disabled={portfolioLoading}
            className="btn-saffron text-sm disabled:opacity-60"
          >
            {portfolioLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {portfolioLoading ? "Generating Plan..." : "Generate Portfolio Plan"}
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.08fr,0.92fr]">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Portfolio Objective</label>
              <textarea
                value={portfolioObjective}
                onChange={(event) => setPortfolioObjective(event.target.value)}
                className="input-field mt-1 min-h-[92px]"
                placeholder="Describe what this resume portfolio should optimize."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Primary Target Role</label>
                <input
                  type="text"
                  value={portfolioTargetRole}
                  onChange={(event) => setPortfolioTargetRole(event.target.value)}
                  placeholder="e.g. Senior Product Manager"
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Priority Focus</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {([
                    { id: "quality", label: "Quality" },
                    { id: "coverage", label: "Coverage" },
                    { id: "targeting", label: "Targeting" },
                    { id: "conversion", label: "Conversion" },
                  ] as const).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPortfolioPriority(item.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        portfolioPriority === item.id
                          ? "border-saffron-500/40 bg-saffron-500/10 text-saffron-700"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Horizon</span>
                  <span>{portfolioHorizon} weeks</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={16}
                  step={1}
                  value={portfolioHorizon}
                  onChange={(event) => setPortfolioHorizon(Math.max(4, Math.min(16, Number(event.target.value))))}
                  className="w-full accent-saffron-500"
                />
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Weekly Hours</span>
                  <span>{portfolioHours}h</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={24}
                  step={1}
                  value={portfolioHours}
                  onChange={(event) => setPortfolioHours(Math.max(3, Math.min(24, Number(event.target.value))))}
                  className="w-full accent-saffron-500"
                />
              </div>
            </div>
            {portfolioError && <p className="text-xs text-red-600">{portfolioError}</p>}
          </div>

          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            {!portfolioPlan ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Portfolio output includes</p>
                <p>• Multi-track resume architecture for core, adjacency, and stretch roles</p>
                <p>• KPI targets with ownership and conversion rationale</p>
                <p>• Monday-Friday cadence with clear module routing</p>
                <p>• Reusable AI command prompts for rapid iteration</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">North Star</p>
                <div className="rounded-xl border border-border bg-background/70 p-3">
                  <p className="text-sm font-medium">{portfolioPlan.northStar.goal}</p>
                  <p className="text-xs text-muted-foreground mt-1">Target: {portfolioPlan.northStar.target}</p>
                  <p className="text-xs text-muted-foreground mt-1">Metric: {portfolioPlan.northStar.metric}</p>
                </div>
                <p className="text-sm text-muted-foreground">{portfolioPlan.overview}</p>
                <p className="text-[11px] text-muted-foreground">
                  Confidence {Math.round(Math.max(0, Math.min(1, portfolioPlan.confidence)) * 100)}%
                </p>
              </div>
            )}
          </div>
        </div>

        {portfolioPlan && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {portfolioPlan.tracks.slice(0, 3).map((track) => (
                <article key={track.title} className="rounded-xl border border-border p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{track.title}</p>
                    <Gauge className="h-4 w-4 text-saffron-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{track.objective}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">Roles: {track.targetRoles.slice(0, 3).join(", ")}</p>
                  <div className="mt-2 space-y-1">
                    {track.resumeMoves.slice(0, 3).map((move, index) => (
                      <p key={`${track.title}-${index}`} className="text-xs text-muted-foreground">• {move}</p>
                    ))}
                  </div>
                  <Link href={track.moduleHref || "/app/resumes"} className="inline-flex items-center gap-1.5 text-xs text-saffron-600 hover:underline mt-3">
                    Open module
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </article>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-border p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardCheck className="h-4 w-4 text-navy-600" />
                  <p className="text-sm font-medium">KPI Checkpoints</p>
                </div>
                <div className="space-y-2">
                  {portfolioPlan.kpis.slice(0, 4).map((kpi) => (
                    <div key={kpi.name} className="rounded-lg border border-border p-2.5">
                      <p className="text-xs font-medium">{kpi.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Current: {kpi.current}</p>
                      <p className="text-[11px] text-muted-foreground">Target: {kpi.target}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border p-3 sm:p-4">
                <p className="text-sm font-medium mb-2">Weekly Cadence</p>
                <div className="space-y-2">
                  {portfolioPlan.weeklyCadence.slice(0, 5).map((slot) => (
                    <Link key={`${slot.day}-${slot.focus}`} href={slot.moduleHref || "/app/resumes"} className="block rounded-lg border border-border p-2.5 hover:bg-secondary/40 transition-colors">
                      <p className="text-xs font-medium">{slot.day} • {slot.focus}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{slot.action}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {portfolioPlan.aiPrompts.length > 0 && (
              <div className="rounded-xl border border-border p-3 sm:p-4">
                <p className="text-sm font-medium mb-2">AI Prompt Commands</p>
                <div className="flex flex-wrap gap-1.5">
                  {portfolioPlan.aiPrompts.slice(0, 6).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => { void copyPrompt(prompt) }}
                      className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-secondary transition-colors"
                    >
                      {copiedPrompt === prompt ? "Copied" : prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <AIMissionConsole
        surface="resumes"
        title="AI Resume Missions"
        description="Execute guided missions to improve ATS quality, role-fit coverage, and conversion outcomes."
        missions={[
          {
            id: "resume-ats-recovery",
            title: "ATS Recovery Sprint",
            objective: "Move weak resumes above enterprise ATS baseline fast.",
            prompt: "Create a 5-day ATS recovery sprint for resumes below target score.",
            href: "/app/resumes",
            priority: "high",
          },
          {
            id: "resume-role-alignment",
            title: "Role Alignment Upgrade",
            objective: "Map resume variants to high-priority role clusters.",
            prompt: "Build a role-to-resume alignment map for this week with execution order.",
            href: "/app/roles",
            priority: "high",
          },
          {
            id: "resume-proof-signals",
            title: "Proof Signal Enrichment",
            objective: "Strengthen evidence and impact language in key bullets.",
            prompt: "Identify the top proof-signal gaps and suggest concrete bullet upgrades.",
            href: "/app/resumes",
            priority: "medium",
          },
          {
            id: "resume-conversion-loop",
            title: "Conversion Feedback Loop",
            objective: "Link resume quality shifts to application response outcomes.",
            prompt: "Design a weekly conversion loop connecting resume changes to response-rate movement.",
            href: "/app/forecast",
            priority: "medium",
          },
        ]}
      />

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search resumes by title or target role..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-11" />
        </div>
      </div>

      {/* Resumes Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-elevated p-4 sm:p-5 lg:p-6 animate-pulse">
              <div className="h-6 bg-secondary rounded w-3/4 mb-4" />
              <div className="h-4 bg-secondary rounded w-1/2 mb-6" />
              <div className="h-10 bg-secondary rounded" />
            </div>
          ))}
        </div>
      ) : filteredResumes.length === 0 && resumes.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-saffron-500/10 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-saffron-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Create Your First Resume</h3>
          <p className="text-muted-foreground mb-2 max-w-md mx-auto">
            Build an ATS-optimized resume in minutes. Our AI helps you write better bullet points, 
            match keywords, and format for maximum impact.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> ATS-Optimized</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> AI Keyword Matching</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> PDF Export</span>
          </div>
          <Link href="/app/resumes/new" className="btn-saffron text-base px-6 py-3">
            <Plus className="w-5 h-5" />
            Create Your First Resume
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResumes.map((resume) => {
            const StatusIcon = getStatusIcon(resume.status)
            return (
              <div key={resume.id} className="card-interactive p-4 sm:p-5 lg:p-6 group relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-navy-500/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-navy-600" />
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(resume.status)}`}>
                    <StatusIcon className="w-3 h-3" />
                    {resume.status.charAt(0).toUpperCase() + resume.status.slice(1)}
                  </span>
                </div>
                
                <h3 className="font-semibold mb-1 truncate">{resume.title}</h3>
                {resume.target_role && (
                  <p className="text-sm text-muted-foreground mb-3 truncate">{resume.target_role}</p>
                )}
                
                {/* ATS Score Bar */}
                {resume.ats_score !== null && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">ATS Score</span>
                      <span className={`font-semibold ${resume.ats_score >= 80 ? 'text-green-500' : resume.ats_score >= 60 ? 'text-saffron-500' : 'text-red-500'}`}>{resume.ats_score}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${resume.ats_score >= 80 ? 'bg-green-500' : resume.ats_score >= 60 ? 'bg-saffron-500' : 'bg-red-500'}`} style={{ width: `${resume.ats_score}%` }} />
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mb-4">
                  Updated {new Date(resume.updated_at).toLocaleDateString()}
                </div>
                
                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <Link href={`/app/resumes/${resume.id}`} className="flex-1 btn-primary text-sm py-2">
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                  <button onClick={() => handleDuplicate(resume)} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Duplicate">
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => setDeleteId(resume.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                  </button>
                </div>
              </div>
            )
          })}
          
          {/* Create New Card */}
          <Link href="/app/resumes/new"
            className="card-interactive p-4 sm:p-5 lg:p-6 border-2 border-dashed border-border hover:border-saffron-500/50 flex flex-col items-center justify-center text-center min-h-[280px]">
            <div className="w-14 h-14 rounded-xl bg-saffron-500/10 flex items-center justify-center mb-4">
              <Plus className="w-7 h-7 text-saffron-500" />
            </div>
            <h3 className="font-semibold mb-1">Create New Resume</h3>
            <p className="text-sm text-muted-foreground">AI-powered ATS optimization</p>
          </Link>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-background rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Delete Resume?</h3>
            <p className="text-muted-foreground mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 btn-outline">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-2.5 font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
