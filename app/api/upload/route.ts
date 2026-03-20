import { put } from '@vercel/blob'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const taskId = formData.get('taskId') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!taskId) {
      return NextResponse.json({ error: 'No task ID provided' }, { status: 400 })
    }

    // Upload to Vercel Blob (private)
    const blob = await put(`tasks/${taskId}/${file.name}`, file, {
      access: 'private',
    })

    // Save file record to database
    const { data, error } = await supabase
      .from('task_files')
      .insert({
        task_id: taskId,
        file_name: file.name,
        file_url: blob.pathname,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
      })
      .select(`*, uploader:profiles!task_files_uploaded_by_fkey(*)`)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      task_id: taskId,
      user_id: user.id,
      action: 'uploaded_file',
      details: { file_name: file.name },
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
