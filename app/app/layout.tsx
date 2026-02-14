import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app/app-shell'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/signin')
    }
    return <AppShell>{children}</AppShell>
  } catch (err) {
    console.error('App layout auth error:', err)
    redirect('/signin')
  }
}
