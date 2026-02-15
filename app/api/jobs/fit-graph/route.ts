import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"
const STORAGE_KEY = "jobs-fit-graph"

const RoleInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2).max(160),
  company: z.string().min(1).max(120).optional(),
  location: z.string().max(120).optional(),
  salaryRange: z.string().max(120).optional(),
  skills: z.array(z.string().min(1).max(60)).max(30).optional(),
})

const RequestSchema = z.object({
  profile: z.object({
    skills: z.array(z.string().min(1).max(60)).max(40).default([]),
    yearsExperience: z.number().min(0).max(50).default(4),
    preferredLocation: z.string().max(120).optional(),
    salaryTarget: z.number().min(0).max(2_000_000).optional(),
  }),
  roles: z.array(RoleInputSchema).max(80).optional(),
})

type FitGraphSnapshot = {
  id: string
  createdAt: string
  profile: z.infer<typeof RequestSchema>["profile"]
  graph: {
    root: { id: string; label: string }
    nodes: Array<{
      id: string
      label: string
      company: string | null
      fitScore: number
      scoreBreakdown: {
        skillScore: number
        salaryScore: number
        locationScore: number
        experienceScore: number
      }
      reasons: string[]
    }>
    edges: Array<{ from: string; to: string; weight: number; rank: number }>
  }
  recommendations: Array<{
    roleId: string
    label: string
    fitScore: number
    primaryReason: string
  }>
}

type FitGraphState = {
  history: FitGraphSnapshot[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function parseSalaryMid(range: string | undefined) {
  if (!range) return null
  const tokens = range.match(/\d+(?:,\d{3})*(?:\.\d+)?/g)
  if (!tokens || tokens.length === 0) return null
  const values = tokens
    .map((token) => Number(token.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value))
    .map((value) => (value < 1000 ? value * 1000 : value))
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function inferSkillsFromTitle(title: string) {
  const normalized = normalizeText(title)
  const skillMap: Array<{ token: string; skills: string[] }> = [
    { token: "software", skills: ["system design", "typescript", "api design"] },
    { token: "product", skills: ["roadmapping", "analytics", "stakeholder management"] },
    { token: "data", skills: ["sql", "statistics", "python"] },
    { token: "designer", skills: ["ux", "prototyping", "user research"] },
    { token: "devops", skills: ["cloud", "kubernetes", "observability"] },
  ]
  const found = skillMap.filter((item) => normalized.includes(item.token)).flatMap((item) => item.skills)
  return Array.from(new Set(found))
}

function sanitizeState(input: unknown): FitGraphState {
  if (!input || typeof input !== "object") return { history: [] }
  const payload = input as { history?: unknown[] }
  if (!Array.isArray(payload.history)) return { history: [] }
  const history = payload.history
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const value = item as Record<string, unknown>
      if (typeof value.id !== "string" || typeof value.createdAt !== "string") return null
      if (!value.profile || typeof value.profile !== "object") return null
      if (!value.graph || typeof value.graph !== "object") return null
      if (!Array.isArray(value.recommendations)) return null
      return {
        id: value.id,
        createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
        profile: value.profile as FitGraphSnapshot["profile"],
        graph: value.graph as FitGraphSnapshot["graph"],
        recommendations: value.recommendations as FitGraphSnapshot["recommendations"],
      } satisfies FitGraphSnapshot
    })
    .filter((item): item is FitGraphSnapshot => Boolean(item))
    .slice(-30)
  return { history }
}

async function readState(supabase: any, userId: string) {
  return loadModuleState<FitGraphState>(supabase, userId, STORAGE_KEY, { history: [] }, sanitizeState)
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`fit-graph:get:${getClientIp(request)}`, 80, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await readState(supabase, user.id)
    const history = module.state.history.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    const latest = history[0] || null

    return ok({
      success: true,
      latest,
      history: history.slice(0, 10).map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        topRecommendation: item.recommendations[0] || null,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load fit graph history"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`fit-graph:${getClientIp(request)}`, 60, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, RequestSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    let roles = body.roles || []
    if (roles.length === 0) {
      const savedJobs = await supabase
        .from("saved_jobs")
        .select("id, company, position, location, salary_range")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(25)

      if (!savedJobs.error && Array.isArray(savedJobs.data) && savedJobs.data.length > 0) {
        roles = savedJobs.data.map((item: any) => ({
          id: String(item.id),
          title: String(item.position || "Role"),
          company: String(item.company || "Company"),
          location: typeof item.location === "string" ? item.location : undefined,
          salaryRange: typeof item.salary_range === "string" ? item.salary_range : undefined,
        }))
      }
    }

    const profileSkills = body.profile.skills.map(normalizeText)

    const nodes = roles.map((role, index) => {
      const roleSkills = (role.skills && role.skills.length > 0 ? role.skills : inferSkillsFromTitle(role.title)).map(normalizeText)
      const sharedSkills = roleSkills.filter((skill) => profileSkills.includes(skill))
      const skillScore = roleSkills.length > 0 ? Math.round((sharedSkills.length / roleSkills.length) * 100) : 35

      const salaryMid = parseSalaryMid(role.salaryRange)
      const salaryScore =
        body.profile.salaryTarget && salaryMid
          ? Math.max(0, 100 - Math.round((Math.abs(salaryMid - body.profile.salaryTarget) / Math.max(1, body.profile.salaryTarget)) * 100))
          : 60

      const locationScore =
        body.profile.preferredLocation && role.location
          ? normalizeText(role.location).includes(normalizeText(body.profile.preferredLocation))
            ? 100
            : 50
          : 70

      const experienceScore = Math.max(40, Math.min(100, 50 + body.profile.yearsExperience * 6))
      const fitScore = Math.round(skillScore * 0.45 + salaryScore * 0.2 + locationScore * 0.15 + experienceScore * 0.2)

      const reasons = [
        `${sharedSkills.length} shared skills matched.`,
        salaryMid ? `Estimated salary midpoint ${Math.round(salaryMid).toLocaleString()} USD.` : "No salary midpoint available.",
        role.location ? `Role location: ${role.location}.` : "No location provided.",
      ]

      return {
        id: role.id || `role-${index + 1}`,
        label: role.title,
        company: role.company || null,
        fitScore,
        scoreBreakdown: {
          skillScore,
          salaryScore,
          locationScore,
          experienceScore,
        },
        reasons,
      }
    })

    const edges = nodes
      .slice()
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 6)
      .map((node, index) => ({
        from: "profile",
        to: node.id,
        weight: node.fitScore,
        rank: index + 1,
      }))

    const payload = {
      success: true,
      profile: body.profile,
      graph: {
        root: {
          id: "profile",
          label: "Candidate Profile",
        },
        nodes,
        edges,
      },
      recommendations: nodes
        .slice()
        .sort((a, b) => b.fitScore - a.fitScore)
        .slice(0, 5)
        .map((item) => ({
          roleId: item.id,
          label: item.label,
          fitScore: item.fitScore,
          primaryReason: item.reasons[0],
        })),
    }

    const module = await readState(supabase, user.id)
    const snapshot: FitGraphSnapshot = {
      id: generateId("fit-graph"),
      createdAt: new Date().toISOString(),
      profile: body.profile,
      graph: payload.graph,
      recommendations: payload.recommendations,
    }
    const nextState: FitGraphState = {
      history: [...module.state.history, snapshot].slice(-30),
    }
    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)

    return ok({
      ...payload,
      summary: {
        generatedAt: snapshot.createdAt,
        roleCount: payload.graph.nodes.length,
        bestFit: payload.recommendations[0] || null,
      },
      historySize: nextState.history.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build fit graph"
    return fail(message, 500)
  }
}
