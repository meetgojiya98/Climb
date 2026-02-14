import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AIOpsBrief } from '@/components/app/ai-ops-brief'
import { AIMissionConsole } from '@/components/app/ai-mission-console'
import { formatRelativeDate } from '@/lib/utils'
import {
  ArrowRight,
  Brain,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'

type RoleApplication = {
  id: string
  status: string | null
  match_score: number | null
  created_at: string | null
}

type RoleRecord = {
  id: string
  title: string | null
  company: string | null
  location: string | null
  created_at: string | null
  parsed: any
  applications?: RoleApplication[]
}

function statusTone(status: string): string {
  switch (status) {
    case 'offer':
      return 'text-green-600 bg-green-500/10'
    case 'interview':
      return 'text-saffron-600 bg-saffron-500/10'
    case 'screening':
      return 'text-purple-600 bg-purple-500/10'
    case 'applied':
      return 'text-blue-600 bg-blue-500/10'
    case 'rejected':
      return 'text-red-600 bg-red-500/10'
    default:
      return 'text-muted-foreground bg-secondary'
  }
}

export default async function RolesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  let roles: RoleRecord[] = []
  const rolesResult = await supabase
    .from('roles')
    .select('id, title, company, location, created_at, parsed, applications(id, status, match_score, created_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!rolesResult.error) {
    roles = (rolesResult.data || []) as RoleRecord[]
  } else {
    const fallback = await supabase
      .from('roles')
      .select('id, title, company, location, created_at, parsed')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    roles = ((fallback.data || []) as RoleRecord[]).map((role) => ({ ...role, applications: [] }))
  }

  const { data: skillsData } = await supabase
    .from('skills')
    .select('name')
    .eq('user_id', user.id)

  const skillSet = new Set((skillsData || []).map((item) => String(item.name || '').trim().toLowerCase()))

  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const flattenedApps = roles.flatMap((role) => role.applications || [])
  const matchScores = flattenedApps
    .map((application) => Number(application.match_score))
    .filter((score) => Number.isFinite(score))
  const avgMatchScore = matchScores.length
    ? Math.round(matchScores.reduce((sum, score) => sum + score, 0) / matchScores.length)
    : 0

  const rolesThisWeek = roles.filter((role) => {
    if (!role.created_at) return false
    return new Date(role.created_at) >= sevenDaysAgo
  }).length

  const parsedRoles = roles.filter((role) => Boolean(role.parsed)).length
  const unparsedRoles = Math.max(0, roles.length - parsedRoles)
  const activePipeline = flattenedApps.filter((app) => !['offer', 'rejected', 'withdrawn'].includes(String(app.status || ''))).length
  const offers = flattenedApps.filter((app) => app.status === 'offer').length
  const rolesWithoutApplications = roles.filter((role) => (role.applications || []).length === 0).length

  const keywordMentions: Record<string, number> = {}
  roles.forEach((role) => {
    const parsed = role.parsed as any
    const keywords = Array.isArray(parsed?.keywords) ? parsed.keywords : []
    keywords.forEach((keyword: string) => {
      const key = String(keyword || '').trim().toLowerCase()
      if (!key) return
      keywordMentions[key] = (keywordMentions[key] || 0) + 1
    })
  })

  const topGaps = Object.entries(keywordMentions)
    .filter(([keyword]) => !skillSet.has(keyword))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const priorityQueue = [...roles]
    .map((role) => {
      const latestApp = (role.applications || []).slice().sort((a, b) => {
        const aDate = new Date(a.created_at || 0).getTime()
        const bDate = new Date(b.created_at || 0).getTime()
        return bDate - aDate
      })[0]

      const match = Number(latestApp?.match_score)
      const hasApp = Boolean(latestApp)
      const scorePenalty = Number.isFinite(match) ? Math.max(0, 100 - match) : 40
      const recencyPenalty = role.created_at ? Math.floor((now.getTime() - new Date(role.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 14
      const executionPenalty = hasApp ? 0 : 25

      return {
        role,
        latestApp,
        priority: scorePenalty * 0.5 + recencyPenalty * 0.3 + executionPenalty,
      }
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6)

  const rolesAiPrompt = [
    'Generate an enterprise roles workspace operating brief.',
    `Roles tracked: ${roles.length}. Parsed: ${parsedRoles}. Unparsed: ${unparsedRoles}.`,
    `Roles added this week: ${rolesThisWeek}.`,
    `Average role match score: ${avgMatchScore}%. Active pipeline linked to roles: ${activePipeline}.`,
    `Roles without linked applications: ${rolesWithoutApplications}.`,
    `Top uncovered keywords: ${topGaps.slice(0, 4).map(([keyword]) => keyword).join(', ') || 'No major gaps detected'}.`,
    'Prioritize role intake quality, parsing coverage, keyword-gap closure, and pipeline conversion impact.',
  ].join(' ')

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Roles Command Workspace</h1>
          <p className="text-muted-foreground">Enterprise pipeline planning for role targeting, quality fit, and execution readiness.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/insights" className="btn-outline">
            <Sparkles className="h-4 w-4" />
            Gap Intelligence
          </Link>
          <Link href="/app/roles/new" className="btn-saffron">
            <Plus className="h-4 w-4" />
            Add Role
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Roles Tracked</span>
            <Briefcase className="h-4 w-4 text-navy-600" />
          </div>
          <div className="text-3xl font-bold">{roles.length}</div>
          <p className="text-xs text-muted-foreground mt-2">{rolesThisWeek} added in last 7 days</p>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Parsed Roles</span>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-3xl font-bold">{parsedRoles}</div>
          <p className="text-xs text-muted-foreground mt-2">{roles.length ? Math.round((parsedRoles / roles.length) * 100) : 0}% parsing coverage</p>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Avg Match</span>
            <Target className="h-4 w-4 text-saffron-500" />
          </div>
          <div className="text-3xl font-bold">{avgMatchScore}%</div>
          <p className="text-xs text-muted-foreground mt-2">Across linked application records</p>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Active Pipeline</span>
            <ClipboardCheck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-3xl font-bold">{activePipeline}</div>
          <p className="text-xs text-muted-foreground mt-2">In applied/screening/interview flow</p>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Offers</span>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-3xl font-bold">{offers}</div>
          <p className="text-xs text-muted-foreground mt-2">Converted outcomes from tracked roles</p>
        </div>
      </div>

      <AIOpsBrief
        surface="roles"
        title="AI Role Targeting Strategist"
        description="Generate a role-intake and fit-gap action ladder with enterprise execution priorities."
        defaultPrompt={rolesAiPrompt}
        prompts={[
          'What role actions should I prioritize in the next 72 hours?',
          'Build a weekly role intake + parsing sprint.',
          'How do I close top role keyword gaps quickly?',
        ]}
      />

      <AIMissionConsole
        surface="roles"
        title="AI Roles Missions"
        description="Run guided role-intelligence missions to improve fit quality and conversion readiness."
        missions={[
          {
            id: 'roles-intake-sprint',
            title: 'Role Intake Sprint',
            objective: 'Add and triage high-fit opportunities with strict quality filters.',
            prompt: 'Create a 5-day role-intake sprint with fit criteria and sequencing.',
            href: '/app/roles/new',
            priority: 'high',
          },
          {
            id: 'roles-parse-coverage',
            title: 'Parsing Coverage Recovery',
            objective: 'Convert all priority unparsed roles into structured requirement records.',
            prompt: 'Build a parsing backlog plan to reach at least 90% structured role coverage.',
            href: '/app/roles',
            priority: 'high',
          },
          {
            id: 'roles-gap-closure',
            title: 'Keyword Gap Closure',
            objective: 'Translate role keyword demand into resume-proofed skill coverage.',
            prompt: 'Give me a role-keyword closure plan tied to resume improvements and impact proofs.',
            href: '/app/resumes',
            priority: 'medium',
          },
          {
            id: 'roles-conversion-lift',
            title: 'Role-to-Offer Lift',
            objective: 'Move role targeting from intake volume to measurable pipeline conversion.',
            prompt: 'Create a role targeting strategy that improves response and interview conversion in 2 weeks.',
            href: '/app/forecast',
            priority: 'medium',
          },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2 card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Priority Queue</h2>
            <span className="text-xs text-muted-foreground">Top roles needing action</span>
          </div>
          {priorityQueue.length === 0 ? (
            <div className="rounded-xl border border-border p-5 text-sm text-muted-foreground">No roles in queue yet. Add your first role to activate the workspace.</div>
          ) : (
            <div className="space-y-2.5">
              {priorityQueue.map(({ role, latestApp }, index) => {
                const status = String(latestApp?.status || 'not started')
                const match = Number(latestApp?.match_score)
                return (
                  <Link
                    key={role.id}
                    href={`/app/roles/${role.id}`}
                    className="block rounded-xl border border-border p-3.5 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-saffron-500/15 text-saffron-700 text-xs font-semibold">{index + 1}</span>
                          <p className="font-medium truncate">{role.title || 'Untitled role'}</p>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{role.company || 'Unknown company'}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className={`rounded-full px-2 py-0.5 capitalize ${statusTone(status)}`}>{status}</span>
                          {Number.isFinite(match) && (
                            <span className="rounded-full px-2 py-0.5 bg-secondary text-muted-foreground">Match {Math.round(match)}%</span>
                          )}
                          <span className="rounded-full px-2 py-0.5 bg-secondary text-muted-foreground">
                            {role.created_at ? formatRelativeDate(role.created_at) : 'Recently added'}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Brain className="h-4 w-4 text-saffron-500" />
            <h2 className="font-semibold">Skill Gap Signals</h2>
          </div>
          {topGaps.length === 0 ? (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-700">
              No high-frequency role keyword gaps detected.
            </div>
          ) : (
            <div className="space-y-3">
              {topGaps.map(([keyword, mentions]) => (
                <div key={keyword}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="capitalize font-medium">{keyword}</span>
                    <span className="text-muted-foreground">{mentions} mentions</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-saffron-500" style={{ width: `${Math.min(100, mentions * 14)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link href="/app/insights" className="inline-flex items-center gap-2 text-sm text-saffron-600 hover:underline mt-4">
            Open deep keyword insights
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">Role Portfolio</h2>
          <div className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Sorted by newest first
          </div>
        </div>

        {roles.length === 0 ? (
          <div className="rounded-xl border border-border p-8 text-center">
            <Plus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No roles yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your first role to unlock enterprise role intelligence.</p>
            <Link href="/app/roles/new" className="btn-saffron">
              <Plus className="h-4 w-4" />
              Add your first role
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {roles.map((role) => {
              const latestApp = (role.applications || []).slice().sort((a, b) => {
                const aDate = new Date(a.created_at || 0).getTime()
                const bDate = new Date(b.created_at || 0).getTime()
                return bDate - aDate
              })[0]

              const status = String(latestApp?.status || 'not started')
              const match = Number(latestApp?.match_score)

              return (
                <Link key={role.id} href={`/app/roles/${role.id}`} className="block rounded-xl border border-border p-4 hover:bg-secondary/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base truncate">{role.title || 'Untitled role'}</h3>
                      <p className="text-sm text-muted-foreground truncate">{role.company || 'Unknown company'}{role.location ? ` • ${role.location}` : ''}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 capitalize ${statusTone(status)}`}>{status}</span>
                        {Number.isFinite(match) && (
                          <span className="rounded-full px-2 py-0.5 bg-secondary text-muted-foreground">Match {Math.round(match)}%</span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 ${role.parsed ? 'bg-green-500/10 text-green-700' : 'bg-secondary text-muted-foreground'}`}>
                          {role.parsed ? 'Parsed' : 'Unparsed'}
                        </span>
                        <span className="rounded-full px-2 py-0.5 bg-secondary text-muted-foreground">
                          {role.created_at ? formatRelativeDate(role.created_at) : 'Recently added'}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
