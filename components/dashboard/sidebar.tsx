'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { CATEGORIES } from '@/lib/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Gamepad2,
  LayoutDashboard,
  ListTodo,
  Users,
  Activity,
  Box,
  Clapperboard,
  Volume2,
  Sparkles,
  Monitor,
  Code,
  Settings,
} from 'lucide-react'

const categoryIcons: Record<string, React.ReactNode> = {
  model: <Box className="h-4 w-4" />,
  animation: <Clapperboard className="h-4 w-4" />,
  sound: <Volume2 className="h-4 w-4" />,
  vfx: <Sparkles className="h-4 w-4" />,
  ui: <Monitor className="h-4 w-4" />,
  programming: <Code className="h-4 w-4" />,
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category')
  const { profile } = useAuth()

  const mainNav = [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/dashboard/tasks', label: 'All Tasks', icon: <ListTodo className="h-4 w-4" /> },
    { href: '/dashboard/activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> },
  ]

  const adminNav = [
    { href: '/dashboard/team', label: 'Team', icon: <Users className="h-4 w-4" /> },
    { href: '/dashboard/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ]

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Gamepad2 className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-semibold text-sidebar-foreground">StealKingdom Tasks</span>
      </div>
      
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                pathname === item.href
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <Separator className="my-4" />

        <div className="mb-2 px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
          Categories
        </div>
        <nav className="space-y-1">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.value}
              href={`/dashboard/tasks?category=${cat.value}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                currentCategory === cat.value
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', cat.color)} />
              {categoryIcons[cat.value]}
              {cat.label}
            </Link>
          ))}
        </nav>

        {(profile?.role === 'owner' || profile?.role === 'admin') && (
          <>
            <Separator className="my-4" />
            <div className="mb-2 px-3 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
              Admin
            </div>
            <nav className="space-y-1">
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </>
        )}
      </ScrollArea>
    </aside>
  )
}
