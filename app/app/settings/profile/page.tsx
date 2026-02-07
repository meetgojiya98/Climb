"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ProfilePage() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    full_name: '',
    headline: '',
    location: '',
    email: '',
    target_roles: [] as string[],
  })
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          headline: data.headline || '',
          location: data.location || '',
          email: data.email || '',
          target_roles: data.target_roles || [],
        })
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          headline: profile.headline,
          location: profile.location,
          email: profile.email,
          target_roles: profile.target_roles,
        })
        .eq('user_id', user.id)

      if (error) throw error

      toast.success('Profile updated')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="headline">Professional Headline</Label>
            <Input
              id="headline"
              placeholder="Senior Software Engineer | Full-stack Developer"
              value={profile.headline}
              onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="San Francisco, CA"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_roles">Target Roles</Label>
            <Textarea
              id="target_roles"
              placeholder="Software Engineer, Product Manager, Designer"
              value={profile.target_roles.join(', ')}
              onChange={(e) => setProfile({ 
                ...profile, 
                target_roles: e.target.value.split(',').map(r => r.trim()).filter(Boolean)
              })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Comma-separated list</p>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
