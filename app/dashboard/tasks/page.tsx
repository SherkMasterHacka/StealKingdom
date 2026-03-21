'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth-context'
import { CATEGORIES, STATUSES, PRIORITIES, type Task, type Profile, type TaskCategory, type TaskStatus } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty } from '@/components/ui/empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CreateTaskDialog } from '@/components/dashboard/create-task-dialog'
import { formatDistanceToNow, format } from 'date-fns'
import { Plus, ListTodo, Calendar, User } from 'lucide-react'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function TasksContent() {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category') as TaskCategory | null
  
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>(categoryParam || 'all')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  
  // Sync filter state with URL parameter when it changes
  useEffect(() => {
    if (categoryParam) {
      setCategoryFilter(categoryParam)
    } else {
      setCategoryFilter('all')
    }
  }, [categoryParam])
  const [createOpen, setCreateOpen] = useState(false)
  
  const { profile } = useAuth()
  const { data: tasks, isLoading, mutate } = useSWR<Task[]>('/api/tasks', fetcher)
  const { data: profiles } = useSWR<Profile[]>('/api/profiles', fetcher)

  const filteredTasks = tasks?.filter((task) => {
    if (categoryFilter !== 'all' && task.category !== categoryFilter) return false
    if (statusFilter !== 'all' && task.status !== statusFilter) return false
    return true
  })

  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin'
  const canCreate = isAdmin || profile?.role === 'developer'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track all game development tasks
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TaskCategory | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${cat.color}`} />
                  {cat.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : !filteredTasks || filteredTasks.length === 0 ? (
        <Empty
          icon={ListTodo}
          title="No tasks found"
          description={
            categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters to see more tasks.'
              : 'Create your first task to get started.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const category = CATEGORIES.find((c) => c.value === task.category)
            const status = STATUSES.find((s) => s.value === task.status)
            const priority = PRIORITIES.find((p) => p.value === task.priority)
            
            return (
              <Link key={task.id} href={`/dashboard/tasks/${task.id}`}>
                <Card className="h-full hover:bg-accent/30 transition-colors cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-3 w-3 rounded-full ${category?.color}`} />
                        <span className="text-xs text-muted-foreground">{category?.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {status?.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={`${priority?.color}`}>
                          {priority?.label} Priority
                        </span>
                      </div>
                      
                      {task.due_date && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Due {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      
                      {task.assignee && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={task.assignee.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {task.assignee.username?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{task.assignee.display_name || task.assignee.username}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        profiles={profiles || []}
        onCreated={() => mutate()}
      />
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    }>
      <TasksContent />
    </Suspense>
  )
}
