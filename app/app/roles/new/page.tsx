"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function NewRolePage() {
  const [jobText, setJobText] = useState('')
  const [company, setCompany] = useState('')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parsed, setParsed] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleParse = async () => {
    if (!jobText.trim()) {
      toast.error('Please paste a job description')
      return
    }

    setParsing(true)
    try {
      const response = await fetch('/api/agent/parse-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobText }),
      })

      if (!response.ok) throw new Error('Failed to parse job')

      const data = await response.json()
      setParsed(data.parsed)
      
      // Auto-fill fields if parsed
      if (data.parsed.company && !company) setCompany(data.parsed.company)
      if (data.parsed.title && !title) setTitle(data.parsed.title)
      if (data.parsed.location && !location) setLocation(data.parsed.location)

      toast.success('Job parsed successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse job')
    } finally {
      setParsing(false)
    }
  }

  const handleSave = async () => {
    if (!company.trim() || !title.trim() || !jobText.trim()) {
      toast.error('Please fill in company, title, and job description')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create role
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .insert({
          user_id: user.id,
          company,
          title,
          location: location || null,
          job_text: jobText,
          parsed: parsed || null,
        })
        .select()
        .single()

      if (roleError) throw roleError

      // Create draft application
      const { error: appError } = await supabase
        .from('applications')
        .insert({
          user_id: user.id,
          role_id: role.id,
          status: 'draft',
        })

      if (appError) throw appError

      toast.success('Role created!')
      router.push(`/app/roles/${role.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create role')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <Link href="/app/roles">
          <Button variant="ghost" size="sm" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to roles
          </Button>
        </Link>
        <h1 className="text-3xl font-semibold">Add a new role</h1>
        <p className="text-muted-foreground">Paste a job description to get started</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Input */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>Fill in manually or paste the job description below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  placeholder="Senior Software Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="San Francisco, CA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
              <CardDescription>Paste the full job posting</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste the job description here..."
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                rows={16}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleParse}
              disabled={parsing || !jobText.trim()}
              className="flex-1 gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {parsing ? 'Parsing...' : 'Parse Job'}
            </Button>
            <Button
              variant="climb"
              onClick={handleSave}
              disabled={saving || !company.trim() || !title.trim()}
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save Role'}
            </Button>
          </div>
        </div>

        {/* Right: Preview */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>Parsed requirements and keywords</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {parsing ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : parsed ? (
                <>
                  {parsed.mustHaves && parsed.mustHaves.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Must-haves</h3>
                      <div className="flex flex-wrap gap-2">
                        {parsed.mustHaves.map((item: string, i: number) => (
                          <Badge key={i} variant="destructive">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsed.niceToHaves && parsed.niceToHaves.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Nice-to-haves</h3>
                      <div className="flex flex-wrap gap-2">
                        {parsed.niceToHaves.map((item: string, i: number) => (
                          <Badge key={i} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsed.keywords && parsed.keywords.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Keywords</h3>
                      <div className="flex flex-wrap gap-2">
                        {parsed.keywords.slice(0, 15).map((keyword: string, i: number) => (
                          <Badge key={i} variant="outline">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsed.responsibilities && parsed.responsibilities.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Key Responsibilities</h3>
                      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                        {parsed.responsibilities.slice(0, 5).map((resp: string, i: number) => (
                          <li key={i}>{resp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click &quot;Parse Job&quot; to analyze the description
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
