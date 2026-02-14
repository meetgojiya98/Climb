"use client"

type TelemetryCategory = "navigation" | "ai" | "funnel" | "workspace" | "security" | "performance"

interface TrackEventInput {
  event: string
  category?: TelemetryCategory
  path?: string
  value?: number
  metadata?: Record<string, any>
  workspaceId?: string
}

export async function trackEvent(input: TrackEventInput) {
  if (typeof window === "undefined") return
  const payload = {
    event: input.event,
    category: input.category || "navigation",
    path: input.path || window.location.pathname,
    value: input.value,
    metadata: input.metadata || {},
    workspaceId: input.workspaceId,
  }

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
      navigator.sendBeacon("/api/telemetry/event", blob)
      return
    }

    await fetch("/api/telemetry/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // best-effort telemetry
  }
}
