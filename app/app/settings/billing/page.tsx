"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function BillingPage() {
  const [plan, setPlan] = useState<'free' | 'pro'>('free')
  const [periodEnd, setPeriodEnd] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const loadBilling = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('billing')
        .select('plan, period_end')
        .eq('user_id', user.id)
        .single()

      if (error) {
        // No billing row yet: default to free.
        if (error.code !== 'PGRST116') {
          throw error
        }
        return
      }

      if (data) {
        setPlan(data.plan as 'free' | 'pro')
        setPeriodEnd(data.period_end || null)
      }
    } catch (error) {
      console.error('Failed to load billing:', error)
    }
  }, [])

  useEffect(() => {
    loadBilling()
  }, [loadBilling])

  const handlePlanChange = async (nextPlan: 'free' | 'pro') => {
    setUpdating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const nextPeriodEnd = nextPlan === 'pro'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null

      const { error } = await supabase
        .from('billing')
        .upsert({
          user_id: user.id,
          plan: nextPlan,
          period_end: nextPeriodEnd,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      setPlan(nextPlan)
      setPeriodEnd(nextPeriodEnd)
      toast.success(nextPlan === 'pro' ? 'Upgraded to Pro successfully' : 'Subscription moved to Free plan')
    } catch (error: any) {
      console.error('Failed to update billing plan:', error)
      toast.error(error.message || 'Could not update subscription')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Manage your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-climb/10">
                <CreditCard className="h-6 w-6 text-climb" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold capitalize">{plan}</span>
                  <Badge variant={plan === 'pro' ? 'default' : 'secondary'}>
                    {plan === 'pro' ? 'Active' : 'Current'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan === 'pro' ? '$9/month' : 'Free forever'}
                </p>
                {plan === 'pro' && periodEnd && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Renews on {new Date(periodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            {plan === 'free' && (
              <Button variant="climb" onClick={() => handlePlanChange('pro')} disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Upgrade to Pro'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Free Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Perfect for getting started</CardDescription>
            <div className="pt-4">
              <span className="text-3xl font-semibold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-climb" />
                <span>3 roles per month</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-climb" />
                <span>1 tailored resume per role</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-climb" />
                <span>Cover letter generation</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-climb" />
                <span>PDF export</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="border-climb">
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>For serious job seekers</CardDescription>
            <div className="pt-4">
              <span className="text-3xl font-semibold">$9</span>
              <span className="text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-climb" />
                <span className="font-medium">Everything in Free, plus:</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-climb" />
                <span>Unlimited roles</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-climb" />
                <span>Unlimited tailored versions</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-climb" />
                <span>Version history</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-climb" />
                <span>DOCX export</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-climb" />
                <span>Premium templates</span>
              </li>
              <li className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-climb" />
                <span>Insights dashboard</span>
              </li>
            </ul>
            {plan === 'free' && (
              <Button
                variant="climb"
                className="mt-6 w-full"
                onClick={() => handlePlanChange('pro')}
                disabled={updating}
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Upgrade Now'
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {plan === 'pro' && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You can switch plans at any time. Changes are reflected immediately.
            </p>
            <Button variant="outline" onClick={() => handlePlanChange('free')} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
