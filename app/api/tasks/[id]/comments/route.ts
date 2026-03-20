import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comments')
    .select(`*, user:profiles!comments_user_id_fkey(*)`)
    .eq('task_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user profile for notification message
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .single()

  const { message } = await request.json()

  const { data, error } = await supabase
    .from('comments')
    .insert({
      task_id: id,
      user_id: user.id,
      message,
    })
    .select(`*, user:profiles!comments_user_id_fkey(*)`)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log activity
  await supabase.from('activity_logs').insert({
    task_id: id,
    user_id: user.id,
    action: 'added_comment',
    details: { message: message.substring(0, 50) + (message.length > 50 ? '...' : '') },
  })

  // Get task info for notification
  const { data: task } = await supabase
    .from('tasks')
    .select('title, assigned_to, created_by')
    .eq('id', id)
    .single()

  // Notify task creator and assignee about comment (if not the commenter)
  const commenterName = profile?.display_name || profile?.username || 'Someone'
  const notifyUsers = new Set<string>()
  if (task?.assigned_to && task.assigned_to !== user.id) {
    notifyUsers.add(task.assigned_to)
  }
  if (task?.created_by && task.created_by !== user.id) {
    notifyUsers.add(task.created_by)
  }

  for (const userId of notifyUsers) {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'comment_added',
      title: 'New Comment',
      message: `${commenterName} commented on "${task?.title}": "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
      task_id: id,
    })
  }

  return NextResponse.json(data)
}
