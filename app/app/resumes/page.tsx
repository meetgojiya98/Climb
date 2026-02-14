"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { 
  Plus, 
  FileText, 
  MoreVertical, 
  Download, 
  Pencil, 
  Trash2, 
  Eye,
  Sparkles,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  Upload,
  Copy,
  ArrowUpRight
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

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

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

  const avgATS = resumes.filter(r => r.ats_score).length > 0
    ? Math.round(resumes.filter(r => r.ats_score).reduce((sum, r) => sum + (r.ats_score || 0), 0) / resumes.filter(r => r.ats_score).length)
    : null

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
    <div className="p-4 sm:p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
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
              <div className="text-2xl font-bold">{resumes.filter(r => r.status === 'complete').length}</div>
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
              <div className="text-2xl font-bold">{resumes.filter(r => r.status === 'draft').length}</div>
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
