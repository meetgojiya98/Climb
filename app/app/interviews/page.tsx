"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { AIMissionConsole } from "@/components/app/ai-mission-console"
import { 
  MessageSquare, 
  Play, 
  Target,
  Sparkles,
  ChevronRight,
  BookOpen,
  Brain,
  Award,
  RotateCcw,
  Star,
  Lightbulb,
  ArrowLeft,
  Loader2,
  Copy,
  RefreshCw,
  Clock3,
  Flame,
  Wand2,
  ShieldQuestion,
  Trash2,
  CheckSquare,
  Square,
  TimerReset,
  Gauge,
  PanelTopOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const InterviewAnalyticsPanel = dynamic(
  () => import("@/components/app/graphical-ui").then((mod) => mod.InterviewAnalyticsPanel),
  { ssr: false }
)

const QUESTION_CATEGORIES = [
  { id: 'behavioral', name: 'Behavioral', icon: Brain, description: 'STAR method questions about past experiences', count: 8, color: 'saffron' },
  { id: 'technical', name: 'Technical', icon: Target, description: 'Role-specific technical and problem-solving', count: 8, color: 'navy' },
  { id: 'situational', name: 'Situational', icon: BookOpen, description: 'How you would handle real scenarios', count: 8, color: 'purple' },
  { id: 'culture', name: 'Culture Fit', icon: Award, description: 'Values, motivation, and team dynamics', count: 7, color: 'green' },
]

const SAMPLE_QUESTIONS: Record<string, Array<{ question: string; tip: string }>> = {
  behavioral: [
    { question: "Tell me about a time you had to deal with a difficult team member.", tip: "Focus on how you resolved the conflict, not just the problem." },
    { question: "Describe a situation where you had to meet a tight deadline.", tip: "Highlight your prioritization and time management skills." },
    { question: "Give an example of when you showed leadership.", tip: "Leadership isn't just about titles — initiative counts." },
    { question: "Tell me about a time you failed and what you learned.", tip: "Show self-awareness and growth mindset." },
    { question: "Describe a situation where you had to adapt to change quickly.", tip: "Emphasize flexibility and positive outcomes." },
    { question: "Tell me about your biggest professional achievement.", tip: "Quantify impact: revenue, users, efficiency gains." },
    { question: "Describe a time you went above and beyond.", tip: "Show passion and commitment without sounding like a workaholic." },
    { question: "Tell me about a time you had to persuade someone.", tip: "Focus on empathy, data, and building consensus." },
  ],
  technical: [
    { question: "Walk me through your approach to solving complex problems.", tip: "Show structured thinking: define → break down → solve → validate." },
    { question: "How do you stay updated with industry trends?", tip: "Mention specific resources, communities, or learning habits." },
    { question: "Describe your experience with relevant technology in your field.", tip: "Be specific about what you built and the impact." },
    { question: "How do you prioritize tasks in a project?", tip: "Mention frameworks like Eisenhower matrix or MoSCoW." },
    { question: "What's your process for debugging or troubleshooting issues?", tip: "Show systematic thinking: reproduce → isolate → fix → prevent." },
    { question: "How do you ensure quality in your work?", tip: "Mention testing, code reviews, documentation, or QA processes." },
    { question: "Describe a technical challenge you overcame.", tip: "Focus on the approach and reasoning, not just the solution." },
    { question: "How do you handle technical debt?", tip: "Balance pragmatism with long-term thinking." },
  ],
  situational: [
    { question: "How would you handle a disagreement with your manager?", tip: "Show respect while standing up for your perspective with data." },
    { question: "What would you do if you missed a deadline?", tip: "Communicate early, take ownership, and propose a recovery plan." },
    { question: "How would you approach learning a new skill quickly?", tip: "Show a structured learning approach and resourcefulness." },
    { question: "What would you do if you noticed a colleague struggling?", tip: "Show empathy and teamwork without being overbearing." },
    { question: "How would you handle multiple competing priorities?", tip: "Align with business goals and communicate tradeoffs." },
    { question: "How would you onboard yourself in a new role?", tip: "Show initiative: 30-60-90 day plan, stakeholder mapping." },
    { question: "What if you received negative feedback you disagreed with?", tip: "Listen first, seek to understand, then discuss constructively." },
    { question: "How would you handle a project with unclear requirements?", tip: "Ask clarifying questions, propose solutions, iterate." },
  ],
  culture: [
    { question: "Why do you want to work at this company?", tip: "Be specific: mission, product, team, culture — not generic praise." },
    { question: "What kind of work environment do you thrive in?", tip: "Be honest but align with the company's actual culture." },
    { question: "How do you handle feedback?", tip: "Show you actively seek and act on feedback." },
    { question: "What motivates you in your work?", tip: "Be authentic — impact, learning, craft, or helping others." },
    { question: "Where do you see yourself in 5 years?", tip: "Show ambition that aligns with the company's growth." },
    { question: "How do you handle stress and pressure?", tip: "Give specific coping strategies and examples." },
    { question: "What's something you're passionate about outside of work?", tip: "Be genuine — this reveals your personality." },
  ],
}

interface InterviewFeedback {
  overallRating: 'strong' | 'good' | 'needs_work'
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  rewriteTip: string
  confidence: number
}

interface InterviewCurriculum {
  overview: string
  baseline: {
    sessions30d: number
    avgScore: number
    interviewRate: number
    strengths: string[]
    risks: string[]
  }
  weeklyPlan: Array<{
    week: string
    objective: string
    drills: string[]
    checkpoint: string
    deviceTips: {
      mobile: string
      ipad: string
      desktop: string
    }
  }>
  dailyCadence: Array<{
    day: string
    focus: string
    durationMin: number
    action: string
  }>
  questionThemes: string[]
  aiScripts: Array<{
    title: string
    prompt: string
    useWhen: string
  }>
  confidence: number
}

type FocusArea = 'storytelling' | 'metrics' | 'technical-depth' | 'presence' | 'system-design' | 'behavioral'

interface SavedAnswerEntry {
  id: string
  category: string
  question: string
  answer: string
  score: number
  savedAt: string
}

interface StreakState {
  streakDays: number
  lastPracticeDate: string
  totalSessions: number
}

interface CompanyQuestionPack {
  id: string
  persona: string
  question: string
  intent: string
}

interface WeeklyDrillTask {
  id: string
  label: string
  done: boolean
}

const FOCUS_OPTIONS: Array<{ id: FocusArea; label: string }> = [
  { id: 'storytelling', label: 'Storytelling' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'technical-depth', label: 'Technical Depth' },
  { id: 'presence', label: 'Executive Presence' },
  { id: 'system-design', label: 'System Design' },
  { id: 'behavioral', label: 'Behavioral' },
]

const PANEL_PERSONAS = [
  { id: 'hiring-manager', label: 'Hiring Manager', tone: 'Scope + ownership' },
  { id: 'peer', label: 'Peer Interviewer', tone: 'Execution + collaboration' },
  { id: 'cross-functional', label: 'Cross-functional Partner', tone: 'Stakeholder alignment' },
  { id: 'executive', label: 'Executive', tone: 'Business impact + strategy' },
  { id: 'bar-raiser', label: 'Bar Raiser', tone: 'Depth + decision quality' },
]

const COMPANY_QUESTION_BLUEPRINTS = [
  "What problem at {company} would you solve first in this {role} role, and why?",
  "Tell us about a project that proves you can operate at the level this {role} requires.",
  "How would your first 30 days at {company} look?",
  "Describe a difficult tradeoff you made that is similar to what this team faces.",
  "What metrics would you own in this {role}, and how would you improve them?",
  "If a launch at {company} goes off-track, how would you recover execution quickly?",
]

const WEEKLY_TASK_TEMPLATE: WeeklyDrillTask[] = [
  { id: 'task-1', label: 'Practice 3 behavioral answers in STAR format', done: false },
  { id: 'task-2', label: 'Record one mock interview and review pacing', done: false },
  { id: 'task-3', label: 'Add metrics to 2 weak interview stories', done: false },
  { id: 'task-4', label: 'Run one pressure-test follow-up drill', done: false },
  { id: 'task-5', label: 'Write a same-day follow-up email template', done: false },
]

const INTERVIEW_STORAGE_KEYS = {
  savedAnswers: "climb:interviews:saved-answers:v1",
  streak: "climb:interviews:streak:v1",
  weeklyTasks: "climb:interviews:weekly-tasks:v1",
} as const

const RATING_STYLES: Record<InterviewFeedback['overallRating'], { label: string; emoji: string; card: string; badge: string }> = {
  strong: {
    label: 'Strong Answer',
    emoji: '💪',
    card: 'bg-green-500/10 border-green-500/20',
    badge: 'bg-green-500/15 text-green-700',
  },
  good: {
    label: 'Good Answer',
    emoji: '👍',
    card: 'bg-blue-500/10 border-blue-500/20',
    badge: 'bg-blue-500/15 text-blue-700',
  },
  needs_work: {
    label: 'Needs Improvement',
    emoji: '🔧',
    card: 'bg-saffron-500/10 border-saffron-500/20',
    badge: 'bg-saffron-500/15 text-saffron-700',
  },
}

export default function InterviewsPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [practiceMode, setPracticeMode] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)
  const [score, setScore] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [showTip, setShowTip] = useState(false)
  const [recentSessions, setRecentSessions] = useState<Array<{ category: string; score: number | null; questions_answered: number; created_at: string }>>([])
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswerEntry[]>([])
  const [streak, setStreak] = useState<StreakState>({ streakDays: 0, lastPracticeDate: '', totalSessions: 0 })
  const [weeklyTasks, setWeeklyTasks] = useState<WeeklyDrillTask[]>(WEEKLY_TASK_TEMPLATE)
  const [timedMode, setTimedMode] = useState(true)
  const [timeLimitSec, setTimeLimitSec] = useState(180)
  const [timeRemainingSec, setTimeRemainingSec] = useState(180)
  const [dailyTargetQuestions, setDailyTargetQuestions] = useState(6)
  const [companyName, setCompanyName] = useState("Target Company")
  const [companyRole, setCompanyRole] = useState("Product Manager")
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['hiring-manager', 'peer', 'executive'])
  const [companyPack, setCompanyPack] = useState<CompanyQuestionPack[]>([])
  const sessionStartRef = useRef<number>(0)
  const [targetRole, setTargetRole] = useState("Product Manager")
  const [weeklyHours, setWeeklyHours] = useState(6)
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([
    'storytelling',
    'metrics',
    'behavioral',
  ])
  const [curriculum, setCurriculum] = useState<InterviewCurriculum | null>(null)
  const [curriculumLoading, setCurriculumLoading] = useState(false)
  const [curriculumError, setCurriculumError] = useState<string | null>(null)
  const [copiedScript, setCopiedScript] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('interview_sessions').select('category, score, questions_answered, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
        if (data) setRecentSessions(data)
      } catch (_) {}
    }
    load()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const savedAnswersRaw = window.localStorage.getItem(INTERVIEW_STORAGE_KEYS.savedAnswers)
      const streakRaw = window.localStorage.getItem(INTERVIEW_STORAGE_KEYS.streak)
      const weeklyRaw = window.localStorage.getItem(INTERVIEW_STORAGE_KEYS.weeklyTasks)

      if (savedAnswersRaw) {
        const parsed = JSON.parse(savedAnswersRaw)
        if (Array.isArray(parsed)) {
          setSavedAnswers(
            parsed
              .filter((entry) => entry && typeof entry === "object")
              .slice(0, 50) as SavedAnswerEntry[]
          )
        }
      }

      if (streakRaw) {
        const parsed = JSON.parse(streakRaw)
        if (parsed && typeof parsed === "object") {
          setStreak({
            streakDays: Number(parsed.streakDays || 0),
            lastPracticeDate: String(parsed.lastPracticeDate || ''),
            totalSessions: Number(parsed.totalSessions || 0),
          })
        }
      }

      if (weeklyRaw) {
        const parsed = JSON.parse(weeklyRaw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWeeklyTasks(parsed as WeeklyDrillTask[])
        }
      }
    } catch (_) {
      // noop
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(INTERVIEW_STORAGE_KEYS.savedAnswers, JSON.stringify(savedAnswers))
  }, [savedAnswers])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(INTERVIEW_STORAGE_KEYS.streak, JSON.stringify(streak))
  }, [streak])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(INTERVIEW_STORAGE_KEYS.weeklyTasks, JSON.stringify(weeklyTasks))
  }, [weeklyTasks])

  useEffect(() => {
    if (!practiceMode || !timedMode || showFeedback || feedbackLoading) return
    if (timeRemainingSec <= 0) {
      if (userAnswer.trim()) {
        void submitAnswer()
      }
      return
    }

    const timer = window.setInterval(() => {
      setTimeRemainingSec((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [practiceMode, timedMode, showFeedback, feedbackLoading, timeRemainingSec, userAnswer])

  const toggleFocus = (focus: FocusArea) => {
    setFocusAreas((prev) => {
      const exists = prev.includes(focus)
      if (exists) {
        if (prev.length === 1) return prev
        return prev.filter((item) => item !== focus)
      }
      if (prev.length >= 4) return [...prev.slice(1), focus]
      return [...prev, focus]
    })
  }

  const togglePersona = (personaId: string) => {
    setSelectedPersonas((current) => {
      if (current.includes(personaId)) {
        if (current.length === 1) return current
        return current.filter((item) => item !== personaId)
      }
      if (current.length >= 4) {
        return [...current.slice(1), personaId]
      }
      return [...current, personaId]
    })
  }

  const buildCompanyQuestionPack = () => {
    const personaLabels = selectedPersonas
      .map((id) => PANEL_PERSONAS.find((persona) => persona.id === id))
      .filter(Boolean) as Array<{ id: string; label: string; tone: string }>

    if (personaLabels.length === 0) {
      toast.error('Select at least one panel persona')
      return
    }

    const generated: CompanyQuestionPack[] = []
    personaLabels.forEach((persona, personaIndex) => {
      COMPANY_QUESTION_BLUEPRINTS.slice(0, 2).forEach((template, templateIndex) => {
        generated.push({
          id: `${persona.id}-${templateIndex}`,
          persona: persona.label,
          question: template
            .replaceAll("{company}", companyName.trim() || "your target company")
            .replaceAll("{role}", companyRole.trim() || "target role"),
          intent: persona.tone,
        })
      })
      if (personaIndex === 0) {
        generated.push({
          id: `${persona.id}-followup`,
          persona: persona.label,
          question: `What would your first high-impact decision be in this ${companyRole.trim() || "role"} role at ${companyName.trim() || "the company"}?`,
          intent: "Decision quality under ambiguity",
        })
      }
    })

    setCompanyPack(generated.slice(0, 8))
    toast.success('Company question pack ready')
  }

  const saveAnswerToLibrary = () => {
    if (!feedback || !currentQ || !userAnswer.trim() || !activeCategory) return
    const entry: SavedAnswerEntry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      category: activeCategory,
      question: currentQ.question,
      answer: userAnswer.trim(),
      score: feedback.score,
      savedAt: new Date().toISOString(),
    }
    setSavedAnswers((current) => [entry, ...current].slice(0, 40))
    toast.success("Answer saved to your library")
  }

  const removeSavedAnswer = (id: string) => {
    setSavedAnswers((current) => current.filter((entry) => entry.id !== id))
  }

  const toggleWeeklyTask = (taskId: string) => {
    setWeeklyTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, done: !task.done } : task
      )
    )
  }

  const markPracticeSessionComplete = () => {
    const today = new Date().toISOString().slice(0, 10)
    setStreak((current) => {
      if (current.lastPracticeDate === today) {
        return {
          ...current,
          totalSessions: current.totalSessions + 1,
        }
      }

      const previous = current.lastPracticeDate ? new Date(current.lastPracticeDate) : null
      const todayDate = new Date(today)
      let nextStreak = 1
      if (previous) {
        const diffDays = Math.round((todayDate.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24))
        nextStreak = diffDays === 1 ? current.streakDays + 1 : 1
      }

      return {
        streakDays: nextStreak,
        lastPracticeDate: today,
        totalSessions: current.totalSessions + 1,
      }
    })
  }

  const formatTimer = (seconds: number) => {
    const safe = Math.max(0, seconds)
    const mins = Math.floor(safe / 60).toString().padStart(2, "0")
    const secs = (safe % 60).toString().padStart(2, "0")
    return `${mins}:${secs}`
  }

  const generateCurriculum = async () => {
    if (curriculumLoading) return
    setCurriculumLoading(true)
    setCurriculumError(null)

    try {
      const response = await fetch('/api/agent/interview-curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole,
          weeklyHours,
          focus: focusAreas,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to generate interview curriculum')
      }

      const payload = data?.curriculum || {}
      setCurriculum({
        overview: String(payload?.overview || ''),
        baseline: {
          sessions30d: Number(payload?.baseline?.sessions30d || 0),
          avgScore: Number(payload?.baseline?.avgScore || 0),
          interviewRate: Number(payload?.baseline?.interviewRate || 0),
          strengths: Array.isArray(payload?.baseline?.strengths) ? payload.baseline.strengths : [],
          risks: Array.isArray(payload?.baseline?.risks) ? payload.baseline.risks : [],
        },
        weeklyPlan: Array.isArray(payload?.weeklyPlan) ? payload.weeklyPlan : [],
        dailyCadence: Array.isArray(payload?.dailyCadence) ? payload.dailyCadence : [],
        questionThemes: Array.isArray(payload?.questionThemes) ? payload.questionThemes : [],
        aiScripts: Array.isArray(payload?.aiScripts) ? payload.aiScripts : [],
        confidence: Number(payload?.confidence || 0.5),
      })
      toast.success('AI interview curriculum generated')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Interview curriculum failed'
      setCurriculumError(message)
      toast.error(message)
    } finally {
      setCurriculumLoading(false)
    }
  }

  const copyScriptPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedScript(prompt)
      setTimeout(() => setCopiedScript(null), 1400)
      toast.success('Prompt copied')
    } catch {
      toast.error('Unable to copy prompt')
    }
  }

  const startPractice = (category: string) => {
    setActiveCategory(category)
    setPracticeMode(true)
    setCurrentQuestion(0)
    setUserAnswer("")
    setShowFeedback(false)
    setFeedback(null)
    setFeedbackError(null)
    setScore(0)
    setTotalAnswered(0)
    setShowTip(false)
    setTimeRemainingSec(timeLimitSec)
    sessionStartRef.current = Date.now()
  }

  const submitAnswer = async () => {
    if (!activeCategory || !currentQ || feedbackLoading) return
    const answer = userAnswer.trim()
    if (!answer) return

    setFeedbackLoading(true)
    setFeedbackError(null)

    try {
      const response = await fetch('/api/agent/interview-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCategory,
          question: currentQ.question,
          answer,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to generate interview feedback')
      }

      const payload = data?.feedback || {}
      const normalized: InterviewFeedback = {
        overallRating: payload?.overallRating === 'strong' || payload?.overallRating === 'good' ? payload.overallRating : 'needs_work',
        score: Math.max(0, Math.min(100, Number(payload?.score || 0))),
        feedback: String(payload?.feedback || ''),
        strengths: Array.isArray(payload?.strengths) ? payload.strengths : [],
        improvements: Array.isArray(payload?.improvements) ? payload.improvements : [],
        rewriteTip: String(payload?.rewriteTip || ''),
        confidence: Number(payload?.confidence || 0.5),
      }

      setFeedback(normalized)
      setTotalAnswered((value) => value + 1)
      if (normalized.score >= 70) {
        setScore((value) => value + 1)
      }
      setShowFeedback(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Interview feedback failed'
      setFeedbackError(message)
      setFeedback({
        overallRating: 'needs_work',
        score: 52,
        feedback: 'AI feedback is temporarily unavailable. Use STAR structure and add measurable outcomes to strengthen your response.',
        strengths: ['You provided a complete attempt', 'Your answer addresses the question topic'],
        improvements: ['Use a clear STAR structure', 'Add one specific metric or outcome'],
        rewriteTip: 'Rewrite in 4 sentences: context, your action, measurable result, and lesson learned.',
        confidence: 0.45,
      })
      setTotalAnswered((value) => value + 1)
      setShowFeedback(true)
    } finally {
      setFeedbackLoading(false)
    }
  }

  const saveSession = async () => {
    if (totalAnswered > 0) {
      markPracticeSessionComplete()
    }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !activeCategory) return
      const duration = Math.round((Date.now() - sessionStartRef.current) / 1000)
      const avgScore = totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : null
      await supabase.from('interview_sessions').insert({
        user_id: user.id,
        category: activeCategory,
        questions_answered: totalAnswered,
        score: avgScore,
        duration_seconds: duration,
      })
      const { data } = await supabase.from('interview_sessions').select('category, score, questions_answered, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
      if (data) setRecentSessions(data)
    } catch (_) {}
  }

  const nextQuestion = () => {
    const questions = SAMPLE_QUESTIONS[activeCategory || ''] || []
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setUserAnswer("")
      setShowFeedback(false)
      setFeedback(null)
      setFeedbackError(null)
      setShowTip(false)
      setTimeRemainingSec(timeLimitSec)
    } else {
      saveSession()
      setPracticeMode(false)
      setActiveCategory(null)
    }
  }

  const questions = activeCategory ? SAMPLE_QUESTIONS[activeCategory] || [] : []
  const currentQ = questions[currentQuestion]
  const interviewTrendScores = useMemo(() => {
    const recent = recentSessions
      .map((session) => Number(session.score))
      .filter((score) => Number.isFinite(score))
    if (recent.length === 0) return [56, 60, 64, 68, 71, 74, 77, 81]
    return recent.reverse()
  }, [recentSessions])
  const averageRecentScore = useMemo(() => {
    const values = recentSessions
      .map((session) => Number(session.score))
      .filter((value) => Number.isFinite(value))
    if (!values.length) return 0
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  }, [recentSessions])

  const dailyProgress = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const todayCount = recentSessions.filter((session) => session.created_at.startsWith(today)).length
    const practicedNow = practiceMode ? Math.max(totalAnswered, 0) : 0
    const completed = todayCount + practicedNow
    return {
      completed,
      target: dailyTargetQuestions,
      percent: Math.max(0, Math.min(100, Math.round((completed / Math.max(1, dailyTargetQuestions)) * 100))),
    }
  }, [recentSessions, dailyTargetQuestions, totalAnswered, practiceMode])

  const readinessScore = useMemo(() => {
    const taskCompletion = weeklyTasks.length
      ? Math.round((weeklyTasks.filter((task) => task.done).length / weeklyTasks.length) * 100)
      : 0
    const answerLibraryBoost = Math.min(20, savedAnswers.length * 2)
    const streakBoost = Math.min(18, streak.streakDays * 3)
    const scoreMix = averageRecentScore ? Math.round(averageRecentScore * 0.64) : 48
    return Math.max(0, Math.min(100, scoreMix + Math.round(taskCompletion * 0.18) + answerLibraryBoost + streakBoost))
  }, [averageRecentScore, weeklyTasks, savedAnswers.length, streak.streakDays])

  const wordsPerMinute = useMemo(() => {
    const words = userAnswer.trim().split(/\s+/).filter(Boolean).length
    const elapsed = Math.max(1, timeLimitSec - timeRemainingSec)
    const minutes = elapsed / 60
    return Math.round(words / minutes)
  }, [userAnswer, timeLimitSec, timeRemainingSec])

  return (
    <div className="section-shell section-stack">
      {!practiceMode ? (
        <>
          {/* Header */}
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Interview Prep</h1>
            <p className="text-muted-foreground">Practice 31 real interview questions with AI feedback</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: MessageSquare, label: '31 Questions', sub: 'Across 4 categories', color: 'saffron' },
              { icon: Brain, label: 'STAR Method', sub: 'Built-in coaching', color: 'navy' },
              { icon: Sparkles, label: 'AI Feedback', sub: 'Instant analysis', color: 'purple' },
              { icon: Target, label: 'Score Tracking', sub: 'Track your progress', color: 'green' },
            ].map((stat, i) => (
              <div key={i} className="card-elevated p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    stat.color === 'saffron' ? 'bg-saffron-500/10' : stat.color === 'navy' ? 'bg-navy-500/10' : stat.color === 'purple' ? 'bg-purple-500/10' : 'bg-green-500/10'
                  }`}>
                    <stat.icon className={`w-5 h-5 ${
                      stat.color === 'saffron' ? 'text-saffron-500' : stat.color === 'navy' ? 'text-navy-600' : stat.color === 'purple' ? 'text-purple-500' : 'text-green-500'
                    }`} />
                  </div>
                  <div>
                    <div className="font-semibold">{stat.label}</div>
                    <div className="text-xs text-muted-foreground">{stat.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <div className="card-elevated p-4 lg:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Interview Readiness</p>
                  <h2 className="text-2xl font-semibold mt-1">{readinessScore}%</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Combines recent scores, weekly drill completion, streak, and answer library strength.
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-saffron-500/10 flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-saffron-500" />
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-saffron-500 via-amber-400 to-green-500 transition-all duration-700"
                  style={{ width: `${readinessScore}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border bg-secondary/40 px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Avg Score</p>
                  <p className="text-sm font-semibold">{averageRecentScore || "--"}%</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/40 px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Streak</p>
                  <p className="text-sm font-semibold">{streak.streakDays} days</p>
                </div>
                <div className="rounded-lg border border-border bg-secondary/40 px-2 py-2">
                  <p className="text-[11px] text-muted-foreground">Saved Answers</p>
                  <p className="text-sm font-semibold">{savedAnswers.length}</p>
                </div>
              </div>
            </div>

            <div className="card-elevated p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Daily Sprint</p>
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-semibold mt-1">{dailyProgress.completed}/{dailyProgress.target}</p>
              <p className="text-xs text-muted-foreground mt-1">questions practiced today</p>
              <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all duration-700" style={{ width: `${dailyProgress.percent}%` }} />
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Daily target</span>
                  <span>{dailyTargetQuestions}</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={12}
                  step={1}
                  value={dailyTargetQuestions}
                  onChange={(event) => setDailyTargetQuestions(Number(event.target.value))}
                  className="w-full accent-saffron-500"
                />
              </div>
            </div>

            <div className="card-elevated p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Practice Mode</p>
                <Clock3 className="w-4 h-4 text-navy-600" />
              </div>
              <div className="mt-2 space-y-2 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-saffron-500"
                    checked={timedMode}
                    onChange={(event) => setTimedMode(event.target.checked)}
                  />
                  Timed mode enabled
                </label>
                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>Per-question timer</span>
                    <span>{Math.round(timeLimitSec / 60)} min</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={300}
                    step={30}
                    value={timeLimitSec}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      setTimeLimitSec(next)
                      setTimeRemainingSec(next)
                    }}
                    className="w-full accent-saffron-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <InterviewAnalyticsPanel scores={interviewTrendScores} />

          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-saffron-500/10 text-saffron-700 px-3 py-1 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Interview Command Center
                </div>
                <h2 className="font-semibold mt-2">Generate a personalized 3-week interview curriculum</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Build a role-specific plan with drills, checkpoints, and device-optimized coaching blocks.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { void generateCurriculum() }}
                disabled={curriculumLoading}
                className="btn-saffron text-sm disabled:opacity-60"
              >
                {curriculumLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {curriculumLoading ? 'Generating...' : 'Generate Curriculum'}
              </button>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Target role</label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(event) => setTargetRole(event.target.value)}
                    className="input-field mt-1"
                    placeholder="e.g. Product Manager, Software Engineer"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Weekly practice hours</span>
                    <span>{weeklyHours}h</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={14}
                    step={1}
                    value={weeklyHours}
                    onChange={(event) => setWeeklyHours(Math.max(2, Math.min(14, Number(event.target.value))))}
                    className="w-full accent-saffron-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Focus areas (up to 4)</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {FOCUS_OPTIONS.map((focus) => (
                      <button
                        key={focus.id}
                        type="button"
                        onClick={() => toggleFocus(focus.id)}
                        className={cn(
                          "rounded-xl border px-2.5 py-2 text-xs transition-colors text-left",
                          focusAreas.includes(focus.id)
                            ? "border-saffron-500/40 bg-saffron-500/10 text-saffron-700"
                            : "border-border hover:bg-secondary"
                        )}
                      >
                        {focus.label}
                      </button>
                    ))}
                  </div>
                </div>
                {curriculumError && <p className="text-xs text-red-600">{curriculumError}</p>}
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                {!curriculum ? (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Curriculum output includes</p>
                    <p>• Baseline performance diagnosis from recent sessions</p>
                    <p>• Week-by-week drills and measurable checkpoints</p>
                    <p>• Device-specific coaching instructions for mobile/iPad/desktop</p>
                    <p>• Ready-to-use AI prompts for rewriting and pressure simulation</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{curriculum.overview}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-border bg-background/80 p-2.5 text-center">
                        <p className="text-[11px] text-muted-foreground">Sessions (30d)</p>
                        <p className="text-lg font-semibold">{curriculum.baseline.sessions30d}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background/80 p-2.5 text-center">
                        <p className="text-[11px] text-muted-foreground">Avg Score</p>
                        <p className="text-lg font-semibold">{Math.round(curriculum.baseline.avgScore)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-background/80 p-2.5 text-center">
                        <p className="text-[11px] text-muted-foreground">Interview Rate</p>
                        <p className="text-lg font-semibold">{Math.round(curriculum.baseline.interviewRate)}%</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Confidence {Math.round(Math.max(0, Math.min(1, curriculum.confidence)) * 100)}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {curriculum && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 lg:grid-cols-3">
                  {curriculum.weeklyPlan.map((week) => (
                    <article key={week.week} className="rounded-xl border border-border p-3 sm:p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{week.week}</p>
                      <p className="text-sm font-medium mt-1">{week.objective}</p>
                      <div className="mt-2 space-y-1">
                        {week.drills.slice(0, 4).map((drill, index) => (
                          <p key={`${week.week}-${index}`} className="text-xs text-muted-foreground">• {drill}</p>
                        ))}
                      </div>
                      <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-2.5">
                        <p className="text-[11px] text-muted-foreground">{week.checkpoint}</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-3 sm:p-4">
                    <p className="text-sm font-medium mb-2">Weekly cadence</p>
                    <div className="space-y-1.5">
                      {curriculum.dailyCadence.slice(0, 5).map((item) => (
                        <p key={`${item.day}-${item.focus}`} className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{item.day} ({item.durationMin}m):</span> {item.action}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border p-3 sm:p-4">
                    <p className="text-sm font-medium mb-2">AI practice scripts</p>
                    <div className="space-y-2">
                      {curriculum.aiScripts.slice(0, 4).map((script) => (
                        <button
                          key={script.title}
                          type="button"
                          onClick={() => { void copyScriptPrompt(script.prompt) }}
                          className="w-full rounded-lg border border-border p-2.5 text-left hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium">{script.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-1">{script.useWhen}</p>
                            </div>
                            <span className="text-xs text-saffron-700 inline-flex items-center gap-1">
                              {copiedScript === script.prompt ? <RefreshCw className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copiedScript === script.prompt ? 'Copied' : 'Copy'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="card-elevated p-4 sm:p-5 lg:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-navy-500/10 text-navy-700 px-3 py-1 text-xs font-medium">
                    <PanelTopOpen className="w-3.5 h-3.5" />
                    Company Panel Simulator
                  </div>
                  <h3 className="font-semibold mt-2">Build company-specific panel questions</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate interviewer-specific questions for your target company and role.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={buildCompanyQuestionPack}
                  className="btn-saffron text-sm"
                >
                  <Wand2 className="w-4 h-4" />
                  Build Question Pack
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Company</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    className="input-field mt-1"
                    placeholder="e.g. Stripe"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Role</label>
                  <input
                    type="text"
                    value={companyRole}
                    onChange={(event) => setCompanyRole(event.target.value)}
                    className="input-field mt-1"
                    placeholder="e.g. Senior Product Manager"
                  />
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Panel personas (up to 4)</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {PANEL_PERSONAS.map((persona) => {
                    const active = selectedPersonas.includes(persona.id)
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => togglePersona(persona.id)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-left transition-colors",
                          active
                            ? "border-saffron-500/40 bg-saffron-500/10"
                            : "border-border hover:bg-secondary"
                        )}
                      >
                        <p className="text-xs font-medium">{persona.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{persona.tone}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {companyPack.length > 0 && (
                <div className="mt-4 space-y-2">
                  {companyPack.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border bg-secondary/30 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-saffron-700">{item.persona}</p>
                          <p className="text-sm mt-1">{item.question}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{item.intent}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void copyScriptPrompt(item.question)
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card-elevated p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-sm">Weekly Drill Board</h3>
                  <span className="text-xs text-muted-foreground">
                    {weeklyTasks.filter((task) => task.done).length}/{weeklyTasks.length} complete
                  </span>
                </div>
                <div className="space-y-2">
                  {weeklyTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleWeeklyTask(task.id)}
                      className="w-full rounded-lg border border-border bg-secondary/20 px-3 py-2 text-left text-sm hover:bg-secondary/40 transition-colors"
                    >
                      <span className="inline-flex items-start gap-2">
                        {task.done ? (
                          <CheckSquare className="w-4 h-4 text-green-600 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground mt-0.5" />
                        )}
                        <span className={task.done ? "line-through text-muted-foreground" : ""}>{task.label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card-elevated p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-sm">Answer Library</h3>
                  <span className="text-xs text-muted-foreground">{savedAnswers.length} saved</span>
                </div>

                {savedAnswers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Save strong answers after feedback to build your personal response bank.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[240px] overflow-auto pr-1">
                    {savedAnswers.slice(0, 8).map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-border bg-secondary/20 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              {entry.category} · Score {entry.score}
                            </p>
                            <p className="text-xs font-medium mt-1 line-clamp-2">{entry.question}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => { void copyScriptPrompt(entry.answer) }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSavedAnswer(entry.id)}
                              className="text-xs text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <AIMissionConsole
            surface="interviews"
            title="AI Interview Missions"
            description="Run targeted missions to improve delivery, structure, and conversion quality."
            missions={[
              {
                id: "interview-structure",
                title: "STAR Structure Upgrade",
                objective: "Improve clarity and structure in behavioral responses.",
                prompt: "Give me a STAR structure training loop for this week with scoring checkpoints.",
                href: "/app/interviews",
                priority: "high",
              },
              {
                id: "interview-metrics",
                title: "Metrics Enrichment",
                objective: "Increase quantified impact in interview stories.",
                prompt: "Help me add credible metrics to my top interview stories.",
                href: "/app/interviews",
                priority: "medium",
              },
              {
                id: "interview-pressure",
                title: "Pressure Simulation",
                objective: "Practice difficult follow-up questions under time pressure.",
                prompt: "Run a pressure-test interview simulation with hard follow-up questions.",
                href: "/app/interviews",
                priority: "medium",
              },
              {
                id: "interview-panel",
                title: "Final Round Panel Prep",
                objective: "Prepare for multi-interviewer final-round scenarios.",
                prompt: "Create a final-round interview preparation plan for a panel format.",
                href: "/app/interviews",
                priority: "high",
              },
            ]}
          />

          {/* Recent practice sessions */}
          {recentSessions.length > 0 && (
            <div className="card-elevated p-4 sm:p-5 lg:p-6">
              <h2 className="font-semibold mb-4">Recent practice</h2>
              <div className="space-y-2">
                {recentSessions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <span className="font-medium capitalize">{s.category}</span>
                      <span className="text-sm text-muted-foreground ml-2">{s.questions_answered} questions</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {s.score != null && <span className="text-saffron-600 font-medium">{s.score}%</span>}
                      <span className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Choose a Category</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {QUESTION_CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => startPractice(cat.id)} className="card-interactive p-4 sm:p-5 lg:p-6 text-left group">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                      cat.color === 'saffron' ? 'bg-saffron-500/10 group-hover:bg-saffron-500/20' :
                      cat.color === 'navy' ? 'bg-navy-500/10 group-hover:bg-navy-500/20' :
                      cat.color === 'purple' ? 'bg-purple-500/10 group-hover:bg-purple-500/20' : 'bg-green-500/10 group-hover:bg-green-500/20'
                    }`}>
                      <cat.icon className={`w-7 h-7 ${
                        cat.color === 'saffron' ? 'text-saffron-500' : cat.color === 'navy' ? 'text-navy-600' : cat.color === 'purple' ? 'text-purple-500' : 'text-green-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{cat.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{cat.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{cat.count} questions</span>
                        <span className="flex items-center gap-1.5 text-sm font-medium text-saffron-500 group-hover:gap-2.5 transition-all">
                          <Play className="w-4 h-4" /> Start Practice
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* STAR Method Guide */}
          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-saffron-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-saffron-500" />
              </div>
              <div>
                <h2 className="font-semibold">Master the STAR Method</h2>
                <p className="text-sm text-muted-foreground">The framework top candidates use</p>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { letter: 'S', word: 'Situation', desc: 'Set the context. Where were you? What was the challenge?', color: 'bg-blue-500' },
                { letter: 'T', word: 'Task', desc: 'What was your specific responsibility or goal?', color: 'bg-saffron-500' },
                { letter: 'A', word: 'Action', desc: 'What steps did YOU take? Be specific about your contribution.', color: 'bg-purple-500' },
                { letter: 'R', word: 'Result', desc: 'What was the outcome? Quantify with numbers when possible.', color: 'bg-green-500' },
              ].map((step, i) => (
                <div key={i} className="p-4 rounded-xl bg-secondary/50 relative">
                  <div className={`w-8 h-8 rounded-lg ${step.color} text-white flex items-center justify-center text-sm font-bold mb-3`}>{step.letter}</div>
                  <h4 className="font-medium text-sm mb-1">{step.word}</h4>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-navy-500/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-navy-600" />
              </div>
              <h2 className="font-semibold">Pro Tips</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: "Prepare 5 Versatile Stories", desc: "Stories that answer multiple question types save you from blanking." },
                { title: "Keep Answers Under 2 Min", desc: "Concise answers show clarity of thought. Practice with a timer." },
                { title: "Research the Company", desc: "Know their mission, recent news, competitors, and culture." },
                { title: "Ask Great Questions", desc: "\"What does success look like in 90 days?\" shows strategic thinking." },
                { title: "Practice Out Loud", desc: "Thinking an answer and saying it are very different. Practice speaking." },
                { title: "Follow Up Within 24h", desc: "A personalized thank-you email keeps you top of mind." },
              ].map((tip, i) => (
                <div key={i} className="p-4 rounded-xl bg-secondary/50">
                  <h4 className="font-medium text-sm mb-1">{tip.title}</h4>
                  <p className="text-xs text-muted-foreground">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Practice Mode */
        <div className="max-w-3xl mx-auto">
          {/* Practice Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => { setPracticeMode(false); setActiveCategory(null) }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Categories
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
              <span className="text-muted-foreground">Score: <span className="font-semibold text-foreground">{score}/{totalAnswered}</span></span>
              <span className="badge-saffron">{QUESTION_CATEGORIES.find(c => c.id === activeCategory)?.name}</span>
              {timedMode && (
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border",
                  timeRemainingSec <= 30 ? "bg-red-500/10 border-red-500/30 text-red-600" : "bg-secondary border-border text-foreground")}>
                  <Clock3 className="w-3.5 h-3.5" />
                  {formatTimer(timeRemainingSec)}
                </span>
              )}
              <button
                type="button"
                onClick={() => setTimeRemainingSec(timeLimitSec)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-secondary transition-colors"
              >
                <TimerReset className="w-3.5 h-3.5" />
                Reset timer
              </button>
            </div>
          </div>

          <div className="card-elevated p-4 sm:p-6 lg:p-8 mb-6">
            {/* Question header */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-muted-foreground">Question {currentQuestion + 1} of {questions.length}</span>
              <button onClick={() => setShowTip(!showTip)}
                className="flex items-center gap-1.5 text-sm text-saffron-500 hover:text-saffron-600 transition-colors">
                <Lightbulb className="w-4 h-4" />
                {showTip ? 'Hide Tip' : 'Show Tip'}
              </button>
            </div>
            
            <h2 className="text-xl lg:text-2xl font-semibold mb-4">{currentQ?.question}</h2>
            
            {showTip && currentQ && (
              <div className="p-4 rounded-xl bg-saffron-500/10 border border-saffron-500/20 mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-saffron-500" />
                  <span className="text-sm font-medium text-saffron-600">Tip</span>
                </div>
                <p className="text-sm text-muted-foreground">{currentQ.tip}</p>
              </div>
            )}
            
            {!showFeedback ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3 mb-4">
                  <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Timed mode</p>
                    <p className="text-sm font-medium mt-1">{timedMode ? "On" : "Off"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pace</p>
                    <p className="text-sm font-medium mt-1">{wordsPerMinute} WPM</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Target</p>
                    <p className="text-sm font-medium mt-1">{Math.round(timeLimitSec / 60)} min response</p>
                  </div>
                </div>

                <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)}
                  className="input-field min-h-[200px] resize-none mb-4"
                  placeholder="Type your answer here... Use the STAR method for best results." />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{userAnswer.length} characters</span>
                  <div className="flex gap-3">
                    <button onClick={() => { setPracticeMode(false); setActiveCategory(null) }} className="btn-outline">Exit</button>
                    <button onClick={() => { void submitAnswer() }} disabled={!userAnswer.trim() || feedbackLoading} className="btn-saffron disabled:opacity-50">
                      {feedbackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {feedbackLoading ? 'Analyzing...' : 'Submit Answer'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* User's answer */}
                <div className="p-4 rounded-xl bg-secondary/50 mb-4">
                  <h4 className="font-medium text-sm mb-2">Your Answer:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{userAnswer}</p>
                </div>
                
                {/* AI Feedback */}
                {feedback && (
                  <div className={`p-5 rounded-xl border mb-4 ${RATING_STYLES[feedback.overallRating].card}`}>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-lg">{RATING_STYLES[feedback.overallRating].emoji}</span>
                      <h4 className="font-semibold">{RATING_STYLES[feedback.overallRating].label}</h4>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${RATING_STYLES[feedback.overallRating].badge}`}>
                        Score {feedback.score}/100
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Confidence {Math.round(Math.max(0, Math.min(1, feedback.confidence)) * 100)}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feedback.feedback}</p>
                    {feedbackError && (
                      <p className="text-xs text-red-600 mt-2">{feedbackError}</p>
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-background/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Strengths</p>
                        <ul className="space-y-1.5">
                          {feedback.strengths.slice(0, 4).map((item, index) => (
                            <li key={`${item}-${index}`} className="text-xs text-muted-foreground">
                              • {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-border bg-background/70 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Improvements</p>
                        <ul className="space-y-1.5">
                          {feedback.improvements.slice(0, 4).map((item, index) => (
                            <li key={`${item}-${index}`} className="text-xs text-muted-foreground">
                              • {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {feedback.rewriteTip && (
                      <div className="mt-3 rounded-lg border border-saffron-500/25 bg-saffron-500/10 p-3">
                        <p className="text-xs uppercase tracking-wide text-saffron-700 mb-1">Rewrite Tip</p>
                        <p className="text-xs text-muted-foreground">{feedback.rewriteTip}</p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button onClick={() => { setUserAnswer(""); setShowFeedback(false); setShowTip(false); setFeedback(null); setFeedbackError(null); setTimeRemainingSec(timeLimitSec) }}
                    className="btn-outline flex-1">
                    <RotateCcw className="w-4 h-4" /> Try Again
                  </button>
                  <button
                    onClick={saveAnswerToLibrary}
                    disabled={!feedback}
                    className="btn-outline flex-1 disabled:opacity-50"
                  >
                    <ShieldQuestion className="w-4 h-4" />
                    Save to Library
                  </button>
                  <button onClick={nextQuestion} className="btn-saffron flex-1">
                    {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Session'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
          
          {/* Progress */}
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                i < currentQuestion ? 'bg-green-500' : i === currentQuestion ? 'bg-saffron-500' : 'bg-secondary'
              }`} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
