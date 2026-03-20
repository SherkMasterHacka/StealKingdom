import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
}

function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  if (managerRole === 'owner') return targetRole !== 'owner'
  if (managerRole === 'admin') return targetRole === 'member' || targetRole === 'viewer'
  return false
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

  // Get current user's profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!currentProfile || (currentProfile.role !== 'owner' && currentProfile.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get target user's profile
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', id)
    .single()

  if (!targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()
  const newRole = body.role as UserRole | undefined

  // If changing role, validate permissions
  if (newRole) {
    // Check if current user can manage the target's current role
    if (!canManageRole(currentProfile.role as UserRole, targetProfile.role as UserRole)) {
      return NextResponse.json({ 
        error: 'You cannot modify this user\'s role' 
      }, { status: 403 })
    }

    // Check if the new role is valid for the manager
    if (currentProfile.role === 'admin' && (newRole === 'owner' || newRole === 'admin')) {
      return NextResponse.json({ 
        error: 'Admins cannot promote users to Admin or Owner' 
      }, { status: 403 })
    }

    // Owners cannot be demoted
    if (targetProfile.role === 'owner') {
      return NextResponse.json({ 
        error: 'Owner role cannot be changed' 
      }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
