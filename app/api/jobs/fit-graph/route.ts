import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"

export const dynamic = "force-dynamic"

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

    return ok({
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
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build fit graph"
    return fail(message, 500)
  }
}
