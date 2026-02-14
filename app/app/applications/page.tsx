"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AIMissionConsole } from "@/components/app/ai-mission-console"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal,
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  Building2,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  CalendarDays,
  CheckSquare,
  Square,
  Download,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Application {
  id: string
  company: string
  position: string
  location: string
  salary_range: string
  job_url: string
  status: string
  applied_date: string
  follow_up_date?: string | null
  next_action_at?: string | null
  notes: string
  created_at: string
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

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Applied', color: 'bg-blue-500/10 text-blue-500', icon: Clock },
  { value: 'screening', label: 'Screening', color: 'bg-purple-500/10 text-purple-500', icon: Search },
  { value: 'interview', label: 'Interview', color: 'bg-saffron-500/10 text-saffron-500', icon: Building2 },
  { value: 'offer', label: 'Offer', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-500/10 text-red-500', icon: AlertCircle },
  { value: 'withdrawn', label: 'Withdrawn', color: 'bg-gray-500/10 text-gray-500', icon: X },
]

export default function ApplicationsPage() {
  const searchParams = useSearchParams()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showModal, setShowModal] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'kanban'>('cards')
  const [hydratedFromQuery, setHydratedFromQuery] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState<string>('applied')
  const [bulkFollowupDays, setBulkFollowupDays] = useState<string>('7')
  const [showOverdueOnly, setShowOverdueOnly] = useState(false)
  const [showStaleOnly, setShowStaleOnly] = useState(false)
  const [showNoActionOnly, setShowNoActionOnly] = useState(false)
  const [aiBrief, setAiBrief] = useState<CopilotBrief | null>(null)
  const [aiBriefLoading, setAiBriefLoading] = useState(false)
  const [aiBriefError, setAiBriefError] = useState<string | null>(null)

  // Form state (status must match DB: applied, screening, interview, offer, rejected, withdrawn)
  const [formData, setFormData] = useState({
    company: "",
    position: "",
    location: "",
    salary_range: "",
    job_url: "",
    status: "applied",
    applied_date: "",
    follow_up_date: "",
    notes: ""
  })

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    if (hydratedFromQuery) return
    if (searchParams.get("add") !== "1") return

    setEditingApp(null)
    setFormData({
      company: searchParams.get("company") || "",
      position: searchParams.get("position") || "",
      location: searchParams.get("location") || "",
      salary_range: searchParams.get("salary_range") || "",
      job_url: searchParams.get("job_url") || "",
      status: "applied",
      applied_date: new Date().toISOString().slice(0, 10),
      follow_up_date: "",
      notes: "",
    })
    setShowModal(true)
    setHydratedFromQuery(true)
  }, [hydratedFromQuery, searchParams])

  const isTerminalStatus = (status: string) => ['offer', 'rejected', 'withdrawn'].includes(status)

  const isOverdue = (app: Application) => {
    if (isTerminalStatus(app.status)) return false
    if (!app.follow_up_date) return false
    return new Date(app.follow_up_date) < new Date()
  }

  const isStale = (app: Application) => {
    if (isTerminalStatus(app.status)) return false
    const baseDate = app.applied_date || app.created_at
    if (!baseDate) return false
    const diffDays = Math.floor((Date.now() - new Date(baseDate).getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 14
  }

  const isMissingActionDate = (app: Application) => {
    if (isTerminalStatus(app.status)) return false
    return !app.follow_up_date && !app.next_action_at
  }

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => applications.some((app) => app.id === id)))
  }, [applications])

  const fetchApplications = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload: Record<string, any> = {
        ...formData,
        follow_up_date: formData.follow_up_date || null,
      }

      const persist = async (data: Record<string, any>) => {
        if (editingApp) {
          return supabase.from('applications').update(data).eq('id', editingApp.id)
        }
        return supabase.from('applications').insert({ ...data, user_id: user.id })
      }

      let { error } = await persist(payload)

      // Backward compatibility if follow_up_date column is not present.
      if (error && String(error.message || '').toLowerCase().includes('follow_up_date')) {
        const { follow_up_date, ...fallback } = payload
        const retry = await persist(fallback)
        error = retry.error
      }

      if (error) throw error

      await fetchApplications()
      closeModal()
    } catch (error) {
      console.error('Error saving application:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('applications').delete().eq('id', id)
      if (error) throw error
      setApplications(applications.filter(a => a.id !== id))
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting application:', error)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', id)
      if (error) throw error
      setApplications(applications.map(a => 
        a.id === id ? { ...a, status } : a
      ))
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const openModal = (app?: Application) => {
    if (app) {
      setEditingApp(app)
      setFormData({
        company: app.company,
        position: app.position,
        location: app.location || "",
        salary_range: app.salary_range || "",
        job_url: app.job_url || "",
        status: app.status,
        applied_date: app.applied_date || "",
        follow_up_date: app.follow_up_date || "",
        notes: app.notes || ""
      })
    } else {
      setEditingApp(null)
      setFormData({
        company: "",
        position: "",
        location: "",
        salary_range: "",
        job_url: "",
        status: "applied",
        applied_date: new Date().toISOString().split('T')[0],
        follow_up_date: "",
        notes: ""
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingApp(null)
    setFormData({
      company: "",
      position: "",
      location: "",
      salary_range: "",
      job_url: "",
      status: "applied",
      applied_date: "",
      follow_up_date: "",
      notes: ""
    })
  }

  // Calculate stats (status values match DB)
  const appliedCount = applications.filter(a => a.status === 'applied').length
  const respondedCount = applications.filter(a => ['screening', 'interview', 'offer'].includes(a.status)).length
  const stats = {
    total: applications.length,
    applied: appliedCount,
    interviewing: applications.filter(a => a.status === 'interview' || a.status === 'screening').length,
    offers: applications.filter(a => a.status === 'offer').length,
    responseRate: applications.length > 0 
      ? Math.round((respondedCount / applications.length) * 100) || 0
      : 0,
    followupsDue: applications.filter(isOverdue).length,
    stale: applications.filter(isStale).length,
    noAction: applications.filter(isMissingActionDate).length,
    thisWeek: applications.filter(a => {
      const appliedDate = new Date(a.applied_date)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return appliedDate >= weekAgo
    }).length
  }

  const filteredApplications = applications.filter(app => {
    const company = (app.company ?? '').toString().toLowerCase()
    const position = (app.position ?? '').toString().toLowerCase()
    const term = searchTerm.toLowerCase()
    const matchesSearch = company.includes(term) || position.includes(term)
    const matchesStatus = statusFilter === "all" || app.status === statusFilter
    const matchesOverdue = !showOverdueOnly || isOverdue(app)
    const matchesStale = !showStaleOnly || isStale(app)
    const matchesNoAction = !showNoActionOnly || isMissingActionDate(app)
    return matchesSearch && matchesStatus && matchesOverdue && matchesStale && matchesNoAction
  })

  const selectedCount = selectedIds.length
  const allFilteredSelected = filteredApplications.length > 0 && filteredApplications.every((app) => selectedIds.includes(app.id))

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredApplications.some((app) => app.id === id)))
      return
    }
    const filteredIds = filteredApplications.map((app) => app.id)
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])))
  }

  const handleBulkStatusUpdate = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one application')
      return
    }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('applications')
        .update({ status: bulkStatus })
        .in('id', selectedIds)
        .eq('user_id', user.id)

      if (error) throw error

      setApplications((prev) => prev.map((app) => (
        selectedIds.includes(app.id) ? { ...app, status: bulkStatus } : app
      )))
      toast.success(`Updated ${selectedIds.length} application${selectedIds.length > 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Error running bulk status update:', error)
      toast.error('Could not update selected applications')
    }
  }

  const handleBulkFollowupUpdate = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one application')
      return
    }

    const days = Number(bulkFollowupDays)
    const nextDate = Number.isFinite(days)
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('applications')
        .update({ follow_up_date: nextDate })
        .in('id', selectedIds)
        .eq('user_id', user.id)

      if (error) {
        if (String(error.message || '').toLowerCase().includes('follow_up_date')) {
          toast.error('Your schema does not support bulk follow-up dates yet')
          return
        }
        throw error
      }

      setApplications((prev) => prev.map((app) => (
        selectedIds.includes(app.id) ? { ...app, follow_up_date: nextDate } : app
      )))
      toast.success(`Updated follow-up date for ${selectedIds.length} application${selectedIds.length > 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Error running bulk follow-up update:', error)
      toast.error('Could not update follow-up dates')
    }
  }

  const handleExportSelected = () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one application')
      return
    }

    const rows = applications.filter((app) => selectedIds.includes(app.id))
    const escape = (value: unknown) => {
      const raw = String(value ?? '')
      if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
      return raw
    }

    const csvRows = [
      ['company', 'position', 'status', 'applied_date', 'follow_up_date', 'location', 'salary_range', 'job_url', 'notes'],
      ...rows.map((row) => [
        row.company,
        row.position,
        row.status,
        row.applied_date || '',
        row.follow_up_date || '',
        row.location || '',
        row.salary_range || '',
        row.job_url || '',
        row.notes || '',
      ]),
    ]

    const csv = csvRows.map((row) => row.map(escape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `climb-applications-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} application${rows.length > 1 ? 's' : ''}`)
  }

  const generateAIBrief = async (customPrompt?: string) => {
    if (aiBriefLoading) return
    setAiBriefLoading(true)
    setAiBriefError(null)

    try {
      const message = customPrompt || [
        "Generate an enterprise application-pipeline action brief.",
        `Total applications: ${stats.total}.`,
        `Response rate: ${stats.responseRate}%.`,
        `Interviewing: ${stats.interviewing}.`,
        `Offers: ${stats.offers}.`,
        `Overdue follow-ups: ${stats.followupsDue}.`,
        `Stale records: ${stats.stale}.`,
        `No next-action records: ${stats.noAction}.`,
        `Applications this week: ${stats.thisWeek}.`,
      ].join(" ")

      const response = await fetch('/api/agent/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          surface: 'applications',
          history: [],
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Could not generate AI action brief')
      }

      const payload = data?.response
      const normalized: CopilotBrief = {
        summary: String(payload?.summary || ''),
        answer: String(payload?.answer || ''),
        actionPlan: Array.isArray(payload?.actionPlan) ? payload.actionPlan : [],
        quickReplies: Array.isArray(payload?.quickReplies) ? payload.quickReplies : [],
        confidence: Number(payload?.confidence || 0),
      }

      setAiBrief(normalized)
      if (normalized.quickReplies.length > 0 && !customPrompt) {
        toast.success('AI action brief generated')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate AI action brief'
      setAiBriefError(message)
      toast.error(message)
    } finally {
      setAiBriefLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
  }

  // Group applications by status for kanban view
  const groupedApplications = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status.value] = filteredApplications.filter(a => a.status === status.value)
    return acc
  }, {} as Record<string, Application[]>)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Applications</h1>
          <p className="text-muted-foreground mt-1">Track and manage your job applications</p>
        </div>
        <button onClick={() => openModal()} className="btn-saffron">
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-8 gap-4 mb-8">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-navy-500/10">
              <Briefcase className="w-5 h-5 text-navy-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.applied}</div>
              <div className="text-xs text-muted-foreground">Applied</div>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-saffron-500/10">
              <Building2 className="w-5 h-5 text-saffron-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.interviewing}</div>
              <div className="text-xs text-muted-foreground">Interviewing</div>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.offers}</div>
              <div className="text-xs text-muted-foreground">Offers</div>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.responseRate}%</div>
              <div className="text-xs text-muted-foreground">Response Rate</div>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/10">
              <CalendarDays className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.followupsDue}</div>
              <div className="text-xs text-muted-foreground">Follow-ups Due</div>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.stale}</div>
              <div className="text-xs text-muted-foreground">Stale (14d+)</div>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Target className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.noAction}</div>
              <div className="text-xs text-muted-foreground">No Next Action</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights + Action Brief */}
      <div className="card-elevated p-4 sm:p-5 lg:p-6 mb-8 bg-gradient-to-r from-saffron-500/5 to-gold-500/5 border-saffron-500/20">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-saffron-500/10">
              <Sparkles className="w-6 h-6 text-saffron-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">AI Control Brief</h3>
              <p className="text-sm text-muted-foreground">
                {stats.responseRate >= 30
                  ? "Response quality is strong. Use AI to optimize conversion in interviews and offer stage."
                  : stats.responseRate >= 15
                  ? "Response quality is moderate. Generate an AI brief to tighten targeting and follow-up rhythm."
                  : "Response quality is below target. Generate an AI recovery brief and execute top-priority actions this week."}
              </p>
              {stats.thisWeek < 5 && (
                <p className="text-sm text-saffron-600 mt-2">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Cadence target: 5-10 high-fit applications per week.
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { void generateAIBrief() }}
            disabled={aiBriefLoading}
            className="btn-outline text-sm whitespace-nowrap disabled:opacity-60"
          >
            {aiBriefLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {aiBrief ? "Refresh AI Brief" : "Generate AI Action Brief"}
          </button>
        </div>

        {aiBriefError && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700">
            {aiBriefError}
          </div>
        )}

        {aiBrief && (
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Executive Summary</p>
              <p className="font-medium mt-1">{aiBrief.summary}</p>
              <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap leading-relaxed">{aiBrief.answer}</p>
              <p className="text-xs text-muted-foreground mt-3">
                Confidence: {Math.round(Math.max(0, Math.min(1, aiBrief.confidence)) * 100)}%
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-sm font-semibold">Priority Actions</p>
              <div className="space-y-2 mt-3">
                {aiBrief.actionPlan.map((action, index) => (
                  <Link
                    key={`${action.title}-${index}`}
                    href={String(action.href || '/app/dashboard')}
                    className="block rounded-lg border border-border p-3 hover:border-saffron-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2">
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
                          <p className="text-sm font-medium truncate">{action.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{action.detail}</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                  </Link>
                ))}
              </div>

              {aiBrief.quickReplies.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Ask follow-up brief</p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiBrief.quickReplies.slice(0, 4).map((reply) => (
                      <button
                        key={reply}
                        type="button"
                        onClick={() => { void generateAIBrief(reply) }}
                        className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-saffron-500/10 hover:border-saffron-500/40 transition-colors"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AIMissionConsole
        surface="applications"
        title="AI Pipeline Missions"
        description="Execute guided missions to improve response rate, clear risk debt, and move pipeline stages faster."
        className="mb-8"
        missions={[
          {
            id: "pipeline-recovery",
            title: "Pipeline Recovery Sprint",
            objective: "Clear overdue, stale, and no-action records in the next 48 hours.",
            prompt: "Create a 48-hour pipeline recovery plan with ordered remediation tasks and expected impact.",
            href: "/app/control-tower",
            priority: "high",
          },
          {
            id: "targeting-optimization",
            title: "Targeting Optimization",
            objective: "Improve response quality through better role selection and tailoring.",
            prompt: "What targeting changes should I make to improve response rate this week?",
            href: "/app/roles",
            priority: "high",
          },
          {
            id: "followup-engine",
            title: "Follow-up Engine",
            objective: "Run a consistent outreach cadence for active opportunities.",
            prompt: "Build a follow-up cadence for all active applications with practical templates and timing.",
            href: "/app/applications",
            priority: "medium",
          },
          {
            id: "offer-acceleration",
            title: "Offer Acceleration Plan",
            objective: "Increase projected interviews and offers over the next 8 weeks.",
            prompt: "Generate an offer acceleration strategy using applications, quality, and interview prep levers.",
            href: "/app/forecast",
            priority: "medium",
          },
        ]}
      />

      {/* Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field pr-10"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <div className="flex rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  "px-3 py-2 text-sm",
                  viewMode === 'cards' ? 'bg-saffron-500/10 text-saffron-600' : 'hover:bg-secondary'
                )}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={cn(
                  "px-3 py-2 text-sm",
                  viewMode === 'kanban' ? 'bg-saffron-500/10 text-saffron-600' : 'hover:bg-secondary'
                )}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowOverdueOnly((value) => !value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              showOverdueOnly ? "border-red-500/40 bg-red-500/10 text-red-600" : "border-border hover:bg-secondary"
            )}
          >
            Overdue Follow-ups
          </button>
          <button
            type="button"
            onClick={() => setShowStaleOnly((value) => !value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              showStaleOnly ? "border-amber-500/40 bg-amber-500/10 text-amber-600" : "border-border hover:bg-secondary"
            )}
          >
            Stale 14+ Days
          </button>
          <button
            type="button"
            onClick={() => setShowNoActionOnly((value) => !value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              showNoActionOnly ? "border-navy-500/40 bg-navy-500/10 text-navy-600" : "border-border hover:bg-secondary"
            )}
          >
            Missing Next Action
          </button>
          {(showOverdueOnly || showStaleOnly || showNoActionOnly || selectedIds.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setShowOverdueOnly(false)
                setShowStaleOnly(false)
                setShowNoActionOnly(false)
                setSelectedIds([])
              }}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              Reset
            </button>
          )}
        </div>

        <div className="card-elevated p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAllFiltered}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
              >
                {allFilteredSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {allFilteredSelected ? 'Deselect Filtered' : 'Select Filtered'}
              </button>
              <span className="text-sm text-muted-foreground">
                {selectedCount} selected of {filteredApplications.length} filtered
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="input-field py-2 text-sm"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    Set Status: {status.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleBulkStatusUpdate} className="btn-outline py-2 px-3 text-sm">
                Apply Status
              </button>
              <select
                value={bulkFollowupDays}
                onChange={(e) => setBulkFollowupDays(e.target.value)}
                className="input-field py-2 text-sm"
              >
                <option value="7">Follow-up +7d</option>
                <option value="14">Follow-up +14d</option>
                <option value="30">Follow-up +30d</option>
              </select>
              <button type="button" onClick={handleBulkFollowupUpdate} className="btn-outline py-2 px-3 text-sm">
                Apply Follow-up
              </button>
              <button type="button" onClick={handleExportSelected} className="btn-outline py-2 px-3 text-sm">
                <Download className="w-4 h-4" />
                Export Selected
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Applications */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-elevated p-4 sm:p-5 lg:p-6 animate-pulse">
              <div className="h-4 bg-secondary rounded w-3/4 mb-3" />
              <div className="h-3 bg-secondary rounded w-1/2 mb-4" />
              <div className="h-6 bg-secondary rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {applications.length === 0 ? "No applications yet" : "No matching applications"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {applications.length === 0 
              ? "Start tracking your job applications to stay organized and never miss an opportunity."
              : "Try adjusting your search or filters to find what you're looking for."}
          </p>
          {applications.length === 0 && (
            <button onClick={() => openModal()} className="btn-saffron">
              <Plus className="w-4 h-4" />
              Add Your First Application
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApplications.map((app) => {
            const statusInfo = getStatusInfo(app.status)
            const isSelected = selectedIds.includes(app.id)
            return (
              <div
                key={app.id}
                className={cn(
                  "card-interactive p-4 sm:p-5 lg:p-6 group",
                  isSelected && "border-saffron-500/40 bg-saffron-500/5"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSelected(app.id)}
                      className="mt-0.5 rounded-md p-1 hover:bg-secondary"
                      aria-label={isSelected ? 'Deselect application' : 'Select application'}
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4 text-saffron-600" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{app.position}</h3>
                      <p className="text-sm text-muted-foreground truncate">{app.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(app)} className="p-1.5 rounded-lg hover:bg-secondary">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(app.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  {app.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {app.location}
                    </div>
                  )}
                  {app.salary_range && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      {app.salary_range}
                    </div>
                  )}
                  {app.applied_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(app.applied_date).toLocaleDateString()}
                    </div>
                  )}
                  {app.follow_up_date && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm",
                      new Date(app.follow_up_date) < new Date() && !['offer', 'rejected', 'withdrawn'].includes(app.status)
                        ? 'text-red-500'
                        : 'text-muted-foreground'
                    )}>
                      <CalendarDays className="w-4 h-4" />
                      Follow-up: {new Date(app.follow_up_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <select
                    value={app.status}
                    onChange={(e) => updateStatus(app.id, e.target.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium border-none focus:ring-0 cursor-pointer",
                      statusInfo.color
                    )}
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                  {app.job_url && (
                    <a 
                      href={app.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Kanban View */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STATUS_OPTIONS.slice(0, 5).map((status) => (
              <div key={status.value} className="w-72 flex-shrink-0">
                <div className={cn("px-3 py-2 rounded-xl mb-3 flex items-center gap-2", status.color)}>
                  <status.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{status.label}</span>
                  <span className="ml-auto text-xs opacity-70">{groupedApplications[status.value]?.length || 0}</span>
                </div>
                <div className="space-y-3">
                  {groupedApplications[status.value]?.map((app) => (
                    <div
                      key={app.id}
                      className={cn(
                        "card-elevated p-4",
                        selectedIds.includes(app.id) && "border-saffron-500/40 bg-saffron-500/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleSelected(app.id)}
                            className="mt-0.5 rounded-md p-1 hover:bg-secondary"
                            aria-label={selectedIds.includes(app.id) ? 'Deselect application' : 'Select application'}
                          >
                            {selectedIds.includes(app.id) ? (
                              <CheckSquare className="w-3.5 h-3.5 text-saffron-600" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm truncate">{app.position}</h4>
                            <p className="text-xs text-muted-foreground truncate">{app.company}</p>
                          </div>
                        </div>
                      </div>
                      {app.applied_date && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(app.applied_date).toLocaleDateString()}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-3">
                        <button onClick={() => openModal(app)} className="p-1 rounded hover:bg-secondary">
                          <Pencil className="w-3 h-3" />
                        </button>
                        {app.job_url && (
                          <a href={app.job_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-secondary">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-background rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background p-6 border-b border-border z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {editingApp ? 'Edit Application' : 'Add Application'}
                </h2>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Company *</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    className="input-field"
                    placeholder="Google"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Position *</label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className="input-field"
                    placeholder="Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="input-field"
                    placeholder="Remote / NYC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Salary Range</label>
                  <input
                    type="text"
                    value={formData.salary_range}
                    onChange={(e) => setFormData({...formData, salary_range: e.target.value})}
                    className="input-field"
                    placeholder="$120k - $150k"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="input-field"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Applied Date</label>
                  <input
                    type="date"
                    value={formData.applied_date}
                    onChange={(e) => setFormData({...formData, applied_date: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Follow-up Date</label>
                  <input
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Job URL</label>
                  <input
                    type="url"
                    value={formData.job_url}
                    onChange={(e) => setFormData({...formData, job_url: e.target.value})}
                    className="input-field"
                    placeholder="https://..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="input-field min-h-[100px]"
                    placeholder="Add any notes about this application..."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 btn-outline">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-saffron">
                  {editingApp ? 'Save Changes' : 'Add Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative bg-background rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Delete Application?</h3>
            <p className="text-muted-foreground mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 btn-outline">
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
