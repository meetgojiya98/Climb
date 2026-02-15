"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Logo } from "@/components/ui/logo"
import { createClient } from "@/lib/supabase/client"
import { ArrowRight, CheckCircle, Eye, EyeOff, Loader2, Lock, Sparkles } from "lucide-react"

const MIN_PASSWORD_LENGTH = 8

function normalizeResetError(message: string) {
  if (/session|token|expired|invalid|flow state/i.test(message)) {
    return "This reset link is invalid or expired. Please request a new one."
  }
  return message
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get("code")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [canReset, setCanReset] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const hasTokenInHash = useMemo(() => {
    if (typeof window === "undefined") return false
    const hash = window.location.hash || ""
    return hash.includes("access_token") || hash.includes("type=recovery")
  }, [])

  useEffect(() => {
    let active = true
    const supabase = createClient()

    const initialize = async () => {
      try {
        setChecking(true)
        setError(null)

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            throw exchangeError
          }
          router.replace("/reset-password")
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!active) return
        setCanReset(Boolean(session) || hasTokenInHash)
      } catch (initError: unknown) {
        if (!active) return
        const message =
          initError instanceof Error
            ? normalizeResetError(initError.message)
            : "Could not validate reset link. Please request a new one."
        setError(message)
        setCanReset(false)
      } finally {
        if (active) {
          setChecking(false)
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setCanReset(Boolean(session))
        setChecking(false)
      }
    })

    void initialize()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [code, hasTokenInHash, router])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })
      if (updateError) throw updateError

      await supabase.auth.signOut()
      setSuccess(true)
    } catch (updateFailure: unknown) {
      const message =
        updateFailure instanceof Error
          ? normalizeResetError(updateFailure.message)
          : "Could not reset password. Please try again."
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
            Secure reset
          </div>
          <h1 className="font-display text-2xl mt-3">Set a new password</h1>
          <p className="text-muted-foreground mt-2">
            Choose a strong password to protect your account.
          </p>
        </div>

        {success ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              Password updated successfully. You can now sign in.
            </div>
            <Link href="/signin" className="btn-saffron w-full justify-center">
              Continue to Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : checking ? (
          <div className="rounded-xl border border-border px-4 py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3" />
            Validating reset link...
          </div>
        ) : !canReset ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error || "This reset link is invalid or expired."}
            </div>
            <Link href="/forgot-password" className="btn-saffron w-full justify-center">
              Request a New Link
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="reset-password" className="text-sm font-medium">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input-field pl-12 pr-12"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="reset-password-confirm" className="text-sm font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="reset-password-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="input-field pl-12 pr-12"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-saffron w-full py-4 text-base disabled:opacity-50">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Updating password...
                </>
              ) : (
                <>
                  Update Password
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
