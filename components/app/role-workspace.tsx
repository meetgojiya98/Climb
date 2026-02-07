"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Briefcase,
  MapPin,
  Target,
  Sparkles,
  FileText,
  Mail,
  ClipboardList,
  StickyNote,
  CheckCircle2,
  Circle,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
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

export function RoleWorkspace({ role, application, documents }: RoleWorkspaceProps) {
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const parsed = role.parsed || {}
  const matchScore = application?.match_score
  const currentStep = application?.status || 'draft'

  const handleGeneratePack = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/agent/generate-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: role.id }),
      })

      if (!response.ok) throw new Error('Failed to generate pack')

      const data = await response.json()
      toast.success('Application pack generated!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate pack')
    } finally {
      setGenerating(false)
    }
  }

  const resumeDoc = documents.find(d => d.type === 'resume')
  const coverLetterDoc = documents.find(d => d.type === 'cover_letter')

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Panel: Role Intelligence */}
      <aside className="w-[320px] shrink-0 overflow-y-auto border-r bg-card p-6">
        <Link href="/app/roles">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="space-y-6">
          {/* Header */}
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

          {/* Match Score */}
          {matchScore !== undefined && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Match Score</span>
                <span className="text-2xl font-semibold text-climb">{matchScore}%</span>
              </div>
              <Progress value={matchScore} className="mb-2" />
              <p className="text-xs text-muted-foreground">
                {matchScore >= 80 ? 'Excellent fit!' : matchScore >= 60 ? 'Good fit' : 'Consider strengthening profile'}
              </p>
            </div>
          )}

          <Separator />

          {/* Must-haves */}
          {parsed.mustHaves && parsed.mustHaves.length > 0 && (
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

          {/* Keywords */}
          {parsed.keywords && parsed.keywords.length > 0 && (
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

          {/* Quick Notes */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Quick Notes</h3>
            <Textarea
              placeholder="Add notes about this role..."
              rows={4}
              className="text-sm"
            />
          </div>
        </div>
      </aside>

      {/* Center: Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[900px] px-6 py-8">
          {/* Timeline */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {TIMELINE_STEPS.map((step, index) => {
                  const isComplete = TIMELINE_STEPS.findIndex(s => s.id === currentStep) >= index
                  const isCurrent = step.id === currentStep
                  const Icon = isComplete ? CheckCircle2 : step.icon

                  return (
                    <div key={step.id} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full border-2',
                            isComplete
                              ? 'border-climb bg-climb text-climb-foreground'
                              : 'border-muted bg-background text-muted-foreground'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={cn(
                          'mt-2 text-xs font-medium',
                          isCurrent ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {step.label}
                        </span>
                      </div>
                      {index < TIMELINE_STEPS.length - 1 && (
                        <div className={cn(
                          'mx-2 h-0.5 flex-1',
                          isComplete ? 'bg-climb' : 'bg-muted'
                        )} />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pack">Pack</TabsTrigger>
              <TabsTrigger value="resume">Resume</TabsTrigger>
              <TabsTrigger value="letter">Cover Letter</TabsTrigger>
              <TabsTrigger value="followups">Follow-ups</TabsTrigger>
              <TabsTrigger value="tracker">Tracker</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>What matters most</CardTitle>
                  <CardDescription>Key requirements for this role</CardDescription>
                </CardHeader>
                <CardContent>
                  {parsed.requirements && parsed.requirements.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {parsed.requirements.slice(0, 5).map((req: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <Target className="mt-0.5 h-4 w-4 shrink-0 text-climb" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No requirements parsed yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Responsibilities</CardTitle>
                </CardHeader>
                <CardContent>
                  {parsed.responsibilities && parsed.responsibilities.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {parsed.responsibilities.slice(0, 5).map((resp: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No responsibilities parsed yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pack">
              <Card>
                <CardHeader>
                  <CardTitle>Generate Application Pack</CardTitle>
                  <CardDescription>
                    Create tailored resume, cover letter, and follow-up templates for this role
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!resumeDoc && !coverLetterDoc ? (
                    <div className="flex flex-col items-center py-12">
                      <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="mb-6 text-center text-sm text-muted-foreground">
                        Generate your complete application pack in one click
                      </p>
                      <Button
                        variant="climb"
                        size="lg"
                        onClick={handleGeneratePack}
                        disabled={generating}
                        className="gap-2"
                      >
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
                            <div className="text-sm text-muted-foreground">
                              {documents.length} documents created
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleGeneratePack} disabled={generating}>
                          Regenerate
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
                  <CardDescription>
                    {resumeDoc ? 'Edit and export your tailored resume' : 'Generate a pack to create your resume'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {resumeDoc ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Resume editor and export functionality will be implemented here.
                      </p>
                      <div className="flex gap-3">
                        <Button variant="outline">Export PDF</Button>
                        <Button variant="outline">Export DOCX</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No resume yet. Generate a pack first.</p>
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
                  {coverLetterDoc ? (
                    <div className="space-y-4">
                      <Textarea
                        value={(coverLetterDoc.content as any).body || ''}
                        rows={12}
                        className="font-serif"
                      />
                      <Button variant="outline">Copy to clipboard</Button>
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
                  <CardDescription>Email templates for each stage</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Follow-up templates will appear here after generating a pack.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tracker">
              <Card>
                <CardHeader>
                  <CardTitle>Application Tracker</CardTitle>
                  <CardDescription>Track your progress and next actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Status: <Badge className="ml-2 capitalize">{application?.status || 'draft'}</Badge>
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Right Panel: Agent Dock */}
      <aside className="w-[360px] shrink-0 overflow-y-auto border-l bg-card p-6">
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-climb" />
              Agent Dock
            </h3>
            <p className="text-sm text-muted-foreground">
              AI assistance for this role
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2" size="sm">
              <Sparkles className="h-4 w-4" />
              Improve a bullet
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" size="sm">
              <FileText className="h-4 w-4" />
              Regenerate letter
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" size="sm">
              <Target className="h-4 w-4" />
              Suggest improvements
            </Button>
          </div>

          <Separator />

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Agent chat and streaming responses coming soon.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
