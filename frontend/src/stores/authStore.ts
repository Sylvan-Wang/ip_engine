// Auth state is driven by Supabase session — no manual JWT storage needed.
// supabase-js handles token refresh & persistence automatically.
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  logout: () => Promise<void>
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, isAuthenticated: false })
  },

  init: async () => {
    // Restore session on page load
    const { data: { session } } = await supabase.auth.getSession()
    set({ user: session?.user ?? null, isAuthenticated: !!session, isLoading: false })

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((_event: import("@supabase/supabase-js").AuthChangeEvent, session: import("@supabase/supabase-js").Session | null) => {
      set({ user: session?.user ?? null, isAuthenticated: !!session })
    })
  },
}))
