'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { CATEGORIES, STATUSES, PRIORITIES, STATUS_COLORS, type Profile, type Task, type Comment, type TaskFile, type TaskCategory, type TaskStatus, type TaskPriority } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, formatDistanceToNow } from 'date-fns'
import { X, CalendarIcon, Paperclip, MessageSquare, Trash2, Upload, Download, FileText, CheckCircle, XCircle, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface TaskDetailPanelProps {
  task: Task
  currentUser: Profile
  members: Profile[]
  onClose: () => void
  onTaskUpdated: (task: Task) => void
  onTaskDeleted: (taskId: string) => void
  canEditTasks: boolean
  canDeleteTasks: boolean
}

export function TaskDetailPanel({
  task,
  currentUser,
  members,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  canEditTasks,
  canDeleteTasks,
}: TaskDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [category, setCategory] = useState<TaskCategory>(task.category)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [assignedTo, setAssignedTo] = useState(task.assigned_to || '')
  const [dueDate, setDueDate] = useState<Date | undefined>(task.due_date ? new Date(task.due_date) : undefined)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectFeedback, setRejectFeedback] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const { data: comments, mutate: mutateComments } = useSWR<Comment[]>(`/api/tasks/${task.id}/comments`, fetcher)
  const { data: files, mutate: mutateFiles } = useSWR<TaskFile[]>(`/api/tasks/${task.id}/files`, fetcher)

  const isAdmin = currentUser.role === 'owner' || currentUser.role === 'admin'
  const isDeveloper = currentUser.role === 'developer'
  const canUploadFiles = isAdmin || isDeveloper || currentUser.role === 'member'
  const canApproveReject = isAdmin && task.status === 'review'

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          category,
          status,
          priority,
          assigned_to: assignedTo || null,
          due_date: dueDate?.toISOString() || null,
        }),
      })

      if (!response.ok) throw new Error('Failed to update task')

      const updatedTask = await response.json()
      onTaskUpdated(updatedTask)
      setIsEditing(false)
      toast.success('Task updated')
    } catch {
      toast.error('Failed to update task')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setStatus(newStatus)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      const updatedTask = await response.json()
      onTaskUpdated(updatedTask)
      toast.success('Status updated')
    } catch {
      setStatus(task.status)
      toast.error('Failed to update status')
    }
  }

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', feedback: null }),
      })

      if (!response.ok) throw new Error('Failed to approve task')

      const updatedTask = await response.json()
      setStatus('approved')
      onTaskUpdated(updatedTask)
      toast.success('Task approved')
    } catch {
      toast.error('Failed to approve task')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectFeedback.trim()) {
      toast.error('Please provide feedback for rejection')
      return
    }
    
    setIsRejecting(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', feedback: rejectFeedback }),
      })

      if (!response.ok) throw new Error('Failed to reject task')

      const updatedTask = await response.json()
      setStatus('rejected')
      onTaskUpdated(updatedTask)
      setShowRejectDialog(false)
      setRejectFeedback('')
      toast.success('Task rejected with feedback')
    } catch {
      toast.error('Failed to reject task')
    } finally {
      setIsRejecting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete task')
      
      onTaskDeleted(task.id)
      toast.success('Task deleted')
    } catch {
      toast.error('Failed to delete task')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    
    setIsSubmittingComment(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newComment }),
      })

      if (!response.ok) throw new Error('Failed to add comment')

      setNewComment('')
      mutateComments()
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const [isDragging, setIsDragging] = useState(false)

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    if (!uploadResponse.ok) {
      if (uploadResponse.status === 413) throw new Error('ไฟล์ใหญ่เกินไป (สูงสุด 4.5MB)')
      const text = await uploadResponse.text()
      try { throw new Error(JSON.parse(text).error) } catch { throw new Error(text || 'Upload failed') }
    }
    const uploadData = await uploadResponse.json()

    const fileResponse = await fetch(`/api/tasks/${task.id}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_name: uploadData.file_name,
        file_url: uploadData.pathname,
        file_size: uploadData.file_size,
        file_type: uploadData.file_type,
      }),
    })

    if (!fileResponse.ok) throw new Error('Failed to save file')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    await handleFiles(Array.from(fileList))
    e.target.value = ''
  }

  const handleFiles = async (fileList: File[]) => {
    setIsUploading(true)
    try {
      for (const file of fileList) {
        await uploadFile(file)
      }
      mutateFiles()
      toast.success(fileList.length > 1 ? `${fileList.length} files uploaded` : 'File uploaded')
    } catch {
      toast.error('Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canUploadFiles) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!canUploadFiles) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return
    await handleFiles(droppedFiles)
  }

  const categoryConfig = CATEGORIES.find(c => c.value === task.category)
  const canComment = currentUser.role !== 'viewer'

  // Group files by name for versioning display
  const groupedFiles = files?.reduce((acc, file) => {
    const baseName = file.file_name.replace(/\s*v\d+$/, '')
    if (!acc[baseName]) {
      acc[baseName] = []
    }
    acc[baseName].push(file)
    return acc
  }, {} as Record<string, TaskFile[]>)

  return (
    <div className="w-96 border-l border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={cn('text-xs text-white', categoryConfig?.color)}>
            {categoryConfig?.label}
          </Badge>
          <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[task.status])}>
            {STATUSES.find(s => s.value === task.status)?.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {canDeleteTasks && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Task</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this task? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? <Spinner className="mr-2" /> : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Approval/Reject buttons for admin when task is in review */}
          {canApproveReject && (
            <div className="flex gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <Button 
                onClick={handleApprove} 
                disabled={isApproving}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isApproving ? <Spinner className="mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Approve
              </Button>
              <Button 
                variant="destructive"
                onClick={() => setShowRejectDialog(true)}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          )}

          {/* Feedback display for rejected tasks */}
          {task.status === 'rejected' && task.feedback && (
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-xs font-medium text-red-500 uppercase mb-1">Rejection Feedback</p>
              <p className="text-sm">{task.feedback}</p>
            </div>
          )}

          {/* Title & Description */}
          {isEditing ? (
            <div className="space-y-3">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3} />
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold mb-2">{task.title}</h2>
              {task.description && (
                <p className="text-sm text-muted-foreground">{task.description}</p>
              )}
            </div>
          )}

{/* Status - Only admin/owner can change */}
  <div className="space-y-2">
  <label className="text-xs font-medium text-muted-foreground uppercase">Status</label>
  {isAdmin ? (
  <Select value={status} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
  <SelectTrigger>
  <SelectValue />
  </SelectTrigger>
  <SelectContent>
  {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge className={cn('text-sm', STATUS_COLORS[status])}>
              {STATUSES.find(s => s.value === status)?.label}
            </Badge>
          )}
          </div>

          {/* Edit mode fields */}
          {isEditing && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Category</label>
                  <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', c.color)} />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Priority</label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <span className={p.color}>{p.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase">Assignee</label>
                <Select value={assignedTo || 'unassigned'} onValueChange={(v) => setAssignedTo(v === 'unassigned' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.display_name || m.username}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase">Due Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left', !dueDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'PPP') : 'No due date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={setDueDate} />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {/* Details (non-editing) */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Priority</p>
                <Badge variant="outline" className={PRIORITIES.find(p => p.value === task.priority)?.color}>
                  {PRIORITIES.find(p => p.value === task.priority)?.label}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Due Date</p>
                <p>{task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'None'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground uppercase mb-1">Assignee</p>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {(task.assignee.display_name || task.assignee.username).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{task.assignee.display_name || task.assignee.username}</span>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Unassigned</p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {canEditTasks && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                    {isSaving && <Spinner className="mr-2" />}
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)} className="flex-1">
                  Edit Task
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* Files with versioning */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Files ({files?.length || 0})
              </h3>
              {canUploadFiles && (
                <label className="cursor-pointer">
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} multiple />
                  <Button variant="ghost" size="sm" disabled={isUploading} asChild>
                    <span>
                      {isUploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                    </span>
                  </Button>
                </label>
              )}
            </div>

            {/* Drag & Drop Zone */}
            {canUploadFiles && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/10 scale-[1.02]"
                    : "border-muted-foreground/20 hover:border-muted-foreground/40"
                )}
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.multiple = true
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files
                    if (files) handleFiles(Array.from(files))
                  }
                  input.click()
                }}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="h-4 w-4" />
                    กำลังอัปโหลด...
                  </div>
                ) : isDragging ? (
                  <p className="text-sm text-primary font-medium">ปล่อยไฟล์ที่นี่</p>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <Upload className="h-5 w-5 mx-auto mb-1 opacity-50" />
                    <p>ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก</p>
                  </div>
                )}
              </div>
            )}

            {files && files.length > 0 ? (
              <div className="space-y-2">
                {Object.entries(groupedFiles || {}).map(([baseName, versions]) => (
                  <div key={baseName} className="space-y-1">
                    {versions.sort((a, b) => b.version - a.version).map((file, idx) => (
                      <div key={file.id} className={cn(
                        "flex items-center gap-2 p-2 rounded-lg text-sm",
                        idx === 0 ? "bg-muted/50" : "bg-muted/20 ml-4"
                      )}>
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="flex-1 truncate">{file.file_name}</span>
                        {file.version > 1 && (
                          <Badge variant="outline" className="text-xs">
                            <History className="h-3 w-3 mr-1" />
                            v{file.version}
                          </Badge>
                        )}
                        <a href={`/api/file?pathname=${encodeURIComponent(file.file_url)}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Download className="h-3 w-3" />
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No files attached</p>
            )}
          </div>

          <Separator />

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments?.length || 0})
            </h3>
            
            {comments && comments.length > 0 && (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs">
                        {(comment.user?.display_name || comment.user?.username || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.user?.display_name || comment.user?.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canComment && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                />
                <Button size="sm" onClick={handleAddComment} disabled={isSubmittingComment || !newComment.trim()}>
                  {isSubmittingComment ? <Spinner /> : 'Send'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Task</DialogTitle>
            <DialogDescription>
              Please provide feedback explaining why this task is being rejected.
            </DialogDescription>
          </DialogHeader>
          <Textarea 
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            placeholder="Enter feedback for the assignee..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting || !rejectFeedback.trim()}>
              {isRejecting && <Spinner className="mr-2" />}
              Reject Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
