import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ApiContractError, fail, ok, parseJsonBody } from "@/lib/api-contract"
import { TelemetryEventSchema, writeAuditEvent, writeWorkspaceActivity } from "@/lib/platform-events"
import { checkRateLimit } from "@/lib/request-guard"

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0"
  )
}

export async function POST(request: NextRequest) {
  const ipAddress = getClientIp(request)
  const guard = checkRateLimit(`telemetry:${ipAddress}`, 120, 60_000)
  if (!guard.allowed) {
    return fail("Rate limit exceeded", 429, { resetAt: guard.resetAt })
  }

  try {
    const payload = await parseJsonBody(request, TelemetryEventSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await writeAuditEvent(supabase, {
        userId: user.id,
        workspaceId: payload.workspaceId || null,
        eventType: `telemetry.${payload.category}.${payload.event}`,
        metadata: {
          path: payload.path || null,
          value: payload.value ?? null,
          metadata: payload.metadata || {},
        },
        ipAddress,
        userAgent: request.headers.get("user-agent"),
      })

      if (payload.workspaceId) {
        await writeWorkspaceActivity(supabase, {
          workspaceId: payload.workspaceId,
          actorUserId: user.id,
          eventType: payload.event,
          entityType: "telemetry",
          payload: {
            category: payload.category,
            path: payload.path || null,
            value: payload.value ?? null,
          },
        })
      }
    }

    return ok({ success: true, remaining: guard.remaining })
  } catch (error) {
    if (error instanceof ApiContractError) {
      return fail(error.message, error.status)
    }
    const message = error instanceof Error ? error.message : "Telemetry event failed"
    return fail(message, 500)
  }
}
