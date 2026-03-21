'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth-context'
import { type Profile, type UserRole, canManageRole, getAvailableRolesForManager } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import { format } from 'date-fns'
import { Users, Crown, Shield, UserCheck, Eye, KeyRound, Code } from 'lucide-react'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const roleConfig: Record<UserRole, { label: string; color: string; icon: React.ReactNode }> = {
  owner: {
    label: 'Owner',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    icon: <Crown className="h-4 w-4" />,
  },
  admin: {
    label: 'Admin',
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: <Shield className="h-4 w-4" />,
  },
  developer: {
    label: 'Developer',
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    icon: <Code className="h-4 w-4" />,
  },
  member: {
    label: 'Member',
    color: 'bg-primary/10 text-primary border-primary/20',
    icon: <UserCheck className="h-4 w-4" />,
  },
  viewer: {
    label: 'Viewer',
    color: 'bg-muted text-muted-foreground border-border',
    icon: <Eye className="h-4 w-4" />,
  },
}

export default function TeamPage() {
  const { profile } = useAuth()
  const { data: profiles, isLoading, mutate } = useSWR<Profile[]>('/api/profiles', fetcher)
  const [updating, setUpdating] = useState<string | null>(null)
  
  // Password change dialog state
  const [passwordDialog, setPasswordDialog] = useState<{ open: boolean; user: Profile | null }>({
    open: false,
    user: null,
  })
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const canManageTeam = profile?.role === 'owner' || profile?.role === 'admin'
  const availableRoles = profile ? getAvailableRolesForManager(profile.role) : []

  const handleRoleChange = async (userId: string, currentRole: UserRole, newRole: UserRole) => {
    if (!profile || !canManageRole(profile.role, currentRole)) {
      toast.error('You do not have permission to change this role')
      return
    }
    
    setUpdating(userId)
    try {
      const response = await fetch(`/api/profiles/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update role')
      }
      mutate()
      toast.success('Role updated successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setUpdating(null)
    }
  }

  const canChangePassword = (targetUser: Profile): boolean => {
    if (!profile) return false
    if (targetUser.id === profile.id) return false // Can't change own password here
    if (profile.role === 'owner') return targetUser.role !== 'owner' // Owner can change non-owners
    if (profile.role === 'admin') return ['member', 'viewer'].includes(targetUser.role)
    return false
  }

  const openPasswordDialog = (user: Profile) => {
    setPasswordDialog({ open: true, user })
    setNewPassword('')
    setConfirmPassword('')
  }

  const closePasswordDialog = () => {
    setPasswordDialog({ open: false, user: null })
    setNewPassword('')
    setConfirmPassword('')
  }

  const handlePasswordChange = async () => {
    if (!passwordDialog.user) return

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setChangingPassword(true)
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: passwordDialog.user.id,
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      toast.success(`Password changed for ${passwordDialog.user.username}`)
      closePasswordDialog()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const stats = {
    total: profiles?.length || 0,
    owners: profiles?.filter((p) => p.role === 'owner').length || 0,
    admins: profiles?.filter((p) => p.role === 'admin').length || 0,
    developers: profiles?.filter((p) => p.role === 'developer').length || 0,
    members: profiles?.filter((p) => p.role === 'member').length || 0,
    viewers: profiles?.filter((p) => p.role === 'viewer').length || 0,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
        <p className="text-muted-foreground">
          Manage team members and their permissions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.total}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Owners</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.owners}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Admins</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.admins}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Members</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.members}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Viewers</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.viewers}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Eye className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Understanding what each role can do
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-amber-500" />
                <span className="font-medium">Owner</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Full system control</li>
                <li>Manage all roles including Admins</li>
                <li>Change user passwords</li>
                <li>Cannot be demoted</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-destructive" />
                <span className="font-medium">Admin</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Create, edit, and delete tasks</li>
                <li>Manage Members and Viewers</li>
                <li>Change Member/Viewer passwords</li>
                <li>Approve/reject tasks</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2 mb-3">
                <Code className="h-5 w-5 text-emerald-500" />
                <span className="font-medium">Developer</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Create tasks (auto-assigned to self)</li>
                <li>Upload files to tasks</li>
                <li>Add comments</li>
                <li>Cannot set due date or assign others</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="h-5 w-5 text-primary" />
                <span className="font-medium">Member</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Upload files to tasks</li>
                <li>Add comments</li>
                <li>View all tasks</li>
                <li>Cannot change task status</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Viewer</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>View all tasks</li>
                <li>View activity log</li>
                <li>Download files</li>
                <li>Read-only access</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            All registered users and their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !profiles || profiles.length === 0 ? (
            <Empty
              icon={Users}
              title="No team members"
              description="Team members will appear here once they sign up."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {canManageTeam && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => {
                  const role = roleConfig[p.role]
                  const isSelf = p.id === profile?.id
                  const canChange = profile ? canManageRole(profile.role, p.role) : false
                  const canChangePwd = canChangePassword(p)
                  
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={p.avatar_url || undefined} />
                            <AvatarFallback>
                              {p.username?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {p.display_name || p.username}
                              {isSelf && (
                                <span className="text-xs text-muted-foreground ml-2">(You)</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        @{p.username}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${role.color}`}>
                          {role.icon}
                          <span className="ml-1">{role.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(p.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      {canManageTeam && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canChangePwd && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPasswordDialog(p)}
                                title="Change password"
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                            )}
                            {updating === p.id ? (
                              <Spinner />
                            ) : canChange && !isSelf ? (
                              <Select
                                value={p.role}
                                onValueChange={(v) => handleRoleChange(p.id, p.role, v as UserRole)}
                              >
                                <SelectTrigger className="w-[130px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRoles.map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {roleConfig[r].label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {isSelf ? 'Cannot change own role' : 'Protected'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialog.open} onOpenChange={(open) => !open && closePasswordDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Change password for user: <span className="font-medium">{passwordDialog.user?.username}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Field>
              <FieldLabel>New Password</FieldLabel>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                minLength={6}
              />
            </Field>
            <Field>
              <FieldLabel>Confirm Password</FieldLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                minLength={6}
              />
            </Field>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">Passwords do not match</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closePasswordDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordChange} 
              disabled={changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
            >
              {changingPassword ? <Spinner className="mr-2" /> : null}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
