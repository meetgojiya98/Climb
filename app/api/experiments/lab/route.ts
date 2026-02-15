import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"
import { generateId, loadModuleState, saveModuleState, safeIso } from "@/lib/platform-lab-store"

export const dynamic = "force-dynamic"

const STORAGE_KEY = "experiments-lab"

const VariantSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(2).max(120),
})

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createExperiment"),
    payload: z.object({
      name: z.string().min(2).max(140),
      hypothesis: z.string().min(6).max(500),
      metric: z.enum(["reply_rate", "interview_rate", "offer_rate", "time_to_stage"]),
      variants: z.array(VariantSchema).min(2).max(8),
    }),
  }),
  z.object({
    action: z.literal("logRun"),
    payload: z.object({
      experimentId: z.string().min(1),
      variantId: z.string().min(1),
      sampleSize: z.number().min(1).max(5000),
      conversions: z.number().min(0).max(5000),
    }),
  }),
  z.object({
    action: z.literal("setStatus"),
    payload: z.object({
      experimentId: z.string().min(1),
      status: z.enum(["draft", "running", "completed", "archived"]),
    }),
  }),
])

type ExperimentRun = {
  id: string
  variantId: string
  sampleSize: number
  conversions: number
  createdAt: string
}

type Experiment = {
  id: string
  name: string
  hypothesis: string
  metric: "reply_rate" | "interview_rate" | "offer_rate" | "time_to_stage"
  status: "draft" | "running" | "completed" | "archived"
  variants: Array<{ id: string; label: string }>
  runs: ExperimentRun[]
  createdAt: string
  updatedAt: string
}

type ExperimentState = {
  experiments: Experiment[]
}

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

function sanitizeState(input: unknown): ExperimentState {
  if (!input || typeof input !== "object") return { experiments: [] }
  const payload = input as { experiments?: unknown[] }
  if (!Array.isArray(payload.experiments)) return { experiments: [] }

  const experiments = payload.experiments
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const value = item as Record<string, unknown>
      if (typeof value.id !== "string" || typeof value.name !== "string" || typeof value.hypothesis !== "string") {
        return null
      }
      const metric =
        value.metric === "interview_rate" || value.metric === "offer_rate" || value.metric === "time_to_stage"
          ? value.metric
          : "reply_rate"
      const status =
        value.status === "running" || value.status === "completed" || value.status === "archived"
          ? value.status
          : "draft"

      const variants = Array.isArray(value.variants)
        ? value.variants
            .map((entry) => {
              if (!entry || typeof entry !== "object") return null
              const row = entry as Record<string, unknown>
              if (typeof row.id !== "string" || typeof row.label !== "string") return null
              return { id: row.id, label: row.label }
            })
            .filter((entry): entry is { id: string; label: string } => Boolean(entry))
            .slice(0, 8)
        : []
      if (variants.length < 2) return null

      const runs = Array.isArray(value.runs)
        ? value.runs
            .map((entry) => {
              if (!entry || typeof entry !== "object") return null
              const row = entry as Record<string, unknown>
              if (typeof row.id !== "string" || typeof row.variantId !== "string") return null
              return {
                id: row.id,
                variantId: row.variantId,
                sampleSize: Math.max(1, Math.round(Number(row.sampleSize || 1))),
                conversions: Math.max(0, Math.round(Number(row.conversions || 0))),
                createdAt: safeIso(typeof row.createdAt === "string" ? row.createdAt : null) || new Date().toISOString(),
              } satisfies ExperimentRun
            })
            .filter((entry): entry is ExperimentRun => Boolean(entry))
            .slice(-400)
        : []

      return {
        id: value.id,
        name: value.name,
        hypothesis: value.hypothesis,
        metric,
        status,
        variants,
        runs,
        createdAt: safeIso(typeof value.createdAt === "string" ? value.createdAt : null) || new Date().toISOString(),
        updatedAt: safeIso(typeof value.updatedAt === "string" ? value.updatedAt : null) || new Date().toISOString(),
      } satisfies Experiment
    })
    .filter((item): item is Experiment => Boolean(item))
    .slice(-80)

  return { experiments }
}

function summarizeExperiment(experiment: Experiment) {
  const variantStats = experiment.variants.map((variant) => {
    const runs = experiment.runs.filter((run) => run.variantId === variant.id)
    const sampleSize = runs.reduce((sum, run) => sum + run.sampleSize, 0)
    const conversions = runs.reduce((sum, run) => sum + run.conversions, 0)
    const rate = sampleSize > 0 ? Number(((conversions / sampleSize) * 100).toFixed(2)) : 0
    return {
      variantId: variant.id,
      label: variant.label,
      sampleSize,
      conversions,
      rate,
    }
  })

  const ranked = variantStats.slice().sort((a, b) => b.rate - a.rate)
  const control = ranked[0]
  const runnerUp = ranked[1]
  const lift = control && runnerUp ? Number((control.rate - runnerUp.rate).toFixed(2)) : 0
  const sampleDelta = control && runnerUp ? Math.abs(control.sampleSize - runnerUp.sampleSize) : 0
  const confidence = control && runnerUp
    ? Math.min(100, Math.max(20, Math.round(45 + Math.abs(lift) * 3 + (Math.min(control.sampleSize, runnerUp.sampleSize) / 200) * 20 - sampleDelta / 50)))
    : 0

  return {
    experimentId: experiment.id,
    name: experiment.name,
    metric: experiment.metric,
    status: experiment.status,
    variants: ranked,
    winner: control || null,
    lift,
    confidence,
  }
}

function summarizePortfolio(experiments: Experiment[]) {
  const running = experiments.filter((item) => item.status === "running").length
  const completed = experiments.filter((item) => item.status === "completed").length
  const totalRuns = experiments.reduce((sum, item) => sum + item.runs.length, 0)
  return {
    totalExperiments: experiments.length,
    running,
    completed,
    draft: experiments.filter((item) => item.status === "draft").length,
    archived: experiments.filter((item) => item.status === "archived").length,
    totalRuns,
  }
}

async function readState(supabase: any, userId: string) {
  return loadModuleState<ExperimentState>(supabase, userId, STORAGE_KEY, { experiments: [] }, sanitizeState)
}

export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`experiments-lab:get:${getClientIp(request)}`, 100, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    const module = await readState(supabase, user.id)
    const experiments = module.state.experiments
      .slice()
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))

    return ok({
      success: true,
      experiments,
      summaries: experiments.map(summarizeExperiment),
      portfolioSummary: summarizePortfolio(experiments),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load experiments"
    return fail(message, 500)
  }
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`experiments-lab:post:${getClientIp(request)}`, 80, 60_000)
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

    if (body.action === "createExperiment") {
      const variants = body.payload.variants.map((variant) => ({
        id: variant.id || generateId("variant"),
        label: variant.label,
      }))
      const experiment: Experiment = {
        id: generateId("experiment"),
        name: body.payload.name,
        hypothesis: body.payload.hypothesis,
        metric: body.payload.metric,
        status: "draft",
        variants,
        runs: [],
        createdAt: now,
        updatedAt: now,
      }
      nextState = {
        experiments: [...state.experiments, experiment].slice(-80),
      }
    }

    if (body.action === "logRun") {
      nextState = {
        experiments: state.experiments.map((experiment) =>
          experiment.id === body.payload.experimentId
            ? {
                ...experiment,
                status: experiment.status === "draft" ? "running" : experiment.status,
                updatedAt: now,
                runs: [
                  ...experiment.runs,
                  {
                    id: generateId("run"),
                    variantId: body.payload.variantId,
                    sampleSize: body.payload.sampleSize,
                    conversions: Math.min(body.payload.conversions, body.payload.sampleSize),
                    createdAt: now,
                  },
                ].slice(-400),
              }
            : experiment
        ),
      }
    }

    if (body.action === "setStatus") {
      nextState = {
        experiments: state.experiments.map((experiment) =>
          experiment.id === body.payload.experimentId
            ? { ...experiment, status: body.payload.status, updatedAt: now }
            : experiment
        ),
      }
    }

    await saveModuleState(supabase, user.id, STORAGE_KEY, nextState, module.recordId)

    return ok({
      success: true,
      experiments: nextState.experiments,
      summaries: nextState.experiments.map(summarizeExperiment),
      portfolioSummary: summarizePortfolio(nextState.experiments),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update experiments lab"
    return fail(message, 500)
  }
}
