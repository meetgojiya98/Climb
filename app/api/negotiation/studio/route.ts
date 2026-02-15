import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"

export const dynamic = "force-dynamic"

const OfferSchema = z.object({
  label: z.string().min(1).max(40),
  base: z.number().min(0).max(2_000_000),
  bonusPct: z.number().min(0).max(120).default(0),
  equityAnnual: z.number().min(0).max(2_000_000).default(0),
  signOn: z.number().min(0).max(1_000_000).default(0),
  location: z.string().max(120).optional(),
})

const RequestSchema = z.object({
  role: z.string().min(2).max(120),
  country: z.string().min(2).max(120),
  riskTolerance: z.enum(["low", "medium", "high"]).default("medium"),
  offers: z.array(OfferSchema).min(1).max(5),
})

type OfferInput = z.infer<typeof OfferSchema>

const ROLE_BASELINES: Record<string, { min: number; mid: number; max: number }> = {
  "software engineer": { min: 100000, mid: 145000, max: 220000 },
  "senior software engineer": { min: 145000, mid: 188000, max: 280000 },
  "product manager": { min: 110000, mid: 152000, max: 235000 },
  "senior product manager": { min: 145000, mid: 192000, max: 275000 },
  "data scientist": { min: 105000, mid: 148000, max: 225000 },
  "ux designer": { min: 90000, mid: 126000, max: 190000 },
  "devops engineer": { min: 115000, mid: 158000, max: 235000 },
  "engineering manager": { min: 165000, mid: 222000, max: 335000 },
}

const COUNTRY_TAX_RATE_HINTS: Array<{ key: string; rate: number }> = [
  { key: "united states", rate: 0.31 },
  { key: "usa", rate: 0.31 },
  { key: "canada", rate: 0.34 },
  { key: "united kingdom", rate: 0.37 },
  { key: "uk", rate: 0.37 },
  { key: "germany", rate: 0.39 },
  { key: "france", rate: 0.41 },
  { key: "india", rate: 0.27 },
  { key: "singapore", rate: 0.16 },
  { key: "australia", rate: 0.32 },
  { key: "uae", rate: 0.05 },
]

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function resolveBaseline(role: string) {
  const normalized = normalizeText(role)
  for (const [key, band] of Object.entries(ROLE_BASELINES)) {
    if (normalized.includes(key)) return band
  }
  return ROLE_BASELINES["software engineer"]
}

function resolveTaxRate(country: string) {
  const normalized = normalizeText(country)
  for (const item of COUNTRY_TAX_RATE_HINTS) {
    if (normalized.includes(item.key)) return item.rate
  }
  return 0.3
}

function computeOfferStats(offer: OfferInput, taxRate: number) {
  const annualBonus = Math.round((offer.base * offer.bonusPct) / 100)
  const grossTotal = offer.base + annualBonus + offer.equityAnnual + offer.signOn
  const postTaxTotal = Math.round(grossTotal * (1 - taxRate))
  const cashTotal = offer.base + annualBonus + offer.signOn
  return {
    ...offer,
    annualBonus,
    grossTotal,
    postTaxTotal,
    cashTotal,
  }
}

function rankOffer(offer: ReturnType<typeof computeOfferStats>, riskTolerance: "low" | "medium" | "high") {
  const equityWeight = riskTolerance === "high" ? 1 : riskTolerance === "medium" ? 0.65 : 0.4
  const signOnWeight = riskTolerance === "low" ? 1.1 : 1
  return offer.base + offer.annualBonus + offer.signOn * signOnWeight + offer.equityAnnual * equityWeight
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`negotiation-studio:${getClientIp(request)}`, 40, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, RequestSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const taxRate = resolveTaxRate(body.country)
    const benchmark = resolveBaseline(body.role)

    const offerStats = body.offers.map((offer) => computeOfferStats(offer, taxRate))
    const ranked = offerStats
      .map((offer) => ({
        ...offer,
        weightedScore: rankOffer(offer, body.riskTolerance),
      }))
      .sort((a, b) => b.weightedScore - a.weightedScore)

    const best = ranked[0]
    const benchmarkMid = benchmark.mid
    const bestVsBenchmarkPct = Math.round(((best.grossTotal - benchmarkMid) / Math.max(1, benchmarkMid)) * 100)
    const targetCounterBase = Math.round(best.base * 1.06)
    const targetCounterSignOn = Math.round(best.signOn * 1.2)

    const scenarioComparisons = ranked.map((offer) => {
      const benchmarkGapPct = Math.round(((offer.grossTotal - benchmarkMid) / Math.max(1, benchmarkMid)) * 100)
      return {
        label: offer.label,
        grossTotal: offer.grossTotal,
        postTaxTotal: offer.postTaxTotal,
        weightedScore: Math.round(offer.weightedScore),
        benchmarkGapPct,
      }
    })

    const scripts = {
      primaryAsk: `Thanks again for the offer. Based on the scope for ${body.role}, current market ranges, and the impact I expect to deliver, I would like to align the package closer to a base of $${targetCounterBase.toLocaleString()} with a sign-on of $${targetCounterSignOn.toLocaleString()}.`,
      dataBackedCounter: `I evaluated the offer against current ${body.role} market data in ${body.country}. The package is close, and with a small adjustment on base/equity I can commit immediately and focus on execution from day one.`,
      fallbackClose: "If we can close the gap on either base or equity this week, I am ready to move forward and sign.",
    }

    return ok({
      success: true,
      generatedAt: new Date().toISOString(),
      benchmark: {
        role: body.role,
        country: body.country,
        min: benchmark.min,
        mid: benchmark.mid,
        max: benchmark.max,
      },
      taxRate,
      recommendation: {
        bestOfferLabel: best.label,
        bestVsBenchmarkPct,
        negotiationPriority:
          bestVsBenchmarkPct < 0
            ? "Raise base first, then sign-on."
            : body.riskTolerance === "low"
              ? "De-risk equity and improve guaranteed cash."
              : "Optimize total upside while protecting downside.",
      },
      scenarioComparisons,
      scripts,
      offers: ranked,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run negotiation studio"
    return fail(message, 500)
  }
}

