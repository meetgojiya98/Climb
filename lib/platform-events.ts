import { z } from "zod"

export const TelemetryEventSchema = z.object({
  event: z.string().min(2).max(120),
  category: z.enum(["navigation", "ai", "funnel", "workspace", "security", "performance"]).default("navigation"),
  path: z.string().min(1).max(260).optional(),
  value: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  workspaceId: z.string().uuid().optional(),
})

export type TelemetryEventInput = z.infer<typeof TelemetryEventSchema>

function isMissingRelationError(message: string): boolean {
  const text = message.toLowerCase()
  return (
    text.includes("does not exist") ||
    text.includes("relation") ||
    text.includes("column") ||
    text.includes("schema cache") ||
    text.includes("could not find the table") ||
    text.includes("not found in the schema cache")
  )
}

export async function writeAuditEvent(
  supabase: any,
  payload: {
    userId: string
    workspaceId?: string | null
    eventType: string
    severity?: "info" | "warning" | "critical"
    metadata?: Record<string, any>
    ipAddress?: string | null
    userAgent?: string | null
  }
) {
  const result = await supabase.from("audit_events").insert({
    user_id: payload.userId,
    workspace_id: payload.workspaceId || null,
    event_type: payload.eventType,
    severity: payload.severity || "info",
    metadata: payload.metadata || {},
    ip_address: payload.ipAddress || null,
    user_agent: payload.userAgent || null,
  })

  if (result.error && !isMissingRelationError(String(result.error.message || ""))) {
    throw result.error
  }
}

export async function writeWorkspaceActivity(
  supabase: any,
  payload: {
    workspaceId: string
    actorUserId: string
    eventType: string
    entityType?: string | null
    entityId?: string | null
    payload?: Record<string, any>
  }
) {
  const result = await supabase.from("workspace_activity_events").insert({
    workspace_id: payload.workspaceId,
    actor_user_id: payload.actorUserId,
    event_type: payload.eventType,
    entity_type: payload.entityType || null,
    entity_id: payload.entityId || null,
    payload: payload.payload || {},
  })

  if (result.error && !isMissingRelationError(String(result.error.message || ""))) {
    throw result.error
  }
}

export async function writeSecurityAnomaly(
  supabase: any,
  payload: {
    userId: string
    anomalyType: string
    severity?: "low" | "medium" | "high"
    source?: string
    context?: Record<string, any>
  }
) {
  const result = await supabase.from("security_anomalies").insert({
    user_id: payload.userId,
    anomaly_type: payload.anomalyType,
    severity: payload.severity || "medium",
    source: payload.source || "api",
    context: payload.context || {},
    resolved: false,
  })

  if (result.error && !isMissingRelationError(String(result.error.message || ""))) {
    throw result.error
  }
}
