"use client"

import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react"

export default function PrivacyPage() {
  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: [
        "Account information (name, email, password)",
        "Profile data (work history, skills, career goals)",
        "Resume content and documents you upload",
        "Usage data (how you interact with our platform)",
        "Device information (browser type, IP address)",
      ]
    },
    {
      icon: Eye,
      title: "How We Use Your Information",
      content: [
        "To provide and improve our AI-powered career services",
        "To personalize your experience and recommendations",
        "To communicate with you about your account and updates",
        "To analyze and improve our platform's performance",
        "To ensure security and prevent fraud",
      ]
    },
    {
      icon: Lock,
      title: "Data Security",
      content: [
        "All data is encrypted in transit using TLS 1.3",
        "Sensitive data is encrypted at rest using AES-256",
        "We implement strict access controls and monitoring",
        "Regular security audits and penetration testing",
        "SOC 2 Type II compliance (in progress)",
      ]
    },
    {
      icon: UserCheck,
      title: "Your Rights",
      content: [
        "Access: Request a copy of your personal data",
        "Correction: Update or correct your information",
        "Deletion: Request deletion of your data",
        "Portability: Export your data in a standard format",
        "Objection: Opt out of certain data processing",
      ]
    },
  ]

  return (
    <div className="min-h-screen bg-mesh relative">
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

      {/* Content */}
      <main className="container-page py-12 lg:py-20">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-navy-500/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-navy-600" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">
              Last updated: January 2024
            </p>
          </div>

          {/* Introduction */}
          <div className="card-elevated p-6 lg:p-8 mb-8">
            <p className="text-muted-foreground leading-relaxed">
              At Climb, we take your privacy seriously. This Privacy Policy explains how we collect, 
              use, disclose, and safeguard your information when you use our AI-powered career 
              platform. Please read this policy carefully to understand our practices regarding 
              your personal data.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map((section, i) => (
              <div key={i} className="card-elevated p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-saffron-500/10 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-saffron-500" />
                  </div>
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                </div>
                <ul className="space-y-3">
                  {section.content.map((item, j) => (
                    <li key={j} className="flex items-start gap-3 text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-saffron-500 mt-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* AI Processing Notice */}
          <div className="mt-8 p-6 lg:p-8 rounded-2xl bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-saffron-500/20 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-xl font-semibold text-white mb-3">AI Processing Disclosure</h2>
              <p className="text-white/70 leading-relaxed">
                Climb uses artificial intelligence to analyze your resume, provide career recommendations, 
                and help optimize your job search. Your data is processed by our AI systems to deliver 
                personalized insights. We do not sell your personal information to third parties. 
                AI-generated content is clearly labeled, and you always retain control over your data.
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="mt-8 card-elevated p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-navy-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-navy-600" />
              </div>
              <h2 className="text-xl font-semibold">Contact Us</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              If you have any questions about this Privacy Policy or our data practices, 
              please contact us:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p>Email: <a href="mailto:privacy@climb.ai" className="text-saffron-500 hover:text-saffron-600">privacy@climb.ai</a></p>
              <p>Address: 123 Career Street, San Francisco, CA 94105</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container-page flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/trust" className="hover:text-foreground transition-colors">Security</Link>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Climb</p>
        </div>
      </footer>
    </div>
  )
}
