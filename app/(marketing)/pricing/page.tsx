"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, Mountain, Menu, X } from 'lucide-react'

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-climb" />
            <span className="text-xl font-semibold">Climb</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 md:gap-4">
            <Link href="/how-it-works">
              <Button variant="ghost" className="min-h-[44px]">How it works</Button>
            </Link>
            <Link href="/signin">
              <Button variant="ghost" className="min-h-[44px]">Sign in</Button>
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
            <Link href="/how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
              How it works
            </Link>
            <Link href="/signin" onClick={() => setMobileMenuOpen(false)} className="py-3 px-2 text-sm font-medium hover:bg-muted rounded-lg">
              Sign in
            </Link>
          </div>
        )}
      </header>

      <section className="py-12 sm:py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-10 sm:mb-16 text-center">
            <h1 className="mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl font-semibold">Simple, transparent pricing</h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Start free. Upgrade when you're ready to scale your job search.
            </p>
          </div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-[20px] border bg-card p-6 sm:p-8">
              <h2 className="mb-2 text-2xl font-semibold">Free</h2>
              <p className="mb-4 text-muted-foreground">Perfect for getting started</p>
              <div className="mb-6">
                <span className="text-4xl font-semibold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <Link href="/signup">
                <Button className="mb-6 w-full" variant="outline">Get started</Button>
              </Link>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>3 roles per month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>1 tailored resume version per role</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>Cover letter generation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>Basic follow-up templates</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>PDF export</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>Pipeline tracking</span>
                </li>
              </ul>
            </div>

            {/* Pro */}
            <div className="relative rounded-[20px] border-2 border-climb bg-card p-6 sm:p-8">
              <div className="absolute -top-3 right-6 rounded-full bg-climb px-3 py-1 text-xs font-semibold text-climb-foreground">
                Popular
              </div>
              <h2 className="mb-2 text-2xl font-semibold">Pro</h2>
              <p className="mb-4 text-muted-foreground">For serious job seekers</p>
              <div className="mb-6">
                <span className="text-4xl font-semibold">$9</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <Link href="/signup">
                <Button className="mb-6 w-full" variant="climb">Start free trial</Button>
              </Link>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span className="font-medium">Everything in Free, plus:</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>Unlimited roles</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>Unlimited tailored versions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>Version history</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>Premium templates</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>Advanced tone presets</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>DOCX export</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-climb" />
                  <span>Insights dashboard</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
