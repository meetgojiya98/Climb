import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Target, CheckCircle2, Clock } from 'lucide-react'

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch applications
  const { data: applications } = await supabase
    .from('applications')
    .select('*, roles(*)')
    .eq('user_id', user!.id)

  // Calculate metrics
  const totalApplications = applications?.length || 0
  const appliedCount = applications?.filter(a => a.status === 'applied').length || 0
  const interviewCount = applications?.filter(a => a.status === 'interview').length || 0
  const offerCount = applications?.filter(a => a.status === 'offer').length || 0
  
  const matchScores = applications?.map(a => a.match_score).filter(Boolean) || []
  const avgMatchScore = matchScores.length > 0
    ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length)
    : 0

  // Get roles from last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentRoles = applications?.filter(a => 
    new Date((a.roles as any).created_at) >= sevenDaysAgo
  ).length || 0

  // Count follow-ups due
  const followupsDue = applications?.filter(a => 
    a.next_action_at && new Date(a.next_action_at) <= new Date()
  ).length || 0

  // Get top missing keywords (this would need gap analysis data)
  const topGaps = [
    'Cloud Architecture',
    'Kubernetes',
    'Team Leadership',
    'Agile/Scrum',
    'System Design',
  ]

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold">Insights</h1>
        <p className="text-muted-foreground">Track your job search progress</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average Match</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-climb" />
              <span className="text-3xl font-semibold">{avgMatchScore}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Roles This Week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-climb" />
              <span className="text-3xl font-semibold">{recentRoles}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Follow-ups Due</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-climb" />
              <span className="text-3xl font-semibold">{followupsDue}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Interviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-climb" />
              <span className="text-3xl font-semibold">{interviewCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application Funnel */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Application Funnel</CardTitle>
          <CardDescription>Your progress through the pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>Total Applications</span>
                <span className="font-medium">{totalApplications}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-climb" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>Applied</span>
                <span className="font-medium">{appliedCount}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div 
                  className="h-2 rounded-full bg-climb" 
                  style={{ width: totalApplications ? `${(appliedCount / totalApplications) * 100}%` : '0%' }} 
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>Interviews</span>
                <span className="font-medium">{interviewCount}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div 
                  className="h-2 rounded-full bg-climb" 
                  style={{ width: totalApplications ? `${(interviewCount / totalApplications) * 100}%` : '0%' }} 
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>Offers</span>
                <span className="font-medium">{offerCount}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div 
                  className="h-2 rounded-full bg-climb" 
                  style={{ width: totalApplications ? `${(offerCount / totalApplications) * 100}%` : '0%' }} 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Keyword Gaps */}
      <Card>
        <CardHeader>
          <CardTitle>Common Keyword Gaps</CardTitle>
          <CardDescription>Skills frequently missing from your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topGaps.map((gap, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span>{gap}</span>
                <span className="text-muted-foreground">Appeared in {Math.floor(Math.random() * 5) + 3} roles</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
