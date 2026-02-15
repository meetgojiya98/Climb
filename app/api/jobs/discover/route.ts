import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type SourceKey =
  | "linkedin"
  | "indeed"
  | "remotive"
  | "arbeitnow"
  | "weworkremotely"
  | "remoteok"
  | "hnhiring"
type SourceState = "live" | "offline" | "error"

type FetchOptions = {
  q: string
  location: string
  days: number
  limit: number
  remoteOnly: boolean
}

type JobListing = {
  id: string
  sourceKey: SourceKey
  sourceLabel: string
  title: string
  company: string
  location: string
  isRemote: boolean
  postedAt: string | null
  url: string | null
  compensation: string | null
  summary: string | null
  employmentType: string | null
}

type SourceStatus = {
  key: SourceKey
  label: string
  state: SourceState
  fetched: number
  message: string | null
}

type SourceResult = {
  jobs: JobListing[]
  status: SourceStatus
}

const SOURCE_LABELS: Record<SourceKey, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  remotive: "Remotive",
  arbeitnow: "Arbeitnow",
  weworkremotely: "We Work Remotely",
  remoteok: "Remote OK",
  hnhiring: "HN Who Is Hiring",
}

const DEFAULT_SOURCES: SourceKey[] = [
  "linkedin",
  "indeed",
  "remotive",
  "arbeitnow",
  "weworkremotely",
  "remoteok",
  "hnhiring",
]
const DEFAULT_QUERY = "Software Engineer"
const DEFAULT_LOCATION = "United States"
const DEFAULT_LIMIT = 60
const DEFAULT_DAYS = 14
const JSEARCH_HOST = "jsearch.p.rapidapi.com"
const CACHE_TTL_MS = 60 * 1000
const RSS_SOURCE_URLS: Record<Exclude<SourceKey, "linkedin" | "indeed" | "remotive" | "arbeitnow">, string> = {
  weworkremotely: "https://weworkremotely.com/remote-jobs.rss",
  remoteok: "https://remoteok.com/remote-jobs.rss",
  hnhiring: "https://hnrss.github.io/jobs",
}

const discoverCache = new Map<string, { expiresAt: number; payload: unknown }>()

const LOCATION_GLOBAL_TOKENS = new Set(["", "global", "worldwide", "any", "all", "remote", "anywhere"])
const LOCATION_ALIAS_MAP: Record<string, string[]> = {
  usa: ["usa", "united states", "u s", "u s a", "us", "america"],
  "united states": ["united states", "usa", "u s", "u s a", "us", "america"],
  uk: ["uk", "united kingdom", "britain", "great britain", "england"],
  "united kingdom": ["united kingdom", "uk", "britain", "great britain", "england"],
  uae: ["uae", "united arab emirates", "dubai", "abu dhabi"],
  "united arab emirates": ["united arab emirates", "uae", "dubai", "abu dhabi"],
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function parseBoolean(value: string | null) {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on"
}

function parseNumber(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return clamp(Math.round(parsed), min, max)
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null
  return value as Record<string, unknown>
}

function toString(value: unknown, fallback = "") {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return fallback
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""))
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toBool(value: unknown) {
  if (typeof value === "boolean") return value
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    return normalized === "true" || normalized === "1" || normalized === "yes"
  }
  if (typeof value === "number") return value > 0
  return false
}

function parseSources(raw: string | null): SourceKey[] {
  if (!raw) return DEFAULT_SOURCES
  const parsed = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is SourceKey => item in SOURCE_LABELS)
  if (!parsed.length) return DEFAULT_SOURCES
  return Array.from(new Set(parsed))
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, "/")
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function withTimeout(ms: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  }
}

function isGlobalLocation(location: string) {
  return LOCATION_GLOBAL_TOKENS.has(normalizeText(location))
}

function locationTerms(value: string) {
  const normalized = normalizeText(value)
  if (!normalized) return []
  const directTerms = normalized.split(" ").filter((token) => token.length > 2)
  const aliases = LOCATION_ALIAS_MAP[normalized] || []
  const aliasTerms = aliases
    .flatMap((alias) => normalizeText(alias).split(" "))
    .filter((token) => token.length > 2)
  return Array.from(new Set([...directTerms, ...aliasTerms, normalized]))
}

function locationMatches(candidate: string, requested: string) {
  if (isGlobalLocation(requested)) return true
  const candidateNorm = normalizeText(candidate)
  const requestedNorm = normalizeText(requested)
  if (!candidateNorm) return false
  if (
    candidateNorm.includes("remote") ||
    candidateNorm.includes("global") ||
    candidateNorm.includes("worldwide") ||
    candidateNorm.includes("anywhere")
  ) {
    return true
  }

  if (candidateNorm.includes(requestedNorm)) return true

  const terms = locationTerms(requested)
  return terms.some((term) => candidateNorm.includes(term))
}

function postedWithinDays(postedAt: string | null, days: number) {
  if (!postedAt) return true
  const timestamp = Date.parse(postedAt)
  if (Number.isNaN(timestamp)) return true
  return timestamp >= Date.now() - days * 24 * 60 * 60 * 1000
}

function queryTerms(query: string) {
  return Array.from(
    new Set(
      normalizeText(query)
        .split(" ")
        .filter((token) => token.length > 2)
    )
  )
}

function queryMatches(
  job: Pick<JobListing, "title" | "company" | "summary">,
  query: string,
  mode: "strict" | "relaxed" = "strict"
) {
  const needle = normalizeText(query)
  if (!needle) return true
  const haystack = normalizeText(`${job.title} ${job.company} ${job.summary || ""}`)
  if (haystack.includes(needle)) return true

  const terms = queryTerms(query)
  if (!terms.length) return true
  if (mode === "strict") return terms.every((term) => haystack.includes(term))
  return terms.some((term) => haystack.includes(term))
}

function selectMatches(candidates: JobListing[], options: FetchOptions) {
  const strict = candidates.filter((job) => {
    if (!postedWithinDays(job.postedAt, options.days)) return false
    if (options.remoteOnly && !job.isRemote) return false
    if (!locationMatches(job.location, options.location)) return false
    if (!queryMatches(job, options.q, "strict")) return false
    return true
  })
  if (strict.length > 0) return strict.slice(0, options.limit)

  const relaxed = candidates.filter((job) => {
    if (!postedWithinDays(job.postedAt, Math.max(options.days, 45))) return false
    if (options.remoteOnly && !job.isRemote) return false
    if (!isGlobalLocation(options.location) && !locationMatches(job.location, options.location) && !job.isRemote) {
      return false
    }
    return queryMatches(job, options.q, "relaxed")
  })
  if (relaxed.length > 0) return relaxed.slice(0, options.limit)

  return candidates.slice(0, Math.min(options.limit, 20))
}

function buildCompensation(
  min: number | null,
  max: number | null,
  currency: string | null,
  interval: string | null
) {
  if (min === null && max === null) return null
  const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })
  const unit = currency && currency.length <= 5 ? currency.toUpperCase() : "USD"
  const intervalLabel = interval ? ` / ${interval}` : ""
  if (min !== null && max !== null) {
    return `${unit} ${formatter.format(min)} - ${formatter.format(max)}${intervalLabel}`
  }
  const value = min ?? max
  if (value === null) return null
  return `${unit} ${formatter.format(value)}${intervalLabel}`
}

function toPostedAt(raw: Record<string, unknown>) {
  const direct = toString(raw.job_posted_at_datetime_utc) || toString(raw.job_posted_at_datetime)
  if (direct) return direct
  const timestamp = toNumber(raw.job_posted_at_timestamp)
  if (timestamp === null) return null
  const resolved = timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000
  return new Date(resolved).toISOString()
}

function parseRssItems(xml: string) {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || []
  const readTag = (itemXml: string, tag: string) => {
    const expression = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
    const match = itemXml.match(expression)
    return stripHtml((match?.[1] || "").trim())
  }

  return items.map((itemXml) => ({
    title: readTag(itemXml, "title"),
    link: readTag(itemXml, "link"),
    description: readTag(itemXml, "description"),
    pubDate: readTag(itemXml, "pubDate"),
    category: readTag(itemXml, "category"),
    author: readTag(itemXml, "author"),
  }))
}

function splitTitleCompany(rawTitle: string) {
  const title = rawTitle.trim()
  if (!title) return { role: "Untitled role", company: "Unknown company" }

  const atMatch = title.match(/^(.+?)\s+at\s+(.+)$/i)
  if (atMatch) return { role: atMatch[1].trim(), company: atMatch[2].trim() }

  const dashMatch = title.match(/^(.+?)\s+[–—-]\s+(.+)$/)
  if (dashMatch) return { company: dashMatch[1].trim(), role: dashMatch[2].trim() }

  const hiringMatch = title.match(/^(.+?)\s+(?:is\s+)?hiring[:\s-]+(.+)$/i)
  if (hiringMatch) return { company: hiringMatch[1].trim(), role: hiringMatch[2].trim() }

  return { role: title, company: "Unknown company" }
}

function dedupeJobs(items: JobListing[]) {
  const map = new Map<string, JobListing>()
  for (const item of items) {
    const key =
      item.url?.toLowerCase() ||
      `${normalizeText(item.title)}::${normalizeText(item.company)}::${normalizeText(item.location)}`
    if (!map.has(key)) {
      map.set(key, item)
    }
  }
  return Array.from(map.values())
}

function sortJobs(items: JobListing[]) {
  return [...items].sort((a, b) => {
    const aTime = a.postedAt ? Date.parse(a.postedAt) : Number.NaN
    const bTime = b.postedAt ? Date.parse(b.postedAt) : Number.NaN
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
    if (Number.isNaN(aTime)) return 1
    if (Number.isNaN(bTime)) return -1
    return bTime - aTime
  })
}

async function fetchRemotive(options: FetchOptions): Promise<SourceResult> {
  const timeout = withTimeout(9000)
  try {
    const response = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(options.q)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: timeout.signal,
      }
    )
    if (!response.ok) {
      throw new Error(`Remotive returned ${response.status}`)
    }

    const payload = toRecord(await response.json().catch(() => null))
    const rawJobs = Array.isArray(payload?.jobs) ? payload.jobs : []
    const jobs: JobListing[] = []

    for (let index = 0; index < rawJobs.length; index += 1) {
      const raw = toRecord(rawJobs[index])
      if (!raw) continue

      const title = toString(raw.title)
      const company = toString(raw.company_name)
      const location = toString(raw.candidate_required_location, "Remote")
      const postedAt = toString(raw.publication_date) || null
      const compensation = toString(raw.salary) || null
      const summary = toString(raw.description)
      const cleanSummary = summary ? summary.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").slice(0, 260) : null

      const listing: JobListing = {
        id: `remotive-${toString(raw.id, String(index))}`,
        sourceKey: "remotive",
        sourceLabel: SOURCE_LABELS.remotive,
        title: title || "Untitled role",
        company: company || "Unknown company",
        location,
        isRemote: true,
        postedAt,
        url: toString(raw.url) || null,
        compensation,
        summary: cleanSummary,
        employmentType: toString(raw.job_type) || null,
      }

      jobs.push(listing)
    }

    const matches = selectMatches(jobs, options)
    return {
      jobs: matches,
      status: {
        key: "remotive",
        label: SOURCE_LABELS.remotive,
        state: "live",
        fetched: matches.length,
        message: null,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Remotive is unavailable"
    return {
      jobs: [],
      status: {
        key: "remotive",
        label: SOURCE_LABELS.remotive,
        state: "error",
        fetched: 0,
        message,
      },
    }
  } finally {
    timeout.clear()
  }
}

async function fetchArbeitnow(options: FetchOptions): Promise<SourceResult> {
  const timeout = withTimeout(9000)
  try {
    const response = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: timeout.signal,
    })
    if (!response.ok) {
      throw new Error(`Arbeitnow returned ${response.status}`)
    }

    const payload = toRecord(await response.json().catch(() => null))
    const rawJobs = Array.isArray(payload?.data) ? payload.data : []
    const jobs: JobListing[] = []

    for (let index = 0; index < rawJobs.length; index += 1) {
      const raw = toRecord(rawJobs[index])
      if (!raw) continue

      const title = toString(raw.title)
      const company = toString(raw.company_name)
      const location = toString(raw.location, "Remote")
      const description = toString(raw.description)
      const cleanSummary = description
        ? description.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").slice(0, 260)
        : null
      const isRemote = toBool(raw.remote) || normalizeText(location).includes("remote")
      const url = toString(raw.url) || toString(raw.job_url)
      const createdAt = toString(raw.created_at) || null

      const listing: JobListing = {
        id: `arbeitnow-${toString(raw.slug, String(index))}`,
        sourceKey: "arbeitnow",
        sourceLabel: SOURCE_LABELS.arbeitnow,
        title: title || "Untitled role",
        company: company || "Unknown company",
        location,
        isRemote,
        postedAt: createdAt,
        url: url || null,
        compensation: null,
        summary: cleanSummary,
        employmentType: toString(raw.employment_type) || null,
      }

      jobs.push(listing)
    }

    const matches = selectMatches(jobs, options)
    return {
      jobs: matches,
      status: {
        key: "arbeitnow",
        label: SOURCE_LABELS.arbeitnow,
        state: "live",
        fetched: matches.length,
        message: null,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Arbeitnow is unavailable"
    return {
      jobs: [],
      status: {
        key: "arbeitnow",
        label: SOURCE_LABELS.arbeitnow,
        state: "error",
        fetched: 0,
        message,
      },
    }
  } finally {
    timeout.clear()
  }
}

async function fetchRssCrawlerSource(
  source: Extract<SourceKey, "weworkremotely" | "remoteok" | "hnhiring">,
  options: FetchOptions
): Promise<SourceResult> {
  const timeout = withTimeout(9500)
  try {
    const url =
      source === "hnhiring"
        ? `${RSS_SOURCE_URLS.hnhiring}?q=${encodeURIComponent(
            `${options.q}${options.remoteOnly ? " remote" : ""}`.trim()
          )}`
        : RSS_SOURCE_URLS[source]

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/rss+xml, application/xml, text/xml, text/html;q=0.9" },
      cache: "no-store",
      signal: timeout.signal,
    })
    if (!response.ok) {
      throw new Error(`${SOURCE_LABELS[source]} crawler returned ${response.status}`)
    }

    const xml = await response.text()
    const rows = parseRssItems(xml)
    const jobs: JobListing[] = []

    for (let index = 0; index < rows.length; index += 1) {
      const item = rows[index]
      const { role, company } = splitTitleCompany(item.title)
      const summary = item.description ? item.description.slice(0, 260) : null
      const sourceLocation = source === "hnhiring" ? "Global / Remote" : "Remote"
      const isRemote = true

      jobs.push({
        id: `${source}-rss-${index}-${normalizeText(role).slice(0, 32) || "job"}`,
        sourceKey: source,
        sourceLabel: SOURCE_LABELS[source],
        title: role || "Untitled role",
        company: company || "Unknown company",
        location: sourceLocation,
        isRemote,
        postedAt: item.pubDate || null,
        url: item.link || null,
        compensation: null,
        summary,
        employmentType: null,
      })
    }

    const matches = selectMatches(jobs, options)
    return {
      jobs: matches,
      status: {
        key: source,
        label: SOURCE_LABELS[source],
        state: "live",
        fetched: matches.length,
        message: "Crawled from public web feeds.",
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : `${SOURCE_LABELS[source]} crawler unavailable`
    return {
      jobs: [],
      status: {
        key: source,
        label: SOURCE_LABELS[source],
        state: "error",
        fetched: 0,
        message,
      },
    }
  } finally {
    timeout.clear()
  }
}

function mapDatePosted(days: number) {
  if (days <= 1) return "today"
  if (days <= 3) return "3days"
  if (days <= 7) return "week"
  if (days <= 30) return "month"
  return "all"
}

function rapidApiKey() {
  const key =
    process.env.RAPIDAPI_KEY ||
    process.env.RAPID_API_KEY ||
    process.env.JSEARCH_API_KEY ||
    ""
  return key.trim() || null
}

function publisherMatchesSource(raw: Record<string, unknown>, source: SourceKey) {
  const publisher = normalizeText(toString(raw.job_publisher))
  const applyLink = normalizeText(toString(raw.job_apply_link))
  if (source === "linkedin") {
    return publisher.includes("linkedin") || applyLink.includes("linkedin")
  }
  if (source === "indeed") {
    return publisher.includes("indeed") || applyLink.includes("indeed")
  }
  return false
}

function buildJSearchLocation(raw: Record<string, unknown>) {
  const primary = toString(raw.job_location)
  if (primary) return primary
  const city = toString(raw.job_city)
  const state = toString(raw.job_state)
  const country = toString(raw.job_country)
  const parts = [city, state, country].filter(Boolean)
  return parts.length ? parts.join(", ") : "Remote"
}

async function fetchPublisherFromJSearch(
  source: Extract<SourceKey, "linkedin" | "indeed">,
  options: FetchOptions
): Promise<SourceResult> {
  const key = rapidApiKey()
  if (!key) {
    return {
      jobs: [],
      status: {
        key: source,
        label: SOURCE_LABELS[source],
        state: "offline",
        fetched: 0,
        message: "Set RAPIDAPI_KEY to enable this source.",
      },
    }
  }

  const timeout = withTimeout(9000)
  try {
    const queryText = [
      options.q,
      !isGlobalLocation(options.location) ? `in ${options.location}` : "",
      options.remoteOnly ? "remote" : "",
    ]
      .filter(Boolean)
      .join(" ")
    const search = new URLSearchParams({
      query: queryText,
      page: "1",
      num_pages: "1",
      date_posted: mapDatePosted(options.days),
    })

    const response = await fetch(`https://${JSEARCH_HOST}/search?${search.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal: timeout.signal,
      headers: {
        Accept: "application/json",
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": JSEARCH_HOST,
      },
    })
    if (!response.ok) {
      throw new Error(`${SOURCE_LABELS[source]} feed returned ${response.status}`)
    }

    const payload = toRecord(await response.json().catch(() => null))
    const rawJobs = Array.isArray(payload?.data) ? payload.data : []
    const jobs: JobListing[] = []

    for (let index = 0; index < rawJobs.length; index += 1) {
      const raw = toRecord(rawJobs[index])
      if (!raw || !publisherMatchesSource(raw, source)) continue

      const title = toString(raw.job_title)
      const company = toString(raw.employer_name)
      const location = buildJSearchLocation(raw)
      const isRemote = toBool(raw.job_is_remote) || normalizeText(location).includes("remote")
      const postedAt = toPostedAt(raw)
      const salaryText = toString(raw.job_salary)
      const compensation =
        salaryText ||
        buildCompensation(
          toNumber(raw.job_min_salary),
          toNumber(raw.job_max_salary),
          toString(raw.job_salary_currency) || null,
          toString(raw.job_salary_period) || null
        )
      const description = toString(raw.job_description)
      const summary = description ? description.replace(/\s+/g, " ").slice(0, 260) : null
      const url = toString(raw.job_apply_link) || toString(raw.job_google_link)

      const listing: JobListing = {
        id: `${source}-${toString(raw.job_id, String(index))}`,
        sourceKey: source,
        sourceLabel: SOURCE_LABELS[source],
        title: title || "Untitled role",
        company: company || "Unknown company",
        location,
        isRemote,
        postedAt,
        url: url || null,
        compensation: compensation || null,
        summary,
        employmentType: toString(raw.job_employment_type) || null,
      }

      jobs.push(listing)
    }

    const matches = selectMatches(jobs, options)
    return {
      jobs: matches,
      status: {
        key: source,
        label: SOURCE_LABELS[source],
        state: "live",
        fetched: matches.length,
        message: null,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : `${SOURCE_LABELS[source]} is unavailable`
    return {
      jobs: [],
      status: {
        key: source,
        label: SOURCE_LABELS[source],
        state: "error",
        fetched: 0,
        message,
      },
    }
  } finally {
    timeout.clear()
  }
}

export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get("q") || request.nextUrl.searchParams.get("query") || DEFAULT_QUERY)
      .trim()
      .slice(0, 140)
    const location = (request.nextUrl.searchParams.get("location") || DEFAULT_LOCATION).trim().slice(0, 100)
    const days = parseNumber(request.nextUrl.searchParams.get("days"), DEFAULT_DAYS, 1, 365)
    const limit = parseNumber(request.nextUrl.searchParams.get("limit"), DEFAULT_LIMIT, 10, 200)
    const remoteOnly = parseBoolean(request.nextUrl.searchParams.get("remoteOnly"))
    const sources = parseSources(request.nextUrl.searchParams.get("sources"))

    const options: FetchOptions = {
      q: q || DEFAULT_QUERY,
      location: location || DEFAULT_LOCATION,
      days,
      limit,
      remoteOnly,
    }

    const cacheKey = JSON.stringify({
      q: options.q.toLowerCase(),
      location: options.location.toLowerCase(),
      days: options.days,
      limit: options.limit,
      remoteOnly: options.remoteOnly,
      sources: [...sources].sort(),
    })
    const cached = discoverCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload)
    }

    const tasks = sources.map((source) => {
      if (source === "remotive") return fetchRemotive(options)
      if (source === "arbeitnow") return fetchArbeitnow(options)
      if (source === "linkedin" || source === "indeed") return fetchPublisherFromJSearch(source, options)
      return fetchRssCrawlerSource(source, options)
    })

    const results = await Promise.all(tasks)
    const allJobs = sortJobs(dedupeJobs(results.flatMap((result) => result.jobs))).slice(0, limit)
    const sourceStatuses = results.map((result) => result.status)

    const payload = {
      success: true,
      query: {
        q: options.q,
        location: options.location,
        days: options.days,
        limit: options.limit,
        remoteOnly: options.remoteOnly,
        sources,
      },
      refreshedAt: new Date().toISOString(),
      total: allJobs.length,
      sourceStatuses,
      jobs: allJobs,
    }

    discoverCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload })
    if (discoverCache.size > 50) {
      const entries = Array.from(discoverCache.entries()).slice(0, 15)
      entries.forEach(([key]) => discoverCache.delete(key))
    }

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch jobs"
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}
