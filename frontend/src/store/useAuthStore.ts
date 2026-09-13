import { create } from 'zustand'
import { api } from '@/lib/api'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  // True when a session that was alive died under a running screen. The login
  // is then shown on top of that screen instead of replacing it, so an unsaved
  // edit or a running workout survives logging in again.
  expired: boolean
  checkStatus: () => Promise<void>
  recheck: () => Promise<void>
  login: (password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  expired: false,

  checkStatus: async () => {
    try {
      const res = await api.get<{ authenticated: boolean }>('/auth/status')
      set({ status: res.authenticated ? 'authenticated' : 'unauthenticated' })
    } catch {
      set({ status: 'unauthenticated' })
    }
  },

  // Called on any 401. Only a session that WAS authenticated counts as
  // expired -- a wrong password on the login screen is not.
  recheck: async () => {
    try {
      const res = await api.get<{ authenticated: boolean }>('/auth/status')
      if (!res.authenticated && get().status === 'authenticated') {
        set({ status: 'unauthenticated', expired: true })
      }
    } catch {
      // Offline: a network error says nothing about the session.
    }
  },

  login: async (password: string) => {
    try {
      await api.post('/auth/login', { password })
      set({ status: 'authenticated', expired: false })
      return true
    } catch {
      return false
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      set({ status: 'unauthenticated', expired: false })
    }
  },
}))
