export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Gamepad2, CheckCircle, Users, FileText, Activity } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Gamepad2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">StealKingdom Tasks</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">
            StealKingdom Task Management
          </h1>
          <p className="text-xl text-muted-foreground mb-8 text-pretty">
            Organize the StealKingdom game development workflow with categories for Models, Animation, Sound, VFX, UI, and Programming. Keep the team aligned and ship the game faster.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg">
                Start Free
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Task Categories</h3>
            <p className="text-sm text-muted-foreground">
              Organize tasks by Model, Animation, Sound, VFX, UI, and Programming.
            </p>
          </div>
          
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Team Roles</h3>
            <p className="text-sm text-muted-foreground">
              Owner, Admin, Member, and Viewer roles with appropriate permissions.
            </p>
          </div>
          
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">File Attachments</h3>
            <p className="text-sm text-muted-foreground">
              Upload and share files directly on tasks for easy collaboration.
            </p>
          </div>
          
          <div className="p-6 rounded-xl border border-border bg-card">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Activity Log</h3>
            <p className="text-sm text-muted-foreground">
              Track all changes and updates across your project timeline.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
