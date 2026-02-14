import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Download } from 'lucide-react'
import { formatRelativeDate } from '@/lib/utils'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: documents } = await supabase
    .from('documents')
    .select('*, roles(company, title)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const masterDocs = documents?.filter(d => d.source === 'master') || []
  const tailoredDocs = documents?.filter(d => d.source === 'tailored') || []

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold">Documents</h1>
        <p className="text-muted-foreground">Manage your resumes and cover letters</p>
      </div>

      {/* Master Documents */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Master Documents</h2>
        {masterDocs.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {masterDocs.map((doc) => (
              <Card key={doc.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {formatRelativeDate(doc.created_at)}
                      </p>
                    </div>
                    <Badge variant="secondary">Master</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No master documents yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tailored Documents */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Tailored Documents</h2>
        {tailoredDocs.length > 0 ? (
          <div className="grid gap-4">
            {tailoredDocs.map((doc) => (
              <Card key={doc.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Tailored to {(doc.roles as any)?.company} - {(doc.roles as any)?.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeDate(doc.created_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {doc.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export PDF
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export DOCX
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No tailored documents yet. Generate a pack for a role to create tailored documents.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
