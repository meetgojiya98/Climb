import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"

export const dynamic = "force-dynamic"

const QuerySchema = z.object({
  company: z.string().min(2).max(120),
  role: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
})

type NewsItem = {
  title: string
  source: string
  url: string
  publishedAt: string | null
  snippet: string | null
}

type HiringSignal = {
  openRoleSignals: number
  momentum: "rising" | "steady" | "cautious"
  notes: string[]
}

type CompanyIntel = {
  overview: string
  productSignals: string[]
  hiringSignals: HiringSignal
  interviewHints: string[]
  recentNews: NewsItem[]
  sources: string[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function withTimeout(ms: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  }
}

function parseRssItems(xml: string): NewsItem[] {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || []

  const readTag = (input: string, tag: string) => {
    const expression = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
    const match = input.match(expression)
    return stripHtml(match?.[1] || "")
  }

  return itemBlocks.slice(0, 8).map((itemXml) => {
    const title = readTag(itemXml, "title")
    const link = readTag(itemXml, "link")
    const pubDate = readTag(itemXml, "pubDate")
    const description = readTag(itemXml, "description")
    const sourceMatch = title.match(/\s*-\s*([^-\n]+)\s*$/)
    const source = sourceMatch?.[1]?.trim() || "News"
    const cleanTitle = sourceMatch ? title.replace(/\s*-\s*([^-\n]+)\s*$/, "").trim() : title
    return {
      title: cleanTitle || "Untitled signal",
      source,
      url: link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
      snippet: description || null,
    }
  })
}

async function fetchGoogleNews(company: string): Promise<NewsItem[]> {
  const { signal, clear } = withTimeout(7000)
  try {
    const query = `${company} company news hiring product launch`
    const endpoint = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      cache: "no-store",
      signal,
    })
    if (!response.ok) throw new Error(`Google News RSS failed (${response.status})`)
    const xml = await response.text()
    return parseRssItems(xml)
  } finally {
    clear()
  }
}

async function fetchWikipediaSummary(company: string): Promise<string | null> {
  const { signal, clear } = withTimeout(4500)
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(company)}`,
      { method: "GET", headers: { Accept: "application/json" }, cache: "no-store", signal }
    )
    if (!response.ok) return null
    const payload = await response.json().catch(() => null)
    const extract = typeof payload?.extract === "string" ? payload.extract.trim() : ""
    return extract || null
  } catch {
    return null
  } finally {
    clear()
  }
}

async function fetchHiringSignalCount(company: string, role?: string) {
  const { signal, clear } = withTimeout(7000)
  try {
    const query = role?.trim() ? `${company} ${role}` : company
    const endpoint = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}`
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal,
    })
    if (!response.ok) return 0
    const payload = await response.json().catch(() => null)
    const jobs = Array.isArray(payload?.jobs) ? payload.jobs : []
    const normalizedCompany = normalizeText(company)
    return jobs.filter((job: any) => {
      const companyName = normalizeText(String(job?.company_name || ""))
      const title = normalizeText(String(job?.title || ""))
      return (
        companyName.includes(normalizedCompany) ||
        normalizedCompany.includes(companyName) ||
        (companyName.length <= 2 && title.includes(normalizedCompany))
      )
    }).length
  } catch {
    return 0
  } finally {
    clear()
  }
}

function inferMomentum(openRoleSignals: number, newsCount: number): HiringSignal["momentum"] {
  if (openRoleSignals >= 8 || newsCount >= 6) return "rising"
  if (openRoleSignals >= 3 || newsCount >= 3) return "steady"
  return "cautious"
}

function buildInterviewHints(input: {
  company: string
  role?: string
  location?: string
  momentum: HiringSignal["momentum"]
  news: NewsItem[]
}) {
  const roleText = input.role?.trim() || "this role"
  const hints = [
    `Open with why ${input.company} now, then connect your background directly to ${roleText}.`,
    "Bring one example with measurable impact and one example showing cross-team execution.",
    "Prepare a 30-60-90 day plan with the first 3 outcomes you would own.",
  ]

  if (input.momentum === "rising") {
    hints.push("Expect scale questions: show how you prioritize speed without quality regressions.")
  } else if (input.momentum === "cautious") {
    hints.push("Expect efficiency questions: show how you improve output with constrained resources.")
  }

  const productHeadline = input.news.find((item) => /launch|product|feature|ai|platform/i.test(item.title))
  if (productHeadline) {
    hints.push(`Reference recent signal: "${productHeadline.title}" and explain where you can contribute.`)
  }

  if (input.location?.trim()) {
    hints.push(`Be ready to discuss how you collaborate effectively across ${input.location.trim()} time zones.`)
  }

  return hints.slice(0, 6)
}

function fallbackIntel(input: { company: string; role?: string; location?: string }): CompanyIntel {
  return {
    overview: `${input.company} is being tracked with a fallback intelligence profile while live external sources are temporarily unavailable.`,
    productSignals: [
      "No live product feed found in this request window.",
      "Use this pack to prepare high-signal role narratives and follow-up questions.",
    ],
    hiringSignals: {
      openRoleSignals: 0,
      momentum: "steady",
      notes: [
        "Live hiring feed unavailable. Run another refresh for updated counts.",
        "Treat this as a prep baseline, then validate with current postings.",
      ],
    },
    interviewHints: buildInterviewHints({
      company: input.company,
      role: input.role,
      location: input.location,
      momentum: "steady",
      news: [],
    }),
    recentNews: [],
    sources: [],
  }
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`company-intel:${getClientIp(request)}`, 50, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const parsed = QuerySchema.safeParse({
      company: request.nextUrl.searchParams.get("company") || "",
      role: request.nextUrl.searchParams.get("role") || undefined,
      location: request.nextUrl.searchParams.get("location") || undefined,
    })
    if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid query", 400)

    const { company, role, location } = parsed.data

    let news: NewsItem[] = []
    const sources: string[] = []
    let overview = `${company} intelligence snapshot generated from cross-source hiring and news signals.`
    let productSignals: string[] = []
    let hiringNotes: string[] = []

    try {
      news = await fetchGoogleNews(company)
      if (news.length > 0) sources.push("Google News RSS")
    } catch {
      news = []
    }

    const wikiSummary = await fetchWikipediaSummary(company)
    if (wikiSummary) {
      overview = wikiSummary
      sources.push("Wikipedia summary")
    }

    const openRoleSignals = await fetchHiringSignalCount(company, role)
    if (openRoleSignals > 0) sources.push("Remotive jobs")

    const momentum = inferMomentum(openRoleSignals, news.length)
    hiringNotes.push(`Observed ${openRoleSignals} matching role signals in public feeds.`)
    hiringNotes.push(
      momentum === "rising"
        ? "Hiring momentum appears active; speed and ownership narratives are likely valuable."
        : momentum === "steady"
          ? "Hiring momentum appears stable; emphasize predictable execution and collaboration."
          : "Hiring momentum appears cautious; emphasize impact per effort and prioritization."
    )

    const productHeadlines = news
      .filter((item) => /launch|product|feature|ai|platform|roadmap|integration/i.test(item.title))
      .slice(0, 4)

    productSignals = productHeadlines.length
      ? productHeadlines.map((item) => item.title)
      : [
          "No dominant product headline detected in current sample.",
          "Ask interviewers about near-term roadmap and execution priorities.",
        ]

    const interviewHints = buildInterviewHints({
      company,
      role,
      location,
      momentum,
      news,
    })

    const payload: CompanyIntel =
      news.length || wikiSummary || openRoleSignals > 0
        ? {
            overview,
            productSignals,
            hiringSignals: {
              openRoleSignals,
              momentum,
              notes: hiringNotes,
            },
            interviewHints,
            recentNews: news,
            sources,
          }
        : fallbackIntel({ company, role, location })

    return ok({
      success: true,
      query: { company, role: role || null, location: location || null },
      generatedAt: new Date().toISOString(),
      intel: payload,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build company intelligence pack"
    return fail(message, 500)
  }
}

