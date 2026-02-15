import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "enterprise-auth-stack"

const SsoProviderSchema = z.object({
  name: z.string().min(2).max(80),
  protocol: z.enum(["saml", "oidc"]),
  metadataUrl: z.string().url().max(600),
})

const PoliciesSchema = z.object({
  enforceMfa: z.boolean(),
  sessionHours: z.number().min(1).max(168),
  retentionDays: z.number().min(7).max(3650),
  ipAllowlist: z.array(z.string().min(3).max(120)).max(100),
})

const RequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("addSsoProvider"), payload: SsoProviderSchema }),
  z.object({
    action: z.literal("toggleSsoProvider"),
    payload: z.object({ providerId: z.string().min(1), enabled: z.boolean() }),
  }),
  z.object({
    action: z.literal("configureScim"),
    payload: z.object({
      enabled: z.boolean(),
      endpoint: z.string().url().optional(),
      token: z.string().min(8).max(200).optional(),
    }),
  }),
  z.object({ action: z.literal("updatePolicies"), payload: PoliciesSchema }),
  z.object({
    action: z.literal("provisionUser"),
    payload: z.object({
      email: z.string().email(),
      role: z.enum(["owner", "admin", "editor", "viewer"]).default("viewer"),
      workspaceId: z.string().max(120).optional(),
    }),
  }),
])

type AuthState = {
  ssoProviders: Array<{
    id: string
    name: string
    protocol: "saml" | "oidc"
    metadataUrl: string
    enabled: boolean
    createdAt: string
  }>
  scim: {
    enabled: boolean
    endpoint: string | null
    tokenLast4: string | null
    lastProvisionedAt: string | null
  }
  policies: {
    enforceMfa: boolean
    sessionHours: number
    retentionDays: number
    ipAllowlist: string[]
  }
  provisioningLog: Array<{
    id: string
    email: string
    role: "owner" | "admin" | "editor" | "viewer"
    workspaceId: string | null
    createdAt: string
  }>
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function defaultState(): AuthState {
  return {
    ssoProviders: [],
    scim: {
      enabled: false,
      endpoint: null,
      tokenLast4: null,
      lastProvisionedAt: null,
    },
    policies: {
      enforceMfa: true,
      sessionHours: 24,
      retentionDays: 365,
      ipAllowlist: [],
    },
    provisioningLog: [],
  }
}

function sanitizeState(input: unknown): AuthState {
  if (!input || typeof input !== "object") return defaultState()
  const payload = input as Record<string, unknown>

  const ssoProviders = Array.isArray(payload.ssoProviders)
    ? payload.ssoProviders
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const value = item as Record<string, unknown>
          const protocol = value.protocol === "saml" || value.protocol === "oidc" ? value.protocol : null
          if (!protocol || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.metadataUrl !== "string") return null
          return {
            id: value.id,
            name: value.name,
            protocol,
            metadataUrl: value.metadataUrl,
            enabled: value.enabled !== false,
            createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
          }
        })
        .filter((item): item is AuthState["ssoProviders"][number] => Boolean(item))
        .slice(-20)
    : []

  const scimRaw = (payload.scim || {}) as Record<string, unknown>
  const policiesRaw = (payload.policies || {}) as Record<string, unknown>

  const provisioningLog = Array.isArray(payload.provisioningLog)
    ? payload.provisioningLog
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const value = item as Record<string, unknown>
          const role = value.role === "owner" || value.role === "admin" || value.role === "editor" ? value.role : "viewer"
          if (typeof value.id !== "string" || typeof value.email !== "string") return null
          return {
            id: value.id,
            email: value.email,
            role,
            workspaceId: typeof value.workspaceId === "string" ? value.workspaceId : null,
            createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
          }
        })
        .filter((item): item is AuthState["provisioningLog"][number] => Boolean(item))
        .slice(-200)
    : []

  return {
    ssoProviders,
    scim: {
      enabled: scimRaw.enabled === true,
      endpoint: typeof scimRaw.endpoint === "string" ? scimRaw.endpoint : null,
      tokenLast4: typeof scimRaw.tokenLast4 === "string" ? scimRaw.tokenLast4 : null,
      lastProvisionedAt: safeIso(typeof scimRaw.lastProvisionedAt === "string" ? scimRaw.lastProvisionedAt : null),
    },
    policies: {
      enforceMfa: policiesRaw.enforceMfa !== false,
      sessionHours: Math.max(1, Math.min(168, Math.round(Number(policiesRaw.sessionHours || 24)))),
      retentionDays: Math.max(7, Math.min(3650, Math.round(Number(policiesRaw.retentionDays || 365)))),
      ipAllowlist: Array.isArray(policiesRaw.ipAllowlist)
        ? policiesRaw.ipAllowlist.filter((item): item is string => typeof item === "string").slice(0, 100)
        : [],
    },
    provisioningLog,
  }
}

function securityScore(state: AuthState) {
  let score = 40
  if (state.policies.enforceMfa) score += 18
  if (state.ssoProviders.some((provider) => provider.enabled)) score += 16
  if (state.scim.enabled && state.scim.endpoint) score += 14
  if (state.policies.sessionHours <= 24) score += 6
  if (state.policies.ipAllowlist.length > 0) score += 6
  return Math.min(100, score)
}

async function readState(supabase: any, userId: string) {
  return loadModuleState<AuthState>(supabase, userId, STORAGE_KEY, defaultState(), sanitizeState)
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`enterprise-auth:get:${getClientIp(request)}`, 80, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await readState(supabase, user.id)
    return ok({ success: true, state: module.state, securityScore: securityScore(module.state) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load auth stack"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`enterprise-auth:post:${getClientIp(request)}`, 50, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, RequestSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await readState(supabase, user.id)
    const state = module.state
    const now = new Date().toISOString()
    let nextState = state

    if (body.action === "addSsoProvider") {
      nextState = {
        ...state,
        ssoProviders: [
          ...state.ssoProviders,
          {
            id: generateId("sso"),
            name: body.payload.name,
            protocol: body.payload.protocol,
            metadataUrl: body.payload.metadataUrl,
            enabled: true,
            createdAt: now,
          },
        ].slice(-20),
      }
    }

    if (body.action === "toggleSsoProvider") {
      nextState = {
        ...state,
        ssoProviders: state.ssoProviders.map((provider) =>
          provider.id === body.payload.providerId
            ? { ...provider, enabled: body.payload.enabled }
            : provider
        ),
      }
    }

    if (body.action === "configureScim") {
      nextState = {
        ...state,
        scim: {
          ...state.scim,
          enabled: body.payload.enabled,
          endpoint: body.payload.endpoint ?? state.scim.endpoint,
          tokenLast4: body.payload.token ? body.payload.token.slice(-4) : state.scim.tokenLast4,
          lastProvisionedAt: state.scim.lastProvisionedAt,
        },
      }
    }

    if (body.action === "updatePolicies") {
      nextState = {
        ...state,
        policies: body.payload,
      }
    }

    if (body.action === "provisionUser") {
      nextState = {
        ...state,
        scim: {
          ...state.scim,
          lastProvisionedAt: now,
        },
        provisioningLog: [
          ...state.provisioningLog,
          {
            id: generateId("provision"),
            email: body.payload.email,
            role: body.payload.role,
            workspaceId: body.payload.workspaceId || null,
            createdAt: now,
          },
        ].slice(-200),
      }
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)
    return ok({ success: true, state: nextState, securityScore: securityScore(nextState) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update auth stack"
    return fail(message, 500)
  }
}
