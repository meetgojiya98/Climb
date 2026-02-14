"use client"

import { useState } from "react"
import {
  DollarSign,
  TrendingUp,
  MapPin,
  Briefcase,
  BarChart3,
  Sparkles,
  CheckCircle,
  Building2,
} from "lucide-react"

const ROLE_BENCHMARKS: Record<string, { min: number; mid: number; max: number; unit: string; notes: string }> = {
  "Software Engineer": { min: 90, mid: 130, max: 200, unit: "k", notes: "Base salary; add 10–30% for FAANG / high-cost cities." },
  "Senior Software Engineer": { min: 140, mid: 180, max: 280, unit: "k", notes: "5+ years experience; equity often 20–40% of base." },
  "Product Manager": { min: 100, mid: 145, max: 220, unit: "k", notes: "Varies by company size and industry." },
  "Senior Product Manager": { min: 140, mid: 185, max: 260, unit: "k", notes: "Includes bonus and RSUs at tech companies." },
  "Data Scientist": { min: 95, mid: 135, max: 200, unit: "k", notes: "ML/AI roles often at top of range." },
  "UX Designer": { min: 75, mid: 110, max: 165, unit: "k", notes: "Senior and staff levels can exceed 180k." },
  "Marketing Manager": { min: 70, mid: 100, max: 150, unit: "k", notes: "Performance bonus common." },
  "Sales Representative": { min: 55, mid: 75, max: 120, unit: "k", notes: "OTE (OTE = base + commission) often 2x base." },
  "DevOps Engineer": { min: 100, mid: 140, max: 200, unit: "k", notes: "Cloud and SRE roles at higher end." },
  "Engineering Manager": { min: 150, mid: 200, max: 320, unit: "k", notes: "Includes team size and scope." },
}

const TIPS = [
  "Use levels.fyi and Glassdoor for your specific city and company.",
  "Total comp = base + bonus + equity; focus on total, not just base.",
  "Negotiate after an offer; most companies expect it.",
  "Remote roles may be adjusted for your location.",
]

export default function SalaryInsightsPage() {
  const [selectedRole, setSelectedRole] = useState<string>("Software Engineer")
  const benchmark = ROLE_BENCHMARKS[selectedRole] || ROLE_BENCHMARKS["Software Engineer"]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Salary Insights</h1>
        <p className="text-muted-foreground">Benchmark salaries by role to negotiate with confidence</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-saffron-500/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-saffron-500" />
              </div>
              <div>
                <h2 className="font-semibold">Select a role</h2>
                <p className="text-sm text-muted-foreground">US market estimates (annual)</p>
              </div>
            </div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="input-field w-full text-base"
            >
              {Object.keys(ROLE_BENCHMARKS).map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>

            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-secondary/50 text-center">
                <div className="text-xs font-medium text-muted-foreground mb-1">Low</div>
                <div className="text-2xl font-bold">${benchmark.min}{benchmark.unit}</div>
                <div className="text-xs text-muted-foreground mt-1">Early / small company</div>
              </div>
              <div className="p-4 rounded-xl bg-saffron-500/10 text-center border border-saffron-500/20">
                <div className="text-xs font-medium text-saffron-600 mb-1">Mid</div>
                <div className="text-2xl font-bold text-saffron-600">${benchmark.mid}{benchmark.unit}</div>
                <div className="text-xs text-muted-foreground mt-1">Typical range</div>
              </div>
              <div className="p-4 rounded-xl bg-secondary/50 text-center">
                <div className="text-xs font-medium text-muted-foreground mb-1">High</div>
                <div className="text-2xl font-bold">${benchmark.max}{benchmark.unit}</div>
                <div className="text-xs text-muted-foreground mt-1">Senior / top companies</div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mt-6 p-4 rounded-xl bg-secondary/30">{benchmark.notes}</p>
          </div>

          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-saffron-500" />
              Visual range
            </h3>
            <div className="h-8 rounded-full bg-secondary overflow-hidden flex">
              <div className="bg-blue-500/60" style={{ width: "25%" }} title="Low" />
              <div className="bg-saffron-500" style={{ width: "35%" }} title="Mid" />
              <div className="bg-green-500/60" style={{ width: "40%" }} title="High" />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>${benchmark.min}{benchmark.unit}</span>
              <span>${benchmark.mid}{benchmark.unit}</span>
              <span>${benchmark.max}{benchmark.unit}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-elevated p-4 sm:p-5 lg:p-6 border-2 border-saffron-500/20 bg-saffron-50/50 dark:bg-saffron-950/20">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-saffron-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-saffron-600 dark:text-saffron-400" />
              </div>
              <h3 className="font-semibold text-foreground">Negotiation tips</h3>
            </div>
            <ul className="space-y-3">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground/90">
                  <CheckCircle className="w-5 h-5 text-saffron-600 dark:text-saffron-400 shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card-elevated p-4 sm:p-5 lg:p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-navy-500" />
              Data sources
            </h3>
            <p className="text-sm text-muted-foreground">
              Benchmarks are indicative and based on public data (levels.fyi, Glassdoor, Payscale). Always research the specific company and location.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
