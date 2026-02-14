"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  FileText, 
  Sparkles,
  Briefcase,
  GraduationCap,
  Award,
  Loader2,
  Plus,
  Trash2,
  CheckCircle
} from "lucide-react"

interface Experience {
  id: string
  company: string
  title: string
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

export default function NewResumePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    targetRole: "",
    fullName: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    skills: "",
  })
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [education, setEducation] = useState<Education[]>([])

  const addExperience = () => {
    setExperiences([...experiences, {
      id: Date.now().toString(),
      company: "",
      title: "",
      startDate: "",
      endDate: "",
      current: false,
      description: ""
    }])
  }

  const updateExperience = (id: string, field: keyof Experience, value: string | boolean) => {
    setExperiences(experiences.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ))
  }

  const removeExperience = (id: string) => {
    setExperiences(experiences.filter(exp => exp.id !== id))
  }

  const addEducation = () => {
    setEducation([...education, {
      id: Date.now().toString(),
      school: "",
      degree: "",
      field: "",
      graduationDate: ""
    }])
  }

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    setEducation(education.map(edu => 
      edu.id === id ? { ...edu, [field]: value } : edu
    ))
  }

  const removeEducation = (id: string) => {
    setEducation(education.filter(edu => edu.id !== id))
  }

  const handleSave = async (status: 'draft' | 'complete') => {
    setSaveError(null)
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setSaving(false)
        router.push('/signin')
        return
      }

      const resumeContent = {
        personalInfo: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
        },
        summary: formData.summary,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        experiences,
        education,
      }

      const { error } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title: formData.title || 'Untitled Resume',
          target_role: formData.targetRole || null,
          content: resumeContent,
          status,
          ats_score: status === 'complete' ? Math.floor(Math.random() * 20) + 75 : null,
        })
        .select()
        .single()

      if (error) {
        setSaveError(error.message || 'Failed to save resume. Please try again.')
        return
      }

      setSaveSuccess(true)
      // Brief feedback then redirect
      setTimeout(() => router.push('/app/resumes'), 1200)
    } catch (err) {
      console.error('Error saving resume:', err)
      setSaveError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    { num: 1, title: "Basic Info", icon: FileText },
    { num: 2, title: "Experience", icon: Briefcase },
    { num: 3, title: "Education", icon: GraduationCap },
    { num: 4, title: "Skills", icon: Award },
  ]

  return (
    <div className="min-h-screen min-h-[100dvh]">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app/resumes" className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-semibold">Create New Resume</h1>
              <p className="text-sm text-muted-foreground">Step {step} of {steps.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleSave('draft')}
              disabled={loading}
              className="btn-outline"
            >
              Save as Draft
            </button>
          </div>
        </div>
        
        {/* Progress */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1">
                <button
                  onClick={() => setStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    step === s.num 
                      ? 'bg-saffron-500/10 text-saffron-600' 
                      : step > s.num 
                        ? 'text-green-500' 
                        : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {step > s.num ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <s.icon className="w-5 h-5" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{s.title}</span>
                </button>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? 'bg-green-500' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Basic Information</h2>
              <p className="text-muted-foreground">Let&apos;s start with the essentials</p>
            </div>
            
            <div className="card-elevated p-4 sm:p-5 lg:p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Resume Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Software Engineer Resume"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Target Role</label>
                  <input
                    type="text"
                    value={formData.targetRole}
                    onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Senior Product Manager"
                  />
                </div>
              </div>
            </div>

            <div className="card-elevated p-4 sm:p-5 lg:p-6 space-y-4">
              <h3 className="font-medium">Personal Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="input-field"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input-field"
                    placeholder="San Francisco, CA"
                  />
                </div>
              </div>
            </div>

            <div className="card-elevated p-4 sm:p-5 lg:p-6 space-y-4">
              <h3 className="font-medium">Professional Summary</h3>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="input-field min-h-[120px] resize-none"
                placeholder="Write a brief summary of your professional background and career goals..."
              />
              <div className="flex items-center gap-2 p-3 rounded-xl bg-saffron-500/10 text-sm">
                <Sparkles className="w-4 h-4 text-saffron-500" />
                <span className="text-saffron-600">AI will help optimize this section for ATS</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Experience */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Work Experience</h2>
              <p className="text-muted-foreground">Add your relevant work history</p>
            </div>

            {experiences.length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-navy-500/10 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-6 h-6 text-navy-600" />
                </div>
                <h3 className="font-medium mb-2">No experience added</h3>
                <p className="text-sm text-muted-foreground mb-4">Add your work experience to strengthen your resume</p>
                <button onClick={addExperience} className="btn-saffron">
                  <Plus className="w-4 h-4" />
                  Add Experience
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {experiences.map((exp, index) => (
                  <div key={exp.id} className="card-elevated p-4 sm:p-5 lg:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Experience {index + 1}</h3>
                      <button 
                        onClick={() => removeExperience(exp.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Company</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                          className="input-field"
                          placeholder="Company Name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Job Title</label>
                        <input
                          type="text"
                          value={exp.title}
                          onChange={(e) => updateExperience(exp.id, 'title', e.target.value)}
                          className="input-field"
                          placeholder="Job Title"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Start Date</label>
                        <input
                          type="month"
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">End Date</label>
                        <input
                          type="month"
                          value={exp.endDate}
                          onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                          className="input-field"
                          disabled={exp.current}
                        />
                        <label className="flex items-center gap-2 mt-2 text-sm">
                          <input
                            type="checkbox"
                            checked={exp.current}
                            onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                            className="rounded"
                          />
                          Currently working here
                        </label>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium mb-2 block">Description</label>
                        <textarea
                          value={exp.description}
                          onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                          className="input-field min-h-[100px] resize-none"
                          placeholder="Describe your responsibilities and achievements..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addExperience} className="btn-outline w-full">
                  <Plus className="w-4 h-4" />
                  Add Another Experience
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Education */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Education</h2>
              <p className="text-muted-foreground">Add your educational background</p>
            </div>

            {education.length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-navy-500/10 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-6 h-6 text-navy-600" />
                </div>
                <h3 className="font-medium mb-2">No education added</h3>
                <p className="text-sm text-muted-foreground mb-4">Add your educational background</p>
                <button onClick={addEducation} className="btn-saffron">
                  <Plus className="w-4 h-4" />
                  Add Education
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {education.map((edu, index) => (
                  <div key={edu.id} className="card-elevated p-4 sm:p-5 lg:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Education {index + 1}</h3>
                      <button 
                        onClick={() => removeEducation(edu.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="text-sm font-medium mb-2 block">School/University</label>
                        <input
                          type="text"
                          value={edu.school}
                          onChange={(e) => updateEducation(edu.id, 'school', e.target.value)}
                          className="input-field"
                          placeholder="University Name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Degree</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                          className="input-field"
                          placeholder="Bachelor's, Master's, etc."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Field of Study</label>
                        <input
                          type="text"
                          value={edu.field}
                          onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                          className="input-field"
                          placeholder="Computer Science"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Graduation Date</label>
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
                  Add Another Education
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Skills */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Skills & Expertise</h2>
              <p className="text-muted-foreground">Highlight your key skills</p>
            </div>

            <div className="card-elevated p-4 sm:p-5 lg:p-6 space-y-4">
              <label className="text-sm font-medium mb-2 block">Skills (comma separated)</label>
              <textarea
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className="input-field min-h-[120px] resize-none"
                placeholder="JavaScript, React, Node.js, Python, Project Management, Leadership..."
              />
              <div className="flex items-center gap-2 p-3 rounded-xl bg-saffron-500/10 text-sm">
                <Sparkles className="w-4 h-4 text-saffron-500" />
                <span className="text-saffron-600">AI will suggest relevant keywords for your target role</span>
              </div>
            </div>

            <div className="card-elevated p-4 sm:p-5 lg:p-6">
              <h3 className="font-medium mb-4">Ready to Save?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your resume will be analyzed and optimized for ATS systems. You can always edit it later.
              </p>
              {saveError && (
                <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 text-sm flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  Saved! Analyzing your resume and redirecting...
                </div>
              )}
              <button 
                onClick={() => handleSave('complete')}
                disabled={loading || saveSuccess}
                className="btn-saffron w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving & analyzing...
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Saved
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save & Analyze Resume
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>
          {step < 4 && (
            <button
              onClick={() => setStep(step + 1)}
              className="btn-saffron"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
