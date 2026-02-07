"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Mail,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Briefcase,
  X,
  ExternalLink,
  Sparkles,
  Copy,
  CheckCircle,
  Loader2,
} from "lucide-react"

interface CoverLetter {
  id: string
  title: string
  company: string | null
  position: string | null
  content: string
  application_id: string | null
  resume_id: string | null
  created_at: string
}

export default function CoverLettersPage() {
  const [letters, setLetters] = useState<CoverLetter[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CoverLetter | null>(null)
  const [form, setForm] = useState({ title: "", company: "", position: "", content: "" })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [applications, setApplications] = useState<Array<{ id: string; company: string; position: string }>>([])
  const [resumes, setResumes] = useState<Array<{ id: string; title: string }>>([])
  const [jobPosting, setJobPosting] = useState("")
  const [generatingFromPosting, setGeneratingFromPosting] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const lettersRes = await supabase.from('cover_letters').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      if (!lettersRes.error && lettersRes.data) setLetters(lettersRes.data)
      try {
        const [appsRes, resumesRes] = await Promise.all([
          supabase.from('applications').select('id, company, position').eq('user_id', user.id),
          supabase.from('resumes').select('id, title').eq('user_id', user.id),
        ])
        if (appsRes.data) setApplications(appsRes.data)
        if (resumesRes.data) setResumes(resumesRes.data)
      } catch (_) {}
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const saveLetter = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (editing) {
        const { error } = await supabase.from('cover_letters').update({
          title: form.title,
          company: form.company || null,
          position: form.position || null,
          content: form.content,
          updated_at: new Date().toISOString(),
        }).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('cover_letters').insert({
          user_id: user.id,
          title: form.title,
          company: form.company || null,
          position: form.position || null,
          content: form.content,
        })
        if (error) throw error
      }
      await fetchData()
      closeModal()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const deleteLetter = async (id: string) => {
    try {
      const supabase = createClient()
      await supabase.from('cover_letters').delete().eq('id', id)
      setLetters(letters.filter((l) => l.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setForm({ title: "", company: "", position: "", content: "" })
  }

  const openEdit = (letter: CoverLetter) => {
    setEditing(letter)
    setForm({
      title: letter.title,
      company: letter.company || "",
      position: letter.position || "",
      content: letter.content,
    })
    setShowModal(true)
  }

  const copyContent = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const aiSuggestIntro = () => {
    const company = form.company || "the company"
    const position = form.position || "this role"
    const intro = `I am writing to express my strong interest in the ${position} position at ${company}. With my background and enthusiasm for the industry, I am confident I would be a valuable addition to your team.\n\n`
    setForm((f) => ({ ...f, content: intro + f.content }))
  }

  const generateFromPosting = async () => {
    const text = jobPosting.trim()
    if (!text || text.length < 20) {
      setGenerateError("Paste at least a short job description (e.g. 2–3 sentences).")
      return
    }
    setGenerateError(null)
    setGeneratingFromPosting(true)
    try {
      const res = await fetch("/api/agent/cover-letter-from-posting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobText: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 503) {
          buildDraftFromPostingFallback(text)
          return
        }
        throw new Error(data.error || "Failed to generate")
      }
      setForm((f) => ({
        ...f,
        company: data.company || f.company,
        position: data.title || data.position || f.position,
        title: [data.company, data.title || data.position].filter(Boolean).join(" – ") || f.title,
        content: data.body || f.content,
      }))
      setJobPosting("")
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Something went wrong. Using template draft instead.")
      buildDraftFromPostingFallback(text)
    } finally {
      setGeneratingFromPosting(false)
    }
  }

  function buildDraftFromPostingFallback(jobText: string) {
    const lines = jobText.split(/\n/).map((l) => l.trim()).filter(Boolean)
    let company = form.company || ""
    let position = form.position || ""
    const firstLine = lines[0] || ""
    const atMatch = firstLine.match(/\bat\s+([A-Z][A-Za-z0-9\s&.,]+?)(?:\s*[-–|]|$)/i) || firstLine.match(/@\s*([A-Za-z0-9\s&.]+)/i)
    if (atMatch) company = atMatch[1].trim()
    const titleMatch = firstLine.match(/(?:role|position|job|title)\s*[:\-]\s*([^\n|]+)/i) || firstLine.match(/^([A-Za-z\s]+)\s*(?:at|@)/i)
    if (titleMatch) position = titleMatch[1].trim()
    if (!position && firstLine.length < 80) position = firstLine
    const reqs = jobText.match(/(?:required|qualifications?|requirements?|looking for)[:\s]+([^\n]+)/gi)
    const reqList = reqs?.slice(0, 3).join(" ") || ""
    const draft = `I am writing to apply for the ${position || "position"} at ${company || "your company"}.\n\n${reqList ? `I see you are looking for candidates who have ${reqList.slice(0, 120)}... My experience aligns well with these requirements.\n\n` : ""}I would welcome the opportunity to discuss how I can contribute to your team.\n\nSincerely,\n[Your name]`
    setForm((f) => ({
      ...f,
      company: company || f.company,
      position: position || f.position,
      title: [company, position].filter(Boolean).join(" – ") || f.title,
      content: draft,
    }))
    setJobPosting("")
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Cover Letters</h1>
          <p className="text-muted-foreground">Create and manage tailored cover letters</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-saffron">
          <Plus className="w-4 h-4" />
          New Cover Letter
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {letters.map((letter) => (
          <div key={letter.id} className="card-interactive p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-saffron-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-saffron-500" />
              </div>
              <div className="flex gap-1">
                <button onClick={() => copyContent(letter.content, letter.id)} className="p-2 rounded-lg hover:bg-secondary">
                  {copied === letter.id ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(letter)} className="p-2 rounded-lg hover:bg-secondary"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => deleteLetter(letter.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <h3 className="font-semibold truncate">{letter.title}</h3>
            {(letter.company || letter.position) && (
              <p className="text-sm text-muted-foreground truncate">{[letter.company, letter.position].filter(Boolean).join(" · ")}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{letter.content}</p>
            <p className="text-xs text-muted-foreground mt-3">{new Date(letter.created_at).toLocaleDateString()}</p>
          </div>
        ))}
        <button
          onClick={() => setShowModal(true)}
          className="card-interactive p-6 border-2 border-dashed border-border hover:border-saffron-500/50 flex flex-col items-center justify-center min-h-[200px]"
        >
          <Plus className="w-8 h-8 text-saffron-500 mb-2" />
          <span className="font-medium">New Cover Letter</span>
        </button>
      </div>

      {letters.length === 0 && (
        <div className="card-elevated p-12 text-center">
          <Mail className="w-16 h-16 text-saffron-500/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No cover letters yet</h3>
          <p className="text-muted-foreground mb-6">Create tailored cover letters for each application.</p>
          <button onClick={() => setShowModal(true)} className="btn-saffron">
            <Plus className="w-4 h-4" /> Create Cover Letter
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editing ? "Edit" : "New"} Cover Letter</h2>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-secondary"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveLetter} className="p-6 space-y-4">
              <div className="rounded-xl border border-saffron-500/20 bg-saffron-50/50 dark:bg-saffron-950/20 p-4 space-y-3">
                <label className="block text-sm font-medium text-foreground">Build from job posting</label>
                <p className="text-xs text-muted-foreground">Paste the job description below; we&apos;ll pull company, role, and generate a tailored draft.</p>
                <textarea
                  value={jobPosting}
                  onChange={(e) => { setJobPosting(e.target.value); setGenerateError(null); }}
                  placeholder="Paste full job posting or description here..."
                  className="input-field min-h-[100px] resize-none text-sm"
                  disabled={generatingFromPosting}
                />
                {generateError && <p className="text-xs text-saffron-600">{generateError}</p>}
                <button
                  type="button"
                  onClick={generateFromPosting}
                  disabled={generatingFromPosting || !jobPosting.trim()}
                  className="btn-saffron text-sm disabled:opacity-50"
                >
                  {generatingFromPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generatingFromPosting ? "Generating..." : "Generate cover letter from posting"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="e.g. Acme Corp - PM" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Company</label>
                  <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="input-field" placeholder="Company name" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Position</label>
                  <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="input-field" placeholder="Job title" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Content</label>
                  <button type="button" onClick={aiSuggestIntro} className="text-sm text-saffron-500 hover:text-saffron-600 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> Suggest intro
                  </button>
                </div>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input-field min-h-[280px] resize-none" placeholder="Write your cover letter..." />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 btn-saffron disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? "Save" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
