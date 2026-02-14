"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Logo } from "@/components/ui/logo"
import { createClient } from "@/lib/supabase/client"
import { trackEvent } from "@/lib/telemetry-client"
import { Eye, EyeOff, ArrowRight, Loader2, Mail, Lock, Sparkles } from "lucide-react"

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) throw error
      const requestedPath = searchParams.get("next")
      const redirectPath =
        requestedPath && requestedPath.startsWith("/app")
          ? requestedPath
          : "/app/dashboard"
      void trackEvent({
        event: "signin_success",
        category: "funnel",
        metadata: { redirectPath },
      })
      router.push(redirectPath)
      router.refresh()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in"
      setError(errorMessage)
      void trackEvent({
        event: "signin_failure",
        category: "security",
        metadata: { error: errorMessage },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Dynamic background */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950" />
        
        {/* Animated elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-saffron-500/14 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold-500/12 rounded-full blur-[80px] animate-pulse delay-1000" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-20" />
        
        {/* Floating shapes */}
        <div className="absolute top-20 right-20 w-20 h-20 border border-white/10 rounded-2xl rotate-12 float" />
        <div className="absolute bottom-32 left-20 w-16 h-16 border border-saffron-500/20 rounded-xl -rotate-12 float-delayed" />
        <div className="absolute top-1/2 right-1/3 w-12 h-12 bg-saffron-500/10 rounded-lg rotate-45 float" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Logo size="lg" variant="light" />
          
          <div className="space-y-8">
            <div>
              <h1 className="font-display text-4xl tracking-[-0.03em] text-white mb-4">
                Go back to your
                <br />
                <span className="gradient-text">job search workspace.</span>
              </h1>
              <p className="text-white/60 text-lg max-w-md">
                Use AI help, track progress, and plan your next steps in one place.
              </p>
            </div>
            
            {/* Feature highlights */}
            <div className="space-y-4">
              {[
                "Quick access to your role workspaces",
                "One view for progress and risk",
                "AI help for interviews and writing",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-white/80">
                  <div className="w-6 h-6 rounded-full bg-saffron-500/20 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-saffron-400" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-white/40 text-sm">
            Built for focused job seekers
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-mesh">
        <div className="w-full max-w-md card-elevated p-5 sm:p-7 bg-background/88">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl mb-2">Sign in to Climb</h2>
            <p className="text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-saffron-500 hover:text-saffron-600 font-medium">
                Sign up free
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-destructive">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="signin-email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="signin-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field pl-12"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="signin-password" className="text-sm font-medium">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm text-saffron-500 hover:text-saffron-600">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field pl-12 pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-saffron w-full py-4 text-base disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
          
          {/* Footer links */}
          <div className="mt-8 pt-8 border-t border-border">
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/legal/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/trust" className="hover:text-foreground transition-colors">
                Security
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
