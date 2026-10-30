import { create } from 'zustand'
import { api, withTimeout } from '@/lib/api'
import { NETWORK_WAIT_MS } from '@/lib/offlineCache'

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

// The session cookie is HTTP-only, so without a server there is no asking it.
// This remembers that the last answer was "logged in": offline the app has to
// open on the local data rather than on a login that cannot work (R-01). The
// server decides again as soon as it is reachable.
const KNOWN_LOGIN_KEY = 'auth.known-login'

function rememberLogin(known: boolean): void {
  try {
    if (known) localStorage.setItem(KNOWN_LOGIN_KEY, '1')
    else localStorage.removeItem(KNOWN_LOGIN_KEY)
  } catch {
    // no storage: an offline start then shows the login
  }
}

function hasKnownLogin(): boolean {
  try {
    return localStorage.getItem(KNOWN_LOGIN_KEY) === '1'
  } catch {
    return false
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  expired: false,

  checkStatus: async () => {
    try {
      const res = await withTimeout(api.get<{ authenticated: boolean }>('/auth/status'), NETWORK_WAIT_MS)
      rememberLogin(res.authenticated)
      set({ status: res.authenticated ? 'authenticated' : 'unauthenticated' })
    } catch {
      set({ status: hasKnownLogin() ? 'authenticated' : 'unauthenticated' })
    }
  },

  // Called on any 401. Only a session that WAS authenticated counts as
  // expired -- a wrong password on the login screen is not.
  recheck: async () => {
    try {
      const res = await api.get<{ authenticated: boolean }>('/auth/status')
      if (!res.authenticated && get().status === 'authenticated') {
        rememberLogin(false)
        set({ status: 'unauthenticated', expired: true })
      }
    } catch {
      // Offline: a network error says nothing about the session.
    }
  },

  login: async (password: string) => {
    try {
      await api.post('/auth/login', { password })
      rememberLogin(true)
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
      rememberLogin(false)
      set({ status: 'unauthenticated', expired: false })
    }
  },
}))
