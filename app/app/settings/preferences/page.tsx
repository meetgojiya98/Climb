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
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
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
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }, [])

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
    </div>
  )
}
