import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')
  
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 })
  }
  
  if (username.length < 3) {
    return NextResponse.json({ available: false, error: 'Username must be at least 3 characters' })
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return NextResponse.json({ available: false, error: 'Username can only contain letters, numbers, and underscores' })
  }
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ available: !data })
}
