"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  Bell,
  Brain,
  Briefcase,
  Calendar,
  Database,
  Download,
  Gauge,
  GitBranch,
  Link2,
  Lock,
  Network,
  RefreshCw,
  Rocket,
  Shield,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react"
import { cn } from "@/lib/utils"

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null
  if (!response.ok || payload === null || (payload as { success?: boolean }).success === false) {
    throw new Error((payload as { error?: string } | null)?.error || `Request failed (${response.status})`)
  }
  return payload as T
}

function JsonPreview({ data }: { data: unknown }) {
  return (
    <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-background/85 p-3 text-xs text-muted-foreground">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

function FeatureCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <article className="section-shell section-stack">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl border border-border bg-background/70 p-2">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </article>
  )
}

export default function PlatformLabPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const [inboxAccounts, setInboxAccounts] = useState<unknown>(null)
  const [calendarIntegrations, setCalendarIntegrations] = useState<unknown>(null)
  const [atsState, setAtsState] = useState<unknown>(null)
  const [rulesState, setRulesState] = useState<unknown>(null)
  const [memoryState, setMemoryState] = useState<unknown>(null)
  const [videoState, setVideoState] = useState<unknown>(null)
  const [fitGraphState, setFitGraphState] = useState<unknown>(null)
  const [versionState, setVersionState] = useState<unknown>(null)
  const [referralState, setReferralState] = useState<unknown>(null)
  const [coachingState, setCoachingState] = useState<unknown>(null)
  const [authStackState, setAuthStackState] = useState<unknown>(null)
  const [auditState, setAuditState] = useState<unknown>(null)
  const [mobileState, setMobileState] = useState<unknown>(null)
  const [experimentState, setExperimentState] = useState<unknown>(null)
  const [billingState, setBillingState] = useState<unknown>(null)

  const [inboxEmail, setInboxEmail] = useState("me@example.com")
  const [calendarEmail, setCalendarEmail] = useState("me@example.com")
  const [atsWorkspace, setAtsWorkspace] = useState("Personal Workspace")
  const [memoryGoal, setMemoryGoal] = useState("Increase interview rate to 25% in 6 weeks")
  const [videoTranscript, setVideoTranscript] = useState("I led a cross-functional launch, aligned engineering and design, and improved conversion by 14%.")
  const [fitSkills, setFitSkills] = useState("system design, analytics, stakeholder management, sql")
  const [docContent, setDocContent] = useState("Built and launched onboarding redesign, increasing activation by 18%.")
  const [referralCompany, setReferralCompany] = useState("Stripe")
  const [coachingTitle, setCoachingTitle] = useState("Review PM resume v4")
  const [ssoMetadata, setSsoMetadata] = useState("https://idp.example.com/metadata")
  const [alertTitle, setAlertTitle] = useState("Follow-up due")
  const [experimentName, setExperimentName] = useState("Prompt variant test")

  const totals = useMemo(() => {
    const sections = [
      inboxAccounts,
      calendarIntegrations,
      atsState,
      rulesState,
      memoryState,
      videoState,
      fitGraphState,
      versionState,
      referralState,
      coachingState,
      authStackState,
      auditState,
      mobileState,
      experimentState,
      billingState,
    ]
    return {
      readyCount: sections.filter((item) => item !== null).length,
      total: sections.length,
    }
  }, [
    inboxAccounts,
    calendarIntegrations,
    atsState,
    rulesState,
    memoryState,
    videoState,
    fitGraphState,
    versionState,
    referralState,
    coachingState,
    authStackState,
    auditState,
    mobileState,
    experimentState,
    billingState,
  ])

  const run = async (key: string, action: () => Promise<void>) => {
    setBusyKey(key)
    setStatus(null)
    try {
      await action()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Action failed")
    } finally {
      setBusyKey(null)
    }
  }

  const refreshAll = async () => {
    await run("refresh-all", async () => {
      const [
        inbox,
        calendar,
        ats,
        rules,
        memory,
        video,
        versions,
        referrals,
        coaching,
        auth,
        audit,
        mobile,
        experiments,
        billing,
      ] = await Promise.all([
        fetchJson<any>("/api/integrations/inbox-accounts"),
        fetchJson<any>("/api/integrations/calendar"),
        fetchJson<any>("/api/integrations/ats-sync"),
        fetchJson<any>("/api/automation/rules"),
        fetchJson<any>("/api/ai/memory-profile"),
        fetchJson<any>("/api/interview/video-analysis"),
        fetchJson<any>("/api/documents/versioning"),
        fetchJson<any>("/api/referrals/pipeline"),
        fetchJson<any>("/api/coaching/queue"),
        fetchJson<any>("/api/enterprise/auth-stack"),
        fetchJson<any>("/api/audit/timeline"),
        fetchJson<any>("/api/mobile/alerts"),
        fetchJson<any>("/api/experiments/lab"),
        fetchJson<any>("/api/billing/usage"),
      ])

      setInboxAccounts(inbox)
      setCalendarIntegrations(calendar)
      setAtsState(ats)
      setRulesState(rules)
      setMemoryState(memory)
      setVideoState(video)
      setVersionState(versions)
      setReferralState(referrals)
      setCoachingState(coaching)
      setAuthStackState(auth)
      setAuditState(audit)
      setMobileState(mobile)
      setExperimentState(experiments)
      setBillingState(billing)
      setStatus("All platform modules refreshed.")
    })
  }

  useEffect(() => {
    void refreshAll()
  }, [])

  const isBusy = (key: string) => busyKey === key

  return (
    <div className="section-stack-lg p-4 sm:p-6 lg:p-8">
      <section className="section-shell section-stack">
        <div className="surface-header">
          <div className="space-y-2">
            <span className="badge badge-secondary w-fit">Platform Lab</span>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Advanced Product Expansion</h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
              Central control for the 15 high-impact expansion tracks: integrations, automation, analytics, security,
              experimentation, and enterprise billing.
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={() => void refreshAll()} disabled={isBusy("refresh-all")}>
            <RefreshCw className={cn("h-4 w-4", isBusy("refresh-all") && "animate-spin")} />
            Refresh Modules ({totals.readyCount}/{totals.total})
          </button>
        </div>
        {status && <div className="rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground">{status}</div>}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <FeatureCard
          icon={<Link2 className="h-4 w-4 text-saffron-500" />}
          title="1) Gmail/Outlook OAuth + Polling"
          subtitle="Connect inbox accounts and run continuous sync polling."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input-field" value={inboxEmail} onChange={(event) => setInboxEmail(event.target.value)} placeholder="user@company.com" />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-outline"
                disabled={isBusy("connect-gmail")}
                onClick={() =>
                  void run("connect-gmail", async () => {
                    const next = await fetchJson<any>("/api/integrations/inbox-accounts", {
                      method: "POST",
                      body: JSON.stringify({ action: "connect", payload: { provider: "gmail", email: inboxEmail } }),
                    })
                    setInboxAccounts(next)
                    setStatus("Gmail connector saved.")
                  })
                }
              >
                Connect Gmail
              </button>
              <button
                type="button"
                className="btn-outline"
                disabled={isBusy("connect-outlook")}
                onClick={() =>
                  void run("connect-outlook", async () => {
                    const next = await fetchJson<any>("/api/integrations/inbox-accounts", {
                      method: "POST",
                      body: JSON.stringify({ action: "connect", payload: { provider: "outlook", email: inboxEmail } }),
                    })
                    setInboxAccounts(next)
                    setStatus("Outlook connector saved.")
                  })
                }
              >
                Connect Outlook
              </button>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary w-fit"
            disabled={isBusy("poll-inbox")}
            onClick={() =>
              void run("poll-inbox", async () => {
                const poll = await fetchJson<any>("/api/integrations/inbox-accounts/poll", { method: "POST", body: JSON.stringify({}) })
                setStatus(`Inbox polling executed. Updates: ${poll.updates?.length || 0}`)
                const inbox = await fetchJson<any>("/api/integrations/inbox-accounts")
                setInboxAccounts(inbox)
              })
            }
          >
            Run Poll Cycle
          </button>
          <JsonPreview data={inboxAccounts || { loading: true }} />
        </FeatureCard>

        <FeatureCard
          icon={<Calendar className="h-4 w-4 text-saffron-500" />}
          title="2) Calendar Write-Back"
          subtitle="Connect Google/Outlook Calendar and accept autopilot blocks into schedule history."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input-field" value={calendarEmail} onChange={(event) => setCalendarEmail(event.target.value)} placeholder="calendar@company.com" />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-outline"
                disabled={isBusy("connect-google-cal")}
                onClick={() =>
                  void run("connect-google-cal", async () => {
                    const next = await fetchJson<any>("/api/integrations/calendar", {
                      method: "POST",
                      body: JSON.stringify({ action: "connect", payload: { provider: "google", email: calendarEmail } }),
                    })
                    setCalendarIntegrations(next)
                  })
                }
              >
                Connect Google
              </button>
              <button
                type="button"
                className="btn-outline"
                disabled={isBusy("connect-outlook-cal")}
                onClick={() =>
                  void run("connect-outlook-cal", async () => {
                    const next = await fetchJson<any>("/api/integrations/calendar", {
                      method: "POST",
                      body: JSON.stringify({ action: "connect", payload: { provider: "outlook", email: calendarEmail } }),
                    })
                    setCalendarIntegrations(next)
                  })
                }
              >
                Connect Outlook
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary w-fit"
            disabled={isBusy("accept-plan")}
            onClick={() =>
              void run("accept-plan", async () => {
                const autopilot = await fetchJson<any>("/api/autopilot/weekly-plan", {
                  method: "POST",
                  body: JSON.stringify({
                    weeklyHours: 8,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
                    focusMix: ["pipeline", "resume", "interview"],
                  }),
                })

                await fetchJson<any>("/api/calendar/plan/accept", {
                  method: "POST",
                  body: JSON.stringify({
                    provider: "google",
                    timezone: autopilot.plan.timezone,
                    blocks: autopilot.plan.blocks.slice(0, 8).map((item: any) => ({
                      id: item.id,
                      title: item.title,
                      description: item.description,
                      startAt: item.startAt,
                      endAt: item.endAt,
                    })),
                  }),
                })

                const next = await fetchJson<any>("/api/integrations/calendar")
                setCalendarIntegrations(next)
                setStatus("Autopilot blocks accepted into calendar write-back queue.")
              })
            }
          >
            Accept Weekly Plan to Calendar
          </button>
          <JsonPreview data={calendarIntegrations || { loading: true }} />
        </FeatureCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <FeatureCard
          icon={<Briefcase className="h-4 w-4 text-saffron-500" />}
          title="3) ATS Connectors"
          subtitle="Greenhouse, Lever, Workday stage sync with application updates."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input-field" value={atsWorkspace} onChange={(event) => setAtsWorkspace(event.target.value)} placeholder="Workspace" />
            <div className="flex flex-wrap gap-2">
              {["greenhouse", "lever", "workday"].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  className="btn-outline text-xs"
                  disabled={Boolean(busyKey)}
                  onClick={() =>
                    void run(`connect-${provider}`, async () => {
                      const next = await fetchJson<any>("/api/integrations/ats-sync", {
                        method: "POST",
                        body: JSON.stringify({ action: "connect", payload: { provider, workspace: atsWorkspace } }),
                      })
                      setAtsState(next)
                    })
                  }
                >
                  Connect {provider}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="btn-primary w-fit"
            disabled={isBusy("run-ats-sync")}
            onClick={() =>
              void run("run-ats-sync", async () => {
                const current = (atsState as any)?.connectors?.[0]
                if (!current?.id) throw new Error("Connect an ATS first.")
                const next = await fetchJson<any>("/api/integrations/ats-sync", {
                  method: "POST",
                  body: JSON.stringify({ action: "runSync", payload: { connectorId: current.id } }),
                })
                setAtsState(next)
                setStatus("ATS sync completed.")
              })
            }
          >
            Run ATS Sync
          </button>
          <JsonPreview data={atsState || { loading: true }} />
        </FeatureCard>

        <FeatureCard
          icon={<Wand2 className="h-4 w-4 text-saffron-500" />}
          title="4) Automation Rules Engine"
          subtitle="If X then Y workflows for follow-ups, status changes, and attention flags."
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline"
              disabled={isBusy("add-rule")}
              onClick={() =>
                void run("add-rule", async () => {
                  const next = await fetchJson<any>("/api/automation/rules", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "create",
                      payload: {
                        name: "Stale applied > 7 days",
                        condition: "stale_days_gt",
                        threshold: 7,
                        action: "set_followup_tomorrow",
                        enabled: true,
                      },
                    }),
                  })
                  setRulesState(next)
                })
              }
            >
              Add Follow-up Rule
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isBusy("run-rules")}
              onClick={() =>
                void run("run-rules", async () => {
                  const result = await fetchJson<any>("/api/automation/rules/run", {
                    method: "POST",
                    body: JSON.stringify({}),
                  })
                  const latestRules = await fetchJson<any>("/api/automation/rules")
                  setRulesState({ ...latestRules, runResult: result })
                  setStatus("Rules engine executed against active applications.")
                })
              }
            >
              Run Rules
            </button>
          </div>
          <JsonPreview data={rulesState || { loading: true }} />
        </FeatureCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <FeatureCard
          icon={<Brain className="h-4 w-4 text-saffron-500" />}
          title="5) AI Memory Profile"
          subtitle="Persistent user goals, constraints, style, and risk profile."
        >
          <input className="input-field" value={memoryGoal} onChange={(event) => setMemoryGoal(event.target.value)} placeholder="Primary goal" />
          <button
            type="button"
            className="btn-primary w-fit"
            disabled={isBusy("save-memory")}
            onClick={() =>
              void run("save-memory", async () => {
                const next = await fetchJson<any>("/api/ai/memory-profile", {
                  method: "POST",
                  body: JSON.stringify({
                    goals: [memoryGoal],
                    constraints: ["Max 10 hours/week"],
                    preferredStyle: "Simple and direct",
                    riskTolerance: "medium",
                    weeklyAvailabilityHours: 10,
                  }),
                })
                setMemoryState(next)
                setStatus("AI memory profile updated.")
              })
            }
          >
            Save Memory Profile
          </button>
          <JsonPreview data={memoryState || { loading: true }} />
        </FeatureCard>

        <FeatureCard
          icon={<Activity className="h-4 w-4 text-saffron-500" />}
          title="6) Interview Video Analysis"
          subtitle="Pace, eye contact, filler words, confidence trend from transcript signals."
        >
          <textarea className="input-field min-h-[100px]" value={videoTranscript} onChange={(event) => setVideoTranscript(event.target.value)} />
          <button
            type="button"
            className="btn-primary w-fit"
            disabled={isBusy("analyze-video")}
            onClick={() =>
              void run("analyze-video", async () => {
                const next = await fetchJson<any>("/api/interview/video-analysis", {
                  method: "POST",
                  body: JSON.stringify({
                    question: "Describe a cross-functional launch.",
                    transcript: videoTranscript,
                    durationSec: 95,
                    eyeContactPct: 74,
                    confidenceSelfRating: 7,
                  }),
                })
                const latest = await fetchJson<any>("/api/interview/video-analysis")
                setVideoState({ ...latest, run: next })
              })
            }
          >
            Analyze Session
          </button>
          <JsonPreview data={videoState || { loading: true }} />
        </FeatureCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <FeatureCard
          icon={<Network className="h-4 w-4 text-saffron-500" />}
          title="7) Explainable Job Fit Graph"
          subtitle="Role-fit scoring graph with breakdown and reasons."
        >
          <input className="input-field" value={fitSkills} onChange={(event) => setFitSkills(event.target.value)} placeholder="skills (comma separated)" />
          <button
            type="button"
            className="btn-primary w-fit"
            disabled={isBusy("fit-graph")}
            onClick={() =>
              void run("fit-graph", async () => {
                const skills = fitSkills.split(",").map((item) => item.trim()).filter(Boolean)
                const next = await fetchJson<any>("/api/jobs/fit-graph", {
                  method: "POST",
                  body: JSON.stringify({
                    profile: {
                      skills,
                      yearsExperience: 6,
                      preferredLocation: "United States",
                      salaryTarget: 190000,
                    },
                  }),
                })
                setFitGraphState(next)
              })
            }
          >
            Build Fit Graph
          </button>
          <JsonPreview data={fitGraphState || { loading: true }} />
        </FeatureCard>

        <FeatureCard
          icon={<GitBranch className="h-4 w-4 text-saffron-500" />}
          title="8) Resume/Cover Versioning + Rollback"
          subtitle="Version control with conversion attribution per version."
        >
          <textarea className="input-field min-h-[90px]" value={docContent} onChange={(event) => setDocContent(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline"
              disabled={isBusy("save-version")}
              onClick={() =>
                void run("save-version", async () => {
                  const next = await fetchJson<any>("/api/documents/versioning", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "saveVersion",
                      payload: {
                        docType: "resume",
                        docId: "resume-main",
                        title: `Resume ${new Date().toLocaleDateString()}`,
                        content: docContent,
                      },
                    }),
                  })
                  setVersionState(next)
                })
              }
            >
              Save Version
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isBusy("log-conversion")}
              onClick={() =>
                void run("log-conversion", async () => {
                  const doc = (versionState as any)?.documents?.find((item: any) => item.docId === "resume-main")
                  const versionId = doc?.activeVersionId
                  if (!versionId) throw new Error("Create a version first.")
                  const next = await fetchJson<any>("/api/documents/versioning", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "logConversion",
                      payload: { docId: "resume-main", versionId, stage: "reply" },
                    }),
                  })
                  setVersionState(next)
                })
              }
            >
              Log Reply Conversion
            </button>
          </div>
          <JsonPreview data={versionState || { loading: true }} />
        </FeatureCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <FeatureCard
          icon={<Users className="h-4 w-4 text-saffron-500" />}
          title="9) Referral Pipeline"
          subtitle="Warm intro path scoring and outreach sequence automation."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input-field" value={referralCompany} onChange={(event) => setReferralCompany(event.target.value)} placeholder="Target company" />
            <button
              type="button"
              className="btn-primary"
              disabled={isBusy("add-referral")}
              onClick={() =>
                void run("add-referral", async () => {
                  const next = await fetchJson<any>("/api/referrals/pipeline", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "addOpportunity",
                      payload: {
                        company: referralCompany,
                        role: "Senior Product Manager",
                        contactName: "Alex Rivera",
                        warmPath: "ex-colleague",
                        introScore: 74,
                      },
                    }),
                  })
                  setReferralState(next)
                })
              }
            >
              Add Referral Opportunity
            </button>
          </div>
          <JsonPreview data={referralState || { loading: true }} />
        </FeatureCard>

        <FeatureCard
          icon={<Users className="h-4 w-4 text-saffron-500" />}
          title="10) Team Coaching Queue"
          subtitle="Reviewer queues with SLA timers and decision workflows."
        >
          <input className="input-field" value={coachingTitle} onChange={(event) => setCoachingTitle(event.target.value)} placeholder="Task title" />
          <button
            type="button"
            className="btn-primary w-fit"
            disabled={isBusy("create-coaching-task")}
            onClick={() =>
              void run("create-coaching-task", async () => {
                const next = await fetchJson<any>("/api/coaching/queue", {
                  method: "POST",
                  body: JSON.stringify({
                    action: "createTask",
                    payload: {
                      workspaceId: "personal-workspace",
                      title: coachingTitle,
                      reviewer: "Mentor Reviewer",
                      slaHours: 24,
                    },
                  }),
                })
                setCoachingState(next)
              })
            }
          >
            Add Coaching Task
          </button>
          <JsonPreview data={coachingState || { loading: true }} />
        </FeatureCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <FeatureCard
          icon={<Shield className="h-4 w-4 text-saffron-500" />}
          title="11) Enterprise Auth Stack"
          subtitle="SSO, SCIM provisioning, and policy controls."
        >
          <input className="input-field" value={ssoMetadata} onChange={(event) => setSsoMetadata(event.target.value)} placeholder="SSO metadata URL" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline"
              disabled={isBusy("add-sso")}
              onClick={() =>
                void run("add-sso", async () => {
                  const next = await fetchJson<any>("/api/enterprise/auth-stack", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "addSsoProvider",
                      payload: {
                        name: "Okta Corporate",
                        protocol: "saml",
                        metadataUrl: ssoMetadata,
                      },
                    }),
                  })
                  setAuthStackState(next)
                })
              }
            >
              Add SSO Provider
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isBusy("configure-scim")}
              onClick={() =>
                void run("configure-scim", async () => {
                  const next = await fetchJson<any>("/api/enterprise/auth-stack", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "configureScim",
                      payload: { enabled: true, endpoint: "https://api.climb.app/scim/v2", token: "tok_live_demo_123456" },
                    }),
                  })
                  setAuthStackState(next)
                })
              }
            >
              Enable SCIM
            </button>
          </div>
          <JsonPreview data={authStackState || { loading: true }} />
        </FeatureCard>

        <FeatureCard
          icon={<Download className="h-4 w-4 text-saffron-500" />}
          title="12) Audit Timeline + Export"
          subtitle="Unified audit stream with CSV export endpoint."
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline"
              disabled={isBusy("log-audit")}
              onClick={() =>
                void run("log-audit", async () => {
                  await fetchJson<any>("/api/audit/timeline", {
                    method: "POST",
                    body: JSON.stringify({ eventType: "platform.lab.action", metadata: { area: "audit" } }),
                  })
                  const next = await fetchJson<any>("/api/audit/timeline")
                  setAuditState(next)
                })
              }
            >
              Log Audit Event
            </button>
            <a href="/api/audit/timeline?format=csv" className="btn-primary">
              Download CSV
            </a>
          </div>
          <JsonPreview data={auditState || { loading: true }} />
        </FeatureCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <FeatureCard
          icon={<Bell className="h-4 w-4 text-saffron-500" />}
          title="13) Mobile Alerts + Next-Best-Action"
          subtitle="Register devices, push alerts, and show mobile action feed."
        >
          <input className="input-field" value={alertTitle} onChange={(event) => setAlertTitle(event.target.value)} placeholder="Alert title" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline"
              disabled={isBusy("register-device")}
              onClick={() =>
                void run("register-device", async () => {
                  const next = await fetchJson<any>("/api/mobile/alerts", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "registerDevice",
                      payload: { platform: "ios", label: "iPhone", token: "device_token_1234567890" },
                    }),
                  })
                  setMobileState(next)
                })
              }
            >
              Register Device
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isBusy("send-alert")}
              onClick={() =>
                void run("send-alert", async () => {
                  const next = await fetchJson<any>("/api/mobile/alerts", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "createAlert",
                      payload: { title: alertTitle, body: "Open Climb and clear today’s priority lane.", deepLink: "/app/dashboard" },
                    }),
                  })
                  setMobileState(next)
                })
              }
            >
              Send Alert
            </button>
          </div>
          <JsonPreview data={mobileState || { loading: true }} />
        </FeatureCard>

        <FeatureCard
          icon={<Rocket className="h-4 w-4 text-saffron-500" />}
          title="14) Experiment Lab"
          subtitle="Prompt/workflow experiments with lift tracking."
        >
          <input className="input-field" value={experimentName} onChange={(event) => setExperimentName(event.target.value)} placeholder="Experiment name" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline"
              disabled={isBusy("create-experiment")}
              onClick={() =>
                void run("create-experiment", async () => {
                  const next = await fetchJson<any>("/api/experiments/lab", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "createExperiment",
                      payload: {
                        name: experimentName,
                        hypothesis: "Variant B improves reply rate by being more concise.",
                        metric: "reply_rate",
                        variants: [
                          { label: "Control" },
                          { label: "Variant B" },
                        ],
                      },
                    }),
                  })
                  setExperimentState(next)
                })
              }
            >
              Create Experiment
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isBusy("log-run")}
              onClick={() =>
                void run("log-run", async () => {
                  const experiment = (experimentState as any)?.experiments?.[0]
                  const variant = experiment?.variants?.[0]
                  if (!experiment?.id || !variant?.id) throw new Error("Create an experiment first.")
                  const next = await fetchJson<any>("/api/experiments/lab", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "logRun",
                      payload: {
                        experimentId: experiment.id,
                        variantId: variant.id,
                        sampleSize: 80,
                        conversions: 22,
                      },
                    }),
                  })
                  setExperimentState(next)
                })
              }
            >
              Log Run
            </button>
          </div>
          <JsonPreview data={experimentState || { loading: true }} />
        </FeatureCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <FeatureCard
          icon={<Gauge className="h-4 w-4 text-saffron-500" />}
          title="15) Billing + Usage Metering"
          subtitle="Plan controls, seats, metering, and overage tracking."
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline"
              disabled={isBusy("upgrade-plan")}
              onClick={() =>
                void run("upgrade-plan", async () => {
                  const next = await fetchJson<any>("/api/billing/usage", {
                    method: "POST",
                    body: JSON.stringify({ action: "updatePlan", payload: { plan: "team", seats: 5 } }),
                  })
                  setBillingState(next)
                })
              }
            >
              Set Team Plan
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={isBusy("record-usage")}
              onClick={() =>
                void run("record-usage", async () => {
                  const next = await fetchJson<any>("/api/billing/usage", {
                    method: "POST",
                    body: JSON.stringify({ action: "recordUsage", payload: { metric: "ai_requests", units: 120 } }),
                  })
                  setBillingState(next)
                })
              }
            >
              Record AI Usage
            </button>
          </div>
          <JsonPreview data={billingState || { loading: true }} />
        </FeatureCard>

        <FeatureCard
          icon={<Database className="h-4 w-4 text-saffron-500" />}
          title="Platform Snapshot"
          subtitle="Cross-module status overview of the expansion layer."
        >
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            {[
              ["Inbox sync", inboxAccounts],
              ["Calendar", calendarIntegrations],
              ["ATS", atsState],
              ["Rules", rulesState],
              ["Memory", memoryState],
              ["Video", videoState],
              ["Fit graph", fitGraphState],
              ["Versioning", versionState],
              ["Referrals", referralState],
              ["Coaching", coachingState],
              ["Auth stack", authStackState],
              ["Audit", auditState],
              ["Mobile", mobileState],
              ["Experiments", experimentState],
              ["Billing", billingState],
            ].map(([name, value]) => (
              <div key={name as string} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{name as string}</p>
                <p className={cn("text-sm font-medium", value ? "text-foreground" : "text-muted-foreground")}>{value ? "Ready" : "Loading"}</p>
              </div>
            ))}
          </div>
          <button type="button" className="btn-primary w-fit" onClick={() => void refreshAll()} disabled={isBusy("refresh-all")}>
            <Sparkles className="h-4 w-4" /> Refresh Entire Platform
          </button>
        </FeatureCard>
      </section>

      <section className="section-shell section-stack">
        <h2 className="text-lg font-semibold">What Was Added</h2>
        <p className="text-sm text-muted-foreground">
          This page operationalizes all 15 requested upgrades with functional API modules and in-app controls for each.
        </p>
      </section>
    </div>
  )
}
