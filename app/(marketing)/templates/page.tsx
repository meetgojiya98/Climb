import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Mountain } from 'lucide-react'

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Mountain className="h-6 w-6 text-climb" />
            <span className="text-xl font-semibold">Climb</span>
          </Link>
          <Link href="/signin">
            <Button variant="climb">Sign in</Button>
          </Link>
        </nav>
      </header>

      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <h1 className="mb-4 text-4xl font-semibold">Professional templates</h1>
            <p className="text-lg text-muted-foreground">
              Tested follow-up emails and resume bullet formulas included with every Climb account
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-[20px] border bg-card p-8">
              <h3 className="mb-3 text-xl font-semibold">Follow-up Templates</h3>
              <p className="mb-4 text-muted-foreground">
                Pre-written emails for every stage of your job search
              </p>
              <ul className="space-y-2 text-sm">
                <li>• After application check-in</li>
                <li>• Post-interview thank you</li>
                <li>• Second interview follow-up</li>
                <li>• Offer negotiation</li>
              </ul>
            </div>

            <div className="rounded-[20px] border bg-card p-8">
              <h3 className="mb-3 text-xl font-semibold">Bullet Formulas</h3>
              <p className="mb-4 text-muted-foreground">
                Proven frameworks for resume accomplishments
              </p>
              <ul className="space-y-2 text-sm">
                <li>• XYZ Formula (Google style)</li>
                <li>• STAR Method</li>
                <li>• CAR Framework</li>
                <li>• Impact-First approach</li>
              </ul>
            </div>

            <div className="rounded-[20px] border bg-card p-8">
              <h3 className="mb-3 text-xl font-semibold">Tone Presets</h3>
              <p className="mb-4 text-muted-foreground">
                Match your writing style to company culture
              </p>
              <ul className="space-y-2 text-sm">
                <li>• Professional & polished</li>
                <li>• Warm & personable</li>
                <li>• Confident & assertive</li>
                <li>• Technical & precise</li>
              </ul>
            </div>

            <div className="rounded-[20px] border bg-card p-8">
              <h3 className="mb-3 text-xl font-semibold">Industry Examples</h3>
              <p className="mb-4 text-muted-foreground">
                Tailored templates for your field
              </p>
              <ul className="space-y-2 text-sm">
                <li>• Tech & Engineering</li>
                <li>• Product & Design</li>
                <li>• Sales & Marketing</li>
                <li>• Finance & Consulting</li>
              </ul>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link href="/signup">
              <Button size="lg" variant="climb">Get access to all templates</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
