"use client"

import Link from "next/link"
import { AlertTriangle, ArrowRight, RefreshCcw } from "lucide-react"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="card-elevated border border-red-500/20 bg-red-500/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-red-500/10 p-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-red-700">Workspace unavailable</h1>
            <p className="mt-1 text-sm text-red-700/90">
              An unexpected issue blocked this page. You can retry instantly or continue from a stable module.
            </p>
            {error?.digest && (
              <p className="mt-2 text-xs text-red-700/80">Reference: {error.digest}</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => reset()} className="btn-saffron">
            <RefreshCcw className="h-4 w-4" />
            Retry
          </button>
          <Link href="/app/dashboard" className="btn-outline">
            Open Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/app/control-tower" className="btn-outline">
            Open Control Tower
          </Link>
          <Link href="/app/program-office" className="btn-outline">
            Open Program Office
          </Link>
        </div>
      </div>
    </div>
  )
}
