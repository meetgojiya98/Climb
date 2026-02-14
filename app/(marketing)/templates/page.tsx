import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import {
  ArrowRight,
  Briefcase,
  FileText,
  MessageSquare,
  Sparkles,
  Wand2,
} from 'lucide-react'

const playbooks = [
  {
    title: 'Follow-up Library',
    description: 'Stage-specific outreach templates for applications, interviews, and post-loop cadence.',
    items: ['Application check-in', 'Post-interview thank you', 'Hiring manager follow-up', 'Offer conversation'],
    icon: MessageSquare,
  },
  {
    title: 'Resume Bullet Formulas',
    description: 'Enterprise-quality frameworks for measurable accomplishment writing.',
    items: ['XYZ formula', 'STAR impact rewrite', 'CAR transformation', 'Outcome-first style'],
    icon: FileText,
  },
  {
    title: 'Role Messaging Packs',
    description: 'Targeted value narratives aligned to role family and seniority.',
    items: ['Engineering', 'Product', 'Data', 'Go-to-market'],
    icon: Briefcase,
  },
  {
    title: 'Tone Controls',
    description: 'Precision tone presets for company and stakeholder context.',
    items: ['Executive concise', 'Warm and credible', 'Analytical technical', 'Confident neutral'],
    icon: Wand2,
  },
]

export default function TemplatesPage() {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-mesh">
      <header className="border-b sticky top-0 z-40 bg-background/90 backdrop-blur-xl">
        <nav className="container-page py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="shrink-0">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/pricing" className="btn-outline text-sm">Pricing</Link>
            <Link href="/signin" className="btn-saffron text-sm">
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      <section className="container-page py-12 sm:py-16 lg:py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-saffron-500/10 text-saffron-700 px-3 py-1.5 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Enterprise template system
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Reusable playbooks for high-conversion applications.
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
            Standardize quality with proven writing systems for resume bullets, follow-ups, and role-specific messaging.
          </p>
        </div>
      </section>

      <section className="container-page pb-12 sm:pb-16 lg:pb-20">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {playbooks.map((playbook) => (
            <article key={playbook.title} className="card-interactive p-5 sm:p-6 lg:p-7">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-saffron-500/10 text-saffron-700">
                <playbook.icon className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{playbook.title}</h2>
              <p className="text-sm text-muted-foreground mb-4">{playbook.description}</p>
              <ul className="space-y-2 text-sm">
                {playbook.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-saffron-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="container-page pb-12 sm:pb-16 lg:pb-24">
        <div className="card-elevated p-5 sm:p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold mb-1">Use these templates inside your workflow</h2>
            <p className="text-muted-foreground text-sm sm:text-base">Generate, adapt, and operationalize playbooks directly in role workspaces.</p>
          </div>
          <Link href="/signup" className="btn-saffron whitespace-nowrap">
            Get access to all templates
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
