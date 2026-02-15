"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle,
  DollarSign,
  Globe2,
  MapPin,
  Percent,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

type LiveSalaryPayload = {
  success: boolean
  sourceStatus: "live" | "fallback"
  warning: string | null
  role: string
  location: string
  refreshedAt: string
  benchmark: {
    min: number
    mid: number
    max: number
    fallback: {
      min: number
      mid: number
      max: number
    }
  }
  live: {
    listingCount: number
    salarySampleCount: number
    remoteShare: number
    demandScore: number
    trend7d: number[]
  }
  skillPremiums: Array<{ skill: string; premiumPct: number; demand: "high" | "medium" }>
  postings: Array<{
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
  }>
}

type OfferDraft = {
  base: number
  bonusPct: number
  equity: number
  signOn: number
}

const ROLE_OPTIONS = [
  "Software Engineer",
  "Senior Software Engineer",
  "Product Manager",
  "Senior Product Manager",
  "Data Scientist",
  "UX Designer",
  "DevOps Engineer",
  "Engineering Manager",
]

const ROLE_BASELINES: Record<string, { min: number; mid: number; max: number }> = {
  "Software Engineer": { min: 100000, mid: 145000, max: 220000 },
  "Senior Software Engineer": { min: 145000, mid: 188000, max: 280000 },
  "Product Manager": { min: 110000, mid: 152000, max: 235000 },
  "Senior Product Manager": { min: 145000, mid: 192000, max: 275000 },
  "Data Scientist": { min: 105000, mid: 148000, max: 225000 },
  "UX Designer": { min: 90000, mid: 126000, max: 190000 },
  "DevOps Engineer": { min: 115000, mid: 158000, max: 235000 },
  "Engineering Manager": { min: 165000, mid: 222000, max: 335000 },
}

const LOCATION_OPTIONS = [
  { id: "us", label: "United States (National)", factor: 1 },
  { id: "sf", label: "San Francisco Bay Area", factor: 1.22 },
  { id: "nyc", label: "New York City", factor: 1.17 },
  { id: "sea", label: "Seattle", factor: 1.11 },
  { id: "austin", label: "Austin", factor: 0.95 },
  { id: "atlanta", label: "Atlanta", factor: 0.92 },
  { id: "remote", label: "Remote (US blended)", factor: 0.98 },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

function calcOfferTotal(offer: OfferDraft) {
  const bonusValue = Math.round((offer.base * offer.bonusPct) / 100)
  return offer.base + bonusValue + offer.equity + offer.signOn
}

export default function SalaryInsightsPage() {
  const [selectedRole, setSelectedRole] = useState("Software Engineer")
  const [selectedLocation, setSelectedLocation] = useState("us")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [manualRefreshSeed, setManualRefreshSeed] = useState(0)

  const [liveData, setLiveData] = useState<LiveSalaryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [basePay, setBasePay] = useState(145000)
  const [bonusPct, setBonusPct] = useState(12)
  const [equityAnnual, setEquityAnnual] = useState(28000)
  const [signOnBonus, setSignOnBonus] = useState(12000)
  const [benefitsPct, setBenefitsPct] = useState(8)
  const [taxRate, setTaxRate] = useState(29)

  const [offerA, setOfferA] = useState<OfferDraft>({
    base: 145000,
    bonusPct: 10,
    equity: 22000,
    signOn: 10000,
  })
  const [offerB, setOfferB] = useState<OfferDraft>({
    base: 155000,
    bonusPct: 12,
    equity: 26000,
    signOn: 7000,
  })

  const locationMeta = useMemo(
    () => LOCATION_OPTIONS.find((location) => location.id === selectedLocation) || LOCATION_OPTIONS[0],
    [selectedLocation]
  )
  const baseline = ROLE_BASELINES[selectedRole] || ROLE_BASELINES["Software Engineer"]

  useEffect(() => {
    setBasePay(Math.round(baseline.mid * locationMeta.factor))
    setOfferA({
      base: Math.round(baseline.mid * 0.97 * locationMeta.factor),
      bonusPct: 10,
      equity: Math.round(baseline.mid * 0.15),
      signOn: 10000,
    })
    setOfferB({
      base: Math.round(baseline.mid * 1.04 * locationMeta.factor),
      bonusPct: 12,
      equity: Math.round(baseline.mid * 0.2),
      signOn: 8000,
    })
  }, [selectedRole, locationMeta.factor, baseline.mid])

  useEffect(() => {
    let active = true

    const fetchLiveData = async (quiet = false) => {
      if (!quiet) setLoading(true)
      if (quiet) setRefreshing(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/market/salary-live?role=${encodeURIComponent(selectedRole)}&location=${encodeURIComponent(locationMeta.label)}`,
          { cache: "no-store" }
        )
        const payload = (await response.json().catch(() => null)) as LiveSalaryPayload | null
        if (!response.ok || !payload?.success) {
          throw new Error((payload as any)?.error || "Unable to load live market data")
        }
        if (active) {
          setLiveData(payload)
        }
      } catch (requestError: unknown) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Live market data is unavailable.")
          setLiveData(null)
        }
      } finally {
        if (active) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    void fetchLiveData(false)

    let interval: number | null = null
    if (autoRefresh) {
      interval = window.setInterval(() => {
        void fetchLiveData(true)
      }, 60_000)
    }

    return () => {
      active = false
      if (interval) window.clearInterval(interval)
    }
  }, [selectedRole, locationMeta.label, autoRefresh, manualRefreshSeed])

  const adjustedBenchmark = useMemo(() => {
    const source = liveData?.benchmark || baseline
    return {
      min: Math.round(source.min * locationMeta.factor),
      mid: Math.round(source.mid * locationMeta.factor),
      max: Math.round(source.max * locationMeta.factor),
    }
  }, [liveData?.benchmark, baseline, locationMeta.factor])

  const compensationSummary = useMemo(() => {
    const bonusValue = Math.round((basePay * bonusPct) / 100)
    const benefitsValue = Math.round((basePay * benefitsPct) / 100)
    const gross = basePay + bonusValue + equityAnnual + signOnBonus + benefitsValue
    const net = Math.round((gross - benefitsValue) * (1 - taxRate / 100) + benefitsValue)
    return {
      bonusValue,
      benefitsValue,
      gross,
      net,
    }
  }, [basePay, bonusPct, benefitsPct, equityAnnual, signOnBonus, taxRate])

  const offerATotal = useMemo(() => calcOfferTotal(offerA), [offerA])
  const offerBTotal = useMemo(() => calcOfferTotal(offerB), [offerB])
  const bestOfferLabel = offerATotal === offerBTotal ? "Tie" : offerATotal > offerBTotal ? "Offer A" : "Offer B"

  const targetAsk = useMemo(() => Math.round(adjustedBenchmark.mid * 1.09), [adjustedBenchmark.mid])
  const walkAwayFloor = useMemo(() => Math.round(adjustedBenchmark.mid * 0.92), [adjustedBenchmark.mid])

  const liveTrend = liveData?.live.trend7d || [18, 20, 21, 23, 24, 26, 28]
  const maxTrendValue = Math.max(...liveTrend, 1)

  return (
    <div className="section-shell section-stack">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Salary Insights</h1>
          <p className="text-muted-foreground">
            Live market pricing, location adjustments, and negotiation guidance for every offer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setManualRefreshSeed((current) => current + 1)
            }}
            className="btn-outline text-sm"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Refresh
          </button>
          <label className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs">
            <input
              type="checkbox"
              className="accent-saffron-500"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
            />
            Auto-refresh (60s)
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Live Midpoint</p>
            <DollarSign className="w-4 h-4 text-saffron-500" />
          </div>
          <p className="text-2xl font-semibold mt-2">{formatCurrency(adjustedBenchmark.mid)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Range {formatCurrency(adjustedBenchmark.min)} - {formatCurrency(adjustedBenchmark.max)}
          </p>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Demand Score</p>
            <Activity className="w-4 h-4 text-navy-600" />
          </div>
          <p className="text-2xl font-semibold mt-2">{liveData?.live.demandScore ?? 64}/100</p>
          <p className="text-xs text-muted-foreground mt-1">Hiring pressure for this role</p>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Remote Share</p>
            <Globe2 className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-semibold mt-2">{liveData?.live.remoteShare ?? 72}%</p>
          <p className="text-xs text-muted-foreground mt-1">Remote-friendly openings in this feed</p>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Salary Samples</p>
            <BarChart3 className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-semibold mt-2">{liveData?.live.salarySampleCount ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {liveData?.sourceStatus === "live" ? "Live job feed" : "Fallback market model"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr,0.92fr]">
        <div className="space-y-4">
          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value)}
                  className="input-field mt-1"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Location market</label>
                <select
                  value={selectedLocation}
                  onChange={(event) => setSelectedLocation(event.target.value)}
                  className="input-field mt-1"
                >
                  {LOCATION_OPTIONS.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-secondary/25 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Openings tracked</p>
                <p className="text-lg font-semibold mt-1">{formatCompact(liveData?.live.listingCount ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/25 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">COL factor</p>
                <p className="text-lg font-semibold mt-1">{locationMeta.factor.toFixed(2)}x</p>
              </div>
              <div className="rounded-xl border border-border bg-secondary/25 px-3 py-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Refreshed</p>
                <p className="text-sm font-medium mt-1">
                  {liveData?.refreshedAt ? new Date(liveData.refreshedAt).toLocaleTimeString() : "--"}
                </p>
              </div>
            </div>

            {liveData?.warning ? (
              <p className="text-xs text-amber-600 mt-3">
                Live feed warning: {liveData.warning}
              </p>
            ) : null}
            {error ? <p className="text-xs text-red-600 mt-3">{error}</p> : null}
          </div>

          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-saffron-500" />
              7-Day Hiring Velocity
            </h3>
            <div className="grid grid-cols-7 gap-2 items-end h-36">
              {liveTrend.map((value, index) => (
                <div key={`trend-${index}`} className="flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-saffron-500/75 to-cyan-400/80 transition-all duration-500"
                    style={{ height: `${Math.max(14, Math.round((value / maxTrendValue) * 120))}px` }}
                    title={`${value} market events`}
                  />
                  <p className="text-[10px] text-muted-foreground">D{index + 1}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Daily signal is derived from posting flow and salary coverage in the live feed.
            </p>
          </div>

          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-navy-600" />
              Live Market Openings
            </h3>
            <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
              {(liveData?.postings || []).map((posting) => (
                <div key={posting.id} className="rounded-xl border border-border bg-secondary/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{posting.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {posting.company} · {posting.location}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {posting.salaryText || "Salary not listed"} · {posting.source}
                      </p>
                    </div>
                    {posting.url ? (
                      <a
                        href={posting.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-saffron-600 hover:text-saffron-700 whitespace-nowrap"
                      >
                        Open
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">No link</span>
                    )}
                  </div>
                </div>
              ))}
              {!loading && (!liveData?.postings || liveData.postings.length === 0) ? (
                <p className="text-xs text-muted-foreground">No postings available right now. Try refreshing.</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-saffron-500" />
              Total Compensation Simulator
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Base salary</label>
                <input
                  type="number"
                  value={basePay}
                  onChange={(event) => setBasePay(Math.max(0, Number(event.target.value) || 0))}
                  className="input-field mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Bonus %</label>
                  <input
                    type="number"
                    value={bonusPct}
                    onChange={(event) => setBonusPct(clamp(Number(event.target.value) || 0, 0, 60))}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Benefits %</label>
                  <input
                    type="number"
                    value={benefitsPct}
                    onChange={(event) => setBenefitsPct(clamp(Number(event.target.value) || 0, 0, 25))}
                    className="input-field mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Annual equity value</label>
                  <input
                    type="number"
                    value={equityAnnual}
                    onChange={(event) => setEquityAnnual(Math.max(0, Number(event.target.value) || 0))}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Sign-on bonus</label>
                  <input
                    type="number"
                    value={signOnBonus}
                    onChange={(event) => setSignOnBonus(Math.max(0, Number(event.target.value) || 0))}
                    className="input-field mt-1"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Estimated tax rate</span>
                  <span>{taxRate}%</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={45}
                  step={1}
                  value={taxRate}
                  onChange={(event) => setTaxRate(Number(event.target.value))}
                  className="w-full accent-saffron-500"
                />
              </div>

              <div className="rounded-xl border border-border bg-secondary/25 p-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p className="text-muted-foreground">Bonus value</p>
                  <p className="font-medium text-right">{formatCurrency(compensationSummary.bonusValue)}</p>
                  <p className="text-muted-foreground">Benefits value</p>
                  <p className="font-medium text-right">{formatCurrency(compensationSummary.benefitsValue)}</p>
                  <p className="text-muted-foreground">Est. total package</p>
                  <p className="font-semibold text-right">{formatCurrency(compensationSummary.gross)}</p>
                  <p className="text-muted-foreground">Est. net package</p>
                  <p className="font-semibold text-right text-green-700 dark:text-green-400">
                    {formatCurrency(compensationSummary.net)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-navy-600" />
              Offer Comparator
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { key: "A", value: offerA, setter: setOfferA },
                { key: "B", value: offerB, setter: setOfferB },
              ].map((offer) => (
                <div key={offer.key} className="rounded-xl border border-border bg-secondary/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Offer {offer.key}</p>
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={offer.value.base}
                      onChange={(event) =>
                        offer.setter((current) => ({ ...current, base: Math.max(0, Number(event.target.value) || 0) }))
                      }
                      className="input-field h-9 text-sm"
                      placeholder="Base"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={offer.value.bonusPct}
                        onChange={(event) =>
                          offer.setter((current) => ({ ...current, bonusPct: clamp(Number(event.target.value) || 0, 0, 60) }))
                        }
                        className="input-field h-9 text-sm"
                        placeholder="Bonus %"
                      />
                      <input
                        type="number"
                        value={offer.value.equity}
                        onChange={(event) =>
                          offer.setter((current) => ({ ...current, equity: Math.max(0, Number(event.target.value) || 0) }))
                        }
                        className="input-field h-9 text-sm"
                        placeholder="Equity"
                      />
                      <input
                        type="number"
                        value={offer.value.signOn}
                        onChange={(event) =>
                          offer.setter((current) => ({ ...current, signOn: Math.max(0, Number(event.target.value) || 0) }))
                        }
                        className="input-field h-9 text-sm"
                        placeholder="Sign-on"
                      />
                    </div>
                    <p className="text-sm font-semibold">
                      Total: {formatCurrency(calcOfferTotal(offer.value))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-saffron-500/25 bg-saffron-500/10 px-3 py-2">
              <p className="text-sm">
                Best total comp: <span className="font-semibold">{bestOfferLabel}</span>{" "}
                ({formatCurrency(Math.max(offerATotal, offerBTotal))})
              </p>
            </div>
          </div>

          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Percent className="w-5 h-5 text-purple-500" />
              Skill Premiums (Live Demand)
            </h3>
            <div className="space-y-2">
              {(liveData?.skillPremiums || []).map((item) => (
                <div key={item.skill} className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{item.skill}</p>
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                      +{item.premiumPct}%
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Demand: {item.demand}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-4 sm:p-5 lg:p-6 border-2 border-saffron-500/20 bg-saffron-50/50 dark:bg-saffron-950/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-saffron-600 dark:text-saffron-400" />
              Negotiation Playbook
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-saffron-600 dark:text-saffron-400" />
                <span>Location-adjusted target ask: <strong>{formatCurrency(targetAsk)}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 mt-0.5 text-saffron-600 dark:text-saffron-400" />
                <span>Walk-away floor: <strong>{formatCurrency(walkAwayFloor)}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Activity className="w-4 h-4 mt-0.5 text-saffron-600 dark:text-saffron-400" />
                <span>Anchor with market midpoint + scope impact + skill premium evidence.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {(loading || refreshing) && (
        <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Updating live salary market data...
        </div>
      )}
    </div>
  )
}
