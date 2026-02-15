export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8">
      {children}
    </div>
  )
}
