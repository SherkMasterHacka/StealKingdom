export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

export type TaskCategory = 'model' | 'animation' | 'sound' | 'vfx' | 'ui' | 'programming'

export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'approved' | 'rejected' | 'completed'

export type TaskPriority = 'low' | 'medium' | 'high'

export type NotificationType = 'task_assigned' | 'task_updated' | 'task_approved' | 'task_rejected' | 'file_uploaded' | 'comment_added'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  category: TaskCategory
  assigned_to: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  feedback: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined data
  assignee?: Profile | null
  creator?: Profile | null
  files?: TaskFile[]
  comments?: Comment[]
  // Counts for list display
  file_count?: number
  comment_count?: number
}

export interface TaskFile {
  id: string
  task_id: string
  file_name: string
  file_url: string
  file_size: number | null
  file_type: string | null
  version: number
  uploaded_by: string | null
  created_at: string
  uploader?: Profile | null
}

export interface Comment {
  id: string
  task_id: string
  user_id: string
  message: string
  created_at: string
  updated_at: string
  user?: Profile | null
}

export interface ActivityLog {
  id: string
  task_id: string | null
  user_id: string | null
  action: string
  details: Record<string, unknown> | null
  created_at: string
  user?: Profile | null
  task?: Task | null
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  task_id: string | null
  read: boolean
  created_at: string
}

export const CATEGORIES: { value: TaskCategory; label: string; color: string }[] = [
  { value: 'model', label: 'Model', color: 'bg-blue-500' },
  { value: 'animation', label: 'Animation', color: 'bg-orange-500' },
  { value: 'sound', label: 'Sound', color: 'bg-green-500' },
  { value: 'vfx', label: 'VFX', color: 'bg-pink-500' },
  { value: 'ui', label: 'UI', color: 'bg-cyan-500' },
  { value: 'programming', label: 'Programming', color: 'bg-yellow-500' },
]

export const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
]

export const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'text-muted-foreground' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'high', label: 'High', color: 'text-destructive' },
]

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-500',
  review: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-green-500/10 text-green-500',
  rejected: 'bg-red-500/10 text-red-500',
  completed: 'bg-emerald-500/10 text-emerald-500',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-amber-500/10 text-amber-500',
  admin: 'bg-red-500/10 text-red-500',
  member: 'bg-blue-500/10 text-blue-500',
  viewer: 'bg-muted text-muted-foreground',
}

// Role permission helpers
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  if (managerRole === 'owner') return targetRole !== 'owner'
  if (managerRole === 'admin') return targetRole === 'member' || targetRole === 'viewer'
  return false
}

export function getAvailableRolesForManager(managerRole: UserRole): UserRole[] {
  if (managerRole === 'owner') return ['admin', 'member', 'viewer']
  if (managerRole === 'admin') return ['member', 'viewer']
  return []
}
