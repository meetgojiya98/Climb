"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { normalizeResumeContent } from '@/lib/export/normalize-resume'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Mail,
  MapPin,
  Sparkles,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface RoleWorkspaceProps {
  role: any
  application: any
  documents: any[]
}

const TIMELINE_STEPS = [
  { id: 'draft', label: 'Draft', icon: Circle },
  { id: 'tailor', label: 'Tailor', icon: Sparkles },
  { id: 'export', label: 'Export', icon: FileText },
  { id: 'apply', label: 'Apply', icon: Mail },
  { id: 'followup', label: 'Follow-up', icon: ClipboardList },
]

const TRACKER_STATUSES = ['draft', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn']

export function RoleWorkspace({ role, application, documents }: RoleWorkspaceProps) {
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [exporting, setExporting] = useState<'pdf' | 'docx' | null>(null)
  const [savingTracker, setSavingTracker] = useState(false)
  const [improvingBullet, setImprovingBullet] = useState(false)
  const [currentApplication, setCurrentApplication] = useState<any>(application)
  const [nextActionAt, setNextActionAt] = useState(application?.next_action_at?.slice(0, 10) || '')
  const [trackerNotes, setTrackerNotes] = useState(application?.notes || '')
  const [quickNotes, setQuickNotes] = useState('')
  const [bulletText, setBulletText] = useState('')
  const [bulletInstruction, setBulletInstruction] = useState('Emphasize impact and keep it concise')
  const [improvedBullet, setImprovedBullet] = useState('')

  const parsed = role.parsed || {}
  const matchScore = currentApplication?.match_score
  const currentStep = currentApplication?.status || 'draft'

  const resumeDoc = documents.find((doc) => doc.type === 'resume')
  const coverLetterDoc = documents.find((doc) => doc.type === 'cover_letter')

  const normalizedResume = useMemo(() => {
    if (!resumeDoc?.content) return null
    try {
      return normalizeResumeContent(resumeDoc.content)
    } catch {
      return null
    }
  }, [resumeDoc])

  const followupTemplates = useMemo(() => {
    const notes = Array.isArray(currentApplication?.activity_notes) ? currentApplication.activity_notes : []
    const generated = notes.find((entry: any) => entry?.type === 'generated_followups')
    const items = Array.isArray(generated?.items) ? generated.items : []
    return items
  }, [currentApplication])

  const workflowProgressIndex = useMemo(() => {
    let index = 0
    if (resumeDoc || coverLetterDoc) index = 2
    if (['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'].includes(currentStep)) index = 3
    if (['screening', 'interview', 'offer', 'rejected', 'withdrawn'].includes(currentStep)) index = 4
    return index
  }, [coverLetterDoc, currentStep, resumeDoc])

  const handleGeneratePack = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/agent/generate-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: role.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate pack')
      toast.success('Application pack generated')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate pack')
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!resumeDoc?.content) {
      toast.error('Generate a tailored resume first')
      return
    }

    setExporting(format)
    try {
      const response = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume: resumeDoc.content,
          fileName: `${role.company}-${role.title}-resume`,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || `Failed to export ${format.toUpperCase()}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${role.company}-${role.title}-resume.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`${format.toUpperCase()} exported`)
    } catch (error: any) {
      toast.error(error.message || 'Export failed')
    } finally {
      setExporting(null)
    }
  }

  const handleSaveTracker = async (status: string) => {
    if (!currentApplication?.id) return
    setSavingTracker(true)
    try {
      const supabase = createClient()
      const payload: Record<string, any> = {
        status,
        notes: trackerNotes || null,
      }
      if (nextActionAt) payload.next_action_at = new Date(`${nextActionAt}T09:00:00`).toISOString()
      else payload.next_action_at = null

      const { error, data } = await supabase
        .from('applications')
        .update(payload)
        .eq('id', currentApplication.id)
        .select('*')
        .single()

      if (error) throw error
      setCurrentApplication(data)
      toast.success('Tracker updated')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update tracker')
    } finally {
      setSavingTracker(false)
    }
  }

  const handleImproveBullet = async () => {
    if (!bulletText.trim()) {
      toast.error('Paste a bullet first')
      return
    }

    setImprovingBullet(true)
    try {
      const response = await fetch('/api/agent/improve-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullet: bulletText,
          instruction: bulletInstruction,
          context: {
            roleTitle: role.title,
            company: role.company,
          },
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not improve bullet')
      setImprovedBullet(payload.improvedBullet)
      toast.success('Bullet improved')
    } catch (error: any) {
      toast.error(error.message || 'Failed to improve bullet')
    } finally {
      setImprovingBullet(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] overflow-y-auto lg:overflow-hidden">
      <aside className="w-full lg:w-[320px] shrink-0 overflow-visible lg:overflow-y-auto border-b lg:border-b-0 lg:border-r bg-card p-4 sm:p-6">
        <Link href="/app/roles">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="space-y-6">
          <div>
            <h2 className="mb-1 text-xl font-semibold">{role.title}</h2>
            <p className="text-sm text-muted-foreground">{role.company}</p>
            {role.location && (
              <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {role.location}
              </div>
            )}
          </div>

          <Separator />

          {matchScore !== undefined && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Match Score</span>
                <span className="text-2xl font-semibold text-climb">{matchScore}%</span>
              </div>
              <Progress value={matchScore} className="mb-2" />
              <p className="text-xs text-muted-foreground">
                {matchScore >= 80 ? 'Excellent fit' : matchScore >= 60 ? 'Good fit' : 'Needs optimization'}
              </p>
            </div>
          )}

          <Separator />

          {parsed.mustHaves?.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Must-haves</h3>
              <div className="flex flex-wrap gap-2">
                {parsed.mustHaves.slice(0, 8).map((item: string, i: number) => (
                  <Badge key={i} variant="destructive" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {parsed.keywords?.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Key Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {parsed.keywords.slice(0, 10).map((keyword: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold">Quick Notes</h3>
            <Textarea
              value={quickNotes}
              onChange={(event) => setQuickNotes(event.target.value)}
              placeholder="Capture interview prep, talking points, or hiring manager details..."
              rows={4}
              className="text-sm"
            />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-visible lg:overflow-y-auto">
        <div className="mx-auto max-w-[920px] px-4 sm:px-6 py-6 sm:py-8">
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-[600px] items-center justify-between">
                  {TIMELINE_STEPS.map((step, index) => {
                    const isComplete = workflowProgressIndex >= index
                    const isCurrent = workflowProgressIndex === index
                    const Icon = isComplete ? CheckCircle2 : step.icon

                    return (
                      <div key={step.id} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-full border-2',
                              isComplete ? 'border-climb bg-climb text-climb-foreground' : 'border-muted bg-background text-muted-foreground'
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className={cn('mt-2 text-xs font-medium', isCurrent ? 'text-foreground' : 'text-muted-foreground')}>
                            {step.label}
                          </span>
                        </div>
                        {index < TIMELINE_STEPS.length - 1 && (
                          <div className={cn('mx-2 h-0.5 flex-1', isComplete ? 'bg-climb' : 'bg-muted')} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="mb-6 overflow-x-auto">
              <TabsList className="min-w-max">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="pack">Pack</TabsTrigger>
                <TabsTrigger value="resume">Resume</TabsTrigger>
                <TabsTrigger value="letter">Cover Letter</TabsTrigger>
                <TabsTrigger value="followups">Follow-ups</TabsTrigger>
                <TabsTrigger value="tracker">Tracker</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Role Requirements</CardTitle>
                  <CardDescription>High-priority expectations from this posting.</CardDescription>
                </CardHeader>
                <CardContent>
                  {parsed.requirements?.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {parsed.requirements.slice(0, 8).map((requirement: string, index: number) => (
                        <li key={index} className="flex gap-2">
                          <Target className="mt-0.5 h-4 w-4 shrink-0 text-climb" />
                          <span>{requirement}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Parse a richer job description to unlock deeper requirement extraction.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Core Responsibilities</CardTitle>
                </CardHeader>
                <CardContent>
                  {parsed.responsibilities?.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {parsed.responsibilities.slice(0, 8).map((item: string, index: number) => (
                        <li key={index} className="flex gap-2">
                          <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No responsibility breakdown available yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pack">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Application Pack</CardTitle>
                  <CardDescription>Create a role-tailored resume, cover letter, and follow-up templates.</CardDescription>
                </CardHeader>
                <CardContent>
                  {!resumeDoc && !coverLetterDoc ? (
                    <div className="flex flex-col items-center py-12">
                      <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="mb-6 text-center text-sm text-muted-foreground">
                        Generate a full application package in one pass.
                      </p>
                      <Button variant="climb" size="lg" onClick={handleGeneratePack} disabled={generating} className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        {generating ? 'Generating...' : 'Generate Pack'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-climb" />
                          <div>
                            <div className="font-medium">Pack generated</div>
                            <div className="text-sm text-muted-foreground">{documents.length} role document(s) available</div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleGeneratePack} disabled={generating}>
                          {generating ? 'Working...' : 'Regenerate'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resume">
              <Card>
                <CardHeader>
                  <CardTitle>Tailored Resume</CardTitle>
                  <CardDescription>Review and export ATS-safe resume outputs.</CardDescription>
                </CardHeader>
                <CardContent>
                  {normalizedResume ? (
                    <div className="space-y-6">
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={() => handleExport('pdf')} disabled={exporting !== null}>
                          <Download className="h-4 w-4" />
                          {exporting === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
                        </Button>
                        <Button variant="outline" onClick={() => handleExport('docx')} disabled={exporting !== null}>
                          <Download className="h-4 w-4" />
                          {exporting === 'docx' ? 'Exporting DOCX...' : 'Export DOCX'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(normalizedResume, null, 2))
                            toast.success('Resume JSON copied')
                          }}
                        >
                          <Copy className="h-4 w-4" />
                          Copy JSON
                        </Button>
                      </div>

                      <div className="rounded-lg border p-4">
                        <h3 className="font-semibold">{normalizedResume.header.name}</h3>
                        {normalizedResume.headline && <p className="text-sm text-muted-foreground mt-1">{normalizedResume.headline}</p>}
                        <p className="text-sm mt-3">{normalizedResume.summary}</p>
                      </div>

                      {normalizedResume.experience.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Experience</h4>
                          <div className="space-y-3">
                            {normalizedResume.experience.slice(0, 4).map((exp, index) => (
                              <div key={index} className="rounded-lg border p-3">
                                <p className="font-medium">{exp.title} at {exp.company}</p>
                                <p className="text-xs text-muted-foreground">{[exp.startDate, exp.endDate || 'Present'].filter(Boolean).join(' - ')}</p>
                                <ul className="list-disc list-inside text-sm mt-2 space-y-1 text-muted-foreground">
                                  {exp.bullets.slice(0, 2).map((bullet, bulletIndex) => (
                                    <li key={bulletIndex}>{bullet}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tailored resume available yet. Generate a pack first.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="letter">
              <Card>
                <CardHeader>
                  <CardTitle>Cover Letter</CardTitle>
                </CardHeader>
                <CardContent>
                  {coverLetterDoc?.content?.body ? (
                    <div className="space-y-4">
                      {coverLetterDoc.content.subject && (
                        <div className="rounded-lg bg-secondary/40 p-3 text-sm">
                          <span className="font-medium">Subject:</span> {coverLetterDoc.content.subject}
                        </div>
                      )}
                      <Textarea value={coverLetterDoc.content.body} readOnly rows={12} className="font-serif" />
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(coverLetterDoc.content.body)
                          toast.success('Cover letter copied')
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        Copy to clipboard
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No cover letter yet. Generate a pack first.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="followups">
              <Card>
                <CardHeader>
                  <CardTitle>Follow-up Templates</CardTitle>
                  <CardDescription>Generated templates aligned to your role context.</CardDescription>
                </CardHeader>
                <CardContent>
                  {followupTemplates.length > 0 ? (
                    <div className="space-y-4">
                      {followupTemplates.map((template: any, index: number) => (
                        <div key={index} className="rounded-lg border p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <Badge variant="outline" className="capitalize">
                              {String(template.stage || 'follow-up').replace('_', ' ')}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`${template.subject}\n\n${template.body}`)
                                toast.success('Template copied')
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm font-medium mb-1">{template.subject}</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{template.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Follow-up templates will appear here once a pack has been generated.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tracker">
              <Card>
                <CardHeader>
                  <CardTitle>Application Tracker</CardTitle>
                  <CardDescription>Update status, next action date, and notes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {TRACKER_STATUSES.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleSaveTracker(status)}
                        disabled={savingTracker}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs border transition-colors capitalize',
                          currentApplication?.status === status
                            ? 'border-saffron-500 bg-saffron-500/10 text-saffron-700'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Next Action Date</label>
                      <input
                        type="date"
                        value={nextActionAt}
                        onChange={(event) => setNextActionAt(event.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div className="rounded-lg border bg-secondary/30 p-3 text-sm text-muted-foreground flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-saffron-500" />
                      {nextActionAt ? `Next action set for ${new Date(nextActionAt).toLocaleDateString()}` : 'No next action scheduled'}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Application Notes</label>
                    <Textarea
                      value={trackerNotes}
                      onChange={(event) => setTrackerNotes(event.target.value)}
                      rows={5}
                      placeholder="Capture recruiter contacts, call notes, and action items..."
                    />
                  </div>

                  <Button
                    variant="climb"
                    onClick={() => handleSaveTracker(currentApplication?.status || 'draft')}
                    disabled={savingTracker}
                  >
                    {savingTracker ? 'Saving...' : 'Save Tracker Updates'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <aside className="w-full lg:w-[360px] shrink-0 overflow-visible lg:overflow-y-auto border-t lg:border-t-0 lg:border-l bg-card p-4 sm:p-6">
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-climb" />
              Agent Dock
            </h3>
            <p className="text-sm text-muted-foreground">Use focused AI actions to improve your application quality.</p>
          </div>

          <Separator />

          <div className="space-y-3">
            <label className="text-sm font-medium">Resume Bullet</label>
            <Textarea
              value={bulletText}
              onChange={(event) => setBulletText(event.target.value)}
              rows={4}
              placeholder="Paste a bullet to optimize..."
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Instruction</label>
            <input
              value={bulletInstruction}
              onChange={(event) => setBulletInstruction(event.target.value)}
              className="input-field"
              placeholder="e.g. Add measurable outcomes"
            />
          </div>

          <Button
            variant="outline"
            className="w-full justify-center gap-2"
            onClick={handleImproveBullet}
            disabled={improvingBullet}
          >
            <Sparkles className="h-4 w-4" />
            {improvingBullet ? 'Improving...' : 'Improve Bullet'}
          </Button>

          {improvedBullet && (
            <div className="rounded-lg border bg-secondary/30 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Improved Bullet</p>
              <p className="text-sm">{improvedBullet}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  navigator.clipboard.writeText(improvedBullet)
                  toast.success('Improved bullet copied')
                }}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
