'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { Settings, User, Shield } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', profile?.id)

      if (error) throw error
      await refreshProfile()
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Username</FieldLabel>
              <Input value={profile?.username || ''} disabled />
              <p className="text-xs text-muted-foreground mt-1">
                Your username cannot be changed
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="displayName">Display Name</FieldLabel>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
            </Field>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving && <Spinner className="mr-2" />}
              Save Changes
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role & Permissions
          </CardTitle>
          <CardDescription>
            Your current access level
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Current Role</p>
              <p className="text-lg font-bold capitalize">{profile?.role}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Your Permissions</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {profile?.role === 'admin' && (
                  <>
                    <li>Create, edit, and delete tasks</li>
                    <li>Manage team member roles</li>
                    <li>Upload and delete files</li>
                    <li>Full system access</li>
                  </>
                )}
                {profile?.role === 'member' && (
                  <>
                    <li>Update task status and priority</li>
                    <li>Upload files to tasks</li>
                    <li>Add comments</li>
                    <li>View all tasks and activity</li>
                  </>
                )}
                {profile?.role === 'viewer' && (
                  <>
                    <li>View all tasks</li>
                    <li>View activity log</li>
                    <li>Download files</li>
                    <li>Read-only access</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>
            Account information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Member Since</p>
              <p className="text-muted-foreground">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
