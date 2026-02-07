"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Target, 
  Plus, 
  CheckCircle, 
  Circle,
  Trash2,
  Pencil,
  Calendar,
  TrendingUp,
  Award,
  Briefcase,
  GraduationCap,
  DollarSign,
  Users,
  Sparkles,
  ChevronRight,
  Flame,
  Trophy,
  Lightbulb
} from "lucide-react"

interface Goal {
  id: string
  title: string
  description: string | null
  category: string
  target_date: string | null
  completed: boolean
  created_at: string
}

const CATEGORIES = [
  { id: 'career', name: 'Career', icon: Briefcase, color: 'saffron', description: 'Role changes, promotions, transitions' },
  { id: 'skills', name: 'Skills', icon: GraduationCap, color: 'purple', description: 'New technologies, certifications, courses' },
  { id: 'salary', name: 'Compensation', icon: DollarSign, color: 'green', description: 'Salary targets, equity, benefits' },
  { id: 'networking', name: 'Networking', icon: Users, color: 'blue', description: 'Connections, mentors, community' },
]

const SUGGESTED_GOALS = [
  { title: "Update resume for target role", category: "career", description: "Tailor resume for my dream position" },
  { title: "Apply to 10 companies this month", category: "career", description: "Reach out to target companies" },
  { title: "Complete 5 mock interviews", category: "skills", description: "Practice behavioral and technical questions" },
  { title: "Learn a new in-demand skill", category: "skills", description: "Pick up something that boosts my value" },
  { title: "Research salary benchmarks", category: "salary", description: "Understand market rate for my role and level" },
  { title: "Connect with 3 people in target industry", category: "networking", description: "Grow professional network strategically" },
]

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ title: "", description: "", category: "career", target_date: "" })

  useEffect(() => { fetchGoals() }, [])

  const fetchGoals = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase.from('career_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      if (error) throw error
      setGoals(data || [])
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }

  const handleSave = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      if (editingId) {
        await supabase.from('career_goals').update({ title: formData.title, description: formData.description || null, category: formData.category, target_date: formData.target_date || null }).eq('id', editingId)
      } else {
        await supabase.from('career_goals').insert({ user_id: user.id, title: formData.title, description: formData.description || null, category: formData.category, target_date: formData.target_date || null, completed: false })
      }
      await fetchGoals(); closeModal()
    } catch (error) { console.error('Error:', error) }
  }

  const handleQuickAdd = async (suggestion: typeof SUGGESTED_GOALS[0]) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('career_goals').insert({ user_id: user.id, title: suggestion.title, description: suggestion.description, category: suggestion.category, completed: false })
      await fetchGoals()
    } catch (error) { console.error('Error:', error) }
  }

  const toggleComplete = async (goal: Goal) => {
    try {
      const supabase = createClient()
      await supabase.from('career_goals').update({ completed: !goal.completed }).eq('id', goal.id)
      setGoals(goals.map(g => g.id === goal.id ? { ...g, completed: !g.completed } : g))
    } catch (error) { console.error('Error:', error) }
  }

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient()
      await supabase.from('career_goals').delete().eq('id', id)
      setGoals(goals.filter(g => g.id !== id))
    } catch (error) { console.error('Error:', error) }
  }

  const openEditModal = (goal: Goal) => {
    setFormData({ title: goal.title, description: goal.description || "", category: goal.category, target_date: goal.target_date || "" })
    setEditingId(goal.id); setShowAddModal(true)
  }

  const closeModal = () => { setShowAddModal(false); setEditingId(null); setFormData({ title: "", description: "", category: "career", target_date: "" }) }

  const completedGoals = goals.filter(g => g.completed).length
  const totalGoals = goals.length
  const progress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0

  const getCatColor = (color: string) => ({
    saffron: { bg: 'bg-saffron-500/10', text: 'text-saffron-500', hover: 'hover:bg-saffron-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', hover: 'hover:bg-purple-500/20' },
    green: { bg: 'bg-green-500/10', text: 'text-green-500', hover: 'hover:bg-green-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', hover: 'hover:bg-blue-500/20' },
  }[color] || { bg: 'bg-secondary', text: 'text-muted-foreground', hover: '' })

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Career Goals</h1>
          <p className="text-muted-foreground">Define objectives, track milestones, and stay focused</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-saffron"><Plus className="w-4 h-4" /> Add Goal</button>
      </div>

      {/* Progress + Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold mb-1">Overall Progress</h2>
              <p className="text-sm text-muted-foreground">{completedGoals} of {totalGoals} goals completed</p>
            </div>
            <div className="text-3xl font-bold">{progress}%</div>
          </div>
          <div className="h-4 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-saffron-500 to-gold-400 transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          {totalGoals > 0 && progress === 100 && (
            <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-green-500/10 text-green-600">
              <Trophy className="w-5 h-5" />
              <span className="font-medium">All goals achieved! Time to set new ones.</span>
            </div>
          )}
        </div>
        <div className="card-elevated p-6 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-saffron-500">{goals.filter(g => !g.completed).length}</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{completedGoals}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>
          {totalGoals > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Flame className="w-4 h-4 text-saffron-500" />
                <span>{completedGoals > 0 ? "Keep the momentum going!" : "Complete your first goal!"}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Goals (only if user has few) */}
      {goals.length < 3 && (
        <div className="card-elevated p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-saffron-500/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-saffron-500" />
            </div>
            <div>
              <h2 className="font-semibold">Suggested Goals</h2>
              <p className="text-sm text-muted-foreground">Quick-add popular career goals</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SUGGESTED_GOALS.map((sg, i) => {
              const cat = CATEGORIES.find(c => c.id === sg.category)
              const colors = getCatColor(cat?.color || 'saffron')
              return (
                <button key={i} onClick={() => handleQuickAdd(sg)}
                  className={`p-4 rounded-xl border border-border text-left ${colors.hover} transition-all group`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium mb-1">{sg.title}</h4>
                      <p className="text-xs text-muted-foreground">{sg.description}</p>
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground group-hover:text-saffron-500 shrink-0 mt-0.5 transition-colors" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Goals by Category */}
      {loading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="card-elevated p-6 animate-pulse"><div className="h-5 bg-secondary rounded w-1/3 mb-3" /><div className="h-4 bg-secondary rounded w-full" /></div>)}</div>
      ) : goals.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-saffron-500/10 flex items-center justify-center mx-auto mb-6">
            <Target className="w-10 h-10 text-saffron-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Set Your First Goal</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Career goals keep you focused and motivated. Define what you want to achieve and track your progress.
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn-saffron text-base px-6 py-3">
            <Plus className="w-5 h-5" /> Set Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map((category) => {
            const categoryGoals = goals.filter(g => g.category === category.id)
            if (categoryGoals.length === 0) return null
            const colors = getCatColor(category.color)
            const catCompleted = categoryGoals.filter(g => g.completed).length
            return (
              <div key={category.id}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                      <category.icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                    <h2 className="font-semibold">{category.name}</h2>
                    <span className="text-sm text-muted-foreground">({catCompleted}/{categoryGoals.length})</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {categoryGoals.map((goal) => (
                    <div key={goal.id} className={`card-interactive p-4 flex items-start gap-4 ${goal.completed ? 'opacity-60' : ''}`}>
                      <button onClick={() => toggleComplete(goal)}
                        className={`shrink-0 mt-0.5 transition-colors ${goal.completed ? 'text-green-500' : 'text-muted-foreground hover:text-saffron-500'}`}>
                        {goal.completed ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium ${goal.completed ? 'line-through' : ''}`}>{goal.title}</h3>
                        {goal.description && <p className="text-sm text-muted-foreground mt-0.5">{goal.description}</p>}
                        {goal.target_date && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                            {new Date(goal.target_date) < new Date() && !goal.completed && (
                              <span className="text-red-500 ml-2">Overdue</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditModal(goal)} className="p-2 rounded-lg hover:bg-secondary transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(goal.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-background rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-semibold mb-6">{editingId ? 'Edit Goal' : 'Add New Goal'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Goal *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input-field" placeholder="e.g., Get promoted to Senior Engineer" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field min-h-[80px] resize-none" placeholder="Add details..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="input-field">
                    {CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Target Date</label>
                  <input type="date" value={formData.target_date} onChange={(e) => setFormData({ ...formData, target_date: e.target.value })} className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 btn-outline">Cancel</button>
              <button onClick={handleSave} disabled={!formData.title} className="flex-1 btn-saffron disabled:opacity-50">{editingId ? 'Save' : 'Add Goal'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
