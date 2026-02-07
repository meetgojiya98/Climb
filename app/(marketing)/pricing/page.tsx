import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, Mountain } from 'lucide-react'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-climb" />
            <span className="text-xl font-semibold">Climb</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/how-it-works">
              <Button variant="ghost">How it works</Button>
            </Link>
            <Link href="/signin">
              <Button variant="ghost">Sign in</Button>
            </Link>
          </div>
        </nav>
      </header>

      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <h1 className="mb-4 text-4xl font-semibold">Simple, transparent pricing</h1>
            <p className="text-lg text-muted-foreground">
              Start free. Upgrade when you're ready to scale your job search.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Free */}
            <div className="rounded-[20px] border bg-card p-8">
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
            <div className="relative rounded-[20px] border-2 border-climb bg-card p-8">
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
