"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { createClient } from "@/lib/supabase/client"
import { ArrowRight, Loader2, Mail, Sparkles } from "lucide-react"

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const resetRedirect = useMemo(() => {
    if (typeof window !== "undefined") return `${window.location.origin}/reset-password`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    return appUrl ? `${trimTrailingSlash(appUrl)}/reset-password` : "/reset-password"
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetRedirect,
      })
      if (resetError) throw resetError
      setSuccess(true)
    } catch (submissionError: unknown) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Could not send reset email. Please try again."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 sm:p-8 bg-mesh relative">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-saffron-500/14 rounded-full blur-[110px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold-500/14 rounded-full blur-[90px]" />

      <div className="w-full max-w-md card-elevated p-6 sm:p-8 bg-background/90 relative z-10">
        <div className="flex justify-center mb-7">
          <Logo size="lg" />
        </div>

        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-saffron-500" />
            Account recovery
          </div>
          <h1 className="font-display text-2xl mt-3">Forgot your password?</h1>
          <p className="text-muted-foreground mt-2">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {success ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
              If this email is registered, a reset link has been sent.
            </div>
            <p className="text-sm text-muted-foreground">
              Check your inbox and spam folder, then open the link to set a new password.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/signin" className="btn-saffron flex-1 justify-center">
                Back to Sign In
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="btn-outline flex-1 justify-center"
              >
                Send again
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="forgot-email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input-field pl-12"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-saffron w-full py-4 text-base disabled:opacity-50">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending reset email...
                </>
              ) : (
                <>
                  Send Reset Link
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Remembered your password?{" "}
              <Link href="/signin" className="text-saffron-500 hover:text-saffron-600 font-medium">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
