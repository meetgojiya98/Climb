"use client"

import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { ArrowLeft, FileText, AlertCircle, Scale, Shield, Sparkles, Ban } from "lucide-react"

export default function TermsPage() {
  const sections = [
    {
      icon: FileText,
      title: "Service Description",
      content: `Climb provides an AI-powered career platform that includes resume optimization, 
        job application tracking, interview preparation, and career recommendations. Our services 
        are designed to help professionals advance their careers through intelligent automation 
        and personalized guidance.`
    },
    {
      icon: Shield,
      title: "Account Responsibilities",
      content: `You are responsible for maintaining the confidentiality of your account credentials 
        and for all activities that occur under your account. You must provide accurate information 
        and keep it updated. You must be at least 18 years old to use our services.`
    },
    {
      icon: Sparkles,
      title: "AI-Generated Content",
      content: `Our AI systems generate suggestions, optimizations, and recommendations based on 
        your input and data. While we strive for accuracy, AI-generated content should be reviewed 
        before use. You are responsible for verifying and editing any AI-generated content. Climb 
        does not guarantee specific outcomes from using our AI tools.`
    },
    {
      icon: Ban,
      title: "Prohibited Activities",
      content: `You may not: (a) use our services for any unlawful purpose; (b) attempt to gain 
        unauthorized access to our systems; (c) upload malicious content; (d) impersonate others; 
        (e) scrape or harvest data from our platform; (f) use our services to discriminate against 
        any individual; (g) violate any applicable laws or regulations.`
    },
    {
      icon: Scale,
      title: "Intellectual Property",
      content: `You retain ownership of content you create and upload. By using our services, you 
        grant Climb a license to process your content to provide our services. Our platform, 
        including our AI models, software, and branding, remains our intellectual property. You 
        may not copy, modify, or reverse engineer our technology.`
    },
    {
      icon: AlertCircle,
      title: "Limitation of Liability",
      content: `Climb is provided "as is" without warranties of any kind. We do not guarantee 
        that our services will result in job offers or career advancement. Our liability is 
        limited to the amount you paid for our services in the 12 months preceding any claim. 
        We are not liable for indirect, incidental, or consequential damages.`
    },
  ]

  return (
    <div className="min-h-screen bg-mesh relative">
      {/* Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-saffron-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-navy-500/5 rounded-full blur-[100px]" />
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
            <div className="w-16 h-16 rounded-2xl bg-saffron-500/10 flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-saffron-500" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">
              Last updated: January 2024
            </p>
          </div>

          {/* Introduction */}
          <div className="card-elevated p-6 lg:p-8 mb-8">
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Climb. These Terms of Service ("Terms") govern your use of our AI-powered 
              career platform. By accessing or using Climb, you agree to be bound by these Terms. 
              If you do not agree, please do not use our services.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {sections.map((section, i) => (
              <div key={i} className="card-elevated p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-navy-500/10 flex items-center justify-center">
                    <section.icon className="w-5 h-5 text-navy-600" />
                  </div>
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          {/* Termination */}
          <div className="mt-8 p-6 lg:p-8 rounded-2xl bg-gradient-to-br from-navy-900 via-navy-950 to-navy-900 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-saffron-500/20 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-xl font-semibold text-white mb-3">Termination</h2>
              <p className="text-white/70 leading-relaxed">
                You may terminate your account at any time by contacting us or using the account 
                settings. We may suspend or terminate your access if you violate these Terms or 
                engage in conduct that we determine is harmful to our platform or other users. 
                Upon termination, you may request export of your data within 30 days.
              </p>
            </div>
          </div>

          {/* Changes to Terms */}
          <div className="mt-8 card-elevated p-6 lg:p-8">
            <h2 className="text-xl font-semibold mb-4">Changes to These Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes 
              by email or through our platform. Your continued use of Climb after changes become 
              effective constitutes acceptance of the updated Terms.
            </p>
          </div>

          {/* Governing Law */}
          <div className="mt-8 card-elevated p-6 lg:p-8">
            <h2 className="text-xl font-semibold mb-4">Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of the State of California, without regard to 
              conflict of law principles. Any disputes shall be resolved in the courts located in 
              San Francisco County, California.
            </p>
          </div>

          {/* Contact */}
          <div className="mt-8 card-elevated p-6 lg:p-8">
            <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              For questions about these Terms, please contact us:
            </p>
            <div className="space-y-2 text-muted-foreground">
              <p>Email: <a href="mailto:legal@climb.ai" className="text-saffron-500 hover:text-saffron-600">legal@climb.ai</a></p>
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
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/trust" className="hover:text-foreground transition-colors">Security</Link>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Climb</p>
        </div>
      </footer>
    </div>
  )
}
