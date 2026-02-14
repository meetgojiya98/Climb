"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, RefreshCw, Sparkles, Target } from "lucide-react"
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
  | "horizons"
  | "resumes"
  | "roles"
  | "interviews"

type MissionMode = "strategy" | "execution" | "coach"

interface CopilotAction {
  title: string
  detail: string
  href: string
  priority: "high" | "medium" | "low"
}

interface CopilotPayload {
  summary: string
  answer: string
  actionPlan: CopilotAction[]
  quickReplies: string[]
  confidence: number
}

interface AIMission {
  id: string
  title: string
  objective: string
  prompt: string
  href: string
  priority: "high" | "medium" | "low"
}

interface AIMissionConsoleProps {
  surface: CopilotSurface
  title?: string
  description?: string
  missions: AIMission[]
  className?: string
}

const MODE_CONFIG: Record<
  MissionMode,
  {
    label: string
    prefix: string
  }
> = {
  strategy: {
    label: "Strategy",
    prefix: "Mode: Strategy. Build a KPI-led plan with sequencing and tradeoffs.",
  },
  execution: {
    label: "Execution",
    prefix: "Mode: Execution. Return immediate next actions with order and time-boxing.",
  },
  coach: {
    label: "Coach",
    prefix: "Mode: Coach. Emphasize quality improvements, clarity, and capability development.",
  },
}

function storageKey(surface: CopilotSurface) {
  return `climb:ai-missions:done:${surface}:v1`
}

export function AIMissionConsole({
  surface,
  title = "AI Mission Console",
  description = "Run guided AI missions to execute faster with enterprise discipline.",
  missions,
  className,
}: AIMissionConsoleProps) {
  const [mode, setMode] = useState<MissionMode>("execution")
  const [selectedMissionId, setSelectedMissionId] = useState(missions[0]?.id || "")
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, CopilotPayload>>({})
  const [doneState, setDoneState] = useState<Record<string, boolean>>({})

  const selectedMission = useMemo(
    () => missions.find((mission) => mission.id === selectedMissionId) || missions[0],
    [missions, selectedMissionId]
  )

  useEffect(() => {
    if (missions.length === 0) return
    if (!selectedMissionId || !missions.some((mission) => mission.id === selectedMissionId)) {
      setSelectedMissionId(missions[0].id)
    }
  }, [missions, selectedMissionId])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(surface))
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") {
        setDoneState(parsed)
      }
    } catch {
      window.localStorage.removeItem(storageKey(surface))
    }
  }, [surface])

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(surface), JSON.stringify(doneState))
    } catch {
      // ignore persistence failures
    }
  }, [doneState, surface])

  const doneCount = useMemo(
    () => missions.filter((mission) => doneState[mission.id]).length,
    [doneState, missions]
  )

  const completionPct = missions.length > 0 ? Math.round((doneCount / missions.length) * 100) : 0

  const runMission = async (mission: AIMission, customPrompt?: string) => {
    if (!mission || running) return
    setRunning(true)
    setError(null)

    try {
      const modePrefix = MODE_CONFIG[mode].prefix
      const message = [
        modePrefix,
        `Mission title: ${mission.title}`,
        `Mission objective: ${mission.objective}`,
        `Request: ${customPrompt || mission.prompt}`,
      ].join("\n")

      const response = await fetch("/api/agent/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          surface,
          history: [],
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Unable to run AI mission")
      }

      const payload = data?.response || {}
      const normalized: CopilotPayload = {
        summary: String(payload.summary || ""),
        answer: String(payload.answer || ""),
        actionPlan: Array.isArray(payload.actionPlan) ? payload.actionPlan : [],
        quickReplies: Array.isArray(payload.quickReplies) ? payload.quickReplies : [],
        confidence: Number(payload.confidence || 0.5),
      }

      setResults((prev) => ({ ...prev, [mission.id]: normalized }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mission request failed")
    } finally {
      setRunning(false)
    }
  }

  const toggleDone = (id: string) => {
    setDoneState((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <section className={cn("card-elevated p-4 sm:p-5 lg:p-6", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-saffron-500/10 px-3 py-1 text-xs font-medium text-saffron-700">
            <Sparkles className="h-3.5 w-3.5" />
            AI Orchestration
          </div>
          <h2 className="font-semibold mt-2">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>

        <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2 min-w-[180px]">
          <div className="text-xs text-muted-foreground">Mission Progress</div>
          <div className="text-lg font-semibold">{doneCount}/{missions.length}</div>
          <div className="h-1.5 rounded-full bg-secondary mt-1 overflow-hidden">
            <div className="h-full bg-saffron-500" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 mb-2">
            {(Object.keys(MODE_CONFIG) as MissionMode[]).map((modeKey) => (
              <button
                key={modeKey}
                type="button"
                onClick={() => setMode(modeKey)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  mode === modeKey
                    ? "border-saffron-500/40 bg-saffron-500/10 text-saffron-700"
                    : "border-border hover:bg-secondary"
                )}
              >
                {MODE_CONFIG[modeKey].label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {missions.map((mission) => {
              const selected = mission.id === selectedMission?.id
              const done = Boolean(doneState[mission.id])

              return (
                <button
                  key={mission.id}
                  type="button"
                  onClick={() => setSelectedMissionId(mission.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-colors",
                    selected ? "border-saffron-500/35 bg-saffron-500/5" : "border-border hover:bg-secondary/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{mission.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{mission.objective}</p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded",
                        mission.priority === "high"
                          ? "bg-red-500/15 text-red-700"
                          : mission.priority === "medium"
                          ? "bg-saffron-500/15 text-saffron-700"
                          : "bg-blue-500/15 text-blue-700"
                      )}
                    >
                      {mission.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Link
                      href={mission.href}
                      className="text-xs text-saffron-600 hover:underline inline-flex items-center gap-1"
                      onClick={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      Open module
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleDone(mission.id)
                      }}
                      className={cn(
                        "text-[11px] rounded-full border px-2 py-0.5 transition-colors inline-flex items-center gap-1",
                        done
                          ? "border-green-500/35 bg-green-500/10 text-green-700"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {done ? "Done" : "Mark done"}
                    </button>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {selectedMission && (
          <div className="rounded-2xl border border-border p-4 sm:p-5 bg-secondary/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{selectedMission.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedMission.prompt}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void runMission(selectedMission)
                }}
                disabled={running}
                className="btn-saffron text-xs px-3 py-2"
              >
                {running ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
                {running ? "Running..." : "Run Mission"}
              </button>
            </div>

            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

            {!results[selectedMission.id] ? (
              <div className="mt-4 rounded-xl border border-border bg-background/80 p-3 text-xs text-muted-foreground">
                Run the mission to generate a prioritized AI action ladder with direct links.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-border bg-background/80 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{results[selectedMission.id].summary}</p>
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{results[selectedMission.id].answer}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Confidence {Math.round(Math.max(0, Math.min(1, results[selectedMission.id].confidence)) * 100)}%
                  </p>
                </div>

                <div className="space-y-2">
                  {results[selectedMission.id].actionPlan.slice(0, 4).map((action, index) => (
                    <Link
                      key={`${action.title}-${index}`}
                      href={action.href || "/app/dashboard"}
                      className="block rounded-xl border border-border bg-background/80 p-3 hover:bg-secondary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="inline-flex items-center gap-2">
                            <span
                              className={cn(
                                "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded",
                                action.priority === "high"
                                  ? "bg-red-500/15 text-red-700"
                                  : action.priority === "medium"
                                  ? "bg-saffron-500/15 text-saffron-700"
                                  : "bg-blue-500/15 text-blue-700"
                              )}
                            >
                              {action.priority}
                            </span>
                            <p className="text-xs font-medium truncate">{action.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{action.detail}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>

                {results[selectedMission.id].quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {results[selectedMission.id].quickReplies.slice(0, 4).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          void runMission(selectedMission, prompt)
                        }}
                        className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-secondary transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
