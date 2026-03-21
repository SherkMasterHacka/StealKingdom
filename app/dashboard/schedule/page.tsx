'use client'

import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty } from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow, format, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns'
import {
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Trash2,
  Clock,
  AlertTriangle,
  CalendarDays,
  ListTodo,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface ScheduleItem {
  id: string
  user_id: string
  title: string
  description: string | null
  due_date: string | null
  due_time: string | null
  priority: 'low' | 'medium' | 'high'
  completed: boolean
  task_id: string | null
  created_at: string
  updated_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const priorityColors = {
  low: 'text-muted-foreground',
  medium: 'text-yellow-500',
  high: 'text-red-500',
}

const priorityBadgeColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-red-500/10 text-red-500',
}

export default function SchedulePage() {
  const { profile } = useAuth()
  const { data: items, isLoading } = useSWR<ScheduleItem[]>('/api/schedule', fetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newDueTime, setNewDueTime] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all')

  const handleAddItem = async () => {
    if (!newTitle.trim()) return

    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        description: newDescription || null,
        due_date: newDueDate || null,
        due_time: newDueTime || null,
        priority: newPriority,
      }),
    })

    setNewTitle('')
    setNewDescription('')
    setNewDueDate('')
    setNewDueTime('')
    setNewPriority('medium')
    setDialogOpen(false)
    mutate('/api/schedule')
  }

  const handleToggleComplete = async (item: ScheduleItem) => {
    await fetch(`/api/schedule/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !item.completed }),
    })
    mutate('/api/schedule')
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/schedule/${id}`, { method: 'DELETE' })
    mutate('/api/schedule')
  }

  const filteredItems = items?.filter((item) => {
    if (filter === 'completed') return item.completed
    if (filter === 'today') return item.due_date && isToday(new Date(item.due_date)) && !item.completed
    if (filter === 'upcoming') return item.due_date && !isPast(new Date(item.due_date)) && !item.completed
    if (filter === 'overdue') return item.due_date && isPast(new Date(item.due_date)) && !isToday(new Date(item.due_date)) && !item.completed
    if (filter === 'all') return !item.completed
    return true
  }) || []

  const todayItems = items?.filter((i) => i.due_date && isToday(new Date(i.due_date)) && !i.completed) || []
  const overdueItems = items?.filter((i) => i.due_date && isPast(new Date(i.due_date)) && !isToday(new Date(i.due_date)) && !i.completed) || []
  const thisWeekItems = items?.filter((i) => i.due_date && isThisWeek(new Date(i.due_date)) && !i.completed) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Schedule</h1>
          <p className="text-muted-foreground">
            Your personal to-do list and deadlines
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="What needs to be done?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add details..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dueTime">Time (optional)</Label>
                  <Input
                    id="dueTime"
                    type="time"
                    value={newDueTime}
                    onChange={(e) => setNewDueTime(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as 'low' | 'medium' | 'high')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddItem} className="w-full" disabled={!newTitle.trim()}>
                Add Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{todayItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">{thisWeekItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{overdueItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { value: 'all' as const, label: 'Active' },
          { value: 'today' as const, label: 'Today' },
          { value: 'upcoming' as const, label: 'Upcoming' },
          { value: 'overdue' as const, label: 'Overdue' },
          { value: 'completed' as const, label: 'Completed' },
        ].map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            {filter === 'all' ? 'Active Tasks' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <Empty
              icon={Calendar}
              title="No tasks"
              description={filter === 'all' ? 'Add a task to get started!' : `No ${filter} tasks.`}
            />
          ) : (
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-2">
                {filteredItems.map((item) => {
                  const dueDate = item.due_date ? new Date(item.due_date) : null
                  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !item.completed

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border transition-colors hover:bg-accent/50 ${
                        item.completed ? 'opacity-50' : ''
                      } ${isOverdue ? 'border-red-500/30' : 'border-border'}`}
                    >
                      <button
                        onClick={() => handleToggleComplete(item)}
                        className="mt-0.5 shrink-0"
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className={`h-5 w-5 ${priorityColors[item.priority]}`} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary" className={priorityBadgeColors[item.priority]}>
                            {item.priority}
                          </Badge>
                          {dueDate && (
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                              <Calendar className="h-3 w-3" />
                              {isToday(dueDate)
                                ? 'Today'
                                : isTomorrow(dueDate)
                                ? 'Tomorrow'
                                : format(dueDate, 'MMM d, yyyy')}
                              {item.due_time && ` at ${item.due_time}`}
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-xs text-red-500">
                              ({formatDistanceToNow(dueDate!, { addSuffix: false })} overdue)
                            </span>
                          )}
                          {item.task_id && (
                            <Badge variant="outline" className="text-xs">
                              From assigned task
                            </Badge>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
