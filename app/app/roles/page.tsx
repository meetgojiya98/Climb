import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'

export default async function RolesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: roles } = await supabase
    .from('roles')
    .select('*, applications(*)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-semibold">Roles</h1>
          <p className="text-muted-foreground">Track and manage your job applications</p>
        </div>
        <Link href="/app/roles/new">
          <Button variant="climb" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Role
          </Button>
        </Link>
      </div>

      {roles && roles.length > 0 ? (
        <div className="grid gap-4">
          {roles.map((role) => {
            const application = role.applications?.[0]
            const matchScore = application?.match_score

            return (
              <Link key={role.id} href={`/app/roles/${role.id}`}>
                <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{role.title}</h3>
                          {matchScore !== undefined && (
                            <Badge 
                              variant={matchScore >= 80 ? 'success' : matchScore >= 60 ? 'warning' : 'secondary'}
                            >
                              {matchScore}% match
                            </Badge>
                          )}
                        </div>
                        <p className="mb-2 text-muted-foreground">{role.company}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {role.location && <span>{role.location}</span>}
                          <span>{formatRelativeDate(role.created_at)}</span>
                          {application && (
                            <Badge variant="outline" className="capitalize">
                              {application.status.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Plus className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No roles yet</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Add your first role to start tailoring applications
            </p>
            <Link href="/app/roles/new">
              <Button variant="climb" size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Add your first role
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
