"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Logo, LogoMark } from "@/components/ui/logo"
import { 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  Briefcase, 
  Target, 
  CheckCircle,
  Sparkles,
  FileText,
  Zap
} from "lucide-react"

const steps = [
  {
    id: 1,
    title: "Upload Your Resume",
    description: "Import your existing resume or start fresh. Our AI will analyze it instantly.",
    icon: Upload,
  },
  {
    id: 2,
    title: "Set Your Goals",
    description: "Tell us about your target roles, companies, and salary expectations.",
    icon: Target,
  },
  {
    id: 3,
    title: "Get AI Recommendations",
    description: "Receive personalized suggestions to optimize your job search strategy.",
    icon: Sparkles,
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
  })

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    } else {
      router.push("/app/dashboard")
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const experienceLevels = [
    "Entry Level (0-2 years)",
    "Mid Level (3-5 years)",
    "Senior (6-10 years)",
    "Lead/Manager (10+ years)",
    "Executive",
  ]

  const industryOptions = [
    "Technology", "Finance", "Healthcare", "E-commerce",
    "Education", "Media", "Consulting", "Startup",
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left side - Progress */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden">
        {/* Dynamic background */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900" />
        
        {/* Animated elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-saffron-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-saffron-500/5 rounded-full blur-[80px] animate-pulse delay-1000" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-20" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Logo size="lg" variant="light" />
          
          <div className="space-y-8">
            {/* Progress steps */}
            <div className="space-y-6">
              {steps.map((step, i) => (
                <div key={step.id} className="flex items-start gap-4">
                  <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
                    currentStep > step.id 
                      ? 'bg-saffron-500' 
                      : currentStep === step.id 
                        ? 'bg-saffron-500/20 border-2 border-saffron-500' 
                        : 'bg-white/5 border border-white/10'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="w-5 h-5 text-navy-900" />
                    ) : (
                      <step.icon className={`w-5 h-5 ${
                        currentStep === step.id ? 'text-saffron-400' : 'text-white/40'
                      }`} />
                    )}
                  </div>
                  <div>
                    <div className={`font-medium ${
                      currentStep >= step.id ? 'text-white' : 'text-white/40'
                    }`}>
                      {step.title}
                    </div>
                    <div className={`text-sm ${
                      currentStep >= step.id ? 'text-white/60' : 'text-white/30'
                    }`}>
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/60">
                <span>Progress</span>
                <span>{Math.round((currentStep / steps.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-saffron-500 to-gold-400 transition-all duration-500"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="text-white/40 text-sm">
            Step {currentStep} of {steps.length}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-mesh relative">
        {/* Background orbs */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-saffron-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-navy-500/5 rounded-full blur-[80px]" />
        
        <div className="w-full max-w-lg relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          
          {/* Mobile progress */}
          <div className="lg:hidden mb-8">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Step {currentStep} of {steps.length}</span>
              <span>{Math.round((currentStep / steps.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-saffron-500 to-gold-400 transition-all duration-500"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Upload Resume */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Upload Your Resume</h2>
                <p className="text-muted-foreground">
                  Start with your existing resume and our AI will optimize it for better results.
                </p>
              </div>
              
              <div className="card-interactive p-8 border-2 border-dashed border-border hover:border-saffron-500/50 transition-colors cursor-pointer text-center">
                <div className="w-16 h-16 rounded-2xl bg-saffron-500/10 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-saffron-500" />
                </div>
                <div className="font-medium mb-1">Drop your resume here</div>
                <div className="text-sm text-muted-foreground mb-4">
                  PDF, DOCX, or TXT (max 10MB)
                </div>
                <button className="btn-saffron">
                  <FileText className="w-4 h-4" />
                  Choose File
                </button>
              </div>
              
              <div className="text-center">
                <span className="text-sm text-muted-foreground">or</span>
              </div>
              
              <button className="btn-outline w-full py-4">
                Start from Scratch
              </button>
            </div>
          )}

          {/* Step 2: Set Goals */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Set Your Goals</h2>
                <p className="text-muted-foreground">
                  Help us understand what you&apos;re looking for so we can personalize your experience.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Role</label>
                <input
                  type="text"
                  value={formData.targetRole}
                  onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Senior Product Manager"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Experience Level</label>
                <div className="grid grid-cols-1 gap-2">
                  {experienceLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => setFormData({ ...formData, experience: level })}
                      className={`px-4 py-3 rounded-xl text-sm text-left transition-all ${
                        formData.experience === level
                          ? 'bg-saffron-500/10 border-2 border-saffron-500 text-saffron-600'
                          : 'bg-secondary border-2 border-transparent hover:border-saffron-500/30'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Recommendations */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">You&apos;re All Set!</h2>
                <p className="text-muted-foreground">
                  Based on your profile, here&apos;s what we recommend to get started.
                </p>
              </div>
              
              <div className="space-y-4">
                {[
                  {
                    icon: Zap,
                    title: "Optimize Your Resume",
                    description: "Let AI enhance your resume for ATS systems",
                    color: "saffron"
                  },
                  {
                    icon: Target,
                    title: "Set Up Job Alerts",
                    description: "Get notified about matching opportunities",
                    color: "navy"
                  },
                  {
                    icon: Sparkles,
                    title: "Practice Interviews",
                    description: "Prepare with AI-powered mock interviews",
                    color: "saffron"
                  },
                ].map((item, i) => (
                  <div 
                    key={i}
                    className="card-interactive p-4 flex items-center gap-4"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      item.color === 'saffron' ? 'bg-saffron-500/10' : 'bg-navy-500/10'
                    }`}>
                      <item.icon className={`w-6 h-6 ${
                        item.color === 'saffron' ? 'text-saffron-500' : 'text-navy-600'
                      }`} />
                    </div>
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 rounded-xl bg-saffron-500/10 border border-saffron-500/20">
                <div className="flex items-center gap-2 text-sm text-saffron-600">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">Pro Tip</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Candidates with optimized resumes get 3x more interview callbacks on average.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-8 border-t border-border">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleNext}
              className="btn-saffron"
            >
              {currentStep === steps.length ? "Go to Dashboard" : "Continue"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
