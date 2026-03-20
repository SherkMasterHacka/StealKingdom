'use client'

import useSWR from 'swr'
import { type ActivityLog } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty } from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow, format } from 'date-fns'
import { Activity, Plus, Edit, Trash2, MessageSquare, Upload } from 'lucide-react'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const actionIcons: Record<string, React.ReactNode> = {
  created_task: <Plus className="h-4 w-4" />,
  updated_task: <Edit className="h-4 w-4" />,
  deleted_task: <Trash2 className="h-4 w-4" />,
  added_comment: <MessageSquare className="h-4 w-4" />,
  uploaded_file: <Upload className="h-4 w-4" />,
}

const actionColors: Record<string, string> = {
  created_task: 'bg-green-500',
  updated_task: 'bg-blue-500',
  deleted_task: 'bg-red-500',
  added_comment: 'bg-purple-500',
  uploaded_file: 'bg-orange-500',
}

export default function ActivityPage() {
  const { data: activity, isLoading } = useSWR<ActivityLog[]>('/api/activity?limit=50', fetcher)

  // Group activities by date
  const groupedActivity = activity?.reduce((groups, log) => {
    const date = format(new Date(log.created_at), 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(log)
    return groups
  }, {} as Record<string, ActivityLog[]>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity</h1>
        <p className="text-muted-foreground">
          Track all actions and updates across your team
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            All task updates, comments, and file uploads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : !activity || activity.length === 0 ? (
            <Empty
              icon={Activity}
              title="No activity yet"
              description="Activity will appear here once team members start working on tasks."
            />
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-8">
                {groupedActivity && Object.entries(groupedActivity).map(([date, logs]) => (
                  <div key={date}>
                    <div className="sticky top-0 bg-background py-2 z-10">
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                      </Badge>
                    </div>
                    <div className="space-y-4 mt-4">
                      {logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-4">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={log.user?.avatar_url || undefined} />
                              <AvatarFallback>
                                {log.user?.username?.slice(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ${actionColors[log.action] || 'bg-muted'} flex items-center justify-center`}
                            >
                              <span className="text-white text-xs">
                                {actionIcons[log.action] || <Activity className="h-3 w-3" />}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">
                                {log.user?.display_name || log.user?.username}
                              </span>
                              {' '}
                              <span className="text-muted-foreground">
                                {formatActionText(log.action)}
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
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                                {formatDetails(log.action, log.details)}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function formatActionText(action: string): string {
  switch (action) {
    case 'created_task':
      return 'created task'
    case 'updated_task':
      return 'updated task'
    case 'deleted_task':
      return 'deleted a task'
    case 'added_comment':
      return 'commented on'
    case 'uploaded_file':
      return 'uploaded a file to'
    default:
      return action.replace(/_/g, ' ')
  }
}

function formatDetails(action: string, details: Record<string, unknown>): string {
  if (action === 'updated_task' && details.changes) {
    const changes = details.changes as Record<string, { from: unknown; to: unknown }>
    return Object.entries(changes)
      .map(([key, { from, to }]) => `${key}: ${from} → ${to}`)
      .join(', ')
  }
  if (action === 'added_comment' && details.message) {
    return String(details.message)
  }
  if (action === 'uploaded_file' && details.file_name) {
    return `File: ${details.file_name}`
  }
  if (action === 'deleted_task' && details.title) {
    return `Task: ${details.title}`
  }
  return JSON.stringify(details)
}
