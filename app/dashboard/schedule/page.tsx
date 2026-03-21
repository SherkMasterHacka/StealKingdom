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
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isToday, isTomorrow, isPast, isThisWeek } from 'date-fns'
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
  Pencil,
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

const fetcher = (url: string) => fetch(url).then((res) => res.json()).then((data) => Array.isArray(data) ? data : [])

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

const priorityLabels = {
  low: 'ต่ำ',
  medium: 'ปานกลาง',
  high: 'สูง',
}

const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatThaiDate(date: Date): string {
  if (isToday(date)) return 'วันนี้'
  if (isTomorrow(date)) return 'พรุ่งนี้'
  const day = thaiDays[date.getDay()]
  const d = date.getDate()
  const month = thaiMonths[date.getMonth()]
  return `วัน${day} ${d} ${month}`
}

function formatThaiTime(time: string): string {
  const [h, m] = time.split(':')
  return `${h}:${m} น.`
}

function thaiTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'วันนี้'
  if (days === 1) return '1 วันที่แล้ว'
  if (days < 7) return `${days} วันที่แล้ว`
  if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`
  return `${Math.floor(days / 30)} เดือนที่แล้ว`
}

function thaiOverdue(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'เลยกำหนดวันนี้'
  if (days === 1) return 'เลยกำหนด 1 วัน'
  return `เลยกำหนด ${days} วัน`
}

const quickTimes = [
  { label: '09:00', value: '09:00' },
  { label: '10:00', value: '10:00' },
  { label: '12:00', value: '12:00' },
  { label: '13:00', value: '13:00' },
  { label: '15:00', value: '15:00' },
  { label: '17:00', value: '17:00' },
  { label: '19:00', value: '19:00' },
  { label: '21:00', value: '21:00' },
]

export default function SchedulePage() {
  const { profile } = useAuth()
  const { data: items, isLoading } = useSWR<ScheduleItem[]>('/api/schedule', fetcher)

  // Add dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newDueTime, setNewDueTime] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')

  // Edit dialog
  const [editItem, setEditItem] = useState<ScheduleItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editDueTime, setEditDueTime] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium')

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

  const openEditDialog = (item: ScheduleItem) => {
    setEditItem(item)
    setEditTitle(item.title)
    setEditDescription(item.description || '')
    setEditDueDate(item.due_date ? item.due_date.split('T')[0] : '')
    setEditDueTime(item.due_time || '')
    setEditPriority(item.priority)
  }

  const handleEditItem = async () => {
    if (!editItem || !editTitle.trim()) return

    await fetch(`/api/schedule/${editItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        description: editDescription || null,
        due_date: editDueDate || null,
        due_time: editDueTime || null,
        priority: editPriority,
      }),
    })

    setEditItem(null)
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

  const filterLabels: Record<string, string> = {
    all: 'ทั้งหมด',
    today: 'วันนี้',
    upcoming: 'กำลังจะถึง',
    overdue: 'เลยกำหนด',
    completed: 'เสร็จแล้ว',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ตารางงานของฉัน</h1>
          <p className="text-muted-foreground">
            จัดการงานและกำหนดเวลาส่วนตัว
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มงาน
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>เพิ่มงานใหม่</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="title">ชื่องาน</Label>
                <Input
                  id="title"
                  placeholder="ต้องทำอะไร?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">รายละเอียด (ไม่บังคับ)</Label>
                <Textarea
                  id="description"
                  placeholder="เพิ่มรายละเอียด..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">กำหนดส่ง</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
              <div>
                <Label>เวลา (ไม่บังคับ)</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {quickTimes.map((t) => (
                    <Button
                      key={t.value}
                      type="button"
                      size="sm"
                      variant={newDueTime === t.value ? 'default' : 'outline'}
                      onClick={() => setNewDueTime(newDueTime === t.value ? '' : t.value)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
                <Input
                  type="time"
                  value={newDueTime}
                  onChange={(e) => setNewDueTime(e.target.value)}
                  className="mt-2"
                  placeholder="หรือพิมพ์เวลาเอง"
                />
              </div>
              <div>
                <Label>ความสำคัญ</Label>
                <Select value={newPriority} onValueChange={(v) => setNewPriority(v as 'low' | 'medium' | 'high')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">ต่ำ</SelectItem>
                    <SelectItem value="medium">ปานกลาง</SelectItem>
                    <SelectItem value="high">สูง</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddItem} className="w-full" disabled={!newTitle.trim()}>
                เพิ่มงาน
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
                <p className="text-sm text-muted-foreground">วันนี้</p>
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
                <p className="text-sm text-muted-foreground">สัปดาห์นี้</p>
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
                <p className="text-sm text-muted-foreground">เลยกำหนด</p>
                <p className="text-2xl font-bold">{overdueItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'today', 'upcoming', 'overdue', 'completed'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {filterLabels[f]}
          </Button>
        ))}
      </div>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            {filterLabels[filter]}
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
              title="ไม่มีงาน"
              description={filter === 'all' ? 'เพิ่มงานเพื่อเริ่มต้น!' : `ไม่มีงาน${filterLabels[filter]}`}
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
                      className={`relative flex items-start gap-3 p-4 pb-10 rounded-lg border transition-colors hover:bg-accent/50 cursor-pointer ${
                        item.completed ? 'opacity-50' : ''
                      } ${isOverdue ? 'border-red-500/30' : 'border-border'}`}
                      onClick={() => openEditDialog(item)}
                    >
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary" className={priorityBadgeColors[item.priority]}>
                            {priorityLabels[item.priority]}
                          </Badge>
                          {dueDate && (
                            <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                              <Calendar className="h-3 w-3" />
                              {formatThaiDate(dueDate)}
                              {item.due_time && ` ${formatThaiTime(item.due_time)}`}
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-xs text-red-500">
                              ({thaiOverdue(dueDate!)})
                            </span>
                          )}
                          {item.task_id && (
                            <Badge variant="outline" className="text-xs">
                              จากงานที่ได้รับ
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Edit & Delete buttons - top right */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditDialog(item) }}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="แก้ไข"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          title="ลบ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Toggle complete button - bottom right */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleComplete(item) }}
                        className="absolute bottom-3 right-3 p-1.5 rounded-full transition-all duration-200 hover:scale-125 hover:bg-accent active:scale-95"
                        title={item.completed ? 'ทำเครื่องหมายยังไม่เสร็จ' : 'ทำเครื่องหมายเสร็จแล้ว'}
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500 transition-colors" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-400 hover:text-green-400 transition-colors" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขงาน</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>ชื่องาน</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>รายละเอียด</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="เพิ่มรายละเอียด..."
              />
            </div>
            <div>
              <Label>กำหนดส่ง</Label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label>เวลา</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {quickTimes.map((t) => (
                  <Button
                    key={t.value}
                    type="button"
                    size="sm"
                    variant={editDueTime === t.value ? 'default' : 'outline'}
                    onClick={() => setEditDueTime(editDueTime === t.value ? '' : t.value)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
              <Input
                type="time"
                value={editDueTime}
                onChange={(e) => setEditDueTime(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label>ความสำคัญ</Label>
              <Select value={editPriority} onValueChange={(v) => setEditPriority(v as 'low' | 'medium' | 'high')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">ต่ำ</SelectItem>
                  <SelectItem value="medium">ปานกลาง</SelectItem>
                  <SelectItem value="high">สูง</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              ยกเลิก
            </Button>
            <Button onClick={handleEditItem} disabled={!editTitle.trim()}>
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
