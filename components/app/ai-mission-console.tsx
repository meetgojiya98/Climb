"use client"

type CopilotSurface =
  | "global"
  | "dashboard"
  | "applications"
  | "help"
  | "control-tower"
  | "program-office"
  | "command-center"
  | "forecast"
  | "horizons"
  | "resumes"
  | "roles"
  | "interviews"

interface AIMission {
  id: string
  title: string
  objective: string
  prompt: string
  href: string
  priority: "high" | "medium" | "low"
}

interface AIMissionConsoleProps {
  surface: CopilotSurface
  title?: string
  description?: string
  missions: AIMission[]
  className?: string
}

export function AIMissionConsole(_props: AIMissionConsoleProps) {
  return null
}
