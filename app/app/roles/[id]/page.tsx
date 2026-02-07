import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RoleWorkspace } from '@/components/app/role-workspace'

export default async function RolePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: role } = await supabase
    .from('roles')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .single()

  if (!role) {
    notFound()
  }

  const { data: application } = await supabase
    .from('applications')
    .select('*')
    .eq('role_id', params.id)
    .eq('user_id', user!.id)
    .single()

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('role_id', params.id)
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <RoleWorkspace
      role={role}
      application={application}
      documents={documents || []}
    />
  )
}
