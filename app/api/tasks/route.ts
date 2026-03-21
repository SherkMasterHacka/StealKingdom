import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const category = searchParams.get('category')
  const status = searchParams.get('status')
  const assignedTo = searchParams.get('assigned_to')

  let query = supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!tasks_assigned_to_fkey(*),
      creator:profiles!tasks_created_by_fkey(*),
      task_files(count),
      comments(count)
    `)
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (assignedTo) {
    query = query.eq('assigned_to', assignedTo)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Map the count aggregates to simpler properties
  const tasksWithCounts = data?.map((task: Record<string, unknown>) => ({
    ...task,
    file_count: Array.isArray(task.task_files) ? task.task_files[0]?.count || 0 : 0,
    comment_count: Array.isArray(task.comments) ? task.comments[0]?.count || 0 : 0,
    task_files: undefined,
    comments: undefined,
  }))

  return NextResponse.json(tasksWithCounts)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...body,
      created_by: user.id,
    })
    .select(`
      *,
      assignee:profiles!tasks_assigned_to_fkey(*),
      creator:profiles!tasks_created_by_fkey(*)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log activity
  await supabase.from('activity_logs').insert({
    task_id: data.id,
    user_id: user.id,
    action: 'created_task',
    details: { title: body.title, category: body.category },
  })

  // Auto-add to assignee's schedule when task is created with an assignee
  if (body.assigned_to) {
    await supabase.from('schedule_items').insert({
      user_id: body.assigned_to,
      title: body.title,
      description: `Assigned task: ${body.title}`,
      due_date: body.due_date || null,
      priority: body.priority || 'medium',
      task_id: data.id,
    })

    // Notify assignee
    if (body.assigned_to !== user.id) {
      await supabase.from('notifications').insert({
        user_id: body.assigned_to,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `You have been assigned to "${body.title}".`,
        task_id: data.id,
      })
    }
  }

  return NextResponse.json(data)
}
