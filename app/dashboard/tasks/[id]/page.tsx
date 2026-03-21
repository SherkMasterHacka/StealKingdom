'use client'

import { use, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth-context'
import { CATEGORIES, STATUSES, PRIORITIES, type Task, type Profile, type TaskStatus, type TaskPriority } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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
import { format, formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Calendar, FileText, MessageSquare, Trash2, Upload, Download } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { profile } = useAuth()
  const { data: task, isLoading, mutate } = useSWR<Task>(`/api/tasks/${id}`, fetcher)
  const { data: profiles } = useSWR<Profile[]>('/api/profiles', fetcher)
  
  const [comment, setComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin'
  const isMember = profile?.role === 'owner' || profile?.role === 'admin' || profile?.role === 'member' || profile?.role === 'developer'
  const [isDragging, setIsDragging] = useState(false)

  const category = CATEGORIES.find((c) => c.value === task?.category)
  const status = STATUSES.find((s) => s.value === task?.status)
  const priority = PRIORITIES.find((p) => p.value === task?.priority)

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      mutate()
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })
      if (!response.ok) throw new Error('Failed to update priority')
      mutate()
      toast.success('Priority updated')
    } catch {
      toast.error('Failed to update priority')
    }
  }

  const handleAssigneeChange = async (assigneeId: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: assigneeId || null }),
      })
      if (!response.ok) throw new Error('Failed to update assignee')
      mutate()
      toast.success('Assignee updated')
    } catch {
      toast.error('Failed to update assignee')
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return

    setSubmittingComment(true)
    try {
      const response = await fetch(`/api/tasks/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: comment }),
      })
      if (!response.ok) throw new Error('Failed to add comment')
      mutate()
      setComment('')
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })
    if (!uploadResponse.ok) throw new Error('Upload failed')
    const uploadData = await uploadResponse.json()

    const fileResponse = await fetch(`/api/tasks/${id}/files`, {
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

  const handleFiles = async (fileList: File[]) => {
    setUploading(true)
    try {
      for (const file of fileList) {
        await uploadFile(file)
      }
      mutate()
      toast.success(fileList.length > 1 ? `${fileList.length} files uploaded` : 'File uploaded')
    } catch {
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    await handleFiles(Array.from(fileList))
    e.target.value = ''
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isMember) setIsDragging(true)
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
    if (!isMember) return
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length === 0) return
    await handleFiles(droppedFiles)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete task')
      toast.success('Task deleted')
      router.push('/dashboard/tasks')
    } catch {
      toast.error('Failed to delete task')
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Task not found</h2>
        <p className="text-muted-foreground mt-2">This task may have been deleted.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/tasks">Back to Tasks</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${category?.color}`} />
            <span className="text-sm text-muted-foreground">{category?.label}</span>
          </div>
          <h1 className="text-2xl font-bold mt-1">{task.title}</h1>
        </div>
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
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
                <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                  {deleting && <Spinner className="mr-2" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {task.description || 'No description provided.'}
              </p>
            </CardContent>
          </Card>

          {/* Files */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Files
                </CardTitle>
                {isMember && (
                  <div>
                    <Input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      multiple
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Spinner className="mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Upload
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isMember && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className={`mb-4 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-primary bg-primary/10 scale-[1.02]'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก
                  </p>
                </div>
              )}
              {task.files && task.files.length > 0 ? (
                <div className="space-y-2">
                  {task.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.file_size ? `${Math.round(file.file_size / 1024)} KB` : ''}
                            {file.uploader && ` • Uploaded by ${file.uploader.display_name || file.uploader.username}`}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/api/file?pathname=${encodeURIComponent(file.file_url)}`} download={file.file_name}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No files attached yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.comments && task.comments.length > 0 ? (
                <div className="space-y-4">
                  {task.comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={c.user?.avatar_url || undefined} />
                        <AvatarFallback>
                          {c.user?.username?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {c.user?.display_name || c.user?.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {c.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No comments yet.
                </p>
              )}

              {isMember && (
                <>
                  <Separator />
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={submittingComment || !comment.trim()}>
                      {submittingComment && <Spinner className="mr-2" />}
                      Send
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Status</p>
                {isAdmin ? (
                  <Select value={task.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary">{status?.label}</Badge>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Priority</p>
                {isMember ? (
                  <Select value={task.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          <span className={p.color}>{p.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={priority?.color}>{priority?.label}</span>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Assignee</p>
                {isMember ? (
                  <Select
                    value={task.assigned_to || 'unassigned'}
                    onValueChange={(v) => handleAssigneeChange(v === 'unassigned' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {profiles?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.display_name || p.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignee.avatar_url || undefined} />
                      <AvatarFallback>
                        {task.assignee.username?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {task.assignee.display_name || task.assignee.username}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </div>

              {task.due_date && (
                <div>
                  <p className="text-sm font-medium mb-2">Due Date</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(task.due_date), 'PPP')}</span>
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-sm font-medium mb-2">Created</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(task.created_at), 'PPP')}
                  {task.creator && (
                    <> by {task.creator.display_name || task.creator.username}</>
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Last Updated</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
