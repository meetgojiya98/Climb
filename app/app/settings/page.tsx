"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Shield, 
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  LogOut
} from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const notificationsStorageKey = 'climb:notification-preferences'

  const fetchProfile = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/signin')
        return
      }

      setProfile({
        full_name: user.user_metadata?.full_name || "",
        email: user.email || "",
      })

      // Fetch profile from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(prev => ({
          ...prev,
          full_name: profileData.full_name || prev.full_name,
        }))
      }

      const storedNotifications = localStorage.getItem(`${notificationsStorageKey}:${user.id}`)
      if (storedNotifications) {
        try {
          const parsed = JSON.parse(storedNotifications)
          setNotifications(prev => ({ ...prev, ...parsed }))
        } catch {
          localStorage.removeItem(`${notificationsStorageKey}:${user.id}`)
        }
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
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Update auth metadata
      await supabase.auth.updateUser({
        data: { full_name: profile.full_name }
      })

      // Update profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (error) {
      console.error('Error saving profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleSaveNotifications = async () => {
    setSavingNotifications(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
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

  const handleDeleteAccount = async () => {
    // This would require server-side implementation
    setMessage({ type: 'error', text: 'Please contact support to delete your account.' })
    setShowDeleteConfirm(false)
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-500/10 text-green-600' 
            : 'bg-red-500/10 text-red-600'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Profile Settings */}
      <div className="card-elevated p-6">
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
            <input
              type="email"
              value={profile.email}
              disabled
              className="input-field bg-secondary cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="btn-saffron"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-navy-500/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-navy-600" />
          </div>
          <h2 className="font-semibold">Notifications</h2>
        </div>
        
        <div className="space-y-4">
          {[
            { key: 'email_updates', label: 'Email Updates', desc: 'Receive product updates and news' },
            { key: 'application_reminders', label: 'Application Reminders', desc: 'Get reminded about pending applications' },
            { key: 'interview_reminders', label: 'Interview Reminders', desc: 'Notifications before scheduled interviews' },
            { key: 'weekly_summary', label: 'Weekly Summary', desc: 'Receive a weekly progress report' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <button
                onClick={() => setNotifications({ 
                  ...notifications, 
                  [item.key]: !notifications[item.key as keyof typeof notifications] 
                })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  notifications[item.key as keyof typeof notifications] 
                    ? 'bg-saffron-500' 
                    : 'bg-secondary'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  notifications[item.key as keyof typeof notifications] 
                    ? 'translate-x-6' 
                    : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
          <button
            onClick={handleSaveNotifications}
            disabled={savingNotifications}
            className="btn-outline"
          >
            {savingNotifications ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Notification Preferences
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="card-elevated p-6">
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
          <button 
            onClick={handleSignOut}
            className="btn-outline w-full justify-start text-muted-foreground"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card-elevated p-6 border-red-500/20">
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

      {/* Delete Confirmation */}
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
              <button 
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
