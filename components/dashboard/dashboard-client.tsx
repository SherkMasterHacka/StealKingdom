'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './sidebar'
import { TaskBoard } from './task-board'
import { TaskDetailPanel } from './task-detail-panel'
import { CreateTaskDialog } from './create-task-dialog'
import { Header } from './header'
import type { Profile, Task, TaskCategory, TaskStatus } from '@/lib/types'

interface DashboardClientProps {
  currentUser: Profile
  initialTasks: Task[]
  members: Profile[]
}

export function DashboardClient({ currentUser, initialTasks, members }: DashboardClientProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'all'>('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTasks = tasks.filter(task => {
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory
    const matchesSearch = searchQuery === '' || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleTaskCreated = useCallback((newTask: Task) => {
    setTasks(prev => [newTask, ...prev])
    setIsCreateDialogOpen(false)
  }, [])

  const handleTaskUpdated = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask)
    }
  }, [selectedTask])

  const handleTaskDeleted = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    if (selectedTask?.id === taskId) {
      setSelectedTask(null)
    }
  }, [selectedTask])

  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      const updatedTask = { ...task, status: newStatus }
      handleTaskUpdated(updatedTask)
    }
  }, [tasks, handleTaskUpdated])

  const canCreateTasks = currentUser.role === 'admin'
  const canEditTasks = currentUser.role === 'admin' || currentUser.role === 'member'

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        taskCounts={tasks.reduce((acc, task) => {
          acc[task.category] = (acc[task.category] || 0) + 1
          return acc
        }, {} as Record<string, number>)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          currentUser={currentUser}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateTask={() => setIsCreateDialogOpen(true)}
          canCreateTasks={canCreateTasks}
        />
        
        <main className="flex-1 overflow-auto p-6">
          <TaskBoard 
            tasks={filteredTasks}
            onTaskSelect={setSelectedTask}
            onStatusChange={handleStatusChange}
            canEditTasks={canEditTasks}
            selectedTaskId={selectedTask?.id}
          />
        </main>
      </div>

      {selectedTask && (
        <TaskDetailPanel 
          task={selectedTask}
          currentUser={currentUser}
          members={members}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          canEditTasks={canEditTasks}
          canDeleteTasks={currentUser.role === 'admin'}
        />
      )}

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        members={members}
        currentUser={currentUser}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  )
}
