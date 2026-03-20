import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  const taskId = searchParams.get('task_id')
  const limit = parseInt(searchParams.get('limit') || '20')

  let query = supabase
    .from('activity_logs')
    .select(`
      *,
      user:profiles!activity_logs_user_id_fkey(*),
      task:tasks!activity_logs_task_id_fkey(id, title)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (taskId) {
    query = query.eq('task_id', taskId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
