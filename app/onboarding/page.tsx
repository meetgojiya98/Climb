"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import {
  ArrowRight,
  ArrowLeft,
  Target,
  Sparkles,
  FileText,
  Shield,
  LineChart,
  ClipboardCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  Rocket,
  Smartphone,
  Tablet,
  Monitor,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type OperatingTrack = "candidate" | "coach" | "program"
type CadenceMode = "light" | "standard" | "intensive"
type DeviceMode = "mobile" | "tablet" | "desktop"

const PROFILE_STORAGE_KEY = "climb:onboarding-profile:v2"

const steps = [
  {
    id: 1,
    title: "Define Outcome",
    description: "Set role target and operating track.",
    icon: Target,
  },
  {
    id: 2,
    title: "Set Cadence",
    description: "Configure weekly operating rhythm.",
    icon: CalendarClock,
  },
  {
    id: 3,
    title: "Learn Workflow",
    description: "Understand enterprise execution flow.",
    icon: ClipboardCheck,
  },
  {
    id: 4,
    title: "Launch",
    description: "Start with a guided action plan.",
    icon: Rocket,
  },
] as const

const experienceLevels = [
  "Entry Level (0-2 years)",
  "Mid Level (3-5 years)",
  "Senior (6-10 years)",
  "Lead/Manager (10+ years)",
  "Executive",
]

const industryOptions = [
  "Technology",
  "Finance",
  "Healthcare",
  "E-commerce",
  "Education",
  "Media",
  "Consulting",
  "Startup",
]

const cadenceOptions: Array<{
  id: CadenceMode
  label: string
  description: string
}> = [
  {
    id: "light",
    label: "Light",
    description: "3-4 applications/week with one weekly review.",
  },
  {
    id: "standard",
    label: "Standard",
    description: "6-8 applications/week with forecast and hygiene checks.",
  },
  {
    id: "intensive",
    label: "Intensive",
    description: "10+ applications/week with strict follow-up governance.",
  },
]

const operatingTracks: Array<{
  id: OperatingTrack
  label: string
  description: string
}> = [
  {
    id: "candidate",
    label: "Candidate",
    description: "Individual contributor execution and weekly growth loop.",
  },
  {
    id: "coach",
    label: "Coach",
    description: "Advisory oversight with decision reviews and feedback rhythm.",
  },
  {
    id: "program",
    label: "Program Office",
    description: "Governance-led operating model and executive reporting cadence.",
  },
]

const deviceModes: Array<{
  id: DeviceMode
  label: string
  description: string
  icon: typeof Smartphone
}> = [
  {
    id: "mobile",
    label: "Mobile-first",
    description: "Fast updates and follow-up execution on the move.",
    icon: Smartphone,
  },
  {
    id: "tablet",
    label: "iPad / Tablet",
    description: "Balanced workflow with side-by-side document review.",
    icon: Tablet,
  },
  {
    id: "desktop",
    label: "Desktop",
    description: "Deep work mode for forecasting and strategic planning.",
    icon: Monitor,
  },
]

const moduleFlow = [
  {
    title: "Build Foundation",
    description: "Resumes + role parsing to establish quality baseline.",
    href: "/app/resumes/new",
    icon: FileText,
  },
  {
    title: "Run Pipeline Control",
    description: "Applications + Control Tower to enforce follow-up discipline.",
    href: "/app/control-tower",
    icon: Shield,
  },
  {
    title: "Govern and Forecast",
    description: "Program Office + Forecast to model outcomes and risk.",
    href: "/app/program-office",
    icon: LineChart,
  },
  {
    title: "Report and Iterate",
    description: "Executive reports to drive weekly decisions and improvements.",
    href: "/app/reports",
    icon: Building2,
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    targetRole: "",
    experience: "",
    industries: [] as string[],
    salaryRange: "",
    weeklyTarget: 6,
    cadence: "standard" as CadenceMode,
    operatingTrack: "candidate" as OperatingTrack,
    devicePreference: "desktop" as DeviceMode,
  })

  const progressPct = Math.round((currentStep / steps.length) * 100)

  const selectedTrack = useMemo(
    () => operatingTracks.find((item) => item.id === formData.operatingTrack) || operatingTracks[0],
    [formData.operatingTrack]
  )

  const selectedDevice = useMemo(
    () => deviceModes.find((item) => item.id === formData.devicePreference) || deviceModes[0],
    [formData.devicePreference]
  )

  const toggleIndustry = (industry: string) => {
    setFormData((prev) => {
      const exists = prev.industries.includes(industry)
      return {
        ...prev,
        industries: exists
          ? prev.industries.filter((item) => item !== industry)
          : [...prev.industries, industry],
      }
    })
  }

  const saveProfile = () => {
    const payload = {
      ...formData,
      updatedAt: new Date().toISOString(),
    }

    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(payload))
      toast.success("Onboarding profile saved")
    } catch {
      toast.error("Could not save profile locally")
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1)
      return
    }

    saveProfile()
    router.push("/app/help")
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const canProceed = currentStep !== 1 || formData.targetRole.trim().length > 1

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-mesh">
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-saffron-500/14 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold-500/14 rounded-full blur-[80px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-grid opacity-20" />

        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-12 w-full">
          <Logo size="lg" variant="light" />

          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-white/80 text-sm font-medium">Enterprise onboarding sequence</p>
              {steps.map((step) => {
                const isDone = currentStep > step.id
                const isCurrent = currentStep === step.id
                const Icon = step.icon
                return (
                  <div key={step.id} className="flex items-start gap-3">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg border flex items-center justify-center",
                        isDone
                          ? "bg-saffron-500 border-saffron-500"
                          : isCurrent
                            ? "border-saffron-400 bg-saffron-500/20"
                            : "border-white/20 bg-white/5"
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5 text-navy-950" />
                      ) : (
                        <Icon className={cn("h-4 w-4", isCurrent ? "text-saffron-300" : "text-white/40")} />
                      )}
                    </div>
                    <div>
                      <p className={cn("font-medium", isCurrent || isDone ? "text-white" : "text-white/50")}>{step.title}</p>
                      <p className={cn("text-xs mt-0.5", isCurrent || isDone ? "text-white/70" : "text-white/35")}>{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-saffron-500 to-gold-400" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-xs text-white/60 mt-2">Progress {progressPct}%</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-white/70">
            <p className="font-medium text-white">Current profile snapshot</p>
            <p>Track: {selectedTrack.label}</p>
            <p>Cadence: {formData.cadence}</p>
            <p>Weekly target: {formData.weeklyTarget} applications</p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative p-4 sm:p-6 lg:p-8 xl:p-10">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-saffron-500/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-gold-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          <div className="lg:hidden mb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Step {currentStep} of {steps.length}</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-gradient-to-r from-saffron-500 to-gold-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {currentStep === 1 && (
            <section className="space-y-5">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl">Define your job-search outcome</h1>
                <p className="text-muted-foreground mt-2">
                  Set your target role and operating track so Climb can guide your workflow with the right discipline.
                </p>
              </div>

              <div className="card-elevated p-4 sm:p-5 space-y-4 bg-background/86">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target role</label>
                  <input
                    type="text"
                    value={formData.targetRole}
                    onChange={(event) => setFormData((prev) => ({ ...prev, targetRole: event.target.value }))}
                    className="input-field"
                    placeholder="e.g., Senior Product Manager"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Experience level</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {experienceLevels.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, experience: level }))}
                        className={cn(
                          "rounded-xl px-3 py-2.5 text-sm text-left border transition-colors",
                          formData.experience === level
                            ? "border-saffron-500 bg-saffron-500/10 text-saffron-700"
                            : "border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Operating track</label>
                  <div className="grid gap-2 md:grid-cols-3">
                    {operatingTracks.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, operatingTrack: track.id }))}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-colors",
                          formData.operatingTrack === track.id
                            ? "border-saffron-500 bg-saffron-500/10"
                            : "border-border hover:border-saffron-500/40"
                        )}
                      >
                        <p className="font-medium text-sm">{track.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{track.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {currentStep === 2 && (
            <section className="space-y-5">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl">Configure operating cadence</h1>
                <p className="text-muted-foreground mt-2">
                  Define your weekly throughput target and execution style for consistent pipeline outcomes.
                </p>
              </div>

              <div className="card-elevated p-4 sm:p-5 space-y-5 bg-background/86">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Applications target per week</label>
                    <span className="text-sm font-semibold">{formData.weeklyTarget}</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={20}
                    value={formData.weeklyTarget}
                    onChange={(event) => setFormData((prev) => ({ ...prev, weeklyTarget: Number(event.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred cadence mode</label>
                  <div className="grid gap-2 md:grid-cols-3">
                    {cadenceOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, cadence: option.id }))}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-colors",
                          formData.cadence === option.id
                            ? "border-saffron-500 bg-saffron-500/10"
                            : "border-border hover:border-saffron-500/40"
                        )}
                      >
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority industries</label>
                  <div className="flex flex-wrap gap-2">
                    {industryOptions.map((industry) => {
                      const active = formData.industries.includes(industry)
                      return (
                        <button
                          key={industry}
                          type="button"
                          onClick={() => toggleIndustry(industry)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs sm:text-sm border transition-colors",
                            active
                              ? "border-saffron-500 bg-saffron-500/10 text-saffron-700"
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {industry}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Target salary range (optional)</label>
                  <input
                    type="text"
                    value={formData.salaryRange}
                    onChange={(event) => setFormData((prev) => ({ ...prev, salaryRange: event.target.value }))}
                    className="input-field"
                    placeholder="e.g., $140k-$170k"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Primary device workflow</label>
                  <div className="grid gap-2 md:grid-cols-3">
                    {deviceModes.map((device) => {
                      const Icon = device.icon
                      return (
                        <button
                          key={device.id}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, devicePreference: device.id }))}
                          className={cn(
                            "rounded-xl border p-3 text-left transition-colors",
                            formData.devicePreference === device.id
                              ? "border-saffron-500 bg-saffron-500/10"
                              : "border-border hover:border-saffron-500/40"
                          )}
                        >
                          <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="font-medium text-sm mt-2">{device.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{device.description}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section className="space-y-5">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl">Learn the enterprise workflow</h1>
                <p className="text-muted-foreground mt-2">
                  Climb works best when you run modules in a fixed operating order and close each week with review loops.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {moduleFlow.map((item, index) => (
                  <Link key={item.title} href={item.href} className="card-interactive p-4 sm:p-5 block">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Stage {index + 1}</p>
                        <p className="font-semibold mt-1">{item.title}</p>
                      </div>
                      <div className="h-9 w-9 rounded-lg bg-saffron-500/10 flex items-center justify-center">
                        <item.icon className="h-4 w-4 text-saffron-600" />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                    <span className="inline-flex items-center gap-1.5 text-xs text-saffron-600 mt-3">
                      Open module
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>

              <div className="card-elevated p-4 sm:p-5 bg-background/86">
                <p className="text-sm font-medium">Why this sequence works</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Foundation quality drives better role fit, control discipline reduces leakage, and forecast-led governance improves decision quality each week.
                </p>
              </div>
            </section>
          )}

          {currentStep === 4 && (
            <section className="space-y-5">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl">Launch your operating runbook</h1>
                <p className="text-muted-foreground mt-2">
                  Your profile is ready. Next, open the playbook and start the first execution cycle.
                </p>
              </div>

              <div className="card-elevated p-4 sm:p-5 space-y-4 bg-background/86">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Role target</p>
                    <p className="font-medium mt-1">{formData.targetRole || "Not set"}</p>
                  </div>
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Operating track</p>
                    <p className="font-medium mt-1">{selectedTrack.label}</p>
                  </div>
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Cadence + target</p>
                    <p className="font-medium mt-1">{formData.cadence}, {formData.weeklyTarget}/week</p>
                  </div>
                  <div className="rounded-xl bg-secondary/40 p-3">
                    <p className="text-xs text-muted-foreground">Primary device</p>
                    <p className="font-medium mt-1">{selectedDevice.label}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Link href="/app/resumes/new" className="rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-secondary/40">1. Create baseline resume</Link>
                  <Link href="/app/roles/new" className="rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-secondary/40">2. Parse first role</Link>
                  <Link href="/app/control-tower" className="rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-secondary/40">3. Enable control loop</Link>
                  <Link href="/app/forecast" className="rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-secondary/40">4. Run first forecast</Link>
                </div>

                <div className="rounded-xl border border-saffron-500/30 bg-saffron-500/10 p-3 sm:p-4 text-sm">
                  <p className="font-medium text-saffron-700">Recommended next step</p>
                  <p className="text-muted-foreground mt-1">
                    Open the Operating Guide to run launch checklist, maturity assessment, and role-based playbooks.
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="mt-8 pt-6 border-t border-border flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed}
              className="btn-saffron disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === steps.length ? "Open Operating Guide" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
