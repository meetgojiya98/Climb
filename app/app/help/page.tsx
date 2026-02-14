"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  HelpCircle, 
  Search,
  FileText,
  MessageSquare,
  Mail,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Briefcase,
  Target,
  Sparkles,
  Shield
} from "lucide-react"

const FAQ_ITEMS = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I create my first resume?",
        a: "Navigate to the Resumes section and click 'Create Resume'. Follow the step-by-step wizard to add your information. Our AI will help optimize it for ATS systems."
      },
      {
        q: "Is Climb really free?",
        a: "Yes! Climb is completely free to use. We believe everyone deserves access to professional career tools without barriers."
      },
      {
        q: "How does the AI optimization work?",
        a: "Our AI analyzes your resume content and compares it against job descriptions to suggest improvements, better keywords, and formatting that helps pass ATS filters."
      },
    ]
  },
  {
    category: "Resumes",
    questions: [
      {
        q: "Can I create multiple resumes?",
        a: "Absolutely! You can create as many resumes as you need, each tailored for different job types or industries."
      },
      {
        q: "What formats can I export my resume in?",
        a: "You can export your resume as PDF or DOCX format. Both formats are optimized for ATS compatibility."
      },
      {
        q: "What is an ATS score?",
        a: "ATS (Applicant Tracking System) score indicates how well your resume is optimized to pass through automated screening systems used by employers."
      },
    ]
  },
  {
    category: "Applications",
    questions: [
      {
        q: "How do I track my job applications?",
        a: "Go to the Applications section and click 'Add Application'. Enter the job details, and you can update the status as you progress through the hiring process."
      },
      {
        q: "Can I add notes to my applications?",
        a: "Yes, each application has a notes field where you can add interview details, contact information, or any other relevant information."
      },
    ]
  },
  {
    category: "Interview Prep",
    questions: [
      {
        q: "How does interview practice work?",
        a: "Select a question category (behavioral, technical, etc.) and practice answering questions. Our AI provides feedback on your responses."
      },
      {
        q: "What is the STAR method?",
        a: "STAR stands for Situation, Task, Action, Result. It's a structured way to answer behavioral interview questions by describing specific examples from your experience."
      },
    ]
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (id: string) => {
    setOpenItems(openItems.includes(id) 
      ? openItems.filter(i => i !== id)
      : [...openItems, id]
    )
  }

  const filteredFAQ = FAQ_ITEMS.map(category => ({
    ...category,
    questions: category.questions.filter(item =>
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-saffron-500/10 flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8 text-saffron-500" />
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-muted-foreground">Find answers to common questions and learn how to use Climb</p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-12 py-4"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {[
          { icon: FileText, label: "Resume Guide", href: "/app/resumes", color: "saffron" },
          { icon: Briefcase, label: "Track Applications", href: "/app/applications", color: "navy" },
          { icon: MessageSquare, label: "Interview Tips", href: "/app/interviews", color: "purple" },
          { icon: Target, label: "Set Goals", href: "/app/goals", color: "green" },
        ].map((link, i) => (
          <Link
            key={i}
            href={link.href}
            className="card-interactive p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              link.color === 'saffron' ? 'bg-saffron-500/10' :
              link.color === 'navy' ? 'bg-navy-500/10' :
              link.color === 'purple' ? 'bg-purple-500/10' : 'bg-green-500/10'
            }`}>
              <link.icon className={`w-5 h-5 ${
                link.color === 'saffron' ? 'text-saffron-500' :
                link.color === 'navy' ? 'text-navy-600' :
                link.color === 'purple' ? 'text-purple-500' : 'text-green-500'
              }`} />
            </div>
            <span className="font-medium text-sm">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>
        
        {filteredFAQ.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <p className="text-muted-foreground">No results found for &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredFAQ.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{category.category}</h3>
                <div className="card-elevated divide-y divide-border">
                  {category.questions.map((item, itemIndex) => {
                    const id = `${categoryIndex}-${itemIndex}`
                    const isOpen = openItems.includes(id)
                    return (
                      <div key={itemIndex}>
                        <button
                          onClick={() => toggleItem(id)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors"
                        >
                          <span className="font-medium pr-4">{item.q}</span>
                          {isOpen ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4">
                            <p className="text-muted-foreground text-sm">{item.a}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact Support */}
      <div className="max-w-3xl mx-auto">
        <div className="card-elevated p-4 sm:p-5 lg:p-6 text-center">
          <h3 className="font-semibold mb-2">Still need help?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Can&apos;t find what you&apos;re looking for? Reach out to our support team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="mailto:support@climb.ai"
              className="btn-saffron"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
            <Link href="/trust" className="btn-outline">
              <Shield className="w-4 h-4" />
              Security & Privacy
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
