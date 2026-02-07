"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { 
  ArrowLeft, 
  Download, 
  Pencil, 
  Trash2, 
  Share2,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  FileText,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Printer,
} from "lucide-react"

interface Resume {
  id: string
  title: string
  target_role: string | null
  content: any
  status: string
  ats_score: number | null
  created_at: string
  updated_at: string
}

interface ATSAnalysis {
  score: number
  strengths: string[]
  improvements: string[]
  keywords: { found: string[], missing: string[] }
  sectionScores?: { section: string; score: number; tip: string }[]
}

export default function ResumeViewPage() {
  const params = useParams()
  const router = useRouter()
  const [resume, setResume] = useState<Resume | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ATSAnalysis | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [jobPostingText, setJobPostingText] = useState("")
  const [jobMatchLoading, setJobMatchLoading] = useState(false)
  const [jobMatchError, setJobMatchError] = useState<string | null>(null)
  const [jobMatchParsed, setJobMatchParsed] = useState<{
    title?: string
    company?: string
    keywords: string[]
    requirements: string[]
    mustHaves: string[]
    responsibilities: string[]
  } | null>(null)

  useEffect(() => {
    fetchResume()
  }, [params.id])

  const fetchResume = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setResume(data)
      
      // Generate mock analysis
      if (data.ats_score) {
        generateAnalysis(data)
      }
    } catch (error) {
      console.error('Error fetching resume:', error)
      router.push('/app/resumes')
    } finally {
      setLoading(false)
    }
  }

  const generateAnalysis = (resume: Resume) => {
    const score = resume.ats_score || Math.floor(Math.random() * 20) + 75
    const content = resume.content || {}
    setAnalysis({
      score,
      strengths: [
        "Clear and professional formatting",
        "Quantified achievements with metrics",
        "Relevant skills section present",
        "Contact information complete",
      ],
      improvements: [
        "Add more industry-specific keywords",
        "Include a professional summary",
        "Expand on recent role achievements",
        "Add relevant certifications if available",
      ],
      keywords: {
        found: ["leadership", "project management", "collaboration", "data analysis"],
        missing: ["agile", "stakeholder management", "strategic planning", "KPIs"],
      },
      sectionScores: [
        { section: "Contact & Header", score: 95, tip: "Keep contact info on one line; use a clear headline." },
        { section: "Professional Summary", score: content.summary ? 82 : 60, tip: content.summary ? "Consider adding 1–2 keywords from the job description." : "Add a 2–3 line summary targeting the role." },
        { section: "Work Experience", score: content.experiences?.length ? 88 : 50, tip: content.experiences?.length ? "Use more action verbs and metrics per bullet." : "Add at least one relevant role with quantified results." },
        { section: "Education", score: content.education?.length ? 85 : 70, tip: "Include GPA if strong; add relevant coursework or projects." },
        { section: "Skills", score: content.skills?.length ? 90 : 55, tip: content.skills?.length ? "Match skill order to the job description." : "Add a skills section with keywords from the job." },
      ],
    })
  }

  const runATSAnalysis = async () => {
    setAnalyzing(true)
    // Simulate AI analysis
    setTimeout(() => {
      const newScore = Math.floor(Math.random() * 15) + 80
      setAnalysis({
        score: newScore,
        strengths: [
          "Clear and professional formatting",
          "Quantified achievements with metrics",
          "Relevant skills section present",
          "Contact information complete",
          "Strong action verbs used",
        ],
        improvements: [
          "Add more industry-specific keywords",
          "Consider adding a summary section",
          "Include measurable outcomes for more roles",
        ],
        keywords: {
          found: ["leadership", "project management", "collaboration", "data analysis", "communication"],
          missing: ["agile", "stakeholder management", "KPIs"],
        }
      })
      setAnalyzing(false)
      
      // Update the resume with new score
      if (resume) {
        const supabase = createClient()
        supabase.from('resumes').update({ ats_score: newScore }).eq('id', resume.id)
        setResume({ ...resume, ats_score: newScore })
      }
    }, 2000)
  }

  const handleDelete = async () => {
    if (!resume) return
    try {
      const supabase = createClient()
      await supabase.from('resumes').delete().eq('id', resume.id)
      router.push('/app/resumes')
    } catch (error) {
      console.error('Error deleting resume:', error)
    }
  }

  const analyzeJobPosting = async () => {
    const text = jobPostingText.trim()
    if (!text || text.length < 20) {
      setJobMatchError("Paste at least a short job description (e.g. 2–3 sentences).")
      return
    }
    setJobMatchError(null)
    setJobMatchLoading(true)
    setJobMatchParsed(null)
    try {
      const res = await fetch("/api/agent/parse-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobText: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to analyze")
      const p = data.parsed || {}
      setJobMatchParsed({
        title: p.title,
        company: p.company,
        keywords: Array.isArray(p.keywords) ? p.keywords : [],
        requirements: Array.isArray(p.requirements) ? p.requirements : [],
        mustHaves: Array.isArray(p.mustHaves) ? p.mustHaves : [],
        responsibilities: Array.isArray(p.responsibilities) ? p.responsibilities : [],
      })
    } catch (e) {
      setJobMatchError(e instanceof Error ? e.message : "Could not analyze job posting.")
    } finally {
      setJobMatchLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (!resume?.content) return
    const text = formatResumeAsText(resume.content)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatResumeAsText = (content: any) => {
    let text = ""
    if (content.personalInfo) {
      const p = content.personalInfo
      text += `${p.fullName || ''}\n`
      text += `${p.email || ''} | ${p.phone || ''}\n`
      text += `${p.location || ''}\n\n`
    }
    if (content.summary) {
      text += `SUMMARY\n${content.summary}\n\n`
    }
    if (content.experiences?.length) {
      text += `EXPERIENCE\n`
      content.experiences.forEach((exp: any) => {
        text += `${exp.title} at ${exp.company}\n`
        text += `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}\n`
        text += `${exp.description}\n\n`
      })
    }
    if (content.education?.length) {
      text += `EDUCATION\n`
      content.education.forEach((edu: any) => {
        text += `${edu.degree} in ${edu.field}\n`
        text += `${edu.school} - ${edu.graduationDate}\n\n`
      })
    }
    if (content.skills?.length) {
      text += `SKILLS\n${content.skills.join(', ')}\n`
    }
    return text
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
      </div>
    )
  }

  if (!resume) {
    return (
      <div className="p-6 lg:p-8 text-center">
        <p className="text-muted-foreground">Resume not found</p>
      </div>
    )
  }

  const content = resume.content || {}

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/app/resumes" className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{resume.title}</h1>
            {resume.target_role && (
              <p className="text-muted-foreground">Target: {resume.target_role}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={copyToClipboard} className="btn-outline">
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-outline"
          >
            <Printer className="w-4 h-4" />
            Save as PDF
          </button>
          <Link href={`/app/resumes/${resume.id}/edit`} className="btn-outline">
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
          <button onClick={() => setShowDeleteConfirm(true)} className="btn-outline text-red-500 hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Resume Preview */}
        <div className="lg:col-span-2">
          <div className="card-elevated p-8">
            {/* Personal Info */}
            {content.personalInfo && (
              <div className="mb-6 pb-6 border-b border-border">
                <h2 className="text-2xl font-bold">{content.personalInfo.fullName}</h2>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  {content.personalInfo.email && <span>{content.personalInfo.email}</span>}
                  {content.personalInfo.phone && <span>• {content.personalInfo.phone}</span>}
                  {content.personalInfo.location && <span>• {content.personalInfo.location}</span>}
                </div>
              </div>
            )}

            {/* Summary */}
            {content.summary && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Professional Summary</h3>
                <p className="text-muted-foreground">{content.summary}</p>
              </div>
            )}

            {/* Experience */}
            {content.experiences?.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-4">Work Experience</h3>
                <div className="space-y-4">
                  {content.experiences.map((exp: any, i: number) => (
                    <div key={i} className="pl-4 border-l-2 border-saffron-500/30">
                      <div className="font-medium">{exp.title}</div>
                      <div className="text-sm text-saffron-600">{exp.company}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                      </div>
                      {exp.description && (
                        <p className="text-sm text-muted-foreground mt-2">{exp.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {content.education?.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-4">Education</h3>
                <div className="space-y-3">
                  {content.education.map((edu: any, i: number) => (
                    <div key={i}>
                      <div className="font-medium">{edu.degree} in {edu.field}</div>
                      <div className="text-sm text-muted-foreground">{edu.school}</div>
                      <div className="text-xs text-muted-foreground">{edu.graduationDate}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {content.skills?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {content.skills.map((skill: string, i: number) => (
                    <span key={i} className="px-3 py-1 rounded-full text-sm bg-secondary">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!content.personalInfo && !content.summary && !content.experiences?.length && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">This resume is empty</p>
                <Link href={`/app/resumes/${resume.id}/edit`} className="btn-saffron">
                  <Pencil className="w-4 h-4" />
                  Add Content
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ATS Analysis Sidebar */}
        <div className="space-y-6">
          {/* ATS Score Card */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">ATS Analysis</h3>
              <button 
                onClick={runATSAnalysis}
                disabled={analyzing}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {analysis ? (
              <>
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-secondary"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(analysis.score / 100) * 352} 352`}
                        className={analysis.score >= 80 ? 'text-green-500' : analysis.score >= 60 ? 'text-saffron-500' : 'text-red-500'}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold">{analysis.score}</div>
                        <div className="text-xs text-muted-foreground">ATS Score</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-xl mb-4 ${
                  analysis.score >= 80 ? 'bg-green-500/10 text-green-600' : 
                  analysis.score >= 60 ? 'bg-saffron-500/10 text-saffron-600' : 
                  'bg-red-500/10 text-red-600'
                }`}>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {analysis.score >= 80 ? (
                      <><CheckCircle className="w-4 h-4" /> Great! Your resume is well optimized</>
                    ) : analysis.score >= 60 ? (
                      <><TrendingUp className="w-4 h-4" /> Good, but there&apos;s room for improvement</>
                    ) : (
                      <><AlertTriangle className="w-4 h-4" /> Needs significant improvements</>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <button onClick={runATSAnalysis} className="btn-saffron">
                  <Sparkles className="w-4 h-4" />
                  Run AI Analysis
                </button>
              </div>
            )}
          </div>

          {/* Match to job posting */}
          <div className="card-elevated p-6">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-saffron-500" />
              Match to job posting
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Paste a job description to see keywords and requirements to add to your resume.
            </p>
            <textarea
              value={jobPostingText}
              onChange={(e) => { setJobPostingText(e.target.value); setJobMatchError(null); }}
              placeholder="Paste job description here..."
              className="input-field min-h-[80px] resize-none text-sm mb-3"
              disabled={jobMatchLoading}
            />
            {jobMatchError && <p className="text-xs text-red-500 mb-2">{jobMatchError}</p>}
            <button
              type="button"
              onClick={analyzeJobPosting}
              disabled={jobMatchLoading || !jobPostingText.trim()}
              className="btn-saffron w-full text-sm disabled:opacity-50"
            >
              {jobMatchLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <Sparkles className="w-4 h-4 mx-auto" />}
              {jobMatchLoading ? "Analyzing..." : "Analyze job & get keywords"}
            </button>
            {jobMatchParsed && (
              <div className="mt-4 pt-4 border-t border-border space-y-4">
                {(jobMatchParsed.title || jobMatchParsed.company) && (
                  <div className="text-sm">
                    <span className="font-medium">{[jobMatchParsed.title, jobMatchParsed.company].filter(Boolean).join(" at ")}</span>
                  </div>
                )}
                {jobMatchParsed.keywords.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-foreground mb-1">Keywords to add to Skills / Summary</div>
                    <div className="flex flex-wrap gap-1">
                      {jobMatchParsed.keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-xs bg-saffron-500/15 text-saffron-700 dark:text-saffron-300">
                          {kw}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Add these to your resume skills or summary for better ATS match.</p>
                  </div>
                )}
                {(jobMatchParsed.requirements.length > 0 || jobMatchParsed.mustHaves.length > 0) && (
                  <div>
                    <div className="text-xs font-medium text-foreground mb-1">Requirements to address</div>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                      {[...jobMatchParsed.mustHaves, ...jobMatchParsed.requirements].slice(0, 8).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">Mention these in experience bullets or summary where relevant.</p>
                  </div>
                )}
                {jobMatchParsed.responsibilities.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-foreground mb-1">Key responsibilities</div>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                      {jobMatchParsed.responsibilities.slice(0, 5).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Link href={`/app/resumes/${resume.id}/edit`} className="inline-flex items-center gap-1 text-xs font-medium text-saffron-600 hover:underline">
                  <Pencil className="w-3 h-3" />
                  Edit resume to add these
                </Link>
              </div>
            )}
          </div>

          {/* Strengths */}
          {analysis && (
            <div className="card-elevated p-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Strengths
              </h4>
              <ul className="space-y-2">
                {analysis.strengths.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {analysis && (
            <div className="card-elevated p-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-saffron-500" />
                Suggested Improvements
              </h4>
              <ul className="space-y-2">
                {analysis.improvements.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-saffron-500 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section-by-section ATS breakdown */}
          {analysis?.sectionScores && analysis.sectionScores.length > 0 && (
            <div className="card-elevated p-6">
              <h4 className="font-semibold mb-3">Section score breakdown</h4>
              <div className="space-y-3">
                {analysis.sectionScores.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{s.section}</span>
                      <span className={s.score >= 80 ? 'text-green-500' : s.score >= 60 ? 'text-saffron-500' : 'text-red-500'}>{s.score}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.score >= 80 ? 'bg-green-500' : s.score >= 60 ? 'bg-saffron-500' : 'bg-red-500'}`} style={{ width: `${s.score}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords */}
          {analysis && (
            <div className="card-elevated p-6">
              <h4 className="font-semibold mb-3">Keyword Analysis</h4>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-green-500 mb-2">Found Keywords</div>
                  <div className="flex flex-wrap gap-1">
                    {analysis.keywords.found.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-600">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-saffron-500 mb-2">Consider Adding</div>
                  <div className="flex flex-wrap gap-1">
                    {analysis.keywords.missing.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-xs bg-saffron-500/10 text-saffron-600">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-background rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Delete Resume?</h3>
            <p className="text-muted-foreground mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn-outline">
                Cancel
              </button>
              <button 
                onClick={handleDelete}
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
