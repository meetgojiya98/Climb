"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Building2,
  ExternalLink,
  Globe2,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  TimerReset,
} from "lucide-react"
import { APP_ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

type SourceKey = "linkedin" | "indeed" | "remotive" | "arbeitnow"
type SourceState = "live" | "offline" | "error"

type SourceStatus = {
  key: SourceKey
  label: string
  state: SourceState
  fetched: number
  message: string | null
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

type JobsDiscoverResponse = {
  success: boolean
  query: {
    q: string
    location: string
    days: number
    limit: number
    remoteOnly: boolean
    sources: SourceKey[]
  }
  refreshedAt: string
  total: number
  sourceStatuses: SourceStatus[]
  jobs: JobListing[]
  error?: string
}

const SOURCE_OPTIONS: Array<{ key: SourceKey; label: string; help: string }> = [
  { key: "linkedin", label: "LinkedIn", help: "Top professional network roles" },
  { key: "indeed", label: "Indeed", help: "Large global index of postings" },
  { key: "remotive", label: "Remotive", help: "Remote-first engineering roles" },
  { key: "arbeitnow", label: "Arbeitnow", help: "High-signal startup opportunities" },
]

const DAY_OPTIONS = [
  { value: 1, label: "24h" },
  { value: 3, label: "3d" },
  { value: 7, label: "7d" },
  { value: 14, label: "14d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
]

const LIMIT_OPTIONS = [25, 50, 75, 100, 150]

function formatRelativeTime(value: string | null) {
  if (!value) return "Unknown date"
  const time = Date.parse(value)
  if (Number.isNaN(time)) return "Unknown date"
  const diffMs = Date.now() - time
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return "Just now"
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) return `${diffWeeks}w ago`
  return new Date(time).toLocaleDateString()
}

function sourceStateClass(state: SourceState) {
  if (state === "live") return "bg-green-500/12 text-green-600 border-green-500/30"
  if (state === "offline") return "bg-amber-500/12 text-amber-600 border-amber-500/30"
  return "bg-red-500/12 text-red-600 border-red-500/30"
}

function buildApplicationHref(job: JobListing) {
  const params = new URLSearchParams({
    add: "1",
    company: job.company,
    position: job.title,
    location: job.location,
    salary_range: job.compensation || "",
    job_url: job.url || "",
  })
  return `${APP_ROUTES.applications}?${params.toString()}`
}

export default function JobsExplorerPage() {
  const [query, setQuery] = useState("Software Engineer")
  const [location, setLocation] = useState("United States")
  const [days, setDays] = useState(14)
  const [limit, setLimit] = useState(60)
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [selectedSources, setSelectedSources] = useState<SourceKey[]>(
    SOURCE_OPTIONS.map((item) => item.key)
  )

  const [data, setData] = useState<JobsDiscoverResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = async (quiet = false) => {
    if (!quiet) setLoading(true)
    if (quiet) setRefreshing(true)
    setError(null)
    try {
      const sourceParam = selectedSources.join(",")
      const params = new URLSearchParams({
        q: query.trim() || "Software Engineer",
        location: location.trim() || "United States",
        days: String(days),
        limit: String(limit),
        remoteOnly: String(remoteOnly),
        sources: sourceParam,
      })
      const response = await fetch(`/api/jobs/discover?${params.toString()}`, { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as JobsDiscoverResponse | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to fetch jobs right now.")
      }
      setData(payload)
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to fetch jobs right now.")
      setData(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchJobs(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sourceStatusMap = useMemo(() => {
    const map = new Map<SourceKey, SourceStatus>()
    for (const status of data?.sourceStatuses || []) {
      map.set(status.key, status)
    }
    return map
  }, [data?.sourceStatuses])

  const stats = useMemo(() => {
    const jobs = data?.jobs || []
    const remoteCount = jobs.filter((job) => job.isRemote).length
    const liveSourceCount = (data?.sourceStatuses || []).filter((source) => source.state === "live").length
    const freshCount = jobs.filter((job) => {
      if (!job.postedAt) return false
      const ts = Date.parse(job.postedAt)
      return Number.isFinite(ts) && ts >= Date.now() - 3 * 24 * 60 * 60 * 1000
    }).length
    return {
      total: jobs.length,
      remoteShare: jobs.length ? Math.round((remoteCount / jobs.length) * 100) : 0,
      liveSourceCount,
      freshCount,
    }
  }, [data?.jobs, data?.sourceStatuses])

  const toggleSource = (source: SourceKey) => {
    setSelectedSources((prev) => {
      if (prev.includes(source)) {
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== source)
      }
      return [...prev, source]
    })
  }

  return (
    <div className="section-stack-lg p-4 sm:p-6 lg:p-8">
      <section className="section-shell section-stack">
        <div className="surface-header">
          <div className="space-y-2">
            <span className="badge badge-secondary w-fit">Jobs Explorer</span>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Browse live jobs in one place</h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
              Pull open jobs from top sources, compare results, then move the best role directly into your
              application pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TimerReset className="h-3.5 w-3.5" />
            <span>
              {data?.refreshedAt
                ? `Last updated ${new Date(data.refreshedAt).toLocaleTimeString()}`
                : "Ready to fetch"}
            </span>
          </div>
        </div>

        <form
          className="grid gap-4 lg:grid-cols-12"
          onSubmit={(event) => {
            event.preventDefault()
            void fetchJobs(false)
          }}
        >
          <div className="lg:col-span-4">
            <label className="text-xs font-medium text-muted-foreground">Keywords / title</label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input-field mt-1"
              placeholder="Software Engineer, Product Manager, Data Scientist..."
            />
          </div>
          <div className="lg:col-span-3">
            <label className="text-xs font-medium text-muted-foreground">Location</label>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="input-field mt-1"
              placeholder="United States, Germany, Remote..."
            />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Posted within</label>
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="input-field mt-1"
            >
              {DAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Result limit</label>
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="input-field mt-1"
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-1 flex items-end">
            <button type="submit" className="btn-saffron w-full">
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>
          <div className="lg:col-span-12 flex flex-wrap items-center gap-2 pt-1">
            <label className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(event) => setRemoteOnly(event.target.checked)}
                className="h-4 w-4"
              />
              Remote only
            </label>
            <button
              type="button"
              onClick={() => void fetchJobs(true)}
              className="btn-outline py-2 text-sm"
              disabled={refreshing || loading}
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
          <div className="lg:col-span-12 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {SOURCE_OPTIONS.map((source) => {
              const active = selectedSources.includes(source.key)
              return (
                <button
                  key={source.key}
                  type="button"
                  onClick={() => toggleSource(source.key)}
                  className={cn(
                    "card-interactive text-left p-3",
                    active ? "border-[hsl(var(--surface-accent)/0.55)]" : "opacity-80"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{source.label}</div>
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        active ? "bg-[hsl(var(--surface-accent-2))]" : "bg-muted-foreground/40"
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{source.help}</p>
                </button>
              )
            })}
          </div>
        </form>
      </section>

      <section className="metric-grid-4">
        <div className="card-elevated p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total jobs</p>
          <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across selected sources</p>
        </div>
        <div className="card-elevated p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Live sources</p>
          <p className="mt-2 text-2xl font-semibold">{stats.liveSourceCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Connected and responding</p>
        </div>
        <div className="card-elevated p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Remote share</p>
          <p className="mt-2 text-2xl font-semibold">{stats.remoteShare}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Of current results</p>
        </div>
        <div className="card-elevated p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Fresh in 72h</p>
          <p className="mt-2 text-2xl font-semibold">{stats.freshCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Recently posted opportunities</p>
        </div>
      </section>

      <section className="section-shell-tight">
        <div className="surface-header">
          <h2 className="text-lg font-semibold">Source status</h2>
          <p className="text-xs text-muted-foreground">LinkedIn / Indeed need `RAPIDAPI_KEY` in env.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SOURCE_OPTIONS.filter((source) => selectedSources.includes(source.key)).map((source) => {
            const status = sourceStatusMap.get(source.key)
            const state = status?.state || "offline"
            return (
              <div key={source.key} className="card-interactive p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-sm">{source.label}</h3>
                  <span className={cn("badge border", sourceStateClass(state))}>{state}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {status?.message || `${status?.fetched || 0} jobs fetched`}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="section-shell section-stack">
        <div className="surface-header">
          <div>
            <h2 className="text-xl font-semibold">Browse jobs</h2>
            <p className="text-sm text-muted-foreground">Open the posting or track it directly in your pipeline.</p>
          </div>
          <span className="badge badge-secondary">{data?.jobs.length || 0} roles</span>
        </div>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card-elevated p-5 animate-pulse">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="mt-3 h-6 w-3/4 rounded bg-muted" />
                <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
                <div className="mt-5 h-12 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card-elevated p-6 sm:p-8 text-center space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
            <h3 className="text-lg font-semibold">Could not load jobs</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={() => void fetchJobs(false)} className="btn-saffron">
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : (data?.jobs.length || 0) === 0 ? (
          <div className="card-elevated p-8 sm:p-10 text-center space-y-3">
            <Sparkles className="h-9 w-9 mx-auto text-[hsl(var(--surface-accent-2))]" />
            <h3 className="text-lg font-semibold">No jobs match this search yet</h3>
            <p className="text-sm text-muted-foreground">
              Adjust keywords, broaden location, or enable more sources to pull additional opportunities.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {data?.jobs.map((job) => (
              <article key={job.id} className="card-interactive p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold leading-tight">{job.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{job.company}</span>
                    </div>
                  </div>
                  <span className="badge badge-secondary">{job.sourceLabel}</span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-muted-foreground">
                    <Globe2 className="h-3.5 w-3.5" />
                    {job.isRemote ? "Remote" : "On-site / Hybrid"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-muted-foreground">
                    <TimerReset className="h-3.5 w-3.5" />
                    {formatRelativeTime(job.postedAt)}
                  </span>
                </div>

                {(job.compensation || job.employmentType) && (
                  <div className="rounded-xl border border-border bg-background/50 p-3 text-sm">
                    {job.compensation && <p className="font-medium">{job.compensation}</p>}
                    {job.employmentType && (
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{job.employmentType}</p>
                    )}
                  </div>
                )}

                {job.summary && <p className="text-sm text-muted-foreground leading-relaxed">{job.summary}</p>}

                <div className="flex flex-wrap gap-2 pt-1">
                  {job.url ? (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline py-2 text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open posting
                    </a>
                  ) : (
                    <span className="btn-outline py-2 text-sm opacity-60 cursor-not-allowed">No source link</span>
                  )}
                  <Link href={buildApplicationHref(job)} className="btn-saffron py-2 text-sm">
                    Track in Applications
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
