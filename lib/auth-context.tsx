'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MAX_LOADING_TIME = 5000 // 5 second max loading time

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initializedRef = useRef(false)

  const fetchProfile = useCallback(async (userId: string, retries = 2): Promise<Profile | null> => {
    for (let i = 0; i < retries; i++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        if (error) {
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)))
            continue
          }
          console.error('[v0] Error fetching profile:', error)
          return null
        }
        return data as Profile
      } catch (err) {
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)))
          continue
        }
        console.error('[v0] Error fetching profile:', err)
        return null
      }
    }
    return null
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      if (profileData) {
        setProfile(profileData)
      }
    }
  }, [user, fetchProfile])

  useEffect(() => {
    // Prevent double initialization
    if (initializedRef.current) return
    initializedRef.current = true

    // Safety timeout - always stop loading after MAX_LOADING_TIME
    maxLoadingTimeoutRef.current = setTimeout(() => {
      console.log('[v0] Max loading time reached, forcing loading to false')
      setLoading(false)
    }, MAX_LOADING_TIME)

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
          // Fetch profile immediately
          const profileData = await fetchProfile(user.id)
          setProfile(profileData)
        }
      } catch (error) {
        console.error('[v0] Error getting user:', error)
      } finally {
        // Always set loading to false
        setLoading(false)
        if (maxLoadingTimeoutRef.current) {
          clearTimeout(maxLoadingTimeoutRef.current)
        }
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Clear any pending profile fetch
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current)
      }

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        setLoading(true)
        // Delay profile fetch slightly for new signups to allow trigger completion
        profileTimeoutRef.current = setTimeout(async () => {
          const profileData = await fetchProfile(session.user.id)
          setProfile(profileData)
          setLoading(false)
        }, 200)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user)
      }
    })

    // Cross-tab synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('supabase.auth')) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            setUser(null)
            setProfile(null)
          } else if (session.user) {
            setUser(session.user)
            fetchProfile(session.user.id).then(setProfile)
          }
        })
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('storage', handleStorageChange)
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current)
      }
      if (maxLoadingTimeoutRef.current) {
        clearTimeout(maxLoadingTimeoutRef.current)
      }
    }
  }, [supabase, fetchProfile])

  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      // Force redirect to home page
      window.location.href = '/'
    } catch (error) {
      console.error('[v0] Error signing out:', error)
      setLoading(false)
    }
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
