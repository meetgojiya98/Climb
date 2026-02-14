import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>
      {children}
    </div>
  )
}
