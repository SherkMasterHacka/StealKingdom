'use client'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CATEGORIES, PRIORITIES, STATUS_COLORS, type Task } from '@/lib/types'
import { Calendar, Flag, Paperclip, MessageSquare } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'

interface TaskCardProps {
  task: Task
  onClick: () => void
  isSelected: boolean
}

export function TaskCard({ task, onClick, isSelected }: TaskCardProps) {
  const category = CATEGORIES.find(c => c.value === task.category)
  const priority = PRIORITIES.find(p => p.value === task.priority)
  
  const assigneeInitials = task.assignee
    ? (task.assignee.display_name || task.assignee.username).slice(0, 2).toUpperCase()
    : null

  const dueDate = task.due_date ? new Date(task.due_date) : null
  const isOverdue = dueDate && isPast(dueDate) && task.status !== 'completed' && task.status !== 'approved'
  const isDueToday = dueDate && isToday(dueDate)

  const fileCount = task.file_count || 0
  const commentCount = task.comment_count || 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg bg-card border transition-all',
        'hover:shadow-md hover:border-primary/50',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge 
          variant="secondary" 
          className={cn('text-xs', category?.color, 'text-white')}
        >
          {category?.label}
        </Badge>
        <div className="flex items-center gap-1.5">
          {priority && priority.value !== 'low' && (
            <Flag className={cn('h-3.5 w-3.5', priority.color)} />
          )}
          <Badge variant="outline" className={cn('text-[10px] h-5', STATUS_COLORS[task.status])}>
            {task.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>
      
      <h4 className="font-medium text-sm text-foreground line-clamp-2 mb-2">
        {task.title}
      </h4>
      
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {task.description}
        </p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {dueDate && (
            <div className={cn(
              'flex items-center gap-1 text-xs',
              isOverdue ? 'text-destructive' : isDueToday ? 'text-yellow-600' : 'text-muted-foreground'
            )}>
              <Calendar className="h-3 w-3" />
              {format(dueDate, 'MMM d')}
            </div>
          )}
          
          {/* File and Comment indicators */}
          {(fileCount > 0 || commentCount > 0) && (
            <div className="flex items-center gap-2">
              {fileCount > 0 && (
                <div className="flex items-center gap-0.5 text-xs text-primary">
                  <Paperclip className="h-3 w-3" />
                  <span>{fileCount}</span>
                </div>
              )}
              {commentCount > 0 && (
                <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  <span>{commentCount}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {assigneeInitials && (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
              {assigneeInitials}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </button>
  )
}
