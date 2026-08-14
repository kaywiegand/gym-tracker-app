import { create } from 'zustand'
import { api } from '@/lib/api'

export type Theme = 'dark' | 'light'

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

interface ThemeState {
  theme: Theme
  // persist: false when only syncing local state from a server value
  // that's already saved (e.g. on login) -- true for user-initiated toggles.
  setTheme: (theme: Theme, persist?: boolean) => void
}

// localStorage / the inline script in index.html only prevent a flash of
// the wrong theme before paint. Settings.theme in the DB is the source of
// truth across devices -- App syncs it in once /auth/status confirms login,
// and every user-initiated toggle (header icon or Settings) writes it back.
export const useThemeStore = create<ThemeState>((set) => ({
  theme: (document.documentElement.getAttribute('data-theme') as Theme | null) ?? 'dark',
  setTheme: (theme, persist = true) => {
    applyTheme(theme)
    set({ theme })
    if (persist) {
      api.put('/settings', { theme }).catch(() => {
        // best-effort -- local UI already reflects the change
      })
    }
  },
}))
