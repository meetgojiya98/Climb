"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Sparkles,
  Loader2,
  CheckCircle,
  User,
  Briefcase,
  GraduationCap,
  Wrench
} from "lucide-react"

interface Experience {
  id: string
  title: string
  company: string
  startDate: string
  endDate: string
  current: boolean
  description: string
}

interface Education {
  id: string
  school: string
  degree: string
  field: string
  graduationDate: string
}

export default function ResumeEditPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState('personal')
  
  // Form state
  const [title, setTitle] = useState("")
  const [targetRole, setTargetRole] = useState("")
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: ""
  })
  const [summary, setSummary] = useState("")
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [education, setEducation] = useState<Education[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState("")

  useEffect(() => {
    fetchResume()
  }, [params.id])

  const fetchResume = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      
      setTitle(data.title || "")
      setTargetRole(data.target_role || "")
      
      if (data.content) {
        setPersonalInfo(data.content.personalInfo || {
          fullName: "",
          email: "",
          phone: "",
          location: "",
          linkedin: "",
          portfolio: ""
        })
        setSummary(data.content.summary || "")
        setExperiences(data.content.experiences || [])
        setEducation(data.content.education || [])
        setSkills(data.content.skills || [])
      }
    } catch (error) {
      console.error('Error fetching resume:', error)
      router.push('/app/resumes')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const content = {
        personalInfo,
        summary,
        experiences,
        education,
        skills
      }
      
      const { error } = await supabase
        .from('resumes')
        .update({
          title,
          target_role: targetRole,
          content,
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (error) throw error
      
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving resume:', error)
    } finally {
      setSaving(false)
    }
  }

  const addExperience = () => {
    setExperiences([...experiences, {
      id: crypto.randomUUID(),
      title: "",
      company: "",
      startDate: "",
      endDate: "",
      current: false,
      description: ""
    }])
  }

  const updateExperience = (id: string, field: string, value: any) => {
    setExperiences(experiences.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ))
  }

  const removeExperience = (id: string) => {
    setExperiences(experiences.filter(exp => exp.id !== id))
  }

  const addEducation = () => {
    setEducation([...education, {
      id: crypto.randomUUID(),
      school: "",
      degree: "",
      field: "",
      graduationDate: ""
    }])
  }

  const updateEducation = (id: string, field: string, value: string) => {
    setEducation(education.map(edu => 
      edu.id === id ? { ...edu, [field]: value } : edu
    ))
  }

  const removeEducation = (id: string) => {
    setEducation(education.filter(edu => edu.id !== id))
  }

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill("")
    }
  }

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill))
  }

  const generateAISummary = () => {
    // Simulate AI generation
    const jobTitle = targetRole || experiences[0]?.title || "professional"
    setSummary(`Results-driven ${jobTitle} with proven expertise in delivering high-impact solutions. Adept at collaborating with cross-functional teams to drive organizational success. Committed to continuous learning and leveraging innovative approaches to exceed objectives.`)
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
      </div>
    )
  }

  const sections = [
    { id: 'personal', name: 'Personal Info', icon: User },
    { id: 'experience', name: 'Experience', icon: Briefcase },
    { id: 'education', name: 'Education', icon: GraduationCap },
    { id: 'skills', name: 'Skills', icon: Wrench },
  ]

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href={`/app/resumes/${params.id}`} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resume Title"
              className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 w-full"
            />
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Target Role (e.g., Software Engineer)"
              className="text-muted-foreground bg-transparent border-none focus:outline-none focus:ring-0 w-full text-sm"
            />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-saffron">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Section Nav */}
        <div className="lg:col-span-1">
          <nav className="card-elevated p-2 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-saffron-500/10 text-saffron-600'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <section.icon className="w-4 h-4" />
                {section.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Form Content */}
        <div className="lg:col-span-3">
          {/* Personal Info */}
          {activeSection === 'personal' && (
            <div className="card-elevated p-6 space-y-6">
              <h3 className="font-semibold text-lg">Personal Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={personalInfo.fullName}
                    onChange={(e) => setPersonalInfo({...personalInfo, fullName: e.target.value})}
                    className="input-field"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({...personalInfo, email: e.target.value})}
                    className="input-field"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({...personalInfo, phone: e.target.value})}
                    className="input-field"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    value={personalInfo.location}
                    onChange={(e) => setPersonalInfo({...personalInfo, location: e.target.value})}
                    className="input-field"
                    placeholder="New York, NY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">LinkedIn</label>
                  <input
                    type="url"
                    value={personalInfo.linkedin}
                    onChange={(e) => setPersonalInfo({...personalInfo, linkedin: e.target.value})}
                    className="input-field"
                    placeholder="linkedin.com/in/johndoe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Portfolio</label>
                  <input
                    type="url"
                    value={personalInfo.portfolio}
                    onChange={(e) => setPersonalInfo({...personalInfo, portfolio: e.target.value})}
                    className="input-field"
                    placeholder="johndoe.com"
                  />
                </div>
              </div>
              
              {/* Summary */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">Professional Summary</label>
                  <button onClick={generateAISummary} className="text-xs text-saffron-500 hover:text-saffron-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Generate with AI
                  </button>
                </div>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="input-field min-h-[120px]"
                  placeholder="A brief summary of your professional background and career goals..."
                />
              </div>
            </div>
          )}

          {/* Experience */}
          {activeSection === 'experience' && (
            <div className="space-y-4">
              {experiences.map((exp, index) => (
                <div key={exp.id} className="card-elevated p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Experience {index + 1}</h4>
                    <button onClick={() => removeExperience(exp.id)} className="p-1 text-muted-foreground hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Job Title</label>
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) => updateExperience(exp.id, 'title', e.target.value)}
                        className="input-field"
                        placeholder="Software Engineer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Company</label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                        className="input-field"
                        placeholder="Tech Company Inc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Date</label>
                      <input
                        type="month"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">End Date</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="month"
                          value={exp.endDate}
                          onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                          className="input-field flex-1"
                          disabled={exp.current}
                        />
                        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={exp.current}
                            onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                            className="rounded border-border"
                          />
                          Current
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={exp.description}
                      onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                      className="input-field min-h-[100px]"
                      placeholder="Describe your responsibilities and achievements..."
                    />
                  </div>
                </div>
              ))}
              <button onClick={addExperience} className="btn-outline w-full">
                <Plus className="w-4 h-4" />
                Add Experience
              </button>
            </div>
          )}

          {/* Education */}
          {activeSection === 'education' && (
            <div className="space-y-4">
              {education.map((edu, index) => (
                <div key={edu.id} className="card-elevated p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Education {index + 1}</h4>
                    <button onClick={() => removeEducation(edu.id)} className="p-1 text-muted-foreground hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">School</label>
                      <input
                        type="text"
                        value={edu.school}
                        onChange={(e) => updateEducation(edu.id, 'school', e.target.value)}
                        className="input-field"
                        placeholder="University Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Degree</label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                        className="input-field"
                        placeholder="Bachelor's"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Field of Study</label>
                      <input
                        type="text"
                        value={edu.field}
                        onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                        className="input-field"
                        placeholder="Computer Science"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Graduation Date</label>
                      <input
                        type="month"
                        value={edu.graduationDate}
                        onChange={(e) => updateEducation(edu.id, 'graduationDate', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addEducation} className="btn-outline w-full">
                <Plus className="w-4 h-4" />
                Add Education
              </button>
            </div>
          )}

          {/* Skills */}
          {activeSection === 'skills' && (
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-lg mb-4">Skills</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {skills.map((skill, i) => (
                  <span 
                    key={i} 
                    className="px-3 py-1.5 rounded-full text-sm bg-secondary flex items-center gap-2"
                  >
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="text-muted-foreground hover:text-red-500">
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="input-field flex-1"
                  placeholder="Add a skill (e.g., JavaScript, Project Management)"
                />
                <button onClick={addSkill} className="btn-outline">
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-medium mb-3">Suggested Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git', 'Agile', 'Communication', 'Leadership', 'Problem Solving']
                    .filter(s => !skills.includes(s))
                    .map((skill, i) => (
                      <button
                        key={i}
                        onClick={() => setSkills([...skills, skill])}
                        className="px-3 py-1.5 rounded-full text-sm border border-dashed border-border hover:border-saffron-500 hover:bg-saffron-500/5 transition-colors"
                      >
                        + {skill}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
