export default function AppLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div className="h-8 w-64 rounded-lg bg-secondary animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card-elevated p-5">
            <div className="h-4 w-24 rounded bg-secondary animate-pulse mb-3" />
            <div className="h-8 w-20 rounded bg-secondary animate-pulse mb-2" />
            <div className="h-3 w-36 rounded bg-secondary animate-pulse" />
          </div>
        ))}
      </div>
      <div className="card-elevated p-5 sm:p-6">
        <div className="h-4 w-44 rounded bg-secondary animate-pulse mb-3" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-3 w-full rounded bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
