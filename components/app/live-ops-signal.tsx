"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { trackEvent } from "@/lib/telemetry-client"

type RealtimeStatus = "connecting" | "live" | "paused"

interface LiveOpsSignalProps {
  surface: "control-tower" | "forecast" | "horizons"
  className?: string
}

export function LiveOpsSignal({ surface, className }: LiveOpsSignalProps) {
  const [status, setStatus] = useState<RealtimeStatus>("connecting")
  const [eventCount, setEventCount] = useState(0)
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null)
  const [lastType, setLastType] = useState<string>("none")

  useEffect(() => {
    let active = true
    let channel: any = null
    const supabase = createClient()

    const initialize = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!active || !user) {
          setStatus("paused")
          return
        }

        channel = supabase
          .channel(`live-ops-${surface}-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "applications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload: any) => {
              if (!active) return
              setStatus("live")
              setEventCount((count) => count + 1)
              setLastEventAt(new Date())
              setLastType(String(payload.eventType || "change").toLowerCase())
              void trackEvent({
                event: "realtime.application_change",
                category: "workspace",
                metadata: {
                  surface,
                  eventType: payload.eventType,
                  table: payload.table,
                },
              })
            }
          )
          .subscribe((nextStatus: string) => {
            if (!active) return
            if (nextStatus === "SUBSCRIBED") setStatus("live")
            else if (nextStatus === "CLOSED" || nextStatus === "CHANNEL_ERROR") setStatus("paused")
            else setStatus("connecting")
          })
      } catch {
        if (active) setStatus("paused")
      }
    }

    void initialize()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [surface])

  const statusLabel = useMemo(() => {
    if (status === "live") return "Live"
    if (status === "connecting") return "Connecting"
    return "Paused"
  }, [status])

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-xl border border-border bg-background/85 px-3 py-2 text-xs",
        className
      )}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          status === "live" ? "bg-green-500 animate-pulse" : status === "connecting" ? "bg-saffron-500" : "bg-muted-foreground"
        )}
      />
      <span className="font-medium">Ops Stream: {statusLabel}</span>
      <span className="text-muted-foreground">
        {eventCount} update{eventCount === 1 ? "" : "s"}
      </span>
      <span className="text-muted-foreground inline-flex items-center gap-1">
        {status === "connecting" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
        {lastEventAt ? `${lastType} ${lastEventAt.toLocaleTimeString()}` : "waiting"}
      </span>
    </div>
  )
}
