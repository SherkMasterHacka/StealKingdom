import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: files, error } = await supabase
    .from('task_files')
    .select(`
      *,
      uploader:profiles!task_files_uploaded_by_fkey(*)
    `)
    .eq('task_id', id)
    .order('file_name', { ascending: true })
    .order('version', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(files)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin or member
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden: Member access required' }, { status: 403 })
  }

  const body = await request.json()
  
  // Check for existing files with similar name to auto-increment version
  const baseName = body.file_name.replace(/\s*v\d+(\.[^.]+)?$/, '')
  const extension = body.file_name.includes('.') ? '.' + body.file_name.split('.').pop() : ''
  
  const { data: existingFiles } = await supabase
    .from('task_files')
    .select('version, file_name')
    .eq('task_id', id)
    .ilike('file_name', `${baseName}%`)
    .order('version', { ascending: false })
    .limit(1)

  const newVersion = existingFiles && existingFiles.length > 0 
    ? (existingFiles[0].version || 1) + 1 
    : 1

  const versionedFileName = newVersion > 1 
    ? `${baseName} v${newVersion}${extension}`
    : body.file_name

  const { data: file, error } = await supabase
    .from('task_files')
    .insert({
      task_id: id,
      file_name: versionedFileName,
      file_url: body.file_url,
      file_size: body.file_size,
      file_type: body.file_type,
      version: newVersion,
      uploaded_by: user.id,
    })
    .select(`
      *,
      uploader:profiles!task_files_uploaded_by_fkey(*)
    `)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log activity
  await supabase.from('activity_logs').insert({
    task_id: id,
    user_id: user.id,
    action: 'uploaded_file',
    details: { file_name: versionedFileName, version: newVersion },
  })

  // Get task info for notification
  const { data: task } = await supabase
    .from('tasks')
    .select('title, assigned_to, created_by, status')
    .eq('id', id)
    .single()

  // Auto-set task status to 'review' when a file is uploaded
  // Only if status is 'pending' or 'in_progress'
  if (task && (task.status === 'pending' || task.status === 'in_progress')) {
    await supabase
      .from('tasks')
      .update({ status: 'review' })
      .eq('id', id)

    // Log the auto status change
    await supabase.from('activity_logs').insert({
      task_id: id,
      user_id: user.id,
      action: 'auto_status_change',
      details: { from: task.status, to: 'review', reason: 'file_uploaded' },
    })
  }

  // Get all owners and admins to notify them about file uploads
  const { data: ownersAdmins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['owner', 'admin'])

  // Notify task creator, assignee, owners and admins about file upload (if not the uploader)
  const notifyUsers = new Set<string>()
  if (task?.assigned_to && task.assigned_to !== user.id) {
    notifyUsers.add(task.assigned_to)
  }
  if (task?.created_by && task.created_by !== user.id) {
    notifyUsers.add(task.created_by)
  }
  // Add all owners and admins
  ownersAdmins?.forEach(u => {
    if (u.id !== user.id) notifyUsers.add(u.id)
  })

  for (const userId of notifyUsers) {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'file_uploaded',
      title: 'New File Uploaded',
      message: `A new file "${versionedFileName}" was uploaded to "${task?.title}".`,
      task_id: id,
    })
  }

  return NextResponse.json(file)
}
