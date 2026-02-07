import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Download, Trash2 } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Privacy</CardTitle>
          <CardDescription>Manage your data and privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
              <Shield className="h-4 w-4" />
              Your data is secure
            </h3>
            <p className="text-sm text-muted-foreground">
              All your data is encrypted at rest and in transit. We never sell your information to third parties.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">Data Management</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Download className="h-4 w-4" />
                Export all my data
              </Button>
              <Button variant="destructive" className="w-full justify-start gap-2">
                <Trash2 className="h-4 w-4" />
                Delete my account
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Read our full{' '}
              <a href="/legal/privacy" className="text-climb hover:underline">
                Privacy Policy
              </a>{' '}
              for more details on how we handle your data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
