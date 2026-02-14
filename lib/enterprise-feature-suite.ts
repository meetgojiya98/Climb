export type EnterpriseFeatureStatus = "backlog" | "planned" | "in_progress" | "live"

export type EnterpriseFeatureCategory =
  | "AI Intelligence"
  | "Conversion Engine"
  | "Workflow Automation"
  | "Collaboration & Governance"
  | "Security & Compliance"
  | "Ecosystem & Mobility"

export interface EnterpriseFeatureDefinition {
  id: string
  title: string
  category: EnterpriseFeatureCategory
  summary: string
  impact: string
  defaultHref: string
  kpis: string[]
  sprintTemplate: string[]
}

export interface EnterpriseFeatureRollout {
  featureId: string
  status: EnterpriseFeatureStatus
  priority: number
  owner: string
  notes: string
  lastRunAt: string | null
  updatedAt: string | null
}

export interface EnterpriseFeatureWithRollout extends EnterpriseFeatureDefinition, EnterpriseFeatureRollout {}

const FEATURE_CATALOG: EnterpriseFeatureDefinition[] = [
  {
    id: "ai-role-match-engine",
    title: "AI Role Match Engine",
    category: "AI Intelligence",
    summary: "Scores every role against skills, narrative strength, and recent conversion history.",
    impact: "Prioritizes the highest expected-conversion opportunities.",
    defaultHref: "/app/roles",
    kpis: ["Top-10 role fit score", "Qualified role coverage"],
    sprintTemplate: [
      "Ingest 25 new role postings and run match scoring.",
      "Promote top-fit roles into application sprint queue.",
      "Review low-fit roles and capture explicit gap reasons.",
      "Rebalance weekly target based on fit-quality trend.",
    ],
  },
  {
    id: "jd-resume-tailor",
    title: "One-Click JD Resume Tailor",
    category: "AI Intelligence",
    summary: "Generates job-description aligned resume variants with section-level diffs.",
    impact: "Increases response probability for each targeted role.",
    defaultHref: "/app/resumes",
    kpis: ["Tailored resume count", "ATS delta vs baseline"],
    sprintTemplate: [
      "Select 10 top-priority roles for tailoring.",
      "Generate role-specific summary and impact bullets.",
      "Run ATS scan and resolve low-confidence sections.",
      "Ship final tailored packs to application queue.",
    ],
  },
  {
    id: "resume-ab-testing",
    title: "Resume A/B Testing",
    category: "Conversion Engine",
    summary: "Tracks variant-level callback performance and identifies winning structures.",
    impact: "Turns resume optimization into measurable conversion improvement.",
    defaultHref: "/app/insights",
    kpis: ["Variant callback rate", "Winning variant confidence"],
    sprintTemplate: [
      "Define two variant hypotheses for target role families.",
      "Distribute variants across equivalent opportunity sets.",
      "Track response and interview movement by variant.",
      "Promote winner and archive weaker pattern.",
    ],
  },
  {
    id: "cover-letter-outreach-sequences",
    title: "Cover Letter + Outreach Sequence Generator",
    category: "AI Intelligence",
    summary: "Builds application-specific cover letters and multi-step follow-up scripts.",
    impact: "Improves recruiter response and keeps outreach consistent.",
    defaultHref: "/app/cover-letters",
    kpis: ["Outreach sequence completion", "Reply rate"],
    sprintTemplate: [
      "Generate sequence templates for top 12 companies.",
      "Schedule day-0, day-3, day-7 outreach touches.",
      "Personalize hooks from company intelligence snapshots.",
      "Track reply outcomes and refresh weak templates.",
    ],
  },
  {
    id: "voice-interview-simulator",
    title: "Voice Interview Simulator",
    category: "AI Intelligence",
    summary: "Runs timed mock interviews with scoring on structure, clarity, and confidence.",
    impact: "Raises interview consistency before high-stakes rounds.",
    defaultHref: "/app/interviews",
    kpis: ["Mock score trend", "Confidence index"],
    sprintTemplate: [
      "Run three role-specific voice mock sessions.",
      "Capture weak-answer themes and rewrite patterns.",
      "Practice improved responses under 90-second limit.",
      "Log score lift and lock weekly drill cadence.",
    ],
  },
  {
    id: "star-story-bank",
    title: "STAR Story Bank",
    category: "Conversion Engine",
    summary: "Maintains reusable STAR narratives mapped to competencies and role families.",
    impact: "Speeds interview prep and improves answer quality.",
    defaultHref: "/app/interviews",
    kpis: ["Story coverage by competency", "Reuse rate in interviews"],
    sprintTemplate: [
      "Add or refine five high-impact STAR stories.",
      "Tag each story by competency and role archetype.",
      "Attach quantifiable outcomes to every story.",
      "Run retrieval drills with random competency prompts.",
    ],
  },
  {
    id: "coding-interview-lane",
    title: "Coding Interview Prep Lane",
    category: "Conversion Engine",
    summary: "Curates timed coding drills with weak-topic recurrence and trend analytics.",
    impact: "Improves technical interview pass-through rates.",
    defaultHref: "/app/interviews",
    kpis: ["Solved set completion", "Time-to-solution trend"],
    sprintTemplate: [
      "Set weekly drill target by difficulty mix.",
      "Run timed sessions and log misses by pattern.",
      "Generate remediation sequence for weak topics.",
      "Re-test weak topics after 72-hour spacing.",
    ],
  },
  {
    id: "offer-probability-forecasting",
    title: "Offer Probability Forecasting",
    category: "Conversion Engine",
    summary: "Estimates offer likelihood by stage velocity, quality signals, and historical conversion.",
    impact: "Improves planning clarity and decision timing.",
    defaultHref: "/app/forecast",
    kpis: ["Projected offers (8-12w)", "Forecast error rate"],
    sprintTemplate: [
      "Refresh baseline conversion assumptions from last 30 days.",
      "Run conservative, baseline, and aggressive scenarios.",
      "Identify top levers with highest offer sensitivity.",
      "Translate chosen scenario into weekly action quotas.",
    ],
  },
  {
    id: "salary-negotiation-copilot",
    title: "Salary Negotiation Copilot",
    category: "Conversion Engine",
    summary: "Builds market-grounded negotiation scripts and compensation decision frameworks.",
    impact: "Increases expected package quality with less negotiation risk.",
    defaultHref: "/app/salary-insights",
    kpis: ["Comp benchmark coverage", "Negotiation readiness score"],
    sprintTemplate: [
      "Collect compensation data for top target companies.",
      "Generate three negotiation script variants.",
      "Define walk-away and stretch thresholds.",
      "Run rehearsal and finalize decision matrix.",
    ],
  },
  {
    id: "skill-gap-analyzer",
    title: "Skill Gap Analyzer",
    category: "AI Intelligence",
    summary: "Detects role-fit skill gaps and produces compact upskilling plans.",
    impact: "Focuses effort on the highest ROI skill improvements.",
    defaultHref: "/app/goals",
    kpis: ["Gap closure velocity", "Readiness score uplift"],
    sprintTemplate: [
      "Select target roles and extract required competencies.",
      "Score current proficiency and identify top three gaps.",
      "Assign daily micro-learning blocks for each gap.",
      "Review progress and refresh gap priorities weekly.",
    ],
  },
  {
    id: "application-autopilot",
    title: "Application Autopilot",
    category: "Workflow Automation",
    summary: "Automatically schedules next actions, reminders, and escalation paths.",
    impact: "Prevents pipeline drift and missed follow-up windows.",
    defaultHref: "/app/command-center",
    kpis: ["Autopilot coverage", "On-time follow-up rate"],
    sprintTemplate: [
      "Enable autopilot for all active applications.",
      "Configure SLA tiers by application stage.",
      "Set escalation rules for stale records.",
      "Audit autopilot misses and patch rule gaps.",
    ],
  },
  {
    id: "pipeline-sla-tracker",
    title: "Pipeline SLA Tracker",
    category: "Workflow Automation",
    summary: "Surfaces stale, overdue, and no-action records with severity-level queues.",
    impact: "Improves operational discipline and conversion reliability.",
    defaultHref: "/app/control-tower",
    kpis: ["SLA compliance", "Stale record count"],
    sprintTemplate: [
      "Review red-zone SLA queue every morning.",
      "Resolve overdue records with explicit next actions.",
      "Set owner-level accountability by stage.",
      "Publish weekly SLA compliance trend.",
    ],
  },
  {
    id: "unified-communication-inbox",
    title: "Unified Communication Inbox",
    category: "Workflow Automation",
    summary: "Consolidates recruiting communications and links every touchpoint to pipeline entities.",
    impact: "Reduces context switching and missed communication actions.",
    defaultHref: "/app/applications",
    kpis: ["Message-to-record linkage", "Missed reply incidents"],
    sprintTemplate: [
      "Normalize inbound communication into a single queue.",
      "Attach each thread to role and application entities.",
      "Set response SLA for inbound messages.",
      "Escalate unanswered messages past SLA threshold.",
    ],
  },
  {
    id: "relationship-crm",
    title: "Relationship CRM",
    category: "Collaboration & Governance",
    summary: "Tracks recruiters, referrals, and hiring managers with engagement history.",
    impact: "Improves relationship-based opportunity conversion.",
    defaultHref: "/app/workspaces",
    kpis: ["Active relationship count", "Warm-contact conversion"],
    sprintTemplate: [
      "Import and deduplicate current contact graph.",
      "Score contacts by influence and recency.",
      "Build personalized re-engagement sequences.",
      "Track introductions and follow-through outcomes.",
    ],
  },
  {
    id: "referral-graph",
    title: "Referral Graph + Warm Intro Finder",
    category: "Collaboration & Governance",
    summary: "Maps referral paths and recommends highest-probability intro routes.",
    impact: "Raises referral acquisition efficiency.",
    defaultHref: "/app/workspaces",
    kpis: ["Referral path coverage", "Warm intro success rate"],
    sprintTemplate: [
      "Map second-degree network paths for target companies.",
      "Rank referral paths by closeness and relevance.",
      "Generate personalized warm-intro requests.",
      "Measure conversion from request to referral.",
    ],
  },
  {
    id: "company-intelligence-briefs",
    title: "Company Intelligence Briefs",
    category: "AI Intelligence",
    summary: "Creates pre-application intelligence packets with risk/opportunity signals.",
    impact: "Improves narrative relevance and interview preparation.",
    defaultHref: "/app/horizons",
    kpis: ["Briefs generated", "Brief usage in applications"],
    sprintTemplate: [
      "Generate briefs for this week's top target companies.",
      "Extract strategy, product, and team risk signals.",
      "Embed briefing insights into outreach messaging.",
      "Review impact on response and interview quality.",
    ],
  },
  {
    id: "hiring-manager-persona",
    title: "Hiring Manager Persona Insights",
    category: "AI Intelligence",
    summary: "Synthesizes likely hiring manager priorities and communication preferences.",
    impact: "Improves pitch alignment in outreach and interviews.",
    defaultHref: "/app/ai-studio",
    kpis: ["Persona coverage", "Message resonance score"],
    sprintTemplate: [
      "Generate persona hypotheses for top opportunities.",
      "Tailor value proposition per persona profile.",
      "Draft personalized outreach and answer framing.",
      "Record engagement lift by persona strategy.",
    ],
  },
  {
    id: "github-portfolio-analyzer",
    title: "GitHub + Portfolio Analyzer",
    category: "Conversion Engine",
    summary: "Audits project portfolio quality, relevance, and storytelling gaps.",
    impact: "Strengthens technical credibility for high-signal roles.",
    defaultHref: "/app/documents",
    kpis: ["Portfolio quality score", "Project relevance index"],
    sprintTemplate: [
      "Assess top repositories for impact readability.",
      "Prioritize repo improvements for target role fit.",
      "Add concise project narratives and outcomes.",
      "Update resume links with refreshed projects.",
    ],
  },
  {
    id: "linkedin-optimizer",
    title: "LinkedIn Optimizer",
    category: "Conversion Engine",
    summary: "Optimizes headline, summary, and evidence blocks for recruiter discovery.",
    impact: "Increases inbound recruiter visibility.",
    defaultHref: "/app/help",
    kpis: ["Profile strength score", "Inbound recruiter activity"],
    sprintTemplate: [
      "Rewrite headline and summary for target role clusters.",
      "Refresh experience bullets with quantified impact.",
      "Align skills and endorsements with role strategy.",
      "Review inbound trend and refine messaging.",
    ],
  },
  {
    id: "ats-compliance-scanner",
    title: "ATS Compliance Scanner",
    category: "AI Intelligence",
    summary: "Validates resume structure, keyword coverage, and formatting safety.",
    impact: "Reduces ATS rejection risk at submission stage.",
    defaultHref: "/app/resumes",
    kpis: ["ATS pass rate", "Critical issue count"],
    sprintTemplate: [
      "Run ATS scan on all active resume variants.",
      "Resolve keyword and format-level blockers.",
      "Re-test and compare score uplift vs baseline.",
      "Lock ATS-safe templates for weekly usage.",
    ],
  },
  {
    id: "no-code-workflow-builder",
    title: "No-Code Workflow Builder",
    category: "Workflow Automation",
    summary: "Creates if-this-then-that job-search workflows without code.",
    impact: "Scales repeatable execution with fewer manual steps.",
    defaultHref: "/app/command-center",
    kpis: ["Workflow automations active", "Manual hours saved"],
    sprintTemplate: [
      "Define top repetitive process candidates.",
      "Build trigger-action workflows for each process.",
      "Run dry tests and verify exception handling.",
      "Promote stable workflows to production.",
    ],
  },
  {
    id: "shared-workspaces",
    title: "Shared Workspaces",
    category: "Collaboration & Governance",
    summary: "Supports mentor and team collaboration across modules and decisions.",
    impact: "Improves visibility, speed, and accountability.",
    defaultHref: "/app/workspaces",
    kpis: ["Active collaborators", "Shared decision cycle time"],
    sprintTemplate: [
      "Create workspace pods by operating focus.",
      "Invite members with role-based permissions.",
      "Attach comments and decisions to key entities.",
      "Run weekly workspace review cadence.",
    ],
  },
  {
    id: "approval-workflows",
    title: "Approval Workflows",
    category: "Collaboration & Governance",
    summary: "Adds signoff paths for resumes, outreach, and strategic changes.",
    impact: "Improves quality control before external execution.",
    defaultHref: "/app/program-office",
    kpis: ["Approval turnaround time", "Pre-send defect rate"],
    sprintTemplate: [
      "Define approval policies for high-risk assets.",
      "Route submissions to appropriate approvers.",
      "Track bottlenecks in approval queue.",
      "Reduce turnaround with SLA-backed review windows.",
    ],
  },
  {
    id: "enterprise-auth",
    title: "Enterprise Auth (SSO + SCIM + RBAC)",
    category: "Security & Compliance",
    summary: "Supports scalable identity and access controls for organization deployments.",
    impact: "Improves security posture and enterprise readiness.",
    defaultHref: "/app/security-center",
    kpis: ["Provisioning success rate", "Access policy coverage"],
    sprintTemplate: [
      "Audit current role and permission assignments.",
      "Define SSO-ready role mapping matrix.",
      "Set SCIM lifecycle policy requirements.",
      "Run access review and revoke stale sessions.",
    ],
  },
  {
    id: "security-compliance-center",
    title: "Security + Compliance Center",
    category: "Security & Compliance",
    summary: "Centralizes audit logs, retention controls, exports, and deletion workflows.",
    impact: "Meets governance and compliance needs for enterprise usage.",
    defaultHref: "/app/security-center",
    kpis: ["Audit completeness", "Request SLA compliance"],
    sprintTemplate: [
      "Review weekly anomaly and audit event summaries.",
      "Verify retention and export request handling.",
      "Close unresolved security findings.",
      "Publish compliance evidence snapshot.",
    ],
  },
  {
    id: "scenario-planning-dashboard",
    title: "Scenario Planning Dashboard",
    category: "Conversion Engine",
    summary: "Evaluates plan scenarios and recommends the best weekly execution mix.",
    impact: "Improves decision quality under uncertainty.",
    defaultHref: "/app/forecast",
    kpis: ["Scenario adoption rate", "KPI variance reduction"],
    sprintTemplate: [
      "Model conservative, baseline, and aggressive plans.",
      "Stress-test assumptions against current funnel data.",
      "Choose scenario with best risk-adjusted outcome.",
      "Translate scenario into actionable weekly targets.",
    ],
  },
  {
    id: "weekly-executive-report",
    title: "Weekly Executive Report Generator",
    category: "Collaboration & Governance",
    summary: "Automatically generates KPI, risk, and decision summaries for weekly reviews.",
    impact: "Keeps stakeholders aligned with minimal manual effort.",
    defaultHref: "/app/reports",
    kpis: ["Report completion cadence", "Decision follow-through rate"],
    sprintTemplate: [
      "Compile weekly KPI and risk signals.",
      "Generate executive narrative and decision recommendations.",
      "Distribute report to workspace stakeholders.",
      "Track accepted actions and close-loop completion.",
    ],
  },
  {
    id: "integration-hub",
    title: "Integration Hub",
    category: "Ecosystem & Mobility",
    summary: "Connects productivity, ATS, and communication systems into one workflow layer.",
    impact: "Expands data coverage and reduces duplicate work.",
    defaultHref: "/app/command-center",
    kpis: ["Connected systems", "Sync freshness"],
    sprintTemplate: [
      "Prioritize integrations by impact and setup complexity.",
      "Configure ingestion and sync schedules.",
      "Validate field mapping and data quality.",
      "Monitor integration health and incident alerts.",
    ],
  },
  {
    id: "mobile-push-companion",
    title: "Mobile Companion + Push Alerts",
    category: "Ecosystem & Mobility",
    summary: "Provides mobile-first daily operating actions with high-priority alerting.",
    impact: "Improves responsiveness and execution continuity on the go.",
    defaultHref: "/app/help",
    kpis: ["Mobile action completion", "Alert response time"],
    sprintTemplate: [
      "Define mobile-critical actions and reminders.",
      "Enable push-priority tiers for SLA-sensitive events.",
      "Optimize layouts for phone and tablet breakpoints.",
      "Track mobile completion vs desktop completion.",
    ],
  },
  {
    id: "contextual-ai-copilot",
    title: "Contextual AI Copilot Everywhere",
    category: "AI Intelligence",
    summary: "Injects screen-aware AI guidance with one-click action execution across modules.",
    impact: "Creates continuous AI acceleration throughout the product.",
    defaultHref: "/app/ai-studio",
    kpis: ["Copilot action adoption", "Task-to-outcome cycle time"],
    sprintTemplate: [
      "Define contextual prompts per critical module.",
      "Attach one-click actions to AI recommendations.",
      "Measure prompt adoption and completion impact.",
      "Continuously refine prompts using usage telemetry.",
    ],
  },
]

export const ENTERPRISE_FEATURE_CATALOG = FEATURE_CATALOG

export const ENTERPRISE_FEATURE_CATEGORY_ORDER: EnterpriseFeatureCategory[] = [
  "AI Intelligence",
  "Conversion Engine",
  "Workflow Automation",
  "Collaboration & Governance",
  "Security & Compliance",
  "Ecosystem & Mobility",
]

export function getEnterpriseFeatureById(featureId: string) {
  return ENTERPRISE_FEATURE_CATALOG.find((feature) => feature.id === featureId) || null
}

export function isEnterpriseFeatureId(featureId: string): boolean {
  return ENTERPRISE_FEATURE_CATALOG.some((feature) => feature.id === featureId)
}

export function buildDefaultRollout(featureId: string): EnterpriseFeatureRollout {
  const feature = getEnterpriseFeatureById(featureId)
  return {
    featureId,
    status: "live",
    priority: 85,
    owner: feature?.category === "Security & Compliance" ? "Security Lead" : "AI Program Owner",
    notes: "Activated in enterprise suite rollout.",
    lastRunAt: null,
    updatedAt: null,
  }
}

export function buildDefaultFeatureSuite(): EnterpriseFeatureWithRollout[] {
  return ENTERPRISE_FEATURE_CATALOG.map((feature) => ({
    ...feature,
    ...buildDefaultRollout(feature.id),
  }))
}

export function summarizeFeatureSuite(features: EnterpriseFeatureWithRollout[]) {
  const total = features.length
  const live = features.filter((item) => item.status === "live").length
  const inProgress = features.filter((item) => item.status === "in_progress").length
  const planned = features.filter((item) => item.status === "planned").length
  const backlog = features.filter((item) => item.status === "backlog").length
  const avgPriority =
    features.length > 0
      ? Math.round(
          features.reduce((sum, item) => sum + Math.max(0, Math.min(100, Number(item.priority) || 0)), 0) /
            features.length
        )
      : 0

  return {
    total,
    live,
    inProgress,
    planned,
    backlog,
    avgPriority,
    completionPct: total > 0 ? Math.round((live / total) * 100) : 0,
  }
}
