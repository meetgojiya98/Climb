import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Mountain, ArrowRight, Check, Target, TrendingUp, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="border-b">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-climb" />
            <span className="text-xl font-semibold">Climb</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing">
              <Button variant="ghost">Pricing</Button>
            </Link>
            <Link href="/signin">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button variant="climb">Start free</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="mx-auto max-w-4xl px-6 py-32 text-center">
          <h1 className="mb-6 text-5xl font-semibold tracking-tight sm:text-6xl">
            Land better roles,
            <br />
            <span className="text-climb">faster.</span>
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground">
            Turn any job post into a tailored application pack in minutes. AI-powered
            resume tailoring, cover letters, and follow-ups that actually get responses.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" variant="climb" className="gap-2">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-semibold">Everything you need</h2>
            <p className="text-muted-foreground">Built for job seekers who want results</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-[20px] border bg-card p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-climb/10 text-climb">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Smart matching</h3>
              <p className="text-muted-foreground">
                AI scores your fit and highlights what matters most for each role.
              </p>
            </div>
            <div className="rounded-[20px] border bg-card p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-climb/10 text-climb">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Instant tailoring</h3>
              <p className="text-muted-foreground">
                Generate customized resumes and cover letters in seconds.
              </p>
            </div>
            <div className="rounded-[20px] border bg-card p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[14px] bg-climb/10 text-climb">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Track progress</h3>
              <p className="text-muted-foreground">
                Follow your application pipeline from draft to offer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
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
