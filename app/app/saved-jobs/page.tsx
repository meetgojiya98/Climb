"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  Bookmark,
  Plus,
  MapPin,
  DollarSign,
  ExternalLink,
  Pencil,
  Trash2,
  Briefcase,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react"

interface SavedJob {
  id: string
  company: string
  position: string
  location: string | null
  salary_range: string | null
  job_url: string | null
  description: string | null
  notes: string | null
  created_at: string
}

export default function SavedJobsPage() {
  const [jobs, setJobs] = useState<SavedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SavedJob | null>(null)
  const [form, setForm] = useState({
    company: "",
    position: "",
    location: "",
    salary_range: "",
    job_url: "",
    description: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase.from('saved_jobs').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      if (!error && data) setJobs(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const saveJob = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (editing) {
        await supabase.from('saved_jobs').update({
          company: form.company,
          position: form.position,
          location: form.location || null,
          salary_range: form.salary_range || null,
          job_url: form.job_url || null,
          description: form.description || null,
          notes: form.notes || null,
        }).eq('id', editing.id)
      } else {
        await supabase.from('saved_jobs').insert({
          user_id: user.id,
          company: form.company,
          position: form.position,
          location: form.location || null,
          salary_range: form.salary_range || null,
          job_url: form.job_url || null,
          description: form.description || null,
          notes: form.notes || null,
        })
      }
      await fetchJobs()
      closeModal()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const deleteJob = async (id: string) => {
    try {
      const supabase = createClient()
      await supabase.from('saved_jobs').delete().eq('id', id)
      setJobs(jobs.filter((j) => j.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const moveToApplications = (job: SavedJob) => {
    const params = new URLSearchParams({
      company: job.company,
      position: job.position,
      location: job.location || "",
      salary_range: job.salary_range || "",
      job_url: job.job_url || "",
    })
    window.location.href = `/app/applications?add=1&${params.toString()}`
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setForm({ company: "", position: "", location: "", salary_range: "", job_url: "", description: "", notes: "" })
  }

  const openEdit = (job: SavedJob) => {
    setEditing(job)
    setForm({
      company: job.company,
      position: job.position,
      location: job.location || "",
      salary_range: job.salary_range || "",
      job_url: job.job_url || "",
      description: job.description || "",
      notes: job.notes || "",
    })
    setShowModal(true)
  }

  const filtered = jobs.filter(
    (j) =>
      j.company.toLowerCase().includes(search.toLowerCase()) ||
      j.position.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Saved Jobs</h1>
          <p className="text-muted-foreground">Save jobs to apply later and never lose a listing</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-saffron">
          <Plus className="w-4 h-4" />
          Save Job
        </button>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search saved jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field flex-1"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-elevated p-6 animate-pulse">
              <div className="h-5 bg-secondary rounded w-2/3 mb-3" />
              <div className="h-4 bg-secondary rounded w-1/2 mb-4" />
              <div className="h-10 bg-secondary rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <Bookmark className="w-16 h-16 text-saffron-500/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No saved jobs</h3>
          <p className="text-muted-foreground mb-6">Save job postings to apply when you&apos;re ready.</p>
          <button onClick={() => setShowModal(true)} className="btn-saffron">
            <Plus className="w-4 h-4" /> Save Your First Job
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <div key={job.id} className="card-interactive p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-navy-500/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-navy-600" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(job)} className="p-2 rounded-lg hover:bg-secondary"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => deleteJob(job.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <h3 className="font-semibold truncate">{job.position}</h3>
              <p className="text-sm text-muted-foreground truncate">{job.company}</p>
              <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
                {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>}
                {job.salary_range && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {job.salary_range}</span>}
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                {job.job_url && (
                  <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm py-2">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button onClick={() => moveToApplications(job)} className="btn-saffron text-sm py-2 flex-1">
                  Apply <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-background rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editing ? "Edit" : "Save"} Job</h2>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveJob} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Company *</label>
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Position *</label>
                <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="input-field" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Salary range</label>
                  <input value={form.salary_range} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} className="input-field" placeholder="$100k–$120k" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Job URL</label>
                <input type="url" value={form.job_url} onChange={(e) => setForm({ ...form, job_url: e.target.value })} className="input-field" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description / Notes</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field min-h-[80px]" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-saffron disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? "Save" : "Save Job")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
