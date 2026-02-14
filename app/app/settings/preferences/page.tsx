"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun } from 'lucide-react'

export default function PreferencesPage() {
  const [loading, setLoading] = useState(false)
  const [toneDefault, setToneDefault] = useState<'professional' | 'warm' | 'confident' | 'technical'>('professional')
  const [weeklyTargetDefault, setWeeklyTargetDefault] = useState(6)
  const [qualityLiftDefault, setQualityLiftDefault] = useState(5)
  const [horizonDefault, setHorizonDefault] = useState<4 | 8 | 12>(8)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const plannerDefaultsKey = 'climb:forecast-planner:defaults:v1'
  const loadPreferences = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('tone_default')
        .eq('user_id', user.id)
        .single()

      if (data?.tone_default) {
        setToneDefault(data.tone_default as any)
      }

      const rawDefaults = window.localStorage.getItem(plannerDefaultsKey)
      if (rawDefaults) {
        try {
          const parsed = JSON.parse(rawDefaults)
          if (Number.isFinite(Number(parsed.applicationsPerWeek))) {
            setWeeklyTargetDefault(Math.max(1, Math.min(40, Math.round(Number(parsed.applicationsPerWeek)))))
          }
          if (Number.isFinite(Number(parsed.qualityLiftPct))) {
            setQualityLiftDefault(Math.max(-10, Math.min(40, Math.round(Number(parsed.qualityLiftPct)))))
          }
          if ([4, 8, 12].includes(Number(parsed.horizonWeeks))) {
            setHorizonDefault(Number(parsed.horizonWeeks) as 4 | 8 | 12)
          }
        } catch {
          window.localStorage.removeItem(plannerDefaultsKey)
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }, [plannerDefaultsKey])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const handleSave = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({ tone_default: toneDefault })
        .eq('user_id', user.id)

      if (error) throw error

      window.localStorage.setItem(
        plannerDefaultsKey,
        JSON.stringify({
          applicationsPerWeek: weeklyTargetDefault,
          qualityLiftPct: qualityLiftDefault,
          horizonWeeks: horizonDefault,
        })
      )

      toast.success('Preferences updated')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update preferences')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how Climb looks for your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'system', label: 'System', icon: Monitor },
            ].map((option) => {
              const Icon = option.icon
              const active = theme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={`rounded-[14px] border p-4 text-left transition-colors ${
                    active ? 'border-climb bg-climb/5' : 'border-border hover:bg-accent'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{option.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {option.value === 'light' && 'Best for bright environments'}
                    {option.value === 'dark' && 'Reduced glare in low light'}
                    {option.value === 'system' && `Matches your OS (${mounted ? resolvedTheme || 'auto' : 'auto'})`}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Writing Preferences</CardTitle>
          <CardDescription>Customize how Climb writes for you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Default Writing Tone</Label>
            <div className="grid gap-3">
              {(['professional', 'warm', 'confident', 'technical'] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => setToneDefault(tone)}
                  className={`rounded-[14px] border p-4 text-left transition-colors ${
                    toneDefault === tone
                      ? 'border-climb bg-climb/5'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <div className="font-medium capitalize">{tone}</div>
                  <div className="text-sm text-muted-foreground">
                    {tone === 'professional' && 'Balanced, clear, and competent'}
                    {tone === 'warm' && 'Personable and engaging'}
                    {tone === 'confident' && 'Assertive and achievement-focused'}
                    {tone === 'technical' && 'Precise and detail-oriented'}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Planning Defaults</CardTitle>
          <CardDescription>Set default controls for Forecast Planner scenarios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weekly-target-default">Applications per week</Label>
              <input
                id="weekly-target-default"
                type="number"
                min={1}
                max={40}
                value={weeklyTargetDefault}
                onChange={(event) => setWeeklyTargetDefault(Math.max(1, Math.min(40, Number(event.target.value) || 1)))}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quality-lift-default">Quality lift (%)</Label>
              <input
                id="quality-lift-default"
                type="number"
                min={-10}
                max={40}
                value={qualityLiftDefault}
                onChange={(event) => setQualityLiftDefault(Math.max(-10, Math.min(40, Number(event.target.value) || 0)))}
                className="input-field"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default horizon</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {([4, 8, 12] as const).map((weeks) => (
                <button
                  key={weeks}
                  type="button"
                  onClick={() => setHorizonDefault(weeks)}
                  className={`rounded-[14px] border p-3 text-left transition-colors ${
                    horizonDefault === weeks ? 'border-climb bg-climb/5' : 'border-border hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">{weeks} weeks</div>
                  <div className="text-xs text-muted-foreground">Default forecast planning horizon</div>
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            These values prefill the controls in Forecast Planner.
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Planning Defaults'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
