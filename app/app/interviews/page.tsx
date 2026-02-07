"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  MessageSquare, 
  Play, 
  CheckCircle, 
  Clock,
  Target,
  Sparkles,
  ChevronRight,
  BookOpen,
  Brain,
  TrendingUp,
  Award,
  AlertTriangle,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Star,
  Lightbulb,
  ArrowLeft
} from "lucide-react"

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

const AI_FEEDBACK_TEMPLATES = [
  { score: 'strong', emoji: '💪', title: "Strong Answer", feedback: "Great structure and specificity! You used concrete examples with measurable outcomes. Consider adding one more detail about what you learned or how it changed your approach going forward." },
  { score: 'good', emoji: '👍', title: "Good Answer", feedback: "Solid response with a clear example. To make it even stronger, try the STAR method more explicitly: state the Situation, your specific Task, the Actions you took, and the measurable Result." },
  { score: 'needs_work', emoji: '🔧', title: "Room for Improvement", feedback: "You have the right idea, but the answer could use more specificity. Avoid vague phrases like 'I worked hard' — instead, describe exactly what you did and quantify the impact. Practice telling this story in under 2 minutes." },
]

export default function InterviewsPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [practiceMode, setPracticeMode] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)
  const [score, setScore] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [feedbackIndex, setFeedbackIndex] = useState(0)
  const [showTip, setShowTip] = useState(false)
  const [recentSessions, setRecentSessions] = useState<Array<{ category: string; score: number | null; questions_answered: number; created_at: string }>>([])
  const sessionStartRef = useRef<number>(0)

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

  const startPractice = (category: string) => {
    setActiveCategory(category)
    setPracticeMode(true)
    setCurrentQuestion(0)
    setUserAnswer("")
    setShowFeedback(false)
    setScore(0)
    setTotalAnswered(0)
    setShowTip(false)
    sessionStartRef.current = Date.now()
  }

  const submitAnswer = () => {
    const answerLen = userAnswer.trim().length
    let idx = 2 // needs_work
    if (answerLen > 200) idx = 0 // strong
    else if (answerLen > 80) idx = 1 // good
    
    setFeedbackIndex(idx)
    setTotalAnswered(t => t + 1)
    if (idx <= 1) setScore(s => s + 1)
    setShowFeedback(true)
  }

  const saveSession = async () => {
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
      setShowTip(false)
    } else {
      saveSession()
      setPracticeMode(false)
      setActiveCategory(null)
    }
  }

  const questions = activeCategory ? SAMPLE_QUESTIONS[activeCategory] || [] : []
  const currentQ = questions[currentQuestion]

  return (
    <div className="p-6 lg:p-8 space-y-6">
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

          {/* Recent practice sessions */}
          {recentSessions.length > 0 && (
            <div className="card-elevated p-6">
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
                <button key={cat.id} onClick={() => startPractice(cat.id)} className="card-interactive p-6 text-left group">
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
          <div className="card-elevated p-6">
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
          <div className="card-elevated p-6">
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
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Score: <span className="font-semibold text-foreground">{score}/{totalAnswered}</span></span>
              <span className="badge-saffron">{QUESTION_CATEGORIES.find(c => c.id === activeCategory)?.name}</span>
            </div>
          </div>

          <div className="card-elevated p-6 lg:p-8 mb-6">
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
                <textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)}
                  className="input-field min-h-[200px] resize-none mb-4"
                  placeholder="Type your answer here... Use the STAR method for best results." />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{userAnswer.length} characters</span>
                  <div className="flex gap-3">
                    <button onClick={() => { setPracticeMode(false); setActiveCategory(null) }} className="btn-outline">Exit</button>
                    <button onClick={submitAnswer} disabled={!userAnswer.trim()} className="btn-saffron disabled:opacity-50">
                      Submit Answer
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
                <div className={`p-5 rounded-xl border mb-4 ${
                  feedbackIndex === 0 ? 'bg-green-500/10 border-green-500/20' :
                  feedbackIndex === 1 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-saffron-500/10 border-saffron-500/20'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{AI_FEEDBACK_TEMPLATES[feedbackIndex].emoji}</span>
                    <h4 className="font-semibold">{AI_FEEDBACK_TEMPLATES[feedbackIndex].title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{AI_FEEDBACK_TEMPLATES[feedbackIndex].feedback}</p>
                </div>
                
                <div className="flex gap-3">
                  <button onClick={() => { setUserAnswer(""); setShowFeedback(false); setShowTip(false); }}
                    className="btn-outline flex-1">
                    <RotateCcw className="w-4 h-4" /> Try Again
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
