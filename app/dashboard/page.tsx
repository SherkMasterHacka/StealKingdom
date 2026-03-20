'use client'

import useSWR from 'swr'
import { useAuth } from '@/lib/auth-context'
import { CATEGORIES, STATUSES, type Task, type ActivityLog } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty } from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { ListTodo, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
  const { profile } = useAuth()
  const { data: tasks, isLoading: tasksLoading } = useSWR<Task[]>('/api/tasks', fetcher)
  const { data: activity, isLoading: activityLoading } = useSWR<ActivityLog[]>('/api/activity?limit=10', fetcher)

  const stats = {
    total: tasks?.length || 0,
    pending: tasks?.filter((t) => t.status === 'pending').length || 0,
    inProgress: tasks?.filter((t) => t.status === 'in_progress').length || 0,
    review: tasks?.filter((t) => t.status === 'review').length || 0,
    approved: tasks?.filter((t) => t.status === 'approved').length || 0,
    rejected: tasks?.filter((t) => t.status === 'rejected').length || 0,
    completed: tasks?.filter((t) => t.status === 'completed' || t.status === 'approved').length || 0,
  }

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  const myTasks = tasks?.filter((t) => t.assigned_to === profile?.id) || []
  const upcomingDue = tasks
    ?.filter((t) => t.due_date && t.status !== 'completed')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {profile?.display_name || profile?.username}
        </h1>
        <p className="text-muted-foreground">
          {"Here's what's happening with your game development tasks."}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                {tasksLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold">{stats.total}</p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <ListTodo className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                {tasksLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold">{stats.inProgress}</p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Review</p>
                {tasksLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold">{stats.review}</p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                {tasksLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold">{stats.completed}</p>
                )}
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>Task completion rate across all categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-4xl font-bold">{completionRate}%</span>
                <span className="text-sm text-muted-foreground">
                  {stats.completed} of {stats.total} tasks
                </span>
              </div>
              <Progress value={completionRate} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks by Category</CardTitle>
            <CardDescription>Distribution across development areas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {CATEGORIES.map((cat) => {
                const count = tasks?.filter((t) => t.category === cat.value).length || 0
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={cat.value} className="flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full ${cat.color}`} />
                    <span className="text-sm flex-1">{cat.label}</span>
                    <span className="text-sm text-muted-foreground">{count}</span>
                    <div className="w-24">
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Tasks & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
            <CardDescription>Tasks assigned to you</CardDescription>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : myTasks.length === 0 ? (
              <Empty
                icon={ListTodo}
                title="No tasks assigned"
                description="You don't have any tasks assigned yet."
              />
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {myTasks.slice(0, 10).map((task) => {
                    const category = CATEGORIES.find((c) => c.value === task.category)
                    const status = STATUSES.find((s) => s.value === task.status)
                    return (
                      <Link
                        key={task.id}
                        href={`/dashboard/tasks/${task.id}`}
                        className="block p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`h-2 w-2 rounded-full ${category?.color}`} />
                              <span className="text-xs text-muted-foreground">{category?.label}</span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {status?.label}
                          </Badge>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your team</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !activity || activity.length === 0 ? (
              <Empty
                icon={Clock}
                title="No activity yet"
                description="Activity will appear here once team members start working."
              />
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {activity.map((log) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={log.user?.avatar_url || undefined} />
                        <AvatarFallback>
                          {log.user?.username?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.user?.display_name || log.user?.username}</span>
                          {' '}
                          <span className="text-muted-foreground">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          {log.task && (
                            <>
                              {' '}
                              <Link
                                href={`/dashboard/tasks/${log.task.id}`}
                                className="font-medium hover:underline"
                              >
                                {log.task.title}
                              </Link>
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Due Dates */}
      {upcomingDue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Due Dates</CardTitle>
            <CardDescription>Tasks that need attention soon</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {upcomingDue.map((task) => {
                const category = CATEGORIES.find((c) => c.value === task.category)
                const dueDate = new Date(task.due_date!)
                const isOverdue = dueDate < new Date()
                return (
                  <Link
                    key={task.id}
                    href={`/dashboard/tasks/${task.id}`}
                    className="p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`h-2 w-2 rounded-full ${category?.color}`} />
                      <span className="text-xs text-muted-foreground">{category?.label}</span>
                    </div>
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    <p className={`text-xs mt-2 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {isOverdue ? 'Overdue: ' : 'Due: '}
                      {formatDistanceToNow(dueDate, { addSuffix: true })}
                    </p>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
