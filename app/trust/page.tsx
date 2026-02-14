"use client"

import Link from "next/link"
import { Logo, LogoMark } from "@/components/ui/logo"
import { 
  ArrowLeft, 
  Shield, 
  Lock, 
  Server, 
  Eye, 
  Key, 
  FileCheck,
  Globe,
  Sparkles,
  CheckCircle,
  Zap
} from "lucide-react"

export default function TrustPage() {
  const securityFeatures = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "All data is encrypted using AES-256 at rest and TLS 1.3 in transit. Your sensitive information is protected at every step.",
      color: "saffron"
    },
    {
      icon: Server,
      title: "Secure Infrastructure",
      description: "Hosted on SOC 2 compliant cloud infrastructure with 99.9% uptime SLA, automatic backups, and disaster recovery.",
      color: "navy"
    },
    {
      icon: Key,
      title: "Access Controls",
      description: "Role-based access control, multi-factor authentication, and session management keep your account secure.",
      color: "saffron"
    },
    {
      icon: Eye,
      title: "Privacy by Design",
      description: "We collect only what's necessary, never sell your data, and give you full control over your information.",
      color: "navy"
    },
    {
      icon: FileCheck,
      title: "Regular Audits",
      description: "Third-party security audits, penetration testing, and vulnerability assessments ensure ongoing protection.",
      color: "saffron"
    },
    {
      icon: Globe,
      title: "Global Compliance",
      description: "GDPR, CCPA, and other privacy regulations are built into our platform from the ground up.",
      color: "navy"
    },
  ]

  const aiSafetyPrinciples = [
    "AI models are trained on ethically sourced data",
    "No AI-generated content is used without your review",
    "Bias detection and mitigation in recommendations",
    "Transparent AI decision-making processes",
    "Human oversight for critical functions",
    "Regular AI model audits and updates",
  ]

  return (
    <div className="min-h-screen min-h-[100dvh] bg-mesh relative">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-navy-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-saffron-500/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-grid opacity-30" />
      </div>

      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container-page py-4 flex items-center justify-between">
          <Logo size="md" />
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/50 to-transparent" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        
        <div className="container-page relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 rounded-2xl bg-navy-500/10 flex items-center justify-center mx-auto mb-8">
              <Shield className="w-10 h-10 text-navy-600" />
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold mb-6">
              Trust & Security
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Your career data is sensitive. We&apos;ve built Climb with security and privacy 
              at its core, so you can focus on your career without worrying about your data.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="badge-navy">
                <Lock className="w-3.5 h-3.5" />
                AES-256 Encryption
              </div>
              <div className="badge-saffron">
                <Shield className="w-3.5 h-3.5" />
                SOC 2 Compliant
              </div>
              <div className="badge-secondary">
                <Globe className="w-3.5 h-3.5" />
                GDPR Ready
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-16 lg:py-20">
        <div className="container-page">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              Enterprise-Grade Security
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We implement industry-leading security measures to protect your data.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {securityFeatures.map((feature, i) => (
              <div key={i} className="card-interactive p-6">
                <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${
                  feature.color === 'saffron' ? 'bg-saffron-500/10' : 'bg-navy-500/10'
                }`}>
                  <feature.icon className={`w-6 h-6 ${
                    feature.color === 'saffron' ? 'text-saffron-500' : 'text-navy-600'
                  }`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Safety */}
      <section className="py-16 lg:py-20">
        <div className="container-page">
          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900" />
              <div className="absolute inset-0 bg-grid opacity-20" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-saffron-500/10 rounded-full blur-[100px]" />
              
              <div className="relative p-8 lg:p-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-saffron-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-saffron-400" />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-white">
                    Responsible AI
                  </h2>
                </div>
                
                <p className="text-white/70 mb-8 max-w-2xl">
                  We believe AI should be transparent, fair, and accountable. Our AI systems 
                  are designed with safety and ethics in mind, ensuring that technology serves 
                  you—not the other way around.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {aiSafetyPrinciples.map((principle, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-saffron-400 shrink-0" />
                      <span className="text-white/80 text-sm">{principle}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Control */}
      <section className="py-16 lg:py-20">
        <div className="container-page">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              You&apos;re in Control
            </h2>
            <p className="text-muted-foreground mb-12">
              We believe you should have full control over your data. Here&apos;s how we make that possible.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { 
                  title: "Export Anytime", 
                  description: "Download all your data in standard formats whenever you want.",
                  icon: FileCheck
                },
                { 
                  title: "Delete Everything", 
                  description: "Permanently delete your account and all associated data.",
                  icon: Zap
                },
                { 
                  title: "Transparency", 
                  description: "See exactly what data we have and how it&apos;s being used.",
                  icon: Eye
                },
              ].map((item, i) => (
                <div key={i} className="card-elevated p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-saffron-500/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-saffron-500" />
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20">
        <div className="container-page">
          <div className="max-w-xl mx-auto text-center">
            <LogoMark size={56} className="mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-4">
              Questions About Security?
            </h2>
            <p className="text-muted-foreground mb-6">
              Our security team is here to help. Reach out to discuss your specific concerns.
            </p>
            <a 
              href="mailto:security@climb.ai" 
              className="btn-saffron"
            >
              Contact Security Team
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container-page flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Climb</p>
        </div>
      </footer>
    </div>
  )
}
