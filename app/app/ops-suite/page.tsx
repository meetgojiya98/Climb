"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  ClipboardCheck,
  Link2,
  MailCheck,
  MessageSquare,
  Mic,
  MicOff,
  Network,
  RefreshCcw,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Wand2,
  Download,
} from "lucide-react"
import { APP_ROUTES } from "@/lib/routes"
import { cn } from "@/lib/utils"

type InboxUpdate = {
  eventType: "interview" | "rejection" | "followup" | "other"
  company: string | null
  role: string | null
  matchedApplicationId: string | null
  action: "updated" | "created" | "ignored"
  detail: string
}

type InboxSyncResponse = {
  success: boolean
  provider: "gmail" | "outlook"
  summary: {
    totalEmailsParsed: number
    updatedCount: number
    createdCount: number
    ignoredCount: number
    byType: Record<string, number>
  }
  updates: InboxUpdate[]
}

type JobsCaptureResponse = {
  success: boolean
  duplicate: boolean
  message?: string
  savedJob?: {
    id: string
    company: string
    position: string
    location?: string | null
    salary_range?: string | null
    job_url?: string | null
    created_at?: string
  }
}

type InterviewCopilotResponse = {
  success: boolean
  analysis: {
    question: string
    role: string | null
    wordCount: number
    sentenceCount: number
    fillerCount: number
    fillerPer100: number
    wordsPerMinute: number | null
  }
  scores: {
    clarity: number
    structure: number
    depth: number
    delivery: number
    overall: number
  }
  guidance: {
    strengths: string[]
    improvements: string[]
    rewritePrompt: string
  }
}

type AutopilotResponse = {
  success: boolean
  generatedAt: string
  context: {
    activeApplications: number
    staleApplications: number
    interviewCount: number
    replyCount: number
  }
  plan: {
    timezone: string
    weeklyHours: number
    focusPriority: string[]
    totalsByFocus: Record<string, number>
    blocks: Array<{
      id: string
      focusArea: string
      title: string
      description: string
      durationMin: number
      dayLabel: string
      startAt: string
      endAt: string
      calendarLinks: {
        google: string
        outlook: string
      }
    }>
    todayActions: Array<{ title: string; startAt: string; durationMin: number }>
    ics: string
  }
}

type ResumeExperimentsResponse = {
  success: boolean
  analytics: {
    totalEvents: number
    variants: Array<{
      variantId: string
      variantName: string
      sent: number
      reply: number
      interview: number
      offer: number
      rejected: number
      replyRate: number
      interviewRate: number
      offerRate: number
    }>
    attributionByCompany: Array<{
      label: string
      sent: number
      reply: number
      interview: number
      offer: number
      replyRate: number
      interviewRate: number
      offerRate: number
    }>
    attributionByRole: Array<{
      label: string
      sent: number
      reply: number
      interview: number
      offer: number
      replyRate: number
      interviewRate: number
      offerRate: number
    }>
  }
  events: Array<{
    id: string
    variantId: string
    variantName: string
    company: string
    role: string
    stage: "sent" | "reply" | "interview" | "offer" | "rejected"
    notes: string | null
    occurredAt: string
  }>
}

type CompanyIntelResponse = {
  success: boolean
  generatedAt: string
  intel: {
    overview: string
    productSignals: string[]
    hiringSignals: {
      openRoleSignals: number
      momentum: "rising" | "steady" | "cautious"
      notes: string[]
    }
    interviewHints: string[]
    recentNews: Array<{
      title: string
      source: string
      url: string
      publishedAt: string | null
      snippet: string | null
    }>
    sources: string[]
  }
}

type NegotiationResponse = {
  success: boolean
  benchmark: {
    role: string
    country: string
    min: number
    mid: number
    max: number
  }
  taxRate: number
  recommendation: {
    bestOfferLabel: string
    bestVsBenchmarkPct: number
    negotiationPriority: string
  }
  scenarioComparisons: Array<{
    label: string
    grossTotal: number
    postTaxTotal: number
    weightedScore: number
    benchmarkGapPct: number
  }>
  scripts: {
    primaryAsk: string
    dataBackedCounter: string
    fallbackClose: string
  }
}

type NetworkingResponse = {
  success: boolean
  summary: {
    totalContacts: number
    outreach: number
    replies: number
    referrals: number
    replyRate: number
    referralConversionRate: number
    upcomingTouches: number
  }
  contacts: Array<{
    id: string
    name: string
    company: string
    title: string | null
    channel: string | null
    relationshipStrength: number
    warmPath: string | null
    notes: string | null
    status: "new" | "contacted" | "responded" | "intro_requested" | "referred" | "inactive"
    outreachCount: number
    replyCount: number
    referralCount: number
    lastTouchAt: string | null
    nextTouchAt: string | null
    createdAt: string
    updatedAt: string
  }>
  activities: Array<{
    id: string
    contactId: string
    activityType: "outreach" | "reply" | "meeting" | "intro_request" | "referral"
    note: string | null
    createdAt: string
  }>
}

type CollaborationResponse = {
  success: boolean
  workspaceId: string
  summary: {
    checklistCount: number
    totalChecklistItems: number
    completionRate: number
    pendingApprovals: number
  }
  checklists: Array<{
    id: string
    workspaceId: string
    title: string
    items: Array<{ id: string; label: string; owner: string | null; dueDate: string | null; done: boolean }>
    createdAt: string
    updatedAt: string
  }>
  approvals: Array<{
    id: string
    workspaceId: string
    title: string
    description: string | null
    requestedFrom: string | null
    status: "pending" | "approved" | "changes_requested"
    decisionNote: string | null
    requestedAt: string
    decidedAt: string | null
  }>
}

type WorkspaceOption = {
  id: string
  name: string
  slug: string
}

type CommentItem = {
  id: string
  content: string
  created_at?: string
  user_id?: string
}

const INTERVIEW_SAMPLE_PROMPT = `From: recruiting@northstar.ai\nSubject: Interview invitation - Senior Product Manager at Northstar AI\nHi there,\nWe would like to schedule your interview for next week.\n---\nFrom: talent@riverbyte.com\nSubject: Update on your application for Product Manager at Riverbyte\nAfter careful review, we won't be proceeding with your application.\n---\nFrom: hiring@orbitapps.io\nSubject: Following up on your Software Engineer application\nWe are circling back with next steps and would like to continue the process.`

const WEEKLY_FOCUS_OPTIONS = ["pipeline", "resume", "interview", "networking", "planning"] as const

type WeeklyFocus = (typeof WEEKLY_FOCUS_OPTIONS)[number]

type NetworkingAction = "outreach" | "reply" | "meeting" | "intro_request" | "referral"

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return "-"
  return new Date(timestamp).toLocaleString()
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function downloadIcs(ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "climb-weekly-autopilot.ics"
  anchor.click()
  URL.revokeObjectURL(url)
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}

export default function OpsSuitePage() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [inboxProvider, setInboxProvider] = useState<"gmail" | "outlook">("gmail")
  const [inboxText, setInboxText] = useState(INTERVIEW_SAMPLE_PROMPT)
  const [inboxLoading, setInboxLoading] = useState(false)
  const [inboxResult, setInboxResult] = useState<InboxSyncResponse | null>(null)

  const [captureSource, setCaptureSource] = useState("LinkedIn")
  const [captureTitle, setCaptureTitle] = useState("Senior Product Manager")
  const [captureCompany, setCaptureCompany] = useState("Northstar AI")
  const [captureLocation, setCaptureLocation] = useState("United States")
  const [captureUrl, setCaptureUrl] = useState("https://www.linkedin.com/jobs/view/example")
  const [captureSalary, setCaptureSalary] = useState("$180k - $230k")
  const [captureDescription, setCaptureDescription] = useState("Own roadmap execution for AI workflow surfaces.")
  const [captureLoading, setCaptureLoading] = useState(false)
  const [captureResult, setCaptureResult] = useState<JobsCaptureResponse | null>(null)

  const [interviewQuestion, setInterviewQuestion] = useState("Tell me about a time you had to influence stakeholders without direct authority.")
  const [interviewTranscript, setInterviewTranscript] = useState("")
  const [interviewRole, setInterviewRole] = useState("Senior Product Manager")
  const [interviewDurationSec, setInterviewDurationSec] = useState<number | undefined>(undefined)
  const [interviewLoading, setInterviewLoading] = useState(false)
  const [interviewResult, setInterviewResult] = useState<InterviewCopilotResponse | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recordingRef = useRef<any>(null)
  const recordingStartedAtRef = useRef<number | null>(null)

  const [weeklyHours, setWeeklyHours] = useState(12)
  const [weeklyStartDate, setWeeklyStartDate] = useState("")
  const [weeklyPreferredHour, setWeeklyPreferredHour] = useState(9)
  const [weeklyIncludeWeekend, setWeeklyIncludeWeekend] = useState(false)
  const [weeklyFocusMix, setWeeklyFocusMix] = useState<WeeklyFocus[]>(["pipeline", "resume", "interview"])
  const [autopilotLoading, setAutopilotLoading] = useState(false)
  const [autopilotResult, setAutopilotResult] = useState<AutopilotResponse | null>(null)

  const [experimentLoading, setExperimentLoading] = useState(false)
  const [experimentResult, setExperimentResult] = useState<ResumeExperimentsResponse | null>(null)
  const [experimentVariantName, setExperimentVariantName] = useState("Impact-heavy PM v3")
  const [experimentCompany, setExperimentCompany] = useState("Northstar AI")
  const [experimentRole, setExperimentRole] = useState("Senior Product Manager")
  const [experimentStage, setExperimentStage] = useState<"sent" | "reply" | "interview" | "offer" | "rejected">("sent")

  const [intelCompany, setIntelCompany] = useState("Stripe")
  const [intelRole, setIntelRole] = useState("Senior Product Manager")
  const [intelLocation, setIntelLocation] = useState("United States")
  const [intelLoading, setIntelLoading] = useState(false)
  const [intelResult, setIntelResult] = useState<CompanyIntelResponse | null>(null)

  const [negRole, setNegRole] = useState("Senior Product Manager")
  const [negCountry, setNegCountry] = useState("United States")
  const [negRisk, setNegRisk] = useState<"low" | "medium" | "high">("medium")
  const [offerA, setOfferA] = useState({ label: "Offer A", base: 175000, bonusPct: 12, equityAnnual: 38000, signOn: 10000 })
  const [offerB, setOfferB] = useState({ label: "Offer B", base: 182000, bonusPct: 10, equityAnnual: 30000, signOn: 18000 })
  const [negLoading, setNegLoading] = useState(false)
  const [negResult, setNegResult] = useState<NegotiationResponse | null>(null)

  const [networkingLoading, setNetworkingLoading] = useState(false)
  const [networkingResult, setNetworkingResult] = useState<NetworkingResponse | null>(null)
  const [contactName, setContactName] = useState("Ariana Patel")
  const [contactCompany, setContactCompany] = useState("Airbnb")
  const [contactTitle, setContactTitle] = useState("Staff Product Manager")
  const [contactChannel, setContactChannel] = useState("LinkedIn")
  const [contactStrength, setContactStrength] = useState(7)
  const [contactWarmPath, setContactWarmPath] = useState("Ex-teammate from Atlas Corp")
  const [contactNotes, setContactNotes] = useState("Potential referral for Platform PM openings.")

  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("")
  const [collabLoading, setCollabLoading] = useState(false)
  const [collabResult, setCollabResult] = useState<CollaborationResponse | null>(null)
  const [commentLoading, setCommentLoading] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentDraft, setCommentDraft] = useState("")
  const [checklistTitle, setChecklistTitle] = useState("Weekly execution checklist")
  const [checklistItemsInput, setChecklistItemsInput] = useState("Prioritize top 5 roles\nSend 3 follow-ups\nRun 1 mock interview")
  const [approvalTitle, setApprovalTitle] = useState("Resume variant approval")
  const [approvalDescription, setApprovalDescription] = useState("Review PM Impact v3 before batch sending.")

  const experimentVariantId = useMemo(() => {
    const slug = toSlug(experimentVariantName)
    return slug || "variant-default"
  }, [experimentVariantName])

  useEffect(() => {
    const SpeechRecognitionCtor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    setSpeechSupported(Boolean(SpeechRecognitionCtor))
  }, [])

  const loadExperiments = async () => {
    setExperimentLoading(true)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/resume/experiments", { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as ResumeExperimentsResponse | { error?: string } | null
      if (!response.ok || !payload || !(payload as ResumeExperimentsResponse).success) {
        throw new Error((payload as { error?: string } | null)?.error || "Failed to load resume experiments")
      }
      setExperimentResult(payload as ResumeExperimentsResponse)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load resume experiments")
    } finally {
      setExperimentLoading(false)
    }
  }

  const loadNetworking = async () => {
    setNetworkingLoading(true)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/networking/crm", { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as NetworkingResponse | { error?: string } | null
      if (!response.ok || !payload || !(payload as NetworkingResponse).success) {
        throw new Error((payload as { error?: string } | null)?.error || "Failed to load networking CRM")
      }
      setNetworkingResult(payload as NetworkingResponse)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load networking CRM")
    } finally {
      setNetworkingLoading(false)
    }
  }

  const loadWorkspaces = async () => {
    try {
      const response = await fetch("/api/workspaces", { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as
        | { success: boolean; workspaces?: WorkspaceOption[]; error?: string }
        | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to load workspaces")
      }
      const items = Array.isArray(payload.workspaces) ? payload.workspaces : []
      setWorkspaces(items)
      if (!selectedWorkspaceId && items.length > 0) {
        setSelectedWorkspaceId(items[0].id)
      }
    } catch {
      // ignore workspace bootstrap errors, user can still use personal fallback
    }
  }

  const loadCollaboration = async (workspaceId: string) => {
    if (!workspaceId) return
    setCollabLoading(true)
    try {
      const response = await fetch(`/api/collaboration/workflow?workspaceId=${encodeURIComponent(workspaceId)}`, {
        cache: "no-store",
      })
      const payload = (await response.json().catch(() => null)) as CollaborationResponse | { error?: string } | null
      if (!response.ok || !payload || !(payload as CollaborationResponse).success) {
        throw new Error((payload as { error?: string } | null)?.error || "Failed to load collaboration workflow")
      }
      setCollabResult(payload as CollaborationResponse)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load collaboration workflow")
    } finally {
      setCollabLoading(false)
    }
  }

  const loadComments = async (workspaceId: string) => {
    if (!workspaceId) return
    setCommentLoading(true)
    try {
      const response = await fetch(
        `/api/comments?workspaceId=${encodeURIComponent(workspaceId)}&module=${encodeURIComponent("ops-suite")}`,
        { cache: "no-store" }
      )
      const payload = (await response.json().catch(() => null)) as
        | { success: boolean; comments?: CommentItem[]; error?: string }
        | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to load comments")
      }
      setComments(Array.isArray(payload.comments) ? payload.comments : [])
    } catch {
      setComments([])
    } finally {
      setCommentLoading(false)
    }
  }

  useEffect(() => {
    void loadExperiments()
    void loadNetworking()
    void loadWorkspaces()
  }, [])

  useEffect(() => {
    if (!selectedWorkspaceId) return
    void loadCollaboration(selectedWorkspaceId)
    void loadComments(selectedWorkspaceId)
  }, [selectedWorkspaceId])

  const handleInboxSync = async () => {
    setInboxLoading(true)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/inbox/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: inboxProvider,
          rawInboxText: inboxText,
          autoCreateMissingApplications: true,
        }),
      })
      const payload = (await response.json().catch(() => null)) as InboxSyncResponse | { error?: string } | null
      if (!response.ok || !payload || !(payload as InboxSyncResponse).success) {
        throw new Error((payload as { error?: string } | null)?.error || "Inbox sync failed")
      }
      setInboxResult(payload as InboxSyncResponse)
      setStatusMessage("Inbox signals synced and pipeline updated.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Inbox sync failed")
    } finally {
      setInboxLoading(false)
    }
  }

  const handleCaptureJob = async () => {
    setCaptureLoading(true)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/jobs/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: captureSource,
          title: captureTitle,
          company: captureCompany,
          location: captureLocation,
          url: captureUrl,
          salaryRange: captureSalary,
          description: captureDescription,
        }),
      })
      const payload = (await response.json().catch(() => null)) as JobsCaptureResponse | { error?: string } | null
      if (!response.ok || !payload || !(payload as JobsCaptureResponse).success) {
        throw new Error((payload as { error?: string } | null)?.error || "Failed to capture job")
      }
      setCaptureResult(payload as JobsCaptureResponse)
      setStatusMessage((payload as JobsCaptureResponse).duplicate ? "Job already exists in Saved Jobs." : "Job captured in Saved Jobs.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to capture job")
    } finally {
      setCaptureLoading(false)
    }
  }

  const startRecording = () => {
    const SpeechRecognitionCtor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SpeechRecognitionCtor) {
      setStatusMessage("Speech recognition is not supported in this browser.")
      return
    }

    if (!recordingRef.current) {
      const recognition = new SpeechRecognitionCtor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "en-US"

      recognition.onresult = (event: any) => {
        let fullTranscript = ""
        for (let i = 0; i < event.results.length; i += 1) {
          fullTranscript += event.results[i][0].transcript + " "
        }
        setInterviewTranscript(fullTranscript.trim())
      }

      recognition.onend = () => {
        if (recordingStartedAtRef.current) {
          const elapsed = Math.round((Date.now() - recordingStartedAtRef.current) / 1000)
          setInterviewDurationSec(elapsed)
        }
        setIsRecording(false)
      }

      recordingRef.current = recognition
    }

    setInterviewTranscript("")
    recordingStartedAtRef.current = Date.now()
    setIsRecording(true)
    recordingRef.current.start()
  }

  const stopRecording = () => {
    if (!recordingRef.current) return
    recordingRef.current.stop()
    setIsRecording(false)
  }

  const runInterviewCopilot = async () => {
    if (!interviewTranscript.trim()) {
      setStatusMessage("Please record or paste a transcript first.")
      return
    }
    setInterviewLoading(true)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/interview/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: interviewQuestion,
          transcript: interviewTranscript,
          role: interviewRole,
          durationSec: interviewDurationSec,
        }),
      })
      const payload = (await response.json().catch(() => null)) as InterviewCopilotResponse | { error?: string } | null
      if (!response.ok || !payload || !(payload as InterviewCopilotResponse).success) {
        throw new Error((payload as { error?: string } | null)?.error || "Interview scoring failed")
      }
      setInterviewResult(payload as InterviewCopilotResponse)
      setStatusMessage("Interview transcript scored successfully.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Interview scoring failed")
    } finally {
      setInterviewLoading(false)
    }
  }

  const toggleFocusMix = (focus: WeeklyFocus) => {
    setWeeklyFocusMix((current) => {
      if (current.includes(focus)) {
        if (current.length === 1) return current
        return current.filter((item) => item !== focus)
      }
      return [...current, focus]
    })
  }

  const runAutopilot = async () => {
    setAutopilotLoading(true)
    setStatusMessage(null)
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      const response = await fetch("/api/autopilot/weekly-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeklyHours,
          timezone,
          startDate: weeklyStartDate || undefined,
          preferredStartHour: weeklyPreferredHour,
          includeWeekend: weeklyIncludeWeekend,
          focusMix: weeklyFocusMix,
        }),
      })
      const payload = (await response.json().catch(() => null)) as AutopilotResponse | { error?: string } | null
      if (!response.ok || !payload || !(payload as AutopilotResponse).success) {
        throw new Error((payload as { error?: string } | null)?.error || "Failed to build weekly autopilot")
      }
      setAutopilotResult(payload as AutopilotResponse)
      setStatusMessage("Weekly autopilot plan generated with calendar links.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to build weekly autopilot")
    } finally {
      setAutopilotLoading(false)
    }
  }

  const logResumeExperimentEvent = async () => {
    setExperimentLoading(true)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/resume/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: experimentVariantId,
          variantName: experimentVariantName,
          company: experimentCompany,
          role: experimentRole,
          stage: experimentStage,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to log experiment event")
      }
      await loadExperiments()
      setStatusMessage("Resume experiment event logged.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to log experiment event")
    } finally {
      setExperimentLoading(false)
    }
  }

  const runCompanyIntel = async () => {
    setIntelLoading(true)
    setStatusMessage(null)
    try {
      const params = new URLSearchParams({
        company: intelCompany,
        role: intelRole,
        location: intelLocation,
      })
      const response = await fetch(`/api/company/intel?${params.toString()}`, { cache: "no-store" })
      const payload = (await response.json().catch(() => null)) as CompanyIntelResponse | { error?: string } | null
      if (!response.ok || !payload || !(payload as CompanyIntelResponse).success) {
        throw new Error((payload as { error?: string } | null)?.error || "Failed to build company intelligence pack")
      }
      setIntelResult(payload as CompanyIntelResponse)
      setStatusMessage("Company intelligence pack updated.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to build company intelligence pack")
    } finally {
      setIntelLoading(false)
    }
  }

  const runNegotiationStudio = async () => {
    setNegLoading(true)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/negotiation/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: negRole,
          country: negCountry,
          riskTolerance: negRisk,
          offers: [offerA, offerB],
        }),
      })
      const payload = (await response.json().catch(() => null)) as NegotiationResponse | { error?: string } | null
      if (!response.ok || !payload || !(payload as NegotiationResponse).success) {
        throw new Error((payload as { error?: string } | null)?.error || "Failed to run negotiation studio")
      }
      setNegResult(payload as NegotiationResponse)
      setStatusMessage("Negotiation simulation ready.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to run negotiation studio")
    } finally {
      setNegLoading(false)
    }
  }

  const addNetworkingContact = async () => {
    setNetworkingLoading(true)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/networking/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addContact",
          payload: {
            name: contactName,
            company: contactCompany,
            title: contactTitle,
            channel: contactChannel,
            relationshipStrength: contactStrength,
            warmPath: contactWarmPath,
            notes: contactNotes,
          },
        }),
      })
      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to add contact")
      }
      await loadNetworking()
      setStatusMessage("Contact added to networking CRM.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to add contact")
    } finally {
      setNetworkingLoading(false)
    }
  }

  const logNetworkingActivity = async (contactId: string, activityType: NetworkingAction) => {
    setNetworkingLoading(true)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/networking/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "logActivity",
          payload: {
            contactId,
            activityType,
          },
        }),
      })
      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to log networking activity")
      }
      await loadNetworking()
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to log networking activity")
    } finally {
      setNetworkingLoading(false)
    }
  }

  const createChecklist = async () => {
    if (!selectedWorkspaceId) {
      setStatusMessage("Select a workspace first.")
      return
    }
    const lines = checklistItemsInput
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20)
    if (!checklistTitle.trim() || lines.length === 0) {
      setStatusMessage("Checklist title and at least one item are required.")
      return
    }

    setCollabLoading(true)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/collaboration/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createChecklist",
          payload: {
            workspaceId: selectedWorkspaceId,
            title: checklistTitle,
            items: lines.map((label) => ({ label })),
          },
        }),
      })
      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to create checklist")
      }
      await loadCollaboration(selectedWorkspaceId)
      setStatusMessage("Checklist created.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to create checklist")
    } finally {
      setCollabLoading(false)
    }
  }

  const toggleChecklistItem = async (checklistId: string, itemId: string, done: boolean) => {
    if (!selectedWorkspaceId) return
    setCollabLoading(true)
    try {
      const response = await fetch("/api/collaboration/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleChecklistItem",
          payload: {
            workspaceId: selectedWorkspaceId,
            checklistId,
            itemId,
            done,
          },
        }),
      })
      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to update checklist item")
      }
      await loadCollaboration(selectedWorkspaceId)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to update checklist item")
    } finally {
      setCollabLoading(false)
    }
  }

  const requestApproval = async () => {
    if (!selectedWorkspaceId) {
      setStatusMessage("Select a workspace first.")
      return
    }
    if (!approvalTitle.trim()) {
      setStatusMessage("Approval title is required.")
      return
    }

    setCollabLoading(true)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/collaboration/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "requestApproval",
          payload: {
            workspaceId: selectedWorkspaceId,
            title: approvalTitle,
            description: approvalDescription,
          },
        }),
      })
      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to request approval")
      }
      await loadCollaboration(selectedWorkspaceId)
      setStatusMessage("Approval request submitted.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to request approval")
    } finally {
      setCollabLoading(false)
    }
  }

  const decideApproval = async (approvalId: string, decision: "approved" | "changes_requested") => {
    if (!selectedWorkspaceId) return
    setCollabLoading(true)
    try {
      const response = await fetch("/api/collaboration/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decideApproval",
          payload: {
            workspaceId: selectedWorkspaceId,
            approvalId,
            decision,
            note: decision === "approved" ? "Approved in Ops Suite" : "Please revise before final approval",
          },
        }),
      })
      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to update approval")
      }
      await loadCollaboration(selectedWorkspaceId)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to update approval")
    } finally {
      setCollabLoading(false)
    }
  }

  const postComment = async () => {
    if (!selectedWorkspaceId) {
      setStatusMessage("Select a workspace first.")
      return
    }
    if (!commentDraft.trim()) {
      setStatusMessage("Comment cannot be empty.")
      return
    }

    setCommentLoading(true)
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: selectedWorkspaceId,
          module: "ops-suite",
          content: commentDraft,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to post comment")
      }
      setCommentDraft("")
      await loadComments(selectedWorkspaceId)
      setStatusMessage("Comment added.")
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to post comment")
    } finally {
      setCommentLoading(false)
    }
  }

  return (
    <div className="section-stack-lg p-4 sm:p-6 lg:p-8">
      <section className="section-shell section-stack">
        <div className="surface-header">
          <div className="space-y-2">
            <span className="badge badge-secondary w-fit">Ops Suite</span>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Enterprise Automation Layer</h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
              End-to-end operating surface for inbox sync, browser job capture, interview copilot, weekly autopilot,
              resume experiments, company intelligence, negotiation planning, networking CRM, and collaboration workflows.
            </p>
          </div>
          <a href={APP_ROUTES.jobsExplorer} className="btn-outline text-sm">
            Open Jobs Explorer <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {statusMessage && (
          <div className="rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-muted-foreground">
            {statusMessage}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="section-shell section-stack">
          <div className="flex items-center gap-2">
            <MailCheck className="h-4 w-4 text-saffron-500" />
            <h2 className="text-lg font-semibold">Email Inbox Sync + Auto Pipeline Updates</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Paste Gmail/Outlook email exports. Climb parses interview invites, rejections, and follow-ups, then updates Applications automatically.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Provider
              <select value={inboxProvider} onChange={(event) => setInboxProvider(event.target.value as "gmail" | "outlook")} className="input-field mt-1">
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
              </select>
            </label>
            <label className="text-sm">
              Auto mode
              <input value="Create missing applications when needed" readOnly className="input-field mt-1 text-muted-foreground" />
            </label>
          </div>
          <textarea
            value={inboxText}
            onChange={(event) => setInboxText(event.target.value)}
            className="input-field min-h-[170px]"
            placeholder="Paste raw inbox text..."
          />
          <button type="button" onClick={handleInboxSync} disabled={inboxLoading} className="btn-primary w-fit">
            {inboxLoading ? "Syncing inbox..." : "Sync Inbox"}
          </button>

          {inboxResult && (
            <div className="space-y-3 rounded-xl border border-border bg-background/65 p-4">
              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Parsed</p>
                  <p className="text-lg font-semibold">{inboxResult.summary.totalEmailsParsed}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Updated</p>
                  <p className="text-lg font-semibold text-green-600">{inboxResult.summary.updatedCount}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-lg font-semibold text-cyan-600">{inboxResult.summary.createdCount}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Ignored</p>
                  <p className="text-lg font-semibold">{inboxResult.summary.ignoredCount}</p>
                </div>
              </div>
              <div className="max-h-52 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-secondary/60 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Event</th>
                      <th className="px-3 py-2">Company</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inboxResult.updates.slice(0, 12).map((update, index) => (
                      <tr key={`${update.company}-${index}`} className="border-t border-border/70">
                        <td className="px-3 py-2 uppercase tracking-wide text-muted-foreground">{update.eventType}</td>
                        <td className="px-3 py-2">{update.company || "-"}</td>
                        <td className="px-3 py-2">{update.role || "-"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs",
                              update.action === "updated" && "bg-green-500/15 text-green-700",
                              update.action === "created" && "bg-cyan-500/15 text-cyan-700",
                              update.action === "ignored" && "bg-muted text-muted-foreground"
                            )}
                          >
                            {update.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </article>

        <article className="section-shell section-stack">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-saffron-500" />
            <h2 className="text-lg font-semibold">Browser Job Capture Extension</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            One-click save from LinkedIn/Indeed/company pages into Saved Jobs + Jobs Explorer source stream.
          </p>
          <div className="rounded-xl border border-border bg-background/65 p-4 text-sm space-y-2">
            <p className="font-medium">Extension files are ready in:</p>
            <p className="font-mono text-xs sm:text-sm">extensions/climb-job-capture</p>
            <p className="text-muted-foreground">Load as an unpacked extension in Chrome/Edge, set your app URL, then capture directly from job pages.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input-field" value={captureSource} onChange={(event) => setCaptureSource(event.target.value)} placeholder="Source" />
            <input className="input-field" value={captureTitle} onChange={(event) => setCaptureTitle(event.target.value)} placeholder="Role title" />
            <input className="input-field" value={captureCompany} onChange={(event) => setCaptureCompany(event.target.value)} placeholder="Company" />
            <input className="input-field" value={captureLocation} onChange={(event) => setCaptureLocation(event.target.value)} placeholder="Location" />
            <input className="input-field sm:col-span-2" value={captureUrl} onChange={(event) => setCaptureUrl(event.target.value)} placeholder="Job URL" />
            <input className="input-field" value={captureSalary} onChange={(event) => setCaptureSalary(event.target.value)} placeholder="Salary range" />
            <input className="input-field" value={captureDescription} onChange={(event) => setCaptureDescription(event.target.value)} placeholder="Short description" />
          </div>
          <button type="button" onClick={handleCaptureJob} disabled={captureLoading} className="btn-primary w-fit">
            {captureLoading ? "Capturing..." : "Capture Job"}
          </button>

          {captureResult?.savedJob && (
            <div className="rounded-xl border border-border bg-background/65 p-4 text-sm">
              <p className="font-medium">Saved job</p>
              <p>{captureResult.savedJob.position} at {captureResult.savedJob.company}</p>
              <p className="text-muted-foreground">{captureResult.savedJob.location || "Location not set"}</p>
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="section-shell section-stack">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-saffron-500" />
            <h2 className="text-lg font-semibold">Interview Copilot (Voice + Transcript Scoring)</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Record a mock interview answer or paste transcript. Get live scoring on clarity, structure, filler density, and depth.
          </p>
          <input className="input-field" value={interviewQuestion} onChange={(event) => setInterviewQuestion(event.target.value)} placeholder="Interview question" />
          <input className="input-field" value={interviewRole} onChange={(event) => setInterviewRole(event.target.value)} placeholder="Target role" />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={isRecording ? stopRecording : startRecording} className="btn-outline" disabled={!speechSupported}>
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {isRecording ? "Stop recording" : "Start recording"}
            </button>
            <span className="text-xs text-muted-foreground">
              {speechSupported ? "Speech recognition enabled" : "Speech recognition not supported in this browser"}
            </span>
          </div>
          <textarea
            className="input-field min-h-[150px]"
            value={interviewTranscript}
            onChange={(event) => setInterviewTranscript(event.target.value)}
            placeholder="Transcript appears here..."
          />
          <button type="button" onClick={runInterviewCopilot} disabled={interviewLoading} className="btn-primary w-fit">
            {interviewLoading ? "Scoring transcript..." : "Score Transcript"}
          </button>

          {interviewResult && (
            <div className="space-y-3 rounded-xl border border-border bg-background/65 p-4">
              <div className="grid gap-3 sm:grid-cols-5 text-sm">
                {Object.entries(interviewResult.scores).map(([metric, value]) => (
                  <div key={metric} className="rounded-lg border border-border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric}</p>
                    <p className="text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="font-medium mb-1">Strengths</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {interviewResult.guidance.strengths.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">Improvements</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {interviewResult.guidance.improvements.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background/85 p-3 text-xs sm:text-sm text-muted-foreground">
                {interviewResult.guidance.rewritePrompt}
              </div>
            </div>
          )}
        </article>

        <article className="section-shell section-stack">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-saffron-500" />
            <h2 className="text-lg font-semibold">Weekly Autopilot + Calendar Time-Blocking</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Build a realistic 7-day execution plan from your workload and automatically create Google/Outlook calendar blocks.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Hours this week
              <input type="number" min={2} max={80} value={weeklyHours} onChange={(event) => setWeeklyHours(Number(event.target.value))} className="input-field mt-1" />
            </label>
            <label className="text-sm">
              Preferred start hour
              <input type="number" min={6} max={20} value={weeklyPreferredHour} onChange={(event) => setWeeklyPreferredHour(Number(event.target.value))} className="input-field mt-1" />
            </label>
            <label className="text-sm sm:col-span-2">
              Start date (optional)
              <input type="date" value={weeklyStartDate} onChange={(event) => setWeeklyStartDate(event.target.value)} className="input-field mt-1" />
            </label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input id="include-weekend" type="checkbox" checked={weeklyIncludeWeekend} onChange={(event) => setWeeklyIncludeWeekend(event.target.checked)} />
            <label htmlFor="include-weekend">Include weekend blocks</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {WEEKLY_FOCUS_OPTIONS.map((focus) => (
              <button
                key={focus}
                type="button"
                className={cn("rounded-full border px-3 py-1.5 text-sm", weeklyFocusMix.includes(focus) ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-600" : "border-border")}
                onClick={() => toggleFocusMix(focus)}
              >
                {focus}
              </button>
            ))}
          </div>
          <button type="button" onClick={runAutopilot} disabled={autopilotLoading} className="btn-primary w-fit">
            {autopilotLoading ? "Generating plan..." : "Generate Weekly Plan"}
          </button>

          {autopilotResult && (
            <div className="space-y-3 rounded-xl border border-border bg-background/65 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-muted-foreground">Focus priority: {autopilotResult.plan.focusPriority.join(" → ")}</p>
                <button type="button" className="btn-outline" onClick={() => downloadIcs(autopilotResult.plan.ics)}>
                  <Download className="h-4 w-4" /> Download ICS
                </button>
              </div>
              <div className="max-h-64 overflow-auto space-y-2">
                {autopilotResult.plan.blocks.map((block) => (
                  <div key={block.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{block.title}</p>
                        <p className="text-xs text-muted-foreground">{block.dayLabel} • {block.durationMin} min</p>
                      </div>
                      <div className="flex gap-2">
                        <a href={block.calendarLinks.google} target="_blank" rel="noreferrer" className="btn-outline text-xs">Google</a>
                        <a href={block.calendarLinks.outlook} target="_blank" rel="noreferrer" className="btn-outline text-xs">Outlook</a>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{formatDateTime(block.startAt)} → {formatDateTime(block.endAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="section-shell section-stack">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-saffron-500" />
            <h2 className="text-lg font-semibold">Resume Experiment Engine (A/B + Conversion Attribution)</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Track which resume variant wins by role/company and monitor reply, interview, and offer conversion rates.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input-field" value={experimentVariantName} onChange={(event) => setExperimentVariantName(event.target.value)} placeholder="Variant name" />
            <input className="input-field" value={experimentCompany} onChange={(event) => setExperimentCompany(event.target.value)} placeholder="Company" />
            <input className="input-field" value={experimentRole} onChange={(event) => setExperimentRole(event.target.value)} placeholder="Role" />
            <select className="input-field" value={experimentStage} onChange={(event) => setExperimentStage(event.target.value as typeof experimentStage)}>
              <option value="sent">Sent</option>
              <option value="reply">Reply</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={logResumeExperimentEvent} disabled={experimentLoading} className="btn-primary">
              {experimentLoading ? "Logging..." : "Log Event"}
            </button>
            <button type="button" onClick={loadExperiments} disabled={experimentLoading} className="btn-outline">
              <RefreshCcw className="h-4 w-4" /> Refresh
            </button>
          </div>

          <div className="rounded-xl border border-border bg-background/65 p-4">
            <p className="text-sm font-medium mb-2">Variant leaderboard</p>
            <div className="max-h-56 overflow-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 text-left">Variant</th>
                    <th className="py-1 text-left">Sent</th>
                    <th className="py-1 text-left">Reply %</th>
                    <th className="py-1 text-left">Interview %</th>
                    <th className="py-1 text-left">Offer %</th>
                  </tr>
                </thead>
                <tbody>
                  {(experimentResult?.analytics.variants || []).slice(0, 8).map((variant) => (
                    <tr key={variant.variantId} className="border-t border-border/60">
                      <td className="py-2">{variant.variantName}</td>
                      <td className="py-2">{variant.sent}</td>
                      <td className="py-2">{variant.replyRate}%</td>
                      <td className="py-2">{variant.interviewRate}%</td>
                      <td className="py-2">{variant.offerRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>

        <article className="section-shell section-stack">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-saffron-500" />
            <h2 className="text-lg font-semibold">Company Intelligence Pack</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Auto-brief each target company with news signals, hiring momentum, and interview-ready prompts.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input-field" value={intelCompany} onChange={(event) => setIntelCompany(event.target.value)} placeholder="Company" />
            <input className="input-field" value={intelRole} onChange={(event) => setIntelRole(event.target.value)} placeholder="Role" />
            <input className="input-field sm:col-span-2" value={intelLocation} onChange={(event) => setIntelLocation(event.target.value)} placeholder="Location" />
          </div>
          <button type="button" onClick={runCompanyIntel} disabled={intelLoading} className="btn-primary w-fit">
            {intelLoading ? "Fetching intelligence..." : "Build Intel Pack"}
          </button>

          {intelResult && (
            <div className="space-y-3 rounded-xl border border-border bg-background/65 p-4 text-sm">
              <p className="text-muted-foreground">{intelResult.intel.overview}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="font-medium mb-1">Product signals</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {intelResult.intel.productSignals.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">Interview hints</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {intelResult.intel.interviewHints.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {intelResult.intel.recentNews.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Recent news</p>
                  <div className="space-y-2">
                    {intelResult.intel.recentNews.slice(0, 4).map((item) => (
                      <a key={item.url + item.title} href={item.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-border p-2 hover:bg-secondary/40">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.source} • {formatDateTime(item.publishedAt)}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="section-shell section-stack">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-saffron-500" />
            <h2 className="text-lg font-semibold">Negotiation Studio</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Compare offers, run compensation scenarios, and get personalized negotiation scripts.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input className="input-field" value={negRole} onChange={(event) => setNegRole(event.target.value)} placeholder="Role" />
            <input className="input-field" value={negCountry} onChange={(event) => setNegCountry(event.target.value)} placeholder="Country" />
            <select className="input-field" value={negRisk} onChange={(event) => setNegRisk(event.target.value as typeof negRisk)}>
              <option value="low">Low risk</option>
              <option value="medium">Medium risk</option>
              <option value="high">High risk</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-xl border border-border p-3 space-y-2">
              <p className="font-medium">Offer A</p>
              <input className="input-field" value={offerA.label} onChange={(event) => setOfferA((prev) => ({ ...prev, label: event.target.value }))} placeholder="Label" />
              <input type="number" className="input-field" value={offerA.base} onChange={(event) => setOfferA((prev) => ({ ...prev, base: Number(event.target.value) }))} placeholder="Base" />
              <input type="number" className="input-field" value={offerA.bonusPct} onChange={(event) => setOfferA((prev) => ({ ...prev, bonusPct: Number(event.target.value) }))} placeholder="Bonus %" />
              <input type="number" className="input-field" value={offerA.equityAnnual} onChange={(event) => setOfferA((prev) => ({ ...prev, equityAnnual: Number(event.target.value) }))} placeholder="Equity" />
              <input type="number" className="input-field" value={offerA.signOn} onChange={(event) => setOfferA((prev) => ({ ...prev, signOn: Number(event.target.value) }))} placeholder="Sign-on" />
            </div>
            <div className="rounded-xl border border-border p-3 space-y-2">
              <p className="font-medium">Offer B</p>
              <input className="input-field" value={offerB.label} onChange={(event) => setOfferB((prev) => ({ ...prev, label: event.target.value }))} placeholder="Label" />
              <input type="number" className="input-field" value={offerB.base} onChange={(event) => setOfferB((prev) => ({ ...prev, base: Number(event.target.value) }))} placeholder="Base" />
              <input type="number" className="input-field" value={offerB.bonusPct} onChange={(event) => setOfferB((prev) => ({ ...prev, bonusPct: Number(event.target.value) }))} placeholder="Bonus %" />
              <input type="number" className="input-field" value={offerB.equityAnnual} onChange={(event) => setOfferB((prev) => ({ ...prev, equityAnnual: Number(event.target.value) }))} placeholder="Equity" />
              <input type="number" className="input-field" value={offerB.signOn} onChange={(event) => setOfferB((prev) => ({ ...prev, signOn: Number(event.target.value) }))} placeholder="Sign-on" />
            </div>
          </div>

          <button type="button" onClick={runNegotiationStudio} disabled={negLoading} className="btn-primary w-fit">
            {negLoading ? "Running simulation..." : "Run Negotiation Studio"}
          </button>

          {negResult && (
            <div className="space-y-3 rounded-xl border border-border bg-background/65 p-4 text-sm">
              <p>
                Best offer: <span className="font-semibold">{negResult.recommendation.bestOfferLabel}</span> ({negResult.recommendation.bestVsBenchmarkPct >= 0 ? "+" : ""}{negResult.recommendation.bestVsBenchmarkPct}% vs benchmark)
              </p>
              <p className="text-muted-foreground">{negResult.recommendation.negotiationPriority}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {negResult.scenarioComparisons.map((scenario) => (
                  <div key={scenario.label} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{scenario.label}</p>
                    <p className="text-xs text-muted-foreground">Gross: {formatMoney(scenario.grossTotal)}</p>
                    <p className="text-xs text-muted-foreground">Post-tax: {formatMoney(scenario.postTaxTotal)}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-border bg-background/85 p-3 text-xs sm:text-sm space-y-2">
                <p><span className="font-medium">Primary ask:</span> {negResult.scripts.primaryAsk}</p>
                <p><span className="font-medium">Counter:</span> {negResult.scripts.dataBackedCounter}</p>
                <p><span className="font-medium">Close:</span> {negResult.scripts.fallbackClose}</p>
              </div>
            </div>
          )}
        </article>

        <article className="section-shell section-stack">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-saffron-500" />
            <h2 className="text-lg font-semibold">Networking CRM + Referral Flow</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Track contacts, outreach cadence, warm intro paths, and referral conversion performance.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input-field" value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="Contact name" />
            <input className="input-field" value={contactCompany} onChange={(event) => setContactCompany(event.target.value)} placeholder="Company" />
            <input className="input-field" value={contactTitle} onChange={(event) => setContactTitle(event.target.value)} placeholder="Title" />
            <input className="input-field" value={contactChannel} onChange={(event) => setContactChannel(event.target.value)} placeholder="Channel" />
            <input type="number" min={1} max={10} className="input-field" value={contactStrength} onChange={(event) => setContactStrength(Number(event.target.value))} placeholder="Relationship strength" />
            <input className="input-field" value={contactWarmPath} onChange={(event) => setContactWarmPath(event.target.value)} placeholder="Warm intro path" />
            <input className="input-field sm:col-span-2" value={contactNotes} onChange={(event) => setContactNotes(event.target.value)} placeholder="Notes" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={addNetworkingContact} disabled={networkingLoading} className="btn-primary">
              <UserPlus className="h-4 w-4" /> Add Contact
            </button>
            <button type="button" onClick={loadNetworking} disabled={networkingLoading} className="btn-outline">
              <RefreshCcw className="h-4 w-4" /> Refresh
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Contacts</p>
              <p className="text-lg font-semibold">{networkingResult?.summary.totalContacts || 0}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Reply rate</p>
              <p className="text-lg font-semibold">{networkingResult?.summary.replyRate || 0}%</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Referral conversion</p>
              <p className="text-lg font-semibold">{networkingResult?.summary.referralConversionRate || 0}%</p>
            </div>
          </div>

          <div className="max-h-64 overflow-auto space-y-2">
            {(networkingResult?.contacts || []).slice(0, 10).map((contact) => (
              <div key={contact.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.title || ""} {contact.title ? "•" : ""} {contact.company}</p>
                  </div>
                  <span className="text-xs rounded-full bg-secondary px-2 py-0.5">{contact.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Warm path: {contact.warmPath || "None"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="btn-outline text-xs" onClick={() => logNetworkingActivity(contact.id, "outreach")}>Log outreach</button>
                  <button type="button" className="btn-outline text-xs" onClick={() => logNetworkingActivity(contact.id, "reply")}>Log reply</button>
                  <button type="button" className="btn-outline text-xs" onClick={() => logNetworkingActivity(contact.id, "referral")}>Log referral</button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="section-shell section-stack">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-saffron-500" />
          <h2 className="text-lg font-semibold">Workspace Collaboration Layer</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage mentor/reviewer workflows with shared checklists, approvals, and inline collaboration comments.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm sm:col-span-1">
            Workspace
            <select value={selectedWorkspaceId} onChange={(event) => setSelectedWorkspaceId(event.target.value)} className="input-field mt-1">
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-outline sm:self-end" onClick={() => {
            if (!selectedWorkspaceId) return
            void loadCollaboration(selectedWorkspaceId)
            void loadComments(selectedWorkspaceId)
          }} disabled={collabLoading || commentLoading}>
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="text-xs text-muted-foreground">Checklist completion</p>
            <p className="text-lg font-semibold">{collabResult?.summary.completionRate || 0}%</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                <p className="font-medium">Shared checklist</p>
              </div>
              <input className="input-field" value={checklistTitle} onChange={(event) => setChecklistTitle(event.target.value)} placeholder="Checklist title" />
              <textarea className="input-field min-h-[90px]" value={checklistItemsInput} onChange={(event) => setChecklistItemsInput(event.target.value)} placeholder="One item per line" />
              <button type="button" className="btn-primary" onClick={createChecklist} disabled={collabLoading}>Create checklist</button>

              <div className="space-y-2 max-h-64 overflow-auto">
                {(collabResult?.checklists || []).map((list) => (
                  <div key={list.id} className="rounded-lg border border-border p-3">
                    <p className="font-medium">{list.title}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      {list.items.map((item) => (
                        <label key={item.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={(event) => {
                              void toggleChecklistItem(list.id, item.id, event.target.checked)
                            }}
                          />
                          <span className={cn(item.done && "line-through text-muted-foreground")}>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                <p className="font-medium">Approval flow</p>
              </div>
              <input className="input-field" value={approvalTitle} onChange={(event) => setApprovalTitle(event.target.value)} placeholder="Approval title" />
              <textarea className="input-field min-h-[80px]" value={approvalDescription} onChange={(event) => setApprovalDescription(event.target.value)} placeholder="Description" />
              <button type="button" className="btn-primary" onClick={requestApproval} disabled={collabLoading}>Request approval</button>

              <div className="space-y-2 max-h-56 overflow-auto">
                {(collabResult?.approvals || []).map((approval) => (
                  <div key={approval.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{approval.title}</p>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{approval.status}</span>
                    </div>
                    {approval.description && <p className="text-muted-foreground mt-1">{approval.description}</p>}
                    {approval.status === "pending" && (
                      <div className="mt-2 flex gap-2">
                        <button type="button" className="btn-outline text-xs" onClick={() => decideApproval(approval.id, "approved")}>Approve</button>
                        <button type="button" className="btn-outline text-xs" onClick={() => decideApproval(approval.id, "changes_requested")}>Request changes</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <p className="font-medium">Mentor/reviewer comments</p>
            </div>
            <textarea
              className="input-field min-h-[80px]"
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Add a shared comment for this workspace..."
            />
            <button type="button" className="btn-primary w-fit" onClick={postComment} disabled={commentLoading}>Post comment</button>

            <div className="max-h-[460px] overflow-auto space-y-2">
              {(comments || []).map((comment) => (
                <div key={comment.id} className="rounded-lg border border-border p-3 text-sm">
                  <p>{comment.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</p>
                </div>
              ))}
              {!commentLoading && comments.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No comments yet for this workspace.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell section-stack">
        <div className="surface-header">
          <div>
            <h2 className="text-lg font-semibold">What’s Active Right Now</h2>
            <p className="text-sm text-muted-foreground">All nine feature tracks are now live in this Ops Suite.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={APP_ROUTES.jobsExplorer} className="btn-outline text-sm">
              <Briefcase className="h-4 w-4" /> Jobs Explorer
            </a>
            <a href={APP_ROUTES.interviews} className="btn-outline text-sm">
              <Target className="h-4 w-4" /> Interview Prep
            </a>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="font-medium">Inbox automation</p>
            <p className="text-muted-foreground mt-1">Email event parsing with auto status updates in Applications.</p>
          </div>
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="font-medium">Browser capture</p>
            <p className="text-muted-foreground mt-1">Extension-ready pipeline from job boards into Saved Jobs.</p>
          </div>
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="font-medium">Interview copilot</p>
            <p className="text-muted-foreground mt-1">Voice transcript scoring and actionable rewrite guidance.</p>
          </div>
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="font-medium">Weekly autopilot</p>
            <p className="text-muted-foreground mt-1">7-day execution plan with Google/Outlook links and ICS export.</p>
          </div>
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="font-medium">Resume experiment engine</p>
            <p className="text-muted-foreground mt-1">A/B event tracking and conversion attribution by variant.</p>
          </div>
          <div className="rounded-xl border border-border p-4 text-sm">
            <p className="font-medium">Networking + collaboration</p>
            <p className="text-muted-foreground mt-1">CRM, referral analytics, checklists, approvals, and comments.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
