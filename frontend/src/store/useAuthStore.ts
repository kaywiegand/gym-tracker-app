import { create } from 'zustand'
import { api } from '@/lib/api'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  checkStatus: () => Promise<void>
  login: (password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',

  checkStatus: async () => {
    try {
      const res = await api.get<{ authenticated: boolean }>('/auth/status')
      set({ status: res.authenticated ? 'authenticated' : 'unauthenticated' })
    } catch {
      set({ status: 'unauthenticated' })
    }
  },

  login: async (password: string) => {
    try {
      await api.post('/auth/login', { password })
      set({ status: 'authenticated' })
      return true
    } catch {
      return false
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      set({ status: 'unauthenticated' })
    }
  },
}))
