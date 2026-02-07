"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
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
  CalendarDays
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Application {
  id: string
  company: string
  position: string
  location: string
  salary_range: string
  job_url: string
  status: string
  applied_date: string
  notes: string
  created_at: string
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
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showModal, setShowModal] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'cards' | 'kanban'>('cards')

  // Form state (status must match DB: applied, screening, interview, offer, rejected, withdrawn)
  const [formData, setFormData] = useState({
    company: "",
    position: "",
    location: "",
    salary_range: "",
    job_url: "",
    status: "applied",
    applied_date: "",
    notes: ""
  })

  useEffect(() => {
    fetchApplications()
  }, [])

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

      if (editingApp) {
        const { error } = await supabase
          .from('applications')
          .update(formData)
          .eq('id', editingApp.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('applications')
          .insert({ ...formData, user_id: user.id })
        if (error) throw error
      }

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
    return matchesSearch && matchesStatus
  })

  const getStatusInfo = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]
  }

  // Group applications by status for kanban view
  const groupedApplications = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status.value] = filteredApplications.filter(a => a.status === status.value)
    return acc
  }, {} as Record<string, Application[]>)

  return (
    <div className="p-6 lg:p-8">
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
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
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
              <div className="text-2xl font-bold">{stats.thisWeek}</div>
              <div className="text-xs text-muted-foreground">This Week</div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Card */}
      {applications.length >= 3 && (
        <div className="card-elevated p-6 mb-8 bg-gradient-to-r from-saffron-500/5 to-gold-500/5 border-saffron-500/20">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-saffron-500/10">
              <Sparkles className="w-6 h-6 text-saffron-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">AI Insights</h3>
              <p className="text-sm text-muted-foreground">
                {stats.responseRate >= 30 
                  ? "Great job! Your response rate is above average. Keep applying to similar roles."
                  : stats.responseRate >= 15
                  ? "Your response rate is average. Consider tailoring your resume more for each application."
                  : "Your response rate is below average. Try to match your skills more closely to job requirements and follow up on applications."}
              </p>
              {stats.thisWeek < 5 && (
                <p className="text-sm text-saffron-600 mt-2">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Tip: Applying to 5-10 jobs per week increases your chances significantly.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
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

      {/* Applications */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-elevated p-6 animate-pulse">
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
            return (
              <div key={app.id} className="card-interactive p-6 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{app.position}</h3>
                    <p className="text-sm text-muted-foreground truncate">{app.company}</p>
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
                    <div key={app.id} className="card-elevated p-4">
                      <h4 className="font-medium text-sm truncate">{app.position}</h4>
                      <p className="text-xs text-muted-foreground truncate">{app.company}</p>
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
