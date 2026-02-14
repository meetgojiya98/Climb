"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  User,
  Lock,
  Bell,
  Shield,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  LogOut,
  Target,
  CalendarClock,
  Sparkles,
  TrendingUp,
} from "lucide-react"

type Message = { type: 'success' | 'error'; text: string } | null

type EnterprisePreferences = {
  strict_sla_mode: boolean
  auto_triage: boolean
  evidence_mode: boolean
  weekly_exec_digest: boolean
  risk_threshold: number
  retention_days: number
}

type WorkspacePreferences = {
  timezone: string
  daily_focus_start: string
  daily_focus_end: string
  weekly_review_day: string
  weekly_application_target: number
}

type EnterpriseToggleKey = 'strict_sla_mode' | 'auto_triage' | 'evidence_mode' | 'weekly_exec_digest'

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [savingEnterprise, setSavingEnterprise] = useState(false)
  const [savingWorkspace, setSavingWorkspace] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
  })
  const [notifications, setNotifications] = useState({
    email_updates: true,
    application_reminders: true,
    interview_reminders: true,
    weekly_summary: false,
  })
  const [enterprise, setEnterprise] = useState<EnterprisePreferences>({
    strict_sla_mode: true,
    auto_triage: true,
    evidence_mode: true,
    weekly_exec_digest: true,
    risk_threshold: 6,
    retention_days: 365,
  })
  const [workspace, setWorkspace] = useState<WorkspacePreferences>({
    timezone: 'UTC',
    daily_focus_start: '09:00',
    daily_focus_end: '11:00',
    weekly_review_day: 'Friday',
    weekly_application_target: 8,
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const notificationsStorageKey = 'climb:notification-preferences'
  const enterpriseStorageKey = 'climb:enterprise-preferences'
  const workspaceStorageKey = 'climb:workspace-preferences'

  const fetchProfile = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/signin')
        return
      }

      setProfile({
        full_name: user.user_metadata?.full_name || "",
        email: user.email || "",
      })

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile((prev) => ({
          ...prev,
          full_name: profileData.full_name || prev.full_name,
        }))
      }

      const storedNotifications = safeParseJson<typeof notifications>(
        localStorage.getItem(`${notificationsStorageKey}:${user.id}`)
      )
      if (storedNotifications) {
        setNotifications((prev) => ({ ...prev, ...storedNotifications }))
      }

      const storedEnterprise = safeParseJson<Partial<EnterprisePreferences>>(
        localStorage.getItem(`${enterpriseStorageKey}:${user.id}`)
      )
      if (storedEnterprise) {
        setEnterprise((prev) => ({
          ...prev,
          ...storedEnterprise,
          risk_threshold: Number.isFinite(Number(storedEnterprise.risk_threshold))
            ? Math.max(1, Math.min(10, Number(storedEnterprise.risk_threshold)))
            : prev.risk_threshold,
          retention_days: Number.isFinite(Number(storedEnterprise.retention_days))
            ? Math.max(30, Math.min(3650, Number(storedEnterprise.retention_days)))
            : prev.retention_days,
        }))
      }

      const inferredTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const storedWorkspace = safeParseJson<Partial<WorkspacePreferences>>(
        localStorage.getItem(`${workspaceStorageKey}:${user.id}`)
      )
      if (storedWorkspace) {
        setWorkspace((prev) => ({
          ...prev,
          ...storedWorkspace,
          timezone: String(storedWorkspace.timezone || inferredTimezone),
          weekly_application_target: Number.isFinite(Number(storedWorkspace.weekly_application_target))
            ? Math.max(1, Math.min(40, Number(storedWorkspace.weekly_application_target)))
            : prev.weekly_application_target,
        }))
      } else {
        setWorkspace((prev) => ({ ...prev, timezone: inferredTimezone }))
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSaveProfile = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      await supabase.auth.updateUser({
        data: { full_name: profile.full_name },
      })

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: profile.full_name,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error
      setMessage({ type: 'success', text: 'Profile updated successfully.' })
    } catch (error) {
      console.error('Error saving profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    setSavingNotifications(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      localStorage.setItem(`${notificationsStorageKey}:${user.id}`, JSON.stringify(notifications))
      setMessage({ type: 'success', text: 'Notification preferences saved.' })
    } catch (error) {
      console.error('Error saving notifications:', error)
      setMessage({ type: 'error', text: 'Failed to save notification preferences.' })
    } finally {
      setSavingNotifications(false)
    }
  }

  const handleSaveEnterprise = async () => {
    setSavingEnterprise(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      localStorage.setItem(`${enterpriseStorageKey}:${user.id}`, JSON.stringify(enterprise))
      setMessage({ type: 'success', text: 'Enterprise controls saved.' })
    } catch (error) {
      console.error('Error saving enterprise preferences:', error)
      setMessage({ type: 'error', text: 'Failed to save enterprise controls.' })
    } finally {
      setSavingEnterprise(false)
    }
  }

  const handleSaveWorkspace = async () => {
    setSavingWorkspace(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      localStorage.setItem(`${workspaceStorageKey}:${user.id}`, JSON.stringify(workspace))
      setMessage({ type: 'success', text: 'Workspace cadence preferences saved.' })
    } catch (error) {
      console.error('Error saving workspace preferences:', error)
      setMessage({ type: 'error', text: 'Failed to save workspace preferences.' })
    } finally {
      setSavingWorkspace(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDeleteAccount = async () => {
    setMessage({ type: 'error', text: 'Please contact support to delete your account.' })
    setShowDeleteConfirm(false)
  }

  const toggleEnterprise = (key: EnterpriseToggleKey) => {
    setEnterprise((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
      </div>
    )
  }

  const enterpriseToggleItems: Array<{ key: EnterpriseToggleKey; label: string; desc: string }> = [
    {
      key: 'strict_sla_mode',
      label: 'Strict SLA Mode',
      desc: 'Escalate overdue follow-ups and stale applications as high-priority risk.',
    },
    {
      key: 'auto_triage',
      label: 'Auto Triage Queue',
      desc: 'Prioritize critical pipeline actions automatically in command views.',
    },
    {
      key: 'evidence_mode',
      label: 'Evidence Logging',
      desc: 'Preserve activity trail for weekly executive and hiring review packs.',
    },
    {
      key: 'weekly_exec_digest',
      label: 'Weekly Executive Digest',
      desc: 'Generate a summary-first dashboard operating digest every week.',
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Enterprise profile, governance, notifications, and security controls.</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-saffron-500/10 flex items-center justify-center">
              <User className="w-5 h-5 text-saffron-500" />
            </div>
            <h2 className="font-semibold">Profile Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Full Name</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="input-field"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <input type="email" value={profile.email} disabled className="input-field bg-secondary cursor-not-allowed" />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
            </div>
            <button onClick={handleSaveProfile} disabled={saving} className="btn-saffron">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-navy-500/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-navy-600" />
            </div>
            <h2 className="font-semibold">Notifications</h2>
          </div>

          <div className="space-y-4">
            {[
              { key: 'email_updates', label: 'Email Updates', desc: 'Receive product updates and releases.' },
              { key: 'application_reminders', label: 'Application Reminders', desc: 'Get nudges for follow-up and status updates.' },
              { key: 'interview_reminders', label: 'Interview Reminders', desc: 'Receive reminders ahead of interview sessions.' },
              { key: 'weekly_summary', label: 'Weekly Summary', desc: 'Receive a weekly progress and execution summary.' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2 gap-4">
                <div>
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <button
                  onClick={() =>
                    setNotifications({
                      ...notifications,
                      [item.key]: !notifications[item.key as keyof typeof notifications],
                    })
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    notifications[item.key as keyof typeof notifications] ? 'bg-saffron-500' : 'bg-secondary'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
            <button onClick={handleSaveNotifications} disabled={savingNotifications} className="btn-outline">
              {savingNotifications ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Notifications
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className="font-semibold">Enterprise Operating Controls</h2>
            <p className="text-xs text-muted-foreground mt-1">Set governance rails for risk, cadence, and traceability.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {enterpriseToggleItems.map((item) => (
              <div key={item.key} className="rounded-xl border border-border px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => toggleEnterprise(item.key)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${enterprise[item.key] ? 'bg-saffron-500' : 'bg-secondary'}`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        enterprise[item.key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-saffron-500" />
                <label className="text-sm font-medium">Risk Threshold ({enterprise.risk_threshold}/10)</label>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={enterprise.risk_threshold}
                onChange={(e) =>
                  setEnterprise((prev) => ({ ...prev, risk_threshold: Math.max(1, Math.min(10, Number(e.target.value) || 1)) }))
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">Lower values trigger earlier escalations in operations dashboards.</p>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-navy-600" />
                <label className="text-sm font-medium">Data Retention Window (days)</label>
              </div>
              <input
                type="number"
                min={30}
                max={3650}
                value={enterprise.retention_days}
                onChange={(e) =>
                  setEnterprise((prev) => ({
                    ...prev,
                    retention_days: Math.max(30, Math.min(3650, Number(e.target.value) || 30)),
                  }))
                }
                className="input-field"
              />
              <p className="text-xs text-muted-foreground mt-2">Recommended range for audit-ready history: 180 to 730 days.</p>
            </div>
          </div>
        </div>

        <button onClick={handleSaveEnterprise} disabled={savingEnterprise} className="btn-saffron mt-6">
          {savingEnterprise ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Enterprise Controls
            </>
          )}
        </button>
      </div>

      <div className="card-elevated p-4 sm:p-5 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <CalendarClock className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="font-semibold">Workspace Cadence</h2>
            <p className="text-xs text-muted-foreground mt-1">Define focus windows and weekly operating rhythm.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Timezone</label>
            <input
              type="text"
              value={workspace.timezone}
              onChange={(e) => setWorkspace((prev) => ({ ...prev, timezone: e.target.value || 'UTC' }))}
              className="input-field"
              placeholder="America/New_York"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Focus Start</label>
            <input
              type="time"
              value={workspace.daily_focus_start}
              onChange={(e) => setWorkspace((prev) => ({ ...prev, daily_focus_start: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Focus End</label>
            <input
              type="time"
              value={workspace.daily_focus_end}
              onChange={(e) => setWorkspace((prev) => ({ ...prev, daily_focus_end: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Weekly Review Day</label>
            <select
              value={workspace.weekly_review_day}
              onChange={(e) => setWorkspace((prev) => ({ ...prev, weekly_review_day: e.target.value }))}
              className="input-field"
            >
              {WEEK_DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Weekly Application Target</label>
            <input
              type="number"
              min={1}
              max={40}
              value={workspace.weekly_application_target}
              onChange={(e) =>
                setWorkspace((prev) => ({
                  ...prev,
                  weekly_application_target: Math.max(1, Math.min(40, Number(e.target.value) || 1)),
                }))
              }
              className="input-field"
            />
          </div>
        </div>

        <button onClick={handleSaveWorkspace} disabled={savingWorkspace} className="btn-outline mt-6">
          {savingWorkspace ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Workspace Cadence
            </>
          )}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-500" />
            </div>
            <h2 className="font-semibold">Security</h2>
          </div>

          <div className="space-y-4">
            <button className="btn-outline w-full justify-start">
              <Lock className="w-4 h-4" />
              Change Password
            </button>
            <button onClick={handleSignOut} className="btn-outline w-full justify-start text-muted-foreground">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="card-elevated p-4 sm:p-5 lg:p-6 border-red-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="font-semibold text-red-500">Danger Zone</h2>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl px-4 py-2.5 font-medium transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-background rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Delete Account?</h3>
            <p className="text-muted-foreground mb-6">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn-outline">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-2.5 font-medium transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
