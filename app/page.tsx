"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo, LogoMark } from "@/components/ui/logo"
import {
  ArrowRight,
  Target,
  TrendingUp,
  Zap,
  FileText,
  CheckCircle,
  ChevronRight,
  Sparkles,
  Shield,
  Clock,
  Users,
  Menu,
  X,
} from "lucide-react"

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  return (
    <div className="min-h-screen min-h-[100dvh] bg-background overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-navy-900/20 rounded-full blur-[120px] animate-float" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-saffron-500/10 rounded-full blur-[100px] float-delayed" />
        <div className="absolute bottom-0 left-1/3 w-[700px] h-[700px] bg-navy-800/10 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background via-background to-transparent" />
      </div>

      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container-page py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="shrink-0">
            <Logo size="md" />
          </Link>
          <div className="hidden sm:flex items-center gap-2 md:gap-4">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
              Pricing
            </Link>
            <Link href="/signin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2 min-h-[44px] flex items-center">
              Sign In
            </Link>
            <Link href="/signup" className="btn-saffron text-sm min-h-[44px] flex items-center">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2.5 rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {mobileMenuOpen && (
          <div className="sm:hidden border-t px-4 py-4 flex flex-col gap-1 bg-background">
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
              Pricing
            </Link>
            <Link href="/signin" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
              Sign In
            </Link>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="block">
              <Button variant="default" className="w-full min-h-[44px] bg-climb text-climb-foreground hover:opacity-90">Get Started Free</Button>
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative pt-16 sm:pt-24 md:pt-32 pb-12 sm:pb-20 lg:pt-40 lg:pb-32">
        <div className="container-page">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 badge-navy mb-4 sm:mb-8 text-xs sm:text-sm">
              <Sparkles className="w-3.5 h-3.5 text-saffron-400" />
              <span>AI-Powered Career Acceleration</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-4 sm:mb-6">
              Land Better Roles,
              <br />
              <span className="gradient-text">Faster.</span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
              Climb uses AI to optimize your resume for ATS systems, prepare you for interviews,
              and track your applications—all in one beautiful platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-16">
              <Link href="/signup" className="btn-saffron text-base px-6 sm:px-8 py-3 sm:py-4 pulse-glow w-full sm:w-auto min-h-[48px] flex items-center justify-center">
                Start Free Today
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/signin" className="btn-outline text-base px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto min-h-[48px] flex items-center justify-center">
                Sign In to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>100% Free</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>AI-Powered</span>
              </div>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="relative mt-10 sm:mt-16 lg:mt-20">
            <div className="absolute inset-0 bg-gradient-to-b from-saffron-500/20 via-transparent to-transparent blur-3xl -z-10" />
            <div className="relative mx-auto max-w-5xl">
              <div className="glass-navy rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl overflow-x-auto">
                <div className="bg-navy-900 rounded-xl sm:rounded-2xl overflow-hidden min-w-[280px]">
                  <div className="flex items-center gap-2 px-3 sm:px-4 py-3 bg-navy-950/50 border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/60" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/60" />
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/60" />
                    </div>
                    <div className="flex-1 mx-2 sm:mx-4 min-w-0">
                      <div className="bg-navy-800/50 rounded-lg px-3 sm:px-4 py-1.5 text-xs text-center text-white/40 truncate">
                        app.climb.ai
                      </div>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-navy-800/50 rounded-xl p-4 border border-white/5">
                      <div className="text-white/60 text-xs mb-2">Applications</div>
                      <div className="text-2xl font-bold text-white">24</div>
                      <div className="text-xs text-green-400 mt-1">+12 this week</div>
                    </div>
                    <div className="bg-navy-800/50 rounded-xl p-4 border border-white/5">
                      <div className="text-white/60 text-xs mb-2">Interview Rate</div>
                      <div className="text-2xl font-bold text-white">68%</div>
                      <div className="text-xs text-saffron-400 mt-1">Above average</div>
                    </div>
                    <div className="bg-navy-800/50 rounded-xl p-4 border border-white/5">
                      <div className="text-white/60 text-xs mb-2">ATS Score</div>
                      <div className="text-2xl font-bold text-saffron-400">92</div>
                      <div className="text-xs text-green-400 mt-1">Optimized</div>
                    </div>
                    <div className="sm:col-span-2 bg-navy-800/50 rounded-xl p-4 border border-white/5">
                      <div className="text-white/60 text-xs mb-3">Recent Activity</div>
                      <div className="space-y-3">
                        {[
                          { action: "Resume optimized for", company: "Google", time: "2h ago", icon: FileText },
                          { action: "Interview prep for", company: "Meta", time: "1d ago", icon: Target },
                          { action: "Application sent to", company: "Stripe", time: "2d ago", icon: Zap },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <div className="w-8 h-8 rounded-lg bg-saffron-500/20 flex items-center justify-center">
                              <item.icon className="w-4 h-4 text-saffron-400" />
                            </div>
                            <div className="flex-1">
                              <span className="text-white/70">{item.action}</span>
                              <span className="text-white font-medium ml-1">{item.company}</span>
                            </div>
                            <span className="text-white/40 text-xs">{item.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-saffron-500/20 to-saffron-600/10 rounded-xl p-4 border border-saffron-500/20">
                      <div className="text-saffron-400 text-xs mb-2">AI Suggestion</div>
                      <div className="text-white text-sm font-medium">Optimize for Product Manager roles</div>
                      <span className="mt-3 text-xs text-saffron-400 flex items-center gap-1">
                        Apply now <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -left-8 top-1/4 glass rounded-xl p-3 shadow-lg float hidden lg:block">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <div className="text-xs font-medium">ATS Optimized</div>
                    <div className="text-xs text-muted-foreground">Score: 92/100</div>
                  </div>
                </div>
              </div>
              <div className="absolute -right-8 top-1/3 glass rounded-xl p-3 shadow-lg float-delayed hidden lg:block">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-saffron-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-saffron-500" />
                  </div>
                  <div>
                    <div className="text-xs font-medium">Interview Rate</div>
                    <div className="text-xs text-muted-foreground">↑ 45% this month</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 sm:py-16 lg:py-32 relative">
        <div className="container-page">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <div className="badge-saffron mb-3 sm:mb-4 text-xs">
              <Zap className="w-3.5 h-3.5" />
              <span>Powerful Features</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
              Everything You Need to
              <br />
              <span className="gradient-text">Accelerate Your Career</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground px-2">
              Intelligent tools designed to give you an unfair advantage in your job search.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: FileText, title: "AI Resume Builder", description: "Generate ATS-optimized resumes tailored to specific job descriptions in seconds.", color: "saffron" },
              { icon: Target, title: "Interview Coach", description: "Practice with AI-powered mock interviews and get instant feedback on your responses.", color: "navy" },
              { icon: Zap, title: "Application Tracker", description: "Keep track of every application, deadline, and follow-up in one organized dashboard.", color: "saffron" },
              { icon: Shield, title: "ATS Optimization", description: "Ensure your resume passes through Applicant Tracking Systems with smart keyword matching.", color: "navy" },
              { icon: Clock, title: "Career Roadmap", description: "Get personalized recommendations on skills to develop and roles to target.", color: "saffron" },
              { icon: Users, title: "Network Builder", description: "AI-suggested connections and personalized outreach templates to grow your network.", color: "navy" },
            ].map((feature, i) => (
              <div
                key={i}
                className="card-interactive p-6 group"
              >
                <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                  feature.color === "saffron"
                    ? "bg-saffron-500/10 group-hover:bg-saffron-500/20"
                    : "bg-navy-500/10 group-hover:bg-navy-500/20"
                }`}>
                  <feature.icon className={`w-6 h-6 ${
                    feature.color === "saffron" ? "text-saffron-500" : "text-navy-600"
                  }`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-12 sm:py-16 lg:py-32 relative bg-navy-900">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="container-page relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/80 mb-3 sm:mb-4">
              <span>Simple Process</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 text-white">
              Get Started in <span className="gradient-text">3 Easy Steps</span>
            </h2>
            <p className="text-base sm:text-lg text-white/70 px-2">
              Our AI handles the heavy lifting so you can focus on what matters.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { step: "01", title: "Upload Your Resume", description: "Import your existing resume or start fresh. Our AI analyzes your experience instantly." },
              { step: "02", title: "Get AI Optimization", description: "Receive tailored suggestions, keyword optimization, and ATS-friendly formatting." },
              { step: "03", title: "Apply with Confidence", description: "Track applications, prepare for interviews, and land your dream role faster." },
            ].map((step, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-saffron-500/50 to-transparent -z-10" />
                )}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full">
                  <div className="text-4xl font-bold gradient-text mb-4">{step.step}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-white/70">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 lg:py-32 relative overflow-hidden bg-navy-950">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-saffron-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-saffron-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="container-page relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <LogoMark size={48} className="mx-auto mb-6 sm:mb-8 sm:w-16 sm:h-16" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
              Ready to <span className="gradient-text">Climb Higher?</span>
            </h2>
            <p className="text-base sm:text-lg text-white/70 mb-8 sm:mb-10 max-w-xl mx-auto px-2">
              Join thousands of professionals who are landing better roles faster with AI-powered career tools.
            </p>
            <Link href="/signup" className="btn-saffron text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-5 pulse-glow inline-flex items-center justify-center min-h-[48px] w-full sm:w-auto">
              Get Started — It&apos;s Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-white/50 text-sm mt-4">No credit card required</p>
          </div>
        </div>
      </section>

      <footer className="py-8 sm:py-12 border-t border-border bg-background">
        <div className="container-page">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <Link href="/">
              <Logo size="sm" />
            </Link>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/trust" className="hover:text-foreground transition-colors">Trust & Security</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Climb. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
