"use client"

import { useEffect, useMemo, useState, type ComponentType } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type ThemeMode = "light" | "dark" | "system"

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

const options: Array<{
  value: ThemeMode
  label: string
  icon: ComponentType<{ className?: string }>
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const triggerLabel = useMemo(() => {
    if (!mounted) return "Theme"
    if (theme === "system") return `System (${resolvedTheme || "auto"})`
    return theme === "dark" ? "Dark" : "Light"
  }, [mounted, resolvedTheme, theme])

  const TriggerIcon = useMemo(() => {
    if (!mounted) return Monitor
    if (theme === "dark") return Moon
    if (theme === "light") return Sun
    return Monitor
  }, [mounted, theme])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-border bg-background/85 px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/70 transition-colors shadow-[0_10px_18px_-16px_rgba(17,24,58,0.55)]",
            className
          )}
          aria-label="Change theme"
        >
          <TriggerIcon className="h-4 w-4" />
          {showLabel && <span>{triggerLabel}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {options.map((option) => {
          const Icon = option.icon
          const active = theme === option.value
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn("flex items-center justify-between", active && "bg-gradient-to-r from-saffron-500/12 to-gold-500/12")}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {option.label}
              </span>
              {active && <span className="text-xs text-muted-foreground">Active</span>}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
