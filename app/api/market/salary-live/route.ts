import { NextRequest, NextResponse } from "next/server"

type SalaryBand = { min: number; mid: number; max: number }

type SalaryPosting = {
  id: string
  source: string
  title: string
  company: string
  location: string
  salaryText: string | null
  salaryMin: number | null
  salaryMax: number | null
  url: string
  publishedAt: string
}

const DEFAULT_PERIOD = "30d"
const DEFAULT_LIMIT = 40

const ROLE_FALLBACKS: Record<string, SalaryBand> = {
  "software engineer": { min: 100000, mid: 145000, max: 220000 },
  "senior software engineer": { min: 145000, mid: 188000, max: 280000 },
  "product manager": { min: 110000, mid: 152000, max: 235000 },
  "senior product manager": { min: 145000, mid: 192000, max: 275000 },
  "data scientist": { min: 105000, mid: 148000, max: 225000 },
  "ux designer": { min: 90000, mid: 126000, max: 190000 },
  "engineering manager": { min: 165000, mid: 222000, max: 335000 },
  "devops engineer": { min: 115000, mid: 158000, max: 235000 },
}

const ROLE_SKILL_PREMIUMS: Record<string, Array<{ skill: string; premiumPct: number; demand: "high" | "medium" }>> = {
  "software engineer": [
    { skill: "AI Systems", premiumPct: 19, demand: "high" },
    { skill: "Distributed Systems", premiumPct: 16, demand: "high" },
    { skill: "Cloud Cost Optimization", premiumPct: 11, demand: "medium" },
  ],
  "product manager": [
    { skill: "AI Product Strategy", premiumPct: 18, demand: "high" },
    { skill: "Growth Experimentation", premiumPct: 13, demand: "high" },
    { skill: "Pricing & Monetization", premiumPct: 10, demand: "medium" },
  ],
}

const COUNTRY_ALIASES: Record<string, string[]> = {
  "united states": ["united states", "united states only", "usa", "u.s.", "us only", "america", "north america"],
  canada: ["canada", "canadian"],
  "united kingdom": ["united kingdom", "uk", "u.k.", "great britain", "britain", "england"],
  germany: ["germany", "german", "deutschland"],
  france: ["france", "french"],
  spain: ["spain", "spanish"],
  italy: ["italy", "italian"],
  netherlands: ["netherlands", "dutch", "holland"],
  sweden: ["sweden", "swedish"],
  norway: ["norway", "norwegian"],
  denmark: ["denmark", "danish"],
  india: ["india", "indian"],
  singapore: ["singapore"],
  australia: ["australia", "australian"],
  "new zealand": ["new zealand", "nz"],
  japan: ["japan", "japanese"],
  "south korea": ["south korea", "korea", "republic of korea"],
  brazil: ["brazil", "brazilian"],
  mexico: ["mexico", "mexican"],
  uae: ["uae", "united arab emirates", "dubai", "abu dhabi"],
  "saudi arabia": ["saudi arabia", "saudi"],
  "south africa": ["south africa"],
}

function findFallbackBand(role: string) {
  const normalized = role.trim().toLowerCase()
  for (const [key, band] of Object.entries(ROLE_FALLBACKS)) {
    if (normalized.includes(key)) return band
  }
  return { min: 95000, mid: 135000, max: 210000 }
}

function getSkillPremiums(role: string) {
  const normalized = role.trim().toLowerCase()
  for (const [key, premiums] of Object.entries(ROLE_SKILL_PREMIUMS)) {
    if (normalized.includes(key)) return premiums
  }
  return [
    { skill: "AI Fluency", premiumPct: 12, demand: "high" as const },
    { skill: "Execution Velocity", premiumPct: 9, demand: "medium" as const },
    { skill: "Cross-functional Leadership", premiumPct: 8, demand: "medium" as const },
  ]
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function parsePeriodDays(raw: string | null) {
  const value = (raw || DEFAULT_PERIOD).trim().toLowerCase()
  if (!value || value === "all" || value === "all-time" || value === "alltime" || value === "lifetime") {
    return null
  }
  if (value === "24h" || value === "1d") return 1

  const dayMatch = value.match(/^(\d{1,4})d$/)
  if (dayMatch) return Math.max(1, Math.min(3650, Number(dayMatch[1])))

  const weekMatch = value.match(/^(\d{1,3})w$/)
  if (weekMatch) return Math.max(1, Math.min(3650, Number(weekMatch[1]) * 7))

  const monthMatch = value.match(/^(\d{1,2})m$/)
  if (monthMatch) return Math.max(1, Math.min(3650, Number(monthMatch[1]) * 30))

  const yearMatch = value.match(/^(\d{1,2})y$/)
  if (yearMatch) return Math.max(1, Math.min(3650, Number(yearMatch[1]) * 365))

  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.max(1, Math.min(3650, Math.round(numeric)))
  }
  return 30
}

function parseLimit(raw: string | null) {
  const value = Number(raw)
  if (!Number.isFinite(value)) return DEFAULT_LIMIT
  return Math.max(5, Math.min(120, Math.round(value)))
}

function isGlobalQuery(country: string) {
  const normalized = normalizeText(country)
  return (
    !normalized ||
    normalized === "global" ||
    normalized === "worldwide" ||
    normalized === "any" ||
    normalized === "all" ||
    normalized === "remote"
  )
}

function locationMatchesCountry(location: string, country: string) {
  if (isGlobalQuery(country)) return true

  const normalizedCountry = normalizeText(country)
  const normalizedLocation = normalizeText(location || "")
  if (!normalizedLocation) return false

  if (
    normalizedLocation.includes("worldwide") ||
    normalizedLocation.includes("global") ||
    normalizedLocation.includes("anywhere")
  ) {
    return true
  }

  const aliases = COUNTRY_ALIASES[normalizedCountry] || [normalizedCountry]
  return aliases.some((alias) => {
    const target = normalizeText(alias)
    return target.length > 0 && (normalizedLocation.includes(target) || target.includes(normalizedLocation))
  })
}

function withinPeriod(publishedAt: string, periodDays: number | null) {
  if (periodDays === null) return true
  const timestamp = Date.parse(publishedAt)
  if (Number.isNaN(timestamp)) return true
  return timestamp >= Date.now() - periodDays * 24 * 60 * 60 * 1000
}

function seededHash(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function parseMoneyToken(raw: string) {
  const normalized = raw.toLowerCase().replace(/,/g, "")
  const match = normalized.match(/(\d+(?:\.\d+)?)(k|m)?/)
  if (!match) return null
  const value = Number(match[1])
  const suffix = match[2]
  if (!Number.isFinite(value)) return null

  if (suffix === "m") return Math.round(value * 1_000_000)
  if (suffix === "k") return Math.round(value * 1_000)
  if (value < 1000) return Math.round(value * 1_000)
  return Math.round(value)
}

function normalizeToAnnual(value: number, context: string) {
  const text = context.toLowerCase()
  if (text.includes("/hour") || text.includes(" per hour") || text.includes("hourly")) {
    return Math.round(value * 2080)
  }
  if (text.includes("/month") || text.includes(" per month") || text.includes("monthly")) {
    return Math.round(value * 12)
  }
  if (text.includes("/week") || text.includes(" per week") || text.includes("weekly")) {
    return Math.round(value * 52)
  }
  if (text.includes("/day") || text.includes(" per day") || text.includes("daily")) {
    return Math.round(value * 260)
  }
  return value
}

function parseSalaryRange(rawSalary: string | null | undefined) {
  if (!rawSalary) return null
  const text = rawSalary.trim()
  if (!text) return null
  const cleaned = text.replace(/\s+/g, " ")
  const tokens = cleaned.match(/\d+(?:,\d{3})*(?:\.\d+)?\s*[kKmM]?/g)
  if (!tokens || tokens.length === 0) return null
  const normalized = tokens
    .map((token) => parseMoneyToken(token))
    .filter((value): value is number => Number.isFinite(value))
    .map((value) => normalizeToAnnual(value, cleaned))

  if (!normalized.length) return null
  const min = Math.min(...normalized)
  const max = Math.max(...normalized)
  return {
    min,
    max: Math.max(min, max),
  }
}

function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
  }
  return sorted[mid]
}

async function fetchRemotive(role: string): Promise<SalaryPosting[]> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 7000)
  try {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(role)}`
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Remotive request failed (${response.status})`)
    }

    const payload = await response.json().catch(() => null)
    const jobs = Array.isArray(payload?.jobs) ? payload.jobs : []
    return jobs.slice(0, 80).map((job: any) => {
      const salaryText = typeof job?.salary === "string" && job.salary.trim() ? job.salary.trim() : null
      const parsed = parseSalaryRange(salaryText)
      return {
        id: String(job?.id || `${job?.title || "job"}-${job?.company_name || "company"}`),
        source: "Remotive",
        title: String(job?.title || "Role"),
        company: String(job?.company_name || "Company"),
        location: String(job?.candidate_required_location || "Remote"),
        salaryText,
        salaryMin: parsed?.min ?? null,
        salaryMax: parsed?.max ?? null,
        url: String(job?.url || ""),
        publishedAt: String(job?.publication_date || new Date().toISOString()),
      } satisfies SalaryPosting
    })
  } finally {
    clearTimeout(timeout)
  }
}

function buildFallbackPostings(role: string, country: string): SalaryPosting[] {
  const band = findFallbackBand(role)
  const now = new Date().toISOString()
  return [
    {
      id: "fallback-1",
      source: "Climb Estimate",
      title: `${role} (Growth Team)`,
      company: "Market Composite",
      location: country,
      salaryText: `$${Math.round(band.min / 1000)}k - $${Math.round((band.mid + 15000) / 1000)}k`,
      salaryMin: band.min,
      salaryMax: band.mid + 15000,
      url: "",
      publishedAt: now,
    },
    {
      id: "fallback-2",
      source: "Climb Estimate",
      title: `Senior ${role}`,
      company: "Market Composite",
      location: `Remote (${country})`,
      salaryText: `$${Math.round((band.mid - 5000) / 1000)}k - $${Math.round(band.max / 1000)}k`,
      salaryMin: band.mid - 5000,
      salaryMax: band.max,
      url: "",
      publishedAt: now,
    },
  ]
}

function buildSevenDayTrend(seedInput: string, base: number) {
  const seed = seededHash(seedInput)
  return Array.from({ length: 7 }, (_, index) => {
    const wobble = Math.sin((seed % 17) * 0.13 + index * 0.8) * 0.18
    const lift = index * 0.028
    return Math.max(5, Math.round(base * (0.72 + wobble + lift)))
  })
}

export async function GET(request: NextRequest) {
  try {
    const role = (request.nextUrl.searchParams.get("role") || "Software Engineer").trim()
    const country = (request.nextUrl.searchParams.get("country") || request.nextUrl.searchParams.get("location") || "United States").trim()
    const period = (request.nextUrl.searchParams.get("period") || DEFAULT_PERIOD).trim().toLowerCase()
    const periodDays = parsePeriodDays(period)
    const requestLimit = parseLimit(request.nextUrl.searchParams.get("limit"))

    let postings: SalaryPosting[] = []
    let sourceStatus: "live" | "fallback" = "live"
    let warning: string | null = null

    try {
      postings = await fetchRemotive(role)
    } catch (sourceError) {
      sourceStatus = "fallback"
      warning = sourceError instanceof Error ? sourceError.message : "Live source unavailable"
    }

    if (postings.length) {
      postings = postings
        .filter((item) => locationMatchesCountry(item.location, country))
        .filter((item) => withinPeriod(item.publishedAt, periodDays))
        .sort((a, b) => {
          const aTs = Date.parse(a.publishedAt)
          const bTs = Date.parse(b.publishedAt)
          if (Number.isNaN(aTs) && Number.isNaN(bTs)) return 0
          if (Number.isNaN(aTs)) return 1
          if (Number.isNaN(bTs)) return -1
          return bTs - aTs
        })
    }

    if (!postings.length) {
      sourceStatus = "fallback"
      if (!warning) {
        warning = `No live matches found for ${role} in ${country} for ${period}. Showing modeled estimates.`
      }
      postings = buildFallbackPostings(role, country)
    }

    const postingsWithSalary = postings.filter(
      (item) => Number.isFinite(item.salaryMin ?? NaN) && Number.isFinite(item.salaryMax ?? NaN)
    )

    const fallback = findFallbackBand(role)
    const minCandidates = postingsWithSalary
      .map((item) => item.salaryMin as number)
      .filter((value) => Number.isFinite(value))
    const maxCandidates = postingsWithSalary
      .map((item) => item.salaryMax as number)
      .filter((value) => Number.isFinite(value))

    const liveMin = median(minCandidates) ?? fallback.min
    const liveMax = median(maxCandidates) ?? fallback.max
    const liveMid = Math.round((liveMin + liveMax) / 2)

    const listingCount = postings.length
    const salarySampleCount = postingsWithSalary.length
    const remoteShare = Math.max(
      12,
      Math.min(
        98,
        Math.round(
          (postings.filter((item) => /remote|anywhere|worldwide|united states/i.test(item.location)).length / Math.max(1, listingCount)) * 100
        )
      )
    )
    const demandScore = Math.max(
      25,
      Math.min(99, Math.round(38 + listingCount * 0.9 + salarySampleCount * 0.7))
    )

    const trend7d = buildSevenDayTrend(`${role}:${country}:${period}:${new Date().toISOString().slice(0, 13)}`, Math.max(10, listingCount))

    return NextResponse.json(
      {
        success: true,
        sourceStatus,
        warning,
        role,
        location: country,
        country,
        period,
        periodDays,
        requestLimit,
        refreshedAt: new Date().toISOString(),
        benchmark: {
          min: liveMin,
          mid: liveMid,
          max: liveMax,
          fallback,
        },
        live: {
          listingCount,
          salarySampleCount,
          remoteShare,
          demandScore,
          trend7d,
        },
        skillPremiums: getSkillPremiums(role),
        postings: postings.slice(0, requestLimit),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch live salary market data",
      },
      { status: 500 }
    )
  }
}
