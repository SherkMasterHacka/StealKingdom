import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!tasks_assigned_to_fkey(*),
      creator:profiles!tasks_created_by_fkey(*),
      files:task_files(*, uploader:profiles!task_files_uploaded_by_fkey(*)),
      comments(*, user:profiles!comments_user_id_fkey(*))
    `)
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current user's profile to check role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isOwnerOrAdmin = currentProfile?.role === 'owner' || currentProfile?.role === 'admin'

  const body = await request.json()

  // Get the old task data for comparison
  const { data: oldTask } = await supabase
    .from('tasks')
    .select('*, assignee:profiles!tasks_assigned_to_fkey(*)')
    .eq('id', id)
    .single()

  // Restrict status changes to owner/admin only
  // Exception: if the request is marked as system_auto (from file upload)
  if (body.status && body.status !== oldTask?.status && !isOwnerOrAdmin && !body.system_auto) {
    return NextResponse.json({ 
      error: 'Only owners and admins can change task status' 
    }, { status: 403 })
  }

  // Remove system_auto flag before saving
  const { system_auto, ...updateData } = body

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
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
  const changes: Record<string, { from: unknown; to: unknown }> = {}
  for (const key of Object.keys(updateData)) {
    if (oldTask && oldTask[key] !== updateData[key]) {
      changes[key] = { from: oldTask[key], to: updateData[key] }
    }
  }

  if (Object.keys(changes).length > 0) {
    await supabase.from('activity_logs').insert({
      task_id: id,
      user_id: user.id,
      action: 'updated_task',
      details: { changes },
    })
  }

  // Create notifications based on status changes
  if (updateData.status && oldTask && updateData.status !== oldTask.status) {
    // Notify assignee when task is approved
    if (updateData.status === 'approved' && oldTask.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: oldTask.assigned_to,
        type: 'task_approved',
        title: 'Task Approved',
        message: `Your task "${oldTask.title}" has been approved!`,
        task_id: id,
      })
    }

    // Notify assignee when task is rejected
    if (updateData.status === 'rejected' && oldTask.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: oldTask.assigned_to,
        type: 'task_rejected',
        title: 'Task Rejected',
        message: `Your task "${oldTask.title}" was rejected. ${updateData.feedback ? `Feedback: ${updateData.feedback}` : 'Please check the feedback.'}`,
        task_id: id,
      })
    }

    // Notify owners/admins when task is submitted for review (except if system auto)
    if (updateData.status === 'review' && system_auto) {
      const { data: ownersAdmins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['owner', 'admin'])

      for (const u of ownersAdmins || []) {
        if (u.id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: u.id,
            type: 'task_updated',
            title: 'Task Ready for Review',
            message: `Task "${oldTask.title}" has been submitted for review.`,
            task_id: id,
          })
        }
      }
    }

    // Notify assignee when task status changes (non-approval/rejection)
    if (updateData.status !== 'approved' && updateData.status !== 'rejected' && updateData.status !== 'review' && oldTask.assigned_to && oldTask.assigned_to !== user.id) {
      await supabase.from('notifications').insert({
        user_id: oldTask.assigned_to,
        type: 'task_updated',
        title: 'Task Status Updated',
        message: `Task "${oldTask.title}" status changed to ${updateData.status.replace('_', ' ')}.`,
        task_id: id,
      })
    }
  }

  // Notify new assignee when task is assigned
  if (updateData.assigned_to && oldTask && updateData.assigned_to !== oldTask.assigned_to && updateData.assigned_to !== user.id) {
    await supabase.from('notifications').insert({
      user_id: updateData.assigned_to,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: `You have been assigned to "${oldTask.title}".`,
      task_id: id,
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get task title for activity log
  const { data: task } = await supabase
    .from('tasks')
    .select('title')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log activity
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action: 'deleted_task',
    details: { title: task?.title },
  })

  return NextResponse.json({ success: true })
}
