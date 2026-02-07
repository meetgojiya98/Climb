"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Mountain, ArrowRight, Target, TrendingUp, Zap, Menu, X } from 'lucide-react'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-climb" />
            <span className="text-xl font-semibold">Climb</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 md:gap-4">
            <Link href="/pricing">
              <Button variant="ghost" className="min-h-[44px]">Pricing</Button>
            </Link>
            <Link href="/signin">
              <Button variant="ghost" className="min-h-[44px]">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button variant="climb" className="min-h-[44px]">Start free</Button>
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2.5 rounded-lg hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
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
              Sign in
            </Link>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="climb" className="w-full min-h-[44px]">Start free</Button>
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 md:py-32 text-center">
          <h1 className="mb-4 sm:mb-6 text-3xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Land better roles,
            <br />
            <span className="text-climb">faster.</span>
          </h1>
          <p className="mx-auto mb-8 sm:mb-12 max-w-2xl text-base sm:text-lg text-muted-foreground px-2">
            Turn any job post into a tailored application pack in minutes. AI-powered
            resume tailoring, cover letters, and follow-ups that actually get responses.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" variant="climb" className="gap-2 w-full sm:w-auto min-h-[48px]">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t py-12 sm:py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 sm:mb-16 text-center">
            <h2 className="mb-2 sm:mb-4 text-2xl sm:text-3xl font-semibold">Everything you need</h2>
            <p className="text-muted-foreground text-sm sm:text-base">Built for job seekers who want results</p>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            <div className="rounded-[20px] border bg-card p-6 sm:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-climb/10 text-climb">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg sm:text-xl font-semibold">Smart matching</h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                AI scores your fit and highlights what matters most for each role.
              </p>
            </div>
            <div className="rounded-[20px] border bg-card p-6 sm:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-climb/10 text-climb">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg sm:text-xl font-semibold">Instant tailoring</h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                Generate customized resumes and cover letters in seconds.
              </p>
            </div>
            <div className="rounded-[20px] border bg-card p-6 sm:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-climb/10 text-climb">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg sm:text-xl font-semibold">Track progress</h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                Follow your application pipeline from draft to offer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Mountain className="h-5 w-5 text-climb" />
            <span className="font-semibold">Climb</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Climb. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
