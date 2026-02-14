"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command as CommandPrimitive } from "cmdk"
import {
  ArrowRight,
  Command,
  PlusCircle,
  Search,
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
}

const GROUP_LABELS: Record<CommandPaletteItem["group"], string> = {
  navigation: "Navigate",
  create: "Create",
  actions: "Quick Actions",
}

export function CommandPalette({ open, onOpenChange, items }: CommandPaletteProps) {
  const router = useRouter()

  const grouped = React.useMemo(() => {
    return {
      navigation: items.filter((item) => item.group === "navigation"),
      create: items.filter((item) => item.group === "create"),
      actions: items.filter((item) => item.group === "actions"),
    }
  }, [items])

  const handleSelect = (item: CommandPaletteItem) => {
    onOpenChange(false)
    if (item.onSelect) item.onSelect()
    if (item.href) router.push(item.href)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-2xl">
        <CommandPrimitive className="cmdk-root">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CommandPrimitive.Input
              placeholder="Search navigation, features, and actions..."
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
