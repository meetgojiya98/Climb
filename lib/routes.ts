export const APP_ROUTES = {
  root: "/app",
  dashboard: "/app/dashboard",
  aiStudio: "/app/ai-studio",
  horizons: "/app/horizons",
  controlTower: "/app/control-tower",
  programOffice: "/app/program-office",
  commandCenter: "/app/command-center",
  playbook: "/app/help",
  resumes: "/app/resumes",
  roles: "/app/roles",
  applications: "/app/applications",
  coverLetters: "/app/cover-letters",
  interviews: "/app/interviews",
  goals: "/app/goals",
  insights: "/app/insights",
  forecast: "/app/forecast",
  reports: "/app/reports",
  salaryInsights: "/app/salary-insights",
  settings: "/app/settings",
  help: "/app/help",
  savedJobs: "/app/saved-jobs",
  templates: "/app/templates",
  documents: "/app/documents",
  workspaces: "/app/workspaces",
  securityCenter: "/app/security-center",
} as const

export const APP_ROUTE_ALIASES: Record<string, string> = {
  [APP_ROUTES.root]: APP_ROUTES.dashboard,
  "/app/controltower": APP_ROUTES.controlTower,
  "/app/control-towers": APP_ROUTES.controlTower,
  "/app/programoffice": APP_ROUTES.programOffice,
  "/app/programofficer": APP_ROUTES.programOffice,
  "/app/program-officer": APP_ROUTES.programOffice,
  "/app/forcast": APP_ROUTES.forecast,
  "/app/forecasts": APP_ROUTES.forecast,
  "/app/playbook": APP_ROUTES.playbook,
  "/app/how-it-works": APP_ROUTES.playbook,
} as const

export function resolveCanonicalAppPath(pathname: string): string | null {
  if (!pathname.startsWith("/app")) return null
  const normalized = pathname.replace(/\/+$/, "") || "/"
  return APP_ROUTE_ALIASES[normalized] || null
}
