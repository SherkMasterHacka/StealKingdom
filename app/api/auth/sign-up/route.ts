import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Validate input
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    if (username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if username already exists
    const { data: existingUser } = await adminClient
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'This username is already taken' }, { status: 409 })
    }

    const fakeEmail = `${username.toLowerCase()}@stealkingdom.local`

    // Create user with admin API (bypasses email validation)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: fakeEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: username,
      },
    })

    if (createError) {
      console.error('User creation error:', createError)
      if (createError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'This username is already taken' }, { status: 409 })
      }
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Set role to 'owner' for ratpum16, otherwise 'member'
    const role = username.toLowerCase() === 'ratpum16' ? 'owner' : 'member'

    if (newUser?.user) {
      await adminClient
        .from('profiles')
        .update({ role })
        .eq('id', newUser.user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sign-up error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
