"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command as CommandPrimitive } from "cmdk"
import {
  ArrowRight,
  Command,
  PlusCircle,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export interface CommandPaletteItem {
  id: string
  label: string
  description?: string
  href?: string
  keywords?: string[]
  shortcut?: string
  icon?: React.ComponentType<{ className?: string }>
  group: "navigation" | "create" | "actions"
  onSelect?: () => void
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CommandPaletteItem[]
  onNaturalLanguage?: (query: string) => void
}

const GROUP_LABELS: Record<CommandPaletteItem["group"], string> = {
  navigation: "Navigate",
  create: "Create",
  actions: "Quick Actions",
}

type NaturalSuggestion = {
  id: string
  label: string
  description: string
  href?: string
  mode: "navigate" | "ai"
}

export function CommandPalette({ open, onOpenChange, items, onNaturalLanguage }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")

  const grouped = React.useMemo(() => {
    return {
      navigation: items.filter((item) => item.group === "navigation"),
      create: items.filter((item) => item.group === "create"),
      actions: items.filter((item) => item.group === "actions"),
    }
  }, [items])

  React.useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const naturalSuggestions = React.useMemo<NaturalSuggestion[]>(() => {
    const normalized = query.trim().toLowerCase()
    if (normalized.length < 3) return []

    const suggestions: NaturalSuggestion[] = []

    if (/(create|new|build).*(resume)/.test(normalized)) {
      suggestions.push({
        id: "nl-create-resume",
        label: "Create a new resume",
        description: "Open resume creator",
        href: "/app/resumes/new",
        mode: "navigate",
      })
    }

    if (/(add|create|track).*(application|job)/.test(normalized)) {
      suggestions.push({
        id: "nl-create-application",
        label: "Track a new application",
        description: "Open applications with add form",
        href: "/app/applications?add=1",
        mode: "navigate",
      })
    }

    if (/(forecast|projection|scenario)/.test(normalized)) {
      suggestions.push({
        id: "nl-open-forecast",
        label: "Open forecast planner",
        description: "Jump to scenario simulator",
        href: "/app/forecast",
        mode: "navigate",
      })
    }

    if (/(control|risk|sla|stale)/.test(normalized)) {
      suggestions.push({
        id: "nl-open-control-tower",
        label: "Open control tower",
        description: "Review operational risks and SLA issues",
        href: "/app/control-tower",
        mode: "navigate",
      })
    }

    if (/(interview|mock|practice)/.test(normalized)) {
      suggestions.push({
        id: "nl-open-interviews",
        label: "Open interview studio",
        description: "Run practice with analytics and feedback",
        href: "/app/interviews",
        mode: "navigate",
      })
    }

    suggestions.push({
      id: "nl-run-ai",
      label: "Run as AI command",
      description: `Ask AI: "${query.trim()}"`,
      mode: "ai",
    })

    return suggestions.slice(0, 5)
  }, [query])

  const handleSelect = (item: CommandPaletteItem) => {
    onOpenChange(false)
    if (item.onSelect) item.onSelect()
    if (item.href) router.push(item.href)
  }

  const handleNaturalSelect = (item: NaturalSuggestion) => {
    onOpenChange(false)
    if (item.mode === "navigate" && item.href) {
      router.push(item.href)
      return
    }
    if (onNaturalLanguage) onNaturalLanguage(query.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-2xl">
        <CommandPrimitive className="cmdk-root">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CommandPrimitive.Input
              placeholder="Search navigation, features, and actions..."
              value={query}
              onValueChange={setQuery}
              className="cmdk-input"
            />
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
                <Command className="h-3 w-3" /> K
              </span>
              <span>to open</span>
            </div>
          </div>

          <CommandPrimitive.List className="cmdk-list">
            <CommandPrimitive.Empty className="px-4 py-10 text-center text-sm text-muted-foreground">
              No matches found.
            </CommandPrimitive.Empty>

            {naturalSuggestions.length > 0 && (
              <CommandPrimitive.Group heading="Natural Language" className="cmdk-group">
                {naturalSuggestions.map((item) => (
                  <CommandPrimitive.Item
                    key={item.id}
                    value={[item.label, item.description, query].filter(Boolean).join(" ")}
                    onSelect={() => handleNaturalSelect(item)}
                    className={cn("cmdk-item")}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                        {item.mode === "ai" ? (
                          <Sparkles className="h-4 w-4 text-foreground" />
                        ) : (
                          <Wand2 className="h-4 w-4 text-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.label}</div>
                        <div className="truncate text-xs text-muted-foreground">{item.description}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            )}

            {(["navigation", "create", "actions"] as const).map((group) => {
              const entries = grouped[group]
              if (entries.length === 0) return null

              return (
                <CommandPrimitive.Group
                  key={group}
                  heading={GROUP_LABELS[group]}
                  className="cmdk-group"
                >
                  {entries.map((item) => {
                    const Icon = item.icon || PlusCircle
                    return (
                      <CommandPrimitive.Item
                        key={item.id}
                        value={[item.label, item.description, ...(item.keywords || [])].filter(Boolean).join(" ")}
                        onSelect={() => handleSelect(item)}
                        className={cn("cmdk-item")}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                            <Icon className="h-4 w-4 text-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{item.label}</div>
                            {item.description && (
                              <div className="truncate text-xs text-muted-foreground">{item.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.shortcut && (
                            <span className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                              {item.shortcut}
                            </span>
                          )}
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </CommandPrimitive.Item>
                    )
                  })}
                </CommandPrimitive.Group>
              )
            })}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  )
}
