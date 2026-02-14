"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type CopilotSurface =
  | "global"
  | "dashboard"
  | "applications"
  | "help"
  | "control-tower"
  | "program-office"
  | "command-center"
  | "forecast"
  | "resumes"
  | "interviews"

interface CopilotAction {
  title: string
  detail: string
  href: string
  priority: "high" | "medium" | "low"
}

interface CopilotBrief {
  summary: string
  answer: string
  actionPlan: CopilotAction[]
  quickReplies: string[]
  confidence: number
}

interface AIOpsBriefProps {
  surface: CopilotSurface
  title?: string
  description?: string
  defaultPrompt: string
  prompts?: string[]
  className?: string
}

export function AIOpsBrief({
  surface,
  title = "AI Operations Brief",
  description = "Generate an enterprise action brief with prioritized execution steps.",
  defaultPrompt,
  prompts = [],
  className,
}: AIOpsBriefProps) {
  const [brief, setBrief] = useState<CopilotBrief | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runBrief = async (prompt?: string) => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/agent/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt || defaultPrompt,
          surface,
          history: [],
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Unable to generate AI brief")
      }

      const payload = data?.response || {}
      setBrief({
        summary: String(payload.summary || ""),
        answer: String(payload.answer || ""),
        actionPlan: Array.isArray(payload.actionPlan) ? payload.actionPlan : [],
        quickReplies: Array.isArray(payload.quickReplies) ? payload.quickReplies : [],
        confidence: Number(payload.confidence || 0.5),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI brief request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={cn("relative overflow-hidden rounded-2xl border border-saffron-500/20", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900" />
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute top-0 right-0 w-36 h-36 bg-saffron-500/20 rounded-full blur-3xl" />

      <div className="relative p-4 sm:p-5 lg:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-saffron-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-saffron-300" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-white">{title}</h3>
                <p className="text-xs text-white/65">{description}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void runBrief()
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:text-white hover:border-saffron-400/45 transition-colors disabled:opacity-60"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {brief ? "Refresh" : "Generate"}
          </button>
        </div>

        {error && <p className="text-xs text-red-300">{error}</p>}

        {!brief ? (
          <div className="space-y-3">
            <p className="text-sm text-white/80">Run this brief to get a high-priority action ladder with deep links.</p>
            {prompts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {prompts.slice(0, 3).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      void runBrief(prompt)
                    }}
                    className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/75 hover:text-white hover:border-saffron-400/40 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-saffron-300">{brief.summary}</p>
            <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{brief.answer}</p>

            <div className="grid gap-2 sm:grid-cols-2">
              {brief.actionPlan.slice(0, 4).map((action, index) => (
                <Link
                  key={`${action.title}-${index}`}
                  href={action.href || "/app/dashboard"}
                  className="rounded-lg border border-white/15 bg-white/5 p-2.5 hover:border-saffron-400/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded",
                            action.priority === "high"
                              ? "bg-red-500/20 text-red-200"
                              : action.priority === "medium"
                              ? "bg-saffron-500/20 text-saffron-200"
                              : "bg-blue-500/20 text-blue-200"
                          )}
                        >
                          {action.priority}
                        </span>
                        <p className="text-xs font-medium text-white truncate">{action.title}</p>
                      </div>
                      <p className="text-xs text-white/70">{action.detail}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-white/60 mt-0.5 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>

            {(brief.quickReplies.length > 0 || prompts.length > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {(brief.quickReplies.length > 0 ? brief.quickReplies : prompts).slice(0, 4).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      void runBrief(prompt)
                    }}
                    className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/75 hover:text-white hover:border-saffron-400/40 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <p className="text-[11px] text-white/55">
              Confidence {Math.round(Math.max(0, Math.min(1, brief.confidence)) * 100)}%
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
