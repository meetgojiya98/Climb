import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch global and user templates
  const { data: templates } = await supabase
    .from('template_library')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${user!.id}`)
    .not('name', 'like', 'workspace-registry::%')
    .order('created_at', { ascending: false })

  const followupTemplates = templates?.filter(t => t.type === 'followup') || []
  const bulletTemplates = templates?.filter(t => t.type === 'bullet_style') || []
  const toneTemplates = templates?.filter(t => t.type === 'tone') || []

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold">Templates</h1>
        <p className="text-muted-foreground">Pre-built templates for your job search</p>
      </div>

      {/* Follow-up Templates */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Follow-up Email Templates</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {followupTemplates.map((template) => {
            const content = typeof template.content === 'string' 
              ? JSON.parse(template.content)
              : template.content
            
            return (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {!template.user_id && <Badge variant="secondary">Global</Badge>}
                  </div>
                  <CardDescription className="text-xs">
                    Subject: {content.subject || 'N/A'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {content.body}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Bullet Style Templates */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Bullet Style Formulas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {bulletTemplates.map((template) => {
            const content = typeof template.content === 'string' 
              ? JSON.parse(template.content)
              : template.content
            
            return (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription>{content.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm italic text-muted-foreground">
                    Example: {content.example}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Tone Presets */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Writing Tone Presets</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {toneTemplates.map((template) => {
            const content = typeof template.content === 'string' 
              ? JSON.parse(template.content)
              : template.content
            
            return (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription>{content.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {content.guidelines}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
