'use client'

import { TaskCard } from './task-card'
import { STATUSES, type Task, type TaskStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TaskBoardProps {
  tasks: Task[]
  onTaskSelect: (task: Task) => void
  onStatusChange: (taskId: string, status: TaskStatus) => void
  canEditTasks: boolean
  selectedTaskId?: string
}

export function TaskBoard({ 
  tasks, 
  onTaskSelect, 
  onStatusChange,
  canEditTasks,
  selectedTaskId 
}: TaskBoardProps) {
  const tasksByStatus = STATUSES.reduce((acc, status) => {
    acc[status.value] = tasks.filter(task => task.status === status.value)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  const statusColors: Record<TaskStatus, string> = {
    pending: 'border-t-gray-400',
    in_progress: 'border-t-blue-500',
    review: 'border-t-yellow-500',
    completed: 'border-t-green-500',
  }

  return (
    <div className="grid grid-cols-4 gap-4 h-full">
      {STATUSES.map((status) => (
        <div 
          key={status.value} 
          className={cn(
            'flex flex-col bg-muted/30 rounded-lg border-t-4',
            statusColors[status.value]
          )}
        >
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-foreground">{status.label}</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {tasksByStatus[status.value].length}
              </span>
            </div>
          </div>
          
          <div className="flex-1 p-2 space-y-2 overflow-auto">
            {tasksByStatus[status.value].map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskSelect(task)}
                isSelected={selectedTaskId === task.id}
              />
            ))}
            
            {tasksByStatus[status.value].length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No tasks
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
