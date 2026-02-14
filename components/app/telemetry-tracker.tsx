"use client"

import { useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useReportWebVitals } from "next/web-vitals"
import { trackEvent } from "@/lib/telemetry-client"

export function TelemetryTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return
    const fullPath = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`
    if (lastPathRef.current === fullPath) return
    lastPathRef.current = fullPath
    void trackEvent({
      event: "page_view",
      category: "navigation",
      path: fullPath,
    })
  }, [pathname, searchParams])

  useReportWebVitals((metric) => {
    void trackEvent({
      event: "web_vital",
      category: "performance",
      path: pathname || "/",
      value: typeof metric.value === "number" ? Number(metric.value.toFixed(2)) : undefined,
      metadata: {
        name: metric.name,
        id: metric.id,
        label: metric.label,
      },
    })
  })

  return null
}
